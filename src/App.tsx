import {lazy,Suspense,useEffect,useState} from 'react';
import {Gallery} from './Gallery';
import {AppLink,usePath} from './navigation';
import {swords,type SwordAsset} from './swordLibrary';
// Keep at most one detailed editor, alongside the visited gallery previews.
const editors={longsword:lazy(()=>import('./SwordEditor')),senbonzakura:lazy(()=>import('./SwordEditor')),zangetsu:lazy(()=>import('./SwordEditor'))} satisfies Record<SwordAsset['model'],ReturnType<typeof lazy>>;

export default function App(){
 const path=usePath();
 const match=/^\/swords\/([a-zA-Z0-9-]+)$/.exec(path);
 const sword=match?swords.find(s=>s.id===match[1]):undefined;
 const home=path==='/';
 const [visitedHome,setVisitedHome]=useState(home);
 const [lastSword,setLastSword]=useState(sword);
 useEffect(()=>{if(home)setVisitedHome(true);if(sword)setLastSword(sword);},[home,sword]);
 const retainedSword=sword??lastSword;
 const Editor=retainedSword?editors[retainedSword.model]:null;
 useEffect(()=>{document.title=home?'Gallery — Aetherblade':sword?`${sword.name} — Aetherblade`:'Sword not found — Aetherblade';},[home,sword?.name]);
 return <>
  <div className="session-page" hidden={!home} inert={!home}>{(home||visitedHome)&&<Gallery swords={swords} active={home}/>}</div>
  <div className="session-page" hidden={!sword} inert={!sword}>{retainedSword&&Editor&&<Suspense fallback={<main><AppLink className="gallery-back" href="/">← Gallery</AppLink><div id="loading" role="status">Opening sword editor…</div></main>}><Editor key={retainedSword.id} sword={retainedSword} active={!!sword}/></Suspense>}</div>
  {!home&&!sword&&<main className="missing-sword"><p className="gallery-kicker">AETHER / FORGE</p><h1>Sword not found</h1><p>This sword is not in the gallery.</p><AppLink href="/" className="gallery-primary">Back to gallery</AppLink></main>}
 </>;
}
