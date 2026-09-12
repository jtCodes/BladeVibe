import * as THREE from 'three';
import {surfaceMaps} from './craft';

export interface SatinMetalOptions {
 color:THREE.ColorRepresentation;
 /** Multiplies the brushed roughness texture (centered near .3). */
 roughnessScale?:number;
}

/** Shared satin-metal finish for sword fittings and exposed metal surfaces. */
export function createSatinMetal(renderer:THREE.WebGLRenderer,{color,roughnessScale=.95}:SatinMetalOptions){
 // Each part owns its material; texture maps are cached per renderer and disposed by scene cleanup.
 const surface=surfaceMaps('steel',renderer);
 return new THREE.MeshStandardMaterial({
  color,metalness:1,roughness:roughnessScale,envMapIntensity:1.8,
  roughnessMap:surface.roughnessMap,bumpMap:surface.bumpMap,bumpScale:.00012,
 });
}
