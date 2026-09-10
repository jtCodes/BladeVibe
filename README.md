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
