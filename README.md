# BladeX

**Legendary blades. High-quality 3D rendering. Every angle yours.**

BladeX brings legendary swords to life with high-quality, real-time 3D rendering: detailed materials, carefully shaped studio lighting, reflections, and cinematic particle effects. Turn polished steel under the light, release Senbonzakura into a storm of petals, or reveal Tensa Zangetsu. Then pause the moment, shape the scene, and share your view.

Built for the browser, with live 3D scenes, hands-on controls, and an editor for getting every detail just right. No account or API keys required.

## Meet the collection

| Sword | The experience |
| --- | --- |
| **Senbonzakura** | Explore the lavender-wrapped katana, scatter its blade with Shikai, and unleash Bankai. Camera storm sends petals toward your viewpoint by default; Original drift offers another way to watch the release. |
| **Zangetsu** | Inspect the oversized black blade and white cloth binding, then switch to its Bankai form, Tensa Zangetsu. |
| **Steel longsword** | Get close to tempered steel and wrapped leather, or add glow and sparks, flame, ice, and electric effects. |

## Make the moment yours

- **Look closer.** Polished steel, textured leather, silk wrapping, and lacquered surfaces give each blade its own character. Studio lighting and reflections reveal the materials as you move, while glowing petals and atmospheric effects bring the releases to life.
- **Direct the reveal.** Replay, pause, and scrub Senbonzakura’s release timeline to explore the transformation at your own pace.
- **Find your angle.** Rotate the sword, orbit the camera, pan, and zoom to frame the details that catch your eye.
- **Set the atmosphere.** Adjust lighting, reflections, background, floor, effect speed, and intensity. Tune Senbonzakura’s glow and petals in the editor.
- **Feel the weight.** Draw and sheathe supported swords, unwrap Zangetsu, and drop eligible drawn blades into a physics simulation.
- **Share your composition.** Copy a link that carries your sword, appearance, camera, and effect settings. Senbonzakura links can preserve a paused release moment.

Start with **Senbonzakura → Bankai**, open the sword options to try both variants, then choose **Edit** to shape the scene. Use **Share** when you find a moment worth keeping.

## Run it locally

Install Node.js 22.12 or newer, then run:

```sh
npm ci
npm run dev -- --open
```

Open the local address printed by Vite. Keep the terminal running while you explore; press Ctrl+C to stop. On later visits, just run `npm run dev -- --open`.

For the quickest path to the spectacle, open `/swords/senbonzakura/bankai` on your local server.

## Controls

| Action | Control |
| --- | --- |
| Turn the sword | Left-drag; switch the drag target in the editor to orbit the camera |
| Pan | Right-drag or two-finger drag |
| Zoom | Scroll or pinch |
| Adjust camera height | Move up / Move down or the editor’s camera slider |
| Restore framing | Reset view |
| Explore a release | Form buttons, playback controls, and Senbonzakura’s timeline |
| Draw, sheathe, or drop | Sword & sheath controls in the editor, when available |

## Public studies, editor and sharing

- `/` is the editorial collection.
- `/swords/<id>` is the public study, with simple form and replay controls.
- `/swords/<id>/edit` opens the full editor and its Settings inspector.

Current IDs are `steel-longsword`, `senbonzakura`, and `zangetsu`. **Edit** and **View study** switch modes
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
For remote sharing, deploy the app to a reachable URL. The included Vercel configuration serves each supported route with its own metadata.

Imported state is size-limited, version checked, restricted to the sword's valid
effects, and sanitized to finite values/known settings. Invalid links show a
notice and load default settings. A plain route resumes the cached study within
the current page session. Render quality, performance metering and drag-control
preferences remain local to the current editor session.

Run `node scripts/check-sword-sharing.cjs` for share-format regression checks.

### Form URLs

Senbonzakura supports `/swords/senbonzakura/shikai` and
`/swords/senbonzakura/bankai`; each plain URL starts that release.
Zangetsu supports `/swords/zangetsu/shikai` (the original unwrapped form) and
`/swords/zangetsu/bankai` (Tensa Zangetsu). Unsupported form URLs redirect to
that sword's main page using history replacement. Editor URLs remain `/edit`.
Share links use the applicable form suffix; a matching saved state retains its
time and camera, while a different form suffix starts the requested form at zero.

## Development

Built with **React, TypeScript, Three.js, Rapier physics, and Vite**. Save changes in `src/` to update the running development view.

```sh
npm run typecheck
npm run build
npm run preview
```

The production build is written to `dist/`.

### Vercel, search, and link previews

Import the repository into Vercel. The included `vercel.json` builds the app and serves clean URLs from the generated HTML files. Each sword, Shikai, and Bankai page includes its own title, description, canonical URL, and Open Graph/Twitter metadata before JavaScript runs. In-app navigation updates the metadata too. Editor pages are marked `noindex`; unknown routes receive a custom 404 page.

The build uses Vercel’s production domain for canonical URLs and `sitemap.xml`. Set **`SITE_URL`** in Vercel’s environment variables to choose a specific primary domain, such as `https://your-domain.com`. This also works for local production builds. Keep the value to the origin, without a path, query, or fragment.

Set **`SOCIAL_IMAGE_URL`** to the absolute HTTPS URL of a publicly accessible PNG or JPEG to add a shared preview image. Without it, the app emits text metadata only; it does not invent a screenshot. Saved `#state=` fragments restore the scene in the browser, but are not sent to preview crawlers, so previews describe the corresponding sword/form rather than the exact saved frame.

`robots.txt` points crawlers to the sitemap, which lists public pages and excludes editors and saved-state fragments. Submit `/sitemap.xml` in Google Search Console after deploying. The 3D app still renders in the browser; these generated files provide metadata, not a server-rendered version of the scene.

```sh
node scripts/check-seo.mjs
```

On other hosts, map clean URLs to their matching generated `.html` files and serve `404.html` with a 404 status for unknown routes. A blanket rewrite to the homepage would discard the page-specific metadata. Vite’s development server is for app development; verify production routing and link previews on Vercel after deployment.

<details>
<summary>Rendering, baked assets, and session caching</summary>

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


</details>
