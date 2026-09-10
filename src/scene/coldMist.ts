import * as THREE from 'three';
import {BLADE_VISIBLE_ROOT,BLADE_TIP,sampleBladeSurface} from './bladeSurface';
import {FLOOR_Y} from './swordPhysics';

export function createColdMist(parent:THREE.Object3D,pixelRatio:number,random:()=>number){
 const count=288,positions=new Float32Array(count*3),velocities=new Float32Array(count*3);
 const ages=new Float32Array(count).fill(10),lives=new Float32Array(count),alpha=new Float32Array(count),sizes=new Float32Array(count),seeds=new Float32Array(count);
 for(let i=0;i<count;i++)seeds[i]=random();
 const geometry=new THREE.BufferGeometry();
 for(const [name,array,itemSize] of [['position',positions,3],['alpha',alpha,1],['size',sizes,1],['seed',seeds,1]] as const)
  geometry.setAttribute(name,new THREE.BufferAttribute(array,itemSize).setUsage(THREE.DynamicDrawUsage));
 const uniforms={time:{value:0},pixelRatio:{value:pixelRatio}};
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthWrite:false,
  vertexShader:`attribute float alpha;attribute float size;attribute float seed;uniform float pixelRatio;
   varying float opacity;varying float variation;
   void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;
    gl_PointSize=clamp(size*pixelRatio*1100./max(1.,-p.z),1.,256.*pixelRatio);opacity=alpha;variation=seed;}`,
  fragmentShader:`uniform float time;varying float opacity;varying float variation;
   float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
   float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
   void main(){vec2 p=gl_PointCoord-.5;float a=variation*6.28;p=mat2(cos(a),-sin(a),sin(a),cos(a))*p;
    float r=length(p*vec2(1.,1.3))*2.;if(r>1.||opacity<.001)discard;
    vec2 q=p*4.+variation*83.+vec2(time*.10,-time*.16);
    float n=noise(q)*.6+noise(q*2.1)*.28+noise(q*4.3)*.12;
    float veil=pow(1.-r*r,2.)*smoothstep(.18,.72,n);
    gl_FragColor=vec4(.52,.70,.80,opacity*veil);}`});
 const points=new THREE.Points(geometry,material);points.frustumCulled=false;parent.add(points);
 const origin=new THREE.Vector3(),velocity=new THREE.Vector3(),rotation=new THREE.Quaternion();
 let cursor=0,emission=0;
 return {clear(){ages.fill(10);alpha.fill(0);emission=0;},
  update(dt:number,sword:THREE.Group,exposed:number,rootSpeed:THREE.Vector3,tipSpeed:THREE.Vector3,intensity:number,enabled:boolean){
   points.visible=enabled&&intensity>0;if(!points.visible)return;uniforms.time.value+=dt;
   for(let i=0;i<count;i++){
    ages[i]+=dt;if(ages[i]>=lives[i]){alpha[i]=0;continue;}
    const t=ages[i]/lives[i],drag=Math.exp(-1.8*dt);
    velocities[i*3]*=drag;velocities[i*3+2]*=drag;
    velocities[i*3+1]=velocities[i*3+1]*drag-.13*dt;
    for(let axis=0;axis<3;axis++)positions[i*3+axis]+=velocities[i*3+axis]*dt;
    positions[i*3+1]=Math.max(FLOOR_Y+.03,positions[i*3+1]);
    sizes[i]=(.28+seeds[i]*.24)*(1.+t*1.5);
    alpha[i]=.32*Math.min(1.5,intensity)*Math.sin(Math.PI*t)*Math.pow(1.-t,.5);
   }
   if(enabled&&exposed>.2){
    emission+=dt*52*Math.min(1.5,intensity)*Math.min(1,exposed/5);
    sword.getWorldQuaternion(rotation);
    while(emission>=1){emission--;const i=cursor;cursor=(cursor+1)%count;
     const y=BLADE_VISIBLE_ROOT+random()*(Math.min(BLADE_TIP-.015,exposed-.03)-BLADE_VISIBLE_ROOT),side=random()<.5?-1:1;
     sampleBladeSurface(origin,y,(random()-.5)*1.4,side,.012).applyMatrix4(sword.matrixWorld);
     velocity.lerpVectors(rootSpeed,tipSpeed,y/5).multiplyScalar(.18);
     velocity.x+=(random()-.5)*.10;velocity.y-=.035;velocity.z+=(random()-.5)*.10;
     origin.toArray(positions,i*3);velocity.toArray(velocities,i*3);ages[i]=0;lives[i]=1.8+random()*1.5;alpha[i]=0;
    }
   }else emission=0;
   for(const name of ['position','alpha','size'])geometry.attributes[name].needsUpdate=true;
  }};
}
