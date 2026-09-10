# Sword gallery

`/` displays code-defined swords as live 3D renders. Each sword links to its detailed editor at `/swords/<id>`. The existing sword is `/swords/steel-longsword`.

The only surrounding UI is a small “Swords” title and each sword's name. There is no creation flow or browser-local asset storage.

## Actual previews

`SwordPreview.tsx` uses the same `createSwordScene` implementation as the detailed editor: actual geometry, materials, studio lighting, and effects. Preview mode hides the scabbard and frames the drawn sword. It disables canvas interaction and keyboard listeners so clicking opens the detail URL and touch gestures scroll the gallery. Rotation respects reduced-motion preferences.

Each card loads its preview when near the viewport and disposes it when it leaves. This avoids retaining offscreen render loops and WebGL contexts. Each visible card still owns a renderer; for a much larger gallery, a shared renderer with viewport/scissor rendering would avoid browser context limits.

## Adding swords in code

Define a stable entry in `src/swordLibrary.ts`, implement its detailed model/editor, and register the editor in `src/App.tsx` and preview in `src/Gallery.tsx`. The current model is `longsword`; entries do not generate new geometry automatically. Keep preview and editor backed by the same sword implementation.

Editor settings are temporary inspection controls initialized from code-defined defaults. Catalog URLs work wherever that version of the application is served. Production hosts must serve the SPA entry point for `/swords/*` requests.

No browser checks, tests, or builds were run for this change, as requested. Validation remains with the user.
