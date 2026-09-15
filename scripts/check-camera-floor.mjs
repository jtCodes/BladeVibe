import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadSource} from './load-source.mjs';
const {Vector3}=createRequire(import.meta.url)('three');
const {constrainCameraToFloor,CAMERA_FLOOR_CLEARANCE}=loadSource('src/scene/cameraFloor.ts');
const {FLOOR_Y}=loadSource('src/scene/sceneDimensions.ts');
const camera=new Vector3(4,FLOOR_Y-5,8),target=new Vector3(1,FLOOR_Y-2,3);
assert.equal(constrainCameraToFloor(camera,target),true);
assert.deepEqual(camera.toArray(),[4,FLOOR_Y+CAMERA_FLOOR_CLEARANCE,8]);
assert.deepEqual(target.toArray(),[1,FLOOR_Y,3]);
assert.equal(constrainCameraToFloor(camera,target),false,'Boundary must be stable on repeated frames');
camera.y=FLOOR_Y+2;target.y=FLOOR_Y+.3;
assert.equal(constrainCameraToFloor(camera,target),false,'Valid views must stay unchanged');
for(let i=0;i<100;i++){camera.y-=.2;target.y-=.1;constrainCameraToFloor(camera,target);assert.ok(camera.y>=FLOOR_Y+CAMERA_FLOOR_CLEARANCE);assert.ok(target.y>=FLOOR_Y);}
console.log('Camera floor: underground views, repeated movement, stable boundary, and valid-view checks passed.');
