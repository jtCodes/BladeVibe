import {createMetalMaterial} from './metalMaterials';
import * as THREE from 'three';
import {surfaceMaps,createBladeGeometry,createLeatherWrap} from './craft';
import {createScabbard} from './scabbard';
import {createCrossguard,createPommel} from './crossguard';

export function createLongsword(renderer:THREE.WebGLRenderer,sword:THREE.Group){
function mesh(geo: THREE.BufferGeometry,mat: THREE.Material | THREE.Material[],parent: THREE.Object3D=sword){const o=new THREE.Mesh(geo,mat);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o}
function cylinder(r1: number,r2: number,h: number,y: number,mat: THREE.Material,segments=16){const o=mesh(new THREE.CylinderGeometry(r1,r2,h,segments),mat);o.position.y=y;return o}
const steel=createMetalMaterial(renderer,{color:0xd0d3d8,finish:'blade'});
const edge=createMetalMaterial(renderer,{color:0xe4e7eb,finish:'edge'});
const fittings=createMetalMaterial(renderer,{color:0x969997,finish:'fittings'});
const leather=new THREE.MeshStandardMaterial({color:0x30251f,metalness:0,roughness:.9,...surfaceMaps('leather',renderer),bumpScale:.003,side:THREE.DoubleSide});
// Physically thin cutting bevels, a recessed fuller and continuous distal taper.
mesh(createBladeGeometry(),[steel,edge,steel]);
sword.add(createCrossguard(renderer));
const grip=cylinder(.100,.105,1.67,-.98,leather,48);grip.scale.z=.83;
const wrap=mesh(createLeatherWrap(),leather);wrap.scale.y=1.18;
// Fine cord ribs beneath the leather and three silver grip collars.
const gripRibGeometry=new THREE.TorusGeometry(.112,.0016,4,32);
for(let i=0;i<85;i++){
 const rib=mesh(gripRibGeometry,leather);rib.rotation.x=Math.PI/2;rib.scale.y=.83;rib.position.y=-.20-i*.0187;
}
const gripSilver=createMetalMaterial(renderer,{color:0xb7bbb7,finish:'fittings'});
for(const [y,h] of [[-.99,.10],[-1.805,.10]]){
 const collar=cylinder(.119,.119,h,y,gripSilver,48);collar.scale.z=.86;
 for(const dy of [-h/2+.009,h/2-.009]){
  const rim=mesh(new THREE.TorusGeometry(.120,.003,6,48),gripSilver);rim.rotation.x=Math.PI/2;rim.scale.y=.86;rim.position.y=y+dy;
 }
}
sword.add(createPommel(renderer));
const sheathLeather=new THREE.MeshStandardMaterial({color:0x241d18,roughness:.88,metalness:0,...surfaceMaps('leather',renderer),bumpScale:.002,side:THREE.DoubleSide});
return createScabbard(sheathLeather,fittings);
}
