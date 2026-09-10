import {useEffect,useRef,useState} from 'react';
import {createSwordScene,type SwordScene} from './scene/createSwordScene';
import type {SwordAsset} from './swordLibrary';

export default function SwordPreview({sword}:{sword:SwordAsset}){
 const container=useRef<HTMLDivElement>(null);
 const [ready,setReady]=useState(false),[error,setError]=useState(false);
 useEffect(()=>{
  if(!container.current)return;
  const controller=new AbortController();let owned:SwordScene|undefined;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  void createSwordScene(container.current,()=>setError(true),()=>{},controller.signal,{preview:true,model:sword.model}).then(scene=>{
   if(controller.signal.aborted){scene.dispose();return;}
   owned=scene;
   scene.update({rotating:!reduced,draw:100,reflections:sword.reflections,lightAngle:sword.lightAngle,cameraHeight:0,effect:sword.effect,effectSpeed:sword.effectSpeed,effectIntensity:sword.effectIntensity/100});
   setReady(true);
  }).catch(()=>{if(!controller.signal.aborted)setError(true);});
  return ()=>{controller.abort();owned?.dispose();};
 },[sword]);
 return <><div className="live-sword-stage" ref={container} aria-hidden="true"/>{(!ready||error)&&<span className="preview-status">{error?'Preview unavailable · Open sword':'Loading sword…'}</span>}</>;
}
