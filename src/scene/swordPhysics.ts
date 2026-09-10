import RAPIER from '@dimforge/rapier3d-compat';
import * as THREE from 'three';
import {createScabbardGeometry} from './scabbard';
import {createBladeGeometry} from './craft';

export type MotionStatus = 'sheathed' | 'drawing' | 'drawn' | 'falling' | 'resting';
export const METERS_PER_UNIT = 0.16;
export const FLOOR_Y = -5.5;
export const DRAW_DISTANCE = 5.15;
let initialization: Promise<void> | undefined;
export function initializePhysics() { return initialization ??= RAPIER.init(); }

export function createSwordPhysics(sword: THREE.Group, onStatus: (status: MotionStatus) => void, options:{bladeGeometry?:()=>THREE.BufferGeometry;scabbardGeometry?:()=>THREE.BufferGeometry;curveRadius?:number;katana?:boolean}={}) {
  const world = new RAPIER.World({ x: 0, y: -9.81, z: 0 });
  world.timestep = 1 / 120;
  const scale = METERS_PER_UNIT;
  const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0, Math.PI - 0.16));
  const origin = new THREE.Vector3(0, 0, 0);
  const axis = new THREE.Vector3(0, -1, 0).applyQuaternion(rotation);
  const body = world.createRigidBody(RAPIER.RigidBodyDesc.kinematicPositionBased().setRotation(rotation).setCcdEnabled(true).setLinearDamping(.12).setAngularDamping(.18));
  // Simplified, convex blade and hilt collisions; visual detail remains independent.
  const collider = (x: number,y: number,z: number,cy: number,mass: number) => world.createCollider(RAPIER.ColliderDesc.cuboid(x*scale,y*scale,z*scale).setTranslation(0,cy*scale,0).setMass(mass).setFriction(.65).setRestitution(.08),body);
  const bladeGeometry=(options.bladeGeometry??createBladeGeometry)();
  const bladeShape=RAPIER.ColliderDesc.convexHull(Float32Array.from(bladeGeometry.attributes.position.array,value=>value*scale));
  if(!bladeShape)throw new Error('Invalid blade collision geometry');
  world.createCollider(bladeShape.setMass(.95).setFriction(.65).setRestitution(.08),body);bladeGeometry.dispose();
  if(options.katana){collider(.34,.035,.255,0,.18);collider(.125,.84,.095,-.88,.25);}else{collider(.83,.05,.06,0,.22);collider(.12,.88,.10,-.96,.12);collider(.212,.212,.085,-2.035,.18);}
  world.createCollider(RAPIER.ColliderDesc.cuboid(30*scale,.1,30*scale).setTranslation(0,FLOOR_Y*scale-.1,0).setFriction(.8).setRestitution(.08));
  const sheath = world.createRigidBody(RAPIER.RigidBodyDesc.fixed().setRotation(rotation));
  const shell=(options.scabbardGeometry??createScabbardGeometry)();
  world.createCollider(RAPIER.ColliderDesc.trimesh(Float32Array.from(shell.attributes.position.array,value=>value*scale),Uint32Array.from(shell.index!.array)).setFriction(.5),sheath);shell.dispose();
  let draw=0,target=0,accumulator=0,released=false,status: MotionStatus='sheathed';
  function notify(next: MotionStatus){if(next!==status){status=next;onStatus(next)}}
  function position(){
   if(options.curveRadius){const radius=options.curveRadius,a=draw*DRAW_DISTANCE/radius;return new THREE.Vector3(radius*(1-Math.cos(a)),-radius*Math.sin(a),0).applyQuaternion(rotation).multiplyScalar(scale);}
   return origin.clone().addScaledVector(axis,draw*DRAW_DISTANCE).multiplyScalar(scale);
  }
  const drawRotation=new THREE.Quaternion(),curveRotation=new THREE.Quaternion(),zAxis=new THREE.Vector3(0,0,1);
  function orientation(){return options.curveRadius?drawRotation.copy(rotation).multiply(curveRotation.setFromAxisAngle(zAxis,draw*DRAW_DISTANCE/options.curveRadius)):rotation;}
  const previousPosition=new THREE.Vector3(),previousRotation=new THREE.Quaternion();
  const currentPosition=new THREE.Vector3(),currentRotation=new THREE.Quaternion();
  function capture(){const p=body.translation(),q=body.rotation();currentPosition.set(p.x/scale,p.y/scale,p.z/scale);currentRotation.set(q.x,q.y,q.z,q.w)}
  function sync(){capture();const alpha=accumulator/world.timestep;sword.position.lerpVectors(previousPosition,currentPosition,alpha);sword.quaternion.slerpQuaternions(previousRotation,currentRotation,alpha)}
  function setDraw(value:number){target=THREE.MathUtils.clamp(value,0,1)}
  function release(){if(released||draw<.999||target<.999)return false;released=true;body.setBodyType(RAPIER.RigidBodyType.Dynamic,true);body.setLinvel({x:.30,y:0,z:.22},true);body.setAngvel({x:.55,y:.15,z:.6},true);notify('falling');return true}
  function restore(){released=false;draw=target;body.setBodyType(RAPIER.RigidBodyType.KinematicPositionBased,true);body.setTranslation(position(),true);body.setRotation(orientation(),true);body.setLinvel({x:0,y:0,z:0},true);body.setAngvel({x:0,y:0,z:0},true);body.setNextKinematicTranslation(position());body.setNextKinematicRotation(orientation());accumulator=0;capture();previousPosition.copy(currentPosition);previousRotation.copy(currentRotation);sync();notify(draw>=.999?'drawn':draw<=.001?'sheathed':'drawing')}
  function step(delta:number){
    accumulator+=Math.min(delta,.1);
    while(accumulator>=world.timestep){
      if(!released){draw=THREE.MathUtils.damp(draw,target,5,world.timestep);if(Math.abs(draw-target)<.0005)draw=target;body.setNextKinematicTranslation(position());body.setNextKinematicRotation(orientation());notify(draw>=.999?'drawn':draw<=.001?'sheathed':'drawing')}
      capture();previousPosition.copy(currentPosition);previousRotation.copy(currentRotation);world.step();accumulator-=world.timestep;
    }
    sync();if(released&&body.isSleeping())notify('resting');
  }
  restore();onStatus(status);
  return {setDraw,release,restore,step,get draw(){return draw},get released(){return released},world,body,dispose(){world.free()}};
}
