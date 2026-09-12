import {useEffect,useRef,useState} from 'react';
import {AppLink} from './navigation';
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
 const canvas=<div ref={host} className="sharingan-stage" role="img" aria-label="A monumental crimson Sharingan with black tomoe fading into darkness">{error&&<p role="alert">Unable to open the 3D study. Please reload to retry.</p>}</div>;
 if(preview)return canvas;
 return <main className="sharingan-study">
  {canvas}
  <header className="experience-header"><AppLink href="/" className="wordmark" aria-label="BladeX — collection">BladeX</AppLink><button onClick={()=>scene.current?.reset()}>Reset view</button></header>
  <section className="sharingan-caption"><p className="eyebrow">Form study / 01</p><h1>Sharingan</h1><p className="sharingan-subtitle">写輪眼 · Three tomoe</p><div className="sharingan-actions"><button onClick={()=>setSpinning(v=>!v)} aria-pressed={spinning}>{spinning?'Pause rotation':'Rotate symbol'}</button><span>Drag to look around · Scroll to approach</span></div></section>
 </main>;
}
