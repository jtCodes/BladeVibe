import type {SceneEnvironmentPreset} from './sceneEnvironment';
const studioLights:SceneEnvironmentPreset['lights']=[
 {kind:'area',channel:'key',color:0xf4f4f2,intensity:5.5,position:[-4,5,5],target:[0,1.5,0],size:[3,8]},
 {kind:'area',channel:'rim',color:0xffebd4,intensity:4,position:[4,2,-3],target:[0,1.5,0],size:[2,7]},
 {kind:'area',channel:'fill',color:0xe8efff,intensity:3.3,position:[2,4,4],target:[0,1.5,0],size:[.6,6]},
 {kind:'area',channel:'key',color:0xffffff,intensity:2.5,position:[0,8,2],target:[0,1.5,0],size:[4,3]},
 {kind:'directional',channel:'key',color:0xfff1df,intensity:1.8,position:[-12,18,10],shadow:true},
];
export const SWORD_ENVIRONMENT:SceneEnvironmentPreset={exposure:.85,background:'#101010',floor:'#101010',fogDensity:.032,ambient:{sky:0xb9d8ed,ground:0x1b1312,intensity:.14},studio:{neutral:false,intensity:.9,rotation:.35},lights:studioLights};
export const SENBONZAKURA_ENVIRONMENT:SceneEnvironmentPreset={...SWORD_ENVIRONMENT,fogDensity:.022,ambient:{sky:0xb0b0b0,ground:0x0c0c0c,intensity:.09},studio:{neutral:true,intensity:.72,rotation:.35},lights:studioLights.map((light,i)=>({...light,color:0xffffff,intensity:[4.2,4,1.3,1.5,1.2][i]}))};
export const SENBONZAKURA_BANKAI_FOG=.055;
export const SHARINGAN_ENVIRONMENT:SceneEnvironmentPreset={exposure:1.15,background:'#050507',ambient:{sky:0xc6cad4,ground:0x08080a,intensity:.45},lights:[
 {kind:'directional',channel:'key',color:0xffffff,intensity:1.8,position:[-3,4,5]},
 {kind:'directional',channel:'fill',color:0xc5cbda,intensity:.25,position:[3,0,3]},
 {kind:'directional',channel:'rim',color:0xffffff,intensity:.65,position:[2,2,-2]},
]};
export function swordEnvironmentPreset(model:string){return model==='senbonzakura'?SENBONZAKURA_ENVIRONMENT:SWORD_ENVIRONMENT;}
