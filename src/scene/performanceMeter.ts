import * as THREE from 'three';
import type {Pass} from 'three/addons/postprocessing/Pass.js';

type Timing={cpu:number;calls:number;frames:number;gpu:number;gpuCount:number;lastGpu:number|null;lastGpuCount:number;gpuAt:number};
const timing=():Timing=>({cpu:0,calls:0,frames:0,gpu:0,gpuCount:0,lastGpu:null,lastGpuCount:0,gpuAt:0});
/** Opt-in timings. One GPU query per sampled frame; rotate through whole-frame and enabled passes. */
export function createPerformanceMeter(renderer:THREE.WebGLRenderer,container:HTMLElement){
 const panel=document.createElement('pre');panel.setAttribute('aria-label','Rendering performance');
 panel.style.cssText='position:absolute;top:64px;left:16px;z-index:2;margin:0;padding:12px 14px;border:1px solid #ffffff26;border-radius:6px;background:#080d13e8;color:#e1edf6;font:11px/1.5 ui-monospace,monospace;pointer-events:none;font-variant-numeric:tabular-nums;max-width:calc(100% - 32px);';
 panel.hidden=true;container.appendChild(panel);
 const gl=renderer.getContext() as WebGL2RenderingContext;
 let timer:{TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number}|null=null;
 let enabled=false,previous=0,start=0,windowStart=0,frames=0,intervals=0,cadence=0,cpu=0,calls=0,triangles=0,sample=0;
 let queryTarget:Timing|null=null,queryCursor=0;
 let activeQuery:{query:WebGLQuery;stats:Timing}|null=null;
 const pending:Array<{query:WebGLQuery;stats:Timing}>=[];
 const total=timing(),passes:Array<{name:string;pass:Pass;stats:Timing;restore:()=>void}>=[];
 let diagnostics:()=>string[]=()=>[];
 let renderWidth=0,renderHeight=0;
 const originalAutoReset=renderer.info.autoReset,size=new THREE.Vector2();
 function clearQueries(){
  if(activeQuery&&timer){gl.endQuery(timer.TIME_ELAPSED_EXT);gl.deleteQuery(activeQuery.query);activeQuery=null;}
  for(const item of pending)gl.deleteQuery(item.query);pending.length=0;queryTarget=null;
 }
 function reset(){
  previous=0;windowStart=0;frames=0;intervals=0;cadence=0;cpu=0;calls=0;triangles=0;sample=0;queryCursor=0;
  Object.assign(total,timing());for(const item of passes)Object.assign(item.stats,timing());
 }
 function beginQuery(stats:Timing){
  if(!timer||activeQuery||pending.length>=4)return false;
  const query=gl.createQuery();if(!query)return false;
  gl.beginQuery(timer.TIME_ELAPSED_EXT,query);activeQuery={query,stats};return true;
 }
 function endQuery(){if(activeQuery&&timer){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push(activeQuery);activeQuery=null;}}
 function gpuText(stats:Timing,now:number){
  if(!timer)return 'n/a';
  if(stats.gpuCount){stats.lastGpu=stats.gpu/stats.gpuCount;stats.lastGpuCount=stats.gpuCount;stats.gpuAt=now;stats.gpu=0;stats.gpuCount=0;}
  return stats.lastGpu===null?'sampling':now-stats.gpuAt>3000?'stale':stats.lastGpu.toFixed(2);
 }
 function pause(){if(enabled){clearQueries();reset();}}
 document.addEventListener('visibilitychange',pause);
 return {
  watchPass(name:string,pass:Pass){
   const original=pass.render,stats=timing();
   pass.render=function(...args:Parameters<Pass['render']>){
    if(!enabled)return original.apply(this,args);
    const started=performance.now(),before=renderer.info.render.calls;
    const queried=queryTarget===stats&&beginQuery(stats);
    try{return original.apply(this,args);}finally{
     if(queried)endQuery();
     stats.cpu+=performance.now()-started;stats.calls+=renderer.info.render.calls-before;stats.frames++;
    }
   };
   passes.push({name,pass,stats,restore:()=>{pass.render=original;}});
  },
  setDiagnostics(provider:()=>string[]){diagnostics=provider;},
  setRenderSize(width:number,height:number){
   if(width!==renderWidth||height!==renderHeight){renderWidth=width;renderHeight=height;if(enabled){clearQueries();reset();}}
  },
  setEnabled(value:boolean){
   if(enabled===value)return;enabled=value;panel.hidden=!value;clearQueries();reset();
   renderer.info.autoReset=value?false:originalAutoReset;
   if(value){timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');panel.textContent='Measuring performance…';}
  },
  begin(){
   if(!enabled)return;
   const now=performance.now();start=now;if(!windowStart)windowStart=now;
   if(previous){cadence+=now-previous;intervals++;}previous=now;
   renderer.info.reset();queryTarget=null;
   if(timer){
    if(gl.getParameter(timer.GPU_DISJOINT_EXT)){clearQueries();Object.assign(total,timing());for(const item of passes)Object.assign(item.stats,timing());}
    else {
     while(pending.length&&gl.getQueryParameter(pending[0].query,gl.QUERY_RESULT_AVAILABLE)){
      const {query,stats}=pending.shift()!;
      stats.gpu+=Number(gl.getQueryParameter(query,gl.QUERY_RESULT))/1e6;stats.gpuCount++;gl.deleteQuery(query);
     }
     if(sample++%4===0){
      const targets=[total,...passes.filter(item=>item.pass.enabled).map(item=>item.stats)];
      queryTarget=targets[queryCursor++%targets.length];
      if(queryTarget===total)beginQuery(total);
     }
    }
   }
  },
  end(){
   if(!enabled)return;
   if(queryTarget===total)endQuery();queryTarget=null;
   const now=performance.now();cpu+=now-start;frames++;calls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;
   if(now-windowStart<500)return;
   renderer.getDrawingBufferSize(size);
   const frameMs=intervals?cadence/intervals:0;
   const passCpu=passes.reduce((sum,item)=>sum+item.stats.cpu,0);
   const rows=passes.map(({name,pass,stats})=>{
    const gpu=gpuText(stats,now);
    const row=pass.enabled?`${name.padEnd(12)} ${gpu.padStart(8)} ${(stats.frames?stats.cpu/stats.frames:0).toFixed(2).padStart(7)} ${Math.round(stats.frames?stats.calls/stats.frames:0).toString().padStart(6)}`:`${name.padEnd(12)}      off`;
    stats.cpu=0;stats.calls=0;stats.frames=0;return row;
   });
   const totalGpu=gpuText(total,now);
   panel.textContent=[
    `FPS          ${frameMs?(1000/frameMs).toFixed(0):'—'}`,
    `Frame        ${frameMs.toFixed(2)} ms`,
    `CPU submit   ${(cpu/frames).toFixed(2)} ms`,
    `CPU update   ${(Math.max(0,cpu-passCpu)/frames).toFixed(2)} ms`,
    `GPU render   ${totalGpu}${total.lastGpu!==null?' ms':''}`,
    `Draw calls   ${Math.round(calls/frames).toLocaleString()}`,
    `Triangles    ${Math.round(triangles/frames).toLocaleString()}`,
    `Render       ${renderWidth||size.x} × ${renderHeight||size.y} (${((renderWidth||size.x)*(renderHeight||size.y)/1e6).toFixed(2)} MP)`,
    `Output       ${size.x} × ${size.y} (${(size.x*size.y/1e6).toFixed(2)} MP)`,
    ...diagnostics(),'',
    'Pass           GPU ms  CPU ms  Calls',...rows,'',
    `GPU pending  ${pending.length} (async; one target per sampled frame)`,
    'CPU update includes simulation, camera and bounds.',
   ].join('\n');
   windowStart=now;frames=0;intervals=0;cadence=0;cpu=0;calls=0;triangles=0;
  },
  dispose(){clearQueries();for(const item of passes)item.restore();renderer.info.autoReset=originalAutoReset;document.removeEventListener('visibilitychange',pause);panel.remove();}
 };
}
