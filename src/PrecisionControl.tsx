import {useEffect,useId,useRef,useState} from 'react';

/** A shared range and editable value, with draft text kept intact while typing. */
export function PrecisionControl({label,value,min,max,step=.1,unit='%',onChange}:{label:string;value:number;min:number;max:number;step?:number;unit?:string;onChange:(value:number)=>void}){
 const id=useId(),editing=useRef(false),[draft,setDraft]=useState(value.toFixed(1));
 useEffect(()=>{if(!editing.current)setDraft(value.toFixed(1));},[value]);
 function commit(){
  const parsed=draft.trim()===''?value:Number(draft);
  const next=Number.isFinite(parsed)?Math.min(max,Math.max(min,Math.round(parsed/step)*step)):value;
  editing.current=false;setDraft(next.toFixed(1));onChange(Number(next.toFixed(4)));
 }
 return <div className="precision-control">
  <div className="precision-heading"><label htmlFor={id}>{label}</label><span className="precision-value"><input type="number" aria-label={`${label} value`} min={min} max={max} step={step} value={draft} onFocus={()=>{editing.current=true;}} onChange={event=>{
   setDraft(event.target.value);const next=event.target.valueAsNumber;if(Number.isFinite(next)&&next>=min&&next<=max)onChange(next);
  }} onBlur={commit} onKeyDown={event=>{if(event.key==='Enter'){event.preventDefault();event.currentTarget.blur();}}}/><span aria-hidden="true">{unit}</span></span></div>
  <input id={id} type="range" min={min} max={max} step={step} value={value} aria-valuetext={`${value.toFixed(1)}${unit}`} onChange={event=>onChange(Number(event.target.value))}/>
 </div>;
}
