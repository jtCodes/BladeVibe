import {swords,swordUrl,swordFormEffect} from './swordLibrary';

export interface PageMetadata {path:string;title:string;description:string;index:boolean}
const home:PageMetadata={path:'/',title:'BladeX — Legendary swords in high-quality 3D',description:'Explore legendary swords in high-quality, real-time 3D. Release Senbonzakura Bankai, reveal Tensa Zangetsu, customize the lighting, and share your scene.',index:true};
export const publicPages:PageMetadata[]=[home,...swords.flatMap(sword=>{
 const path=swordUrl(sword);
 const base={path,title:`${sword.name} — Interactive 3D sword | BladeX`,description:`Explore ${sword.name} in high-quality, real-time 3D. ${sword.description} Adjust the scene and share your view.`,index:true};
 return [base,...(['shikai','bankai'] as const).filter(form=>swordFormEffect(sword,form)!==undefined).map(form=>({
  path:`${path}/${form}`,index:true,
  title:sword.id==='zangetsu'&&form==='bankai'?'Tensa Zangetsu — Bankai in 3D | BladeX':`${sword.name} ${form==='bankai'?'Bankai':'Shikai'} — Interactive 3D | BladeX`,
  description:sword.id==='senbonzakura'?(form==='bankai'?'Experience Senbonzakura Kageyoshi in high-quality 3D. Watch Bankai unfold into a storm of petals, pause the release, and share your favorite moment.':'Watch Senbonzakura scatter into petals with an interactive 3D Shikai release. Replay, pause, and explore the transformation from your own angle.'):(form==='bankai'?'Explore Tensa Zangetsu, Ichigo’s Bankai sword, in high-quality, real-time 3D. Inspect the blade, customize the lighting, and share your view.':'Explore Ichigo’s original Zangetsu in high-quality 3D, with its oversized black blade and white cloth binding. Switch forms and customize your view.'),
 }))];
}),{path:'/sharingan',title:'Sharingan — Interactive 3D study | BladeX',description:'Explore a monumental crimson Sharingan in real-time 3D. Look around, approach the three-tomoe symbol, and pause its rotation.',index:true}];
export function pageMetadata(path:string):PageMetadata{
 path=path.split(/[?#]/)[0].replace(/\/+$/,'')||'/';
 if(path==='/studies/sharingan')path='/sharingan';
 const page=publicPages.find(page=>page.path===path);
 if(page)return page;
 const sword=swords.find(sword=>`${swordUrl(sword)}/edit`===path);
 if(sword)return {...publicPages.find(page=>page.path===swordUrl(sword))!,title:`${sword.name} · Editor — BladeX`,index:false};
 return {path,title:'Page not found — BladeX',description:'This BladeX page could not be found. Explore the sword collection.',index:false};
}
export function updatePageMetadata(path:string){
 const page=pageMetadata(path);
 document.title=page.title;
 const set=(key:string,content:string,property=false)=>{
  const attr=property?'property':'name';
  let element=document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if(!element){element=document.createElement('meta');element.setAttribute(attr,key);document.head.append(element);}
  element.content=content;
 };
 set('description',page.description);set('robots',page.index?'index, follow':'noindex, follow');
 set('og:title',page.title,true);set('og:description',page.description,true);
 set('twitter:title',page.title);set('twitter:description',page.description);
 const origin=document.head.querySelector<HTMLMetaElement>('meta[name="bladex-site-url"]')?.content;
 if(origin){
  const url=new URL(page.path,origin).href;
  let link=document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if(!link){link=document.createElement('link');link.rel='canonical';document.head.append(link);}
  link.href=url;set('og:url',url,true);
 }
}
