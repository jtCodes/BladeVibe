import * as THREE from 'three';

// Ray-march one shared 3D density field around the blade. The proxy box is
// only a bound: it contributes no visible surface or camera-facing sheet.
export function createContinuousFire(shared:Record<string,THREE.IUniform>) {
 const group=new THREE.Group();
 const uniforms={...shared,volumeWorld:{value:new THREE.Matrix4()},eye:{value:new THREE.Vector3()}};
 const geometry=new THREE.BoxGeometry(2.4,6.6,2.2);geometry.translate(0,2.2,0);
 const material=new THREE.ShaderMaterial({uniforms,transparent:true,depthTest:false,depthWrite:false,side:THREE.BackSide,blending:THREE.AdditiveBlending,
  vertexShader:`varying vec3 exitPoint;
   void main(){exitPoint=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`uniform float intensity;uniform float time;uniform float exposed;uniform mat4 volumeWorld;uniform float floorY;uniform vec3 eye;uniform vec3 upLocal;uniform vec3 lagRoot;uniform vec3 lagTip;varying vec3 exitPoint;
   float hash(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
   float noise(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
    return mix(mix(mix(hash(i),hash(i+vec3(1,0,0)),f.x),mix(hash(i+vec3(0,1,0)),hash(i+vec3(1,1,0)),f.x),f.y),
     mix(mix(hash(i+vec3(0,0,1)),hash(i+vec3(1,0,1)),f.x),mix(hash(i+vec3(0,1,1)),hash(i+vec3(1,1,1)),f.x),f.y),f.z);}
   float fbm(vec3 p){return noise(p)*.57+noise(p*2.07+17.3)*.28+noise(p*4.13+31.7)*.15;}
   float bladeWidth(float y){
    if(y<.55)return .1755;
    if(y<.84)return mix(.1755,.17095,(y-.55)/.29);
    if(y<3.84)return mix(.17095,.13325,(y-.84)/3.);
    if(y<4.52)return mix(.13325,.0845,(y-3.84)/.68);
    return mix(.0845,.000325,clamp((y-4.52)/.5,0.,1.));
   }
   void main(){
    vec3 ray=normalize(exitPoint-eye);
    vec3 safeRay=vec3(ray.x>=0.?max(ray.x,.00001):min(ray.x,-.00001),ray.y>=0.?max(ray.y,.00001):min(ray.y,-.00001),ray.z>=0.?max(ray.z,.00001):min(ray.z,-.00001));
    vec3 a=(vec3(-1.2,-1.1,-1.1)-eye)/safeRay,b=(vec3(1.2,5.5,1.1)-eye)/safeRay;
    vec3 lo=min(a,b),hi=max(a,b);
    float start=max(0.,max(lo.x,max(lo.y,lo.z))),end=min(hi.x,min(hi.y,hi.z));
    if(end<=start)discard;
    float stepSize=(end-start)/44.;
    float jitter=hash(vec3(gl_FragCoord.xy,0.));
    vec3 light=vec3(0.);float opacity=0.;
    for(int i=0;i<44;i++){
     vec3 p=eye+ray*(start+(float(i)+jitter)*stepSize);
     // Clip the integrated ray at the floor and opaque steel, rather than
     // depth-testing the far face of the volume (which cuts off grounded fire).
     if((volumeWorld*vec4(p,1.)).y<floorY+.003)break;
     if(p.y>.10&&p.y<5.02&&abs(p.x)<bladeWidth(p.y)&&abs(p.z)<.017)break;
     // Backtrace outward wisps toward their source. Roots remain attached;
     // tips lean upward and trail the sword's smoothed translation/rotation.
     float actualBladeY=p.y;
     float nearWidth=bladeWidth(clamp(p.y,0.,5.));
     float outward=length(vec2(max(abs(p.x)-nearWidth,0.),max(abs(p.z)-.018,0.)));
     float age=smoothstep(.025,.45,outward);
     vec3 lag=mix(lagRoot,lagTip,clamp(p.y/5.,0.,1.));
     p-=(upLocal*.34+lag)*age;
     // Fade along the upper blade before reaching the guard; stagger the
     // tips so the fade stays soft without climbing toward the handle.
     float crest=noise(vec3(p.x*5.,time*.7,p.z*5.))*.28;
     float guardFade=smoothstep(.38+crest*.35,1.05,p.y);
     float gripClearance=mix(smoothstep(.125,.21,length(p.xz)),1.,smoothstep(-.02,.12,p.y));
     float ends=gripClearance*(1.-smoothstep(4.8,5.,p.y));
     float reveal=1.-smoothstep(exposed-.035,exposed,p.y);
     if(ends*reveal<.001)continue;
     float width=bladeWidth(p.y);
     // Distance from the thin, broad steel cross-section, in all directions.
     vec2 d=vec2(max(abs(p.x)-width,0.),max(abs(p.z)-.018,0.));
     float radius=length(d);
     if(radius>.68)continue;
     // Small surface flickers bridge the upper fade, stopping below the guard.
     float flicker=.20+.12*noise(vec3(p.y*18.,time*3.,p.x*14.));
     float tiny=(1.-smoothstep(.018,.075,radius))*smoothstep(.045,.14,actualBladeY)*flicker;
     ends*=max(guardFade,tiny);
     // Stretch the turbulence along the rising flow, while keeping narrow
     // crosswise detail. Sharply eroded tongues replace soft billowing density.
     vec3 advected=p-upLocal*time*.95;
     vec3 helper=abs(upLocal.z)<.9?vec3(0.,0.,1.):vec3(1.,0.,0.);
     vec3 across=normalize(cross(upLocal,helper));vec3 depth=cross(across,upLocal);
     float rise=dot(advected,upLocal);
     vec3 flow=vec3(dot(advected,across)*11.,rise*1.65,dot(advected,depth)*11.);
     float bend=sin(rise*4.6+p.x*5.)*radius*2.7;
     flow.x+=bend;flow.z+=cos(rise*3.1+p.z*6.)*radius*1.5;
     float ribbons=fbm(flow);
     float large=fbm((p-upLocal*time*.65)*vec3(3.2,2.1,3.2));
     float taper=smoothstep(.0,.10,width);
     // Intermittent flares leave open air between brighter burning sections.
     float flare=smoothstep(.38,.64,large);
     float reach=(.12+.48*flare)*taper;
     float edge=1.-smoothstep(reach-.025,reach,radius);
     float distanceRatio=radius/max(reach,.001);
     float threshold=mix(.40,.66,pow(clamp(distanceRatio,0.,1.),.8));
     float tongues=smoothstep(threshold,threshold+.065,ribbons);
     float root=1.-smoothstep(.018,.065,radius);
     // Narrow curling filaments wind around the steel in 3D, with
     // bright centers and red skirts rather than a filled orange envelope.
     float angle=atan(p.z,p.x);
     float phase=angle*2.5+p.y*5.2-time*2.4+sin(p.y*2.7-time*1.1)*1.3;
     float winding=.5+.5*sin(phase+radius*7.);
     float filament=pow(winding,18.);
     float filigree=filament*smoothstep(.025,.10,radius)*(1.-smoothstep(.28,.57,radius));
     float density=edge*max(root*.55,tongues*flare*.52+filigree*.8)*ends*reveal;
     float heat=clamp(root*.75+filament*.55+tongues*.16,0.,1.);
     vec3 color=mix(vec3(3.2,.008,.001),vec3(4.,.32,.006),smoothstep(.10,.65,heat));
     color=mix(color,vec3(5.5,3.3,.7),smoothstep(.65,1.,heat));
     float alpha=1.-exp(-density*stepSize*4.2);
     light+=(1.-opacity)*color*alpha;opacity+=(1.-opacity)*alpha;
    }
    if(opacity<.002)discard;
    gl_FragColor=vec4(light/max(opacity,.001)*intensity,opacity*.70);
   }`});
 const mesh=new THREE.Mesh(geometry,material);
 const inverse=new THREE.Matrix4();
 mesh.onBeforeRender=(_renderer,_scene,camera)=>{
  uniforms.volumeWorld.value.copy(mesh.matrixWorld);
  inverse.copy(mesh.matrixWorld).invert();camera.getWorldPosition(uniforms.eye.value);uniforms.eye.value.applyMatrix4(inverse);
 };
 group.add(mesh);return group;
}
