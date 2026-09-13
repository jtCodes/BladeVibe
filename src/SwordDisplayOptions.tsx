import {useId,type CSSProperties} from 'react';
import {effectNames,longswordEffects} from './swordLibrary';
import type {EffectMode} from './scene/aura';
import type {BankaiPetalMotion} from './scene/bankaiPetalMotion';

export function SwordSheathToggle({visible,onChange,wrapping=false,disabled=false,compact=false}:{visible:boolean;onChange:(visible:boolean)=>void;wrapping?:boolean;disabled?:boolean;compact?:boolean}){
 if(compact)return <button className="scene-option-toggle" type="button" aria-pressed={visible} disabled={disabled} onClick={()=>onChange(!visible)}><span>{wrapping?'Blade wrapping':'Sheath'}</span><span className="scene-option-state" aria-hidden="true">{visible?'On':'Off'}</span></button>;
 return <label className="reflection-toggle"><input type="checkbox" checked={visible} disabled={disabled} onChange={event=>onChange(event.target.checked)}/>{wrapping?'Show blade wrapping':'Show sheath'}</label>;
}
type DisplayChoice<Value extends string>={value:Value;label:string};
function DisplayChoiceSelect<Value extends string>({label,value,options,onChange,compact=false,id:providedId}:{label:string;value:Value;options:readonly DisplayChoice<Value>[];onChange:(value:Value)=>void;compact?:boolean;id?:string}){
 const generatedId=useId(),id=providedId??generatedId;
 if(compact)return <fieldset className="scene-option-effects"><legend>{label}</legend>{options.map(option=><label key={option.value} className="scene-option-choice"><input type="radio" name={id} value={option.value} checked={value===option.value} onChange={()=>onChange(option.value)}/><span>{option.label}</span><span className="scene-option-mark" aria-hidden="true"/></label>)}</fieldset>;
 return <div className="sword-effect-select"><label className="range-label" htmlFor={id}>{label}</label><select id={id} value={value} onChange={event=>{
  const option=options.find(option=>option.value===event.target.value);if(option)onChange(option.value);
 }}>{options.map(option=><option key={option.value} value={option.value}>{option.label}</option>)}</select></div>;
}
export function SwordEffectSelect({value,onChange,compact=false}:{value:EffectMode;onChange:(effect:EffectMode)=>void;compact?:boolean}){
 return <DisplayChoiceSelect label={compact?'Effect':'Effects'} value={value} onChange={onChange} compact={compact} options={longswordEffects.map(effect=>({value:effect,label:effectNames[effect]}))}/>;
}
const bankaiVariants:readonly DisplayChoice<BankaiPetalMotion>[]=[{value:'drift',label:'Original drift'},{value:'storm',label:'Camera storm'}];
export function BankaiVariantSelect({value,onChange,compact=false}:{value:BankaiPetalMotion;onChange:(variant:BankaiPetalMotion)=>void;compact?:boolean}){
 return <DisplayChoiceSelect id={compact?undefined:'bankai-petal-motion'} label="Bankai variant" value={value} onChange={onChange} compact={compact} options={bankaiVariants}/>;
}

export function SwordDrawSlider({value,onChange,disabled=false,wrapping=false,compact=false}:{value:number;onChange:(value:number)=>void;disabled?:boolean;wrapping?:boolean;compact?:boolean}){
 const id=useId();
 return <div className={compact?'scene-option-draw':'sword-draw-slider'}>
  <label className="range-label" htmlFor={id}>{wrapping?'Unwrap blade':'Draw sword'}<output>{Math.round(value)}%</output></label>
  <div className={compact?'replay-progress':undefined}><input id={id} type="range" min={0} max={100} step={1} value={value} disabled={disabled} style={{'--progress':`${value}%`} as CSSProperties} aria-valuetext={`${Math.round(value)}% ${wrapping?'unwrapped':'drawn'}`} onChange={event=>onChange(Number(event.target.value))}/></div>
 </div>;
}
