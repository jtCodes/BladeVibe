import * as THREE from 'three';
import {RectAreaLightUniformsLib} from 'three/addons/lights/RectAreaLightUniformsLib.js';
import {createStudioEnvironment} from './studio';

export interface LightingSettings { brightness:number;key:number;fill:number;rim:number;ambient:number }
type Position=[number,number,number];
export interface SceneEnvironmentPreset {
 exposure:number;background:string;floor?:string;fogDensity?:number;
 ambient:{sky:number;ground:number;intensity:number};
 studio?:{neutral:boolean;intensity:number;rotation:number};
 lights:Array<{kind:'area'|'directional';channel:'key'|'fill'|'rim';color:number;intensity:number;position:Position;target?:Position;size?:[number,number];shadow?:boolean}>;
}
export const DEFAULT_LIGHTING:Readonly<LightingSettings>={brightness:1,key:1,fill:1,rim:1,ambient:1};
export function createSceneEnvironment(scene:THREE.Scene,renderer:THREE.WebGLRenderer,preset:SceneEnvironmentPreset){
 const previous={background:scene.background,fog:scene.fog,environment:scene.environment,intensity:scene.environmentIntensity,rotation:scene.environmentRotation.clone()};
 const studio=preset.studio?createStudioEnvironment(renderer,preset.studio.neutral):null;
 if(studio){scene.environment=studio.texture;scene.environmentRotation.set(0,preset.studio!.rotation,0);}
 scene.background=new THREE.Color(preset.background);
 scene.fog=preset.fogDensity===undefined?null:new THREE.FogExp2(preset.background,preset.fogDensity);
 const ambient=new THREE.HemisphereLight(preset.ambient.sky,preset.ambient.ground,preset.ambient.intensity);scene.add(ambient);
 if(preset.lights.some(light=>light.kind==='area'))RectAreaLightUniformsLib.init();
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
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=preset.exposure;
  for(const {light,spec} of lights)light.intensity=spec.intensity*lighting[spec.channel];
  ambient.intensity=preset.ambient.intensity*lighting.ambient;
  if(preset.studio)scene.environmentIntensity=preset.studio.intensity*lighting.ambient;
  if(lightAngle!==undefined)scene.environmentRotation.y=THREE.MathUtils.degToRad(lightAngle);
  (scene.background as THREE.Color).set(backgroundColor);
  if(scene.fog instanceof THREE.FogExp2){scene.fog.color.set(backgroundColor);scene.fog.density=fogDensity??0;}
  if(floor&&floorColor)floor.color.set(floorColor);
  // Consumers apply this after tone mapping, never as exposure.
  return THREE.MathUtils.clamp(lighting.brightness,.25,2.5);
 }
 update();
 return {update,dispose(){
  scene.remove(ambient);for(const {light} of lights){scene.remove(light);if(light instanceof THREE.DirectionalLight){scene.remove(light.target);light.shadow.dispose();}}
  studio?.dispose();scene.background=previous.background;scene.fog=previous.fog;scene.environment=previous.environment;scene.environmentIntensity=previous.intensity;scene.environmentRotation.copy(previous.rotation);
 }};
}
