import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const {getBankaiCameraView,getBankaiOpeningView}=loadSource('src/scene/bankaiCamera.ts');
for(const aspect of [16/9,9/16]){
 const origin={x:2,z:3},end=9;
 const view=t=>getBankaiOpeningView(origin,aspect,34,t,end);
 const close=view(0),wide=getBankaiCameraView(origin,aspect,34);
 assert.deepEqual(view(4.6),close,'Close framing holds until the first cage blade rises');
 for(const key of ['camera','target']){
  view(end)[key].forEach((value,i)=>assert.ok(Math.abs(value-wide[key][i])<1e-10));
 }
 assert.deepEqual(view(50),view(end),'Wide view must stay settled');
 let previous=close.camera[2];
 for(let i=1;i<=100;i++){
  const next=view(end*i/100);
  assert.ok(next.camera.every(Number.isFinite)&&next.target.every(Number.isFinite));
  assert.ok(next.camera[2]>=previous,'Pullback must not reverse direction');previous=next.camera[2];
 }
 const middle=view(.8);view(20);assert.deepEqual(view(.8),middle,'Seeking backward must reproduce framing');
}
console.log('Bankai camera: opening hold, monotonic pullback, wide endpoint, portrait and seek checks passed.');
