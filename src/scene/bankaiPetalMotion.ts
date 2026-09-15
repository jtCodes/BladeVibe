import {BANKAI_DISSOLVE_AT,BANKAI_DISSOLVE_END} from './sakuraLayout';
import {MathUtils} from 'three';
import {BANKAI_PETAL_RUSH_TIME,BANKAI_BREAKUP_EARLY_PROGRESS} from './bankaiTiming';
export type BankaiPetalMotion='drift'|'storm';

// Fade stationary row lighting as storm petals leave the columns.
export function bankaiStationaryGlow(time:number,motion:BankaiPetalMotion){
 return motion==='storm'?1-MathUtils.smoothstep(time,BANKAI_PETAL_RUSH_TIME,BANKAI_PETAL_RUSH_TIME+1.5):1;
}

// Shared by solid petals and fine dust; time-based so seeking stays deterministic.
export const PETAL_STORM_GLSL=`
 uniform float petalStorm;
 uniform float petalWind;
 uniform float petalRushAge;
 uniform vec3 petalCamera;
 float petalFlightAge(float clock,float release){
  if(petalWind<.5)return max(0.,clock-release);
  // Invert the breakup curve so released petals drift in real seconds, not slow motion.
  float p=clamp((release-${BANKAI_DISSOLVE_AT})/${BANKAI_DISSOLVE_END-BANKAI_DISSOLVE_AT},0.,1.);
  float early=${BANKAI_BREAKUP_EARLY_PROGRESS.toFixed(3)};
  float rate=early/7.,acceleration=1.-early-rate;
  float birth=p<=early?p/rate:7.+(-rate+sqrt(rate*rate+4.*acceleration*(p-early)))/(2.*acceleration);
  return max(0.,petalRushAge+${BANKAI_PETAL_RUSH_TIME.toFixed(1)}-13.-birth);
 }
 vec3 petalRandom(vec3 p){
  p=fract(p*vec3(.1031,.1030,.0973));
  p+=dot(p,p.yxz+33.33);
  return fract((p.xxy+p.yxx)*p.zyx);
 }
 vec3 windDrift(vec3 origin,float age,float phase){
  // Independent random components avoid mapping every petal onto the same curved sheet.
  vec3 seed=petalRandom(origin*7.31+vec3(phase*11.7,phase*23.1,phase*5.9));
  vec3 other=petalRandom(origin.zxy*3.17+seed*91.7+17.);
  // Bell-shaped velocity distribution creates sparse outliers, not a hard plume boundary.
  vec3 scatter=sqrt(-2.*log(max(seed,vec3(.0001))))*cos(other*6.2831853);
  float response=.35+seed.y*1.4;
  float carried=age-(1.-exp(-age*(.55+seed.z)))/(.55+seed.z);
  vec3 wind=vec3(.65,.12,-.08)*carried*response;
  wind+=scatter*vec3(.72,.4,1.1)*(age*.7+(1.-exp(-age*1.4))*.3);
  vec3 frequency=vec3(.38,.46,.31)+other*.8;
  vec3 offset=seed*6.2831853;
  // Each petal catches a different eddy; spread keeps growing throughout the drift.
  wind+=(sin(age*frequency+offset)-sin(offset))*vec3(.55,.4,.65);
  return wind;
 }
 vec3 applyPetalStorm(vec3 original,vec3 drifting,float age,float phase){
  if(petalWind>.5)drifting=original+windDrift(original,age,phase);
  if(petalStorm<.5||petalRushAge<=0.)return drifting;
  float rush=min(age,petalRushAge);
  vec3 anchor=original+windDrift(original,max(0.,age-rush),phase);
  vec3 lane=petalCamera+vec3(sin(phase*3.1)*4.,cos(phase*2.7)*3.5,0.);
  vec3 direction=normalize(lane-anchor+vec3(0.,0.,.001));
  float travel=(rush-(1.-exp(-rush*2.))*.5)*(15.+6.*sin(phase)*sin(phase));
  float swell=1.-exp(-rush*2.5);
  vec3 vortex=vec3(sin(rush*3.2+phase),cos(rush*2.7+phase*1.4),sin(rush*2.1+phase*2.));
  vec3 storm=anchor+direction*travel+vortex*swell*.7;
  return mix(drifting,storm,smoothstep(0.,.7,rush));
 }
`;
