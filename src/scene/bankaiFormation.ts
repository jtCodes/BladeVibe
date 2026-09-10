import * as THREE from 'three';
import {FLOOR_Y} from './swordPhysics';

const HEIGHT=12,PAIRS=24,BLADES=PAIRS*2;
const RISE_STAGGER=.1,DISSOLVE_STAGGER=.22;
const RISE_END=(PAIRS-1)*RISE_STAGGER+2.1;
const DISSOLVE_AT=RISE_END+1.1,DISSOLVE_DURATION=1.9;
const DISSOLVE_END=DISSOLVE_AT+(PAIRS-1)*DISSOLVE_STAGGER+DISSOLVE_DURATION;
// Match the surface breakup field on the CPU so particles leave only removed steel.
function breakupThreshold(p:THREE.Vector3,delay:number){
 const seed=delay*12.;
 const noise=.065*Math.sin(p.x*18.+p.y*5.+seed)
  +.035*Math.sin(p.z*42.-p.y*13.+p.x*9.)
  +.018*Math.sin(p.x*61.+p.y*31.+seed);
 return THREE.MathUtils.clamp(1-p.y/HEIGHT+noise,.003,.997);
}

export function createBankaiFormation(scene:THREE.Scene,sword:THREE.Group){
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const clock={value:-1};
 const source=sword.getObjectByName('senbonzakura-blade') as THREE.Mesh;
 // Clone the authored blade, retaining its curve, tip, bevels, UVs and material groups.
 const geometry=source.geometry.clone();geometry.computeBoundingBox();
 const enlargement=HEIGHT/geometry.boundingBox!.max.y;
 geometry.scale(enlargement,enlargement,enlargement);
 const sourceMaterials=Array.isArray(source.material)?source.material:[source.material];
 const materials=sourceMaterials.map(sourceMaterial=>sourceMaterial.clone());
 const delays=new Float32Array(BLADES);
 for(let i=0;i<BLADES;i++)delays[i]=(PAIRS-1-Math.floor(i/2))*RISE_STAGGER;
 geometry.setAttribute('bladeDelay',new THREE.InstancedBufferAttribute(delays,1));
 for(let index=0;index<materials.length;index++){
 const material=materials[index],original=sourceMaterials[index];
 const inherit=original.onBeforeCompile.bind(original),baseKey=original.customProgramCacheKey();
 material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),-FLOOR_Y)];
 material.onBeforeCompile=(shader,renderer)=>{
  // Preserve the source steel and hamon shader. Its Shikai dissolve is reset before Bankai.
  inherit(shader,renderer);
  shader.uniforms.formationTime=clock;
  shader.vertexShader='attribute float bladeDelay;varying float bladeHeight;varying float rowDelay;varying vec3 breakupPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   bladeHeight=position.y/${HEIGHT.toFixed(1)};rowDelay=bladeDelay;breakupPoint=position;
  `);
  shader.fragmentShader='uniform float formationTime;varying float bladeHeight;varying float rowDelay;varying vec3 breakupPoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float dissolve=clamp((formationTime-${DISSOLVE_AT}-rowDelay*${DISSOLVE_STAGGER/RISE_STAGGER})/${DISSOLVE_DURATION},0.,1.);
   float breakupSeed=rowDelay*12.;
   float breakupNoise=.065*sin(breakupPoint.x*18.+breakupPoint.y*5.+breakupSeed)
    +.035*sin(breakupPoint.z*42.-breakupPoint.y*13.+breakupPoint.x*9.)
    +.018*sin(breakupPoint.x*61.+breakupPoint.y*31.+breakupSeed);
   float threshold=clamp(1.-bladeHeight+breakupNoise,.003,.997);
   if(dissolve>=threshold)discard;
   float pink=smoothstep(0.,.04,dissolve)*(1.-smoothstep(0.,.065,threshold-dissolve));
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <metalnessmap_fragment>',`#include <metalnessmap_fragment>
   diffuseColor.rgb=mix(diffuseColor.rgb,vec3(1.,.34,.64),pink);
   metalnessFactor=mix(metalnessFactor,.2,pink);
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   float whiteCore=pow(pink,4.);
   totalEmissiveRadiance+=vec3(3.,.35,1.5)*pink+vec3(7.,3.5,5.)*whiteCore;
  `);
 };
 material.customProgramCacheKey=()=>baseKey+'-bankai-matching-row-ragged-v2';
 }
 const blades=new THREE.InstancedMesh(geometry,materials,BLADES);blades.frustumCulled=false;
 blades.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(blades);
 const dummy=new THREE.Object3D();
 const placement=Array.from({length:BLADES},(_,i)=>({side:i%2===0?-1:1,z:2-Math.floor(i/2)*2.05,delay:delays[i]}));

 const outline=new THREE.Shape();outline.moveTo(0,-.5);outline.bezierCurveTo(-.45,-.18,-.48,.3,-.18,.5);
 outline.quadraticCurveTo(-.07,.55,0,.37);outline.quadraticCurveTo(.1,.55,.22,.46);outline.bezierCurveTo(.47,.2,.34,-.22,0,-.5);
 const petalGeometry=new THREE.ShapeGeometry(outline,4),points=petalGeometry.getAttribute('position');
 for(let i=0;i<points.count;i++){const x=points.getX(i),y=points.getY(i);points.setZ(i,.22*x*x+.1*y*y+.05*Math.sin(y*5));}
 petalGeometry.computeVertexNormals();
 const COUNT=12000;
 const origins=new Float32Array(COUNT*3),velocities=new Float32Array(COUNT*3),spins=new Float32Array(COUNT*3);
 const releases=new Float32Array(COUNT),sizes=new Float32Array(COUNT),phases=new Float32Array(COUNT);
 let seed=9721;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 // Area-weighted sampling uses the same triangles that are actually rendered.
 const vertices=geometry.getAttribute('position'),triangleIndex=geometry.index!;
 const cumulative:number[]=[];let area=0;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
 for(let i=0;i<triangleIndex.count;i+=3){
  a.fromBufferAttribute(vertices,triangleIndex.getX(i));b.fromBufferAttribute(vertices,triangleIndex.getX(i+1));c.fromBufferAttribute(vertices,triangleIndex.getX(i+2));
  area+=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()*.5;cumulative.push(area);
 }
 const sampleSurface=()=>{
  const pick=random()*area;let low=0,high=cumulative.length-1;
  while(low<high){const mid=(low+high)>>1;if(cumulative[mid]<pick)low=mid+1;else high=mid;}
  const triangle=low*3;
  a.fromBufferAttribute(vertices,triangleIndex.getX(triangle));b.fromBufferAttribute(vertices,triangleIndex.getX(triangle+1));c.fromBufferAttribute(vertices,triangleIndex.getX(triangle+2));
  const root=Math.sqrt(random()),v=random();
  return a.clone().multiplyScalar(1-root).addScaledVector(b,root*(1-v)).addScaledVector(c,root*v);
 };
 for(let i=0;i<COUNT;i++){
  // Interleave the rows so every blade emits at all intensity levels.
  const row=placement[i%BLADES];let p=sampleSurface();
  while(p.y<=0)p=sampleSurface();
  const releaseThreshold=breakupThreshold(p,row.delay);
  const y=p.y,mirror=-row.side;p.x*=mirror;p.z*=mirror;
  origins.set([row.side*4.3+p.x,FLOOR_Y+y,row.z+p.z],i*3);
  const angle=random()*Math.PI*2,launch=.7+random()*2;
  velocities.set([Math.cos(angle)*launch-row.side*.65,(random()-.5)*1.6,Math.sin(angle)*launch],i*3);
  spins.set([(random()-.5)*3,(random()-.5)*4,(random()-.5)*3],i*3);
  releases[i]=DISSOLVE_AT+row.delay*(DISSOLVE_STAGGER/RISE_STAGGER)+DISSOLVE_DURATION*releaseThreshold;
  sizes[i]=.055+Math.pow(random(),2)*.16;phases[i]=random()*Math.PI*2;
 }
 for(const [name,array,size] of [['petalOrigin',origins,3],['petalVelocity',velocities,3],['petalSpin',spins,3],['petalRelease',releases,1],['petalSize',sizes,1],['petalPhase',phases,1]] as const){
  petalGeometry.setAttribute(name,new THREE.InstancedBufferAttribute(array,size));
 }
 const petalMaterial=new THREE.MeshStandardMaterial({color:0xffa8d1,metalness:.08,roughness:.45,
  emissive:0xff5baf,emissiveIntensity:1.1,side:THREE.DoubleSide});
 petalMaterial.onBeforeCompile=shader=>{
  shader.uniforms.formationTime=clock;
  shader.vertexShader=`uniform float formationTime;
   attribute vec3 petalOrigin;attribute vec3 petalVelocity;attribute vec3 petalSpin;
   attribute float petalRelease;attribute float petalSize;attribute float petalPhase;
   vec3 tumble(vec3 p,vec3 a){
    p.yz=mat2(cos(a.x),sin(a.x),-sin(a.x),cos(a.x))*p.yz;
    p.xz=mat2(cos(a.y),sin(a.y),-sin(a.y),cos(a.y))*p.xz;
    p.xy=mat2(cos(a.z),sin(a.z),-sin(a.z),cos(a.z))*p.xy;return p;
   }
  `+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>',`#include <beginnormal_vertex>
   float flight=max(0.,formationTime-petalRelease);
   vec3 angles=petalSpin*flight+vec3(petalPhase);
   objectNormal=tumble(objectNormal,angles);
  `);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float birth=smoothstep(0.,.12,flight);
   float coast=(1.-exp(-flight*.24))/.24;
   vec3 drift=petalVelocity*coast;
   drift+=vec3(sin(flight*.6+petalPhase)-sin(petalPhase),sin(flight*.4+petalPhase)-sin(petalPhase),cos(flight*.53+petalPhase)-cos(petalPhase))*.55;
   drift+=petalVelocity*flight*.12;
   transformed=petalOrigin+drift+tumble(position*petalSize*birth,angles);
  `);
 };
 petalMaterial.customProgramCacheKey=()=> 'bankai-row-petals-v1';
 const petals=new THREE.InstancedMesh(petalGeometry,petalMaterial,COUNT);petals.frustumCulled=false;petals.visible=false;
 const identity=new THREE.Matrix4();for(let i=0;i<COUNT;i++)petals.setMatrixAt(i,identity);petals.instanceMatrix.needsUpdate=true;group.add(petals);
 // A separate fine layer gives depth between the larger, cupped petals.
 const DUST_COUNT=COUNT*2,dustPositions=new Float32Array(DUST_COUNT*3),dustVelocity=new Float32Array(DUST_COUNT*3),dustRelease=new Float32Array(DUST_COUNT),dustPhase=new Float32Array(DUST_COUNT);
 for(let i=0;i<DUST_COUNT;i++){
  const source=i%COUNT;
  dustPositions.set(origins.subarray(source*3,source*3+3),i*3);
  dustVelocity.set([velocities[source*3]*.65+(random()-.5),.2+random()*.8,velocities[source*3+2]*.65+(random()-.5)],i*3);
  dustRelease[i]=releases[source];dustPhase[i]=random()*Math.PI*2;
 }
 const dustGeometry=new THREE.BufferGeometry();
 dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
 dustGeometry.setAttribute('drift',new THREE.BufferAttribute(dustVelocity,3));
 dustGeometry.setAttribute('releaseAt',new THREE.BufferAttribute(dustRelease,1));
 dustGeometry.setAttribute('phase',new THREE.BufferAttribute(dustPhase,1));
 const dustMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{formationTime:clock},
  vertexShader:`uniform float formationTime;attribute vec3 drift;attribute float releaseAt;attribute float phase;varying float glow;
   void main(){float age=max(0.,formationTime-releaseAt);
    float coast=(1.-exp(-age*.2))/.2;
    vec3 p=position+drift*coast;
    p.x+=.45*(sin(age*.8+phase)-sin(phase));
    p.y-=.065*age*age;
    p.z+=.4*(cos(age*.7+phase)-cos(phase));
    vec4 view=modelViewMatrix*vec4(p,1.);
    glow=smoothstep(0.,.1,age)*exp(-age*.12)*(.55+.45*pow(sin(age*2.+phase),2.));
    gl_Position=projectionMatrix*view;
    gl_PointSize=clamp(65./max(1.,-view.z),1.,3.5);
   }`,
  fragmentShader:`varying float glow;
   void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||glow<.001)discard;
    float core=exp(-r*r*8.);
    gl_FragColor=vec4(mix(vec3(1.,.25,.65),vec3(2.,1.2,1.6),core),core*glow*.8);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;dust.visible=false;group.add(dust);
 const glowLights=[0,-12,-26].map(z=>{const light=new THREE.PointLight(0xff7ac4,0,16,2);light.position.set(0,2,z);group.add(light);return light;});
 let lastTime=-1;
 return {
  get glowing(){return group.visible&&clock.value>DISSOLVE_AT;},
  start(x:number,z:number){group.position.set(x,0,z);group.visible=false;lastTime=-1;clock.value=-1;},
  hide(){group.visible=false;},
  update(time:number,intensity:number){
   group.visible=time>=0;if(!group.visible)return;
   clock.value=time;
   if(time!==lastTime&&(lastTime<RISE_END||time<RISE_END)){
    for(let i=0;i<BLADES;i++){
     const p=placement[i],rise=THREE.MathUtils.smoothstep(time,p.delay,p.delay+2.1);
     dummy.position.set(p.side*4.3,FLOOR_Y-(1-rise)*(HEIGHT+.05),p.z);
     dummy.rotation.set(0,p.side===-1?0:Math.PI,0);dummy.scale.setScalar(1);dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);
    }
    blades.instanceMatrix.needsUpdate=true;
   }
   blades.visible=time<DISSOLVE_END;
   petals.visible=time>DISSOLVE_AT&&intensity>0;petals.count=Math.round(COUNT*Math.min(1,Math.max(0,intensity)/2));
   dust.visible=petals.visible;dustGeometry.setDrawRange(0,Math.round(DUST_COUNT*Math.min(1,Math.max(0,intensity)/2)));
   const glow=THREE.MathUtils.smoothstep(time,DISSOLVE_AT,DISSOLVE_AT+.7)*(1-THREE.MathUtils.smoothstep(time,DISSOLVE_END,DISSOLVE_END+3));
   for(const light of glowLights)light.intensity=glow*Math.min(2,Math.max(0,intensity))*2.2;
   lastTime=time;
  },
  dispose(){group.removeFromParent();blades.dispose();petals.dispose();geometry.dispose();for(const material of materials)material.dispose();petalGeometry.dispose();petalMaterial.dispose();dustGeometry.dispose();dustMaterial.dispose();}
 };
}
