# Roadmap

The roadmap favors a convincing playable slice before breadth. Dates are intentionally omitted until the first implementation is measured.

## Milestone 1: playable FPS demo

- First-person movement, aim, sprint, and jump
- One hitscan weapon with ammo and reload
- Player health and combat feedback
- Basic enemy behavior
- Compact world with clear landmarks and boundaries
- HUD, pause/pointer-lock behavior, and loading state
- Public Cloudflare Pages deployment

## Milestone 2: vehicles and polish

- Enter and exit one vehicle type
- Arcade acceleration, steering, braking, and collision
- Stable third-person chase camera while driving
- Stronger environment art, effects, and audio
- Performance profiling and quality scaling

If vehicle work is already stable in the first implementation, Milestones 1 and 2 can ship together as the initial demo.

## Milestone 3: friend multiplayer prototype

- Two-player private room or invite flow
- Networked player movement and orientation
- Remote player representation and interpolation
- Replicated fire, damage, and health
- Vehicle ownership and enter/exit synchronization
- Disconnect and reconnect behavior

This milestone requires a server-authoritative realtime component. Hosting the static client on Cloudflare Pages alone is not sufficient.

## Milestone 4: multiplayer hardening

- Prediction and reconciliation under realistic latency
- Server-side validation and basic abuse prevention
- Session lifecycle, capacity limits, and observability
- Expanded browser/device testing
- Load and failure testing

## Milestone 5: content growth

- Additional weapons, cars, and encounters
- More world regions and discovery mechanics
- Progression or persistence only after the core loop proves engaging

## Prioritization rule

A feature moves forward when it strengthens at least one of these outcomes: responsive combat, freedom of movement, memorable exploration, social play, or demo reliability. Features that add breadth without improving the moment-to-moment experience remain deferred.
