import * as THREE from 'three';
import {bladeStations,bladeCrossSection,bladeThickness} from './craft';

// Coatings overlap the guard; every emitter uses the same steel profile and tip.
export const BLADE_ROOT=-.04;
export const BLADE_TIP=bladeStations[bladeStations.length-1][0];
export const BLADE_VISIBLE_ROOT=0;
export function bladeHalfWidth(y:number){
 for(let j=1;j<bladeStations.length;j++){
  const a=bladeStations[j-1],b=bladeStations[j];
  if(y<=b[0])return THREE.MathUtils.lerp(a[1],b[1],THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1))*.65;
 }
 return bladeStations[bladeStations.length-1][1]*.65;
}
// across: -1..1; face: -1 or 1. Interpolate the real bevel/fuller's surface.
export function sampleBladeSurface(out:THREE.Vector3,y:number,across:number,face:number,offset=0){
 y=THREE.MathUtils.clamp(y,BLADE_ROOT,BLADE_TIP);across=THREE.MathUtils.clamp(across,-1,1);
 let height=0;
 for(let j=1;j<=9;j++){
  const a=bladeCrossSection[j-1],b=bladeCrossSection[j];
  if(across<=b[0]){height=THREE.MathUtils.lerp(a[1],b[1],(across-a[0])/(b[0]-a[0]));break;}
 }
 return out.set(across*bladeHalfWidth(y),y,face*(height*bladeThickness(y)*.23+offset));
}
export function createBladeCoatingGeometry(thickness=.0025){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[];
 const rings=bladeStations.filter(([y])=>y>=BLADE_ROOT);
 for(let face=0;face<bladeCrossSection.length;face++){
  const base=positions.length/3;
  for(const [y,width,taper] of rings){
   const tipFade=1.-THREE.MathUtils.smoothstep(y,4.52,BLADE_TIP);
   for(const [x,z] of [bladeCrossSection[face],bladeCrossSection[(face+1)%bladeCrossSection.length]]){
    const layer=thickness*taper*tipFade*Math.pow(1.-Math.abs(x),.6);
    positions.push(x*(width*.65+.00025*taper*tipFade),y,z*taper*.23+Math.sign(z)*layer);
    uv.push(x*.5+.5,(y-BLADE_ROOT)/(BLADE_TIP-BLADE_ROOT));
   }
  }
  for(let row=0;row<rings.length-1;row++){const a=base+row*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();return geometry;
}
// Generate shader width sampling from the same stations, rather than a second profile.
const glsl=(n:number)=>Number.isInteger(n)?`${n}.0`:`${n}`;
export const bladeWidthGLSL=`float bladeWidth(float y){\n${bladeStations.slice(1).map((b,i)=>{
 const a=bladeStations[i];return `if(y<${glsl(b[0])})return mix(${glsl(a[1]*.65)},${glsl(b[1]*.65)},clamp((y-(${glsl(a[0])}))/${glsl(b[0]-a[0])},0.,1.));`;
}).join('\n')}\nreturn ${glsl(bladeHalfWidth(BLADE_TIP))};\n}`;
