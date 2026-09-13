import {swordDisplayCenter,centeredSwordView} from './swordFraming';
import type {BankaiPetalMotion} from './bankaiPetalMotion';
import {createSceneEnvironment,type LightingSettings} from './sceneEnvironment';
export type {LightingSettings} from './sceneEnvironment';
import {swordEnvironmentPreset,SENBONZAKURA_BANKAI_FOG} from './sceneEnvironmentPresets';
import {yieldScenePreparation} from './yieldScenePreparation';
import {SENBONZAKURA_POMMEL_TIP_Y,SENBONZAKURA_BLADE_LENGTH} from './senbonzakuraDimensions';
import {getBankaiCameraView} from './bankaiCamera';
import type {SwordViewState,SwordViewRequest} from './swordViewState';
import {prepareSurfaceAssets} from './surfaceAssets';
import {prepareSakuraAssets} from './sakuraAssets';
import {warmupSwordEffects} from './warmupSwordEffects';
import {swordModels,type SwordModel} from './swordModels';
import {createSpatialUpscale} from './spatialUpscale';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {createPerformanceMeter} from './performanceMeter';
import {createBankai} from './bankai';
import {createShikai} from './shikai';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {SSRPass} from 'three/addons/postprocessing/SSRPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {clearSurfaceMapCache} from './craft';
import {clearClothMaterialCache} from './clothMaterials';
import { initializePhysics, createSwordPhysics, FLOOR_Y, type MotionStatus } from './swordPhysics';
import { createBladeAura, type EffectMode } from './aura';
export type TimelineEffect='bankai'|'shikai';
export interface EffectSeekRequest { effect:TimelineEffect; time:number; paused:boolean }
export interface ViewerSettings { bankaiPetalMotion?:BankaiPetalMotion; viewState?:SwordViewRequest; effectSeek?:EffectSeekRequest; effectPaused?:boolean; glowStrength?:number; glowSpread?:number; petalGlow?:number; upscaling?:'native'|'ultra'|'quality'; dragTarget?:'sword'|'camera'; antiAliasing?:'standard'|'smooth'|'high'; showPerformance?:boolean; lighting?: LightingSettings; rotating: boolean; draw: number; reflections: boolean; lightAngle: number; floorColor?: string; backgroundColor?: string; cameraHeight: number; showSheath?: boolean; swordRotation?: number; effect: EffectMode; effectSpeed: number; effectIntensity: number }
export interface EffectTimeline { time:number; duration:number; cycleDuration:number }
export interface SwordScene { getViewState():SwordViewState; setActive(active:boolean):void; getEffectTimeline(effect?:TimelineEffect):EffectTimeline|null; seekEffect(time:number,paused?:boolean):void; update(settings: ViewerSettings): void; reset(): void; release(): boolean; dispose(): void }
export async function createSwordScene(container: HTMLDivElement, onError: (message: string) => void, onStatus: (status: MotionStatus) => void, signal: AbortSignal, options:{preview?:boolean;model?:SwordModel;active?:boolean;waitUntilActive?:()=>Promise<void>}={}): Promise<SwordScene> {
signal.throwIfAborted();
await yieldScenePreparation(signal);
const modelId=options.model??'longsword';
await Promise.all([initializePhysics(),prepareSurfaceAssets(modelId==='senbonzakura'||modelId==='zangetsu'?['steel']:['steel','leather']),modelId==='senbonzakura'?prepareSakuraAssets():Promise.resolve()]);
signal.throwIfAborted();
await options.waitUntilActive?.();
signal.throwIfAborted();
const cleanups: Array<() => void> = [];
let active=options.active??true;
try {
const scene=new THREE.Scene();scene.background=new THREE.Color(0x141413);scene.fog=new THREE.FogExp2(0x141413,.032);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;container.appendChild(renderer.domElement);cleanups.push(()=>{clearSurfaceMapCache(renderer);clearClothMaterialCache(renderer);renderer.dispose();renderer.domElement.remove()});
cleanups.push(()=>{
 const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>(), textures=new Set<THREE.Texture>();
 scene.traverse(object=>{
  if(object instanceof THREE.Mesh || object instanceof THREE.Points){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}
 });
 for(const material of materials){for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);material.dispose();}
 for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();
});
const meter=createPerformanceMeter(renderer,container);cleanups.push(()=>meter.dispose());
const camera=new THREE.PerspectiveCamera(34,1,.1,100);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=true;controls.screenSpacePanning=true;controls.panSpeed=.8;controls.touches.ONE=THREE.TOUCH.ROTATE;controls.touches.TWO=THREE.TOUCH.DOLLY_PAN;controls.minDistance=4;controls.maxDistance=34;controls.autoRotate=true;controls.autoRotateSpeed=.25;cleanups.push(()=>controls.dispose());
// Hold arrow keys to pan in the camera's screen plane, independent of frame rate.
const heldArrows=new Set<string>();
const arrowKeys=new Set(['ArrowLeft','ArrowRight','ArrowUp','ArrowDown']);
const cameraStep=new THREE.Vector3(),cameraRight=new THREE.Vector3(),cameraUp=new THREE.Vector3();
const ownsKeys=(target:EventTarget|null)=>target instanceof Element&&!!target.closest('input,textarea,select,button,a,[contenteditable]:not([contenteditable="false"]),[role="slider"],[role="textbox"]');
function clearArrows(){heldArrows.clear()}
function keyDown(event:KeyboardEvent){
 if(!active||!arrowKeys.has(event.key)||container.clientWidth<=0||container.clientHeight<=0)return;
 if(ownsKeys(event.target)||event.altKey||event.ctrlKey||event.metaKey){clearArrows();return;}
 event.preventDefault();heldArrows.add(event.key);
}
function keyUp(event:KeyboardEvent){heldArrows.delete(event.key)}
function focusChanged(event:FocusEvent){if(ownsKeys(event.target))clearArrows()}
function focusCanvas(){if(active)renderer.domElement.focus({preventScroll:true})}
if(!options.preview){
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','Sword camera. Arrow keys move the camera; drag to orbit.');
window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',clearArrows);
document.addEventListener('visibilitychange',clearArrows);document.addEventListener('focusin',focusChanged);
renderer.domElement.addEventListener('pointerdown',focusCanvas);
cleanups.push(()=>{
 clearArrows();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clearArrows);
 document.removeEventListener('visibilitychange',clearArrows);document.removeEventListener('focusin',focusChanged);renderer.domElement.removeEventListener('pointerdown',focusCanvas);
});
}
function moveCamera(dt:number){
 const x=Number(heldArrows.has('ArrowRight'))-Number(heldArrows.has('ArrowLeft'));
 const y=Number(heldArrows.has('ArrowUp'))-Number(heldArrows.has('ArrowDown'));
 if(!x&&!y)return;
 camera.updateMatrix();cameraRight.setFromMatrixColumn(camera.matrix,0);cameraUp.setFromMatrixColumn(camera.matrix,1);
 cameraStep.copy(cameraRight).multiplyScalar(x).addScaledVector(cameraUp,y).normalize().multiplyScalar(camera.position.distanceTo(controls.target)*.35*dt);
 camera.position.add(cameraStep);controls.target.add(cameraStep);
}
controls.enabled=active&&!options.preview;
// OrbitControls owns pointer capture during a camera gesture. End that gesture
// through its normal cancel handler before hiding the retained canvas.
const controlPointers=new Set<number>();
function trackControlPointer(event:PointerEvent){if(active&&controls.enabled)controlPointers.add(event.pointerId)}
function forgetControlPointer(event:PointerEvent){controlPointers.delete(event.pointerId)}
function stopControlDrag(){
 for(const pointerId of [...controlPointers])renderer.domElement.dispatchEvent(new PointerEvent('pointercancel',{pointerId}));
 controlPointers.clear();
}
renderer.domElement.addEventListener('pointerdown',trackControlPointer);
renderer.domElement.addEventListener('pointerup',forgetControlPointer);
renderer.domElement.addEventListener('pointercancel',forgetControlPointer);
cleanups.push(()=>{
 stopControlDrag();renderer.domElement.removeEventListener('pointerdown',trackControlPointer);
 renderer.domElement.removeEventListener('pointerup',forgetControlPointer);renderer.domElement.removeEventListener('pointercancel',forgetControlPointer);
});
await yieldScenePreparation(signal);
const environmentPreset=swordEnvironmentPreset(modelId);
const environment=createSceneEnvironment(scene,renderer,environmentPreset);cleanups.push(()=>environment.dispose());
const sword=new THREE.Group();scene.add(sword);sword.rotation.z=Math.PI-.16;
const model=swordModels[options.model??'longsword'];
const isKatana=options.model==='senbonzakura',isZangetsu=options.model==='zangetsu';
await yieldScenePreparation(signal);
const scabbard=model.create(renderer,sword);
const displayCenter=swordDisplayCenter(sword);
await yieldScenePreparation(signal);
const floorMaterial=new THREE.MeshStandardMaterial({color:0x141413,metalness:0,roughness:.9});
const floor=new THREE.Mesh(new THREE.PlaneGeometry(1000,1000),floorMaterial);scene.add(floor);floor.rotation.x=-Math.PI/2;floor.position.y=FLOOR_Y;floor.castShadow=false;floor.receiveShadow=true;
(model.sheathOnSword?sword:scene).add(scabbard);if(options.preview)scabbard.visible=false;
// Atmospheric color belongs to the distant floor, not the displayed sword or cloth.
for(const root of [sword,scabbard])root.traverse(object=>{
 if(object instanceof THREE.Mesh){
  for(const material of Array.isArray(object.material)?object.material:[object.material]){
   if('fog' in material){material.fog=false;material.needsUpdate=true;}
  }
 }
});
// Authored parts move with the sword root; cloth animates vertex buffers, not transforms.
// Bake local matrices once while retaining parent/world transform updates.
for(const root of [sword,scabbard])root.traverse(object=>{
 if(object instanceof THREE.Mesh){object.updateMatrix();object.matrixAutoUpdate=false;}
});
const physics=createSwordPhysics(sword,onStatus,model.physics);cleanups.push(()=>physics.dispose());
await yieldScenePreparation(signal);
const shikai=isKatana?createShikai(sword):null;
if(shikai)cleanups.push(()=>shikai.dispose());
const aura=shikai??createBladeAura(sword,renderer.getPixelRatio());
await yieldScenePreparation(signal);
const bankai=isKatana?createBankai(sword,floor,scene):null;
if(bankai)cleanups.push(()=>bankai.dispose());
let dragTarget:'sword'|'camera'='sword',spinRequested=false,dragPointer:number|null=null,dragX=0,dragY=0;
const dragRight=new THREE.Vector3(),dragUp=new THREE.Vector3(),dragTurn=new THREE.Quaternion(),dragPitch=new THREE.Quaternion(),spinAxis=new THREE.Vector3(0,1,0);
function stopSwordDrag(){if(dragPointer!==null&&renderer.domElement.hasPointerCapture(dragPointer))renderer.domElement.releasePointerCapture(dragPointer);dragPointer=null;}
function swordPointerDown(event:PointerEvent){
 if(!active||dragTarget!=='sword'||event.button!==0||event.pointerType==='touch')return;
 event.preventDefault();event.stopImmediatePropagation();renderer.domElement.focus({preventScroll:true});
 if(bankai?.active||physics.released||physics.draw<.999)return;
 dragPointer=event.pointerId;dragX=event.clientX;dragY=event.clientY;renderer.domElement.setPointerCapture(event.pointerId);
}
function swordPointerMove(event:PointerEvent){
 if(!active||event.pointerId!==dragPointer)return;event.preventDefault();event.stopImmediatePropagation();
 if(bankai?.active||physics.released){stopSwordDrag();return;}
 camera.updateMatrixWorld();dragRight.setFromMatrixColumn(camera.matrixWorld,0);dragUp.setFromMatrixColumn(camera.matrixWorld,1);
 const sensitivity=Math.PI/Math.max(250,container.clientHeight);
 dragTurn.setFromAxisAngle(dragUp,(event.clientX-dragX)*sensitivity);dragPitch.setFromAxisAngle(dragRight,(event.clientY-dragY)*sensitivity);
 physics.rotateBy(dragTurn.premultiply(dragPitch));dragX=event.clientX;dragY=event.clientY;
}
function swordPointerUp(event:PointerEvent){if(active&&event.pointerId===dragPointer){event.stopImmediatePropagation();stopSwordDrag();}}
if(!options.preview){
 renderer.domElement.addEventListener('pointerdown',swordPointerDown,true);renderer.domElement.addEventListener('pointermove',swordPointerMove,true);
 renderer.domElement.addEventListener('pointerup',swordPointerUp,true);renderer.domElement.addEventListener('pointercancel',swordPointerUp,true);
 renderer.domElement.addEventListener('lostpointercapture',stopSwordDrag);window.addEventListener('blur',stopSwordDrag);
 cleanups.push(()=>{stopSwordDrag();renderer.domElement.removeEventListener('pointerdown',swordPointerDown,true);renderer.domElement.removeEventListener('pointermove',swordPointerMove,true);renderer.domElement.removeEventListener('pointerup',swordPointerUp,true);renderer.domElement.removeEventListener('pointercancel',swordPointerUp,true);renderer.domElement.removeEventListener('lostpointercapture',stopSwordDrag);window.removeEventListener('blur',stopSwordDrag);});
}
// The fixed studio light only needs a new shadow map when a caster moves.
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
const shadowPosition=new THREE.Vector3(Infinity,Infinity,Infinity),shadowRotation=new THREE.Quaternion();
let shadowRevision=-1;
function updateShadowCache(){
 const revision=sword.userData.shadowRevision??0;
 if(revision!==shadowRevision||!sword.position.equals(shadowPosition)||!sword.quaternion.equals(shadowRotation)){
  shadowRevision=revision;
  renderer.shadowMap.needsUpdate=true;shadowPosition.copy(sword.position);shadowRotation.copy(sword.quaternion);
 }
}
// Canvas AA does not cover offscreen postprocessing. Multisample the HDR buffer.
const gl=renderer.getContext();
const supportedSamples='getInternalformatParameter' in gl ? Array.from(gl.getInternalformatParameter(gl.RENDERBUFFER,gl.RGBA16F,gl.SAMPLES) as Int32Array) : [];
const samples=Math.max(0,...supportedSamples.filter(value=>value<=4));
const target=new THREE.WebGLRenderTarget(1,1,{type:THREE.HalfFloatType,samples});
await yieldScenePreparation(signal);
const composer=new EffectComposer(renderer,target);
const reflectiveMeshes: THREE.Mesh[]=[];
sword.traverse(object=>{if(object instanceof THREE.Mesh){const materials=Array.isArray(object.material)?object.material:[object.material];if(materials.some(material=>material instanceof THREE.MeshStandardMaterial&&material.metalness>.8))reflectiveMeshes.push(object)}});
// Screen-space reflections capture nearby visible objects; the studio remains the fallback.
const reflections=new SSRPass({renderer,scene,camera,width:1,height:1,selects:reflectiveMeshes,groundReflector:null});
reflections.resolutionScale=.5;reflections.opacity=.38;reflections.maxDistance=9;reflections.thickness=.035;reflections.blur=true;
reflections.beautyRenderTarget.samples=samples;
const directRender=new RenderPass(scene,camera);directRender.enabled=false;
composer.addPass(directRender);composer.addPass(reflections);
let reflectionsRequested=true;
function updateReflectionPath(){
 // Display the isolated object; retain ground contact for releases and Bankai.
 floor.visible=!!bankai?.active||physics.released;

 // SSRPass computes normals, masks, ray marching, and blur even in Beauty mode.
 // Skip it entirely when disabled or no selected reflective object is visible.
 const visibleReflector=reflectionsRequested&&reflectiveMeshes.some(mesh=>{
  let object:THREE.Object3D|null=mesh;
  while(object){if(!object.visible)return false;object=object.parent;}
  return true;
 });
 reflections.enabled=visibleReflector;directRender.enabled=!visibleReflector;
}
// This Three.js version expects SMAA in linear color space, before OutputPass.
composer.addPass(new SMAAPass());
const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.14,0,3.);composer.addPass(bloom);
// Apply display brightness after the fixed filmic curve, preserving tone ratios.
const output=new OutputPass();
const displayBrightness={value:1};
Object.assign(output.uniforms,{displayBrightness});
output.material.fragmentShader=output.material.fragmentShader
 .replace('uniform sampler2D tDiffuse;', 'uniform sampler2D tDiffuse;\nuniform float displayBrightness;')
 .replace(/}\s*$/, 'gl_FragColor.rgb *= displayBrightness;\n}');
composer.addPass(output);
// Smooth the final display-space edges, including postprocessing and shader cutouts.
const edgeAA=new ShaderPass(FXAAShader);composer.addPass(edgeAA);
const upscale=createSpatialUpscale();composer.addPass(upscale);
let renderScale=1;
let aaMode:'standard'|'smooth'|'high'='standard';
let lastWidth=0,lastHeight=0,lastPixelRatio=0,lastRenderScale=0;
cleanups.push(()=>{for(const pass of composer.passes)pass.dispose();composer.dispose()});
let cameraHeight=0,effectSpeed=1,effectIntensity=1,effectPaused=false;
let effectMode:EffectMode='off';
let settingsApplied=false,sheathVisible=false;
let lastSeek:EffectSeekRequest|undefined;
let lastView: SwordViewRequest|undefined;
let glowStrength=.42,glowSpread=.8,petalGlow=4,performanceRequested=false;
function update(settings: ViewerSettings){
 const firstSettings=!settingsApplied;
 const seekRequest=settings.effectSeek!==lastSeek&&settings.effectSeek?.effect===settings.effect?settings.effectSeek:undefined;
 lastSeek=settings.effectSeek;
 const poseChanged=physics.setGroundedUpright(isKatana&&settings.effect==='shikai');
 const view=settings.viewState!==lastView?settings.viewState:undefined;lastView=settings.viewState;
 if(view){
  bankai?.cancel();shikai?.update(0,0);physics.restore();
  physics.setRotation(settings.swordRotation??0);
  physics.setDragRotation('reset' in view?[0,0,0,1]:view.rotation);physics.setDraw(settings.draw/100);physics.restore();
  if('reset' in view){cameraHeight=settings.cameraHeight;reset();}
 }
 const nextDrag=settings.dragTarget??'sword';if(nextDrag!==dragTarget)stopSwordDrag();dragTarget=nextDrag;spinRequested=settings.rotating;
 const nextAA=options.preview?'standard':settings.antiAliasing??'smooth';
 const nextScale=options.preview?1:settings.upscaling==='ultra'?.9:settings.upscaling==='quality'?.85:1;
 if(nextAA!==aaMode||nextScale!==renderScale){aaMode=nextAA;renderScale=nextScale;resize();}
 upscale.enabled=renderScale<1;
 edgeAA.enabled=aaMode!=='standard';
 performanceRequested=!options.preview&&!!settings.showPerformance;meter.setEnabled(active&&performanceRequested);
 displayBrightness.value=environment.update({lighting:settings.lighting,backgroundColor:settings.backgroundColor,floorColor:settings.floorColor,floor:floorMaterial,lightAngle:settings.lightAngle,fogDensity:isKatana&&settings.effect==='bankai'?SENBONZAKURA_BANKAI_FOG:environmentPreset.fogDensity});
 bankai?.setPetalMotion(settings.bankaiPetalMotion??'storm');
 effectSpeed=settings.effectSpeed;effectIntensity=settings.effectIntensity;effectPaused=settings.effectPaused??false;effectMode=settings.effect;
 glowStrength=THREE.MathUtils.clamp(settings.glowStrength??.42,0,1.5);glowSpread=THREE.MathUtils.clamp(settings.glowSpread??.8,0,1);petalGlow=THREE.MathUtils.clamp(settings.petalGlow??4,0,8);
 if(bankai?.active&&settings.effect!=='bankai'){bankai.cancel();physics.setDraw(settings.draw/100);physics.restore();}
 if(isZangetsu)scabbard.userData.setUnwrapped(settings.draw/100);
 const showSheath=!options.preview&&settings.effect!=='bankai'&&settings.effect!=='shikai'&&(settings.showSheath??false);
 const sheathChanged=sheathVisible!==showSheath;sheathVisible=showSheath;settingsApplied=true;
 if(scabbard.visible!==showSheath){scabbard.visible=showSheath;renderer.shadowMap.needsUpdate=true;}
 physics.setRotation(settings.swordRotation??0);
 const lift=settings.cameraHeight-cameraHeight;camera.position.y+=lift;controls.target.y+=lift;cameraHeight=settings.cameraHeight;
 physics.setDraw(settings.draw/100);
 if(poseChanged||(view&&'reset' in view&&settings.effect==='shikai')){
  physics.restore();
  if(settings.effect==='shikai'&&!options.preview&&(!view||'reset' in view)){
   const center=FLOOR_Y+(SENBONZAKURA_BLADE_LENGTH-SENBONZAKURA_POMMEL_TIP_Y)/2+cameraHeight;
   const distance=Math.max(14,4/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect)));
   applyCameraView({camera:[1.1,center+.3,distance],target:[0,center,0]});
  }
 }
 aura.configure(settings.effect,settings.effectSpeed,settings.effectIntensity);
 if(bankai&&!bankai.active&&settings.effect==='bankai'){
  physics.setDraw(1);physics.restore();shikai?.update(0,0);bankai.start();
  if(!options.preview&&(!view||'reset' in view)){
   applyCameraView(getBankaiCameraView(bankai.formationOrigin,camera.aspect,camera.fov));
  }
 }
 if(seekRequest){
  if(settings.effect==='shikai'){physics.setDraw(1);physics.restore();shikai?.setPetalGlow(petalGlow);}
  else bankai?.update(0,effectSpeed,effectIntensity,petalGlow);
  seekEffect(seekRequest.time,seekRequest.paused);
 }
 // Longsword effects supply their own additive glow. Full-scene bloom also
 // catches polished steel reflections, creating angle-dependent glowing blobs.
 bloom.enabled=isKatana&&settings.effect==='shikai'&&settings.effectIntensity>0;
 bloom.threshold=isKatana?1.1:3.;
 bloom.strength=isKatana?.24:.14;
 reflectionsRequested=settings.reflections;reflections.output=SSRPass.OUTPUT.Default;updateReflectionPath();
 controls.autoRotate=settings.rotating&&settings.effect!=='bankai'&&(options.preview||dragTarget==='camera');
 if(!options.preview&&!showSheath&&settings.effect!=='shikai'&&settings.effect!=='bankai'&&(firstSettings||sheathChanged||(view&&'reset' in view))&&(!view||'reset' in view)){physics.restore();centerDefaultSwordView();}
 if(view&&!('reset' in view))applyCameraView(view);
}
function centerDefaultSwordView(){
 sword.updateWorldMatrix(true,false);
 const center=displayCenter.clone().applyMatrix4(sword.matrixWorld);center.y+=cameraHeight;
 applyCameraView(centeredSwordView(camera.position,controls.target,center));
}
function applyCameraView(view:Pick<SwordViewState,'camera'|'target'>){
 // Consume pending orbit damping before applying an absolute camera position.
 const damping=controls.enableDamping,autoRotate=controls.autoRotate;
 controls.enableDamping=false;controls.autoRotate=false;controls.update(0);
 camera.position.fromArray(view.camera);controls.target.fromArray(view.target);
 controls.maxDistance=Math.max(34,camera.position.distanceTo(controls.target));controls.update(0);
 controls.enableDamping=damping;controls.autoRotate=autoRotate;
}
function timelineController(effect:EffectMode=effectMode){return effect==='bankai'?bankai:effect==='shikai'?shikai:null;}
function getEffectTimeline(effect?:TimelineEffect):EffectTimeline|null {
 const controller=timelineController(effect);
 const running=(effect??effectMode)===effectMode&&(effectMode!=='bankai'||!!bankai?.active);
 return controller?{time:running?controller.time:0,duration:controller.duration,cycleDuration:controller.cycleDuration}:null;
}
function seekEffect(time:number,paused=true){
 const controller=timelineController();if(!controller||!Number.isFinite(time))return;
 effectPaused=paused;controller.seek(THREE.MathUtils.clamp(time,0,Math.max(120,controller.duration)));
}
function reset(){stopSwordDrag();physics.resetOrientation();clearArrows();bankai?.cancel();if(options.preview){
 physics.setDraw(1);physics.restore();
 camera.position.set(1.3,isZangetsu?1.5:4.7,isZangetsu?19.5:15);
 controls.target.set(.4,isZangetsu?1.5:3.65,0);controls.update();return;
}const mobile=(container.clientWidth||window.innerWidth)<700;camera.position.set(2.1,isZangetsu?4.3:2.6,isZangetsu?30:mobile?23:24);camera.position.y+=cameraHeight;controls.target.set(0,(isZangetsu?3.4:mobile?1.1:.8)+cameraHeight,0);controls.update();physics.restore();if(settingsApplied&&!sheathVisible&&effectMode!=='shikai'&&effectMode!=='bankai')centerDefaultSwordView();}
function resize(){
 // A retained view can be display:none before its activation effect runs.
 // Preserve its buffers and projection until it has real dimensions again.
 if(!active)return;const w=container.clientWidth,h=container.clientHeight;if(w<=0||h<=0)return;
 const pixelRatio=Math.min(window.devicePixelRatio,2)*(aaMode==='high'?1.25:1);
 if(w===lastWidth&&h===lastHeight&&pixelRatio===lastPixelRatio&&renderScale===lastRenderScale)return;
 lastWidth=w;lastHeight=h;lastPixelRatio=pixelRatio;lastRenderScale=renderScale;
 renderer.setPixelRatio(pixelRatio);composer.setPixelRatio(pixelRatio*renderScale);renderer.setSize(w,h);camera.aspect=w/h;camera.fov=options.preview?34:w<700?44:34;camera.updateProjectionMatrix();composer.setSize(w,h);const renderWidth=Math.max(1,Math.floor(composer.renderTarget1.width)),renderHeight=Math.max(1,Math.floor(composer.renderTarget1.height));edgeAA.uniforms.resolution.value.set(1/renderWidth,1/renderHeight);upscale.uniforms.inputSize.value.set(renderWidth,renderHeight);meter.setRenderSize(renderWidth,renderHeight)}
function assertContextAvailable(){if(renderer.getContext().isContextLost())throw new Error('The 3D renderer was interrupted. Reload this page to restore the sword.');}
await yieldScenePreparation(signal);
await renderer.compileAsync(scene,camera);
signal.throwIfAborted();
if(active&&bankai&&shikai&&!options.preview){
 reset();
 await warmupSwordEffects(scene,composer,renderer,camera,bankai,shikai,()=>{assertContextAvailable();updateShadowCache();updateReflectionPath();},signal,options.waitUntilActive);
 renderer.shadowMap.needsUpdate=true;
}
await options.waitUntilActive?.();
signal.throwIfAborted();
assertContextAvailable();
active=options.active??true;controls.enabled=active&&!options.preview;
const observer=new ResizeObserver(resize);cleanups.push(()=>observer.disconnect());
if(active){observer.observe(container);resize();}reset();
let frame:number|null=null,lastFrameTime:number|null=null,stopped=false;
function animate(now:number){frame=null;if(stopped||!active)return;frame=requestAnimationFrame(animate);const dt=lastFrameTime===null?0:Math.min((now-lastFrameTime)/1000,.1);lastFrameTime=now;if(document.hidden)return;meter.begin();if(bankai?.active){bankai.update(effectPaused?0:dt,effectSpeed,effectIntensity,petalGlow);}else{if(!options.preview&&dragTarget==='sword'&&spinRequested&&dragPointer===null)physics.rotateBy(dragTurn.setFromAxisAngle(spinAxis,dt*.07));physics.step(dt);shikai?.setPetalGlow(petalGlow);aura.update(effectPaused?0:dt,physics.draw);}if(shikai){const bankaiGlow=!!bankai?.glowing;bloom.enabled=shikai.visible||bankaiGlow;const pink=bankaiGlow?(bankai?.pinkGlow??0):shikai.pinkGlow;bloom.strength=glowStrength*THREE.MathUtils.lerp(.6,1,pink);bloom.radius=glowSpread*THREE.MathUtils.lerp(.7,1,pink);}if(isZangetsu)scabbard.userData.updateCloth(dt);updateShadowCache();moveCamera(dt);controls.update(dt);environment.updateView(camera,controls.target);updateReflectionPath();composer.render(dt);meter.end();}
function stopFrame(){if(frame!==null)cancelAnimationFrame(frame);frame=null;lastFrameTime=null;}
function setActive(value:boolean){
 if(stopped||active===value)return;
 active=value;clearArrows();stopSwordDrag();stopControlDrag();
 controls.enabled=active&&!options.preview;meter.setEnabled(active&&performanceRequested);
 if(active){observer.observe(container);resize();lastFrameTime=null;frame=requestAnimationFrame(animate);}
 else{stopFrame();observer.disconnect();}
}
cleanups.push(()=>{stopped=true;stopFrame()});
// Defer the first frame so callers can apply the latest active state after an
// asynchronous initialization finishes while its view is already hidden.
if(active)frame=requestAnimationFrame(animate);
function handleContextLost(event: Event){event.preventDefault();setActive(false);stopped=true;stopFrame();onError('The 3D renderer was interrupted. Reload this page to restore the sword.');}
renderer.domElement.addEventListener('webglcontextlost',handleContextLost);
cleanups.push(()=>renderer.domElement.removeEventListener('webglcontextlost',handleContextLost));
let disposed=false;
return {getViewState:()=>({camera:camera.position.toArray() as SwordViewState['camera'],target:controls.target.toArray() as SwordViewState['target'],rotation:physics.getDragRotation()}),setActive,update,reset,getEffectTimeline,seekEffect,release:()=>bankai?.active?false:physics.release(),dispose(){if(disposed)return;disposed=true;setActive(false);for(const cleanup of cleanups.reverse())cleanup();}};
}catch(error){for(const cleanup of cleanups.reverse())cleanup();throw error;}
}
