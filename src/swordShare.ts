import type {BankaiPetalMotion} from './scene/bankaiPetalMotion';
import type {SwordAsset} from './swordLibrary';
import {swordUrl,swordFormEffect,longswordEffects,type SwordForm} from './swordLibrary';
import type {EffectMode} from './scene/aura';
import {DEFAULT_LIGHTING,normalizeLightingSettings,type LightingSettings} from './scene/lightingSettings';
import {swordEnvironmentPreset} from './scene/sceneEnvironmentPresets';
import type {SwordViewState} from './scene/swordViewState';

export interface SwordShareState {
 bankaiPetalMotion:BankaiPetalMotion;
 version:1; sword:string; effect:EffectMode; effectIntensity:number; effectSpeed:number;
 time:number; paused:boolean; draw:number; showSheath:boolean; swordRotation:number; rotating:boolean;
 cameraHeight:number; lightAngle:number; lighting:LightingSettings; backgroundColor:string; floorColor:string;
 glowStrength:number; glowSpread:number; petalGlow:number; reflections:boolean; view?:SwordViewState;
}
export function defaultSwordState(sword:SwordAsset):SwordShareState{
 const environment=swordEnvironmentPreset(sword.model);
 return {bankaiPetalMotion:'drift',version:1,sword:sword.id,effect:sword.effect,effectIntensity:sword.effectIntensity/100,effectSpeed:sword.effectSpeed,
  time:0,paused:false,draw:100,showSheath:false,swordRotation:0,rotating:false,cameraHeight:0,lightAngle:sword.lightAngle,
  lighting:{...DEFAULT_LIGHTING},
  backgroundColor:environment.background,floorColor:environment.floor!,
  glowStrength:.42,glowSpread:.8,petalGlow:6,reflections:sword.reflections};
}
function record(value:unknown):Record<string,unknown>{return value!==null&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{};}
function number(value:unknown,fallback:number,min:number,max:number){return typeof value==='number'&&Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;}
function boolean(value:unknown,fallback:boolean){return typeof value==='boolean'?value:fallback;}
function color(value:unknown,fallback:string){return typeof value==='string'&&/^#[0-9a-f]{6}$/i.test(value)?value.toLowerCase():fallback;}
function vector(value:unknown,length:number,max:number):number[]|undefined{
 return Array.isArray(value)&&value.length===length&&value.every(v=>typeof v==='number'&&Number.isFinite(v)&&Math.abs(v)<=max)?value:undefined;
}
export function normalizeSwordState(sword:SwordAsset,input:unknown):SwordShareState{
 const base=defaultSwordState(sword),raw=record(input),light=record(raw.lighting);
 const allowed:readonly EffectMode[]=sword.model==='senbonzakura'?['off','shikai','bankai']:sword.model==='zangetsu'?['off','bankai']:longswordEffects;
 const effect=allowed.includes(raw.effect as EffectMode)?raw.effect as EffectMode:base.effect;
 const v=record(raw.view),camera=vector(v.camera,3,200),target=vector(v.target,3,100),rotation=vector(v.rotation,4,1);
 const magnitude=rotation?Math.hypot(...rotation):0;
 const view=camera&&target&&rotation&&magnitude>.001&&Math.hypot(...camera.map((n,i)=>n-target[i]))>.1?
  {camera:camera as SwordViewState['camera'],target:target as SwordViewState['target'],rotation:rotation.map(n=>n/magnitude) as SwordViewState['rotation']}:undefined;
 return {...base,bankaiPetalMotion:raw.bankaiPetalMotion==='storm'?raw.bankaiPetalMotion:'drift',effect,effectIntensity:number(raw.effectIntensity,base.effectIntensity,0,2),effectSpeed:number(raw.effectSpeed,base.effectSpeed,0,3),
  time:sword.model==='senbonzakura'&&(effect==='shikai'||effect==='bankai')?number(raw.time,0,0,120):0,paused:boolean(raw.paused,false),
  draw:sword.model==='senbonzakura'&&(effect==='shikai'||effect==='bankai')?100:number(raw.draw,100,0,100),showSheath:boolean(raw.showSheath,base.showSheath),swordRotation:number(raw.swordRotation,0,-180,180),rotating:boolean(raw.rotating,false),
  cameraHeight:number(raw.cameraHeight,0,-8,8),lightAngle:number(raw.lightAngle,base.lightAngle,0,360),
  lighting:normalizeLightingSettings(light),
  backgroundColor:color(raw.backgroundColor,base.backgroundColor),floorColor:color(raw.floorColor,base.floorColor),
  glowStrength:number(raw.glowStrength,.42,0,1.5),glowSpread:number(raw.glowSpread,.8,0,1),petalGlow:number(raw.petalGlow,base.petalGlow,0,8),reflections:boolean(raw.reflections,base.reflections),view};
}
export function readSwordShare(sword:SwordAsset,hash:string):{state:SwordShareState;invalid:boolean}{
 const token=new URLSearchParams(hash.replace(/^#/, '')).get('state');
 if(token===null)return {state:defaultSwordState(sword),invalid:false};
 try{
  if(token.length>10000||!/^[A-Za-z0-9_-]+$/.test(token))throw new Error('Invalid state');
  const text=atob(token.replace(/-/g,'+').replace(/_/g,'/'));
  const raw=record(JSON.parse(text));
  if(raw.version!==1||raw.sword!==sword.id)throw new Error('Unsupported state');
  return {state:normalizeSwordState(sword,raw),invalid:false};
 }catch{return {state:defaultSwordState(sword),invalid:true};}
}
export function readSwordPageState(sword:SwordAsset,hash:string,form?:SwordForm){
 const result=readSwordShare(sword,hash),effect=form?swordFormEffect(sword,form):undefined;
 if(effect===undefined)return result;
 const same=result.state.effect===effect;
 return {...result,state:{...result.state,effect,draw:100,rotating:false,time:same?result.state.time:0,paused:same?result.state.paused:false}};
}
export function swordSharePath(sword:SwordAsset,state:SwordShareState,editing=false){
 const safe=normalizeSwordState(sword,state);
 const json=JSON.stringify(safe,(_key,value)=>typeof value==='number'?Math.round(value*100000)/100000:value);
 const token=btoa(json).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
 const form=safe.effect==='bankai'?'bankai':safe.effect==='shikai'||sword.model==='zangetsu'?'shikai':undefined;
 return `${swordUrl(sword)}${editing?'/edit':form?`/${form}`:''}#state=${token}`;
}
