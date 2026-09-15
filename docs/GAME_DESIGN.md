# Game design

## Elevator pitch

NI3A is a compact open-world FPS that runs instantly in the browser. The player explores a stylized city-and-wilderness map, fights enemies, and switches seamlessly between on-foot combat and driving. Its innovation should come from making a small world feel energetic and free—not from imitating every system in a commercial sandbox game.

## Design pillars

### Fast, readable action

Movement, aiming, firing, damage, and reload state must be immediately understandable. Strong hit feedback matters more than a large weapon roster.

### Freedom in a small space

The player should be able to choose a direction, pick a fight, or take a vehicle immediately. A small, dense map with distinct regions is more effective for the demo than a large empty one.

### Two movement fantasies

On foot, the game is a first-person shooter. Inside a car, it changes to a stable third-person chase camera with accessible arcade handling. Entering and exiting should feel quick and clear.

### Efficient spectacle

Lighting, fog, particles, instancing, procedural placement, and reusable props should create atmosphere without a large download or content pipeline.

## First-release loop

1. Load into a safe starting area with controls visible.
2. Find a weapon and engage a nearby enemy.
3. Manage health, ammo, and reload timing.
4. Enter a vehicle and drive toward a prominent landmark.
5. Discover another encounter or point of interest.

For a video demo, movement should begin within seconds, combat should be visible early, and a driving sequence should be reachable in under a minute.

## World proposal

Build one compact map with three visually distinct zones:

- **Arrival block:** safe spawn, clear controls, and a low-risk first encounter.
- **Neon district:** streets, simple building forms, cover, enemies, and a parked car.
- **Wild fringe:** terrain, rocks, trees, and a distant structure that rewards driving.

The zones can share low-poly geometry and materials while varying palette, density, lighting, and prop distribution.

## Combat target

Start with one reliable hitscan weapon. It needs a crosshair, muzzle flash, impact feedback, ammo counter, reload timing, and clear enemy damage or defeat feedback. Enemies need only enough behavior to patrol or approach, detect the player, attack, take damage, and reset or disappear cleanly.

## Release boundaries

### In scope

- First-person movement, sprinting, and jumping
- Mouse aim and pointer lock
- One polished hitscan weapon
- Health, ammo, reload, and basic enemies
- Enter/exit vehicle flow and arcade driving
- Chase camera while driving
- Terrain, landmarks, collisions, and a concise HUD

### Deferred

- Online multiplayer, accounts, lobbies, and matchmaking
- Multiple weapon classes or complex inventories
- Sophisticated NPC AI, police, or traffic simulation
- Vehicle damage and a large vehicle roster
- Economy, quests, and saved progression
- Full mobile controls

These are deferred to protect stability and iteration speed. Multiplayer comes after the single-player mechanics are deterministic and cleanly separated from presentation.

## Definition of done

The first release is ready to demo when:

- the game opens from a public HTTPS URL without console-blocking errors;
- movement, aim, fire, reload, health, and enemy damage work consistently;
- a player can enter, drive, and exit a car without losing control;
- camera transitions do not commonly clip through the world;
- the player and vehicle cannot unintentionally leave or fall through the map;
- a new player can understand the controls without explanation;
- the experience maintains a stable, usable frame rate on a typical laptop; and
- refreshing restores a valid starting state.

## Multiplayer direction

The eventual social experience is a small friend session, not a massive public world. A later prototype should begin with two players who can join a room, see each other move, and share a vehicle/combat space. Server authority, latency handling, reconciliation, anti-cheat, and persistence are separate engineering milestones—not assumptions hidden inside the static first build.
