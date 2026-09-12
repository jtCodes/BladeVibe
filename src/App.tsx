import {SceneLoader} from './SceneLoader';
import {lazy,Suspense,useEffect,useState} from 'react';
import {Gallery} from './Gallery';
import {AppLink,useLocation,navigate} from './navigation';
import {swords,swordUrl,swordFormEffect,type SwordForm} from './swordLibrary';
const Experience=lazy(()=>import('./SwordEditor'));
const Sharingan=lazy(()=>import('./SharinganStudy'));
export default function App(){
 const {path,hash}=useLocation();
 const match=/^\/swords\/([a-zA-Z0-9-]+)(?:\/(edit|bankai|shikai))?$/.exec(path);
 const sword=match?swords.find(s=>s.id===match[1]):undefined;
 const requestedForm=match?.[2]==='bankai'||match?.[2]==='shikai'?match[2] as SwordForm:undefined;
 const form=sword&&requestedForm&&swordFormEffect(sword,requestedForm)!==undefined?requestedForm:undefined;
 const editing=match?.[2]==='edit';
 useEffect(()=>{if(sword&&requestedForm&&!form)navigate(swordUrl(sword)+hash,true);},[sword,requestedForm,form,hash]);
 const home=path==='/';
 const ocular=path==='/sharingan'||path==='/studies/sharingan';
 const [visitedOcular,setVisitedOcular]=useState(ocular);
 useEffect(()=>{if(ocular)setVisitedOcular(true);},[ocular]);
 const [visitedHome,setVisitedHome]=useState(home);
 const route=sword?{sword,editing,form,hash}:undefined;
 const [lastRoute,setLastRoute]=useState(route);
 useEffect(()=>{if(home)setVisitedHome(true);if(sword)setLastRoute({sword,editing,form,hash});},[home,sword,path,hash]);
 const retained=route??lastRoute;
 useEffect(()=>{document.title=ocular?'Sharingan — BladeX':home?'The collection — BladeX':sword?`${sword.name}${editing?' · Editor':form?` · ${form==='bankai'?'Bankai':'Shikai'}`:''} — BladeX`:'Page not found — BladeX';},[home,sword,path]);
 return <>
  <div className="session-page" hidden={!home} inert={!home}>{(home||visitedHome)&&<Gallery swords={swords} active={home}/>}</div>
  <div className="session-page" hidden={!sword} inert={!sword}>{retained&&<Suspense fallback={<main className="opening-page"><SceneLoader/></main>}><Experience key={retained.sword.id} sword={retained.sword} active={!!sword} editing={retained.editing} routeForm={retained.form} shareHash={retained.hash}/></Suspense>}</div>
  <div className="session-page" hidden={!ocular} inert={!ocular}>{(ocular||visitedOcular)&&<Suspense fallback={<SceneLoader/>}><Sharingan active={ocular}/></Suspense>}</div>
  {!home&&!sword&&!ocular&&<main className="missing-sword"><p className="eyebrow">BladeX</p><h1>Page not found.</h1><AppLink href="/" className="text-link">Return to the collection</AppLink></main>}
 </>;
}
