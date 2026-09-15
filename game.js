import * as THREE from 'three';

const $ = (s) => document.querySelector(s);
const ui = {
  loading: $('#loading'), menu: $('#menu'), hud: $('#hud'), deploy: $('#deploy'),
  health: $('#healthText'), healthBar: $('#healthBar'), shield: $('#shieldText'), shieldBar: $('#shieldBar'),
  ammo: $('#ammoNow'), reserve: $('#ammoReserve'), cores: $('#coresNow'), interact: $('#interact'),
  hit: $('#hitmarker'), toast: $('#toast'), damage: $('#damage-vignette'), crosshair: $('#crosshair'),
  minimap: $('#minimap'), bigMap: $('#bigMap'), map: $('#mapOverlay'), closeMap: $('#closeMap'),
  speed: $('#speed'), carHealth: $('#car-health')
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x83bed2);
scene.fog = new THREE.FogExp2(0x83bed2, 0.0038);
const camera = new THREE.PerspectiveCamera(72, innerWidth / innerHeight, 0.05, 650);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
$('#game').appendChild(renderer.domElement);

const clock = new THREE.Clock();
const UP = new THREE.Vector3(0, 1, 0);
const raycaster = new THREE.Raycaster();
const world = { colliders: [], enemies: [], cars: [], cores: [], tracers: [], clouds: [], time: 0 };
const state = {
  started: false, locked: false, map: false, driving: null,
  health: 100, shield: 50, ammo: 30, reserve: 120, cores: 0,
  yaw: 0, pitch: 0, velocity: new THREE.Vector3(), onGround: true,
  position: new THREE.Vector3(0, 1.7, 38), reloading: false, lastShot: 0, dead: false
};
const keys = {};

function surfaceTexture(base, fleck, count = 1600) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const c=canvas.getContext('2d');
  c.fillStyle=base;c.fillRect(0,0,256,256);let seed=731;
  for(let i=0;i<count;i++){seed=(seed*16807)%2147483647;const x=seed%256;seed=(seed*16807)%2147483647;const y=seed%256;seed=(seed*16807)%2147483647;c.globalAlpha=.05+(seed%18)/100;c.fillStyle=fleck;c.fillRect(x,y,1+(seed%3),1+(seed%3));}
  c.globalAlpha=1;const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}

function windowTexture(warm=false){
  const canvas=document.createElement('canvas');canvas.width=128;canvas.height=256;const c=canvas.getContext('2d');c.fillStyle='#182126';c.fillRect(0,0,128,256);
  for(let y=10;y<250;y+=31)for(let x=8;x<124;x+=30){const lit=((x*13+y*7+(warm?5:0))%11)>3;c.fillStyle=lit?(warm?'#d5a75f':'#78aeb5'):'#26383e';c.fillRect(x,y,21,17);c.fillStyle=lit?'rgba(255,245,205,.18)':'rgba(0,0,0,.18)';c.fillRect(x+2,y+2,17,3);}
  const t=new THREE.CanvasTexture(canvas);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;
}

const grassTexture=surfaceTexture('#537452','#b4c98a',2600);grassTexture.repeat.set(42,42);
const asphaltTexture=surfaceTexture('#292c2e','#85898a',1200);asphaltTexture.repeat.set(24,24);
const concreteTexture=surfaceTexture('#8d908d','#d9d7cc',1300);concreteTexture.repeat.set(12,12);
const mats = {
  grass: new THREE.MeshStandardMaterial({ map:grassTexture, color:0x8ca273, roughness:1 }),
  road: new THREE.MeshStandardMaterial({ map:asphaltTexture, color:0x777777, roughness:.96 }),
  sidewalk: new THREE.MeshStandardMaterial({ map:concreteTexture, color:0xc5c4b9, roughness:.94 }),
  dark: new THREE.MeshStandardMaterial({ color:0x151a1d, metalness:.35, roughness:.62 }),
  neon: new THREE.MeshStandardMaterial({ color:0x85faff, emissive:0x27b8c9, emissiveIntensity:2.6, roughness:.28 }),
  trunk: new THREE.MeshStandardMaterial({ color:0x4d3323, roughness:1 }),
  leaf: new THREE.MeshStandardMaterial({ color:0x245b38, roughness:.92 }),
  glass: new THREE.MeshPhysicalMaterial({ color:0x60899b, metalness:.05, roughness:.12, transmission:.18, transparent:true, opacity:.78 }),
  chrome: new THREE.MeshStandardMaterial({ color:0xc8d0d2, metalness:.92, roughness:.16 }),
  windowsCool: null,
  windowsWarm: null,
};
mats.windowsCool=new THREE.MeshStandardMaterial({map:windowTexture(false),emissive:0x213b41,emissiveIntensity:.55,metalness:.28,roughness:.3});
mats.windowsWarm=new THREE.MeshStandardMaterial({map:windowTexture(true),emissive:0x583715,emissiveIntensity:.62,metalness:.28,roughness:.3});

function mesh(geo, mat, position, parent = scene) {
  const m = new THREE.Mesh(geo, mat); m.position.copy(position); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

function seeded(seed) { let s = seed; return () => ((s = Math.imul(48271, s) % 2147483647) & 2147483647) / 2147483647; }
const rand = seeded(94721);

function createWorld() {
  createSky();
  const hemi = new THREE.HemisphereLight(0xc8e8ff, 0x4f4939, 1.55); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffe4bd, 3.8); sun.position.set(-80, 130, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -180; sun.shadow.camera.right = sun.shadow.camera.top = 180; scene.add(sun);
  sun.shadow.bias=-.0003;sun.shadow.normalBias=.025;
  world.sun = sun;

  mesh(new THREE.CylinderGeometry(174, 190, 4, 64), mats.grass, new THREE.Vector3(0, -2, 0));
  const water = mesh(new THREE.PlaneGeometry(1400, 1400,24,24), new THREE.MeshPhysicalMaterial({color:0x167a91,roughness:.16,metalness:.12,transparent:true,opacity:.9,clearcoat:1,clearcoatRoughness:.12}), new THREE.Vector3(0,-3.7,0));
  water.rotation.x = -Math.PI/2;

  [-105,-35,35,105].forEach(x => road(x, 0, 12, 330));
  [-105,-35,35,105].forEach(z => road(0, z, 330, 12));
  for (let gx=-2; gx<=1; gx++) for(let gz=-2; gz<=1; gz++) createBlock(gx*70+0, gz*70+0, gx, gz);

  for(let i=0;i<58;i++) {
    const a=rand()*Math.PI*2, r=120+rand()*42; createTree(Math.cos(a)*r,Math.sin(a)*r,.8+rand()*.6);
  }
  for(let i=0;i<34;i++){const a=rand()*Math.PI*2,r=145+rand()*25;createRock(Math.cos(a)*r,Math.sin(a)*r,.5+rand()*1.5);}
  [-140,-70,0,70,140].forEach(p=>{createStreetLight(p,29,Math.PI);createStreetLight(p,41,0);createStreetLight(29,p,-Math.PI/2);createStreetLight(41,p,Math.PI/2);});
  createTower(-2, -2);
  [[28,32],[-76,22],[72,-77],[-116,-105],[105,72]].forEach((p,i)=>createCore(p[0],p[1],i));
  [[3,40,0xff405f],[-45,-97,0x5ef6ff],[80,39,0xd8ff52]].forEach((p)=>createCar(p[0],p[1],p[2],true));
  [[25,-20],[-52,58],[76,-42],[-110,80],[112,10],[3,-106],[55,104],[-84,-75]].forEach((p,i)=>createEnemy(p[0],p[1],i));
  createWeapon();
}

function createSky(){
  const sky=new THREE.Mesh(new THREE.SphereGeometry(620,32,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color(0x347da4)},bottom:{value:new THREE.Color(0xc8d7ce)}},vertexShader:'varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'varying vec3 vPos;uniform vec3 top;uniform vec3 bottom;void main(){float h=clamp(normalize(vPos).y*.75+.28,0.0,1.0);gl_FragColor=vec4(mix(bottom,top,pow(h,.7)),1.0);}'}));scene.add(sky);world.sky=sky;
  const cloudMat=new THREE.MeshStandardMaterial({color:0xffffff,transparent:true,opacity:.52,roughness:1,depthWrite:false});
  for(let i=0;i<18;i++){const g=new THREE.Group(),a=rand()*Math.PI*2,r=120+rand()*300;g.position.set(Math.cos(a)*r,75+rand()*55,Math.sin(a)*r);for(let j=0;j<4;j++){const puff=mesh(new THREE.SphereGeometry(8+rand()*12,8,6),cloudMat,new THREE.Vector3(j*10,rand()*5,rand()*9),g);puff.scale.y=.38;puff.castShadow=false;puff.receiveShadow=false;}scene.add(g);world.clouds.push(g);}
}

function road(x,z,w,d){
  mesh(new THREE.BoxGeometry(w,.16,d),mats.road,new THREE.Vector3(x,.01,z)).receiveShadow=true;
  const stripeMat = new THREE.MeshStandardMaterial({color:0xe5c762,roughness:.72,emissive:0x5a4710,emissiveIntensity:.12});
  if(w>d) for(let px=-w/2+8;px<w/2;px+=16) mesh(new THREE.BoxGeometry(7,.02,.16),stripeMat,new THREE.Vector3(x+px,.11,z));
  else for(let pz=-d/2+8;pz<d/2;pz+=16) mesh(new THREE.BoxGeometry(.16,.02,7),stripeMat,new THREE.Vector3(x,.11,z+pz));
  if(w>d){mesh(new THREE.BoxGeometry(w,.28,2.1),mats.sidewalk,new THREE.Vector3(x,.05,z-d/2-1.1));mesh(new THREE.BoxGeometry(w,.28,2.1),mats.sidewalk,new THREE.Vector3(x,.05,z+d/2+1.1));}
  else{mesh(new THREE.BoxGeometry(2.1,.28,d),mats.sidewalk,new THREE.Vector3(x-w/2-1.1,.05,z));mesh(new THREE.BoxGeometry(2.1,.28,d),mats.sidewalk,new THREE.Vector3(x+w/2+1.1,.05,z));}
}

function createBlock(cx,cz,gx,gz){
  const palette=[0x84949a,0xb29c84,0x6e7b86,0xc1b9a5,0x62757a];
  const slots=[[-22,-22],[0,-22],[22,-22],[-22,0],[0,0],[22,0],[-22,22],[0,22],[22,22]];
  slots.forEach(([ox,oz],idx)=>{
    if(rand()<.18){createTree(cx+ox,cz+oz,.7);return;}
    const w=12+rand()*7,d=12+rand()*7,h=7+rand()*31;
    const mat=new THREE.MeshStandardMaterial({color:palette[Math.floor(rand()*palette.length)],roughness:.78,metalness:.04});
    const b=mesh(new THREE.BoxGeometry(w,h,d),mat,new THREE.Vector3(cx+ox,h/2+.12,cz+oz));
    world.colliders.push({x:b.position.x,z:b.position.z,w:w/2+.55,d:d/2+.55});
    const roof=mesh(new THREE.BoxGeometry(w*.35,.6,d*.35),mats.dark,new THREE.Vector3(0,h/2+.3,0),b);
    mesh(new THREE.BoxGeometry(2.1,2.7,.08),new THREE.MeshStandardMaterial({color:0x26343a,metalness:.45,roughness:.35}),new THREE.Vector3(0,-h/2+1.35,-d/2-.045),b);
    mesh(new THREE.BoxGeometry(w*1.025,.18,d*1.025),mats.sidewalk,new THREE.Vector3(0,-h/2+.05,0),b);
    if(h>18){
      const winMat=rand()>.42?mats.windowsCool:mats.windowsWarm;
      for(let side of [-1,1]){const win=mesh(new THREE.PlaneGeometry(w*.72,h*.74),winMat,new THREE.Vector3(0,0,side*(d/2+.011)),b);if(side<0)win.rotation.y=Math.PI;win.castShadow=false;}
      for(let side of [-1,1]){const win=mesh(new THREE.PlaneGeometry(d*.72,h*.74),winMat,new THREE.Vector3(side*(w/2+.011),0,0),b);win.rotation.y=side*Math.PI/2;win.castShadow=false;}
    }
  });
}

function createTree(x,z,s=1){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  mesh(new THREE.CylinderGeometry(.27,.52,3.8,9),mats.trunk,new THREE.Vector3(0,1.9,0),g);
  [[0,4.5,0],[-1,4.2,.3],[.8,4.45,.5],[.15,5.35,-.2]].forEach(([px,py,pz],i)=>{const crown=mesh(new THREE.IcosahedronGeometry(1.45+(i%2)*.3,2),mats.leaf,new THREE.Vector3(px,py,pz),g);crown.scale.set(1.05,1.18,.96);});g.scale.setScalar(s);
}

function createRock(x,z,s){const rock=mesh(new THREE.DodecahedronGeometry(1,1),new THREE.MeshStandardMaterial({color:0x77766f,roughness:1}),new THREE.Vector3(x,.2*s,z));rock.scale.set(s*1.35,s*.65,s);rock.rotation.set(rand(),rand(),rand());}

function createStreetLight(x,z,rotation){
  const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=rotation;scene.add(g);
  mesh(new THREE.CylinderGeometry(.09,.13,6.2,8),mats.dark,new THREE.Vector3(0,3.1,0),g);
  const arm=mesh(new THREE.BoxGeometry(.12,.12,1.35),mats.dark,new THREE.Vector3(0,6.1,.55),g);arm.rotation.x=-.08;
  mesh(new THREE.BoxGeometry(.48,.12,.7),mats.chrome,new THREE.Vector3(0,5.98,1.18),g);
  mesh(new THREE.PlaneGeometry(.35,.5),new THREE.MeshBasicMaterial({color:0xffe2a8}),new THREE.Vector3(0,5.9,1.18),g).rotation.x=Math.PI/2;
}

function createTower(x,z){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  mesh(new THREE.CylinderGeometry(3,5,62,8),mats.dark,new THREE.Vector3(0,31,0),g);
  for(let y=7;y<60;y+=6) mesh(new THREE.TorusGeometry(3.7,.14,5,16),mats.neon,new THREE.Vector3(0,y,0),g).rotation.x=Math.PI/2;
  const beam=mesh(new THREE.CylinderGeometry(.25,.25,90,8),mats.neon,new THREE.Vector3(0,105,0),g);beam.material=beam.material.clone();beam.material.transparent=true;beam.material.opacity=.3;
}

function createCore(x,z,id){
  const g=new THREE.Group();g.position.set(x,1.4,z);scene.add(g);g.userData={id,baseY:1.4};
  const glow=new THREE.PointLight(0x5ef6ff,4,15);g.add(glow);
  mesh(new THREE.OctahedronGeometry(.75,0),mats.neon,new THREE.Vector3(),g);
  const ring=mesh(new THREE.TorusGeometry(1.2,.07,8,24),mats.neon,new THREE.Vector3(),g);ring.rotation.x=Math.PI/2;
  world.cores.push(g);
}

function createEnemy(x,z,id){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  const skin=new THREE.MeshStandardMaterial({color:[0x704532,0x9b654b,0xc58d68,0xe0b08b][id%4],roughness:.82});
  const outfit=new THREE.MeshStandardMaterial({color:[0x354638,0x3d4651,0x60483a,0x41404f][id%4],roughness:.86});
  const fabric=new THREE.MeshStandardMaterial({color:[0x20292c,0x25282f,0x34302a][id%3],roughness:.96});
  const leather=new THREE.MeshStandardMaterial({color:0x171414,roughness:.74});
  const eyeMat=new THREE.MeshStandardMaterial({color:0x26170f,roughness:.35});
  const torso=mesh(new THREE.CapsuleGeometry(.39,.62,7,12),outfit,new THREE.Vector3(0,1.62,0),g);torso.scale.set(1,.98,.58);
  const vest=mesh(new THREE.BoxGeometry(.72,.72,.3),fabric,new THREE.Vector3(0,1.68,.24),g);vest.geometry.translate(0,0,.02);
  mesh(new THREE.BoxGeometry(.28,.13,.08),mats.dark,new THREE.Vector3(-.17,1.78,.43),g);
  mesh(new THREE.BoxGeometry(.17,.27,.09),leather,new THREE.Vector3(.2,1.55,.43),g);
  const neck=mesh(new THREE.CylinderGeometry(.15,.17,.22,10),skin,new THREE.Vector3(0,2.13,0),g);
  const head=mesh(new THREE.SphereGeometry(.31,18,14),skin,new THREE.Vector3(0,2.43,0),g);head.scale.set(.86,1.08,.9);
  const hair=mesh(new THREE.SphereGeometry(.292,16,8,0,Math.PI*2,0,Math.PI*.53),new THREE.MeshStandardMaterial({color:[0x19130f,0x35251b,0x100d0b][id%3],roughness:1}),new THREE.Vector3(0,2.5,0),g);hair.scale.set(.9,1.06,.93);
  const nose=mesh(new THREE.ConeGeometry(.055,.14,8),skin,new THREE.Vector3(0,2.42,.29),g);nose.rotation.x=Math.PI/2;
  [-.105,.105].forEach(ex=>mesh(new THREE.SphereGeometry(.034,8,6),eyeMat,new THREE.Vector3(ex,2.48,.282),g));
  mesh(new THREE.BoxGeometry(.14,.025,.018),new THREE.MeshStandardMaterial({color:0x5a2823,roughness:.8}),new THREE.Vector3(0,2.31,.292),g);
  [-1,1].forEach(side=>mesh(new THREE.SphereGeometry(.065,8,6),skin,new THREE.Vector3(side*.275,2.43,0),g).scale.set(.42,1,.72));
  const leftArm=new THREE.Group(),rightArm=new THREE.Group();leftArm.position.set(-.48,1.93,0);rightArm.position.set(.48,1.93,0);g.add(leftArm,rightArm);
  [leftArm,rightArm].forEach((arm,ai)=>{mesh(new THREE.CapsuleGeometry(.115,.5,6,9),outfit,new THREE.Vector3(0,-.32,0),arm);const hand=mesh(new THREE.SphereGeometry(.13,10,8),skin,new THREE.Vector3(0,-.73,.08),arm);hand.scale.set(.8,1.15,.7);});
  const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();leftLeg.position.set(-.21,1.1,0);rightLeg.position.set(.21,1.1,0);g.add(leftLeg,rightLeg);
  [leftLeg,rightLeg].forEach(leg=>{mesh(new THREE.CapsuleGeometry(.145,.65,6,10),fabric,new THREE.Vector3(0,-.41,0),leg);const boot=mesh(new THREE.BoxGeometry(.3,.22,.5),leather,new THREE.Vector3(0,-.88,.1),leg);boot.geometry.translate(0,0,.07);});
  const rifle=new THREE.Group();rifle.position.set(.29,1.48,.35);rifle.rotation.set(-.18,0,-.13);g.add(rifle);
  const gunMetal=new THREE.MeshStandardMaterial({color:0x22282b,metalness:.78,roughness:.3});
  mesh(new THREE.BoxGeometry(.13,.18,.85),gunMetal,new THREE.Vector3(0,0,.28),rifle);mesh(new THREE.CylinderGeometry(.035,.035,.68,10),gunMetal,new THREE.Vector3(0,.01,.98),rifle).rotation.x=Math.PI/2;mesh(new THREE.BoxGeometry(.12,.28,.22),mats.dark,new THREE.Vector3(0,-.2,.12),rifle).rotation.x=-.16;
  const muzzle=new THREE.Object3D();muzzle.position.set(0,.01,1.34);rifle.add(muzzle);
  const parts=[];g.traverse(o=>{if(o.isMesh)parts.push(o)});
  g.userData={id,health:100,head,torso,leftArm,rightArm,leftLeg,rightLeg,rifle,muzzle,origin:new THREE.Vector3(x,0,z),phase:rand()*9,lastShot:0,alive:true,walking:false};
  parts.forEach(p=>p.userData.enemy=g);[head,hair,nose].forEach(p=>p.userData.hitZone='head');world.enemies.push(g);
}

function createCar(x,z,color,driveable){
  const g=new THREE.Group();g.position.set(x,.72,z);scene.add(g);
  const paint=new THREE.MeshPhysicalMaterial({color,metalness:.62,roughness:.24,clearcoat:1,clearcoatRoughness:.16});
  const body=mesh(new THREE.BoxGeometry(3.65,.72,6.55,3,2,5),paint,new THREE.Vector3(0,0,0),g);
  mesh(new THREE.BoxGeometry(3.48,.42,2.05),paint,new THREE.Vector3(0,.42,2.12),g);
  mesh(new THREE.BoxGeometry(3.48,.46,1.55),paint,new THREE.Vector3(0,.36,-2.38),g);
  const cabin=mesh(new THREE.BoxGeometry(3.08,1.05,2.85),paint,new THREE.Vector3(0,1.03,-.15),g);cabin.scale.set(.94,1,.91);
  const windshield=mesh(new THREE.PlaneGeometry(2.65,.78),mats.glass,new THREE.Vector3(0,1.12,1.32),g);windshield.rotation.x=-.18;
  const rearGlass=mesh(new THREE.PlaneGeometry(2.65,.7),mats.glass,new THREE.Vector3(0,1.12,-1.54),g);rearGlass.rotation.set(.18,Math.PI,0);
  [-1,1].forEach(side=>{const sideGlass=mesh(new THREE.PlaneGeometry(2.25,.72),mats.glass,new THREE.Vector3(side*1.47,1.12,-.15),g);sideGlass.rotation.y=side*Math.PI/2;mesh(new THREE.BoxGeometry(.06,.76,.07),mats.dark,new THREE.Vector3(side*1.5,1.1,-.15),g);});
  const wheelMat=new THREE.MeshStandardMaterial({color:0x0a0b0c,roughness:.92});const wheels=[];
  [[-1.83,-2.08],[1.83,-2.08],[-1.83,2.08],[1.83,2.08]].forEach(([wx,wz])=>{const hub=new THREE.Group();hub.position.set(wx,-.18,wz);g.add(hub);const tire=mesh(new THREE.CylinderGeometry(.58,.58,.38,20),wheelMat,new THREE.Vector3(),hub);tire.rotation.z=Math.PI/2;mesh(new THREE.CylinderGeometry(.29,.29,.4,12),mats.chrome,new THREE.Vector3(),hub).rotation.z=Math.PI/2;wheels.push(hub);});
  [-1,1].forEach(side=>{mesh(new THREE.BoxGeometry(.72,.26,.1),new THREE.MeshStandardMaterial({color:0xf6f1d5,emissive:0xffe6a3,emissiveIntensity:.7}),new THREE.Vector3(side*1.12,.26,3.31),g);mesh(new THREE.BoxGeometry(.62,.24,.1),new THREE.MeshStandardMaterial({color:0x7c1010,emissive:0xff2020,emissiveIntensity:.45}),new THREE.Vector3(side*1.1,.25,-3.3),g);});
  mesh(new THREE.BoxGeometry(3.5,.16,.13),mats.chrome,new THREE.Vector3(0,-.16,3.35),g);mesh(new THREE.BoxGeometry(3.5,.16,.13),mats.chrome,new THREE.Vector3(0,-.16,-3.35),g);
  g.userData={driveable,speed:0,health:100,body,wheels,angle:0};g.traverse(o=>{if(o.isMesh)o.userData.car=g});world.cars.push(g);
}

function createWeapon(){
  const gun=new THREE.Group();camera.add(gun);scene.add(camera);gun.position.set(.42,-.36,-.67);gun.rotation.set(-.045,Math.PI,0);
  const gm=new THREE.MeshStandardMaterial({color:0x20282c,metalness:.82,roughness:.28});const polymer=new THREE.MeshStandardMaterial({color:0x111517,metalness:.1,roughness:.68});
  mesh(new THREE.BoxGeometry(.18,.2,.92),gm,new THREE.Vector3(0,0,.08),gun);
  mesh(new THREE.BoxGeometry(.2,.17,.58),polymer,new THREE.Vector3(0,.01,.76),gun);
  const barrel=mesh(new THREE.CylinderGeometry(.036,.043,.78,12),gm,new THREE.Vector3(0,.015,1.38),gun);barrel.rotation.x=Math.PI/2;
  const muzzleBrake=mesh(new THREE.CylinderGeometry(.065,.065,.2,12),gm,new THREE.Vector3(0,.015,1.87),gun);muzzleBrake.rotation.x=Math.PI/2;
  mesh(new THREE.BoxGeometry(.15,.46,.27),polymer,new THREE.Vector3(0,-.3,.08),gun).rotation.x=-.18;
  mesh(new THREE.BoxGeometry(.17,.45,.25),gm,new THREE.Vector3(0,-.27,.47),gun).rotation.x=.16;
  mesh(new THREE.BoxGeometry(.2,.22,.8),polymer,new THREE.Vector3(0,-.02,-.72),gun);
  mesh(new THREE.BoxGeometry(.07,.055,1.05),mats.chrome,new THREE.Vector3(0,.14,.51),gun);
  const optic=mesh(new THREE.CylinderGeometry(.095,.095,.38,12),gm,new THREE.Vector3(0,.28,.24),gun);optic.rotation.x=Math.PI/2;
  mesh(new THREE.CircleGeometry(.07,16),new THREE.MeshBasicMaterial({color:0x7bd5e8}),new THREE.Vector3(0,.28,.435),gun);
  const skin=new THREE.MeshStandardMaterial({color:0xb27b5c,roughness:.84});
  const rightHand=mesh(new THREE.CapsuleGeometry(.11,.35,6,10),skin,new THREE.Vector3(.08,-.48,-.02),gun);rightHand.rotation.x=-.38;rightHand.rotation.z=-.12;
  const leftHand=mesh(new THREE.CapsuleGeometry(.11,.4,6,10),skin,new THREE.Vector3(-.03,-.28,.92),gun);leftHand.rotation.x=Math.PI/2.8;
  const flash=new THREE.PointLight(0xffb23c,0,7);flash.position.set(0,.015,2);gun.add(flash);const flashCone=mesh(new THREE.ConeGeometry(.13,.5,8),new THREE.MeshBasicMaterial({color:0xffd477,transparent:true,opacity:.9}),new THREE.Vector3(0,.015,2.12),gun);flashCone.rotation.x=-Math.PI/2;flashCone.visible=false;
  state.gun=gun;state.muzzleFlash=flash;state.flashCone=flashCone;
}

function enterCar(car){state.driving=car;state.velocity.set(0,0,0);state.gun.visible=false;$('#ammo').classList.add('hidden');ui.speed.classList.remove('hidden');ui.carHealth.classList.remove('hidden');toast('VEHICLE ACQUIRED — DRIVE WITH ARROW KEYS');}
function exitCar(){if(!state.driving)return;const car=state.driving;state.position.copy(car.position).add(new THREE.Vector3(3,1.05,0).applyAxisAngle(UP,car.rotation.y));state.driving=null;state.gun.visible=true;$('#ammo').classList.remove('hidden');ui.speed.classList.add('hidden');ui.carHealth.classList.add('hidden');}

function updatePlayer(dt){
  if(state.driving){updateCar(dt);return;}
  const forward=new THREE.Vector3(-Math.sin(state.yaw),0,-Math.cos(state.yaw));
  const right=new THREE.Vector3().crossVectors(forward,UP);
  const input=new THREE.Vector3();if(keys.KeyW)input.add(forward);if(keys.KeyS)input.sub(forward);if(keys.KeyD)input.add(right);if(keys.KeyA)input.sub(right);input.normalize();
  const speed=keys.ShiftLeft?12:7;state.velocity.x=THREE.MathUtils.damp(state.velocity.x,input.x*speed,12,dt);state.velocity.z=THREE.MathUtils.damp(state.velocity.z,input.z*speed,12,dt);
  state.velocity.y-=22*dt;if(state.onGround&&keys.Space){state.velocity.y=8;state.onGround=false;keys.Space=false;}
  const next=state.position.clone().addScaledVector(state.velocity,dt);next.y=Math.max(1.7,next.y);if(next.y===1.7){state.velocity.y=0;state.onGround=true;}
  if(!collides(next,.45)&&Math.hypot(next.x,next.z)<166)state.position.copy(next);else{state.velocity.x*=.2;state.velocity.z*=.2;}
  camera.position.copy(state.position);camera.rotation.order='YXZ';camera.rotation.y=state.yaw;camera.rotation.x=state.pitch;
  const moving=input.lengthSq()>0;state.gun.position.y=-.3+(moving?Math.sin(world.time*(keys.ShiftLeft?14:9))*.012:0);state.gun.rotation.z=(moving?Math.sin(world.time*7)*.006:0);
  let near=null,dist=4.5;world.cars.forEach(c=>{const d=c.position.distanceTo(state.position);if(c.userData.driveable&&d<dist){near=c;dist=d;}});
  ui.interact.textContent=near?'[ E ] ENTER VEHICLE':'';ui.interact.classList.toggle('show',!!near);state.nearCar=near;
}

function updateCar(dt){
  const c=state.driving,u=c.userData;const throttle=((keys.KeyW||keys.ArrowUp)?1:0)-((keys.KeyS||keys.ArrowDown)?1:0);const max=keys.ShiftLeft?30:21;
  u.speed=THREE.MathUtils.damp(u.speed,throttle*max,(throttle?2.4:1.4),dt);if(keys.Space)u.speed*=Math.pow(.08,dt);
  const steer=((keys.KeyA||keys.ArrowLeft)?1:0)-((keys.KeyD||keys.ArrowRight)?1:0);if(Math.abs(u.speed)>.5)c.rotation.y+=steer*dt*1.45*Math.sign(u.speed)*(Math.min(Math.abs(u.speed),10)/10);
  u.wheels.forEach((wheel,i)=>{wheel.rotation.x-=u.speed*dt*.65;if(i>1)wheel.rotation.y=THREE.MathUtils.damp(wheel.rotation.y,-steer*.32,10,dt);});
  const dir=new THREE.Vector3(Math.sin(c.rotation.y),0,Math.cos(c.rotation.y));const next=c.position.clone().addScaledVector(dir,u.speed*dt);
  if(!collides(next,2)&&Math.hypot(next.x,next.z)<164)c.position.copy(next);else{u.speed*=-.25;u.health=Math.max(0,u.health-8);}
  const target=c.position.clone().add(new THREE.Vector3(-Math.sin(c.rotation.y)*10,5.3,-Math.cos(c.rotation.y)*10));camera.position.lerp(target,1-Math.pow(.001,dt));camera.lookAt(c.position.clone().add(new THREE.Vector3(0,1.1,0)));
  ui.speed.querySelector('strong').textContent=String(Math.round(Math.abs(u.speed)*5)).padStart(3,'0');ui.carHealth.querySelector('i').style.width=u.health+'%';
}

function collides(p,r){return world.colliders.some(c=>Math.abs(p.x-c.x)<c.w+r&&Math.abs(p.z-c.z)<c.d+r);}

function shoot(){
  const now=performance.now();if(!state.started||!state.locked||state.driving||state.reloading||now-state.lastShot<105)return;
  if(state.ammo<=0){reload();return;}state.lastShot=now;state.ammo--;updateHUD();ui.crosshair.classList.add('fire');setTimeout(()=>ui.crosshair.classList.remove('fire'),70);
  state.gun.position.z-=.065;state.muzzleFlash.intensity=6;state.flashCone.visible=true;setTimeout(()=>{state.gun.position.z+=.065;state.muzzleFlash.intensity=0;state.flashCone.visible=false;},55);
  raycaster.setFromCamera(new THREE.Vector2(0,0),camera);const targets=[];world.enemies.filter(e=>e.userData.alive).forEach(e=>e.traverse(o=>{if(o.isMesh)targets.push(o)}));
  const hits=raycaster.intersectObjects(targets,false);let end=camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(90));
  if(hits.length){const h=hits[0],enemy=h.object.userData.enemy,isHeadshot=h.object.userData.hitZone==='head';end=h.point;enemy.userData.health-=isHeadshot?100:34;hit(enemy.userData.health<=0);if(enemy.userData.health<=0){enemy.userData.alive=false;enemy.rotation.z=Math.PI/2;setTimeout(()=>enemy.visible=false,550);toast(isHeadshot?'HEADSHOT — HOSTILE NEUTRALIZED':'HOSTILE NEUTRALIZED');}}
  tracer(camera.position.clone().add(raycaster.ray.direction.clone().multiplyScalar(.7)),end);
}

function tracer(a,b){const geo=new THREE.BufferGeometry().setFromPoints([a,b]);const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:0xbfffff,transparent:true,opacity:.8}));scene.add(line);world.tracers.push({line,life:.08});}
function hit(kill){ui.hit.classList.toggle('kill',kill);ui.hit.classList.add('show');setTimeout(()=>ui.hit.classList.remove('show','kill'),110);}
function reload(){if(state.reloading||state.ammo===30||state.reserve===0)return;state.reloading=true;toast('RELOADING');setTimeout(()=>{const n=Math.min(30-state.ammo,state.reserve);state.ammo+=n;state.reserve-=n;state.reloading=false;updateHUD();},1250);}

function updateEnemies(dt){
  world.enemies.forEach(e=>{if(!e.userData.alive)return;const u=e.userData;const target=state.driving?state.driving.position:state.position;const d=e.position.distanceTo(target);
    u.walking=false;
    if(d<55){e.lookAt(target.x,e.position.y,target.z);if(d>12){const step=target.clone().sub(e.position).setY(0).normalize().multiplyScalar(dt*2.2);const next=e.position.clone().add(step);if(!collides(next,.6)){e.position.copy(next);u.walking=true;}}
      if(d<38&&world.time-u.lastShot>1.5+u.id*.07){u.lastShot=world.time;damage(7);const muzzle=new THREE.Vector3();u.muzzle.getWorldPosition(muzzle);tracer(muzzle,target.clone());}
    }else{e.position.x=u.origin.x+Math.sin(world.time*.45+u.phase)*5;e.position.z=u.origin.z+Math.cos(world.time*.38+u.phase)*5;u.walking=true;}
    const stride=u.walking?Math.sin(world.time*7+u.phase)*.62:Math.sin(world.time*2+u.phase)*.04;
    u.leftArm.rotation.x=stride;u.rightArm.rotation.x=-stride;u.leftLeg.rotation.x=-stride;u.rightLeg.rotation.x=stride;
  });
}
function damage(n){if(state.dead)return;if(state.shield>0){const s=Math.min(n,state.shield);state.shield-=s;n-=s;}state.health=Math.max(0,state.health-n);ui.damage.classList.add('show');setTimeout(()=>ui.damage.classList.remove('show'),160);updateHUD();if(state.health<=0){state.dead=true;document.exitPointerLock();toast('ELIMINATED — CLICK DEPLOY TO RESPAWN');setTimeout(()=>resetPlayer(),1800);}}
function resetPlayer(){state.health=100;state.shield=50;state.position.set(0,1.7,38);state.dead=false;updateHUD();ui.menu.classList.add('active');ui.hud.classList.add('hidden');state.started=false;}

function updateWorld(dt){
  world.time+=dt;world.cores.forEach(c=>{c.rotation.y+=dt*1.8;c.position.y=c.userData.baseY+Math.sin(world.time*2+c.userData.id)*.2;const target=state.driving?state.driving.position:state.position;if(c.visible&&c.position.distanceTo(target)<2.4){c.visible=false;state.cores++;updateHUD();toast('ENERGY CORE RECOVERED  +1');if(state.cores===5)toast('DISTRICT SECURED — ALL CORES RECOVERED');}});
  world.tracers.forEach(t=>{t.life-=dt;t.line.material.opacity=t.life/.08});world.tracers.filter(t=>t.life<=0).forEach(t=>{scene.remove(t.line);t.line.geometry.dispose();t.line.material.dispose()});world.tracers=world.tracers.filter(t=>t.life>0);
  world.clouds.forEach((c,i)=>{c.position.x+=dt*(.7+i%3*.12);if(c.position.x>430)c.position.x=-430;});
  const day=.5+.5*Math.sin(world.time*.018+.8);world.sun.intensity=1.4+day*2.8;scene.background.setHSL(.55,.34,.24+day*.38);scene.fog.color.copy(scene.background);
}

function updateHUD(){ui.health.textContent=Math.ceil(state.health);ui.healthBar.style.width=state.health+'%';ui.shield.textContent=Math.ceil(state.shield);ui.shieldBar.style.width=(state.shield*2)+'%';ui.ammo.textContent=state.ammo;ui.reserve.textContent=state.reserve;ui.cores.textContent=state.cores;}
let toastTimer;function toast(msg){ui.toast.textContent=msg;ui.toast.classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>ui.toast.classList.remove('show'),1700);}

function drawMap(canvas){
  const c=canvas.getContext('2d'),w=canvas.width,s=w/360;c.clearRect(0,0,w,w);c.fillStyle='#091720';c.fillRect(0,0,w,w);c.save();c.translate(w/2,w/2);c.scale(s,s);
  c.fillStyle='#294f48';c.beginPath();c.arc(0,0,172,0,Math.PI*2);c.fill();c.strokeStyle='#1b2b31';c.lineWidth=12;[-105,-35,35,105].forEach(x=>{c.beginPath();c.moveTo(x,-165);c.lineTo(x,165);c.stroke();c.beginPath();c.moveTo(-165,x);c.lineTo(165,x);c.stroke();});
  world.cores.forEach(o=>{if(!o.visible)return;c.fillStyle='#5ef6ff';c.beginPath();c.arc(o.position.x,o.position.z,3.5,0,7);c.fill();});world.cars.forEach(o=>{c.fillStyle='#d8ff52';c.fillRect(o.position.x-2,o.position.z-3,4,6);});
  const p=state.driving?state.driving.position:state.position;c.translate(p.x,p.z);c.rotate(-(state.driving?state.driving.rotation.y:state.yaw));c.fillStyle='#fff';c.beginPath();c.moveTo(0,-6);c.lineTo(4,5);c.lineTo(0,3);c.lineTo(-4,5);c.closePath();c.fill();c.restore();
}

function animate(){requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.04);if(state.started&&!state.map&&!state.dead){updatePlayer(dt);updateEnemies(dt);updateWorld(dt);drawMap(ui.minimap);}renderer.render(scene,camera);}

function start(){state.started=true;ui.menu.classList.remove('active');ui.hud.classList.remove('hidden');renderer.domElement.requestPointerLock();toast('MISSION STARTED — FIND 5 ENERGY CORES');}
ui.deploy.addEventListener('click',start);renderer.domElement.addEventListener('click',()=>{if(state.started&&!state.map&&!state.locked)renderer.domElement.requestPointerLock();});
document.addEventListener('pointerlockchange',()=>{state.locked=document.pointerLockElement===renderer.domElement;if(!state.locked&&state.started&&!state.map&&!state.dead){ui.menu.classList.add('active');ui.hud.classList.add('hidden');}});
document.addEventListener('mousemove',e=>{if(!state.locked||state.driving)return;state.yaw-=e.movementX*.0018;state.pitch=THREE.MathUtils.clamp(state.pitch-e.movementY*.0018,-1.48,1.48);});
document.addEventListener('mousedown',e=>{if(e.button===0)shoot();});
document.addEventListener('keydown',e=>{if(state.driving&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space'].includes(e.code))e.preventDefault();keys[e.code]=true;if(e.code==='KeyR')reload();if(e.code==='KeyE'&&!e.repeat){state.driving?exitCar():state.nearCar&&enterCar(state.nearCar);}if(e.code==='KeyM'&&!e.repeat)toggleMap();});
document.addEventListener('keyup',e=>keys[e.code]=false);
function toggleMap(){if(!state.started)return;state.map=!state.map;ui.map.classList.toggle('active',state.map);ui.hud.classList.toggle('hidden',state.map);if(state.map){document.exitPointerLock();drawMap(ui.bigMap);}else renderer.domElement.requestPointerLock();}
ui.closeMap.addEventListener('click',toggleMap);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

createWorld();updateHUD();camera.position.copy(state.position);animate();
setTimeout(()=>{ui.loading.style.opacity=0;setTimeout(()=>{ui.loading.classList.remove('active');ui.menu.classList.add('active');},450);},900);
