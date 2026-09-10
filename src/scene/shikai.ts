import * as THREE from 'three';
import type {EffectMode} from './aura';
import {KATANA_RADIUS} from './senbonzakura';

export function createShikai(sword:THREE.Group){
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
 const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.42,metalness:.12,side:THREE.DoubleSide,emissive:0xff71ad,emissiveIntensity:.55});
 const count=3000,petals=new THREE.InstancedMesh(geometry,material,count);petals.instanceMatrix.setUsage(THREE.DynamicDrawUsage);petals.frustumCulled=false;petals.visible=false;sword.add(petals);
 let seed=391;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const samples=Array.from({length:count},(_,i)=>{
  const y=.16+random()*4.85,angle=y/KATANA_RADIUS,x=(random()-.5)*.19,z=(random()<.5?-1:1)*.025;
  petals.setColorAt(i,new THREE.Color().setRGB(1,.35+random()*.45,.60+random()*.32));
  return {y,origin:new THREE.Vector3(KATANA_RADIUS*(1-Math.cos(angle))+x*Math.cos(angle),KATANA_RADIUS*Math.sin(angle)-x*Math.sin(angle),z),phase:random()*Math.PI*2,launch:.9+Math.pow(random(),.65)*2.4,drag:.22+random()*.35,lift:(random()-.5)*1.6,wander:random()*Math.PI*2,offset:new THREE.Vector3(),velocity:new THREE.Vector3(),rotation:new THREE.Vector3(),home:new THREE.Vector3(),released:false,returning:false,returnStart:0,age:0,size:.025+Math.pow(random(),2)*.085,spin:new THREE.Vector3((random()-.5)*2.4,(random()-.5)*2.8,(random()-.5)*2)};
 });
 const dummy=new THREE.Object3D(),light=new THREE.PointLight(0xff86c6,0,7,2);light.position.set(0,1,.5);sword.add(light);
 let active=false,speed=1,intensity=1,time=0,progress=0;
 const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 return {get visible(){return progress>0;},configure(mode:EffectMode,nextSpeed:number,nextIntensity:number){active=mode==='shikai';speed=nextSpeed;intensity=nextIntensity;},
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
   if(!petals.visible){for(const p of samples){p.released=false;p.returning=false;}return;}
   const duration=reduced?0:Math.min(.3,step);
   const visibleCount=Math.min(count,Math.round(count*Math.min(1,intensity/2)));petals.count=visibleCount;
   for(let i=0;i<visibleCount;i++){
    const p=samples[i],release=(5.02-p.origin.y)/5.02;
    if(progress>release&&!p.released&&target===1){
     p.released=true;p.age=0;p.offset.set(0,0,0);
     p.velocity.set(Math.cos(p.phase)*p.launch,p.lift*p.launch*.6,Math.sin(p.phase)*p.launch);
     p.rotation.set(p.phase,p.phase*.6,p.phase*.3);
    }
    if(p.released){
     if(target===0){
      if(!p.returning){p.returning=true;p.returnStart=previous;p.home.copy(p.offset);}
      const fraction=THREE.MathUtils.smoothstep(progress,0,Math.max(.001,p.returnStart));
      p.offset.copy(p.home).multiplyScalar(fraction);
     }else{
      p.returning=false;
      // Release during the frame at the same front used by the blade shader.
      const flightStep=previous<=release&&progress>previous?duration*(progress-release)/(progress-previous):duration;
      const steps=Math.max(1,Math.ceil(flightStep*60)),h=flightStep/steps;
      if(reduced){p.offset.set(Math.cos(p.phase)*p.launch*2,p.launch-.3,Math.sin(p.phase)*p.launch*2);p.age=1;}
      else for(let tick=0;tick<steps;tick++){
       p.age+=h;
       const t=time-flightStep+(tick+1)*h;
       const x=p.origin.x+p.offset.x,y=p.origin.y+p.offset.y,z=p.offset.z;
       // Gentle common gusts plus individual slip prevent a coherent beam.
       // The launch momentum disperses freely; no surrounding shape attracts petals.
       const windX=.65*Math.cos(p.phase)+.45*Math.sin(y*.6+t*.45)+.35*Math.sin(t*.65+p.wander);
       const windY=p.lift*.4+.3*Math.sin(x*.7-z*.45+t*.32+p.wander);
       const windZ=.65*Math.sin(p.phase)+.4*Math.sin(x*.55-t*.38)+.3*Math.sin(t*.53+p.wander);
       const response=1-Math.exp(-p.drag*h);
       p.velocity.x+=(windX-p.velocity.x)*response;
       p.velocity.y+=(windY-p.velocity.y)*response;
       p.velocity.z+=(windZ-p.velocity.z)*response;
       p.offset.addScaledVector(p.velocity,h);
       const flutter=Math.sin(p.age*(2.1+p.drag)+p.phase);
       p.rotation.x+=(p.spin.x+flutter*.5)*h;
       p.rotation.y+=(p.spin.y+windZ*.4)*h;
       p.rotation.z+=(p.spin.z+windX*.4)*h;
      }
     }
    }
    dummy.position.copy(p.origin).add(p.offset);
    dummy.rotation.set(p.rotation.x,p.rotation.y,p.rotation.z);
    const birth=THREE.MathUtils.smoothstep(p.age,0,.12);
    const visibility=target===0?THREE.MathUtils.smoothstep(progress,release,Math.min(1,release+.06)):birth;
    dummy.scale.set(p.size*(.65+.35*Math.sin(p.phase)),p.size,p.size).multiplyScalar(p.released?visibility:0);
    dummy.updateMatrix();petals.setMatrixAt(i,dummy.matrix);
   }
   petals.instanceMatrix.needsUpdate=true;
  },dispose(){depth.dispose();petals.dispose();}
 };
}
