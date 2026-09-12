import {useId,type CSSProperties} from 'react';
import {effectNames,longswordEffects} from './swordLibrary';
import type {EffectMode} from './scene/aura';

export function SwordSheathToggle({visible,onChange,wrapping=false,disabled=false,compact=false}:{visible:boolean;onChange:(visible:boolean)=>void;wrapping?:boolean;disabled?:boolean;compact?:boolean}){
 if(compact)return <button className="scene-option-toggle" type="button" aria-pressed={visible} disabled={disabled} onClick={()=>onChange(!visible)}><span>{wrapping?'Blade wrapping':'Sheath'}</span><span className="scene-option-state" aria-hidden="true">{visible?'On':'Off'}</span></button>;
 return <label className="reflection-toggle"><input type="checkbox" checked={visible} disabled={disabled} onChange={event=>onChange(event.target.checked)}/>{wrapping?'Show blade wrapping':'Show sheath'}</label>;
}
export function SwordEffectSelect({value,onChange,compact=false}:{value:EffectMode;onChange:(effect:EffectMode)=>void;compact?:boolean}){
 const id=useId();
 if(compact)return <fieldset className="scene-option-effects"><legend>Effect</legend>{longswordEffects.map(effect=><label key={effect} className="scene-option-choice"><input type="radio" name={id} value={effect} checked={value===effect} onChange={()=>onChange(effect)}/><span>{effectNames[effect]}</span><span className="scene-option-mark" aria-hidden="true"/></label>)}</fieldset>;
 return <div className="sword-effect-select"><label className="range-label" htmlFor={id}>Effects</label><select id={id} value={value} onChange={event=>{
  const effect=event.target.value as EffectMode;if(longswordEffects.includes(effect))onChange(effect);
 }}>{longswordEffects.map(effect=><option key={effect} value={effect}>{effectNames[effect]}</option>)}</select></div>;
}

export function SwordDrawSlider({value,onChange,disabled=false,wrapping=false,compact=false}:{value:number;onChange:(value:number)=>void;disabled?:boolean;wrapping?:boolean;compact?:boolean}){
 const id=useId();
 return <div className={compact?'scene-option-draw':'sword-draw-slider'}>
  <label className="range-label" htmlFor={id}>{wrapping?'Unwrap blade':'Draw sword'}<output>{Math.round(value)}%</output></label>
  <div className={compact?'replay-progress':undefined}><input id={id} type="range" min={0} max={100} step={1} value={value} disabled={disabled} style={{'--progress':`${value}%`} as CSSProperties} aria-valuetext={`${Math.round(value)}% ${wrapping?'unwrapped':'drawn'}`} onChange={event=>onChange(Number(event.target.value))}/></div>
 </div>;
}
