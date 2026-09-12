export type BankaiPetalMotion='drift'|'storm';

// Shared by solid petals and fine dust; time-based so seeking stays deterministic.
export const PETAL_STORM_GLSL=`
 uniform float petalStorm;
 uniform vec3 petalCamera;
 vec3 applyPetalStorm(vec3 original,vec3 drifting,float age,float phase){
  if(petalStorm<.5)return drifting;
  vec3 lane=petalCamera+vec3(sin(phase*3.1)*4.,cos(phase*2.7)*3.5,0.);
  vec3 direction=normalize(lane-original+vec3(0.,0.,.001));
  float travel=(age-(1.-exp(-age*2.))*.5)*(15.+6.*sin(phase)*sin(phase));
  float swell=1.-exp(-age*2.5);
  vec3 vortex=vec3(sin(age*3.2+phase),cos(age*2.7+phase*1.4),sin(age*2.1+phase*2.));
  vortex+=.35*vec3(sin(age*7.1+phase*3.),cos(age*6.3+phase),sin(age*5.9+phase));
  vec3 storm=original+direction*travel+vortex*swell*1.6;
  return mix(drifting,storm,smoothstep(.15,1.1,age));
 }
`;
