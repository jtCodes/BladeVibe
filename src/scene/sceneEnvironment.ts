import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {createStudioEnvironment} from './studio';

import {DEFAULT_LIGHTING,normalizeLightingSettings,type LightingSettings} from './lightingSettings';
export {DEFAULT_LIGHTING,type LightingSettings} from './lightingSettings';
type Position=[number,number,number];
export interface SceneEnvironmentPreset {
 cameraFill?:{color:number;intensity:number;rimIntensity?:number;rimColors?:[number,number];rimWidth?:number};
 exposure:number;background:string;floor?:string;fogDensity?:number;
 ambient:{sky:number;ground:number;intensity:number};
 studio?:{neutral:boolean;intensity:number;rotation:number;baseRadiance?:number};
 lights:Array<{kind:'area'|'directional';channel:'key'|'fill'|'rim';color:number;intensity:number;position:Position;target?:Position;size?:[number,number];shadow?:boolean}>;
}
export function createSceneEnvironment(scene:THREE.Scene,renderer:THREE.WebGLRenderer,preset:SceneEnvironmentPreset){
 const previous={background:scene.background,fog:scene.fog,environment:scene.environment,intensity:scene.environmentIntensity,rotation:scene.environmentRotation.clone()};
 const studio=preset.studio?createStudioEnvironment(renderer,preset.studio.neutral,preset.studio.baseRadiance):null;
 if(studio){scene.environment=studio.texture;scene.environmentRotation.set(0,preset.studio!.rotation,0);}
 scene.background=new THREE.Color(preset.background);
 scene.fog=preset.fogDensity===undefined?null:new THREE.FogExp2(preset.background,preset.fogDensity);
 const ambient=new THREE.HemisphereLight(preset.ambient.sky,preset.ambient.ground,preset.ambient.intensity);scene.add(ambient);
 if(preset.lights.some(light=>light.kind==='area'))RectAreaLightUniformsLib.init();
 const cameraFill=preset.cameraFill?new THREE.DirectionalLight(preset.cameraFill.color,preset.cameraFill.intensity):null;
 if(cameraFill)scene.add(cameraFill,cameraFill.target);
 const cameraRims=preset.cameraFill?.rimIntensity?[new THREE.RectAreaLight(preset.cameraFill.rimColors?.[0]??0xffffff,preset.cameraFill.rimIntensity,preset.cameraFill.rimWidth??2,12),new THREE.RectAreaLight(preset.cameraFill.rimColors?.[1]??0xffffff,preset.cameraFill.rimIntensity*.7,preset.cameraFill.rimWidth??2,12)]:[];
 if(cameraRims.length){RectAreaLightUniformsLib.init();scene.add(...cameraRims);}
 const viewRotation=new THREE.Quaternion();

 const lights=preset.lights.map(spec=>{
  const light=spec.kind==='area'?new THREE.RectAreaLight(spec.color,spec.intensity,...(spec.size??[1,1])):new THREE.DirectionalLight(spec.color,spec.intensity);
  light.position.set(...spec.position);
  if(light instanceof THREE.RectAreaLight)light.lookAt(...(spec.target??[0,0,0]));
  else {
   light.target.position.set(...(spec.target??[0,0,0]));scene.add(light.target);
   if(spec.shadow){light.castShadow=true;light.shadow.mapSize.set(2048,2048);light.shadow.bias=-.0002;light.shadow.normalBias=.015;Object.assign(light.shadow.camera,{near:.5,far:60,left:-14,right:14,top:14,bottom:-14});light.shadow.radius=3;}
  }
  scene.add(light);return {light,spec};
 });
 function update({lighting=DEFAULT_LIGHTING,backgroundColor=preset.background,floorColor=preset.floor,floor,fogDensity=preset.fogDensity,lightAngle}:{lighting?:LightingSettings;backgroundColor?:string;floorColor?:string;floor?:THREE.MeshStandardMaterial;fogDensity?:number;lightAngle?:number}={}){
  const balance=normalizeLightingSettings(lighting);
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=preset.exposure;
  for(const {light,spec} of lights)light.intensity=spec.intensity*balance[spec.channel];
  ambient.intensity=preset.ambient.intensity*balance.ambient;
  if(cameraFill)cameraFill.intensity=preset.cameraFill!.intensity*balance.cameraFill;
  cameraRims.forEach((light,i)=>{light.intensity=preset.cameraFill!.rimIntensity!*(i?.7:1)*balance.cameraRim;});
  if(preset.studio)scene.environmentIntensity=preset.studio.intensity*balance.environment;
  if(lightAngle!==undefined)scene.environmentRotation.y=THREE.MathUtils.degToRad(lightAngle);
  (scene.background as THREE.Color).set(backgroundColor);
  if(scene.fog instanceof THREE.FogExp2){scene.fog.color.set(backgroundColor);scene.fog.density=fogDensity??0;}
  if(floor&&floorColor)floor.color.set(floorColor);
  // Consumers apply this after tone mapping, never as exposure.
  return balance.brightness;
 }
 update();
 function updateView(camera:THREE.Camera,target:THREE.Vector3){
  if(!cameraFill)return;
  camera.updateMatrixWorld();
  cameraFill.position.set(2,2,0).applyMatrix4(camera.matrixWorld);
  cameraFill.target.position.copy(target);cameraFill.target.updateMatrixWorld();
  camera.getWorldQuaternion(viewRotation);
  cameraRims.forEach((light,i)=>{
   // Broad strips stay beside and just behind the subject in the current view.
   light.position.set(i?-5:5,1,-2).applyQuaternion(viewRotation).add(target);
   light.lookAt(target);
  });
 }
 return {update,updateView,dispose(){
  scene.remove(...cameraRims);
  if(cameraFill){scene.remove(cameraFill,cameraFill.target);cameraFill.shadow.dispose();}
  scene.remove(ambient);for(const {light} of lights){scene.remove(light);if(light instanceof THREE.DirectionalLight){scene.remove(light.target);light.shadow.dispose();}}
  studio?.dispose();scene.background=previous.background;scene.fog=previous.fog;scene.environment=previous.environment;scene.environmentIntensity=previous.intensity;scene.environmentRotation.copy(previous.rotation);
 }};
}
