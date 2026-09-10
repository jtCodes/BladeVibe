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
export interface ViewerSettings { rotating: boolean; draw: number; reflections: boolean; lightAngle: number; cameraHeight: number; effect: EffectMode; effectSpeed: number; effectIntensity: number }
export interface SwordScene { update(settings: ViewerSettings): void; reset(): void; release(): boolean; dispose(): void }
export async function createSwordScene(container: HTMLDivElement, onError: (message: string) => void, onStatus: (status: MotionStatus) => void, signal: AbortSignal): Promise<SwordScene> {
await initializePhysics();
signal.throwIfAborted();
const cleanups: Array<() => void> = [];
try {
const scene=new THREE.Scene();scene.background=new THREE.Color(0x141413);scene.fog=new THREE.FogExp2(0x141413,.032);
const renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.85;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;RectAreaLightUniformsLib.init();container.appendChild(renderer.domElement);cleanups.push(()=>{clearSurfaceMapCache(renderer);renderer.dispose();renderer.domElement.remove()});
cleanups.push(()=>{
 const geometries=new Set<THREE.BufferGeometry>(), materials=new Set<THREE.Material>(), textures=new Set<THREE.Texture>();
 scene.traverse(object=>{
  if(object instanceof THREE.Mesh || object instanceof THREE.Points){geometries.add(object.geometry);for(const material of Array.isArray(object.material)?object.material:[object.material])materials.add(material);}
  if(object instanceof THREE.DirectionalLight)object.shadow.dispose();
 });
 for(const material of materials){for(const value of Object.values(material))if(value instanceof THREE.Texture)textures.add(value);material.dispose();}
 for(const geometry of geometries)geometry.dispose();for(const texture of textures)texture.dispose();
});
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
renderer.domElement.tabIndex=0;
renderer.domElement.setAttribute('aria-label','Sword camera. Arrow keys move the camera; drag to orbit.');
window.addEventListener('keydown',keyDown);window.addEventListener('keyup',keyUp);window.addEventListener('blur',clearArrows);
document.addEventListener('visibilitychange',clearArrows);document.addEventListener('focusin',focusChanged);
renderer.domElement.addEventListener('pointerdown',focusCanvas);
cleanups.push(()=>{
 clearArrows();window.removeEventListener('keydown',keyDown);window.removeEventListener('keyup',keyUp);window.removeEventListener('blur',clearArrows);
 document.removeEventListener('visibilitychange',clearArrows);document.removeEventListener('focusin',focusChanged);renderer.domElement.removeEventListener('pointerdown',focusCanvas);
});
function moveCamera(dt:number){
 const x=Number(heldArrows.has('ArrowRight'))-Number(heldArrows.has('ArrowLeft'));
 const y=Number(heldArrows.has('ArrowUp'))-Number(heldArrows.has('ArrowDown'));
 if(!x&&!y)return;
 camera.updateMatrix();cameraRight.setFromMatrixColumn(camera.matrix,0);cameraUp.setFromMatrixColumn(camera.matrix,1);
 cameraStep.copy(cameraRight).multiplyScalar(x).addScaledVector(cameraUp,y).normalize().multiplyScalar(camera.position.distanceTo(controls.target)*.35*dt);
 camera.position.add(cameraStep);controls.target.add(cameraStep);
}
const environment=createStudioEnvironment(renderer);scene.environment=environment.texture;scene.environmentRotation.set(0,.35,0);cleanups.push(()=>environment.dispose());scene.environmentIntensity=.8;
scene.add(new THREE.HemisphereLight(0xb9d8ed,0x1b1312,.12));
function area(color: number,power: number,x: number,y: number,z: number,w: number,h: number){const l=new THREE.RectAreaLight(color,power,w,h);l.position.set(x,y,z);l.lookAt(0,1.5,0);scene.add(l)}
area(0xf4f4f2,5,-4,5,5,3,8);area(0xffebd4,4,4,2,-3,2,7);area(0xe8efff,3,2,4,4,.6,6);
// Broad off-camera illumination has no spotlight cone to draw a disc on the floor.
const key=new THREE.DirectionalLight(0xfff1df,1.8);key.position.set(-12,18,10);key.target.position.set(0,0,0);key.castShadow=true;key.shadow.mapSize.set(2048,2048);key.shadow.bias=-.0002;key.shadow.normalBias=.015;key.shadow.camera.near=.5;key.shadow.camera.far=60;key.shadow.camera.left=-14;key.shadow.camera.right=14;key.shadow.camera.top=14;key.shadow.camera.bottom=-14;key.shadow.radius=3;scene.add(key,key.target);
const steel=new THREE.MeshPhysicalMaterial({color:0xd0d3d8,metalness:1,roughness:.42,anisotropy:.2,anisotropyRotation:Math.PI/2,...surfaceMaps('steel',renderer),bumpScale:.0003});
const edge=new THREE.MeshStandardMaterial({color:0xe4e7eb,metalness:1,roughness:.075});
const fittings=new THREE.MeshStandardMaterial({color:0x969997,metalness:1,roughness:.65,...surfaceMaps('steel',renderer),bumpScale:.0005});
const leather=new THREE.MeshStandardMaterial({color:0x30251f,metalness:0,roughness:.9,...surfaceMaps('leather',renderer),bumpScale:.003,side:THREE.DoubleSide});
const sword=new THREE.Group();scene.add(sword);sword.rotation.z=Math.PI-.16;
function mesh(geo: THREE.BufferGeometry,mat: THREE.Material | THREE.Material[],parent: THREE.Object3D=sword){const o=new THREE.Mesh(geo,mat);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cylinder(r1: number,r2: number,h: number,y: number,mat: THREE.Material,segments=16){const o=mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat);o.position.y=y;return o}
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
const floor=mesh(new THREE.PlaneGeometry(1000,1000),new THREE.MeshStandardMaterial({color:0x141413,metalness:0,roughness:.9}),scene);floor.rotation.x=-Math.PI/2;floor.position.y=FLOOR_Y;floor.castShadow=false;floor.receiveShadow=true;
const sheathLeather=new THREE.MeshStandardMaterial({color:0x241d18,roughness:.88,metalness:0,...surfaceMaps('leather',renderer),bumpScale:.002,side:THREE.DoubleSide});
const scabbard=createScabbard(sheathLeather,fittings);scene.add(scabbard);
const physics=createSwordPhysics(sword,onStatus);cleanups.push(()=>physics.dispose());
const aura=createBladeAura(sword,renderer.getPixelRatio());
// The fixed studio light only needs a new shadow map when a caster moves.
renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
const shadowPosition=new THREE.Vector3(Infinity,Infinity,Infinity),shadowRotation=new THREE.Quaternion();
function updateShadowCache(){
 if(!sword.position.equals(shadowPosition)||!sword.quaternion.equals(shadowRotation)){
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
composer.addPass(reflections);
// This Three.js version expects SMAA in linear color space, before OutputPass.
composer.addPass(new SMAAPass());
const bloom=new UnrealBloomPass(new THREE.Vector2(1,1),.14,0,3.);composer.addPass(bloom);
composer.addPass(new OutputPass());
cleanups.push(()=>{for(const pass of composer.passes)pass.dispose();composer.dispose()});
let cameraHeight=0;
function update(settings: ViewerSettings){
 const lift=settings.cameraHeight-cameraHeight;camera.position.y+=lift;controls.target.y+=lift;cameraHeight=settings.cameraHeight;
 physics.setDraw(settings.draw/100);
 aura.configure(settings.effect,settings.effectSpeed,settings.effectIntensity);
 bloom.enabled=(settings.effect==='flame'||settings.effect==='electric')&&settings.effectIntensity>0;
 reflections.output=settings.reflections?SSRPass.OUTPUT.Default:SSRPass.OUTPUT.Beauty;
 scene.environmentRotation.y=THREE.MathUtils.degToRad(settings.lightAngle);
 controls.autoRotate=settings.rotating;
}
function reset(){clearArrows();const mobile=container.clientWidth<700;camera.position.set(2.1,2.6,mobile?23:24);camera.position.y+=cameraHeight;controls.target.set(0,(mobile?1.1:.8)+cameraHeight,0);controls.update();physics.restore()}
function resize(){const w=Math.max(1,container.clientWidth),h=Math.max(1,container.clientHeight);const pixelRatio=Math.min(window.devicePixelRatio,2);renderer.setPixelRatio(pixelRatio);composer.setPixelRatio(pixelRatio);renderer.setSize(w,h);camera.aspect=w/h;camera.fov=w<700?44:34;camera.updateProjectionMatrix();composer.setSize(w,h)}
const observer=new ResizeObserver(resize);observer.observe(container);cleanups.push(()=>observer.disconnect());resize();reset();
const clock=new THREE.Clock();let frame=0,stopped=false;
function animate(){if(stopped)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.1);if(document.hidden)return;physics.step(dt);updateShadowCache();aura.update(dt,physics.draw);moveCamera(dt);controls.update(dt);composer.render();}
cleanups.push(()=>{stopped=true;cancelAnimationFrame(frame)});animate();
function handleContextLost(event: Event){event.preventDefault();stopped=true;cancelAnimationFrame(frame);onError('The 3D renderer was interrupted. Reload this page to restore the sword.');}
renderer.domElement.addEventListener('webglcontextlost',handleContextLost);
cleanups.push(()=>renderer.domElement.removeEventListener('webglcontextlost',handleContextLost));
let disposed=false;
return {update,reset,release:physics.release,dispose(){if(disposed)return;disposed=true;for(const cleanup of cleanups.reverse())cleanup();}};
}catch(error){for(const cleanup of cleanups.reverse())cleanup();throw error;}
}
