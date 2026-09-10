import type { EffectMode } from './scene/aura';
import { useEffect, useRef, useState } from 'react';
import { SwordViewer } from './SwordViewer';
import type { MotionStatus } from './scene/swordPhysics';

export default function App() {
  const [settingsOpen,setSettingsOpen]=useState(false);
  const settingsButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!settingsOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setSettingsOpen(false);settingsButton.current?.focus();}};
    window.addEventListener('keydown',close);return ()=>window.removeEventListener('keydown',close);
  },[settingsOpen]);
  const [effect,setEffect]=useState<EffectMode>('electric');
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
    <button ref={settingsButton} className="settings-toggle" aria-label={settingsOpen?'Close settings':'Open settings'} aria-expanded={settingsOpen} aria-controls="sword-settings" onClick={()=>setSettingsOpen(open=>!open)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {settingsOpen?<path d="m6 6 12 12M18 6 6 18"/>:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/></>}
      </svg>
    </button>
    {settingsOpen&&<aside id="sword-settings" className="settings-panel" aria-label="Sword settings">
      <h2 className="settings-heading">Settings</h2>
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
          <option value="off">Off</option><option value="glow">Glow & sparks</option><option value="flame">Flame</option><option value="ice">Ice</option><option value="electric">Electric</option>
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
      <details className="sword-info"><summary>About this sword &amp; controls</summary>
        <h3>Steel longsword</h3><p>Tempered steel. Wrapped leather. Simple fittings.</p>
        <p>Drag to rotate · Arrow keys to move · Right-drag or two-finger drag to pan · Pinch or scroll to zoom</p>
        <p className="study-credit">AETHER / FORGE · SWORD STUDY 001</p>
      </details>
    </aside>}
  </main>;
}
