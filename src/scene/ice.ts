import * as THREE from 'three';
import {createBladeCoatingGeometry} from './bladeSurface';

export function createBladeFrost(uniforms:Record<string,THREE.IUniform>){
 const geometry=createBladeCoatingGeometry();
 const material=new THREE.MeshPhysicalMaterial({color:0xa7d7eb,metalness:0,roughness:.22,
  transmission:.72,ior:1.31,thickness:.005,attenuationColor:0x69b7db,attenuationDistance:.45,
  clearcoat:.3,clearcoatRoughness:.14,transparent:true,opacity:1,depthWrite:false});
 material.onBeforeCompile=shader=>{
  shader.uniforms.iceExposed=uniforms.exposed;shader.uniforms.iceIntensity=uniforms.intensity;
  shader.vertexShader='varying vec3 icePosition;varying float iceAcross;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nicePosition=position;iceAcross=uv.x*2.-1.;');
  shader.fragmentShader=`uniform float iceExposed;uniform float iceIntensity;varying vec3 icePosition;varying float iceAcross;
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
   float frost=(.18+smoothstep(.25,.78,frostCoverage)*.32)*mix(.2,1.,1.-smoothstep(.65,.98,abs(iceAcross)));
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
 material.customProgramCacheKey=()=> 'frosted-faceted-blade-v3';
 return new THREE.Mesh(geometry,material);
}
