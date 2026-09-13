import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const THREE=createRequire(import.meta.url)('three');
import {loadSource} from './load-source.mjs';
const {createProjectedSceneBounds}=loadSource('src/scene/projectedSceneBounds.ts');
const calculate=createProjectedSceneBounds(),scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(34,2,.1,100);
camera.position.z=15;camera.updateMatrixWorld();
const sword=new THREE.Mesh(new THREE.BoxGeometry(.3,6,.1),new THREE.MeshBasicMaterial());scene.add(sword);
const hidden=new THREE.Mesh(new THREE.BoxGeometry(1000,1000,1000),sword.material);hidden.visible=false;scene.add(hidden);
const result=new THREE.Vector4();
const measure=()=>{scene.updateMatrixWorld();calculate(scene,camera,4600,2440,320,result);return result.clone();};
const box=measure();assert(box.x>0&&box.y>0&&box.z<1&&box.w<1);
const point=new THREE.Vector3();
for(let i=0;i<8;i++){
 point.set(i&1?.15:-.15,i&2?3:-3,i&4?.05:-.05).project(camera);
 assert(point.x*.5+.5>=box.x&&point.x*.5+.5<=box.z);
 assert(point.y*.5+.5>=box.y&&point.y*.5+.5<=box.w);
}
const attribute=new THREE.BufferAttribute(new Float32Array([0,0,0]),3).setUsage(THREE.DynamicDrawUsage);
const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',attribute);
const sparks=new THREE.Points(geometry,new THREE.PointsMaterial());scene.add(sparks);
measure();attribute.setXYZ(0,5,0,0);attribute.needsUpdate=true;
assert(measure().z>box.z,'Moving sparks must expand the reconstructed region');
sparks.visible=false;
sword.position.z=15;assert.deepEqual(measure().toArray(),[0,0,1,1]);
sword.position.z=0;
const instances=new THREE.InstancedMesh(sword.geometry,sword.material,1);scene.add(instances);
assert.deepEqual(measure().toArray(),[0,0,1,1]);
for(const object of [sword,hidden,sparks,instances]){object.geometry.dispose();object.material.dispose();}
console.log('Projected bounds checks passed: aspect/padding, hidden objects, moving sparks, near-plane and instanced fallbacks.');
