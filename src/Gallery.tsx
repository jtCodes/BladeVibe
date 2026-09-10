import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {AppLink} from './navigation';
import {swordUrl,type SwordAsset} from './swordLibrary';
const previews={longsword:lazy(()=>import('./SwordPreview')),senbonzakura:lazy(()=>import('./SwordPreview')),zangetsu:lazy(()=>import('./SwordPreview'))};

function SwordCard({sword}:{sword:SwordAsset}){
 const card=useRef<HTMLDivElement>(null),[visible,setVisible]=useState(false);
 useEffect(()=>{
  if(!card.current)return;
  const observer=new IntersectionObserver(([entry])=>setVisible(entry.isIntersecting),{rootMargin:'100px'});
  observer.observe(card.current);return ()=>observer.disconnect();
 },[]);
 const Preview=previews[sword.model];
 return <div ref={card} className="live-sword-card"><AppLink href={swordUrl(sword)} aria-label={`Open ${sword.name}`}>
  <div className="live-sword-art">{visible&&<Suspense fallback={<span className="preview-status">Loading sword…</span>}><Preview sword={sword}/></Suspense>}</div>
  <div className="live-sword-caption"><h2>{sword.name}</h2><span aria-hidden="true">↗</span></div>
 </AppLink></div>;
}
export function Gallery({swords}:{swords:readonly SwordAsset[]}){
 return <main className="gallery-page simple-gallery">
  <div className="simple-gallery-heading"><h1>Swords</h1></div>
  <div className="live-sword-grid">{swords.map(sword=><SwordCard sword={sword} key={sword.id}/>)}</div>
 </main>;
}
