import {getSakuraData} from './sakuraAssets';
import {createSakuraParticles} from './sakuraPetals';
import {addSakuraGlow,addSakuraSurfaceTransition,sakuraPinkBuild} from './sakuraGlow';
import {PETAL_BREAKUP_GLSL} from './petalBreakup';
import * as THREE from 'three';
import type {EffectMode} from './aura';

import {SHIKAI_HEIGHT as HEIGHT,SHIKAI_DISSOLVE_AT as DISSOLVE_AT,SHIKAI_DISSOLVE_DURATION as DISSOLVE_DURATION} from './sakuraLayout';
export function createShikai(sword:THREE.Group){
 const blade=sword.getObjectByName('senbonzakura-blade') as THREE.Mesh;
 const clock={value:0},power={value:1};
 const inject=(shader:{vertexShader:string;fragmentShader:string;uniforms:Record<string,THREE.IUniform>})=>{
  shader.uniforms.shikaiTime=clock;shader.uniforms.shikaiPower=power;
  shader.vertexShader='varying vec3 dissolvePosition;varying float shikaiWidth;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndissolvePosition=position;shikaiWidth=uv.x;');
  if(!shader.fragmentShader.includes('float petalPermute('))shader.fragmentShader=PETAL_BREAKUP_GLSL+shader.fragmentShader;
  shader.fragmentShader='uniform float shikaiTime;uniform float shikaiPower;varying vec3 dissolvePosition;varying float shikaiWidth;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float shikaiDissolve=clamp((shikaiTime-${DISSOLVE_AT})/${DISSOLVE_DURATION},0.,1.);
   float shikaiThreshold=clamp(1.-dissolvePosition.y/${HEIGHT}+petalBreakup(dissolvePosition.xy,0.),.003,.997);
   if(shikaiDissolve>=shikaiThreshold)discard;
   float shikaiDistance=(shikaiThreshold-shikaiDissolve)*5.02;
  `);
 };
 for(const material of Array.isArray(blade.material)?blade.material:[blade.material]){
  const previous=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{previous(shader,renderer);inject(shader);addSakuraGlow(shader);
   addSakuraSurfaceTransition(shader,'shikaiTint',`float shikaiTint=sakuraTint(shikaiDistance,shikaiDissolve);`);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float shikaiShift=smoothstep(0.,.9,shikaiTime);
    // Let white light gather throughout the lead-in to breakup.
    float shikaiRise=smoothstep(0.,${DISSOLVE_AT},shikaiTime);
    totalEmissiveRadiance+=sakuraBladeEmission(shikaiWidth,shikaiShift,shikaiRise,shikaiDistance,shikaiDissolve,shikaiTint)*shikaiPower;
   `);
  };material.customProgramCacheKey=()=>key+'-shikai-bankai-release-v3';material.needsUpdate=true;
 }
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});depth.onBeforeCompile=inject;depth.customProgramCacheKey=()=> 'shikai-bankai-depth-v1';blade.customDepthMaterial=depth;
 const particles=createSakuraParticles(getSakuraData('shikai'),clock);
 sword.add(particles.petals,particles.dust);
 const light=new THREE.PointLight(0xff7ac4,0,0,2);light.position.set(0,2,.5);sword.add(light);
 let emission=4;
 let active=false,speed=1,intensity=1,returnStart=0,returnElapsed=0,returning=false;
 let furthestTime=0,manualTimeline=false;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function render(previous:number){
   furthestTime=Math.max(furthestTime,clock.value);
   const progress=THREE.MathUtils.clamp((clock.value-DISSOLVE_AT)/DISSOLVE_DURATION,0,1);
   const previousProgress=THREE.MathUtils.clamp((previous-DISSOLVE_AT)/DISSOLVE_DURATION,0,1);
   if(progress!==previousProgress)sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;
   power.value=Math.min(2,Math.max(0,intensity));blade.visible=progress<1;
   particles.update(intensity,emission,clock.value>DISSOLVE_AT);
   light.intensity=sakuraPinkBuild(progress)*power.value*3;
 }
 return {
  get visible(){return clock.value>0;},
  get pinkGlow(){return sakuraPinkBuild((clock.value-DISSOLVE_AT)/DISSOLVE_DURATION);},
  get time(){return clock.value;},
  get cycleDuration(){return DISSOLVE_AT+DISSOLVE_DURATION+6;},
  get duration(){return Math.max(DISSOLVE_AT+DISSOLVE_DURATION+6,furthestTime);},
  setPetalGlow(value:number){emission=value;},
  configure(mode:EffectMode,nextSpeed:number,nextIntensity:number){
   const nextActive=mode==='shikai';
   if(active!==nextActive){manualTimeline=false;if(nextActive&&clock.value===0)furthestTime=0;}
   active=nextActive;speed=nextSpeed;intensity=nextIntensity;
  },
  seek(seconds:number){
   if(!Number.isFinite(seconds))return;
   const previous=clock.value;clock.value=Math.max(0,seconds);returning=false;manualTimeline=true;render(previous);
  },
  update(dt:number,draw:number){
   const previous=clock.value,target=active&&intensity>0&&draw>.98;
   if(draw<.98){clock.value=0;returning=false;manualTimeline=false;}
   else if(target){
    returning=false;
    clock.value=reduced&&!manualTimeline&&dt>0?DISSOLVE_AT+DISSOLVE_DURATION+1:clock.value+dt*speed;
   }
   else if(clock.value>0){
    if(!returning){returnStart=clock.value;returnElapsed=0;returning=true;}
    returnElapsed+=dt*Math.max(.5,speed);
    // Rewind the same GPU paths to their exact blade origins within a bounded duration.
    clock.value=reduced&&dt>0?0:returnStart*(1-THREE.MathUtils.smoothstep(returnElapsed,0,2.1));
   }
   render(previous);
  },
  dispose(){depth.dispose();particles.dispose();light.removeFromParent();}
 };
}
