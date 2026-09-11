// Pause asynchronous setup between GPU preparation steps as well as pausing the
// finished scene. Cancelling an unmounted view releases its pending waiter.
export function createSceneActivity(initiallyActive:boolean){
 let active=initiallyActive;
 const waiters=new Set<()=>void>();
 return {
  setActive(value:boolean){active=value;if(active)for(const resume of [...waiters])resume();},
  async waitUntilActive(signal:AbortSignal):Promise<void>{
   signal.throwIfAborted();
   while(!active){
    await new Promise<void>((resolve,reject)=>{
     const cleanup=()=>{waiters.delete(resume);signal.removeEventListener('abort',abort);};
     const resume=()=>{cleanup();resolve();};
     const abort=()=>{cleanup();reject(signal.reason);};
     waiters.add(resume);signal.addEventListener('abort',abort,{once:true});
    });
    signal.throwIfAborted();
   }
  },
 };
}
