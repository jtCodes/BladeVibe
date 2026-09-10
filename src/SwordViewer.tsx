import { useEffect, useRef, useState } from 'react';
import { createSwordScene, type SwordScene, type ViewerSettings } from './scene/createSwordScene';
import type { MotionStatus } from './scene/swordPhysics';
interface Props extends ViewerSettings { resetVersion: number; dropVersion: number; onStatus: (status: MotionStatus) => void }
export function SwordViewer({ rotating, draw, reflections, lightAngle, cameraHeight,effect,effectSpeed,effectIntensity, resetVersion, dropVersion, onStatus }: Props) {
 const container=useRef<HTMLDivElement>(null), scene=useRef<SwordScene|null>(null);
 const [error,setError]=useState<string|null>(null),[ready,setReady]=useState(false);
 const settings=useRef({rotating,draw,reflections,lightAngle,cameraHeight,effect,effectSpeed,effectIntensity});settings.current={rotating,draw,reflections,lightAngle,cameraHeight,effect,effectSpeed,effectIntensity};
 useEffect(()=>{
  if(!container.current)return;
  const element=container.current;
  // Safari can otherwise claim native pinch/scroll gestures over the canvas.
  // Keep this local so the controls and browser accessibility zoom stay usable.
  const preventNativeGesture=(event: Event)=>{if(event.cancelable)event.preventDefault()};
  const gestureEvents=['touchmove','gesturestart','gesturechange'] as const;
  for(const event of gestureEvents)element.addEventListener(event,preventNativeGesture,{passive:false});
  const controller=new AbortController();let owned: SwordScene|undefined;
  void createSwordScene(container.current,setError,onStatus,controller.signal).then(viewer=>{
   if(controller.signal.aborted){viewer.dispose();return}owned=viewer;scene.current=viewer;viewer.update(settings.current);setReady(true);
  }).catch(error=>{if(!controller.signal.aborted){console.error(error);setError('The 3D viewer could not start. Reload in a browser with WebGL and WebAssembly enabled.')}});
  return ()=>{for(const event of gestureEvents)element.removeEventListener(event,preventNativeGesture);controller.abort();owned?.dispose();if(scene.current===owned)scene.current=null};
 },[onStatus]);
 useEffect(()=>{scene.current?.update({rotating,draw,reflections,lightAngle,cameraHeight,effect,effectSpeed,effectIntensity})},[rotating,draw,reflections,lightAngle,cameraHeight,effect,effectSpeed,effectIntensity]);
 useEffect(()=>{scene.current?.reset()},[resetVersion]);
 useEffect(()=>{if(dropVersion>0)scene.current?.release()},[dropVersion]);
 return <><div id="stage" ref={container} aria-label="Interactive 3D sword. Drag to orbit; use the draw control to unsheathe." />{!ready&&!error&&<div id="loading" role="status">Preparing sword physics…</div>}{error&&<div id="error" role="alert">{error}</div>}</>;
}
