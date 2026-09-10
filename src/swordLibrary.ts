import type {EffectMode} from './scene/aura';

export interface SwordAsset {
 readonly id:string;
 readonly name:string;
 readonly model:'longsword'|'senbonzakura';
 readonly description:string;
 readonly effect:EffectMode;
 readonly effectIntensity:number;
 readonly effectSpeed:number;
 readonly lightAngle:number;
 readonly reflections:boolean;
}
// The catalog is authored in code. Add completed sword implementations here.
export const swords:readonly SwordAsset[]=[{
 id:'steel-longsword',name:'Steel longsword',model:'longsword',description:'Tempered steel. Wrapped leather. Simple fittings.',
 effect:'electric',effectIntensity:100,effectSpeed:1,lightAngle:20,reflections:true,
},{id:'senbonzakura',name:'Senbonzakura',model:'senbonzakura',description:'Curved polished steel, lavender silk over ray skin, and a white lacquered saya.',effect:'off',effectIntensity:100,effectSpeed:1,lightAngle:20,reflections:true}];
export const effectNames:Record<EffectMode,string>={off:'Bare steel',glow:'Glow & sparks',flame:'Flame',ice:'Ice',electric:'Electric',shikai:'Shikai',bankai:'Bankai'};
export const effectColors:Record<EffectMode,string>={off:'#85969f',glow:'#8cd8ff',flame:'#ff884d',ice:'#9ddff5',electric:'#e8dec0',shikai:'#ffa4d6',bankai:'#afb9df'};
export function swordUrl(sword:SwordAsset){return `/swords/${encodeURIComponent(sword.id)}`;}
