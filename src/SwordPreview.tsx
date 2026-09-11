import {createSceneActivity} from './scene/sceneActivity';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {createSwordScene,type SwordScene} from './scene/createSwordScene';
import type {SwordAsset} from './swordLibrary';

export default function SwordPreview({sword,active=true}:{sword:SwordAsset;active?:boolean}){
 const container=useRef<HTMLDivElement>(null),sceneRef=useRef<SwordScene|null>(null),activeRef=useRef(active);
 activeRef.current=active;
 const [activity]=useState(()=>createSceneActivity(active));
 const [started,setStarted]=useState(active),[ready,setReady]=useState(false),[error,setError]=useState(false);
 useLayoutEffect(()=>{activity.setActive(active);if(active)setStarted(true);sceneRef.current?.setActive(active);},[active,activity]);
 useEffect(()=>{
  if(!started||!container.current)return;
  setReady(false);setError(false);
  const controller=new AbortController();let owned:SwordScene|undefined;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  void createSwordScene(container.current,()=>setError(true),()=>{},controller.signal,{preview:true,model:sword.model,get active(){return activeRef.current;},waitUntilActive:()=>activity.waitUntilActive(controller.signal)}).then(scene=>{
   if(controller.signal.aborted){scene.dispose();return;}
   owned=scene;sceneRef.current=scene;scene.setActive(activeRef.current);
   scene.update({rotating:!reduced,draw:100,reflections:sword.reflections,lightAngle:sword.lightAngle,cameraHeight:0,effect:sword.effect,effectSpeed:sword.effectSpeed,effectIntensity:sword.effectIntensity/100});
   setReady(true);
  }).catch(()=>{if(!controller.signal.aborted)setError(true);});
  return ()=>{controller.abort();owned?.dispose();if(sceneRef.current===owned)sceneRef.current=null;};
 },[sword,started,activity]);
 return <><div className="live-sword-stage" ref={container} aria-hidden="true"/>{(!ready||error)&&<span className="preview-status">{error?'Preview unavailable · Open sword':'Loading sword…'}</span>}</>;
}
