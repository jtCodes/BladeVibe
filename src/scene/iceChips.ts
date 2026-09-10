import * as THREE from 'three';
import {ConvexGeometry} from 'three/addons/geometries/ConvexGeometry.js';

// Small broken fragments with real facets, so their silhouette and reflections
// change as they tumble. Reuse a bounded pool instead of allocating per frame.
export function createIceChips(parent:THREE.Object3D,random:()=>number){
 const group=new THREE.Group();parent.add(group);
 const chips=Array.from({length:48},()=>{
  const points:THREE.Vector3[]=[];
  const corners=5+Math.floor(random()*5);
  for(let j=0;j<corners;j++){
   const angle=(j+random()*.6)/corners*Math.PI*2;
   const radius=.3+random()*.35;
   points.push(new THREE.Vector3(Math.cos(angle)*radius,Math.sin(angle)*radius,(.15+random()*.3)));
   points.push(new THREE.Vector3(Math.cos(angle)*radius*.8,Math.sin(angle)*radius*.8,-(.1+random()*.25)));
  }
  const material=new THREE.MeshPhysicalMaterial({color:0xa9dfff,metalness:0,roughness:.12+random()*.16,
   ior:1.31,clearcoat:.65,clearcoatRoughness:.08,transparent:true,opacity:.8,depthWrite:false,
   flatShading:true,envMapIntensity:1.5});
  const mesh=new THREE.Mesh(new ConvexGeometry(points),material);mesh.visible=false;group.add(mesh);
  return {mesh,index:-1,spin:new THREE.Vector3()};
 });
 let cursor=0;
 return {
  clear(){for(const chip of chips){chip.index=-1;chip.mesh.visible=false;}},
  spawn(index:number){
   const chip=chips[cursor];cursor=(cursor+1)%chips.length;chip.index=index;
   const size=.012+Math.pow(random(),2)*.035;
   // Broad flakes, narrow slivers, and occasional thicker chips.
   chip.mesh.scale.set(size*(.45+random()),size*(.7+random()*1.6),size*(.18+random()*.7));
   chip.mesh.rotation.set(random()*Math.PI*2,random()*Math.PI*2,random()*Math.PI*2);
   chip.spin.set((random()-.5)*5,(random()-.5)*7,(random()-.5)*4);
  },
  update(dt:number,positions:Float32Array,ages:Float32Array,lifetimes:Float32Array,opacities:Float32Array,intensity:number,visible:boolean){
   group.visible=visible&&intensity>0;
   for(const chip of chips){
    const i=chip.index;
    chip.mesh.visible=i>=0&&ages[i]<lifetimes[i];
    if(!chip.mesh.visible)continue;
    chip.mesh.position.fromArray(positions,i*3);
    chip.mesh.rotation.x+=chip.spin.x*dt;chip.mesh.rotation.y+=chip.spin.y*dt;chip.mesh.rotation.z+=chip.spin.z*dt;
    chip.mesh.material.opacity=Math.min(1,intensity)*opacities[i];
   }
  }
 };
}
