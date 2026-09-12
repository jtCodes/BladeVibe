import {bend} from './katanaGeometry';
import {SENBONZAKURA_BLADE_LENGTH} from './senbonzakuraDimensions';
import {createBankaiFormation} from './bankaiFormation';
import * as THREE from 'three';
import {FLOOR_Y} from './swordPhysics';

// A cinematic release owns the displayed pose while ordinary drop physics is paused.
export function createBankai(sword:THREE.Group,floor:THREE.Mesh,scene:THREE.Scene){
 const formation=createBankaiFormation(scene,sword);
 const waterY=FLOOR_Y+.002;
 // Retain one shader layout in both forms; only the plane's uniform moves.
 const inactivePlaneDistance=1e6;
 const plane=new THREE.Plane(new THREE.Vector3(0,1,0),inactivePlaneDistance);
 const saved=new Map<THREE.Material,{planes:THREE.Plane[]|null;shadows:boolean}>();
 sword.traverse(object=>{
  if(!(object instanceof THREE.Mesh))return;
  for(const material of [...(Array.isArray(object.material)?object.material:[object.material]),object.customDepthMaterial,object.customDistanceMaterial]){
   if(material&&!saved.has(material))saved.set(material,{planes:material.clippingPlanes,shadows:material.clipShadows});
  }
 });
 for(const [material,previous] of saved){
  material.clippingPlanes=[...(previous.planes??[]),plane];material.clipShadows=true;material.needsUpdate=true;
 }
 const uniforms={age:{value:-1},reveal:{value:0},power:{value:1},rippleCenter:{value:new THREE.Vector2()}};
 const originalGeometry=floor.geometry,originalMaterial=floor.material;
 const rippleMaterial=(floor.material as THREE.MeshStandardMaterial).clone();
 // Keep live floor-color edits through the ripple and restoration.
 rippleMaterial.color=(originalMaterial as THREE.MeshStandardMaterial).color;
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
 const endPosition=new THREE.Vector3(),tip=bend(.095*.78,SENBONZAKURA_BLADE_LENGTH,0);
 // Align the straight handle axis vertically; the curved tip remains naturally offset.
 const downRotation=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1),Math.PI);
 const pivot=new THREE.Vector3(0,1.5,0),center=new THREE.Vector3(),temp=new THREE.Vector3();
 let active=false,time=0,furthestTime=0,contactTime=0,fallDistance=0,fallDuration=1;
 let intensity=1,petalGlow=4,manualTimeline=false;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 function releasePose(position:THREE.Vector3,rotation:THREE.Quaternion){
  const releaseCenter=pivot.clone().applyQuaternion(rotation).add(position);
  const releasePosition=releaseCenter.clone().sub(pivot.clone().applyQuaternion(downRotation));
  const releaseTip=tip.clone().applyQuaternion(downRotation).add(releasePosition);
  const distance=Math.max(.1,releaseTip.y-waterY),duration=Math.sqrt(2*distance/9.8);
  return {center:releaseCenter,position:releasePosition,distance,duration,contactTime:.65+duration};
 }
 function start(){
  active=true;time=0;furthestTime=0;manualTimeline=false;sword.visible=true;floor.geometry=rippleGeometry;floor.material=rippleMaterial;
  startPosition.copy(sword.position);startRotation.copy(sword.quaternion);
  const pose=releasePose(startPosition,startRotation);
  center.copy(pose.center);endPosition.copy(pose.position);
  fallDistance=pose.distance;fallDuration=pose.duration;contactTime=pose.contactTime;
  formation.start(endPosition.x,endPosition.z);
  uniforms.rippleCenter.value.set(endPosition.x,-endPosition.z);uniforms.age.value=-1;uniforms.reveal.value=0;
  plane.constant=-waterY;
 }
 function cancel(){
  if(!active)return;
  active=false;formation.hide();sword.visible=true;floor.geometry=originalGeometry;floor.material=originalMaterial;
  plane.constant=inactivePlaneDistance;
  sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;
 }
 // All phase state derives from one clock, so scrubbing never needs to replay the drop.
 function render(previousTime:number){
   formation.update(time-contactTime-2.6,intensity,petalGlow);
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
   if(sword.visible!==visible||(time!==previousTime&&Math.min(time,previousTime)<contactTime+5)){
    sword.userData.shadowRevision=(sword.userData.shadowRevision??0)+1;
   }
   sword.visible=visible;furthestTime=Math.max(furthestTime,time);
 }
 async function warmup(renderFrame:()=>Promise<void>){
  if(active)return;
  const pose={position:sword.position.clone(),rotation:sword.quaternion.clone(),visible:sword.visible};
  const state={time,furthestTime,contactTime,fallDistance,fallDuration,manualTimeline,
   startPosition:startPosition.clone(),startRotation:startRotation.clone(),endPosition:endPosition.clone(),center:center.clone(),temp:temp.clone(),
   geometry:floor.geometry,material:floor.material,shadowRevision:sword.userData.shadowRevision,
   hadShadowRevision:Object.hasOwn(sword.userData,'shadowRevision'),age:uniforms.age.value,reveal:uniforms.reveal.value,power:uniforms.power.value,rippleCenter:uniforms.rippleCenter.value.clone()};
  try{
   start();
   // Warm clipped drop, overlapping lights, complete rows, and released particles.
   for(const sample of [0,contactTime+2.7,contactTime+2.6+4.5,contactTime+2.6+formation.duration]){
    const previous=time;time=sample;render(previous);await renderFrame();
   }
  }finally{
   cancel();
   sword.position.copy(pose.position);sword.quaternion.copy(pose.rotation);sword.visible=pose.visible;
   floor.geometry=state.geometry;floor.material=state.material;
   time=state.time;furthestTime=state.furthestTime;contactTime=state.contactTime;fallDistance=state.fallDistance;fallDuration=state.fallDuration;manualTimeline=state.manualTimeline;
   startPosition.copy(state.startPosition);startRotation.copy(state.startRotation);endPosition.copy(state.endPosition);center.copy(state.center);temp.copy(state.temp);
   uniforms.age.value=state.age;uniforms.reveal.value=state.reveal;uniforms.power.value=state.power;uniforms.rippleCenter.value.copy(state.rippleCenter);
   formation.update(-1,intensity,petalGlow);formation.start(endPosition.x,endPosition.z);
   if(state.hadShadowRevision)sword.userData.shadowRevision=state.shadowRevision;else delete sword.userData.shadowRevision;
  }
 }
 return {get formationOrigin(){return {x:endPosition.x,z:endPosition.z};},get active(){return active;},get glowing(){return formation.glowing;},get pinkGlow(){return formation.pinkGlow;},
  get time(){return time;},get cycleDuration(){return contactTime+2.6+formation.duration;},get duration(){return active?Math.max(contactTime+2.6+formation.duration,furthestTime):releasePose(sword.position,sword.quaternion).contactTime+2.6+formation.duration;},start,cancel,warmup,
  setPetalMotion:formation.setPetalMotion,
  seek(seconds:number){
   if(!Number.isFinite(seconds))return;
   if(!active)start();
   const previous=time;time=Math.max(0,seconds);manualTimeline=true;render(previous);
  },
  update(dt:number,speed:number,nextIntensity:number,nextPetalGlow=4){
   intensity=nextIntensity;petalGlow=nextPetalGlow;
   if(!active)return;
   const previous=time;time+=dt*speed;
   // An explicit inspection overrides reduced-motion skipping until the next release.
   if(reduced&&!manualTimeline&&dt>0)time=contactTime+10.5;
   render(previous);
  },dispose(){
   cancel();
   for(const [material,previous] of saved){material.clippingPlanes=previous.planes;material.clipShadows=previous.shadows;material.needsUpdate=true;}
   formation.dispose();rippleGeometry.dispose();rippleMaterial.dispose();
  }
 };
}
