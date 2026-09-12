import {useEffect,useId,useRef,useState,type ReactNode} from 'react';
import {IconButton} from './SceneControls';

/** Compact scene options beside playback, with keyboard and outside-click dismissal. */
export function SceneOptions({children}:{children:ReactNode}){
 const [open,setOpen]=useState(false),id=useId();
 const root=useRef<HTMLDivElement>(null),trigger=useRef<HTMLButtonElement>(null),panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  if(!open)return;
  panel.current?.querySelector<HTMLElement>('input:checked,button:not(:disabled),input:not(:disabled)')?.focus();
  const close=(event:PointerEvent)=>{if(!root.current?.contains(event.target as Node))setOpen(false);};
  const escape=(event:KeyboardEvent)=>{if(event.key==='Escape'){event.preventDefault();setOpen(false);trigger.current?.focus();}};
  document.addEventListener('pointerdown',close);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',close);document.removeEventListener('keydown',escape);};
 },[open]);
 return <div className="scene-options" ref={root} onBlur={event=>{if(event.relatedTarget&&!event.currentTarget.contains(event.relatedTarget as Node))setOpen(false);}}>
  <IconButton ref={trigger} icon="options" label="Sword options" aria-expanded={open} aria-controls={id} aria-haspopup="dialog" onClick={()=>setOpen(value=>!value)}/>
  {open&&<div id={id} ref={panel} role="dialog" aria-label="Sword options" className="scene-options-panel">{children}</div>}
 </div>;
}
