import {Vector3,MathUtils} from 'three';
import type {OutputPass} from 'three/addons/postprocessing/OutputPass.js';

export interface ColorGradeSettings {
 strength:number;saturation:number;contrast:number;
 shadows:readonly [number,number,number];highlights:readonly [number,number,number];
}
export const NEUTRAL_COLOR_GRADE:Readonly<ColorGradeSettings>={strength:0,saturation:1,contrast:1,shadows:[1,1,1],highlights:[1,1,1]};
export const BANKAI_COLOR_GRADE:Readonly<ColorGradeSettings>={strength:.8,saturation:.98,contrast:1.025,shadows:[.88,.96,1.13],highlights:[1.02,1.01,1.]};

/** Reusable scene grading, fused into OutputPass after tone mapping and before sRGB conversion.
 * No extra render target, draw call, grain, vignette, or changes to HTML overlays.
 * Call set(null) to bypass, or set({...BANKAI_COLOR_GRADE,strength:.5}) to tune.
 */
export function attachColorGrade(output:OutputPass){
 const marker='// color space';
 if(!output.material.fragmentShader.includes(marker))throw new Error('Color grading requires the OutputPass color-space stage');
 if('sceneGradeStrength' in output.uniforms)throw new Error('Color grading is already attached');
 const uniforms={
  sceneGradeStrength:{value:0},sceneGradeSaturation:{value:1},sceneGradeContrast:{value:1},
  sceneGradeShadows:{value:new Vector3(1,1,1)},sceneGradeHighlights:{value:new Vector3(1,1,1)},
 };
 Object.assign(output.uniforms,uniforms);
 output.material.fragmentShader=output.material.fragmentShader.replace('uniform sampler2D tDiffuse;',`uniform sampler2D tDiffuse;
 uniform float sceneGradeStrength,sceneGradeSaturation,sceneGradeContrast;
 uniform vec3 sceneGradeShadows,sceneGradeHighlights;`)
 .replace(marker,`
 if(sceneGradeStrength>0.){
  vec3 original=gl_FragColor.rgb;
  vec3 graded=pow(max(original,vec3(0.)),vec3(sceneGradeContrast));
  float luminance=dot(graded,vec3(.2126,.7152,.0722));
  graded*=mix(sceneGradeShadows,sceneGradeHighlights,smoothstep(.015,.65,luminance));
  luminance=dot(graded,vec3(.2126,.7152,.0722));
  graded=mix(vec3(luminance),graded,sceneGradeSaturation);
  gl_FragColor.rgb=mix(original,max(graded,vec3(0.)),sceneGradeStrength);
 }
 ${marker}`);
 output.material.needsUpdate=true;
 const finite=(value:number,fallback:number,min:number,max:number)=>Number.isFinite(value)?MathUtils.clamp(value,min,max):fallback;
 return {
  set(settings:Partial<ColorGradeSettings>|null){
   const grade={...NEUTRAL_COLOR_GRADE,...settings};
   uniforms.sceneGradeStrength.value=finite(grade.strength,0,0,1);
   uniforms.sceneGradeSaturation.value=finite(grade.saturation,1,0,2);
   uniforms.sceneGradeContrast.value=finite(grade.contrast,1,.5,2);
   uniforms.sceneGradeShadows.value.fromArray(grade.shadows.map(v=>finite(v,1,.5,1.5)));
   uniforms.sceneGradeHighlights.value.fromArray(grade.highlights.map(v=>finite(v,1,.5,1.5)));
  },
 };
}
