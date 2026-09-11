import {createSpatialUpscale} from './spatialUpscale';
import {RenderPass} from 'three/addons/postprocessing/RenderPass.js';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';
import {FXAAShader} from 'three/addons/shaders/FXAAShader.js';
import {createPerformanceMeter} from './performanceMeter';
import {createTensaZangetsu,createTensaZangetsuBladeGeometry} from './tensaZangetsu';
import {createZangetsu,createZangetsuBladeGeometry} from './zangetsu';
import {createBankai} from './bankai';
import {createShikai} from './shikai';
import {createSenbonzakura,createKatanaBladeGeometry,createSayaGeometry,KATANA_RADIUS} from './senbonzakura';
import * as THREE from 'three';
import {OrbitControls} from 'three/addons/controls/OrbitControls.js';
import {createStudioEnvironment} from './studio';
import {EffectComposer} from 'three/addons/postprocessing/EffectComposer.js';
import {SSRPass} from 'three/addons/postprocessing/SSRPass.js';
import {OutputPass} from 'three/addons/postprocessing/OutputPass.js';
import {UnrealBloomPass} from 'three/addons/postprocessing/UnrealBloomPass.js';
import {SMAAPass} from 'three/addons/postprocessing/SMAAPass.js';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {clearSurfaceMapCache,surfaceMaps,createBladeGeometry,createLeatherWrap} from './craft';
import { initializePhysics, createSwordPhysics, FLOOR_Y, type MotionStatus } from './swordPhysics';
import { createBladeAura, type EffectMode } from './aura';
import { createScabbard } from './scabbard';
import { createCrossguard, createPommel } from './crossguard';
export interface LightingSettings { brightness:number; key:number; fill:number; rim:number; ambient:number }
export interface ViewerSettings { upscaling?:'native'|'ultra'|'quality'; dragTarget?:'sword'|'camera'; antiAliasing?:'standard'|'smooth'|'high'; showPerformance?:boolean; lighting?: LightingSettings; rotating: boolean; draw: number; reflections: boolean; lightAngle: number; floorColor?: string; backgroundColor?: string; cameraHeight: number; showSheath?: boolean; swordRotation?: number; effect: EffectMode; effectSpeed: number; effectIntensity: number }
export interface SwordScene { update(settings: ViewerSettings): void; reset(): void; release(): boolean; dispose(): void }
export async function createSwordScene(container: HTMLDivElement, onError: (message: string) => void, onStatus: (status: MotionStatus) => void, signal: AbortSignal, options:{preview?:boolean;model?:'longsword'|'senbonzakura'|'zangetsu'|'tensa-zangetsu'}={}): Promise<SwordScene> {
await initializePhysics();
signal.throwIfAborted();
const cleanups: Array<() => void> = [];
try {
const scene=new THREE.Scene();scene.background=new THREE.Color(0x141413);scene.fog=new THREE.FogExp2(0x141413,.032);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.localClippingEnabled=true;RectAreaLightUniformsLib.init();container.appendChild(renderer.domElement);cleanups.push(()=>{clearSurfaceMapCache(renderer);renderer.dispose();renderer.domElement.remove()});
cleanups.push(()=>{
 const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>(), textures=new Set<THREE.Texture>();
 scene.traverse(object=>{
  if(object instanceof THREE.Mesh || object instanceof THREE.Points){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}
  if(object instanceof THREE.DirectionalLight)object.shadow.dispose();
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
 if(!arrowKeys.has(event.key))return;
 if(ownsKeys(event.target)||event.altKey||event.ctrlKey||event.metaKey){clearArrows();return;}
 event.preventDefault();heldArrows.add(event.key);
}
function keyUp(event:KeyboardEvent){heldArrows.delete(event.key)}
function focusChanged(event:FocusEvent){if(ownsKeys(event.target))clearArrows()}
function focusCanvas(){renderer.domElement.focus({preventScroll:true})}
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
if(options.preview)controls.enabled=false;
const environment=createStudioEnvironment(renderer);scene.environment=environment.texture;scene.environmentRotation.set(0,.35,0);cleanups.push(()=>environment.dispose());scene.environmentIntensity=.8;
const ambientLight=new THREE.HemisphereLight(0xb9d8ed,0x1b1312,.12);scene.add(ambientLight);
function area(color: number,power: number,x: number,y: number,z: number,w: number,h: number){const l=new THREE.RectAreaLight(color,power,w,h);l.position.set(x,y,z);l.lookAt(0,1.5,0);scene.add(l);return l}
const mainLight=area(0xf4f4f2,5,-4,5,5,3,8),rimLight=area(0xffebd4,4,4,2,-3,2,7),fillLight=area(0xe8efff,3,2,4,4,.6,6);
// Broad off-camera illumination has no spotlight cone to draw a disc on the floor.
const key=new THREE.DirectionalLight(0xfff1df,1.8);key.position.set(-12,18,10);key.target.position.set(0,0,0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0002;key.shadow.normalBias=.015;key.shadow.camera.near=.5;key.shadow.camera.far=60;key.shadow.camera.left=-14;key.shadow.camera.right=14;key.shadow.camera.top=14;key.shadow.camera.bottom=-14;key.shadow.radius=3;scene.add(key,key.target);
const sword=new THREE.Group();scene.add(sword);sword.rotation.z=Math.PI-.16;
function mesh(geo: THREE.BufferGeometry,mat: THREE.Material | THREE.Material[],parent: THREE.Object3D=sword){const o=new THREE.Mesh(geo,mat);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cylinder(r1: number,r2: number,h: number,y: number,mat: THREE.Material,segments=16){const o=mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat);o.position.y=y;return o}
const isKatana=options.model==='senbonzakura',isZangetsu=options.model==='zangetsu',isTensa=options.model==='tensa-zangetsu';
let scabbard:THREE.Group;
if(isTensa){scabbard=createTensaZangetsu(renderer,sword);}else if(isZangetsu){scabbard=createZangetsu(renderer,sword);}else if(isKatana){scabbard=createSenbonzakura(renderer,sword);}else{
const steel=new THREE.MeshPhysicalMaterial({color:0xd0d3d8,metalness:1,roughness:.42,anisotropy:.2,anisotropyRotation:Math.PI/2,...surfaceMaps('steel',renderer),bumpScale:.0003});
const edge=new THREE.MeshStandardMaterial({color:0xe4e7eb,metalness:1,roughness:.075});
const fittings=new THREE.MeshStandardMaterial({color:0x969997,metalness:1,roughness:.65,...surfaceMaps('steel',renderer),bumpScale:.0005});
const leather=new THREE.MeshStandardMaterial({color:0x30251f,metalness:0,roughness:.9,...surfaceMaps('leather',renderer),bumpScale:.003,side:THREE.DoubleSide});
// Physically thin cutting bevels, a recessed fuller and continuous distal taper.
mesh(createBladeGeometry(),[steel,edge,steel]);
sword.add(createCrossguard(renderer));
const grip=cylinder(.100,.105,1.67,-.98,leather,48);grip.scale.z=.83;
const wrap=mesh(createLeatherWrap(),leather);wrap.scale.y=1.18;
// Fine cord ribs beneath the leather and three silver grip collars.
const gripRibGeometry=new THREE.TorusGeometry(.112,.0016,4,32);
for(let i=0;i<85;i++){
 const rib=mesh(gripRibGeometry,leather);rib.rotation.x=Math.PI/2;rib.scale.y=.83;rib.position.y=-.20-i*.0187;
}
const gripSilver=new THREE.MeshStandardMaterial({color:0xb7bbb7,metalness:1,roughness:.31});
for(const [y,h] of [[-.99,.10],[-1.805,.10]]){
 const collar=cylinder(.119,.119,h,y,gripSilver,48);collar.scale.z=.86;
 for(const dy of [-h/2+.009,h/2-.009]){
  const rim=mesh(new THREE.TorusGeometry(.120,.003,6,48),gripSilver);rim.rotation.x=Math.PI/2;rim.scale.y=.86;rim.position.y=y+dy;
 }
}
sword.add(createPommel(renderer));
const sheathLeather=new THREE.MeshStandardMaterial({color:0x241d18,roughness:.88,metalness:0,...surfaceMaps('leather',renderer),bumpScale:.002,side:THREE.DoubleSide});
scabbard=createScabbard(sheathLeather,fittings);
}
const floorMaterial=new THREE.MeshStandardMaterial({color:0x141413,metalness:0,roughness:.9});
const floor=mesh(new THREE.PlaneGeometry(1000,1000),floorMaterial,scene);floor.rotation.x=-Math.PI/2;floor.position.y=FLOOR_Y;floor.castShadow=false;floor.receiveShadow=true;
(isZangetsu?sword:scene).add(scabbard);if(options.preview)scabbard.visible=false;
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
const physics=createSwordPhysics(sword,onStatus,isTensa?{bladeGeometry:createTensaZangetsuBladeGeometry,unsheathed:true,katana:true}:isZangetsu?{bladeGeometry:createZangetsuBladeGeometry,unsheathed:true}:isKatana?{bladeGeometry:createKatanaBladeGeometry,scabbardGeometry:createSayaGeometry,curveRadius:KATANA_RADIUS,katana:true}:undefined);cleanups.push(()=>physics.dispose());
const shikai=isKatana?createShikai(sword):null;
if(shikai)cleanups.push(()=>shikai.dispose());
const aura=shikai??createBladeAura(sword,renderer.getPixelRatio());
const bankai=isKatana?createBankai(sword,floor,scene):null;
if(bankai)cleanups.push(()=>bankai.dispose());
let dragTarget:'sword'|'camera'='sword',spinRequested=false,dragPointer:number|null=null,dragX=0,dragY=0;
const dragRight=new THREE.Vector3(),dragUp=new THREE.Vector3(),dragTurn=new THREE.Quaternion(),dragPitch=new THREE.Quaternion(),spinAxis=new THREE.Vector3(0,1,0);
function stopSwordDrag(){if(dragPointer!==null&&renderer.domElement.hasPointerCapture(dragPointer))renderer.domElement.releasePointerCapture(dragPointer);dragPointer=null;}
function swordPointerDown(event:PointerEvent){
 if(dragTarget!=='sword'||event.button!==0||event.pointerType==='touch')return;
 event.preventDefault();event.stopImmediatePropagation();renderer.domElement.focus({preventScroll:true});
 if(bankai?.active||physics.released||physics.draw<.999)return;
 dragPointer=event.pointerId;dragX=event.clientX;dragY=event.clientY;renderer.domElement.setPointerCapture(event.pointerId);
}
function swordPointerMove(event:PointerEvent){
 if(event.pointerId!==dragPointer)return;event.preventDefault();event.stopImmediatePropagation();
 if(bankai?.active||physics.released){stopSwordDrag();return;}
 camera.updateMatrixWorld();dragRight.setFromMatrixColumn(camera.matrixWorld,0);dragUp.setFromMatrixColumn(camera.matrixWorld,1);
 const sensitivity=Math.PI/Math.max(250,container.clientHeight);
 dragTurn.setFromAxisAngle(dragUp,(event.clientX-dragX)*sensitivity);dragPitch.setFromAxisAngle(dragRight,(event.clientY-dragY)*sensitivity);
 physics.rotateBy(dragTurn.premultiply(dragPitch));dragX=event.clientX;dragY=event.clientY;
}
function swordPointerUp(event:PointerEvent){if(event.pointerId===dragPointer){event.stopImmediatePropagation();stopSwordDrag();}}
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
composer.addPass(new OutputPass());
// Smooth the final display-space edges, including postprocessing and shader cutouts.
const edgeAA=new ShaderPass(FXAAShader);composer.addPass(edgeAA);
const upscale=createSpatialUpscale();composer.addPass(upscale);
let renderScale=1;
let aaMode:'standard'|'smooth'|'high'='standard';
cleanups.push(()=>{for(const pass of composer.passes)pass.dispose();composer.dispose()});
let cameraHeight=0,effectSpeed=1,effectIntensity=1;
function update(settings: ViewerSettings){
 const nextDrag=settings.dragTarget??'sword';if(nextDrag!==dragTarget)stopSwordDrag();dragTarget=nextDrag;spinRequested=settings.rotating;
 const nextAA=options.preview?'standard':settings.antiAliasing??'smooth';
 const nextScale=options.preview?1:settings.upscaling==='ultra'?.9:settings.upscaling==='quality'?.85:1;
 if(nextAA!==aaMode||nextScale!==renderScale){aaMode=nextAA;renderScale=nextScale;resize();}
 upscale.enabled=renderScale<1;
 edgeAA.enabled=aaMode!=='standard';
 meter.setEnabled(!options.preview&&!!settings.showPerformance);
 const lighting=settings.lighting??{brightness:1,key:1,fill:1,rim:1,ambient:1};
 renderer.toneMappingExposure=.85*lighting.brightness;
 key.intensity=1.8*lighting.key;mainLight.intensity=5*lighting.key;
 fillLight.intensity=3*lighting.fill;rimLight.intensity=4*lighting.rim;
 ambientLight.intensity=.12*lighting.ambient;scene.environmentIntensity=.8*lighting.ambient;
 floorMaterial.color.set(settings.floorColor??'#141413');
 if(scene.background instanceof THREE.Color)scene.background.set(settings.backgroundColor??'#141413');
 if(scene.fog)scene.fog.color.set(settings.backgroundColor??'#141413');
 effectSpeed=settings.effectSpeed;effectIntensity=settings.effectIntensity;
 if(bankai?.active&&settings.effect!=='bankai'){bankai.cancel();physics.setDraw(settings.draw/100);physics.restore();}
 if(isZangetsu)scabbard.userData.setUnwrapped(settings.draw/100);
 const showSheath=!options.preview&&settings.effect!=='bankai'&&(settings.showSheath??true);
 if(scabbard.visible!==showSheath){scabbard.visible=showSheath;renderer.shadowMap.needsUpdate=true;}
 physics.setRotation(settings.swordRotation??0);
 const lift=settings.cameraHeight-cameraHeight;camera.position.y+=lift;controls.target.y+=lift;cameraHeight=settings.cameraHeight;
 physics.setDraw(settings.draw/100);
 aura.configure(settings.effect,settings.effectSpeed,settings.effectIntensity);
 if(bankai&&!bankai.active&&settings.effect==='bankai'){
  physics.setDraw(1);physics.restore();shikai?.update(0,0);bankai.start();
  // Keep the full drop and the ground contact in frame while preserving the viewing direction.
  const direction=camera.position.clone().sub(controls.target).normalize();
  controls.target.set(sword.position.x,-.2,sword.position.z);
  const distance=Math.max(24,7/(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect)));
  camera.position.copy(controls.target).addScaledVector(direction,distance);
  controls.maxDistance=Math.max(34,distance);
 }
 bloom.enabled=(settings.effect==='shikai'||settings.effect==='flame'||settings.effect==='electric')&&settings.effectIntensity>0;
 bloom.threshold=isKatana?1.1:3.;
 bloom.strength=isKatana?.24:.14;
 reflectionsRequested=settings.reflections;reflections.output=SSRPass.OUTPUT.Default;updateReflectionPath();
 scene.environmentRotation.y=THREE.MathUtils.degToRad(settings.lightAngle);
 controls.autoRotate=settings.rotating&&settings.effect!=='bankai'&&(options.preview||dragTarget==='camera');
}
function reset(){stopSwordDrag();physics.resetOrientation();clearArrows();bankai?.cancel();if(options.preview){camera.position.set(1.3,isZangetsu?3:4.7,isZangetsu?23:15);controls.target.set(.4,isZangetsu?3:3.65,0);controls.update();physics.setDraw(1);physics.restore();return;}const mobile=container.clientWidth<700;camera.position.set(2.1,isZangetsu?4.3:2.6,isZangetsu?30:mobile?23:24);camera.position.y+=cameraHeight;controls.target.set(0,(isZangetsu?3.4:mobile?1.1:.8)+cameraHeight,0);controls.update();physics.restore()}
function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);const pixelRatio=Math.min(window.devicePixelRatio,2)*(aaMode==='high'?1.25:1);renderer.setPixelRatio(pixelRatio);composer.setPixelRatio(pixelRatio*renderScale);renderer.setSize(w,h);camera.aspect=w/h;camera.fov=options.preview?34:w<700?44:34;camera.updateProjectionMatrix();composer.setSize(w,h);const renderWidth=Math.max(1,Math.floor(composer.renderTarget1.width)),renderHeight=Math.max(1,Math.floor(composer.renderTarget1.height));edgeAA.uniforms.resolution.value.set(1/renderWidth,1/renderHeight);upscale.uniforms.inputSize.value.set(renderWidth,renderHeight);meter.setRenderSize(renderWidth,renderHeight)}
const observer=new ResizeObserver(resize);observer.observe(container);cleanups.push(()=>observer.disconnect());resize();reset();
const clock=new THREE.Clock();let frame=0,stopped=false;
function animate(){if(stopped)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.1);if(document.hidden)return;meter.begin();if(bankai?.active){bankai.update(dt,effectSpeed,effectIntensity);}else{if(!options.preview&&dragTarget==='sword'&&spinRequested&&dragPointer===null)physics.rotateBy(dragTurn.setFromAxisAngle(spinAxis,dt*.07));physics.step(dt);aura.update(dt,physics.draw);}if(shikai){bloom.enabled=shikai.visible||!!bankai?.glowing;bloom.strength=.24;bloom.radius=0;}if(isZangetsu)scabbard.userData.updateCloth(dt);updateShadowCache();moveCamera(dt);controls.update(dt);updateReflectionPath();composer.render();meter.end();}
cleanups.push(()=>{stopped=true;cancelAnimationFrame(frame)});animate();
function handleContextLost(event: Event){event.preventDefault();stopped=true;cancelAnimationFrame(frame);onError('The 3D renderer was interrupted. Reload this page to restore the sword.');}
renderer.domElement.addEventListener('webglcontextlost',handleContextLost);
cleanups.push(()=>renderer.domElement.removeEventListener('webglcontextlost',handleContextLost));
let disposed=false;
return {update,reset,release:()=>bankai?.active?false:physics.release(),dispose(){if(disposed)return;disposed=true;for(const cleanup of cleanups.reverse())cleanup();}};
}catch(error){for(const cleanup of cleanups.reverse())cleanup();throw error;}
}
