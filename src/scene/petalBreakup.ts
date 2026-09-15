// Deterministic value noise shared by the shader and particle release schedule.
const mod=(x:number)=>x-Math.floor(x/289)*289;
const permute=(x:number)=>mod((mod(x)*34+1)*mod(x));
const hash=(x:number,y:number)=>permute(permute(x)+y)/289;
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
function noise(x:number,y:number){
 const ix=Math.floor(x),iy=Math.floor(y);let fx=x-ix,fy=y-iy;
 fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy);
 return mix(mix(hash(ix,iy),hash(ix+1,iy),fx),mix(hash(ix,iy+1),hash(ix+1,iy+1),fx),fy);
}
export function petalBreakup(x:number,y:number,delay:number){
 const qx=x*7+delay*43,qy=y*5+delay*17;
 return .055*(noise(qx,qy)-.5)+.025*(noise(qx*2.07+31,qy*2.07+17)-.5);
}
// Larger irregular losses for the giant blades, kept identical in the asset bake and shader.
export function bankaiPetalBreakup(x:number,y:number,delay:number){
 return petalBreakup(x,y,delay)+.08*(noise(x*1.1+delay*19,y*.65+delay*29)-.5);
}
export const PETAL_BREAKUP_GLSL=`
 float petalPermute(float x){x=mod(x,289.);return mod((x*34.+1.)*x,289.);}
 float petalHash(vec2 p){return petalPermute(petalPermute(p.x)+p.y)/289.;}
 float petalNoise(vec2 p){
  vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
  return mix(mix(petalHash(i),petalHash(i+vec2(1.,0.)),f.x),mix(petalHash(i+vec2(0.,1.)),petalHash(i+vec2(1.,1.)),f.x),f.y);
 }
 float petalBreakup(vec2 p,float delay){
  vec2 q=p*vec2(7.,5.)+delay*vec2(43.,17.);
  return .055*(petalNoise(q)-.5)+.025*(petalNoise(q*2.07+vec2(31.,17.))-.5);
 }
 float bankaiPetalBreakup(vec2 p,float delay){
  return petalBreakup(p,delay)+.08*(petalNoise(p*vec2(1.1,.65)+delay*vec2(19.,29.))-.5);
 }
`;
