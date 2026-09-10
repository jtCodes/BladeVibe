import {lazy,Suspense,useEffect} from 'react';
import {Gallery} from './Gallery';
import {AppLink,usePath} from './navigation';
import {swords,type SwordAsset} from './swordLibrary';
// Each model supplies its detailed editor separately from its gallery preview.
const editors={longsword:lazy(()=>import('./SwordEditor')),senbonzakura:lazy(()=>import('./SwordEditor')),zangetsu:lazy(()=>import('./SwordEditor'))} satisfies Record<SwordAsset['model'],ReturnType<typeof lazy>>;

export default function App(){
 const path=usePath();
 const match=/^\/swords\/([a-zA-Z0-9-]+)$/.exec(path);
 const sword=match?swords.find(s=>s.id===match[1]):undefined;
 const Editor=sword?editors[sword.model]:null;
 useEffect(()=>{document.title=path==='/'?'Gallery — Aetherblade':sword?`${sword.name} — Aetherblade`:'Sword not found — Aetherblade';},[path,sword?.name]);
 if(path==='/')return <Gallery swords={swords}/>;
 if(sword&&Editor)return <Suspense fallback={<main><AppLink className="gallery-back" href="/">← Gallery</AppLink><div id="loading" role="status">Opening sword editor…</div></main>}><Editor key={sword.id} sword={sword}/></Suspense>;
 return <main className="missing-sword"><p className="gallery-kicker">AETHER / FORGE</p><h1>Sword not found</h1><p>This sword is not in the gallery.</p><AppLink href="/" className="gallery-primary">Back to gallery</AppLink></main>;
}
