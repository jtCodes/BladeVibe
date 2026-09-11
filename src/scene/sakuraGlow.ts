// Shared by the single blade and the enlarged Bankai blades, in original blade units.
export function addSakuraGlow(shader:{fragmentShader:string}){
 if(shader.fragmentShader.includes('vec3 sakuraEmission('))return;
 shader.fragmentShader=`
 const vec3 SAKURA_PINK=vec3(1.,.46,.69);
 float sakuraTint(float distanceToEdge,float progress){
  return smoothstep(0.,.12,progress)*(1.-smoothstep(.06,1.3,distanceToEdge));
 }
 vec3 sakuraEmission(float distanceToEdge,float progress,float tint){
  float rim=1.-smoothstep(.01,.13,abs(distanceToEdge));
  return vec3(1.,.28,.52)*tint*.28+vec3(5.,.55,2.)*rim*step(.001,progress)*step(progress,.999);
 }
 vec3 sakuraBladeEmission(float width,float shift,float rise,float distanceToEdge,float progress,float tint){
  float luminousEdge=max(1.-smoothstep(.015,.09,width),smoothstep(.78,.98,width));
  vec3 bladeGlow=mix(vec3(2.1,2.25,2.45),vec3(6.4,.55,2.6),shift);
  return bladeGlow*mix(luminousEdge,max(luminousEdge,.32),shift)*rise+sakuraEmission(distanceToEdge,progress,tint)*1.5;
 }
 `+shader.fragmentShader;
}

// The dissolve front and any extra shading remain owned by the calling effect.
export function addSakuraSurfaceTransition(shader:{fragmentShader:string},tint:string,prepare='',shade=''){
 addSakuraGlow(shader);
 shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
  ${prepare}
  diffuseColor.rgb=mix(diffuseColor.rgb,SAKURA_PINK,${tint}*.9);
  ${shade}
  metalnessFactor=mix(metalnessFactor,.3,${tint});
 `);
}
