import {useEffect,useState,type RefObject} from 'react';
import type {EffectTimeline,SwordScene,TimelineEffect} from './scene/createSwordScene';

interface Props {
 visible?:boolean;
 sceneRef:RefObject<SwordScene|null>;
 effect:TimelineEffect;
 active:boolean;
 paused:boolean;
 speed:number;
 onEffectChange:(effect:TimelineEffect)=>void;
 onPositionChange:(time:number,paused:boolean)=>void;
 onPauseChange:(paused:boolean)=>void;
 onSpeedChange:(speed:number)=>void;
}
export function EffectTimelineControls({visible=true,sceneRef,effect,active,paused,speed,onEffectChange,onPositionChange,onPauseChange,onSpeedChange}:Props){
 const [timeline,setTimeline]=useState<EffectTimeline|null>(null);
 useEffect(()=>{
  if(!visible)return;
  const refresh=()=>{
   const next=sceneRef.current?.getEffectTimeline(effect)??null;
   setTimeline(previous=>previous?.time===next?.time&&previous?.duration===next?.duration?previous:next);
  };
  refresh();const timer=window.setInterval(refresh,100);
  return ()=>window.clearInterval(timer);
 },[visible,sceneRef,effect]);
 function seek(time:number){
  if(!timeline)return;
  const next=Math.min(timeline.duration,Math.max(0,time));
  setTimeline({...timeline,time:next});onPositionChange(next,true);
 }
 const isPaused=!active||paused||speed===0;
 return <>
  <label className="range-label" htmlFor="timeline-effect">Timeline effect</label>
  <select id="timeline-effect" value={effect} onChange={event=>onEffectChange(event.target.value as TimelineEffect)}>
   <option value="bankai">Bankai</option><option value="shikai">Shikai</option>
  </select>
  <label className="range-label" htmlFor="effect-timeline">Effect timeline <output>{timeline?`${timeline.time.toFixed(2)} / ${timeline.duration.toFixed(2)} s`:'Preparing…'}</output></label>
  <input id="effect-timeline" type="range" min={0} max={timeline?.duration??1} step={.01} value={timeline?.time??0} disabled={!timeline}
   aria-valuetext={timeline?`${timeline.time.toFixed(2)} seconds`:undefined} onChange={event=>seek(Number(event.target.value))}/>
  <div className="timeline-actions">
   <button disabled={!timeline} onClick={()=>{
    if(isPaused&&speed===0)onSpeedChange(1);
    if(!active)onPositionChange(timeline?.time??0,false);else onPauseChange(!isPaused);
   }}>{isPaused?'Play':'Pause'}</button>
   <button disabled={!timeline} onClick={()=>seek((timeline?.time??0)-.1)} aria-label="Step effect back one tenth of a second">−0.1 s</button>
   <button disabled={!timeline} onClick={()=>seek((timeline?.time??0)+.1)} aria-label="Step effect forward one tenth of a second">+0.1 s</button>
   <button disabled={!timeline} onClick={()=>seek(0)}>Start</button>
  </div>
  <p className="motion-status">Scrub directly to any moment, even before release. Play continues from there.</p>
 </>;
}
