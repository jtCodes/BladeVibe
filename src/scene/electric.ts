import * as THREE from 'three';
import {bladeStations} from './craft';

export function createBladeElectric(parent:THREE.Group,random:()=>number,onDischarge:(point:THREE.Vector3,direction:THREE.Vector3,count:number)=>void){
 const group=new THREE.Group();parent.add(group);
 const maxSegments=100,sides=5;
 const arcs=Array.from({length:10},()=>{
  const positions=new Float32Array(maxSegments*sides*18),radials=new Float32Array(positions.length);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.BufferAttribute(positions,3).setUsage(THREE.DynamicDrawUsage));
  geometry.setAttribute('radial',new THREE.BufferAttribute(radials,3).setUsage(THREE.DynamicDrawUsage));
  const opacity={value:0},exposed={value:0};
  const meshes:THREE.Mesh[]=[];
  for(const halo of [true,false]){
   const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
    uniforms:{opacity,exposed,radius:{value:halo?.022:.0035},tint:{value:new THREE.Vector3(...(halo?[2.4,2.2,1.5]:[8.,7.6,6.4]) as [number,number,number])}},
    vertexShader:`attribute vec3 radial;uniform float radius;varying float bladeY;
     void main(){bladeY=position.y;gl_Position=projectionMatrix*modelViewMatrix*vec4(position+radial*radius,1.);}`,
    fragmentShader:`uniform float opacity;uniform float exposed;uniform vec3 tint;varying float bladeY;
     void main(){float reveal=1.-smoothstep(exposed-.035,exposed,bladeY);if(reveal<.001)discard;
      gl_FragColor=vec4(tint,opacity*reveal*${halo?'.075':'1.'});}`});
   const mesh=new THREE.Mesh(geometry,material);mesh.frustumCulled=false;group.add(mesh);meshes.push(mesh);
  }
  return {meshes,geometry,positions,radials,opacity,exposed,age:10,life:.2};
 });
 const delta=new THREE.Vector3(),u=new THREE.Vector3(),v=new THREE.Vector3(),radial=new THREE.Vector3();
 function width(y:number){for(let j=1;j<bladeStations.length;j++){const a=bladeStations[j-1],b=bladeStations[j];if(y<=b[0])return THREE.MathUtils.lerp(a[1],b[1],(y-a[0])/(b[0]-a[0]))*.65;}return .001;}
 function surface(y:number,a:number){return new THREE.Vector3(Math.cos(a)*(width(y)+.008),y,Math.sin(a)*.03);}
 function build(arc:typeof arcs[number],exposed:number,intensity:number){
  let offset=0;
  function segment(a:THREE.Vector3,b:THREE.Vector3){
   if(offset>=arc.positions.length)return;
   delta.subVectors(b,a).normalize();u.set(0,1,0);if(Math.abs(delta.y)>.9)u.set(1,0,0);
   u.cross(delta).normalize();v.crossVectors(delta,u);
   for(let side=0;side<sides;side++)for(const [end,k] of [[0,side],[1,side],[0,side+1],[0,side+1],[1,side],[1,side+1]]){
    const angle=k/sides*Math.PI*2;radial.copy(u).multiplyScalar(Math.cos(angle)).addScaledVector(v,Math.sin(angle));
    (end?b:a).toArray(arc.positions,offset);radial.toArray(arc.radials,offset);offset+=3;
   }
  }
  const limit=Math.min(4.99,exposed-.045),start=.10+random()*Math.max(0,limit-.25);
  const end=THREE.MathUtils.clamp(start+(random()<.35?-1:1)*(.35+random()*1.8),.09,limit);
  const angle=random()*Math.PI*2,turn=(random()-.5)*4.2,steps=18+Math.floor(random()*12);
  const spread=(.12+random()*.26)*(.65+intensity*.35),points:THREE.Vector3[]=[];
  for(let j=0;j<=steps;j++){
   const t=j/steps,y=THREE.MathUtils.lerp(start,end,t),a=angle+turn*t,envelope=Math.sin(t*Math.PI);
   const p=surface(y,a);p.x+=Math.cos(a)*spread*envelope;p.z+=Math.sin(a)*spread*envelope;
   if(j>0&&j<steps){p.x+=(random()-.5)*.13;p.y+=(random()-.5)*.065;p.z+=(random()-.5)*.13;}
   points.push(p);if(j)segment(points[j-1],p);
  }
  const discharges=[
   {point:points[0],direction:points[1].clone().sub(points[0]),count:4+Math.floor(random()*4)},
   {point:points[steps],direction:points[steps-1].clone().sub(points[steps]),count:4+Math.floor(random()*4)}
  ];
  for(let branch=0;branch<2+Math.floor(random()*3);branch++){
   const root=points[3+Math.floor(random()*(steps-5))];let previous=root;
   const direction=new THREE.Vector3((random()-.5)*.5,(random()-.5)*.5,(random()-.5)*.5);
   for(let k=1;k<=5;k++){const p=root.clone().addScaledVector(direction,k/5);p.x+=(random()-.5)*.06;p.z+=(random()-.5)*.06;p.y=THREE.MathUtils.clamp(p.y,.07,limit);segment(previous,p);previous=p;}
   if(random()<.7)discharges.push({point:previous,direction:direction.clone(),count:1+Math.floor(random()*3)});
  }
  arc.geometry.setDrawRange(0,offset/3);
  for(const name of ['position','radial']){const attribute=arc.geometry.getAttribute(name) as THREE.BufferAttribute;attribute.clearUpdateRanges();attribute.addUpdateRange(0,offset);attribute.needsUpdate=true;}
  arc.age=0;arc.life=.09+random()*.16;
  for(const discharge of discharges)onDischarge(discharge.point,discharge.direction.normalize(),discharge.count);
 }
 let timer=0,cursor=0,active=false;
 return {update(dt:number,exposed:number,intensity:number,enabled:boolean){
  group.visible=enabled&&intensity>0&&exposed>.22;
  if(!group.visible){active=false;for(const arc of arcs){arc.age=10;arc.opacity.value=0;}return;}
  if(!active){timer=0;active=true;}
  timer-=dt;
  if(timer<=0){
   const amount=1+Math.floor(random()*2*intensity);
   for(let i=0;i<amount;i++){build(arcs[cursor],exposed,intensity);cursor=(cursor+1)%arcs.length;}
   timer=(.055+random()*.10)/Math.max(.4,intensity);
  }
  for(const arc of arcs){arc.age+=dt;arc.exposed.value=exposed;
   arc.opacity.value=Math.max(0,1.-arc.age/arc.life)*Math.min(1.5,intensity);
   for(const mesh of arc.meshes)mesh.visible=arc.opacity.value>0;
  }
 }};
}
