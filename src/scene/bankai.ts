import {createBankaiFormation} from './bankaiFormation';
import * as THREE from 'three';
import {FLOOR_Y} from './swordPhysics';

// A cinematic release owns the displayed pose while ordinary drop physics is paused.
export function createBankai(sword:THREE.Group,floor:THREE.Mesh,scene:THREE.Scene){
 const formation=createBankaiFormation(scene,sword);
 const waterY=FLOOR_Y+.002;
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),-waterY);
 const saved=new Map<THREE.Material,{planes:THREE.Plane[]|null;shadows:boolean}>();
 sword.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  for(const material of [...(Array.isArray(object.material)?object.material:[object.material]),object.customDepthMaterial,object.customDistanceMaterial]){
   if(material&&!saved.has(material))saved.set(material,{planes:material.clippingPlanes,shadows:material.clipShadows});
  }
 });
 const uniforms={age:{value:-1},reveal:{value:0},power:{value:1},rippleCenter:{value:new THREE.Vector2()}};
 const originalGeometry=floor.geometry,originalMaterial=floor.material;
 const rippleMaterial=(floor.material as THREE.MeshStandardMaterial).clone();
 // Subdivide the existing floor locally, retaining its full outer extent and material.
 const coordinates=[-500,...Array.from({length:193},(_,i)=>-12+i/8),500];
 const positions:number[]=[],uvs:number[]=[],indices:number[]=[],width=coordinates.length;
 for(const y of coordinates)for(const x of coordinates){positions.push(x,y,0);uvs.push(x/1000+.5,y/1000+.5);}
 for(let y=0;y<width-1;y++)for(let x=0;x<width-1;x++){
  const a=y*width+x;indices.push(a,a+1,a+width,a+1,a+width+1,a+width);
 }
 const rippleGeometry=new THREE.BufferGeometry();
 rippleGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 rippleGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 rippleGeometry.setIndex(indices);rippleGeometry.computeVertexNormals();
 const heightShader=`uniform float age;uniform float reveal;uniform float power;uniform vec2 rippleCenter;
  float floorHeight(vec2 p){
   if(age<=0.||reveal<=0.)return 0.;
   float r=length(p-rippleCenter),height=0.;
   for(int i=0;i<3;i++){
    float t=age-float(i)*.48;
    if(t>0.)height+=sin(r*10.-t*8.)*exp(-pow((r-t*1.5)*1.8,2.))*exp(-t*.65)*.045;
   }
   return height*power*reveal;
  }
 `;
 rippleMaterial.onBeforeCompile=shader=>{
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader=heightShader+'varying vec2 floorPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   floorPoint=position.xy;transformed.z+=floorHeight(position.xy);
  `);
  shader.fragmentShader=heightShader+'varying vec2 floorPoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <normal_fragment_begin>',`#include <normal_fragment_begin>
   float dx=(floorHeight(floorPoint+vec2(.015,0.))-floorHeight(floorPoint-vec2(.015,0.)))/.03;
   float dy=(floorHeight(floorPoint+vec2(0.,.015))-floorHeight(floorPoint-vec2(0.,.015)))/.03;
   // The floor is rotated -90 degrees about X; shade its moving slope in view space.
   normal=normalize(mat3(viewMatrix)*vec3(-dx,1.,dy));
  `);
 };
 rippleMaterial.customProgramCacheKey=()=> 'bankai-floor-ripples-v1';
 const startPosition=new THREE.Vector3(),startRotation=new THREE.Quaternion();
 const endPosition=new THREE.Vector3(),tip=new THREE.Vector3(.445,5.005,0);
 // Align the straight handle axis vertically; the curved tip remains naturally offset.
 const downRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
 const pivot=new THREE.Vector3(0,1.5,0),center=new THREE.Vector3(),temp=new THREE.Vector3();
 let active=false,time=0,contactTime=0,fallDistance=0,fallDuration=1;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function start(){
  active=true;time=0;sword.visible=true;floor.geometry=rippleGeometry;floor.material=rippleMaterial;
  startPosition.copy(sword.position);startRotation.copy(sword.quaternion);
  center.copy(pivot).applyQuaternion(startRotation).add(startPosition);
  endPosition.copy(center).sub(temp.copy(pivot).applyQuaternion(downRotation));
  temp.copy(tip).applyQuaternion(downRotation).add(endPosition);
  fallDistance=Math.max(.1,temp.y-waterY);fallDuration=Math.sqrt(2*fallDistance/9.8);
  contactTime=.65+fallDuration;
  formation.start(endPosition.x,endPosition.z);
  uniforms.rippleCenter.value.set(endPosition.x,-endPosition.z);uniforms.age.value=-1;uniforms.reveal.value=0;
  for(const [material,previous] of saved){material.clippingPlanes=[...(previous.planes??[]),plane];material.clipShadows=true;material.needsUpdate=true;}
 }
 function cancel(){
  if(!active)return;
  active=false;formation.hide();sword.visible=true;floor.geometry=originalGeometry;floor.material=originalMaterial;
  for(const [material,previous] of saved){material.clippingPlanes=previous.planes;material.clipShadows=previous.shadows;material.needsUpdate=true;}
  sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;
 }
 return {get active(){return active;},get glowing(){return formation.glowing;},start,cancel,
  update(dt:number,speed:number,intensity:number){
   if(!active)return;
   time+=dt*speed;if(reduced)time=contactTime+10.5;
   formation.update(time-contactTime-2.6,intensity);
   uniforms.power.value=Math.min(2,Math.max(0,intensity));
   uniforms.age.value=time-contactTime;
   uniforms.reveal.value=THREE.MathUtils.smoothstep(time,.2,contactTime)*(1-THREE.MathUtils.smoothstep(time,contactTime+3,contactTime+5));
   if(time<.65){
    const turn=THREE.MathUtils.smoothstep(time,0,.65);
    sword.quaternion.slerpQuaternions(startRotation,downRotation,turn);
    sword.position.copy(center).sub(temp.copy(pivot).applyQuaternion(sword.quaternion));
   }else{
    sword.quaternion.copy(downRotation);sword.position.copy(endPosition);
    const falling=Math.min(fallDuration,time-.65);
    let depth=.5*9.8*falling*falling;
    if(time>=contactTime){
     const t=Math.min(3,time-contactTime);
     // Water slows the fall continuously, then draws the entire hilt below the surface.
     const entrySpeed=9.8*fallDuration;
     depth=fallDistance+2.7*t+(entrySpeed-2.7)*(1-Math.exp(-3*t))/3;
    }
    sword.position.y-=depth;
   }
   const visible=time<contactTime+2.9;
   if(sword.visible!==visible){sword.visible=visible;sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;}
  },dispose(){cancel();formation.dispose();rippleGeometry.dispose();rippleMaterial.dispose();}
 };
}
