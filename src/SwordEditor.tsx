import {IconButton,SceneHeader,SceneOverlay} from './SceneControls';
import {useBankaiVoice} from './useBankaiVoice';
import {BankaiTitle} from './BankaiTitle';
import {SwordReplayControls} from './SwordReplayControls';
import {SwordSheathToggle,SwordEffectSelect,SwordDrawSlider,BankaiVariantSelect} from './SwordDisplayOptions';
import {SceneOptions} from './SceneOptions';
import {StudyIcon} from './StudyIcon';
import {readSwordPageState,swordSharePath,normalizeSwordState,type SwordShareState} from './swordShare';
import type {SwordViewRequest} from './scene/swordViewState';
import {EffectTimelineControls} from './EffectTimelineControls';
import {EditorSettingsSection} from './EditorSettingsSection';
import {PrecisionControl} from './PrecisionControl';
import {DEFAULT_LIGHTING,LIGHTING_CONTROLS,normalizeLightingSettings} from './scene/lightingSettings';
import type {SwordScene,EffectSeekRequest,TimelineEffect} from './scene/createSwordScene';
import type { EffectMode } from './scene/aura';
import { useEffect, useRef, useState, type SetStateAction } from 'react';
import { SwordViewer } from './SwordViewer';
import type { MotionStatus } from './scene/swordPhysics';

import {swordUrl,swordFormEffect,type SwordForm,type SwordAsset} from './swordLibrary';
import { navigate } from './navigation';

export default function SwordEditor({sword,active=true,editing=true,shareHash='',routeForm}:{sword:SwordAsset;active?:boolean;editing?:boolean;shareHash?:string;routeForm?:SwordForm}) {
  const [initialShare]=useState(()=>readSwordPageState(sword,shareHash,routeForm));
  const initial=initialShare.state;
  const [viewState,setViewState]=useState<SwordViewRequest|undefined>(initial.view);
  const [invalidShare,setInvalidShare]=useState(initialShare.invalid);
  const [shareUrl,setShareUrl]=useState(''),[shareMessage,setShareMessage]=useState('');
  const viewerScene=useRef<SwordScene|null>(null);
  const [effectPaused,setEffectPaused]=useState(initial.paused);
  const [glowStrength,setGlowStrength]=useState(initial.glowStrength);
  const [glowSpread,setGlowSpread]=useState(initial.glowSpread);
  const [petalGlow,setPetalGlow]=useState(initial.petalGlow);
  const [bankaiPetalMotion,setBankaiPetalMotion]=useState(initial.bankaiPetalMotion);
  const [upscaling,setUpscaling]=useState<'native'|'ultra'|'quality'>('ultra');
  const [dragTarget,setDragTarget]=useState<'sword'|'camera'>('sword');
  const [settingsOpen,setSettingsOpen]=useState(true);
  const [showPerformance,setShowPerformance]=useState(false);
  const [antiAliasing,setAntiAliasing]=useState<'standard'|'smooth'|'high'>('smooth');
  const settingsButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{
    if(!active||!editing||!settingsOpen)return;
    const close=(event:KeyboardEvent)=>{if(event.key==='Escape'){setSettingsOpen(false);settingsButton.current?.focus();}};
    window.addEventListener('keydown',close);return ()=>window.removeEventListener('keydown',close);
  },[active,editing,settingsOpen]);
  const [effect,setEffectState]=useState<EffectMode>(initial.effect);
  const [timelineEffect,setTimelineEffect]=useState<TimelineEffect>(initial.effect==='shikai'?'shikai':'bankai');
  const [effectSeek,setEffectSeek]=useState<EffectSeekRequest|undefined>(()=>sword.model==='senbonzakura'&&(initial.effect==='shikai'||initial.effect==='bankai')?{effect:initial.effect,time:initial.time,paused:initial.paused}:undefined);
  function setEffect(value:SetStateAction<EffectMode>){
    const next=typeof value==='function'?value(effect):value;
    if(sword.model==='senbonzakura'&&next==='bankai'&&effect!=='bankai')armBankaiVoice();
    if(sword.model==='zangetsu'&&(next==='bankai')!==(effect==='bankai'))setViewState(viewerScene.current?.getViewState());
    setEffectPaused(false);setEffectSeek(undefined);setEffectState(next);
    if(next==='bankai'||next==='shikai')setTimelineEffect(next);
  }
  function inspectEffect(time:number,paused:boolean){
    setDraw(100);setRotating(false);setEffectPaused(paused);setEffectState(timelineEffect);
    setEffectSeek({effect:timelineEffect,time,paused});
  }
  const [effectIntensity,setEffectIntensity]=useState(initial.effectIntensity*100);
  const [effectSpeed,setEffectSpeed]=useState(initial.effectSpeed);
  const [reflections,setReflections]=useState(initial.reflections);
  const [cameraHeight,setCameraHeight]=useState(initial.cameraHeight);
  const [showSheath,setShowSheath]=useState(initial.showSheath);
  const [swordRotation,setSwordRotation]=useState(initial.swordRotation);
  const [lightAngle,setLightAngle]=useState(initial.lightAngle);
  const [lighting,setLighting]=useState(initial.lighting);
  const [floorColor,setFloorColor]=useState(initial.floorColor);
  const [backgroundColor,setBackgroundColor]=useState(initial.backgroundColor);
  const [rotating, setRotating] = useState(initial.rotating);
  const [resetVersion, setResetVersion] = useState(0);
  const [draw,setDraw]=useState(initial.draw);
  const [dropVersion,setDropVersion]=useState(0);
  const [status,setStatus]=useState<MotionStatus>('sheathed');
  const dropped=status==='falling'||status==='resting';
  const bankaiActive=effect==='bankai';
  const clothWrapped=sword.model==='zangetsu';
  const tensaActive=clothWrapped&&bankaiActive;
  const bankaiCinematic=bankaiActive&&!clothWrapped;
  const hasSheath=!tensaActive;
  const [soundEnabled,setSoundEnabled]=useState(false);
  const armBankaiVoice=useBankaiVoice(viewerScene,{active:active&&sword.model==='senbonzakura'&&bankaiActive,paused:effectPaused,speed:effectSpeed,enabled:soundEnabled,seekRequest:effectSeek});


  // Dedicated form pages repeat; paused shared moments and editor inspection stay still.
  useEffect(()=>{
    if(!active||editing||!routeForm||sword.model!=='senbonzakura'||effect!==routeForm||effectPaused||effectSpeed<=0)return;
    const timer=window.setInterval(()=>{
      const timeline=viewerScene.current?.getEffectTimeline(routeForm);
      if(timeline&&timeline.time>=timeline.cycleDuration){
        setEffectSeek({effect:routeForm,time:0,paused:false});
      }
    },100);
    return ()=>window.clearInterval(timer);
  },[active,editing,routeForm,sword.model,effect,effectPaused,effectSpeed]);

  const importedHash=useRef(`${routeForm??''}|${shareHash}`);
  useEffect(()=>{
    const routeKey=`${routeForm??''}|${shareHash}`;
    if(importedHash.current===routeKey)return;
    importedHash.current=routeKey;
    // A plain collection link resumes the cached study. Explicit snapshots replace it.
    if(!shareHash){
      setInvalidShare(false);
      const next=routeForm?swordFormEffect(sword,routeForm):undefined;
      if(next!==undefined){
        if(sword.model==='zangetsu'&&(next==='bankai')!==(effect==='bankai'))setViewState(viewerScene.current?.getViewState());
        setEffectState(next);setDraw(100);setRotating(false);setEffectPaused(false);
        if(effectSpeed===0)setEffectSpeed(1);
        if(routeForm)setTimelineEffect(routeForm);
        setEffectSeek(sword.model==='senbonzakura'&&routeForm?{effect:routeForm,time:0,paused:false}:undefined);
      }
      return;
    }
    const result=readSwordPageState(sword,shareHash,routeForm),state=result.state;
    setInvalidShare(result.invalid);setViewState(state.view??{reset:true});setEffectState(state.effect);setEffectPaused(state.paused);
    setEffectIntensity(state.effectIntensity*100);setEffectSpeed(state.effectSpeed);setDraw(state.draw);setShowSheath(state.showSheath);
    setSwordRotation(state.swordRotation);setRotating(state.rotating);setCameraHeight(state.cameraHeight);setLightAngle(state.lightAngle);
    setLighting(state.lighting);setFloorColor(state.floorColor);setBackgroundColor(state.backgroundColor);setReflections(state.reflections);
    setGlowStrength(state.glowStrength);setGlowSpread(state.glowSpread);setPetalGlow(state.petalGlow);setBankaiPetalMotion(state.bankaiPetalMotion);
    if(state.effect==='shikai'||state.effect==='bankai')setTimelineEffect(state.effect);
    setEffectSeek(sword.model==='senbonzakura'&&(state.effect==='shikai'||state.effect==='bankai')?{effect:state.effect,time:state.time,paused:state.paused}:undefined);
  },[shareHash,routeForm,sword]);
  function snapshot(freeze=false):SwordShareState{
    const time=sword.model==='senbonzakura'&&(effect==='shikai'||effect==='bankai')?viewerScene.current?.getEffectTimeline(effect)?.time??effectSeek?.time??0:0;
    return normalizeSwordState(sword,{version:1,sword:sword.id,effect,effectIntensity:effectIntensity/100,effectSpeed,time,
      paused:sword.model==='senbonzakura'?freeze||effectPaused:false,draw,showSheath,swordRotation,rotating:freeze?false:rotating,cameraHeight,lightAngle,lighting,
      backgroundColor,floorColor,reflections,glowStrength,glowSpread,petalGlow,bankaiPetalMotion,view:viewerScene.current?.getViewState()??viewState});
  }
  function openMode(){
    const path=swordSharePath(sword,snapshot(),!editing);
    const form=/\/(bankai|shikai)#/.exec(path)?.[1]??'';
    importedHash.current=`${form}|${path.slice(path.indexOf('#'))}`;navigate(path);
  }
  async function share(){
    const url=new URL(swordSharePath(sword,snapshot(true)),window.location.href).href;
    setShareUrl(url);
    try{if(!navigator.clipboard)throw new Error('Clipboard unavailable');await navigator.clipboard.writeText(url);setShareMessage('Link copied.');}
    catch{setShareMessage('Copy the link below.');}
  }
  function navigateForm(form?:SwordForm){
    if(editing)return;
    // The selection already applies the live state; avoid importing it a second time.
    importedHash.current=`${form??''}|`;
    if(routeForm!==form||shareHash)navigate(swordUrl(sword)+(form?`/${form}`:''));
  }
  function play(mode:TimelineEffect=timelineEffect){
    if(sword.model==='senbonzakura'&&mode==='bankai')armBankaiVoice();
    if(sword.model==='zangetsu'&&effect!==mode)setViewState(viewerScene.current?.getViewState());
    setDraw(100);setRotating(false);setEffectPaused(false);if(effectSpeed===0)setEffectSpeed(1);if(effectIntensity===0)setEffectIntensity(100);
    setTimelineEffect(mode);setEffectState(mode);
    navigateForm(mode);
    setEffectSeek(sword.model==='senbonzakura'?{effect:mode,time:0,paused:false}:undefined);
  }
  function togglePlayback(){
    if(sword.model==='senbonzakura'&&effect==='bankai'&&(effectPaused||effectSpeed===0))armBankaiVoice();
    if(sword.model==='senbonzakura'&&effect!==timelineEffect){play();return;}
    if(effect==='off'){setEffect(sword.effect==='off'?'glow':sword.effect);setEffectPaused(false);}
    else setEffectPaused(!effectPaused&&effectSpeed!==0);
    if(effectSpeed===0)setEffectSpeed(1);if(effectIntensity===0)setEffectIntensity(100);
  }
  function changeSheathVisibility(visible:boolean){setShowSheath(visible);if(!visible)setDraw(100);}
  function changeDraw(value:number){setEffect(current=>current==='shikai'?'off':current);setSwordRotation(0);setDraw(value);}
  function selectSwordEffect(mode:EffectMode){
    setEffect(mode);if(effectSpeed===0)setEffectSpeed(1);if(effectIntensity===0)setEffectIntensity(100);
  }
  function resetSwordView(){
    const timed=sword.model==='senbonzakura'&&(effect==='shikai'||effect==='bankai')?effect:undefined;
    const time=timed?viewerScene.current?.getEffectTimeline(timed)?.time??0:0;
    setSwordRotation(0);setCameraHeight(0);setRotating(false);setDraw(100);
    setViewState({reset:true});
    // Reframe an active transformation at its current moment rather than replaying it.
    setEffectSeek(timed?{effect:timed,time,paused:effectPaused}:undefined);
  }
  function originalForm(){setEffect('off');setDraw(100);navigateForm(sword.model==='zangetsu'?'shikai':undefined);}

  return <main className={`sword-experience ${editing?'is-editor':'is-replay'}`}>
    <SceneHeader label="Sword navigation">
      <IconButton icon={editing?'view':'edit'} label={editing?'View sword':'Edit sword'} onClick={openMode}/>
      <IconButton icon="share" label="Share sword" title={dropped?'Return the sword to display to share this sword':'Share sword'} onClick={share} disabled={dropped}/>
    </SceneHeader>
    <div className="experience-body">
      {!editing&&<SceneOverlay title={sword.name}>
        <SwordReplayControls sword={sword} sceneRef={viewerScene} visible={active} effect={effect} selected={timelineEffect} paused={effectPaused} speed={effectSpeed} intensity={effectIntensity} onSelect={play} onResetView={resetSwordView} onReplay={()=>play()} onPause={togglePlayback} onSeek={time=>inspectEffect(time,true)} onOriginal={originalForm} soundControl={sword.model==='senbonzakura'&&bankaiActive?<IconButton icon={soundEnabled?'sound':'muted'} label={soundEnabled?'Mute audio':'Enable audio'} aria-pressed={soundEnabled} onClick={()=>{if(!soundEnabled)armBankaiVoice(true);setSoundEnabled(!soundEnabled);}}/>:undefined} options={<SceneOptions>
          {sword.model==='longsword'&&<SwordEffectSelect compact value={effect} onChange={selectSwordEffect}/>}
          {sword.model==='senbonzakura'&&bankaiActive&&<BankaiVariantSelect compact value={bankaiPetalMotion} onChange={setBankaiPetalMotion}/>}
          {hasSheath&&!bankaiCinematic&&effect!=='shikai'&&<><SwordSheathToggle compact visible={showSheath} onChange={changeSheathVisibility} wrapping={clothWrapped}/><SwordDrawSlider compact value={draw} onChange={changeDraw} disabled={!showSheath||dropped} wrapping={clothWrapped}/></>}
          {sword.model==='senbonzakura'&&<button type="button" className="scene-option-action" onClick={()=>play()}><StudyIcon name="replay"/><span>Replay effect</span></button>}
        </SceneOptions>}/>
        {invalidShare&&<p className="share-notice" role="status">This link could not be read. Showing the original sword.</p>}
      </SceneOverlay>}
      <section className="sword-canvas" aria-label={`${sword.name} interactive view`}>
    <SwordViewer viewState={viewState} active={active} sceneRef={viewerScene} effectSeek={effectSeek} effectPaused={effectPaused} glowStrength={glowStrength} glowSpread={glowSpread} petalGlow={petalGlow} bankaiPetalMotion={bankaiPetalMotion} upscaling={upscaling} dragTarget={dragTarget} antiAliasing={antiAliasing} showPerformance={editing&&showPerformance} model={tensaActive?'tensa-zangetsu':sword.model} floorColor={floorColor} backgroundColor={backgroundColor} effect={tensaActive?'off':effect} effectSpeed={effectSpeed} effectIntensity={effectIntensity/100} cameraHeight={cameraHeight} showSheath={showSheath} swordRotation={swordRotation} rotating={rotating} resetVersion={resetVersion} draw={draw} reflections={reflections} lightAngle={lightAngle} lighting={lighting} dropVersion={dropVersion} onStatus={setStatus} />
        <BankaiTitle active={active&&sword.model==='senbonzakura'&&bankaiActive} sceneRef={viewerScene} seekRequest={effectSeek}/>
      </section>
    </div>
    {shareUrl&&<section className="share-popover" aria-label="Share this sword"><div><p role="status">{shareMessage}</p><button aria-label="Close share link" onClick={()=>setShareUrl('')}>×</button></div><input readOnly aria-label="Shareable sword link" value={shareUrl} onFocus={event=>event.target.select()}/></section>}
    {editing&&<>
    <button ref={settingsButton} className="settings-toggle" aria-label={settingsOpen?'Close settings':'Open settings'} aria-expanded={settingsOpen} aria-controls="sword-settings" onClick={()=>setSettingsOpen(open=>!open)}>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
        {settingsOpen?<path d="m6 6 12 12M18 6 6 18"/>:<><path d="M4 7h16M4 17h16"/><circle cx="9" cy="7" r="3" fill="currentColor"/><circle cx="15" cy="17" r="3" fill="currentColor"/></>}
      </svg><span>Settings</span>
    </button>
    {settingsOpen&&<aside id="sword-settings" className="settings-panel" aria-label="Sword settings">
      <h2 className="settings-heading">Settings</h2>
      <EditorSettingsSection title="Sword &amp; sheath" description="Draw, rotation and physics">
      <div className="settings-block">
        {hasSheath&&<SwordSheathToggle visible={showSheath} onChange={changeSheathVisibility} wrapping={clothWrapped} disabled={bankaiCinematic||effect==='shikai'}/>}
        {hasSheath&&<SwordDrawSlider value={draw} onChange={changeDraw} disabled={!showSheath||dropped||bankaiCinematic} wrapping={clothWrapped}/>}
        <label className="range-label" htmlFor="sword-rotation">Rotate sword <output>{swordRotation}°</output></label>
        <input id="sword-rotation" type="range" min={-180} max={180} step={1} value={swordRotation} disabled={status!=='drawn'||bankaiCinematic} onChange={event=>{setRotating(false);setSwordRotation(Number(event.target.value))}}/>
        <div className="actions"><button disabled={status!=='drawn'||bankaiCinematic} onClick={()=>{setRotating(false);setSwordRotation(180)}}>Blade up</button><button disabled={dropped||bankaiCinematic} onClick={()=>setSwordRotation(0)}>Reset sword angle</button></div>
        <div className="actions">{hasSheath&&<button disabled={dropped||bankaiCinematic} onClick={()=>{setEffect(current=>current==='shikai'?'off':current);setSwordRotation(0);setDraw(draw===100?0:100)}}>{clothWrapped?(draw===100?'Wrap blade':'Unwrap blade'):(draw===100?'Sheathe':'Draw')}</button>}<button disabled={status!=='drawn'||effect==='shikai'||bankaiCinematic} onClick={()=>{setRotating(false);setDropVersion(v=>v+1)}}>Drop sword</button></div>
        <div className="actions"><button id="spin" aria-pressed={rotating} onClick={() => setRotating(value => !value)}>{rotating ? 'Pause rotation' : 'Resume rotation'}</button></div>
        <p className="motion-status" role="status">{bankaiCinematic?'Bankai release':tensaActive&&!dropped?'Tensa Zangetsu · ready to release':clothWrapped&&!dropped?(draw===0?'Cloth wrapped':draw===100?'Unwrapped · ready to release':'Partially unwrapped'):{sheathed:'Sheathed',drawing:'Guided draw',drawn:'Drawn · ready to release',falling:'Falling',resting:'At rest'}[status]}</p>
        {dropped&&<button className="restore" onClick={()=>setResetVersion(v=>v+1)}>Return to display</button>}
      </div>
      </EditorSettingsSection>
      <EditorSettingsSection title="Effects &amp; playback" description="Forms, motion, glow and timing">
      {clothWrapped&&<div className="settings-block effects-controls"><button aria-pressed={tensaActive} disabled={dropped} onClick={()=>{setSwordRotation(0);setEffect(tensaActive?'off':'bankai')}}>{tensaActive?'Return to Zangetsu':'Bankai · Tensa Zangetsu'}</button></div>}
      {sword.model!=='zangetsu'&&<div className="settings-block effects-controls">
        {sword.model==='senbonzakura'?<><button aria-pressed={effect==='shikai'} disabled={dropped||bankaiCinematic} onClick={()=>{setDraw(100);setEffect(effect==='shikai'?'off':'shikai')}}>{effect==='shikai'?'Reform blade':'Shikai · Scatter'}</button>
        <button aria-pressed={bankaiActive} disabled={dropped} onClick={()=>{setRotating(false);setDraw(100);setEffect(bankaiActive?'off':'bankai')}}>{bankaiActive?'Restore sword':'Bankai · Release'}</button>
        {bankaiActive&&<p className="motion-status">Sword sinks → blade rows rise → petals scatter</p>}
        </>:<>
        <SwordEffectSelect value={effect} onChange={selectSwordEffect}/></>}
        <label className="range-label" htmlFor="effect-intensity">Effect intensity <output>{effectIntensity}%</output></label>
        <input id="effect-intensity" type="range" min={0} max={200} step={5} value={effectIntensity} onChange={event=>setEffectIntensity(Number(event.target.value))}/>
        {sword.model==='senbonzakura'&&<>
          <h3 className="settings-subheading">Glow &amp; petals</h3>
          <label className="range-label" htmlFor="glow-strength">Release glow strength <output>{Math.round(glowStrength*100)}%</output></label>
          <input id="glow-strength" type="range" min={0} max={1.5} step={.01} value={glowStrength} onChange={event=>setGlowStrength(Number(event.target.value))}/>
          <label className="range-label" htmlFor="glow-spread">Glow spread <output>{Math.round(glowSpread*100)}%</output></label>
          <input id="glow-spread" type="range" min={0} max={1} step={.01} value={glowSpread} onChange={event=>setGlowSpread(Number(event.target.value))}/>
          <BankaiVariantSelect value={bankaiPetalMotion} onChange={setBankaiPetalMotion}/>
          <label className="range-label" htmlFor="petal-glow">Petal glow <output>{petalGlow.toFixed(1)}×</output></label>
          <input id="petal-glow" type="range" min={0} max={8} step={.1} value={petalGlow} onChange={event=>setPetalGlow(Number(event.target.value))}/>
        </>}
        {sword.model==='senbonzakura'&&<><h3 className="settings-subheading">Playback</h3><EffectTimelineControls visible={active&&editing} key={timelineEffect} sceneRef={viewerScene} effect={timelineEffect} active={effect===timelineEffect} paused={effectPaused} speed={effectSpeed} onEffectChange={value=>{setTimelineEffect(value);setEffectPaused(true);}} onPositionChange={inspectEffect} onPauseChange={setEffectPaused} onSpeedChange={setEffectSpeed}/></>}
        <label className="range-label" htmlFor="effect-speed">Effect speed <output>{effectSpeed===0?'Paused':`${effectSpeed.toFixed(1)}×`}</output></label>
        <input id="effect-speed" type="range" min={0} max={3} step={.1} value={effectSpeed} onChange={event=>setEffectSpeed(Number(event.target.value))}/>
      </div>}
      </EditorSettingsSection>
      <EditorSettingsSection title="Camera &amp; framing" description="Drag controls, position and reset">
      <div className="settings-block effects-controls">
        <label className="range-label" htmlFor="drag-target">Left-drag controls</label>
        <select id="drag-target" value={dragTarget} onChange={event=>setDragTarget(event.target.value as typeof dragTarget)}><option value="sword">Sword</option><option value="camera">Camera</option></select>
        <p className="motion-status">Sword rotation is available when drawn and on display. Right-drag pans the camera; scroll zooms.</p>
      </div>
      <div className="settings-block">
        <label className="range-label" htmlFor="camera-height">Move camera vertically <output>{cameraHeight.toFixed(1)}</output></label>
        <input id="camera-height" type="range" min={-8} max={8} step={.1} value={cameraHeight} onChange={event=>setCameraHeight(Number(event.target.value))}/>
        <div className="actions"><button onClick={()=>setCameraHeight(v=>Math.min(8,v+.5))}>Move up</button><button onClick={()=>setCameraHeight(v=>Math.max(-8,v-.5))}>Move down</button></div>
      </div>
      <div className="actions"><button id="reset" onClick={resetSwordView}>Reset sword &amp; camera</button></div>
      </EditorSettingsSection>
      <EditorSettingsSection title="Lighting" description="Precise light balance and reflections">
      <div className="settings-block">
        {(['Overall','Studio lights','Ambient & reflections','Camera lights'] as const).map(group=><div className="lighting-group" key={group}>
          {group!=='Overall'&&<h3 className="settings-subheading">{group}</h3>}
          {LIGHTING_CONTROLS.filter(control=>control.group===group).map(({key,label,min,max})=><PrecisionControl key={key} label={label} value={normalizeLightingSettings(lighting)[key]*100} min={min*100} max={max*100} onChange={value=>setLighting(current=>({...normalizeLightingSettings(current),[key]:value/100}))}/>)}
          {group==='Ambient & reflections'&&<PrecisionControl label="Reflection angle" value={lightAngle} min={0} max={360} unit="°" onChange={setLightAngle}/>}
          {group==='Camera lights'&&<p className="motion-status">These lights follow the camera as you orbit.</p>}
        </div>)}
        <button onClick={()=>{setLighting({...DEFAULT_LIGHTING});setLightAngle(sword.lightAngle)}}>Reset lighting</button>
      </div>
      </EditorSettingsSection>
      <EditorSettingsSection title="Scene &amp; reflections" description="Background, floor and reflections">
      <div className="settings-block">
        <label className="floor-color-control" htmlFor="background-color">Background color <input id="background-color" type="color" value={backgroundColor} onChange={event=>setBackgroundColor(event.target.value)}/></label>
        <label className="floor-color-control" htmlFor="floor-color">Floor color <input id="floor-color" type="color" value={floorColor} onChange={event=>setFloorColor(event.target.value)}/></label>
        <label className="reflection-toggle"><input type="checkbox" checked={reflections} onChange={event=>setReflections(event.target.checked)}/>Local reflections</label>
      </div>
      </EditorSettingsSection>
      <EditorSettingsSection title="Quality &amp; performance" description="Resolution, smoothing and diagnostics">
      <div className="settings-block effects-controls">
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
      <label className="reflection-toggle"><input type="checkbox" checked={showPerformance} onChange={event=>setShowPerformance(event.target.checked)}/>Performance meter</label>
      </EditorSettingsSection>
      <details className="sword-info"><summary>About this sword &amp; controls</summary>
        <h3>{sword.name}</h3><p>{sword.description}</p>
        <p>Left-drag follows your selected mode · Arrow keys to move · Right-drag or two-finger drag to pan · Pinch or scroll to zoom</p>
        <p className="study-credit">BladeVibe / {sword.name}</p>
      </details>
    </aside>}
    </>}
  </main>;
}
