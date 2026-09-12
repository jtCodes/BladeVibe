import {SceneLoader} from './SceneLoader';
import {lazy,Suspense,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {AppLink} from './navigation';
import {swordUrl,type SwordAsset} from './swordLibrary';
const Sharingan=lazy(()=>import('./SharinganStudy'));
const previews={longsword:lazy(()=>import('./SwordPreview')),senbonzakura:lazy(()=>import('./SwordPreview')),zangetsu:lazy(()=>import('./SwordPreview'))};

function SwordCard({sword,active}:{sword:SwordAsset;active:boolean}){
 const card=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false),[visited,setVisited]=useState(false);
 useEffect(()=>{
  if(!active){setVisible(false);return;}
  if(!card.current)return;
  const observer=new IntersectionObserver(([entry])=>{
   setVisible(entry.isIntersecting);if(entry.isIntersecting)setVisited(true);
  },{rootMargin:'100px'});
  observer.observe(card.current);return ()=>observer.disconnect();
 },[active]);
 const Preview=previews[sword.model];
 return <div ref={card} className="live-sword-card"><AppLink href={swordUrl(sword)} aria-label={`Open ${sword.name}`}>
  <div className="live-sword-art">{visited&&<Suspense fallback={<SceneLoader/>}><Preview sword={sword} active={active&&visible}/></Suspense>}</div>
  <div className="live-sword-caption"><h2>{sword.name}</h2></div>
 </AppLink></div>;
}
function SharinganCard({active}:{active:boolean}){
 const card=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false),[visited,setVisited]=useState(false);
 useEffect(()=>{
  if(!active){setVisible(false);return;}
  if(!card.current)return;
  const observer=new IntersectionObserver(([entry])=>{setVisible(entry.isIntersecting);if(entry.isIntersecting)setVisited(true);},{rootMargin:'100px'});
  observer.observe(card.current);return()=>observer.disconnect();
 },[active]);
 return <div ref={card} className="live-sword-card"><AppLink href="/sharingan" aria-label="Open Sharingan">
  <div className="live-sword-art">{visited&&<Suspense fallback={<SceneLoader/>}><Sharingan preview active={active&&visible}/></Suspense>}</div>
  <div className="live-sword-caption"><h2>Sharingan</h2></div>
 </AppLink></div>;
}
export function Gallery({swords,active=true}:{swords:readonly SwordAsset[];active?:boolean}){
 const page=useRef<HTMLElement>(null),scrollTop=useRef(0);
 useLayoutEffect(()=>{if(active&&page.current)page.current.scrollTop=scrollTop.current;},[active]);
 return <main ref={page} className="gallery-page" onScroll={event=>{if(active)scrollTop.current=event.currentTarget.scrollTop;}}>
  <header className="collection-header"><AppLink href="/" className="wordmark">BladeX</AppLink><h1 className="sr-only">The collection</h1></header>
  <div className="live-sword-grid">{swords.map(sword=><SwordCard sword={sword} key={sword.id} active={active}/>)}<SharinganCard active={active}/></div>
 </main>;
}
