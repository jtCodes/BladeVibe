import {useEffect,useState,type RefObject} from 'react';
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
 useEffect(()=>{
  if(!visible||!timed)return;
  const refresh=()=>{const next=sceneRef.current?.getEffectTimeline(selected)??null;setTimeline(previous=>previous?.time===next?.time&&previous?.duration===next?.duration?previous:next);};
  refresh();const interval=window.setInterval(refresh,100);return()=>window.clearInterval(interval);
 },[visible,timed,selected,sceneRef]);
 if(sword.model==='zangetsu')return <div className="replay-controls simple-controls">
  <div className="form-selector"><button aria-pressed={effect!=='bankai'} onClick={onOriginal}>Shikai</button><button aria-pressed={effect==='bankai'} onClick={()=>onSelect('bankai')}>Bankai</button></div>
 </div>;
 if(!timed)return <div className="replay-controls simple-controls"><button className="primary-action" onClick={onPause}>{effect==='off'||paused||speed===0?'Play effect':'Pause effect'}</button><button className="text-link" onClick={onOriginal}>Bare steel</button></div>;
 return <div className="replay-controls">
  <div className="form-selector" aria-label="Transformation"><button aria-pressed={effect==='off'} onClick={onOriginal}>Original</button><button aria-pressed={effect==='shikai'} onClick={()=>onSelect('shikai')}>Shikai</button><button aria-pressed={effect==='bankai'} onClick={()=>onSelect('bankai')}>Bankai</button></div>
  <div className="replay-actions"><button className="primary-action" onClick={!playing?onReplay:onPause}>{!playing?`Play ${selected}`:paused||speed===0?'Continue':'Pause'}</button><button className="text-link" onClick={onReplay}>Replay</button></div>
  <label className="replay-progress"><span className="sr-only">Replay position</span><input type="range" aria-valuetext={`${(playing?timeline?.time??0:0).toFixed(1)} seconds`} min={0} max={timeline?.duration??1} step={.01} value={playing?timeline?.time??0:0} disabled={!timeline} onChange={event=>onSeek(Number(event.target.value))}/></label>
  {intensity===0&&<p className="replay-caption">Play restores the effect’s intensity.</p>}
 </div>;
}
