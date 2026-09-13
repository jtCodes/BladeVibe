# Rendering optimization guide

BladeVibe asset editor · September 10, 2026

This guide records the first optimization pass and the rules for extending it as the editor becomes a game. The aim is to remove repeated work while preserving the current appearance.

The user reported a noticeable performance improvement after this pass. We have not collected comparable before/after CPU or GPU timings, so the contribution of each change remains unmeasured. Stationary shadow reuse is a likely contributor to smoother continuous rendering; texture and geometry reuse primarily reduce asset creation work and resource duplication.

## What changed

| Area | Before | Now | Expected benefit |
| --- | --- | --- | --- |
| Procedural textures | Each material request regenerated identical steel or leather maps. | Cache maps per renderer, material kind, and texture tiling. | Less startup computation and duplicate texture data. |
| Grip geometry | 85 grip rings each constructed the same torus geometry. | 85 meshes share one geometry. | Fewer geometry allocations and GPU buffers. |
| Shadows | Shadow maps could be rendered again each frame, including when the sword was stationary. | Reuse the map until the sword position or rotation changes. | Avoid redundant shadow rendering. |
| Inactive ice | Hidden mist and chip systems still ran their update loops. | Return early when their system is invisible. | Less CPU work and fewer unnecessary buffer updates. |
| Expired lightning | Arc meshes remained visible after their opacity reached zero. | Hide the meshes when their arc expires. | Avoid submitting invisible geometry for rendering. |
| Lightning buffers | Rebuilt arcs marked their entire allocated buffers for upload. | Upload only the populated ranges. | Less CPU-to-GPU data transfer. |

These changes did not lower resolution, texture detail, particle counts, or shader quality. Geometry sharing alone does **not** reduce the 85 ring meshes to one draw call; instancing would be a separate optimization.

## 1. Cache assets by all inputs that affect them

Implementation: [craft.ts](src/scene/craft.ts), [crossguard.ts](src/scene/crossguard.ts).

`surfaceMaps()` uses a `WeakMap` keyed by renderer, containing entries keyed by surface kind and repeat values. Repeated requests with the same inputs reuse the texture objects.

The guard uses different tiling from the blade. Its texture wrappers are cloned from the base textures, sharing their pixel source while retaining independent UV transforms. This matters: changing `repeat` on one shared texture object would also change every material using it.

For future assets:

- Include every appearance-changing input in the cache key: seed, resolution, color variant, tiling, and so on.
- Treat cached objects as immutable once handed to consumers.
- Use a separate wrapper or variant when one consumer needs different sampling or UV settings.
- Keep resource ownership explicit. A consumer must not dispose an asset that others still use.

Current lifetime: scene cleanup disposes unique textures and geometries using sets; renderer cleanup clears the texture-cache references. The cache is scoped to this viewer's renderer. It is not a persistent disk cache or an asset manager shared across independently disposed scenes.

For a game with multiple scenes sharing one renderer, introduce an asset owner or reference counting before sharing these resources across scene lifetimes.

## 2. Share geometry when only transforms differ

Implementation: `gripRibGeometry` in [createSwordScene.ts](src/scene/createSwordScene.ts).

The grip rings have identical vertex data and material. Their positions differ, so each mesh now references the same geometry and applies its own transform.

This reduces geometry duplication without changing placement or appearance. Individual meshes still have their own scene traversal and draw submission costs.

For many repeated objects, consider `InstancedMesh` next. Validate material compatibility, culling, picking, and shadow behavior before converting. If the vertex data itself must change independently, a shared mutable geometry is not appropriate.

## 3. Cache expensive results until their inputs change

Implementation: `updateShadowCache()` in [createSwordScene.ts](src/scene/createSwordScene.ts).

The current studio has a fixed shadow-casting light and fixed scabbard. The sword is the moving shadow caster. Shadow auto-update is disabled, and the renderer is marked dirty on the first frame or when the sword's position or quaternion changes.

That preserves updates during drawing, dropping, and reset. Moving the viewing camera alone does not change the light's view of this fixed scene, so it does not require a fresh shadow map. The studio light-angle slider currently rotates the reflection environment, not the shadow-casting directional light.

### Invalidation is part of the feature

The current check is specific to the current scene. Expand it before adding:

- Sword scaling, deformation, skeletal animation, or animated alpha-cutout casters.
- Moving enemies, props, lights, or the scabbard.
- Caster visibility changes or geometry replacement.
- Shadow resolution, light projection, bias, or other shadow settings changes.

A future implementation can maintain a shadow revision counter and increment it whenever a relevant dependency changes. Do not reuse this sword-only check unchanged in a combat arena.

Screen-space reflections are different: their result depends on camera position and visible scene content. We have not cached those rendered frames. The static studio environment was already generated once and reused before this pass.

## 4. Skip work for inactive systems

Implementation: [coldMist.ts](src/scene/coldMist.ts), [iceChips.ts](src/scene/iceChips.ts), [electric.ts](src/scene/electric.ts).

Hiding an object does not automatically stop application-side simulation code. Mist and ice chips now return before their particle loops when disabled. Expired lightning meshes are explicitly hidden instead of relying only on zero opacity.

Mode changes already clear the relevant particle state. This supports the current behavior: changing back to an effect starts fresh instead of replaying stale particles.

Choose the inactive-state policy deliberately for future systems:

| Policy | Appropriate use |
| --- | --- |
| Reset on reactivation | Disposable cosmetic effects, such as the current mist. |
| Freeze and resume | An editor's explicit simulation pause. |
| Advance or reconstruct elapsed state | Gameplay systems that must stay consistent while unseen. |

Do not suspend damage, cooldowns, or gameplay physics simply because their visuals are hidden. This pass does not stop the overall render loop, all physics work, or all inactive-effect bookkeeping.

## 5. Reuse buffers and upload only what changed

Implementation: [electric.ts](src/scene/electric.ts).

Lightning already used a pool of preallocated geometry buffers. Each rebuilt arc now also sets update ranges for the populated position and radial data and a matching draw range.

`addUpdateRange(0, offset)` counts scalar array components. `setDrawRange(0, offset / 3)` counts vertices for these non-indexed meshes. Mixing those units can truncate geometry or upload the wrong region.

The lightning changes shape whenever it fires. Caching one finished bolt and repeating it would change the effect. Reusing buffer capacity while updating its contents preserves variation. Temporary vectors and arrays are still allocated while generating arcs; pooling those is a possible follow-up if allocation profiling shows pressure.

## Verification performed

- TypeScript check and production build passed.
- Targeted checks confirmed repeated map identity, shared pixel sources, independent blade/guard tiling, and cache invalidation.
- Browser review checked appearance, a physical drop and changed shadow, return to display, and switching to ice and back to electric.
- The checked browser session reported no runtime errors.

These checks support correctness. They do not establish a quantified frame-rate gain or prove performance on other devices.

## How to measure the next pass

Use the same browser, viewport, pixel ratio, camera, effect settings, and hardware for both versions. Run one viewer tab, warm up shaders, and compare several runs of each scenario:

1. Stationary drawn sword, rotation paused, effects off.
2. Camera orbit with reflections enabled.
3. Electric effect at 100% and 200% intensity.
4. Ice mist and the flame effect, separately.
5. Drawing, dropping, resting, and reset.

Record median and slow-frame timings, CPU and GPU time where available, draw calls, triangles, geometry/texture counts, and allocation or garbage-collection activity. Record startup separately from steady-state rendering. A 60 FPS frame budget is about 16.7 ms; averages alone can conceal visible stalls.

Profile screen-space reflections and the flame raymarcher next. Other candidates include instancing repeated ornaments, reducing arc-generation allocations, and rendering only on changes when both motion and effects are paused. Select the next change from measured costs, and validate its appearance and invalidation rules before keeping it.

## Large-canvas upscaling

The spatial upscaler normally reads 17 texture samples per output pixel. For the
rigid longsword in bare, glow, and electric modes with the floor hidden, it now
uses a single sample outside conservative projected content bounds. Reconstruction
inside the bounds keeps the existing resolution, kernel, and sharpening.

Bounds include visible meshes and particle positions, with padding for lightning
thickness, point sprites, and screen-space filters. Dynamic position buffers are
remeasured; hidden objects are excluded. Near-plane intersections and instanced
geometry fall back to full-frame filtering. Anime releases, floor scenes, and
volume effects do not use this optimization. Extend the bounds policy before
allowing other shader-deformed effects through it.

This reduces empty-background work in the upscaler only. It does not crop scene
rendering, reflections, or antialiasing, and does not cap render resolution.
The screenshot comparison showed 3.2M versus 11.2M render pixels with similar
geometry counts; it does not establish individual pass costs. Build and projected
bounds checks passed, but before/after browser FPS and visual parity are unmeasured.
Run `node scripts/check-projected-scene-bounds.mjs` for bounds regression checks.

## Post-processing MSAA and diagnostics

The scene beauty target retains hardware MSAA, while composer ping-pong targets
now use single-sample HDR color without depth buffers. Full-screen filters no
longer allocate and resolve multisampled attachments. With reflections disabled,
the direct scene pass renders into the same beauty target and copies its resolved
color into the composer, preserving geometry antialiasing on both paths.

The meter reports scene and post-processing sample counts separately. GPU timing
rotates one query per sampled frame between the complete render and enabled
passes; values come from different frames and should not be added together.
Resize clears pending results. This change still needs before/after GPU and visual
validation on the affected large display.
