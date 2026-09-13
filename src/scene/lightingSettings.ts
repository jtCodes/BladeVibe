export interface LightingSettings { brightness:number;key:number;fill:number;rim:number;ambient:number;environment?:number;cameraFill?:number;cameraRim?:number }
export const DEFAULT_LIGHTING:Readonly<Required<LightingSettings>>={brightness:1,key:1,fill:1,rim:1,ambient:1,environment:1,cameraFill:1,cameraRim:1};
export const LIGHTING_CONTROLS=[
 {key:'brightness',label:'Brightness',min:.25,max:2.5,group:'Overall'},
 {key:'key',label:'Main light',min:0,max:4,group:'Studio lights'},
 {key:'fill',label:'Fill light',min:0,max:5,group:'Studio lights'},
 {key:'rim',label:'Rim light',min:0,max:4,group:'Studio lights'},
 {key:'ambient',label:'Ambient light',min:0,max:4,group:'Ambient & reflections'},
 {key:'environment',label:'Reflection strength',min:0,max:4,group:'Ambient & reflections'},
 {key:'cameraFill',label:'Camera fill',min:0,max:5,group:'Camera lights'},
 {key:'cameraRim',label:'Camera rim',min:0,max:4,group:'Camera lights'},
] as const;
export function normalizeLightingSettings(input:unknown):Required<LightingSettings>{
 const raw=input&&typeof input==='object'?input as Record<string,unknown>:{};
 const result={...DEFAULT_LIGHTING};
 for(const {key,min,max} of LIGHTING_CONTROLS){
  // Old links coupled these lights. Preserve that exact balance when importing them.
  const fallback=key==='environment'?result.ambient:key==='cameraFill'?result.fill:key==='cameraRim'?result.rim:DEFAULT_LIGHTING[key];
  const value=raw[key];result[key]=typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
 }
 return result;
}
