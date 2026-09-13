import * as THREE from 'three';

/** Conservative bounds for rigid scenes; unknown/deformed geometry uses the full frame. */
export function createProjectedSceneBounds(){
 const bounds=new THREE.Box3(),point=new THREE.Vector3();
 const full=new THREE.Vector4(0,0,1,1);
 return (scene:THREE.Scene,camera:THREE.PerspectiveCamera,width:number,height:number,padding:number,out:THREE.Vector4)=>{
  let left=1,bottom=1,right=0,top=0,found=false,unsafe=false;
  scene.traverseVisible(object=>{
   if(unsafe||(!(object instanceof THREE.Mesh)&&!(object instanceof THREE.Points)&&!(object instanceof THREE.Line)))return;
   if(object instanceof THREE.InstancedMesh||object instanceof THREE.SkinnedMesh){unsafe=true;return;}
   const geometry=object.geometry,position=geometry.getAttribute('position');
   if(!position)return;
   if(!geometry.boundingBox||position instanceof THREE.BufferAttribute&&position.usage===THREE.DynamicDrawUsage)geometry.computeBoundingBox();
   if(!geometry.boundingBox||geometry.boundingBox.isEmpty())return;
   bounds.copy(geometry.boundingBox).applyMatrix4(object.matrixWorld).expandByScalar(.05);
   for(let i=0;i<8;i++){
    point.set(i&1?bounds.max.x:bounds.min.x,i&2?bounds.max.y:bounds.min.y,i&4?bounds.max.z:bounds.min.z);
    point.applyMatrix4(camera.matrixWorldInverse);
    if(-point.z<=camera.near){unsafe=true;return;}
    point.applyMatrix4(camera.projectionMatrix);
    if(!Number.isFinite(point.x)||!Number.isFinite(point.y)){unsafe=true;return;}
    const x=point.x*.5+.5,y=point.y*.5+.5;
    left=Math.min(left,x);right=Math.max(right,x);bottom=Math.min(bottom,y);top=Math.max(top,y);found=true;
   }
  });
  if(unsafe||!found)return out.copy(full);
  return out.set(Math.max(0,left-padding/width),Math.max(0,bottom-padding/height),Math.min(1,right+padding/width),Math.min(1,top+padding/height));
 };
}
