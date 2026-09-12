import {lazy,Suspense,useEffect,useState} from 'react';
import {Gallery} from './Gallery';
import {AppLink,useLocation} from './navigation';
import {swords} from './swordLibrary';
const Experience=lazy(()=>import('./SwordEditor'));
export default function App(){
 const {path,hash}=useLocation();
 const match=/^\/swords\/([a-zA-Z0-9-]+)(\/edit)?$/.exec(path);
 const sword=match?swords.find(s=>s.id===match[1]):undefined;
 const home=path==='/';
 const [visitedHome,setVisitedHome]=useState(home);
 const route=sword?{sword,editing:!!match?.[2],hash}:undefined;
 const [lastRoute,setLastRoute]=useState(route);
 useEffect(()=>{if(home)setVisitedHome(true);if(sword)setLastRoute({sword,editing:!!match?.[2],hash});},[home,sword,path,hash]);
 const retained=route??lastRoute;
 useEffect(()=>{document.title=home?'The collection — Aetherblade':sword?`${sword.name}${match?.[2]?' · Editor':''} — Aetherblade`:'Study not found — Aetherblade';},[home,sword,path]);
 return <>
  <div className="session-page" hidden={!home} inert={!home}>{(home||visitedHome)&&<Gallery swords={swords} active={home}/>}</div>
  <div className="session-page" hidden={!sword} inert={!sword}>{retained&&<Suspense fallback={<main className="opening-page"><AppLink href="/" className="text-link">The collection</AppLink><p role="status">Opening the study…</p></main>}><Experience key={retained.sword.id} sword={retained.sword} active={!!sword} editing={retained.editing} shareHash={retained.hash}/></Suspense>}</div>
  {!home&&!sword&&<main className="missing-sword"><p className="eyebrow">Aetherblade</p><h1>Study not found.</h1><AppLink href="/" className="text-link">Return to the collection</AppLink></main>}
 </>;
}
