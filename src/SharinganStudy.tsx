import {useEffect,useRef,useState} from 'react';
import {SceneHeader,SceneOverlay,PlaybackActions} from './SceneControls';
import {createSharinganScene} from './scene/createSharinganScene';
export default function SharinganStudy({active=true,preview=false}:{active?:boolean;preview?:boolean}){
 const host=useRef<HTMLDivElement>(null),scene=useRef<ReturnType<typeof createSharinganScene>|null>(null);
 const [spinning,setSpinning]=useState(true),[error,setError]=useState(false);
 useEffect(()=>{
  if(!host.current)return;
  try{scene.current=createSharinganScene(host.current,preview);}catch{setError(true);return;}
  return()=>{scene.current?.dispose();scene.current=null;};
 },[preview]);
 useEffect(()=>{scene.current?.setActive(active);},[active,preview]);
 useEffect(()=>{scene.current?.setSpinning(spinning);},[spinning]);
 const canvas=<div ref={host} className="sharingan-stage" role="img" aria-label="A monumental crimson Sharingan with black tomoe fading into darkness">{error&&<p role="alert">Unable to load Sharingan. Please reload to retry.</p>}</div>;
 if(preview)return canvas;
 return <main className="sharingan-study is-replay">
  {canvas}
  <SceneHeader/>
  <SceneOverlay title="Sharingan" subtitle="写輪眼 · Three tomoe">
   <PlaybackActions paused={!spinning} onToggle={()=>setSpinning(v=>!v)} onReplay={()=>scene.current?.reset()} playLabel="Rotate symbol" pauseLabel="Pause rotation" replayLabel="Reset view"/>
   <p className="scene-control-hint">Drag to look around · Scroll to approach</p>
  </SceneOverlay>
 </main>;
}
