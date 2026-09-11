import type { EffectMode } from './scene/aura';
import { useEffect, useRef, useState } from 'react';
import { SwordViewer } from './SwordViewer';
import type { MotionStatus } from './scene/swordPhysics';

import type { SwordAsset } from './swordLibrary';
import { AppLink } from './navigation';

export default function SwordEditor({sword}:{sword:SwordAsset}) {
  const [glowStrength,setGlowStrength]=useState(.42);
  const [glowSpread,setGlowSpread]=useState(.8);
  const [petalGlow,setPetalGlow]=useState(4);
  const [upscaling,setUpscaling]=useState<'native'|'ultra'|'quality'>('ultra');
  const [dragTarget,setDragTarget]=useState<'sword'|'camera'>('sword');
  const [settingsOpen,setSettingsOpen]=useState(false);
  const [showPerformance,setShowPerformance]=useState(false);
  const [antiAliasing,setAntiAliasing]=useState<'standard'|'smooth'|'high'>('smooth');
  const settingsButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!settingsOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setSettingsOpen(false);settingsButton.current?.focus();}};
    window.addEventListener('keydown',close);return ()=>window.removeEventListener('keydown',close);
  },[settingsOpen]);
  const [effect,setEffect]=useState<EffectMode>(sword.effect);
  const [effectIntensity,setEffectIntensity]=useState(sword.effectIntensity);
  const [effectSpeed,setEffectSpeed]=useState(sword.effectSpeed);
  const [reflections,setReflections]=useState(sword.reflections);
  const [cameraHeight,setCameraHeight]=useState(0);
  const [showSheath,setShowSheath]=useState(true);
  const [swordRotation,setSwordRotation]=useState(0);
  const [lightAngle,setLightAngle]=useState(sword.lightAngle);
  const [lighting,setLighting]=useState({brightness:1,key:1,fill:1,rim:1,ambient:1});
  const [floorColor,setFloorColor]=useState('#141413');
  const [backgroundColor,setBackgroundColor]=useState('#141413');
  const [rotating, setRotating] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [resetVersion, setResetVersion] = useState(0);
  const [draw,setDraw]=useState(100);
  const [dropVersion,setDropVersion]=useState(0);
  const [status,setStatus]=useState<MotionStatus>('sheathed');
  const dropped=status==='falling'||status==='resting';
  const bankaiActive=effect==='bankai';
  const clothWrapped=sword.model==='zangetsu';
  const tensaActive=clothWrapped&&bankaiActive;
  const bankaiCinematic=bankaiActive&&!clothWrapped;
  const hasSheath=!tensaActive;


  return <main>
    <AppLink className="gallery-back" href="/">← Gallery</AppLink>
    <SwordViewer glowStrength={glowStrength} glowSpread={glowSpread} petalGlow={petalGlow} upscaling={upscaling} dragTarget={dragTarget} antiAliasing={antiAliasing} showPerformance={showPerformance} model={tensaActive?'tensa-zangetsu':sword.model} floorColor={floorColor} backgroundColor={backgroundColor} effect={tensaActive?'off':effect} effectSpeed={effectSpeed} effectIntensity={effectIntensity/100} cameraHeight={cameraHeight} showSheath={showSheath} swordRotation={swordRotation} rotating={rotating} resetVersion={resetVersion} draw={draw} reflections={reflections} lightAngle={lightAngle} lighting={lighting} dropVersion={dropVersion} onStatus={setStatus} />
    <button ref={settingsButton} className="settings-toggle" aria-label={settingsOpen?'Close settings':'Open settings'} aria-expanded={settingsOpen} aria-controls="sword-settings" onClick={()=>setSettingsOpen(open=>!open)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {settingsOpen?<path d="m6 6 12 12M18 6 6 18"/>:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/></>}
      </svg>
    </button>
    {settingsOpen&&<aside id="sword-settings" className="settings-panel" aria-label="Sword settings">
      <h2 className="settings-heading">Settings</h2>
      <label className="reflection-toggle"><input type="checkbox" checked={showPerformance} onChange={event=>setShowPerformance(event.target.checked)}/>Performance meter</label>
      <div className="lighting-controls effects-controls">
        <label className="range-label" htmlFor="upscaling">Upscaling</label>
        <select id="upscaling" value={upscaling} onChange={event=>setUpscaling(event.target.value as typeof upscaling)}>
          <option value="native">Native · reference</option><option value="ultra">Ultra quality · 90%</option><option value="quality">Quality · 85%</option>
        </select>
        <p className="motion-status">Full-resolution output. Compare Native for fine edges and moving petals.</p>
        <label className="range-label" htmlFor="anti-aliasing">Edge smoothing</label>
        <select id="anti-aliasing" value={antiAliasing} onChange={event=>setAntiAliasing(event.target.value as typeof antiAliasing)}>
          <option value="standard">Standard</option><option value="smooth">Smooth</option><option value="high">High · extra resolution</option>
        </select>
        <p className="motion-status">High renders 56% more pixels. Smooth may soften fine detail.</p>
      </div>
      <div className="lighting-controls effects-controls">
        <label className="range-label" htmlFor="drag-target">Left-drag controls</label>
        <select id="drag-target" value={dragTarget} onChange={event=>setDragTarget(event.target.value as typeof dragTarget)}><option value="sword">Sword</option><option value="camera">Camera</option></select>
        <p className="motion-status">Sword rotation is available when drawn and on display. Right-drag pans the camera; scroll zooms.</p>
      </div>
      <div className="motion-panel">
        {hasSheath&&<label className="reflection-toggle"><input type="checkbox" checked={showSheath} disabled={bankaiCinematic} onChange={event=>setShowSheath(event.target.checked)}/>{clothWrapped?'Show blade wrapping':'Show sheath'}</label>}
        <label className="range-label" htmlFor="sword-rotation">Rotate sword <output>{swordRotation}°</output></label>
        <input id="sword-rotation" type="range" min={-180} max={180} step={1} value={swordRotation} disabled={status!=='drawn'||bankaiCinematic} onChange={event=>{setRotating(false);setSwordRotation(Number(event.target.value))}}/>
        <div className="actions"><button disabled={status!=='drawn'||bankaiCinematic} onClick={()=>{setRotating(false);setSwordRotation(180)}}>Blade up</button><button disabled={dropped||bankaiCinematic} onClick={()=>setSwordRotation(0)}>Reset sword angle</button></div>
        {hasSheath&&<><label className="range-label" htmlFor="draw">{clothWrapped?'Unwrap blade':'Draw sword'} <output>{draw}%</output></label>
        <input id="draw" type="range" min={0} max={100} value={draw} disabled={dropped||bankaiCinematic} onChange={event=>{setEffect(current=>current==='shikai'?'off':current);setSwordRotation(0);setDraw(Number(event.target.value))}}/>
        </>}
        <div className="actions">{hasSheath&&<button disabled={dropped||bankaiCinematic} onClick={()=>{setEffect(current=>current==='shikai'?'off':current);setSwordRotation(0);setDraw(draw===100?0:100)}}>{clothWrapped?(draw===100?'Wrap blade':'Unwrap blade'):(draw===100?'Sheathe':'Draw')}</button>}<button disabled={status!=='drawn'||effect==='shikai'||bankaiCinematic} onClick={()=>{setRotating(false);setDropVersion(v=>v+1)}}>Drop sword</button></div>
        <p className="motion-status" role="status">{bankaiCinematic?'Bankai release':tensaActive&&!dropped?'Tensa Zangetsu · ready to release':clothWrapped&&!dropped?(draw===0?'Cloth wrapped':draw===100?'Unwrapped · ready to release':'Partially unwrapped'):{sheathed:'Sheathed',drawing:'Guided draw',drawn:'Drawn · ready to release',falling:'Falling',resting:'At rest'}[status]}</p>
        {dropped&&<button className="restore" onClick={()=>setResetVersion(v=>v+1)}>Return to display</button>}
      </div>
      {clothWrapped&&<div className="lighting-controls effects-controls"><button aria-pressed={tensaActive} disabled={dropped} onClick={()=>{setSwordRotation(0);setEffect(tensaActive?'off':'bankai')}}>{tensaActive?'Return to Zangetsu':'Bankai · Tensa Zangetsu'}</button></div>}
      {sword.model!=='zangetsu'&&<div className="lighting-controls effects-controls">
        {sword.model==='senbonzakura'?<><button aria-pressed={effect==='shikai'} disabled={dropped||bankaiCinematic} onClick={()=>{setDraw(100);setEffect(effect==='shikai'?'off':'shikai')}}>{effect==='shikai'?'Reform blade':'Shikai · Scatter'}</button>
        <button aria-pressed={bankaiActive} disabled={dropped} onClick={()=>{setRotating(false);setDraw(100);setEffect(bankaiActive?'off':'bankai')}}>{bankaiActive?'Restore sword':'Bankai · Release'}</button>
        {bankaiActive&&<p className="motion-status">Sword sinks → blade rows rise → petals scatter</p>}
        </>:<>
        <label className="range-label" htmlFor="effect-mode">Effects</label>
        <select id="effect-mode" value={effect} onChange={event=>setEffect(event.target.value as EffectMode)}>
          <option value="off">Off</option><option value="glow">Glow & sparks</option><option value="flame">Flame</option><option value="ice">Ice</option><option value="electric">Electric</option>
        </select></>}
        <label className="range-label" htmlFor="effect-intensity">Effect intensity <output>{effectIntensity}%</output></label>
        <input id="effect-intensity" type="range" min={0} max={200} step={5} value={effectIntensity} disabled={effect==='off'} onChange={event=>setEffectIntensity(Number(event.target.value))}/>
        {sword.model==='senbonzakura'&&<>
          <label className="range-label" htmlFor="glow-strength">Bankai glow strength <output>{Math.round(glowStrength*100)}%</output></label>
          <input id="glow-strength" type="range" min={0} max={1.5} step={.01} value={glowStrength} onChange={event=>setGlowStrength(Number(event.target.value))}/>
          <label className="range-label" htmlFor="glow-spread">Glow spread <output>{Math.round(glowSpread*100)}%</output></label>
          <input id="glow-spread" type="range" min={0} max={1} step={.01} value={glowSpread} onChange={event=>setGlowSpread(Number(event.target.value))}/>
          <label className="range-label" htmlFor="petal-glow">Petal glow <output>{petalGlow.toFixed(1)}×</output></label>
          <input id="petal-glow" type="range" min={0} max={8} step={.1} value={petalGlow} onChange={event=>setPetalGlow(Number(event.target.value))}/>
        </>}
        <label className="range-label" htmlFor="effect-speed">Effect speed <output>{effectSpeed===0?'Paused':`${effectSpeed.toFixed(1)}×`}</output></label>
        <input id="effect-speed" type="range" min={0} max={3} step={.1} value={effectSpeed} disabled={effect==='off'} onChange={event=>setEffectSpeed(Number(event.target.value))}/>
      </div>}
      <div className="lighting-controls">
        <label className="floor-color-control" htmlFor="background-color">Background color <input id="background-color" type="color" value={backgroundColor} onChange={event=>setBackgroundColor(event.target.value)}/></label>
        <label className="floor-color-control" htmlFor="floor-color">Floor color <input id="floor-color" type="color" value={floorColor} onChange={event=>setFloorColor(event.target.value)}/></label>
        <label className="range-label" htmlFor="light-angle">Studio light angle <output>{lightAngle}°</output></label>
        <input id="light-angle" type="range" min={0} max={360} value={lightAngle} onChange={event=>setLightAngle(Number(event.target.value))}/>
        {([
          ['brightness','Brightness',25,250],
          ['key','Main light',0,400],
          ['fill','Fill light',0,500],
          ['rim','Rim light',0,400],
          ['ambient','Ambient light',0,400],
        ] as const).map(([control,label,min,max])=><div key={control}>
          <label className="range-label" htmlFor={`lighting-${control}`}>{label} <output>{Math.round(lighting[control]*100)}%</output></label>
          <input id={`lighting-${control}`} type="range" min={min} max={max} step={5} value={Math.round(lighting[control]*100)} onChange={event=>setLighting(current=>({...current,[control]:Number(event.target.value)/100}))}/>
        </div>)}
        <button onClick={()=>{setLighting({brightness:1,key:1,fill:1,rim:1,ambient:1});setLightAngle(sword.lightAngle)}}>Reset lighting</button>
        <label className="reflection-toggle"><input type="checkbox" checked={reflections} onChange={event=>setReflections(event.target.checked)}/>Local reflections</label>
      </div>
      <div className="lighting-controls">
        <label className="range-label" htmlFor="camera-height">Move camera vertically <output>{cameraHeight.toFixed(1)}</output></label>
        <input id="camera-height" type="range" min={-8} max={8} step={.1} value={cameraHeight} onChange={event=>setCameraHeight(Number(event.target.value))}/>
        <div className="actions"><button onClick={()=>setCameraHeight(v=>Math.min(8,v+.5))}>Move up</button><button onClick={()=>setCameraHeight(v=>Math.max(-8,v-.5))}>Move down</button></div>
      </div>
      <div className="actions"><button id="spin" aria-pressed={rotating} onClick={() => setRotating(value => !value)}>{rotating ? 'Pause rotation' : 'Resume rotation'}</button><button id="reset" onClick={() => {setCameraHeight(0);if(bankaiCinematic)setEffect('off');setResetVersion(value => value + 1)}}>Reset view</button></div>
      <details className="sword-info"><summary>About this sword &amp; controls</summary>
        <h3>{sword.name}</h3><p>{sword.description}</p>
        <p>Left-drag follows your selected mode · Arrow keys to move · Right-drag or two-finger drag to pan · Pinch or scroll to zoom</p>
        <p className="study-credit">AETHER / FORGE · SWORD STUDY 001</p>
      </details>
    </aside>}
  </main>;
}
