import * as THREE from 'three';
import {surfaceMaps} from './craft';
import {applyBladeSurfaceFinish} from './bladeSurfaceFinish';
import {metalWearTexture} from './metalWear';
import {applyMetalWear,METAL_WEAR_PRESETS,type MetalWearOptions} from './metalWearShader';

// Shared polished steel response. Models choose a finish and tint, not new lighting coefficients.
export const METAL_FINISHES={
 blade:{roughness:.42,bumpScale:.0003,anisotropy:.2,repeat:[1,1] as [number,number]},
 edge:{roughness:.075,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number]},
 satinFittings:{roughness:.95,bumpScale:.00009,anisotropy:0,repeat:[2,.2] as [number,number],envMapIntensity:.6},
 fittings:{roughness:.3,bumpScale:.00009,anisotropy:0,repeat:[2,.2] as [number,number]},
 recessed:{roughness:.56,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number]},
 // Rough blackened iron: suppress the white dielectric sheen on the dark face.
 matteBlackened:{roughness:.98,bumpScale:.00065,anisotropy:0,repeat:[1,1] as [number,number],metalness:.65,specularIntensity:.2,envMapIntensity:.22},
 blackenedBlade:{roughness:.58,bumpScale:.00008,anisotropy:0,repeat:[1,1] as [number,number],metalness:.55,envMapIntensity:.3},
 blackenedEdge:{roughness:.42,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number],metalness:.55,envMapIntensity:.35},
 blackenedFittings:{roughness:.62,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number],metalness:.4,envMapIntensity:.3},
 blackenedGuard:{roughness:.68,bumpScale:0,anisotropy:0,repeat:[1,1] as [number,number],metalness:.25,envMapIntensity:.25},
} as const;
export function createMetalMaterial(renderer:THREE.WebGLRenderer,{color,finish,cuttingMask,wear}:{color:THREE.ColorRepresentation;finish:keyof typeof METAL_FINISHES;cuttingMask?:string;wear?:false|Partial<MetalWearOptions>}){
 const profile=METAL_FINISHES[finish];
 const textured=profile.bumpScale>0;
 const maps=textured?surfaceMaps('steel',renderer,profile.repeat):{};
 const blackened=finish.startsWith('blackened')||finish==='matteBlackened';
 const material=new THREE.MeshPhysicalMaterial({color,metalness:'metalness' in profile?profile.metalness:1,envMapIntensity:'envMapIntensity' in profile?profile.envMapIntensity:1,roughness:profile.roughness,bumpScale:profile.bumpScale,anisotropy:profile.anisotropy,anisotropyRotation:Math.PI/2,...maps,...(blackened?{roughnessMap:null}:{})});
 material.specularIntensity='specularIntensity' in profile?profile.specularIntensity:1;
 if(finish==='blade'||finish==='blackenedBlade'||finish==='matteBlackened'){
  material.onBeforeCompile=shader=>applyBladeSurfaceFinish(shader,cuttingMask);
  material.customProgramCacheKey=()=>`blade-surface-finish-v2-${cuttingMask??'body'}`;
 }
 if(finish==='blackenedGuard'){
  material.onBeforeCompile=shader=>{shader.fragmentShader=shader.fragmentShader.replace('#include <dithering_fragment>',`#include <dithering_fragment>
   gl_FragColor.rgb=vec3(dot(gl_FragColor.rgb,vec3(.2126,.7152,.0722)));
  `);};
  material.customProgramCacheKey=()=> 'neutral-blackened-metal-v1';
 }
 if(wear!==false){
  const preset=blackened?METAL_WEAR_PRESETS.blackened:finish==='edge'?METAL_WEAR_PRESETS.polished:finish==='blade'?METAL_WEAR_PRESETS.worn:METAL_WEAR_PRESETS.fittings;
  const options={...preset,...wear},texture=metalWearTexture(renderer);
  const inherited=material.onBeforeCompile.bind(material),baseKey=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{inherited(shader,renderer);applyMetalWear(shader,texture,options);};
  material.customProgramCacheKey=()=>`${baseKey}-metal-wear-v1`;
 }
 return material;
}
