# Deploying to Cloudflare Pages

The first single-player release is intended to be a static site, which makes Cloudflare Pages a simple deployment target. The final settings depend on whether the implementation remains dependency-free or gains a build tool.

## Before deploying

- Confirm the entry page is `index.html`.
- Use relative or root-safe asset and module URLs.
- Match filename capitalization exactly.
- Keep secrets and local filesystem paths out of client files.
- Run the production build, if any, without console errors.

## Git integration

1. Push the project to GitHub.
2. In Cloudflare, open **Workers & Pages** and create a Pages application.
3. Choose Git integration and connect the repository.
4. Select the production branch, normally `main`.
5. Enter the matching settings below, then deploy.

| Project type | Build command | Output directory |
| --- | --- | --- |
| Plain HTML/CSS/JS at repository root | Leave empty | `/` |
| Vite | `npm run build` | `dist` |
| Other bundler | Production build command | Generated output directory |

Do not guess a framework preset; use the configuration matching the merged implementation.

## Direct upload alternative

After authenticating Wrangler, a plain static project can be uploaded with:

```bash
npx wrangler pages deploy . --project-name ni3a
```

For a bundled project, replace `.` with its output directory, such as `dist`.

## Post-deployment checks

- Load the production URL in a private browser window.
- Check the browser console and network panel for failures.
- Test movement, aim, fire, reload, damage, and pointer lock.
- Enter, drive, and exit a vehicle, then test pause/resume.
- Refresh and confirm a valid restart.
- Check models, textures, audio, and fonts for 404 responses.
- Test Chromium and Firefox on ordinary laptop hardware.

## Common failures

### Blank page or missing modules

Verify the output directory, module script type, import paths, and filename capitalization.

### Assets work locally but not in production

Cloud hosting paths are case-sensitive. Confirm assets are included in the deployed output and referenced using deploy-safe URLs.

### Changes do not appear

Confirm Cloudflare deployed the expected branch and commit, then retry that deployment before changing cache rules.

### Poor production performance

Inspect network size and renderer statistics. Resize textures, compress models, reduce shadow cost, pool weapon effects, and instance repeated objects.

## Multiplayer deployment later

Cloudflare Pages only serves the browser client. Friend multiplayer will also need an authoritative realtime backend. Select and document that service during the multiplayer milestone rather than exposing secrets or treating client state as trusted.
