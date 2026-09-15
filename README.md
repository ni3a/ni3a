# Neon District

A lightweight browser FPS prototype built with Three.js. Explore a procedural island city, fight patrols, recover energy cores, and enter a drivable vehicle. Everything is generated from code—there are no model or texture downloads.

## Run locally

ES modules need an HTTP server (opening `index.html` directly will not work):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Controls

- `WASD`: move / drive
- Mouse: aim
- Left click: fire
- `Shift`: sprint / vehicle boost
- `Space`: jump / handbrake
- `R`: reload
- `E`: enter or exit the red vehicle
- `M`: full map
- `Esc`: pause / release mouse

## Deploy to Cloudflare Pages

This is a static project with no build step. In Cloudflare Pages, connect this repository and set:

- Framework preset: `None`
- Build command: leave empty
- Build output directory: `/`

For a production multiplayer version, keep the current client-side entity model and add a Cloudflare Worker with Durable Objects for authoritative rooms, player state, and WebSocket broadcasts.
