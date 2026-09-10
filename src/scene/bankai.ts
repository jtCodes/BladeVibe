import * as THREE from 'three';
import type {EffectMode} from './aura';
import {KATANA_RADIUS} from './senbonzakura';

export function createBankai(sword:THREE.Group){
 const blade=sword.getObjectByName('senbonzakura-blade') as THREE.Mesh;
 const dissolve={value:0};
 const inject=(shader:{vertexShader:string;fragmentShader:string;uniforms:Record<string,THREE.IUniform>})=>{
  shader.uniforms.bladeDissolve=dissolve;
  shader.vertexShader='varying vec3 dissolvePosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ndissolvePosition=position;');
  shader.fragmentShader='uniform float bladeDissolve;varying vec3 dissolvePosition;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float edge=5.02*(1.-bladeDissolve);
   float grain=sin(dissolvePosition.y*173.+dissolvePosition.x*227.)*sin(dissolvePosition.z*391.+dissolvePosition.y*83.);
   if(bladeDissolve>0.&&dissolvePosition.y>edge+grain*.045)discard;
  `);
 };
 for(const material of Array.isArray(blade.material)?blade.material:[blade.material]){
  const previous=material.onBeforeCompile.bind(material),key=material.customProgramCacheKey();
  material.onBeforeCompile=(shader,renderer)=>{previous(shader,renderer);inject(shader);
   shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
    float rim=1.-smoothstep(.01,.13,abs(dissolvePosition.y-5.02*(1.-bladeDissolve)));
    totalEmissiveRadiance+=vec3(5.,.55,2.)*rim*step(.001,bladeDissolve)*step(bladeDissolve,.999);`);
  };material.customProgramCacheKey=()=>key+'-petal-dissolve-v1';material.needsUpdate=true;
 }
 const depth=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking});depth.onBeforeCompile=inject;depth.customProgramCacheKey=()=> 'petal-dissolve-depth-v1';blade.customDepthMaterial=depth;
 // One shared, cupped petal mesh with the small notch of a cherry blossom.
 const outline=new THREE.Shape();outline.moveTo(0,-.5);outline.bezierCurveTo(-.45,-.18,-.48,.3,-.18,.5);outline.quadraticCurveTo(-.07,.55,0,.37);outline.quadraticCurveTo(.1,.55,.22,.46);outline.bezierCurveTo(.47,.2,.34,-.22,0,-.5);
 const geometry=new THREE.ShapeGeometry(outline,5);const attr=geometry.getAttribute('position');
 for(let i=0;i<attr.count;i++){const x=attr.getX(i),y=attr.getY(i);attr.setZ(i,.22*x*x+.1*y*y+.05*Math.sin(y*5));}geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.42,metalness:.12,side:THREE.DoubleSide,emissive:0xff71ad,emissiveIntensity:1.4});
 const count=3000,petals=new THREE.InstancedMesh(geometry,material,count);petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);petals.frustumCulled=false;petals.visible=false;sword.add(petals);
 let seed=391;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const samples=Array.from({length:count},(_,i)=>{
  const y=.16+random()*4.85,angle=y/KATANA_RADIUS,x=(random()-.5)*.19,z=(random()<.5?-1:1)*.025;
  petals.setColorAt(i,new THREE.Color().setRGB(1,.35+random()*.45,.60+random()*.32));
  return {y,origin:new THREE.Vector3(KATANA_RADIUS*(1-Math.cos(angle))+x*Math.cos(angle),KATANA_RADIUS*Math.sin(angle)-x*Math.sin(angle),z),phase:random()*Math.PI*2,orbit:.55+random()*4.75,size:.035+Math.pow(random(),2)*.11,spin:new THREE.Vector3(random()*3,random()*4,random()*5)};
 });
 const dummy=new THREE.Object3D(),light=new THREE.PointLight(0xff86c6,0,7,2);light.position.set(0,1,.5);sword.add(light);
 let active=false,speed=1,intensity=1,time=0,progress=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 return {get visible(){return progress>0;},configure(mode:EffectMode,nextSpeed:number,nextIntensity:number){active=mode==='bankai';speed=nextSpeed;intensity=nextIntensity;},
  update(dt:number,draw:number){
   const step=dt*speed;if(step>0)time+=step;
   const target=active&&intensity>0&&draw>.98?1:0;
   const previous=progress;
   progress=THREE.MathUtils.clamp(progress+(target>progress?1:target<progress?-1:0)*(active?step:dt*Math.max(.5,speed))/2.1,0,1);
   if(reduced||draw<.98)progress=target;
   dissolve.value=progress;
   // Shadow caching must also account for material-driven disappearance.
   if(progress!==previous)sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;
   petals.visible=progress>0;blade.visible=progress<1;light.intensity=progress*Math.min(2,intensity)*.65;
   if(!petals.visible)return;
   const visibleCount=Math.min(count,Math.round(count*Math.min(1,intensity/2)));petals.count=visibleCount;
   for(let i=0;i<visibleCount;i++){
    const p=samples[i],release=(5.02-p.y)/5.02;
    const spread=THREE.MathUtils.smoothstep(progress,release,Math.min(1,release+.18));
    const motionTime=reduced?0:time;
    const phase=p.phase+motionTime*(.5+p.spin.x*.1);
    const radius=p.orbit*spread*(1.+.16*Math.sin(motionTime*.8+p.phase*3.));
    dummy.position.copy(p.origin);
    dummy.position.x+=Math.cos(phase)*radius;
    dummy.position.z+=Math.sin(phase)*radius;
    dummy.position.y+=spread*(Math.sin(phase*.7+p.phase)*2.5-.8);
    dummy.rotation.set(p.phase+motionTime*p.spin.x,p.phase*.6+motionTime*p.spin.y,motionTime*p.spin.z);
    dummy.scale.set(p.size*(.65+.35*Math.sin(p.phase)),p.size,p.size);
    if(spread<=0)dummy.scale.setScalar(0);else dummy.scale.multiplyScalar(Math.min(1,spread*12));
    dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);
   }
   petals.instanceMatrix.needsUpdate=true;
  },dispose(){depth.dispose();petals.dispose();}
 };
}
