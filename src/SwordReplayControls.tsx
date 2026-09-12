import {PlaybackActions} from './SceneControls';
import {useEffect,useState,type CSSProperties,type RefObject} from 'react';
import type {SwordAsset} from './swordLibrary';
import type {SwordScene,EffectTimeline,TimelineEffect} from './scene/createSwordScene';
import type {EffectMode} from './scene/aura';
interface Props {
 sword:SwordAsset;sceneRef:RefObject<SwordScene|null>;visible:boolean;effect:EffectMode;selected:TimelineEffect;
 paused:boolean;speed:number;intensity:number;
 onSelect:(mode:TimelineEffect)=>void;onReplay:()=>void;onPause:()=>void;onSeek:(time:number)=>void;onOriginal:()=>void;
}
export function SwordReplayControls({sword,sceneRef,visible,effect,selected,paused,speed,intensity,onSelect,onReplay,onPause,onSeek,onOriginal}:Props){
 const [timeline,setTimeline]=useState<EffectTimeline|null>(null);
 const timed=sword.model==='senbonzakura',playing=effect===selected;
 const stopped=paused||speed===0||effect==='off'||(timed&&!playing);
 useEffect(()=>{
  if(!visible||!timed)return;
  const refresh=()=>{const next=sceneRef.current?.getEffectTimeline(selected)??null;setTimeline(previous=>previous?.time===next?.time&&previous?.cycleDuration===next?.cycleDuration?previous:next);};
  refresh();const interval=window.setInterval(refresh,100);return()=>window.clearInterval(interval);
 },[visible,timed,selected,sceneRef]);
 if(sword.model==='zangetsu')return <div className="replay-controls simple-controls">
  <div className="form-selector"><button aria-pressed={effect!=='bankai'} onClick={onOriginal}>Shikai</button><button aria-pressed={effect==='bankai'} onClick={()=>onSelect('bankai')}>Bankai</button></div>
 </div>;
 if(!timed)return <div className="replay-controls simple-controls"><PlaybackActions paused={stopped} onToggle={onPause} playLabel="Play effect" pauseLabel="Pause effect"/><button className="text-link" onClick={onOriginal}>Bare steel</button></div>;
 // Replay progress uses the same end as automatic looping; editor inspection
 // may retain a longer duration after seeking beyond the normal cycle.
 const duration=timeline?.cycleDuration??1;
 const position=Math.min(duration,Math.max(0,playing?timeline?.time??0:0));
 return <div className="replay-controls">
  <div className="form-selector" aria-label="Transformation"><button aria-pressed={effect==='off'} onClick={onOriginal}>Original</button><button aria-pressed={effect==='shikai'} onClick={()=>onSelect('shikai')}>Shikai</button><button aria-pressed={effect==='bankai'} onClick={()=>onSelect('bankai')}>Bankai</button></div>
  <PlaybackActions paused={stopped} onToggle={!playing?onReplay:onPause} onReplay={onReplay} playLabel="Play effect" pauseLabel="Pause effect"/>
  <label className="replay-progress"><span className="sr-only">Replay position</span><input type="range" style={{'--progress':`${position/(duration||1)*100}%`} as CSSProperties} aria-valuetext={`${position.toFixed(1)} seconds`} min={0} max={duration} step={.01} value={position} disabled={!timeline} onChange={event=>onSeek(Number(event.target.value))}/></label>
  {intensity===0&&<p className="replay-caption">Play restores the effect’s intensity.</p>}
 </div>;
}
