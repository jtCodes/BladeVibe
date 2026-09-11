import type * as THREE from 'three';
import type {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import type {createBankai} from './bankai';
import type {createShikai} from './shikai';

// Run the real HDR/shadow/postprocessing paths once while the viewer is loading.
// A tiny offscreen target prepares shader variants and geometry uploads without
// paying for extra inactive lights or drawing the warmup states on the canvas.
export async function warmupSwordEffects(
 scene:THREE.Scene,composer:EffectComposer,
 bankai:ReturnType<typeof createBankai>,shikai:ReturnType<typeof createShikai>,
 beforeRender:()=>void,signal:AbortSignal,waitUntilActive?:()=>Promise<void>,
){
 const toScreen=composer.renderToScreen;
 const passStates=composer.passes.map(pass=>[pass,pass.enabled] as const);
 const culling=new Map<THREE.Object3D,boolean>();
 scene.traverse(object=>{culling.set(object,object.frustumCulled);object.frustumCulled=false;});
 composer.renderToScreen=false;
 // 32px keeps all bloom mip levels and half-resolution SSR targets nonzero.
 composer.setPixelRatio(1);composer.setSize(32,32);
 for(const [pass] of passStates)pass.enabled=true;
 async function renderFrame(){
  signal.throwIfAborted();
  await new Promise<void>(resolve=>setTimeout(resolve,0));
  signal.throwIfAborted();
  await waitUntilActive?.();
  signal.throwIfAborted();beforeRender();composer.render(0);
 }
 try {
  await renderFrame();
  shikai.configure('shikai',1,1);shikai.seek(shikai.duration);
  await renderFrame();
  shikai.configure('off',1,1);shikai.update(0,0);
  await bankai.warmup(renderFrame);
 } finally {
  shikai.configure('off',1,1);shikai.update(0,0);
  for(const [object,frustumCulled] of culling)object.frustumCulled=frustumCulled;
  for(const [pass,enabled] of passStates)pass.enabled=enabled;
  composer.renderToScreen=toScreen;
 }
}
