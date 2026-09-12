import * as THREE from 'three';

// Capture authored sword geometry before adding the sheath and effect emitters.
// A loose animated cloth tail should not pull the blade away from the center.
export function swordDisplayCenter(sword:THREE.Group){
 sword.updateWorldMatrix(true,true);
 const bounds=new THREE.Box3(),part=new THREE.Box3(),inverse=sword.matrixWorld.clone().invert(),transform=new THREE.Matrix4();
 sword.traverse(object=>{
  if(!(object instanceof THREE.Mesh)||object.name==='zangetsu-cloth-tail')return;
  object.geometry.computeBoundingBox();
  if(object.geometry.boundingBox){
   transform.multiplyMatrices(inverse,object.matrixWorld);
   bounds.union(part.copy(object.geometry.boundingBox).applyMatrix4(transform));
  }
 });
 return bounds.isEmpty()?new THREE.Vector3():bounds.getCenter(new THREE.Vector3());
}
export function centeredSwordView(camera:THREE.Vector3,target:THREE.Vector3,center:THREE.Vector3){
 return {camera:camera.clone().sub(target).add(center).toArray() as [number,number,number],target:center.toArray() as [number,number,number]};
}
