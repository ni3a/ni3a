# Technical architecture

## Approach

The first version should remain a static client-side application. Three.js handles rendering; browser APIs handle input and the animation loop. A backend is unnecessary for the single-player demo, but game state should be kept separate from rendering so networking can be added later without rewriting every mechanic.

Keep the entry point small and move independent responsibilities into ES modules as the implementation grows.

## Recommended modules

| Module | Responsibility |
| --- | --- |
| `game` | Bootstrapping, lifecycle, game state, and the main loop |
| `renderer` | WebGL renderer, resize behavior, pixel ratio, and quality settings |
| `world` | Scene construction, terrain, lighting, and world boundaries |
| `player` | Position, movement, health, active weapon, and vehicle state |
| `weapons` | Fire cadence, raycasts, ammo, reload, and damage events |
| `enemies` | Enemy state, simple AI, attacks, damage, and cleanup |
| `vehicles` | Enter/exit rules, steering, acceleration, braking, and collisions |
| `camera` | FPS view, vehicle chase view, transitions, and obstruction handling |
| `input` | Keyboard, mouse, pointer lock, and normalized actions |
| `ui` | Loading, crosshair, health, ammo, prompts, pause, and debug output |

These are boundaries, not a requirement to create every file immediately. Split a module when its responsibility becomes hard to reason about or test in place.

## Runtime flow

1. Create renderer, scene, camera, and the initial game state.
2. Show a loading state while required assets initialize.
3. Create the world, entities, and a known safe player spawn.
4. Attach input only after the page has user focus.
5. On each animation frame, calculate a capped delta time.
6. Read input, advance simulation, update cameras and effects, then update UI.
7. Render the scene.

Use `requestAnimationFrame` and keep movement frame-rate independent. Cap unusually large frame deltas after a hidden tab resumes so actors do not jump through geometry.

## Multiplayer-ready boundaries

Multiplayer is not part of the static first release. To avoid unnecessary rework later:

- represent input as actions rather than direct DOM-event mutations;
- keep player, weapon, enemy, and vehicle state in plain serializable data where practical;
- separate simulation updates from Three.js meshes and visual effects;
- identify entities with stable IDs;
- route damage, firing, entering, and exiting through explicit commands or events;
- avoid depending on frame rate for outcomes; and
- keep networking code out of core gameplay modules when it is introduced.

This does not make the game multiplayer by itself. A real multiplayer milestone will require an authoritative realtime service, room lifecycle, state snapshots, interpolation, prediction/reconciliation, and security review. Cloudflare Pages can continue serving the client, while server-side realtime infrastructure is selected separately.

## Performance budget

- Reuse geometries and materials.
- Use `InstancedMesh` for repeated scenery.
- Limit shadow casters and keep shadow maps modest.
- Clamp renderer pixel ratio.
- Prefer compressed, appropriately sized textures and models.
- Avoid allocating objects inside per-frame updates.
- Pool frequent effects such as impacts or muzzle flashes.
- Add distance-based detail or hide distant objects as the world expands.

Track approximate frame rate, draw calls, triangles, and initial transfer size during development. Final targets should follow testing on representative hardware.

## Collision and combat

Start with simple collision primitives: a player capsule, boxes around major scenery, raycasts for hitscan fire and ground checks, and explicit world boundaries. Vehicle collision can begin with a box or sphere and arcade-style resolution. Add a physics engine only when these tests cannot reliably support required behavior.

Damage should be a simulation event, not a direct mesh mutation. This keeps HUD, audio, enemy behavior, and future network replication independently replaceable.

## Asset conventions

- Use lowercase descriptive filenames without spaces.
- Use glTF/GLB for imported 3D assets.
- Compress textures and keep them appropriately sized.
- Record third-party asset licenses before merging.
- Prefer relative URLs so preview and production deployments match.

## Resilience and security

Display a readable error if WebGL is unavailable or an asset fails. Handle resize, loss of focus, and pointer-lock exit without corrupting state. Everything shipped to the browser is public: never place secrets or privileged tokens in client code. Future secrets belong behind a tightly scoped server-side service.
