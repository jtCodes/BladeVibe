import * as THREE from 'three';
import {surfaceMaps} from './craft';

// Shared polished steel response. Models choose a finish and tint, not new lighting coefficients.
export const METAL_FINISHES={
 blade:{roughness:.42,bumpScale:.0003,anisotropy:.2,repeat:[1,1] as [number,number]},
 edge:{roughness:.075,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number]},
 fittings:{roughness:.3,bumpScale:.00009,anisotropy:0,repeat:[2,.2] as [number,number]},
 recessed:{roughness:.56,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number]},
 matteBlackened:{roughness:.92,bumpScale:.00008,anisotropy:0,repeat:[1,1] as [number,number],metalness:.55,envMapIntensity:.08},
 blackenedBlade:{roughness:.58,bumpScale:.00008,anisotropy:0,repeat:[1,1] as [number,number],metalness:.55,envMapIntensity:.3},
 blackenedEdge:{roughness:.42,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number],metalness:.55,envMapIntensity:.35},
 blackenedFittings:{roughness:.62,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number],metalness:.4,envMapIntensity:.3},
 blackenedGuard:{roughness:.68,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number],metalness:.25,envMapIntensity:.25},
} as const;
export function createMetalMaterial(renderer:THREE.WebGLRenderer,{color,finish}:{color:THREE.ColorRepresentation;finish:keyof typeof METAL_FINISHES}){
 const profile=METAL_FINISHES[finish];
 const textured=profile.bumpScale>0;
 const maps=textured?surfaceMaps('steel',renderer,profile.repeat):{};
 const blackened=finish.startsWith('blackened')||finish==='matteBlackened';
 const material=new THREE.MeshPhysicalMaterial({color,metalness:'metalness' in profile?profile.metalness:1,envMapIntensity:'envMapIntensity' in profile?profile.envMapIntensity:1,roughness:profile.roughness,bumpScale:profile.bumpScale,anisotropy:profile.anisotropy,anisotropyRotation:Math.PI/2,...maps,...(blackened?{roughnessMap:null}:{})});
 if(finish==='blackenedGuard'){
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
   gl_FragColor.rgb=vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722)));
  `);};
  material.customProgramCacheKey=()=> 'neutral-blackened-metal-v1';
 }
 return material;
}
