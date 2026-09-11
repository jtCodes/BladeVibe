import * as THREE from 'three';

/** Opt-in measurements: frame cadence, JS submission time, and asynchronous GPU timers. */
export function createPerformanceMeter(renderer:THREE.WebGLRenderer,container:HTMLElement){
 const panel=document.createElement('pre');panel.setAttribute('aria-label','Rendering performance');
 panel.style.cssText='position:absolute;top:64px;left:16px;z-index:2;margin:0;padding:12px 14px;border:1px solid #ffffff26;border-radius:6px;background:#080d13e8;color:#e1edf6;font:12px/1.6 ui-monospace,monospace;pointer-events:none;font-variant-numeric:tabular-nums;';
 panel.hidden=true;container.appendChild(panel);
 const gl=renderer.getContext() as WebGL2RenderingContext;
 let timer:{TIME_ELAPSED_EXT:number;GPU_DISJOINT_EXT:number}|null=null;
 let enabled=false,previous=0,start=0,windowStart=0,frames=0,intervals=0,cadence=0,cpu=0,gpu=0,gpuCount=0,calls=0,triangles=0,sample=0;
 let activeQuery:WebGLQuery|null=null;
 const pending:WebGLQuery[]=[];
 const originalAutoReset=renderer.info.autoReset,size=new THREE.Vector2();
 function clearQueries(){if(activeQuery&&timer){gl.endQuery(timer.TIME_ELAPSED_EXT);gl.deleteQuery(activeQuery);activeQuery=null;}for(const query of pending)gl.deleteQuery(query);pending.length=0;}
 function reset(){previous=0;windowStart=0;frames=0;intervals=0;cadence=0;cpu=0;gpu=0;gpuCount=0;calls=0;triangles=0;sample=0;}
 function pause(){if(enabled){clearQueries();reset();}}
 document.addEventListener('visibilitychange',pause);
 return {
  setEnabled(value:boolean){
   if(enabled===value)return;enabled=value;panel.hidden=!value;reset();
   renderer.info.autoReset=value?false:originalAutoReset;
   if(value){timer=gl.getExtension('EXT_disjoint_timer_query_webgl2');panel.textContent='Measuring performance…';}
   else clearQueries();
  },
  begin(){
   if(!enabled)return;
   const now=performance.now();start=now;if(!windowStart)windowStart=now;
   if(previous){cadence+=now-previous;intervals++;}previous=now;
   renderer.info.reset();
   if(timer){
    if(gl.getParameter(timer.GPU_DISJOINT_EXT)){clearQueries();gpu=0;gpuCount=0;}
    else {
     while(pending.length&&gl.getQueryParameter(pending[0],gl.QUERY_RESULT_AVAILABLE)){
      const query=pending.shift()!;gpu+=Number(gl.getQueryParameter(query,gl.QUERY_RESULT))/1e6;gpuCount++;gl.deleteQuery(query);
     }
     if(sample++%4===0&&pending.length<4){activeQuery=gl.createQuery();if(activeQuery)gl.beginQuery(timer.TIME_ELAPSED_EXT,activeQuery);}
    }
   }
  },
  end(){
   if(!enabled)return;
   if(activeQuery&&timer){gl.endQuery(timer.TIME_ELAPSED_EXT);pending.push(activeQuery);activeQuery=null;}
   const now=performance.now();cpu+=now-start;frames++;calls+=renderer.info.render.calls;triangles+=renderer.info.render.triangles;
   if(now-windowStart<500)return;
   renderer.getDrawingBufferSize(size);
   const frameMs=intervals?cadence/intervals:0;
   panel.textContent=[
    `FPS          ${frameMs?(1000/frameMs).toFixed(0):'—'}`,
    `Frame        ${frameMs.toFixed(2)} ms`,
    `CPU submit   ${(cpu/frames).toFixed(2)} ms`,
    `GPU render   ${!timer?'Unavailable':gpuCount?(gpu/gpuCount).toFixed(2)+' ms':'Sampling…'}`,
    `Draw calls   ${Math.round(calls/frames).toLocaleString()}`,
    `Triangles    ${Math.round(triangles/frames).toLocaleString()}`,
    `Resolution   ${size.x} × ${size.y}`,
   ].join('\n');
   windowStart=now;frames=0;intervals=0;cadence=0;cpu=0;gpu=0;gpuCount=0;calls=0;triangles=0;
  },
  dispose(){clearQueries();renderer.info.autoReset=originalAutoReset;document.removeEventListener('visibilitychange',pause);panel.remove();}
 };
}
