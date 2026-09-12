import {BANKAI_VOICE_CUES} from './bankaiVoiceCues';
import {useEffect,useRef,type RefObject} from 'react';
import type {EffectSeekRequest,SwordScene} from './scene/createSwordScene';

const TITLE_END=BANKAI_VOICE_CUES.subtitle.end+1.1;
function ease(time:number,start:number,end:number){
 const t=Math.max(0,Math.min(1,(time-start)/(end-start)));
 return t*t*(3-2*t);
}
function fade(time:number,start:number,shown:number,leave:number,end:number){
 return ease(time,start,shown)*(1-ease(time,leave,end));
}
export function bankaiTitleFrame(time:number){
 return {
  label:fade(time,.08,.8,BANKAI_VOICE_CUES.label.end+.25,BANKAI_VOICE_CUES.label.end+1.05),
  name:fade(time,BANKAI_VOICE_CUES.name.start-.25,BANKAI_VOICE_CUES.name.start+.55,BANKAI_VOICE_CUES.name.end+.15,BANKAI_VOICE_CUES.name.end+1),
  subtitle:fade(time,BANKAI_VOICE_CUES.subtitle.start-.25,BANKAI_VOICE_CUES.subtitle.start+.55,BANKAI_VOICE_CUES.subtitle.end+.25,TITLE_END),
 };
}

/** Whole words fade with their spoken cues, using the same clock as the release. */
export function BankaiTitle({active,sceneRef,seekRequest}:{active:boolean;sceneRef:RefObject<SwordScene|null>;seekRequest?:EffectSeekRequest}){
 const label=useRef<HTMLParagraphElement>(null),name=useRef<HTMLSpanElement>(null),subtitle=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  if(!active)return;
  let frame=0,lastTime=-1;
  const render=()=>{
   const time=sceneRef.current?.getEffectTimeline('bankai')?.time;
   if(time!==undefined&&time!==lastTime){
    lastTime=time;const state=bankaiTitleFrame(time);
    if(label.current)label.current.style.opacity=String(state.label);
    if(name.current)name.current.style.opacity=String(state.name);
    if(subtitle.current)subtitle.current.style.opacity=String(state.subtitle);
   }
   if(time===undefined||time<TITLE_END)frame=requestAnimationFrame(render);
  };
  render();return()=>cancelAnimationFrame(frame);
 },[active,sceneRef,seekRequest]);
 if(!active)return null;
 return <div className="bankai-title" aria-hidden="true">
  <p ref={label} className="bankai-title-label">Bankai</p>
  <h2 className="bankai-title-name"><span ref={name} className="bankai-title-word">Senbonzakura</span><span ref={subtitle} className="bankai-title-word is-subtitle">Kageyoshi</span></h2>
 </div>;
}
