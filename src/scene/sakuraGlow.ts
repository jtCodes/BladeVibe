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
 `+shader.fragmentShader;
}
