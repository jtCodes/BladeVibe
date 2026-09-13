import type * as THREE from 'three';

// Lighting controls cannot erase the finish difference between body and edge.
export const DULL_BLADE_FINISH={minimumRoughness:.56,directReflectionStrength:.65,environmentReflectionStrength:.85} as const;
export function applyBladeSurfaceFinish(shader:Parameters<THREE.Material['onBeforeCompile']>[0],cuttingMask='0.0'){
 shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
  roughnessFactor=max(roughnessFactor,mix(${DULL_BLADE_FINISH.minimumRoughness},0.0,clamp(${cuttingMask},0.0,1.0)));
 `);
 shader.fragmentShader=shader.fragmentShader.replace('#include <lights_fragment_end>',`#include <lights_fragment_end>
  float bladeCuttingMask=clamp(${cuttingMask},0.0,1.0);
  reflectedLight.directSpecular*=mix(${DULL_BLADE_FINISH.directReflectionStrength},1.0,bladeCuttingMask);
  // Metals need broad environment reflections to remain readable against black.
  reflectedLight.indirectSpecular*=mix(${DULL_BLADE_FINISH.environmentReflectionStrength},1.0,bladeCuttingMask);
 `);
}
