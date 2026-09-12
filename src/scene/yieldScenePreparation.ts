/** Let the loader paint before the next synchronous preparation stage. */
export function yieldScenePreparation(signal:AbortSignal):Promise<void>{
 signal.throwIfAborted();
 return new Promise((resolve,reject)=>{
  let frame=0,task:ReturnType<typeof setTimeout>|undefined;
  const fallback=setTimeout(finish,50);
  function cleanup(){cancelAnimationFrame(frame);clearTimeout(fallback);if(task!==undefined)clearTimeout(task);signal.removeEventListener('abort',abort);}
  function finish(){cleanup();resolve();}
  function abort(){cleanup();reject(signal.reason);}
  signal.addEventListener('abort',abort,{once:true});
  // Work scheduled inside rAF still blocks that paint; continue in the next task.
  frame=requestAnimationFrame(()=>{task=setTimeout(finish,0);});
 });
}
