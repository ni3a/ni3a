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
renderer.toneMappingExposure = 1.08;
$('#game').appendChild(renderer.domElement);

const clock = new THREE.Clock();
const UP = new THREE.Vector3(0, 1, 0);
const raycaster = new THREE.Raycaster();
const world = { colliders: [], enemies: [], cars: [], cores: [], tracers: [], time: 0 };
const state = {
  started: false, locked: false, map: false, driving: null,
  health: 100, shield: 50, ammo: 30, reserve: 120, cores: 0,
  yaw: 0, pitch: 0, velocity: new THREE.Vector3(), onGround: true,
  position: new THREE.Vector3(0, 1.7, 38), reloading: false, lastShot: 0, dead: false
};
const keys = {};

const mats = {
  grass: new THREE.MeshStandardMaterial({ color: 0x5d8d62, roughness: .95 }),
  road: new THREE.MeshStandardMaterial({ color: 0x202b31, roughness: .9 }),
  sidewalk: new THREE.MeshStandardMaterial({ color: 0xa6ada6, roughness: .95 }),
  dark: new THREE.MeshStandardMaterial({ color: 0x101b22, roughness: .75 }),
  neon: new THREE.MeshStandardMaterial({ color: 0x56f5ff, emissive: 0x27b8c9, emissiveIntensity: 2 }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x59402d, roughness: 1 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x205a43, roughness: 1 }),
};

function mesh(geo, mat, position, parent = scene) {
  const m = new THREE.Mesh(geo, mat); m.position.copy(position); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}

function seeded(seed) { let s = seed; return () => ((s = Math.imul(48271, s) % 2147483647) & 2147483647) / 2147483647; }
const rand = seeded(94721);

function createWorld() {
  const hemi = new THREE.HemisphereLight(0xbcecff, 0x344a36, 2.2); scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff0cf, 3.2); sun.position.set(-80, 130, 60); sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = sun.shadow.camera.bottom = -180; sun.shadow.camera.right = sun.shadow.camera.top = 180; scene.add(sun);
  world.sun = sun;

  mesh(new THREE.CylinderGeometry(174, 190, 4, 64), mats.grass, new THREE.Vector3(0, -2, 0));
  const water = mesh(new THREE.PlaneGeometry(1400, 1400), new THREE.MeshStandardMaterial({color:0x167d9a,roughness:.25,metalness:.15,transparent:true,opacity:.88}), new THREE.Vector3(0,-3.7,0));
  water.rotation.x = -Math.PI/2;

  [-105,-35,35,105].forEach(x => road(x, 0, 12, 330));
  [-105,-35,35,105].forEach(z => road(0, z, 330, 12));
  for (let gx=-2; gx<=1; gx++) for(let gz=-2; gz<=1; gz++) createBlock(gx*70+0, gz*70+0, gx, gz);

  for(let i=0;i<58;i++) {
    const a=rand()*Math.PI*2, r=120+rand()*42; createTree(Math.cos(a)*r,Math.sin(a)*r,.8+rand()*.6);
  }
  createTower(-2, -2);
  [[28,32],[-76,22],[72,-77],[-116,-105],[105,72]].forEach((p,i)=>createCore(p[0],p[1],i));
  [[3,40,0xff405f],[-45,-97,0x5ef6ff],[80,39,0xd8ff52]].forEach((p)=>createCar(p[0],p[1],p[2],true));
  [[25,-20],[-52,58],[76,-42],[-110,80],[112,10],[3,-106],[55,104],[-84,-75]].forEach((p,i)=>createEnemy(p[0],p[1],i));
  createWeapon();
}

function road(x,z,w,d){
  mesh(new THREE.BoxGeometry(w,.16,d),mats.road,new THREE.Vector3(x,.01,z)).receiveShadow=true;
  const stripeMat = new THREE.MeshBasicMaterial({color:0xe8c75c});
  if(w>d) for(let px=-w/2+8;px<w/2;px+=16) mesh(new THREE.BoxGeometry(7,.02,.16),stripeMat,new THREE.Vector3(x+px,.11,z));
  else for(let pz=-d/2+8;pz<d/2;pz+=16) mesh(new THREE.BoxGeometry(.16,.02,7),stripeMat,new THREE.Vector3(x,.11,z+pz));
}

function createBlock(cx,cz,gx,gz){
  const palette=[0x84949a,0xb29c84,0x6e7b86,0xc1b9a5,0x62757a];
  const slots=[[-22,-22],[0,-22],[22,-22],[-22,0],[0,0],[22,0],[-22,22],[0,22],[22,22]];
  slots.forEach(([ox,oz],idx)=>{
    if(rand()<.18){createTree(cx+ox,cz+oz,.7);return;}
    const w=12+rand()*7,d=12+rand()*7,h=7+rand()*31;
    const mat=new THREE.MeshStandardMaterial({color:palette[Math.floor(rand()*palette.length)],roughness:.85});
    const b=mesh(new THREE.BoxGeometry(w,h,d),mat,new THREE.Vector3(cx+ox,h/2+.12,cz+oz));
    world.colliders.push({x:b.position.x,z:b.position.z,w:w/2+.55,d:d/2+.55});
    const roof=mesh(new THREE.BoxGeometry(w*.35,.6,d*.35),mats.dark,new THREE.Vector3(0,h/2+.3,0),b);
    if(h>18){
      const winMat=new THREE.MeshBasicMaterial({color:rand()>.35?0x90d9db:0xffd787});
      for(let y=-h/2+3;y<h/2-1;y+=4) for(let side of [-1,1]){
        const win=mesh(new THREE.PlaneGeometry(w*.55,1.1),winMat,new THREE.Vector3(0,y,side*(d/2+.011)),b); if(side<0)win.rotation.y=Math.PI;
      }
    }
  });
}

function createTree(x,z,s=1){
  const g=new THREE.Group();g.position.set(x,0,z);scene.add(g);
  mesh(new THREE.CylinderGeometry(.35,.55,3.5,7),mats.trunk,new THREE.Vector3(0,1.75,0),g);
  mesh(new THREE.IcosahedronGeometry(2.1,1),mats.leaf,new THREE.Vector3(0,4.5,0),g).scale.set(1,1.25,1);
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
  const skin=new THREE.MeshStandardMaterial({color:[0x8c5c45,0xb97b5c,0xd19a73][id%3],roughness:.85});
  const outfit=new THREE.MeshStandardMaterial({color:[0x941f38,0x314d78,0x4c3e65,0x75542f][id%4],roughness:.72});
  const pants=new THREE.MeshStandardMaterial({color:0x18232c,roughness:.9});
  const torso=mesh(new THREE.BoxGeometry(.85,1.05,.42),outfit,new THREE.Vector3(0,1.55,0),g);
  const head=mesh(new THREE.SphereGeometry(.31,10,8),skin,new THREE.Vector3(0,2.38,0),g);
  const hair=mesh(new THREE.SphereGeometry(.32,10,5,0,Math.PI*2,0,Math.PI*.48),mats.dark,new THREE.Vector3(0,2.48,0),g);
  const visor=mesh(new THREE.BoxGeometry(.48,.1,.06),mats.neon,new THREE.Vector3(0,2.4,-.285),g);
  const leftArm=new THREE.Group(),rightArm=new THREE.Group();leftArm.position.set(-.57,1.94,0);rightArm.position.set(.57,1.94,0);g.add(leftArm,rightArm);
  mesh(new THREE.CapsuleGeometry(.11,.58,3,6),outfit,new THREE.Vector3(0,-.34,0),leftArm);
  mesh(new THREE.CapsuleGeometry(.11,.58,3,6),outfit,new THREE.Vector3(0,-.34,0),rightArm);
  const leftLeg=new THREE.Group(),rightLeg=new THREE.Group();leftLeg.position.set(-.23,1.05,0);rightLeg.position.set(.23,1.05,0);g.add(leftLeg,rightLeg);
  mesh(new THREE.CapsuleGeometry(.14,.68,3,6),pants,new THREE.Vector3(0,-.42,0),leftLeg);
  mesh(new THREE.CapsuleGeometry(.14,.68,3,6),pants,new THREE.Vector3(0,-.42,0),rightLeg);
  const parts=[torso,head,hair,visor];
  leftArm.traverse(o=>{if(o.isMesh)parts.push(o)});rightArm.traverse(o=>{if(o.isMesh)parts.push(o)});leftLeg.traverse(o=>{if(o.isMesh)parts.push(o)});rightLeg.traverse(o=>{if(o.isMesh)parts.push(o)});
  g.userData={id,health:100,head,torso,leftArm,rightArm,leftLeg,rightLeg,origin:new THREE.Vector3(x,0,z),phase:rand()*9,lastShot:0,alive:true,walking:false};
  parts.forEach(p=>p.userData.enemy=g);[head,hair,visor].forEach(p=>p.userData.hitZone='head');world.enemies.push(g);
}

function createCar(x,z,color,driveable){
  const g=new THREE.Group();g.position.set(x,.65,z);scene.add(g);
  const paint=new THREE.MeshStandardMaterial({color,metalness:.45,roughness:.3});
  const body=mesh(new THREE.BoxGeometry(3.7,.75,6.8),paint,new THREE.Vector3(0,0,0),g);body.geometry.translate(0,0,.1);
  const cabin=mesh(new THREE.BoxGeometry(3.25,.9,3.2),new THREE.MeshStandardMaterial({color:0x172a35,metalness:.6,roughness:.18}),new THREE.Vector3(0,.75,.1),g);cabin.scale.set(.9,1,1);
  const wheelMat=new THREE.MeshStandardMaterial({color:0x090b0d,roughness:1});
  [[-1.9,-2.1],[1.9,-2.1],[-1.9,2.1],[1.9,2.1]].forEach(([wx,wz])=>{const w=mesh(new THREE.CylinderGeometry(.55,.55,.35,12),wheelMat,new THREE.Vector3(wx,-.2,wz),g);w.rotation.z=Math.PI/2;});
  g.userData={driveable,speed:0,health:100,body,angle:0};body.userData.car=g;world.cars.push(g);
}

function createWeapon(){
  const gun=new THREE.Group();camera.add(gun);scene.add(camera);gun.position.set(.38,-.3,-.62);gun.rotation.set(-.05,Math.PI,0);
  const gm=new THREE.MeshStandardMaterial({color:0x17252d,metalness:.75,roughness:.3});
  mesh(new THREE.BoxGeometry(.15,.18,.72),gm,new THREE.Vector3(0,0,0),gun);
  mesh(new THREE.BoxGeometry(.08,.09,.62),mats.dark,new THREE.Vector3(0,.07,.58),gun);
  mesh(new THREE.BoxGeometry(.06,.06,.18),mats.neon,new THREE.Vector3(0,.11,.04),gun);
  state.gun=gun;
}

function enterCar(car){state.driving=car;state.velocity.set(0,0,0);state.gun.visible=false;$('#ammo').classList.add('hidden');ui.speed.classList.remove('hidden');ui.carHealth.classList.remove('hidden');toast('VEHICLE ACQUIRED');}
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
  const c=state.driving,u=c.userData;const throttle=(keys.KeyW?1:0)-(keys.KeyS?1:0);const max=keys.ShiftLeft?30:21;
  u.speed=THREE.MathUtils.damp(u.speed,throttle*max,(throttle?2.4:1.4),dt);if(keys.Space)u.speed*=Math.pow(.08,dt);
  const steer=(keys.KeyA?1:0)-(keys.KeyD?1:0);if(Math.abs(u.speed)>.5)c.rotation.y+=steer*dt*1.45*Math.sign(u.speed)*(Math.min(Math.abs(u.speed),10)/10);
  const dir=new THREE.Vector3(Math.sin(c.rotation.y),0,Math.cos(c.rotation.y));const next=c.position.clone().addScaledVector(dir,u.speed*dt);
  if(!collides(next,2)&&Math.hypot(next.x,next.z)<164)c.position.copy(next);else{u.speed*=-.25;u.health=Math.max(0,u.health-8);}
  const target=c.position.clone().add(new THREE.Vector3(-Math.sin(c.rotation.y)*10,5.3,-Math.cos(c.rotation.y)*10));camera.position.lerp(target,1-Math.pow(.001,dt));camera.lookAt(c.position.clone().add(new THREE.Vector3(0,1.1,0)));
  ui.speed.querySelector('strong').textContent=String(Math.round(Math.abs(u.speed)*5)).padStart(3,'0');ui.carHealth.querySelector('i').style.width=u.health+'%';
}

function collides(p,r){return world.colliders.some(c=>Math.abs(p.x-c.x)<c.w+r&&Math.abs(p.z-c.z)<c.d+r);}

function shoot(){
  const now=performance.now();if(!state.started||!state.locked||state.driving||state.reloading||now-state.lastShot<105)return;
  if(state.ammo<=0){reload();return;}state.lastShot=now;state.ammo--;updateHUD();ui.crosshair.classList.add('fire');setTimeout(()=>ui.crosshair.classList.remove('fire'),70);
  state.gun.position.z-=.065;setTimeout(()=>state.gun.position.z+=.065,55);
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
      if(d<38&&world.time-u.lastShot>1.5+u.id*.07){u.lastShot=world.time;damage(7);tracer(e.position.clone(),target.clone());}
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
  const day=.5+.5*Math.sin(world.time*.018+.8);world.sun.intensity=1.2+day*2.4;scene.background.setHSL(.54,.42,.2+day*.42);scene.fog.color.copy(scene.background);
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
document.addEventListener('keydown',e=>{keys[e.code]=true;if(e.code==='KeyR')reload();if(e.code==='KeyE'&&!e.repeat){state.driving?exitCar():state.nearCar&&enterCar(state.nearCar);}if(e.code==='KeyM'&&!e.repeat)toggleMap();});
document.addEventListener('keyup',e=>keys[e.code]=false);
function toggleMap(){if(!state.started)return;state.map=!state.map;ui.map.classList.toggle('active',state.map);ui.hud.classList.toggle('hidden',state.map);if(state.map){document.exitPointerLock();drawMap(ui.bigMap);}else renderer.domElement.requestPointerLock();}
ui.closeMap.addEventListener('click',toggleMap);
addEventListener('resize',()=>{camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();renderer.setSize(innerWidth,innerHeight);});

createWorld();updateHUD();camera.position.copy(state.position);animate();
setTimeout(()=>{ui.loading.style.opacity=0;setTimeout(()=>{ui.loading.classList.remove('active');ui.menu.classList.add('active');},450);},900);
