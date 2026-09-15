import * as THREE from 'three';
import {BANKAI_ROW_OFFSET,BANKAI_FRONT_Z,BANKAI_ROW_SPACING,BANKAI_DISSOLVE_AT,BANKAI_DISSOLVE_DURATION,BANKAI_DISSOLVE_END} from './sakuraLayout';
import {FLOOR_Y} from './sceneDimensions';

/** Soft overlapping light volumes, batched into one draw and driven by the effect clock. */
export function createSakuraAtmosphere(clock:{value:number},power:{value:number},releaseDelays:Float32Array){
 const rows=[1,5,9,13,17,21],count=rows.length*2;
 const geometry=new THREE.PlaneGeometry(13,18);
 const release:number[]=[];
 for(const row of rows)for(let side=0;side<2;side++)release.push(releaseDelays[row*2+side]);
 geometry.setAttribute('releaseDelay',new THREE.InstancedBufferAttribute(new Float32Array(release),1));
 const petalPower={value:1};
 const material=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,
  uniforms:{formationTime:clock,formationPower:power,petalPower},
  vertexShader:`attribute float releaseDelay;varying vec2 fieldUV;varying float release;varying float groundHeight;varying float eyeDistance;
   void main(){
    vec4 center=modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.);
    vec4 viewCenter=viewMatrix*center;
    vec4 point=viewCenter+vec4(position.xy,0.,0.);
    gl_Position=projectionMatrix*point;
    fieldUV=uv;release=releaseDelay;eyeDistance=-viewCenter.z;
    groundHeight=center.y+position.x*viewMatrix[1][0]+position.y*viewMatrix[1][1]-(${FLOOR_Y});
   }`,
  fragmentShader:`uniform float formationTime;uniform float formationPower;uniform float petalPower;
   varying vec2 fieldUV;varying float release;varying float groundHeight;varying float eyeDistance;
   void main(){
    vec2 p=(fieldUV-.5)*2.;float radius=dot(p,p);
    float feather=exp(-radius*3.)*(1.-smoothstep(.45,1.,radius));
    float age=formationTime-${BANKAI_DISSOLVE_AT}-release;
    float build=smoothstep(0.,${BANKAI_DISSOLVE_DURATION},age);
    float linger=1.-smoothstep(${BANKAI_DISSOLVE_END+3.5},${BANKAI_DISSOLVE_END+6},formationTime);
    
    float alpha=feather*build*linger*formationPower*petalPower*.027;
    alpha*=smoothstep(0.,1.2,groundHeight)*smoothstep(.5,3.,eyeDistance);
    gl_FragColor=vec4(.95,.22,.63,alpha);
   }`});
 const mesh=new THREE.InstancedMesh(geometry,material,count);mesh.frustumCulled=false;
 const dummy=new THREE.Object3D();let i=0;
 for(const row of rows)for(const side of [-1,1]){
  dummy.position.set(side*BANKAI_ROW_OFFSET,FLOOR_Y+6.3,BANKAI_FRONT_Z-row*BANKAI_ROW_SPACING);
  dummy.updateMatrix();mesh.setMatrixAt(i++,dummy.matrix);
 }
 mesh.instanceMatrix.needsUpdate=true;
 return {mesh,update(glow:number,presence=1){petalPower.value=THREE.MathUtils.clamp(glow/6,0,1.4)*THREE.MathUtils.clamp(presence,0,1);mesh.visible=petalPower.value>0;},dispose(){mesh.removeFromParent();mesh.dispose();geometry.dispose();material.dispose();}};
}
