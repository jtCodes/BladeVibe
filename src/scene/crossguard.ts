import * as THREE from 'three';
import {surfaceMaps} from './craft';

function steel(renderer:THREE.WebGLRenderer) {
 const maps=surfaceMaps('steel',renderer,[2,.2]);
 return new THREE.MeshStandardMaterial({color:0xb6b9b6,metalness:1,roughness:.3,...maps,bumpScale:.00009});
}
function add(group:THREE.Group,geometry:THREE.BufferGeometry,material:THREE.Material) {
 const mesh=new THREE.Mesh(geometry,material);mesh.castShadow=true;mesh.receiveShadow=true;group.add(mesh);return mesh;
}

export function createCrossguard(renderer:THREE.WebGLRenderer) {
 const group=new THREE.Group(),metal=steel(renderer);
 // Straight quillons, with square stock hot-twisted at the roots.
 for(const side of [-1,1]) {
  const positions:number[]=[],indices:number[]=[],uv:number[]=[];
  const rows=80;
  for(let i=0;i<=rows;i++) {
   const t=i/rows,x=.11+t*.40,twist=t*Math.PI*2;
   const radius=.028+.012*Math.sin(t*Math.PI);
   for(let j=0;j<4;j++) {
    const a=Math.PI/4+j*Math.PI/2+twist;
    positions.push(side*x,Math.cos(a)*radius,Math.sin(a)*radius);uv.push(t,j/4);
   }
  }
  for(let i=0;i<rows;i++)for(let j=0;j<4;j++) {
   const a=i*4+j,b=i*4+(j+1)%4,c=a+4,d=b+4;
   if(side>0)indices.push(a,b,c,b,d,c);else indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  add(group,geometry,metal);
  const shaft=add(group,new THREE.CylinderGeometry(.024,.032,.30,12),metal);shaft.rotation.z=-side*Math.PI/2;shaft.position.x=side*.653;
  for(const [x,radius,width] of [[.515,.036,.025],[.797,.038,.026]]) {
   const ring=add(group,new THREE.CylinderGeometry(radius,radius,width,20),metal);ring.rotation.z=Math.PI/2;ring.position.x=x*side;
  }
  const cap=add(group,new THREE.SphereGeometry(.032,16,8),metal);cap.scale.x=.4;cap.position.x=side*.815;
 }
 // A single continuous surface blends the grip collar into the forged guard.
 // Width and depth change independently from the oval grip to the broad shoulders.
 const contour=new THREE.CatmullRomCurve3([
  new THREE.Vector3(.114,-.195,.098),new THREE.Vector3(.117,-.18,.100),
  new THREE.Vector3(.117,-.135,.096),new THREE.Vector3(.119,-.10,.086),
  new THREE.Vector3(.133,-.067,.080),new THREE.Vector3(.158,-.039,.088),
  new THREE.Vector3(.183,-.014,.098),new THREE.Vector3(.191,.010,.099),
  new THREE.Vector3(.185,.031,.095),new THREE.Vector3(.175,.0475,.091)
 ],false,'centripetal');
 const rings=80,sides=64,positions:number[]=[],uv:number[]=[],indices:number[]=[];
 for(let row=0;row<=rings;row++){
  const p=contour.getPoint(row/rings);
  for(let side=0;side<=sides;side++){
   const angle=side/sides*Math.PI*2;
   positions.push(Math.cos(angle)*p.x,p.y,Math.sin(angle)*p.z);uv.push(side/sides,row/rings);
  }
 }
 for(let row=0;row<rings;row++)for(let side=0;side<sides;side++){
  const a=row*(sides+1)+side,b=a+1,c=a+sides+1;
  indices.push(a,c,b,b,c,c+1);
 }
 // Close the underside around the blade, retaining the scabbard seating plane.
 const bottom=positions.length/3;positions.push(0,.0475,0);uv.push(.5,1);
 for(let side=0;side<sides;side++)indices.push(bottom,rings*(sides+1)+side+1,rings*(sides+1)+side);
 const centerGeometry=new THREE.BufferGeometry();centerGeometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));centerGeometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));centerGeometry.setIndex(indices);centerGeometry.computeVertexNormals();
 add(group,centerGeometry,metal);
 return group;
}

export function createPommel(renderer:THREE.WebGLRenderer) {
 const group=new THREE.Group(),metal=steel(renderer);
 const shadow=new THREE.MeshStandardMaterial({color:0x545854,metalness:1,roughness:.56});
 const profile=[[0,-.055],[.145,-.055],[.195,-.04],[.212,-.018],[.212,.018],[.195,.04],[.145,.055],[0,.055]].map(([r,y])=>new THREE.Vector2(r,y));
 const wheel=add(group,new THREE.LatheGeometry(profile,64),metal);wheel.rotation.x=Math.PI/2;
 for(const face of [-1,1]) {
  const field=add(group,new THREE.CylinderGeometry(.182,.182,.009,64),shadow);field.rotation.x=Math.PI/2;field.position.z=face*.047;
  for(const [r,tube] of [[.189,.007],[.168,.003]]) {
   const rim=add(group,new THREE.TorusGeometry(r,tube,6,64),metal);rim.position.z=face*.052;
  }
  // A raised heraldic wolf mask cast into a darkened recessed medallion.
  function relief(points:number[][],z:number,depth=.006) {
   const shape=new THREE.Shape();points.forEach(([x,y],i)=>i?shape.lineTo(x,y):shape.moveTo(x,y));shape.closePath();
   const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:.002,bevelSize:.002,bevelSegments:1,steps:1});
   const mesh=add(group,geometry,metal);mesh.position.z=face*z;if(face<0)mesh.rotation.y=Math.PI;
  }
  relief([[-.105,.105],[-.038,.07],[0,.084],[.038,.07],[.105,.105],[.087,.016],[.12,-.022],[.072,-.055],[.036,-.108],[0,-.136],[-.036,-.108],[-.072,-.055],[-.12,-.022],[-.087,.016]],.053);
  for(const side of [-1,1]) {
   relief([[side*.081,.079],[side*.03,.042],[side*.066,.032]],.062);
   relief([[side*.072,.009],[side*.015,-.014],[side*.038,-.045],[side*.08,-.035]],.063);
   relief([[side*.018,-.04],[side*.045,-.089],[0,-.119]],.063);
   const eye=add(group,new THREE.SphereGeometry(.009,12,6),shadow);eye.scale.set(1.5,.5,.35);eye.position.set(side*.043,-.014,face*.073);eye.rotation.z=side*.3;
  }
  for(let i=0;i<24;i++) {
   const a=i/24*Math.PI*2;
   const bead=add(group,new THREE.SphereGeometry(.0035,6,4),metal);bead.position.set(Math.cos(a)*.178,Math.sin(a)*.178,face*.052);
  }
 }
 group.position.y=-2.035;
 return group;
}
