import {Vector2} from 'three';
import {ShaderPass} from 'three/addons/postprocessing/ShaderPass.js';

// Spatial reconstruction at native output resolution; no temporal history or AI inference.
export function createSpatialUpscale(){
 const pass=new ShaderPass({
  uniforms:{tDiffuse:{value:null},inputSize:{value:new Vector2(1,1)},sharpness:{value:.12}},
  vertexShader:`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
  fragmentShader:`
   uniform sampler2D tDiffuse;uniform vec2 inputSize;uniform float sharpness;varying vec2 vUv;
   vec4 weights(float t){
    float t2=t*t,t3=t2*t;
    return vec4(-.5*t+t2-.5*t3,1.-2.5*t2+1.5*t3,.5*t+2.*t2-1.5*t3,-.5*t2+.5*t3);
   }
   void main(){
    vec2 p=vUv*inputSize-.5,base=floor(p),f=fract(p);
    vec4 wx=weights(f.x),wy=weights(f.y);
    vec3 color=vec3(0.),lo=vec3(1.e10),hi=vec3(-1.e10);
    for(int y=0;y<4;y++)for(int x=0;x<4;x++){
     vec2 pixel=clamp(base+vec2(float(x)-1.,float(y)-1.)+.5,vec2(.5),inputSize-.5);
     vec3 c=texture2D(tDiffuse,pixel/inputSize).rgb;
     color+=c*wx[x]*wy[y];
     if(x>=1&&x<=2&&y>=1&&y<=2){lo=min(lo,c);hi=max(hi,c);}
    }
    // Limit sharpening to the surrounding samples so dark blades do not grow bright halos.
    vec3 linear=texture2D(tDiffuse,vUv).rgb;
    color=clamp(color+(color-linear)*sharpness,lo,hi);
    gl_FragColor=vec4(color,1.);
   }`
 });
 pass.material.toneMapped=false;pass.enabled=false;return pass;
}
