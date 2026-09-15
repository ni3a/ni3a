# Contributing

NI3A is in an early prototype phase. Changes should keep the demo easy to run, quick to load, and simple to understand.

## Workflow

1. Create a short-lived branch from `main`.
2. Run the game through a local HTTP server.
3. Make one focused change.
4. Test the main combat, exploration, and driving loop.
5. Update documentation when controls, setup, structure, or deployment changes.
6. Open a pull request describing the player-visible result and testing performed.

## Change checklist

- The game loads from a clean browser session.
- Movement, camera, firing, and vehicle controls remain usable.
- No new uncaught console errors appear.
- New assets have known, compatible licenses.
- Paths work on case-sensitive hosting.
- Large or repeated scene objects are performance-conscious.
- No secrets, API keys, or machine-specific paths are committed.
- README controls and commands match the build.

## Code style

Prefer small ES modules, descriptive names, and straightforward browser APIs. Keep simulation, rendering, input, and UI responsibilities separate where practical. Comments should explain intent or constraints rather than restating code.

Until automated formatting and tests are configured, follow the conventions in surrounding files and manually test before submitting a change.

## Reporting a bug

Include the expected and actual behavior, exact reproduction steps, browser and operating system, console errors, a screenshot or recording for visual issues, and the affected commit or deployed URL.
