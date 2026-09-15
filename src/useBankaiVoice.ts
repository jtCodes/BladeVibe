import {useCallback,useEffect,useRef,type RefObject} from 'react';
import type {EffectSeekRequest,SwordScene} from './scene/createSwordScene';
import voiceUrl from './assets/audio/senbonzakura-sequence.m4a?url';

interface Options {active:boolean;paused:boolean;speed:number;enabled:boolean;seekRequest?:EffectSeekRequest}
/** Audio is armed only by Play/Release, never by loading a link or scrubbing. */
export function useBankaiVoice(scene:RefObject<SwordScene|null>,{active,paused,speed,enabled,seekRequest}:Options){
 const lastSeek=useRef<EffectSeekRequest|undefined>(undefined);
 const context=useRef<AudioContext|null>(null),buffer=useRef<AudioBuffer|null>(null),loading=useRef<Promise<void>|null>(null);
 const source=useRef<AudioBufferSourceNode|null>(null),armed=useRef(false),disposed=useRef(false);
 const stop=useCallback(()=>{source.current?.stop();source.current?.disconnect();source.current=null;},[]);
 const arm=useCallback((enableFromGesture=false)=>{
  if((!enabled&&!enableFromGesture)||typeof AudioContext==='undefined')return;
  armed.current=true;
  const ctx=context.current??=new AudioContext();
  // Resume synchronously from the user's click, including Safari's audio gesture gate.
  void ctx.resume().catch(()=>{armed.current=false;});
  loading.current??=fetch(voiceUrl).then(response=>{if(!response.ok)throw new Error('Voice asset unavailable');return response.arrayBuffer();})
   .then(data=>ctx.decodeAudioData(data)).then(decoded=>{if(!disposed.current)buffer.current=decoded;})
   .catch(()=>{loading.current=null;armed.current=false;});
 },[enabled]);
 useEffect(()=>{
  disposed.current=false;
  return()=>{disposed.current=true;stop();void context.current?.close();context.current=null;loading.current=null;};
 },[stop]);
 useEffect(()=>{
  stop();
  // Seeking is silent until the next explicit Play/Replay gesture.
  if(seekRequest!==lastSeek.current){if(seekRequest?.paused)armed.current=false;lastSeek.current=seekRequest;}
  if(!active||!enabled||paused||speed<=0)return;
  let sourceOffset=0,sourceStarted=0,timer:number|undefined;
  const sync=()=>{
   const ctx=context.current,clip=buffer.current,time=scene.current?.getEffectTimeline('bankai')?.time;
   if(document.hidden||!armed.current||!ctx||ctx.state!=='running'||!clip||time===undefined){stop();return;}
   if(time>=clip.duration){stop();return;}
   const expected=sourceOffset+(ctx.currentTime-sourceStarted)*speed;
   if(source.current&&Math.abs(expected-time)<.15)return;
   stop();const node=ctx.createBufferSource();node.buffer=clip;node.playbackRate.value=speed;
   const gain=ctx.createGain();gain.gain.value=.85;node.connect(gain);gain.connect(ctx.destination);
   node.onended=()=>{node.disconnect();gain.disconnect();if(source.current===node)source.current=null;};
   source.current=node;sourceOffset=Math.max(0,time);sourceStarted=ctx.currentTime;node.start(0,sourceOffset);
  };
  timer=window.setInterval(sync,50);sync();
  return()=>{window.clearInterval(timer);stop();};
 },[active,paused,speed,enabled,seekRequest,scene,stop]);
 return arm;
}
