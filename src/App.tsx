import type { EffectMode } from './scene/aura';
import { useState } from 'react';
import { SwordViewer } from './SwordViewer';
import type { MotionStatus } from './scene/swordPhysics';

export default function App() {
  const [effect,setEffect]=useState<EffectMode>('ice');
  const [effectIntensity,setEffectIntensity]=useState(100);
  const [effectSpeed,setEffectSpeed]=useState(1);
  const [reflections,setReflections]=useState(true);
  const [cameraHeight,setCameraHeight]=useState(0);
  const [lightAngle,setLightAngle]=useState(20);
  const [rotating, setRotating] = useState(() => !window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [resetVersion, setResetVersion] = useState(0);
  const [draw,setDraw]=useState(100);
  const [dropVersion,setDropVersion]=useState(0);
  const [status,setStatus]=useState<MotionStatus>('sheathed');
  const dropped=status==='falling'||status==='resting';

  return <main>
    <SwordViewer effect={effect} effectSpeed={effectSpeed} effectIntensity={effectIntensity/100} cameraHeight={cameraHeight} rotating={rotating} resetVersion={resetVersion} draw={draw} reflections={reflections} lightAngle={lightAngle} dropVersion={dropVersion} onStatus={setStatus} />
    <header><a className="brand" href="./">AETHER<span> / </span>FORGE</a><span className="study">SWORD STUDY · 001</span></header>
    <section className="identity"><div className="eyebrow">STEEL & LEATHER</div><h1>Steel longsword</h1><p>Tempered steel. Wrapped leather. Simple fittings.</p></section>
    <aside>
      <div className="panel-title">INSPECT THE BLADE</div>
      <div className="motion-panel">
        <label className="range-label" htmlFor="draw">Draw sword <output>{draw}%</output></label>
        <input id="draw" type="range" min={0} max={100} value={draw} disabled={dropped} onChange={event=>setDraw(Number(event.target.value))}/>
        <div className="actions"><button disabled={dropped} onClick={()=>setDraw(draw===100?0:100)}>{draw===100?'Sheathe':'Draw'}</button><button disabled={status!=='drawn'} onClick={()=>{setRotating(false);setDropVersion(v=>v+1)}}>Drop sword</button></div>
        <p className="motion-status" role="status">{{sheathed:'Sheathed',drawing:'Guided draw',drawn:'Drawn · ready to release',falling:'Falling',resting:'At rest'}[status]}</p>
        {dropped&&<button className="restore" onClick={()=>setResetVersion(v=>v+1)}>Return to display</button>}
      </div>
      <div className="lighting-controls effects-controls">
        <label className="range-label" htmlFor="effect-mode">Effects</label>
        <select id="effect-mode" value={effect} onChange={event=>setEffect(event.target.value as EffectMode)}>
          <option value="off">Off</option><option value="glow">Glow & sparks</option><option value="flame">Flame</option><option value="ice">Ice</option>
        </select>
        <label className="range-label" htmlFor="effect-intensity">Effect intensity <output>{effectIntensity}%</output></label>
        <input id="effect-intensity" type="range" min={0} max={200} step={5} value={effectIntensity} disabled={effect==='off'} onChange={event=>setEffectIntensity(Number(event.target.value))}/>
        <label className="range-label" htmlFor="effect-speed">Effect speed <output>{effectSpeed===0?'Paused':`${effectSpeed.toFixed(1)}×`}</output></label>
        <input id="effect-speed" type="range" min={0} max={3} step={.1} value={effectSpeed} disabled={effect==='off'} onChange={event=>setEffectSpeed(Number(event.target.value))}/>
      </div>
      <div className="lighting-controls">
        <label className="range-label" htmlFor="light-angle">Studio light angle <output>{lightAngle}°</output></label>
        <input id="light-angle" type="range" min={0} max={360} value={lightAngle} onChange={event=>setLightAngle(Number(event.target.value))}/>
        <label className="reflection-toggle"><input type="checkbox" checked={reflections} onChange={event=>setReflections(event.target.checked)}/>Local reflections</label>
      </div>
      <div className="lighting-controls">
        <label className="range-label" htmlFor="camera-height">Move camera vertically <output>{cameraHeight.toFixed(1)}</output></label>
        <input id="camera-height" type="range" min={-8} max={8} step={.1} value={cameraHeight} onChange={event=>setCameraHeight(Number(event.target.value))}/>
        <div className="actions"><button onClick={()=>setCameraHeight(v=>Math.min(8,v+.5))}>Move up</button><button onClick={()=>setCameraHeight(v=>Math.max(-8,v-.5))}>Move down</button></div>
      </div>
      <div className="actions"><button id="spin" aria-pressed={rotating} onClick={() => setRotating(value => !value)}>{rotating ? 'Pause rotation' : 'Resume rotation'}</button><button id="reset" onClick={() => {setCameraHeight(0);setResetVersion(value => value + 1)}}>Reset view</button></div>
    </aside>
    <footer><span>Drag to rotate · Right-drag or two-finger drag to pan · Pinch or scroll to zoom</span><span className="render-note">LIVE 3D / PROCEDURAL GEOMETRY</span></footer>
  </main>;
}
