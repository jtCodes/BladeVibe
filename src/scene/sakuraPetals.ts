import {PETAL_STORM_GLSL,type BankaiPetalMotion} from './bankaiPetalMotion';
import * as THREE from 'three';
import type {SakuraParticleData} from './sakuraParticleData';

// Each effect owns its geometry so its existing disposal and attributes stay independent.
export function createSakuraPetalGeometry(segments:number){
 const outline=new THREE.Shape();outline.moveTo(0,-.5);
 outline.bezierCurveTo(-.45,-.18,-.48,.3,-.18,.5);
 outline.quadraticCurveTo(-.07,.55,0,.37);
 outline.quadraticCurveTo(.1,.55,.22,.46);
 outline.bezierCurveTo(.47,.2,.34,-.22,0,-.5);
 const geometry=new THREE.ShapeGeometry(outline,segments),points=geometry.getAttribute('position');
 for(let i=0;i<points.count;i++){
  const x=points.getX(i),y=points.getY(i);
  points.setZ(i,.22*x*x+.1*y*y+.05*Math.sin(y*5));
 }
 geometry.computeVertexNormals();return geometry;
}

export function createSakuraRandom(seed:number){
 return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
}

export function createSakuraParticles(data:SakuraParticleData,clock:THREE.IUniform<number>){
 const {origins,velocities,spins,releases,sizes,phases}=data,COUNT=sizes.length;
 const petalStorm={value:0},petalCamera={value:new THREE.Vector3()},inverseWorld=new THREE.Matrix4();
 const petalGeometry=createSakuraPetalGeometry(4);
 for(const [name,array,size] of [['petalOrigin',origins,3],['petalVelocity',velocities,3],['petalSpin',spins,3],['petalRelease',releases,1],['petalSize',sizes,1],['petalPhase',phases,1]] as const){
  petalGeometry.setAttribute(name,new THREE.InstancedBufferAttribute(array,size));
 }
 const petalMaterial=new THREE.MeshStandardMaterial({color:0xffc6e6,metalness:.08,roughness:.45,
  emissive:0xff91d3,emissiveIntensity:4,side:THREE.DoubleSide});
 petalMaterial.onBeforeCompile=shader=>{
  shader.uniforms.formationTime=clock;shader.uniforms.petalStorm=petalStorm;shader.uniforms.petalCamera=petalCamera;
  shader.vertexShader=PETAL_STORM_GLSL+`uniform float formationTime;
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
   vec3 angles=petalSpin*flight*mix(1.,2.4,petalStorm)+vec3(petalPhase);
   objectNormal=tumble(objectNormal,angles);
  `);
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   float birth=smoothstep(0.,.06,flight);
   // Reach the existing spread sooner, beginning at each petal's surface release.
   float coast=(1.-exp(-flight*.55))/.24;
   vec3 drift=petalVelocity*coast;
   drift+=vec3(sin(flight*.6+petalPhase)-sin(petalPhase),sin(flight*.4+petalPhase)-sin(petalPhase),cos(flight*.53+petalPhase)-cos(petalPhase))*.55;
   drift+=petalVelocity*flight*.12;
   transformed=applyPetalStorm(petalOrigin,petalOrigin+drift,flight,petalPhase)+tumble(position*petalSize*birth,angles);
  `);
 };
 petalMaterial.customProgramCacheKey=()=> 'sakura-petals-motion-variants-v5';
 const petals=new THREE.InstancedMesh(petalGeometry,petalMaterial,COUNT);petals.frustumCulled=false;petals.visible=false;
 // A separate fine layer gives depth between the larger, cupped petals.
 const DUST_COUNT=COUNT*2,{dustPositions,dustVelocity,dustRelease,dustPhase}=data;
 const dustGeometry=new THREE.BufferGeometry();
 dustGeometry.setAttribute('position',new THREE.BufferAttribute(dustPositions,3));
 dustGeometry.setAttribute('drift',new THREE.BufferAttribute(dustVelocity,3));
 dustGeometry.setAttribute('releaseAt',new THREE.BufferAttribute(dustRelease,1));
 dustGeometry.setAttribute('phase',new THREE.BufferAttribute(dustPhase,1));
 const dustMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{formationTime:clock,petalStorm,petalCamera},
  vertexShader:PETAL_STORM_GLSL+`uniform float formationTime;attribute vec3 drift;attribute float releaseAt;attribute float phase;varying float glow;
   void main(){float age=max(0.,formationTime-releaseAt);
    float coast=(1.-exp(-age*.46))/.2;
    vec3 p=position+drift*coast;
    p.x+=.45*(sin(age*.8+phase)-sin(phase));
    p.y-=.065*age*age;
    p.z+=.4*(cos(age*.7+phase)-cos(phase));
    p=applyPetalStorm(position,p,age,phase);
    vec4 view=modelViewMatrix*vec4(p,1.);
    glow=smoothstep(0.,.1,age)*exp(-age*.12)*(.55+.45*pow(sin(age*2.+phase),2.));
    gl_Position=projectionMatrix*view;
    gl_PointSize=clamp(65./max(1.,-view.z),1.,3.5);
   }`,
  fragmentShader:`varying float glow;
   void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||glow<.001)discard;
    float core=exp(-r*r*8.);
    gl_FragColor=vec4(mix(vec3(1.,.38,.78),vec3(2.,1.65,1.9),core),core*glow*.8);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
   }`});
 const dust=new THREE.Points(dustGeometry,dustMaterial);dust.frustumCulled=false;dust.visible=false;

 // Resolve the current camera in formation space for both render paths.
 for(const mesh of [petals,dust])mesh.onBeforeRender=(_renderer,_scene,camera)=>{
  camera.getWorldPosition(petalCamera.value);inverseWorld.copy(mesh.matrixWorld).invert();petalCamera.value.applyMatrix4(inverseWorld);
 };
 return {petals,dust,setMotion(variant:BankaiPetalMotion){petalStorm.value=variant==='storm'?1:0;},
  update(intensity:number,emission:number,visible:boolean){
   petals.visible=visible&&intensity>0;dust.visible=petals.visible;
   petals.count=Math.round(COUNT*Math.min(1,Math.max(0,intensity)/2));
   dustGeometry.setDrawRange(0,Math.round(DUST_COUNT*Math.min(1,Math.max(0,intensity)/2)));
   petalMaterial.emissiveIntensity=emission;
  },
  dispose(){petals.removeFromParent();dust.removeFromParent();petals.dispose();petalGeometry.dispose();petalMaterial.dispose();dustGeometry.dispose();dustMaterial.dispose();}
 };
}

export function createSakuraSurfaceSampler(geometry:THREE.BufferGeometry,random:()=>number){
 // Area-weighted sampling uses the same triangles that are actually rendered.
 const vertices=geometry.getAttribute('position'),triangleIndex=geometry.index!;
 const cumulative:number[]=[];let area=0;
 const a=new THREE.Vector3(),b=new THREE.Vector3(),c=new THREE.Vector3(),ab=new THREE.Vector3(),ac=new THREE.Vector3();
 for(let i=0;i<triangleIndex.count;i+=3){
  a.fromBufferAttribute(vertices,triangleIndex.getX(i));b.fromBufferAttribute(vertices,triangleIndex.getX(i+1));c.fromBufferAttribute(vertices,triangleIndex.getX(i+2));
  area+=ab.subVectors(b,a).cross(ac.subVectors(c,a)).length()*.5;cumulative.push(area);
 }
 return ()=>{
  const pick=random()*area;let low=0,high=cumulative.length-1;
  while(low<high){const mid=(low+high)>>1;if(cumulative[mid]<pick)low=mid+1;else high=mid;}
  const triangle=low*3;
  a.fromBufferAttribute(vertices,triangleIndex.getX(triangle));b.fromBufferAttribute(vertices,triangleIndex.getX(triangle+1));c.fromBufferAttribute(vertices,triangleIndex.getX(triangle+2));
  const root=Math.sqrt(random()),v=random();
  return a.clone().multiplyScalar(1-root).addScaledVector(b,root*(1-v)).addScaledVector(c,root*v);
 };
}
