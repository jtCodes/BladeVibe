export function StudyIcon({name}:{name:'play'|'pause'|'replay'|'edit'|'share'|'view'}){
 return <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
 {name==='play'?<path d="m9 5 11 7-11 7Z"/>:name==='pause'?<path d="M8 5v14M16 5v14"/>:name==='replay'?<><path d="M4 10a8 8 0 1 1 1 8M4 4v6h6"/></>:name==='edit'?<><path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15Z"/></>:name==='share'?<><path d="M12 15V3m-4 4 4-4 4 4M5 12v8h14v-8"/></>:<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></>}
 </svg>;
}
