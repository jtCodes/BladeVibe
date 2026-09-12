# Aetherblade — local development

Includes the latest steel longsword, broad off-camera lighting, matte floor,
vertical camera controls, mouse/touch panning, and sheathing/drop physics.
Source snapshot: ddeb163d7dd809689d792f76389fb597ecf6c80a (saved version 10).

## Start

Install Node.js 22.12 or newer, then open a terminal in this folder:

```sh
npm ci
npm run dev -- --open
```

Vite prints the local address (usually http://localhost:5173).
Keep the terminal running. Save changes in src/ to update the browser immediately.
Stop the server with Ctrl+C. Next time, only run npm run dev -- --open.

Open this folder in your local editor or Codex local workspace to make changes.
Changes made in the hosted chat workspace do not automatically sync to this copy.

## Controls

Left-drag turns the sword by default; the editor can switch it to camera orbit.
Right-drag / two-finger drag pans. Pinch or scroll zooms.
Use Move up / Move down or the camera slider for vertical translation.
Reset view restores framing. Draw/Sheathe animates the scabbard interaction.
Drop sword enables rigid-body physics after drawing fully.

## Verify or build

npm run typecheck
npm run build
npm run preview

Dependencies download on the first npm ci. No API keys or accounts are needed.
This export excludes hosted deployment configuration and repository credentials.

## Performance

See [Rendering optimization guide](PERFORMANCE.md) for the implemented caches, resource ownership, shadow invalidation rules, and profiling workflow.

## Baked assets

The steel, gold and leather surface maps, plus Senbonzakura's Shikai/Bankai
particle and dust data, live in `src/assets/`. These are lossless binary assets
generated from the authored algorithms. Vite gives their production URLs content
hashes so browsers can cache them; refreshes load data instead of rerunning those
pixel and particle-generation loops. Only the surfaces required by a sword load.

Run `npm run assets:bake` after changing surface generation, katana blade geometry,
Senbonzakura timing/row placement, or petal breakup/noise. Commit the resulting
assets with the source. `npm run assets:check` verifies that the committed data
still matches the generators. Ordinary development and page loads do not bake.

Decoded CPU buffers are shared for the page lifetime. Each viewer still owns its
texture/mesh wrappers and GPU resources. No lossy compression, resolution reduction
or particle-count reduction is applied. The `.bin` files contain gzip data and
are decompressed by the asset loader; serve them as ordinary binary files, without
adding a `Content-Encoding: gzip` header for their internal compression.

Shader compilation, GPU uploads, render targets, studio environment filtering and
physics initialization still happen for a new viewer. GPU shader warmup remains
in place to reduce first-use Bankai stalls. Asset baking does not persist a WebGL
context or make every refresh instantaneous.

## Live navigation session

The gallery keeps previews after their first visit, and the app retains the most
recent sword editor when returning home. Reopening that sword reuses its WebGL
renderer, camera, settings, physics and effect timeline. Opening a different sword
replaces the retained editor so detailed scenes do not accumulate indefinitely.

Hidden screens and offscreen cards suspend animation, simulation, input handling
and resizing. Unfinished GPU preparation waits until its view becomes active;
unmounting still cancels and cleans it up. Returning at the same size reuses the
render targets. Gallery scroll position and editor settings stay in place.

This cache retains GPU resources in memory for the current page lifetime. A full
refresh starts a new session; the lossless asset files use the separate HTTP cache.
First visits and newly selected swords still need renderer initialization.

## Public studies, editor and sharing

- `/` is the editorial collection.
- `/swords/<id>` is the public study, with simple form and replay controls.
- `/swords/<id>/edit` opens the full editor and its Settings inspector.

Current IDs are `steel-longsword`, `senbonzakura`, and `zangetsu`. Existing bare
sword routes now open the public study. **Edit** and **View study** switch modes
without rebuilding the current scene or resetting its live animation/camera.

**Share** copies a public URL with a versioned `#state=` snapshot. It includes
appearance, lighting, background/floor, sheath/draw state, effect settings, camera
position/target, and the sword's display rotation. Senbonzakura links restore a
paused Shikai/Bankai moment (up to two minutes) with Continue, Replay, and scrubbing.
Zangetsu links restore the selected form. Longsword aura effects start playing;
their evolving particle simulation is not a frozen snapshot. Share becomes
available after a dropped sword returns to display.

The URL is the saved state; there is no account, database or server-side save.
Links use the current origin, so a localhost link is only useful on that machine.
For remote sharing, serve the app at a reachable URL with an SPA fallback to
`index.html` for `/swords/*` routes. This change does not deploy the app.

Imported state is size-limited, version checked, restricted to the sword's valid
effects, and sanitized to finite values/known settings. Invalid links show a
notice and load default settings. A plain route resumes the cached study within
the current page session. Render quality, performance metering and drag-control
preferences remain local to the current editor session.

Run `node scripts/check-sword-sharing.cjs` for share-format regression checks.
