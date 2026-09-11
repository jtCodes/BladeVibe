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

Drag: orbit. Right-drag: pan. Two-finger drag: pan. Pinch/scroll: zoom.
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
