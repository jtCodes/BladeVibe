import * as THREE from 'three';

/** Positions/radii are in the aura group's local space. Shapes may be posed each frame. */
export interface AuraCapsule { start:THREE.Vector3; end:THREE.Vector3; startRadius:number; endRadius:number }
export interface DarkAuraStyle { density:number; turbulence:number; speed:number; edgeBrightness:number; breakup:number }
const MAX_SHAPES=12;

/** A reusable, seeded flame silhouette from 3D shapes. No character, sword, or timeline knowledge. */
export function createDarkAura(seed=1){
 const group=new THREE.Group();group.name='Dark aura silhouette';
 const starts=Array.from({length:MAX_SHAPES},()=>new THREE.Vector4());
 const ends=Array.from({length:MAX_SHAPES},()=>new THREE.Vector4());
 const uniforms={
  outline:{value:Array.from({length:48},()=>new THREE.Vector2())},outlineCount:{value:0},
  shapeStart:{value:starts},shapeEnd:{value:ends},shapeCount:{value:0},
  time:{value:0},seed:{value:seed},opacity:{value:0},density:{value:32},
  turbulence:{value:.045},speed:{value:.24},edgeBrightness:{value:.055},
  eye:{value:new THREE.Vector3()},extent:{value:new THREE.Vector3(1,1,1)},center:{value:new THREE.Vector3()},
  floorHeight:{value:0},breakup:{value:0},
 };
 const geometry=new THREE.BoxGeometry(1,1,1);
 const material=new THREE.ShaderMaterial({
  uniforms,transparent:true,depthTest:true,depthWrite:false,side:THREE.BackSide,
  blending:THREE.NormalBlending,toneMapped:false,
  vertexShader:`uniform vec3 extent,center;varying vec3 exitPoint;
   void main(){exitPoint=position*extent+center;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
   uniform vec2 outline[48];uniform int outlineCount;
   uniform vec4 shapeStart[12],shapeEnd[12];uniform int shapeCount;
   uniform float time,seed,opacity,density,turbulence,speed,edgeBrightness,floorHeight,breakup;
   uniform vec3 eye,extent,center;varying vec3 exitPoint;
   float hash(vec3 p){p=fract(p*.1031+seed*.017);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   float tracedDistance(vec2 p){
    float d=100.,side=1.;vec2 previous=outline[outlineCount-1];
    for(int i=0;i<48;i++){if(i>=outlineCount)break;
     vec2 current=outline[i],edge=current-previous,w=p-previous;
     float t=clamp(dot(w,edge)/max(dot(edge,edge),.000001),0.,1.);
     d=min(d,length(w-edge*t));
     if((previous.y>p.y)!=(current.y>p.y)){
      float crossing=previous.x+(p.y-previous.y)*edge.x/edge.y;
      if(p.x<crossing)side=-side;
     }
     previous=current;
    }return d*side;
   }
   void main(){
    if(opacity<=0.)discard;
    vec3 ray=normalize(exitPoint-eye);
    // Advect the silhouette through a rising, curling flow before evaluating its shapes.
    // This bends entire flame tongues instead of merely flickering a fixed body outline.
    vec3 flowPoint=eye+ray*max(0.,dot(center-eye,ray));
    vec3 wind=flowPoint*vec3(13.,5.,13.)-vec3(0.,time*speed*5.,0.);
    float curl=noise(wind),lift=noise(wind*.67+vec3(17.,0.,9.));
    vec3 displacement=vec3((curl-.5)*turbulence*2.4,lift*turbulence*2.,(lift-.5)*turbulence);
    vec3 sourceEye=eye-displacement;
    // Closest approach to each tapered capsule, projected perpendicular to the ray.
    // One union evaluation per pixel, instead of marching the entire volume.
    float distanceToShape=10.,outlineDistance=10.;vec3 surface=center;
    if(outlineCount>0){
     // Traced contours live in the local XY plane; volume shapes remain available separately.
     if(abs(ray.z)<.0001)discard;
     float hit=-eye.z/ray.z;if(hit<0.)discard;
     surface=eye+ray*hit;
     outlineDistance=tracedDistance(surface.xy);
     distanceToShape=tracedDistance((surface-displacement).xy);
    }else for(int j=0;j<12;j++){if(j>=shapeCount)break;
     vec3 a=shapeStart[j].xyz,v=shapeEnd[j].xyz-a,offset=a-sourceEye;
     vec3 projectedV=v-ray*dot(v,ray),projectedOffset=offset-ray*dot(offset,ray);
     float t=clamp(-dot(projectedOffset,projectedV)/max(dot(projectedV,projectedV),.000001),0.,1.);
     // The unwarped silhouette masks interior pixels even when flow curls inward.
     vec3 baseOffset=a-eye;
     vec3 baseProjected=baseOffset-ray*dot(baseOffset,ray);
     float baseT=clamp(-dot(baseProjected,projectedV)/max(dot(projectedV,projectedV),.000001),0.,1.);
     float baseD=length(baseProjected+projectedV*baseT)-mix(shapeStart[j].w,shapeEnd[j].w,baseT);
     float baseH=max(.025-abs(outlineDistance-baseD),0.)/.025;
     outlineDistance=min(outlineDistance,baseD)-baseH*baseH*.00625;
     vec3 axisPoint=a+v*t;
     float alongRay=dot(axisPoint-sourceEye,ray);
     if(alongRay<=0.)continue;
     vec3 closest=sourceEye+ray*alongRay;
     float d=length(closest-axisPoint)-mix(shapeStart[j].w,shapeEnd[j].w,t);
     if(d<distanceToShape)surface=closest+displacement;
     float h=max(.025-abs(distanceToShape-d),0.)/.025;
     distanceToShape=min(distanceToShape,d)-h*h*.00625;
    }
    if(distanceToShape>.09||surface.y<floorHeight)discard;
    vec3 flow=surface*vec3(38.,7.,38.)-vec3(0.,time*speed*6.,0.);
    float n=noise(flow)*.65+noise(flow*2.03+13.)*.35;
    // Broad moving gaps erase whole regions, including the fill, not just the rim.
    float drift=noise(surface*vec3(7.,4.,7.)+vec3(time*speed*.7,-time*speed*1.9,0.));
    float islands=smoothstep(.34,.64,drift);
    float gaps=smoothstep(.30,.60,noise(flow*.32+vec3(curl*2.,0.,lift)));
    float visibility=mix(1.,islands*gaps,breakup);
    float warped=distanceToShape+(n-.5)*turbulence+(drift-.5)*breakup*.07;
    // Stretched rising noise tears the rim into tongues instead of tracing a clean line.
    float width=max(mix(.007,.024,n),fwidth(distanceToShape)*1.2);
    float contour=exp(-abs(warped)/width)*smoothstep(.24,.58,n);
    float wisps=exp(-abs(warped-.032)/.027)*smoothstep(.40,.75,n);
    // Fade in only on the outside of the silhouette; no interior flame sources.
    float outside=smoothstep(0.,.012,outlineDistance);
    float amount=contour*.65+wisps*.40;
    float alpha=(1.-exp(-amount*density*.035))*opacity*visibility*outside;
    alpha*=smoothstep(floorHeight,floorHeight+.025,surface.y);
    if(alpha<.002)discard;
    vec3 color=vec3(.004+edgeBrightness*(contour+wisps*.4)*(.55+n*.45));
    gl_FragColor=vec4(color,alpha);
    #include <colorspace_fragment>
   }`,
 });
 const mesh=new THREE.Mesh(geometry,material);mesh.name='Dark aura bounds';group.add(mesh);
 // This volume has no useful reflective surface; avoid SSR normal/depth proxy artifacts.
 mesh.userData.darkAura=true;
 const inverse=new THREE.Matrix4(),cameraWorld=new THREE.Vector3();
 mesh.onBeforeRender=(_renderer,_scene,camera,_geometry,passMaterial)=>{
  // SSR override passes must not mistake the proxy box for a solid object.
  geometry.setDrawRange(0,passMaterial===material?Infinity:0);
  inverse.copy(group.matrixWorld).invert();camera.getWorldPosition(cameraWorld);
  uniforms.eye.value.copy(cameraWorld).applyMatrix4(inverse);
 };
 mesh.onAfterRender=()=>geometry.setDrawRange(0,Infinity);
 const bounds=new THREE.Box3(),point=new THREE.Vector3();
 let disposed=false;
 return {
  group,
  /** Optional front-facing outline in local XY space; null returns to volume shapes. */
  setOutline(points:readonly THREE.Vector2[]|null){
   if(points&&(points.length<3||points.length>48))throw new RangeError('Aura outline requires 3–48 points');
   uniforms.outlineCount.value=points?.length??0;
   points?.forEach((p,i)=>uniforms.outline.value[i].copy(p));
   if(points){
    bounds.makeEmpty();
    for(const p of points)bounds.expandByPoint(point.set(p.x,p.y,0));
    bounds.expandByScalar(.22);bounds.max.y+=.24;
    bounds.getCenter(uniforms.center.value);bounds.getSize(uniforms.extent.value);
    mesh.position.copy(uniforms.center.value);mesh.scale.copy(uniforms.extent.value);
   }
  },
  setShapes(shapes:readonly AuraCapsule[]){
   if(shapes.length>MAX_SHAPES)throw new RangeError(`Dark aura supports at most ${MAX_SHAPES} capsules`);
   bounds.makeEmpty();uniforms.shapeCount.value=shapes.length;
   shapes.forEach((shape,i)=>{
    const r0=Math.max(.001,shape.startRadius),r1=Math.max(.001,shape.endRadius);
    starts[i].set(shape.start.x,shape.start.y,shape.start.z,r0);ends[i].set(shape.end.x,shape.end.y,shape.end.z,r1);
    for(const [p,r] of [[shape.start,r0],[shape.end,r1]] as const){
     bounds.expandByPoint(point.copy(p).addScalar(r));bounds.expandByPoint(point.copy(p).addScalar(-r));
    }
   });
   for(let i=0;i<uniforms.outlineCount.value;i++){
    const p=uniforms.outline.value[i];bounds.expandByPoint(point.set(p.x,p.y,0));
   }
   if(shapes.length||uniforms.outlineCount.value){
    bounds.expandByScalar(.22);bounds.max.y+=.24;
    bounds.getCenter(uniforms.center.value);bounds.getSize(uniforms.extent.value);
    mesh.position.copy(uniforms.center.value);mesh.scale.copy(uniforms.extent.value);
   }
  },
  setStyle(style:Partial<DarkAuraStyle>){
   if(style.breakup!==undefined)uniforms.breakup.value=THREE.MathUtils.clamp(style.breakup,0,1);
   if(style.density!==undefined)uniforms.density.value=THREE.MathUtils.clamp(style.density,0,100);
   if(style.turbulence!==undefined)uniforms.turbulence.value=THREE.MathUtils.clamp(style.turbulence,0,.12);
   if(style.speed!==undefined)uniforms.speed.value=THREE.MathUtils.clamp(style.speed,0,3);
   if(style.edgeBrightness!==undefined)uniforms.edgeBrightness.value=THREE.MathUtils.clamp(style.edgeBrightness,0,.2);
  },
  setFloor(height:number){uniforms.floorHeight.value=height;},
  update(seconds:number,opacity=1){
   uniforms.time.value=Number.isFinite(seconds)?Math.max(0,seconds):0;
   uniforms.opacity.value=THREE.MathUtils.clamp(opacity,0,1);
   group.visible=!disposed&&(uniforms.shapeCount.value>0||uniforms.outlineCount.value>0)&&uniforms.opacity.value>0;
  },
  dispose(){if(disposed)return;disposed=true;group.removeFromParent();geometry.dispose();material.dispose();},
 };
}
