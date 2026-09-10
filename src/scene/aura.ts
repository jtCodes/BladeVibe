import * as THREE from 'three';
import {createBladeFrost} from './ice';
import {createIceChips} from './iceChips';
import {createColdMist} from './coldMist';
import {createBladeElectric} from './electric';
import {createContinuousFire} from './fire';
import {bladeThickness} from './craft';
import {BLADE_ROOT,BLADE_VISIBLE_ROOT,BLADE_TIP,sampleBladeSurface} from './bladeSurface';
import {DRAW_DISTANCE, FLOOR_Y} from './swordPhysics';

export type EffectMode='off'|'glow'|'flame'|'ice'|'electric'|'bankai';

export function createBladeAura(sword:THREE.Group, pixelRatio:number) {
 const group=new THREE.Group();sword.add(group);
 let mode:EffectMode='flame',speed=1;
 const uniforms={electric:{value:0},ice:{value:0},intensity:{value:1},upLocal:{value:new THREE.Vector3(0,-1,0)},lagRoot:{value:new THREE.Vector3()},lagTip:{value:new THREE.Vector3()},flame:{value:1},time:{value:0},exposed:{value:0},pixelRatio:{value:pixelRatio},floorY:{value:FLOOR_Y},motion:{value:window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:1}};
 // Thin luminous inlay with a broader, soft falloff on each face of the blade.
 for(const face of [-1,1])for(const halo of [false,true]) {
  const positions:number[]=[],uv:number[]=[],indices:number[]=[],rows=100;
  for(let i=0;i<=rows;i++) {
   const y=BLADE_ROOT+i/rows*(BLADE_TIP-BLADE_ROOT),taper=bladeThickness(y);
   const width=(halo?.075:.005)*taper;
   const z=face*((halo?.082:.054)*.23*taper+.001);
   positions.push(-width,y,z,width,y,z);uv.push(0,i/rows,1,i/rows);
   if(i<rows){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);
  const material=new THREE.ShaderMaterial({uniforms:{...uniforms,strength:{value:halo?.19:1.25}},transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,
   vertexShader:`varying vec2 vUv; varying float bladeY;
    void main(){vUv=uv;bladeY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
   fragmentShader:`uniform float electric;uniform float time;uniform float exposed;uniform float strength;uniform float motion;uniform float flame;uniform float ice;uniform float intensity;varying vec2 vUv;varying float bladeY;
    void main(){float reveal=1.-smoothstep(exposed-.04,exposed,bladeY);
     float edge=pow(max(0.,1.-abs(vUv.x*2.-1.)),2.5);
     float ends=1.-smoothstep(.97,1.,vUv.y);
     float pulse=.93+.07*sin(time*.8*motion-vUv.y*3.);
     gl_FragColor=vec4(mix(mix(vec3(.16,.65,1.15),vec3(1.25,1.18,.95),electric),vec3(5.,1.2,.08),flame)*strength*intensity,edge*ends*reveal*pulse*(1.-ice));}`});
  group.add(new THREE.Mesh(geometry,material));
 }
 const continuousFire=createContinuousFire(uniforms);group.add(continuousFire);
 const frost=createBladeFrost(uniforms);group.add(frost);
 // Emit at the actual steel surface, then simulate in world space so sparks
 // detach naturally when drawing, orbiting or dropping the sword.
 const count=800,positions=new Float32Array(count*3),seeds=new Float32Array(count),opacities=new Float32Array(count);
 const velocities=new Float32Array(count*3),ages=new Float32Array(count).fill(10),lifetimes=new Float32Array(count).fill(1);
 let seed=78,cursor=0,emission=0,nextIceSpawn=1;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 const iceChips=createIceChips(sword.parent!,random);
 const coldMist=createColdMist(sword.parent!,pixelRatio,random);
 const electric=createBladeElectric(group,random,spawnDischarge);
 nextIceSpawn=.25-Math.log(1.-random());
 for(let i=0;i<count;i++)seeds[i]=random();
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('velocity',new THREE.BufferAttribute(velocities,3).setUsage(THREE.DynamicDrawUsage));
 geometry.setAttribute('seed',new THREE.BufferAttribute(seeds,1));
 geometry.setAttribute('alpha',new THREE.BufferAttribute(opacities,1).setUsage(THREE.DynamicDrawUsage));
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  vertexShader:`attribute vec3 velocity;uniform float electric;varying vec2 sparkDirection;attribute float seed;attribute float alpha;uniform float pixelRatio;uniform float flame;uniform float ice;uniform float intensity;varying float opacity;varying float tint;
   void main(){vec4 view=modelViewMatrix*vec4(position,1.);
    vec2 drift=(modelViewMatrix*vec4(velocity,0.)).xy;
    sparkDirection=length(drift)>.0001?normalize(drift)*vec2(1.,-1.):vec2(1.,0.);
    opacity=alpha;tint=seed;gl_Position=projectionMatrix*view;
    gl_PointSize=clamp(mix(mix(mix(1.8+seed*1.8,4.+seed*3.,flame),4.+seed*5.,ice),.8+seed*1.7,electric)*pixelRatio*14./max(1.,-view.z),1.,128.*pixelRatio);
   }`,
  fragmentShader:`varying vec2 sparkDirection;uniform float electric;uniform float flame;uniform float ice;uniform float intensity;uniform float time;varying float opacity;varying float tint;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
   float fbm(vec2 p){float n=0.;float a=.57;mat2 turn=mat2(.8,-.6,.6,.8);
    for(int i=0;i<4;i++){n+=a*noise(p);p=turn*p*2.07+13.7;a*=.48;}return n;}

   void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.||opacity<.001)discard;
    float glow=exp(-r*r*5.)*(1.-smoothstep(.7,1.,r));
    vec3 color=mix(vec3(.18,.62,1.),vec3(.70,.90,1.),tint);
    {
     if(flame>.5){vec2 q=gl_PointCoord-.5;float a=tint*12.;q=mat2(cos(a),-sin(a),sin(a),cos(a))*q;glow=exp(-dot(q*vec2(9.,3.),q*vec2(9.,3.)))*(1.-smoothstep(.7,1.,r));}
     if(electric>.5){
      vec2 q=gl_PointCoord-.5;float along=dot(q,sparkDirection),across=dot(q,vec2(-sparkDirection.y,sparkDirection.x));
      float thin=exp(-across*across*150.);
      float streak=exp(-along*along*mix(35.,9.,tint));
      glow=thin*streak*(1.-smoothstep(.65,1.,r));
     }
     color=mix(color,vec3(5.,4.7,4.0)*(.45+.55*tint),electric);
     gl_FragColor=vec4(mix(color,vec3(5.,.16,.003),flame)*intensity,glow*opacity);
    }}`});
 const particles=new THREE.Points(geometry,material);particles.frustumCulled=false;sword.parent!.add(particles);
 const fireLights=[.65,2.4,4.2].map(y=>{
  const light=new THREE.PointLight(0xff6820,0,7,2);light.position.set(0,y,.5);sword.add(light);return light;
 });
 const origin=new THREE.Vector3(),velocity=new THREE.Vector3(),rotation=new THREE.Quaternion();
 const rootWorld=new THREE.Vector3(),tipWorld=new THREE.Vector3(),previousRoot=new THREE.Vector3(),previousTip=new THREE.Vector3();
 const rootSpeed=new THREE.Vector3(),tipSpeed=new THREE.Vector3(),rawSpeed=new THREE.Vector3(),inverseRotation=new THREE.Quaternion();
 let motionReady=false,iceStress=0;
 const lastRootSpeed=new THREE.Vector3(),lastTipSpeed=new THREE.Vector3();
 function trackMotion(dt:number){
  sword.updateWorldMatrix(true,false);sword.getWorldQuaternion(rotation);inverseRotation.copy(rotation).invert();
  rootWorld.set(0,0,0).applyMatrix4(sword.matrixWorld);tipWorld.set(0,5,0).applyMatrix4(sword.matrixWorld);
  // Reset view is a teleport, not a physical impulse.
  const jump=!motionReady||rootWorld.distanceTo(previousRoot)>1.5||tipWorld.distanceTo(previousTip)>2.;
  if(jump){iceStress=0;lastRootSpeed.set(0,0,0);lastTipSpeed.set(0,0,0);rootSpeed.set(0,0,0);tipSpeed.set(0,0,0);motionReady=true;}
  else if(dt>0){
   const response=1.-Math.exp(-dt/ .24);
   lastRootSpeed.copy(rootSpeed);lastTipSpeed.copy(tipSpeed);
   rawSpeed.subVectors(rootWorld,previousRoot).divideScalar(dt).clampLength(0,12);rootSpeed.lerp(rawSpeed,response);
   rawSpeed.subVectors(tipWorld,previousTip).divideScalar(dt).clampLength(0,12);tipSpeed.lerp(rawSpeed,response);
  }
  const acceleration=dt>0&&!jump?Math.max(rootSpeed.distanceTo(lastRootSpeed),tipSpeed.distanceTo(lastTipSpeed))/dt:0;
  const travel=Math.max(rootSpeed.length(),tipSpeed.length());
  iceStress=jump?0:Math.min(22,Math.max(0,travel-.35)*1.4+Math.max(0,acceleration-2.)*.4);
  previousRoot.copy(rootWorld);previousTip.copy(tipWorld);
  uniforms.upLocal.value.set(0,1,0).applyQuaternion(inverseRotation);
  uniforms.lagRoot.value.copy(rootSpeed).multiplyScalar(-.10).clampLength(0,.48).applyQuaternion(inverseRotation);
  uniforms.lagTip.value.copy(tipSpeed).multiplyScalar(-.10).clampLength(0,.48).applyQuaternion(inverseRotation);
 }
 // The lightning supplies exact local contact/tip positions on each discharge.
 function spawnDischarge(point:THREE.Vector3,direction:THREE.Vector3,amount:number){
  if(mode!=='electric'||speed===0||!uniforms.motion.value)return;
  for(let n=0;n<amount;n++){
   const i=cursor;cursor=(cursor+1)%count;
   origin.copy(point).applyMatrix4(sword.matrixWorld);
   velocity.copy(direction).multiplyScalar(.45+random()*1.2);
   velocity.x+=(random()-.5)*1.2;velocity.y+=(random()-.5)*1.2;velocity.z+=(random()-.5)*1.2;
   velocity.applyQuaternion(rotation);rawSpeed.lerpVectors(rootSpeed,tipSpeed,THREE.MathUtils.clamp(point.y/5,0,1));velocity.addScaledVector(rawSpeed,.65);
   origin.toArray(positions,i*3);velocity.toArray(velocities,i*3);
   ages[i]=0;lifetimes[i]=.08+random()*.18;opacities[i]=.25+Math.pow(seeds[i],2)*.75;
  }
 }
 function spawn(exposed:number){
  const i=cursor;cursor=(cursor+1)%count;
  const y=BLADE_VISIBLE_ROOT+random()*(Math.min(BLADE_TIP-.015,exposed-.025)-BLADE_VISIBLE_ROOT),face=random()<.5?-1:1,side=random()<.5?-1:1;
  const edge=random()<.75,across=edge?.88+random()*.10:random()*.12;
  sampleBladeSurface(origin,y,side*across,face,.0015).applyMatrix4(sword.matrixWorld);
  velocity.set(side*(edge?.10+random()*.13:.03+random()*.07),-.035,face*(.025+random()*.075)).applyQuaternion(rotation);
  velocity.y+=mode==='flame'?.45+random()*.25:.065;
  if(mode==='flame'){velocity.x*=1.8;velocity.z*=1.8;velocity.y+=.25;rawSpeed.lerpVectors(rootSpeed,tipSpeed,y/5);velocity.addScaledVector(rawSpeed,.65);}
  if(mode==='ice'){velocity.multiplyScalar(.6);rawSpeed.lerpVectors(rootSpeed,tipSpeed,y/5);velocity.addScaledVector(rawSpeed,.85);}

  origin.toArray(positions,i*3);velocity.toArray(velocities,i*3);
  if(mode==='ice')iceChips.spawn(i);
  ages[i]=0;lifetimes[i]=mode==='flame'||mode==='ice'?1.2+random()*.7:.65+random()*.65;
 }
 return {configure(next:EffectMode,nextSpeed:number,nextIntensity:number){
  if(next!==mode){iceChips.clear();coldMist.clear();ages.fill(10);opacities.fill(0);emission=0;nextIceSpawn=.25-Math.log(1.-random());geometry.attributes.alpha.needsUpdate=true;}
  uniforms.intensity.value=THREE.MathUtils.clamp(nextIntensity,0,2);
  mode=next;speed=THREE.MathUtils.clamp(nextSpeed,0,3);uniforms.flame.value=mode==='flame'?1:0;uniforms.ice.value=mode==='ice'?1:0;uniforms.electric.value=mode==='electric'?1:0;
 },update(dt:number,draw:number){
  trackMotion(dt);
  dt*=speed*uniforms.motion.value;particles.visible=mode!=='off'&&mode!=='ice'&&uniforms.intensity.value>0;continuousFire.visible=mode==='flame';frost.visible=mode==='ice';
  uniforms.time.value+=dt;uniforms.exposed.value=draw*DRAW_DISTANCE+.05;group.visible=draw>.001&&mode!=='off'&&uniforms.intensity.value>0;
  for(const light of fireLights){
   const revealed=1.-THREE.MathUtils.smoothstep(light.position.y,uniforms.exposed.value-.12,uniforms.exposed.value);
   light.color.setHex(mode==='electric'?0xffefcf:0xff6820);
   light.intensity=mode==='electric'?uniforms.intensity.value*revealed*.25:mode==='flame'?uniforms.intensity.value*revealed*(.45+.08*Math.sin(uniforms.time.value*7.+light.position.y*5.)+.04*Math.sin(uniforms.time.value*13.)):0;
  }
  sword.updateWorldMatrix(true,false);sword.getWorldQuaternion(rotation);
  for(let i=0;i<count;i++){
   ages[i]+=dt;
   if(ages[i]>=lifetimes[i]){opacities[i]=0;continue;}
   if(mode==='flame'){
    velocities[i*3]+=Math.sin(uniforms.time.value*3.2+seeds[i]*41.)*.15*dt;
    // Air resistance retains momentum; cooling embers gradually fall.
    const drag=Math.exp(-.75*dt);
    velocities[i*3]*=drag;velocities[i*3+2]*=drag;
    velocities[i*3+1]=velocities[i*3+1]*drag+(.30-.85*ages[i]/lifetimes[i])*dt;
    velocities[i*3+2]+=Math.cos(uniforms.time.value*2.7+seeds[i]*29.)*.12*dt;
   }
   if(mode==='electric'){const drag=Math.exp(-3.5*dt);velocities[i*3]*=drag;velocities[i*3+2]*=drag;velocities[i*3+1]=velocities[i*3+1]*drag-1.8*dt;}
   if(mode==='ice'){velocities[i*3+1]-=5.5*dt;velocities[i*3]*=Math.exp(-.4*dt);velocities[i*3+2]*=Math.exp(-.4*dt);}
   for(let axis=0;axis<3;axis++)positions[i*3+axis]+=velocities[i*3+axis]*dt;
   if(mode==='ice'&&positions[i*3+1]<FLOOR_Y+.006){positions[i*3+1]=FLOOR_Y+.006;velocities[i*3+1]=Math.abs(velocities[i*3+1])*.18;velocities[i*3]*=.45;velocities[i*3+2]*=.45;}
   const life=ages[i]/lifetimes[i];
   opacities[i]=(mode==='electric'?(.25+Math.pow(seeds[i],2)*.75):(.75+seeds[i]*.25))*(mode==='ice'?(1.-THREE.MathUtils.smoothstep(life,.55,1.)):Math.pow(1.-life,1.6))*THREE.MathUtils.smoothstep(positions[i*3+1],FLOOR_Y,FLOOR_Y+.04);
  }
  if(uniforms.exposed.value>.23&&uniforms.motion.value&&mode!=='off'&&mode!=='electric'){
   emission+=dt*uniforms.intensity.value*(mode==='ice'?iceStress:mode==='flame'?180:190)*THREE.MathUtils.clamp(draw,0,1);
   if(mode==='ice'){
    // No idle shedding: physical travel and acceleration release sparse chips.
    while(emission>=nextIceSpawn){emission-=nextIceSpawn;spawn(uniforms.exposed.value);nextIceSpawn=.25-Math.log(1.-random());}
   }else while(emission>=1){spawn(uniforms.exposed.value);emission--;}
  }else emission=0;
  electric.update(dt,uniforms.exposed.value,uniforms.intensity.value,mode==='electric');
  coldMist.update(dt,sword,uniforms.exposed.value,rootSpeed,tipSpeed,uniforms.intensity.value,mode==='ice');
  iceChips.update(dt,positions,ages,lifetimes,opacities,uniforms.intensity.value,mode==='ice');
  geometry.attributes.position.needsUpdate=true;geometry.attributes.alpha.needsUpdate=true;geometry.attributes.velocity.needsUpdate=true;
 }};
}
