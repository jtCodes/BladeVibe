import {useEffect,useState,type ComponentProps} from 'react';
export function navigate(href:string){window.history.pushState(null,'',href);window.dispatchEvent(new Event('app:navigate'));}
const locationState=()=>({path:window.location.pathname.replace(/\/+$/,'')||'/',hash:window.location.hash});
export function useLocation(){
 const [location,setLocation]=useState(locationState);
 useEffect(()=>{
  const update=()=>setLocation(locationState());
  window.addEventListener('popstate',update);window.addEventListener('hashchange',update);window.addEventListener('app:navigate',update);
  return()=>{window.removeEventListener('popstate',update);window.removeEventListener('hashchange',update);window.removeEventListener('app:navigate',update);};
 },[]);
 return location;
}
export function usePath(){return useLocation().path;}
export function AppLink({href,onClick,...props}:ComponentProps<'a'>){
 return <a {...props} href={href} onClick={event=>{
  onClick?.(event);
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target||props.download||!href)return;
  const url=new URL(href,window.location.href);if(url.origin!==window.location.origin)return;
  event.preventDefault();navigate(`${url.pathname}${url.search}${url.hash}`);
 }}/>;
}
