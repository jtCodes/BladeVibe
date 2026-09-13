import type * as THREE from 'three';
export interface MetalWearOptions {amount:number;scale:number;scratches:number;blemishes:number;pitting:number;exposedMetal:number}
export const METAL_WEAR_PRESETS={
 polished:{amount:.45,scale:.65,scratches:.65,blemishes:.35,pitting:.2,exposedMetal:.1},
 worn:{amount:.65,scale:.65,scratches:.85,blemishes:.65,pitting:.4,exposedMetal:.25},
 blackened:{amount:.75,scale:.65,scratches:1,blemishes:.5,pitting:.35,exposedMetal:.8},
 fittings:{amount:.5,scale:1.1,scratches:.65,blemishes:.7,pitting:.45,exposedMetal:.15},
} satisfies Record<string,MetalWearOptions>;
type Shader=Parameters<THREE.Material['onBeforeCompile']>[0];
/** Object-space mapping keeps the same scratch scale on differently UV-mapped swords. */
export function applyMetalWear(shader:Shader,texture:THREE.Texture,options:MetalWearOptions){
 shader.uniforms.metalWearMap={value:texture};
 for(const [name,value] of Object.entries(options))shader.uniforms[`metalWear_${name}`]={value:value};
 shader.vertexShader='varying vec3 metalWearPosition;\nvarying vec3 metalWearNormal;\n'+shader.vertexShader;
 shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
  metalWearPosition=position;metalWearNormal=normal;
 `);
 shader.fragmentShader=`varying vec3 metalWearPosition;varying vec3 metalWearNormal;
  uniform sampler2D metalWearMap;
  uniform float metalWear_amount;uniform float metalWear_scale;uniform float metalWear_scratches;
  uniform float metalWear_blemishes;uniform float metalWear_pitting;uniform float metalWear_exposedMetal;
 `+shader.fragmentShader;
 // Apply after all model-specific color/roughness work (hamon, blade finish).
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`
  vec3 wearPosition=metalWearPosition*metalWear_scale;
  vec3 wearNormal=normalize(metalWearNormal);
  vec3 wearWeights=pow(abs(wearNormal),vec3(6.));wearWeights/=max(dot(wearWeights,vec3(1.)),.0001);
  vec3 wearMask=texture2D(metalWearMap,wearPosition.yz+vec2(.19,sign(wearNormal.x)*.37)).rgb*wearWeights.x
   +texture2D(metalWearMap,wearPosition.xz+vec2(.53,sign(wearNormal.y)*.23)).rgb*wearWeights.y
   +texture2D(metalWearMap,wearPosition.xy+vec2(sign(wearNormal.z)*.31,.11)).rgb*wearWeights.z;
  float wearScratch=clamp(wearMask.r*metalWear_scratches*metalWear_amount,0.,1.);
  float wearBlemish=clamp(wearMask.g*metalWear_blemishes*metalWear_amount,0.,1.);
  float wearPit=clamp(wearMask.b*metalWear_pitting*metalWear_amount,0.,1.);
  diffuseColor.rgb*=1.-wearBlemish*.18-wearPit*.25;
  diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.52,.53,.54),wearScratch*metalWear_exposedMetal);
  roughnessFactor=clamp(roughnessFactor+wearBlemish*.18+wearPit*.15,.045,1.);
  roughnessFactor=mix(roughnessFactor,.27,wearScratch*.65);
  metalnessFactor=mix(metalnessFactor,max(metalnessFactor,.85),wearScratch*metalWear_exposedMetal);
  #include <lights_physical_fragment>
 `);
}
