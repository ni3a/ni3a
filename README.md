# NI3A

NI3A is an experimental browser-based 3D open-world FPS built with HTML, CSS, JavaScript, and [Three.js](https://threejs.org/). The first milestone is a polished single-player demo with shooting, enemies, and drivable cars. The longer-term direction combines Fortnite-like action with GTA-like freedom and multiplayer exploration with friends.

> [!NOTE]
> The game implementation is being developed separately. This repository currently contains the project documentation; commands and controls below describe the intended first release and should be checked against the implementation when it lands.

## Vision

The project aims for the freedom and discovery of a sandbox game while keeping its first version focused enough to ship quickly. The demo should:

- load quickly in a modern desktop browser;
- deliver responsive first-person movement, aiming, and shooting;
- let the player enter a car and drive through a compact open world;
- provide enemies and a simple combat loop;
- use procedural or reusable content to create scale efficiently; and
- deploy as a static site on Cloudflare Pages.

The first iteration is a single-player vertical slice, not a full GTA- or Fortnite-sized game. Multiplayer is a planned evolution after the core movement, combat, vehicles, and world are stable.

## Planned first release

- First-person movement and mouse look
- Aiming, hitscan weapons, ammo, reload, and health
- Basic enemy behavior and combat feedback
- Enterable, drivable cars with a chase camera
- A compact open environment with landmarks
- Basic collision and world boundaries
- Atmospheric lighting, fog, and shadows
- HUD for crosshair, health, ammo, and controls
- Static deployment with no required backend

See [docs/GAME_DESIGN.md](docs/GAME_DESIGN.md) for the scope and experience goals.

## Proposed controls

| Input | Action |
| --- | --- |
| `W` `A` `S` `D` | Move / drive |
| Mouse | Look / aim |
| Left click | Fire |
| `R` | Reload |
| `Shift` | Sprint |
| `Space` | Jump / vehicle brake |
| `E` | Enter or exit a vehicle |
| `Esc` | Release pointer / pause |

Controls marked here are a design target until the playable build is merged.

## Getting started

The exact development command depends on how the game implementation is delivered. For a dependency-free static build, serve the project root with any local HTTP server rather than opening `index.html` directly:

```bash
npx serve .
```

Then open the local URL printed in the terminal. A local server is necessary because browsers restrict some module and asset loading from `file://` URLs.

If a `package.json` is added with the game, prefer the scripts it defines:

```bash
npm install
npm run dev
```

## Project structure

The intended structure keeps the prototype approachable while allowing systems to be separated as it grows:

```text
.
├── index.html          # Browser entry point
├── src/                # Game systems and application code
├── styles/             # HUD and page styles
├── assets/             # Models, textures, audio, and other static assets
├── docs/               # Design, architecture, and deployment notes
└── README.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for recommended module boundaries and multiplayer-readiness guidelines.

## Deployment

NI3A is designed to deploy its first single-player build as a static Cloudflare Pages project. In the simplest setup, connect this GitHub repository, leave the build command empty, and set the output directory to the folder containing `index.html` (normally the repository root). If the implementation introduces a bundler, use its build command and generated output directory instead.

Full setup and verification steps are in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

## Documentation

- [Game design and scope](docs/GAME_DESIGN.md)
- [Technical architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Cloudflare deployment](docs/DEPLOYMENT.md)
- [Contributing](docs/CONTRIBUTING.md)

## Browser support

The first release targets current desktop versions of Chrome, Edge, and Firefox with WebGL enabled. Safari and mobile support are stretch goals until they are tested against the playable build.

## Status

Pre-alpha. The documentation establishes the first-release contract while the playable implementation is in progress.

## License

No license has been selected yet. Until one is added, the source remains under its default copyright protections.
