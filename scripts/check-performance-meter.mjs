import assert from 'node:assert/strict';
import {loadSource} from './load-source.mjs';
const {createPerformanceMeter}=loadSource('src/scene/performanceMeter.ts');
let clock=1,active=null,created=0,deleted=0,enabledQueries=0;
const panel={style:{},hidden:false,textContent:'',setAttribute(){},remove(){}};
const originalDocument=globalThis.document,originalPerformance=globalThis.performance;
globalThis.document={createElement:()=>panel,addEventListener(){},removeEventListener(){}};
globalThis.performance={now:()=>++clock};
const gl={QUERY_RESULT_AVAILABLE:1,QUERY_RESULT:2,
 getExtension:()=>({TIME_ELAPSED_EXT:3,GPU_DISJOINT_EXT:4}),getParameter:()=>false,
 createQuery:()=>({id:++created}),
 beginQuery(_type,query){assert.equal(active,null,'GPU queries must never nest');active=query;enabledQueries++;},
 endQuery(){assert.notEqual(active,null);active=null;},deleteQuery(){deleted++;},
 getQueryParameter:(_query,key)=>key===1?true:2_000_000,
};
const renderer={getContext:()=>gl,info:{autoReset:true,render:{calls:0,triangles:0},reset(){this.render.calls=0;this.render.triangles=0;}},getDrawingBufferSize:out=>out.set(5104,2708)};
const pass={enabled:true,render(){renderer.info.render.calls+=3;renderer.info.render.triangles+=20;}};
const original=pass.render;
const meter=createPerformanceMeter(renderer,{appendChild(){}});
try{
 meter.watchPass('Reflections',pass);meter.setDiagnostics(()=>['SSR rays     2297 × 1219']);meter.setRenderSize(4593,2437);
 meter.setEnabled(true);
 for(let i=0;i<64;i++){const before=enabledQueries;clock+=17;meter.begin();pass.render();meter.end();assert.equal(active,null);assert(enabledQueries-before<=1,'Sample only one GPU target per frame');}
 assert(enabledQueries>0&&enabledQueries<64);
 assert.match(panel.textContent,/Pass\s+GPU ms\s+CPU ms\s+Calls/);
 assert.match(panel.textContent,/Reflections\s+2\.00\s+[\d.]+\s+3/);
 assert.match(panel.textContent,/11\.19 MP/);
 assert.match(panel.textContent,/SSR rays/);
 meter.setRenderSize(2176,1476);assert.equal(deleted,created,'Resize must release old timing samples');
 meter.setEnabled(false);const before=enabledQueries;
 meter.begin();pass.render();meter.end();assert.equal(enabledQueries,before);
 meter.dispose();assert.equal(pass.render,original);assert.equal(renderer.info.autoReset,true);
 console.log('Performance meter checks passed: non-overlapping GPU queries, pass rows, resize cleanup, disabled overhead bypass and restoration.');
}finally{globalThis.document=originalDocument;globalThis.performance=originalPerformance;}
