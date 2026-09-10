import * as THREE from 'three';
import {bladeStations,bladeThickness} from './craft';

export function createBladeFrost(uniforms:Record<string,THREE.IUniform>){
 const positions:number[]=[],uv:number[]=[],indices:number[]=[],rows=180,sides=48;
 for(let row=0;row<=rows;row++){
  const y=.065+row/rows*4.975;
  let width=.1755;
  for(let j=1;j<bladeStations.length;j++)if(y<=bladeStations[j][0]){
   const a=bladeStations[j-1],b=bladeStations[j];width=THREE.MathUtils.lerp(a[1],b[1],THREE.MathUtils.clamp((y-a[0])/(b[0]-a[0]),0,1))*.65;break;
  }
  if(y>5.02)width=.0003;
  const end=1.-THREE.MathUtils.smoothstep(y,4.88,5.04);
  const thickness=(.007+.0018*Math.sin(y*13.)+.001*Math.sin(y*31.+1.))*end;
  for(let side=0;side<=sides;side++){
   const a=side/sides*Math.PI*2,c=Math.cos(a),s=Math.sin(a);
   // A smooth, closed ice envelope bridges the fuller and rounds the edges.
   const ripple=1.+.025*Math.sin(a*3.+y*9.)+.012*Math.sin(a*7.-y*16.);
   positions.push(Math.sign(c)*Math.pow(Math.abs(c),.55)*(width+thickness*.55)*ripple,y,
    Math.sign(s)*Math.pow(Math.abs(s),.55)*(.082*.23*bladeThickness(y)+thickness)*ripple);
   uv.push(side/sides,y/5.);
  }
 }
 for(let row=0;row<rows;row++)for(let side=0;side<sides;side++){
  const a=row*(sides+1)+side,b=a+sides+1;indices.push(a,b,a+1,a+1,b,b+1);
 }
 for(const row of [0,rows]){
  const center=positions.length/3;positions.push(0,row===0?.065:5.04,0);uv.push(.5,row/rows);
  for(let side=0;side<sides;side++){
   const a=row*(sides+1)+side;
   if(row===0)indices.push(center,a,a+1);else indices.push(center,a+1,a);
  }
 }
 const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
 const material=new THREE.MeshPhysicalMaterial({color:0xa7d7eb,metalness:0,roughness:.22,
  transmission:.72,ior:1.31,thickness:.016,attenuationColor:0x69b7db,attenuationDistance:.45,
  clearcoat:.3,clearcoatRoughness:.14,transparent:true,opacity:1,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.uniforms.iceExposed=uniforms.exposed;shader.uniforms.iceIntensity=uniforms.intensity;
  shader.vertexShader='varying vec3 icePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nicePosition=position;');
  shader.fragmentShader=`uniform float iceExposed;uniform float iceIntensity;varying vec3 icePosition;
   float iceHash(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453);}
   float iceNoise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(iceHash(i),iceHash(i+vec3(1,0,0)),f.x),mix(iceHash(i+vec3(0,1,0)),iceHash(i+vec3(1,1,0)),f.x),f.y),mix(mix(iceHash(i+vec3(0,0,1)),iceHash(i+vec3(1,0,1)),f.x),mix(iceHash(i+vec3(0,1,1)),iceHash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
   float revealed=1.-smoothstep(iceExposed-.02,iceExposed,icePosition.y);
   if(revealed<.001||iceIntensity<.001)discard;
   diffuseColor.a*=revealed*clamp(iceIntensity,0.,1.);
   vec3 fp=icePosition*vec3(100.,65.,100.);
   float frostCoverage=iceNoise(fp)*.65+iceNoise(fp*2.7)*.35;
   float grain=iceNoise(icePosition*430.);
   float frost=(.18+smoothstep(.25,.78,frostCoverage)*.32);
   float crystals=smoothstep(.57,.83,grain)*frost;
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(.80,.92,.96),frost*.38+crystals*.08);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <roughnessmap_fragment>',`#include <roughnessmap_fragment>
   roughnessFactor=clamp(.16+frost*.5+crystals*.08,.1,.85);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <transmission_fragment>',THREE.ShaderChunk.transmission_fragment.replace('material.transmission = transmission;','material.transmission = transmission * (1. - frost * .65);'));
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_maps>',`#include <normal_fragment_maps>
   vec3 dpdx=dFdx(-vViewPosition),dpdy=dFdy(-vViewPosition);
   vec3 r1=cross(dpdy,normal),r2=cross(normal,dpdx);
   float det=dot(dpdx,r1);
   float relief=iceNoise(icePosition*180.)*.00006;
   normal=normalize(abs(det)*normal-sign(det)*(dFdx(relief)*r1+dFdy(relief)*r2));
  `);
 };
 material.customProgramCacheKey=()=> 'frosted-ice-envelope-v2';
 return new THREE.Mesh(geometry,material);
}
