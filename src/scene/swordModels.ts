import type * as THREE from 'three';
import type {createSwordPhysics} from './swordPhysics';
import {createLongsword} from './longsword';
import {createSenbonzakura,createKatanaBladeGeometry,createSayaGeometry,KATANA_RADIUS} from './senbonzakura';
import {createZangetsu,createZangetsuBladeGeometry} from './zangetsu';
import {createTensaZangetsu,createTensaZangetsuBladeGeometry} from './tensaZangetsu';

interface SwordModelDefinition {
 create(renderer:THREE.WebGLRenderer,sword:THREE.Group):THREE.Group;
 physics:NonNullable<Parameters<typeof createSwordPhysics>[2]>;
 sheathOnSword:boolean;
}
// Register construction and matching collision geometry together.
export const swordModels={
 longsword:{create:createLongsword,physics:{},sheathOnSword:false},
 senbonzakura:{create:createSenbonzakura,physics:{bladeGeometry:createKatanaBladeGeometry,scabbardGeometry:createSayaGeometry,curveRadius:KATANA_RADIUS,katana:true},sheathOnSword:false},
 zangetsu:{create:createZangetsu,physics:{bladeGeometry:createZangetsuBladeGeometry,unsheathed:true},sheathOnSword:true},
 'tensa-zangetsu':{create:createTensaZangetsu,physics:{bladeGeometry:createTensaZangetsuBladeGeometry,unsheathed:true,katana:true},sheathOnSword:false},
} satisfies Record<string,SwordModelDefinition>;
export type SwordModel=keyof typeof swordModels;
