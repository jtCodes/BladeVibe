import {createSakuraParticles,createSakuraSurfaceSampler,createSakuraRandom} from './sakuraPetals';
import {petalBreakup,PETAL_BREAKUP_GLSL} from './petalBreakup';
import {addSakuraGlow,addSakuraSurfaceTransition,sakuraPinkBuild} from './sakuraGlow';
import * as THREE from 'three';
import {FLOOR_Y} from './swordPhysics';

const HEIGHT=12,PAIRS=24,BLADES=PAIRS*2;
const RISE_STAGGER=.1,DISSOLVE_WINDOW=.65;
const RISE_END=(PAIRS-1)*RISE_STAGGER+2.1;
const DISSOLVE_AT=RISE_END+1.1,DISSOLVE_DURATION=1.9;
const DISSOLVE_END=DISSOLVE_AT+DISSOLVE_WINDOW+DISSOLVE_DURATION;
// Match the surface breakup field on the CPU so particles leave only removed steel.
function breakupThreshold(p:THREE.Vector3,delay:number){
 const noise=petalBreakup(p.x,p.y,delay);
 return THREE.MathUtils.clamp(1-p.y/HEIGHT+noise,.003,.997);
}

export function createBankaiFormation(scene:THREE.Scene,sword:THREE.Group){
 const group=new THREE.Group();group.visible=false;scene.add(group);
 const clock={value:-1},formationPower={value:1};
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
 // Compress the front rows together while preserving the back-to-front order.
 // Share these exact times with particle emission so petals stay attached until release.
 const dissolveDelays=Float32Array.from(delays,delay=>{
  const depth=delay/((PAIRS-1)*RISE_STAGGER);
  return DISSOLVE_WINDOW*(1-Math.pow(1-depth,2));
 });
 geometry.setAttribute('bladeDissolveDelay',new THREE.InstancedBufferAttribute(dissolveDelays,1));
 for(let index=0;index<materials.length;index++){
 const material=materials[index],original=sourceMaterials[index];
 // Give the enlarged formation its own steel response instead of a near-white face.
 if(material instanceof THREE.MeshStandardMaterial){
  material.color.set(index===0?0x87939f:0x596672);
  material.roughness=index===0?.46:.56;material.metalness=.82;
  material.envMapIntensity=.6;
 }
 const inherit=original.onBeforeCompile.bind(original),baseKey=original.customProgramCacheKey();
 material.clippingPlanes=[new THREE.Plane(new THREE.Vector3(0,1,0),-FLOOR_Y)];
 material.onBeforeCompile=(shader,renderer)=>{
  // Preserve the source steel and hamon shader. Its Shikai dissolve is reset before Bankai.
  inherit(shader,renderer);addSakuraGlow(shader);
  shader.uniforms.formationTime=clock;shader.uniforms.formationPower=formationPower;
  shader.vertexShader='varying float bladeWidth;attribute float bladeDelay;attribute float bladeDissolveDelay;varying float dissolveDelay;varying float bladeHeight;varying float rowDelay;varying vec3 breakupPoint;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
   bladeWidth=uv.x;bladeHeight=position.y/${HEIGHT.toFixed(1)};rowDelay=bladeDelay;dissolveDelay=bladeDissolveDelay;breakupPoint=position;
  `);
  shader.fragmentShader=(shader.fragmentShader.includes('float petalPermute(')?'':PETAL_BREAKUP_GLSL)+'uniform float formationPower;varying float bladeWidth;uniform float formationTime;varying float dissolveDelay;varying float bladeHeight;varying float rowDelay;varying vec3 breakupPoint;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
   float dissolve=clamp((formationTime-${DISSOLVE_AT}-dissolveDelay)/${DISSOLVE_DURATION},0.,1.);
   float breakupNoise=petalBreakup(breakupPoint.xy,rowDelay);
   float threshold=clamp(1.-bladeHeight+breakupNoise,.003,.997);
   if(dissolve>=threshold)discard;
   float glowDistance=(threshold-dissolve)*5.02;
   float pink=sakuraTint(glowDistance,dissolve);
   // Build white emission as this blade extends, rather than flashing at first contact.
   float riseLight=smoothstep(rowDelay,rowDelay+2.1,formationTime);
   float colorShift=smoothstep(${DISSOLVE_AT} + dissolveDelay-.85,${DISSOLVE_AT} + dissolveDelay+.05,formationTime);
  `);
  addSakuraSurfaceTransition(shader,'pink','','diffuseColor.rgb*=mix(.48,1.,smoothstep(0.,.85,breakupPoint.y));');
  // Apply after the inherited hamon roughness so broad studio highlights retain gradation.
  shader.fragmentShader=shader.fragmentShader.replace('#include <lights_physical_fragment>',`
   roughnessFactor=max(roughnessFactor,.46);
   #include <lights_physical_fragment>
  `);
  shader.fragmentShader=shader.fragmentShader.replace('#include <emissivemap_fragment>',`#include <emissivemap_fragment>
   // Bright edges surround a shaded steel center, rather than bleaching the full face.
   totalEmissiveRadiance+=sakuraBladeEmission(bladeWidth,colorShift,riseLight,glowDistance,dissolve,pink)*formationPower;
  `);
 };
 material.customProgramCacheKey=()=>baseKey+'-bankai-progress-glow-v15';
 }
 const blades=new THREE.InstancedMesh(geometry,materials,BLADES);blades.frustumCulled=false;
 blades.instanceMatrix.setUsage(THREE.DynamicDrawUsage);group.add(blades);
 const dummy=new THREE.Object3D();
 const placement=Array.from({length:BLADES},(_,i)=>({side:i%2===0?-1:1,z:2-Math.floor(i/2)*2.05,delay:delays[i]}));
 // Soft contact occlusion anchors the roots without another shadow-map render.
 const contactGeometry=new THREE.PlaneGeometry(2.2,1.2);
 contactGeometry.setAttribute('riseDelay',new THREE.InstancedBufferAttribute(delays,1));
 contactGeometry.setAttribute('releaseDelay',new THREE.InstancedBufferAttribute(dissolveDelays,1));
 const contactMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,
  uniforms:{formationTime:clock},
  vertexShader:`attribute float riseDelay;attribute float releaseDelay;
   varying vec2 contactUV;varying float contactRise;varying float contactRelease;
   void main(){contactUV=uv;contactRise=riseDelay;contactRelease=releaseDelay;
    gl_Position=projectionMatrix*modelViewMatrix*instanceMatrix*vec4(position,1.);
   }`,
  fragmentShader:`uniform float formationTime;
   varying vec2 contactUV;varying float contactRise;varying float contactRelease;
   void main(){
    vec2 p=(contactUV-.5)*2.;float r=dot(p,p);
    float soft=exp(-r*4.5)*(1.-smoothstep(.5,1.,r));
    float core=exp(-dot(p*vec2(2.,3.),p*vec2(2.,3.))*4.);
    float rise=smoothstep(contactRise,contactRise+.45,formationTime);
    float gone=smoothstep(${DISSOLVE_AT}+contactRelease+${DISSOLVE_DURATION*.85},${DISSOLVE_AT}+contactRelease+${DISSOLVE_DURATION},formationTime);
    gl_FragColor=vec4(0.,0.,0.,min(.78,soft*.55+core*.28)*rise*(1.-gone));
   }`});
 const contacts=new THREE.InstancedMesh(contactGeometry,contactMaterial,BLADES);contacts.frustumCulled=false;
 for(let i=0;i<BLADES;i++){
  const p=placement[i];dummy.position.set(p.side*4.3,FLOOR_Y+.006,p.z);
  dummy.rotation.set(-Math.PI/2,0,0);dummy.scale.setScalar(1);dummy.updateMatrix();contacts.setMatrixAt(i,dummy.matrix);
 }
 contacts.instanceMatrix.needsUpdate=true;group.add(contacts);

 const COUNT=12000;
 const origins=new Float32Array(COUNT*3),velocities=new Float32Array(COUNT*3),spins=new Float32Array(COUNT*3);
 const releases=new Float32Array(COUNT),sizes=new Float32Array(COUNT),phases=new Float32Array(COUNT);
 const random=createSakuraRandom(9721);
 const sampleSurface=createSakuraSurfaceSampler(geometry,random);
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
  releases[i]=DISSOLVE_AT+dissolveDelays[i%BLADES]+DISSOLVE_DURATION*releaseThreshold;
  sizes[i]=.055+Math.pow(random(),2)*.16;phases[i]=random()*Math.PI*2;
 }
 const particles=createSakuraParticles({origins,velocities,spins,releases,sizes,phases},clock,random);
 group.add(particles.petals,particles.dust);
 // Overlapping omnidirectional emitters approximate spill from each section of the rows.
 // No emitter plane or distance cutoff can stamp a straight boundary onto the floor.
 const spillPink=new THREE.Color(0xff7ac4);
 const glowLights=[3,11,19].flatMap(row=>[-1,1].map(side=>{
  const z=2-row*2.05,light=new THREE.PointLight(0xffffff,0,0,2);
  light.position.set(side*4.05,FLOOR_Y+5,z);light.castShadow=false;group.add(light);
  return {light,delay:delays[row*2],release:DISSOLVE_AT+dissolveDelays[row*2]};
 }));
 let lastRiseTime=-1;
 return {
  get duration(){return DISSOLVE_END+6;},
  get glowing(){return group.visible&&clock.value>0;},
  get pinkGlow(){
   if(!group.visible)return 0;
   // Bloom follows the whole formation rather than the first row to turn pink.
   let glow=0;
   for(const delay of dissolveDelays)glow+=sakuraPinkBuild((clock.value-DISSOLVE_AT-delay)/DISSOLVE_DURATION);
   return glow/BLADES;
  },
  start(x:number,z:number){group.position.set(x,0,z);group.visible=false;lastRiseTime=-1;clock.value=-1;},
  hide(){group.visible=false;},
  update(time:number,intensity:number,petalGlow=4){
   group.visible=time>=0;clock.value=time;formationPower.value=Math.min(2,Math.max(0,intensity));
   const riseTime=THREE.MathUtils.clamp(time,0,RISE_END);
   if(riseTime!==lastRiseTime){
    for(let i=0;i<BLADES;i++){
     const p=placement[i],rise=THREE.MathUtils.smoothstep(time,p.delay,p.delay+2.1);
     dummy.position.set(p.side*4.3,FLOOR_Y-(1-rise)*(HEIGHT+.05),p.z);
     dummy.rotation.set(0,p.side===-1?0:Math.PI,0);dummy.scale.setScalar(1);dummy.updateMatrix();blades.setMatrixAt(i,dummy.matrix);
    }
    blades.instanceMatrix.needsUpdate=true;
   }
   blades.visible=time<DISSOLVE_END;
   particles.update(intensity,petalGlow,time>DISSOLVE_AT);
   for(const {light,delay,release} of glowLights){
    const emergence=THREE.MathUtils.smoothstep(time,delay+.15,delay+2.1);
    const pink=THREE.MathUtils.smoothstep(time,release-.85,release+.05);
    const glow=sakuraPinkBuild((time-release)/DISSOLVE_DURATION);
    const dispersal=1-THREE.MathUtils.smoothstep(time,release+DISSOLVE_DURATION*.55,release+DISSOLVE_DURATION+2.5);
    light.color.setRGB(1,1,1).lerp(spillPink,pink);
    light.intensity=emergence*dispersal*formationPower.value*THREE.MathUtils.lerp(15,140,glow);
   }
   lastRiseTime=riseTime;
  },
  dispose(){group.removeFromParent();contacts.dispose();contactGeometry.dispose();contactMaterial.dispose();blades.dispose();particles.dispose();geometry.dispose();for(const material of materials)material.dispose();}
 };
}
