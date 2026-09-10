import {useEffect,useState,type ComponentProps} from 'react';
export function navigate(href:string){window.history.pushState(null,'',href);window.dispatchEvent(new Event('app:navigate'));}
export function usePath(){
 const [path,setPath]=useState(window.location.pathname);
 useEffect(()=>{const update=()=>setPath(window.location.pathname);window.addEventListener('popstate',update);window.addEventListener('app:navigate',update);return()=>{window.removeEventListener('popstate',update);window.removeEventListener('app:navigate',update);};},[]);
 return path.replace(/\/+$/,'')||'/';
}
export function AppLink({href,onClick,...props}:ComponentProps<'a'>){
 return <a {...props} href={href} onClick={event=>{
  onClick?.(event);
  if(event.defaultPrevented||event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||props.target||props.download||!href)return;
  event.preventDefault();navigate(href);
 }}/>;
}
