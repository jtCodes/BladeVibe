import type {ButtonHTMLAttributes,ComponentProps,ReactNode,Ref} from 'react';
import {StudyIcon} from './StudyIcon';
import {AppWordmark} from './AppWordmark';

type IconName=ComponentProps<typeof StudyIcon>['name'];
export function IconButton({icon,label,title,...props}:Omit<ButtonHTMLAttributes<HTMLButtonElement>,'children'|'className'|'aria-label'> & {icon:IconName;label:string;ref?:Ref<HTMLButtonElement>}){
 return <button {...props} type="button" className="study-icon-button" aria-label={label} title={title??label}><StudyIcon name={icon}/></button>;
}
export function PlaybackActions({paused,onToggle,onReplay,playLabel='Play',pauseLabel='Pause',replayLabel='Replay from start'}:{paused:boolean;onToggle:()=>void;onReplay?:()=>void;playLabel?:string;pauseLabel?:string;replayLabel?:string}){
 return <div className="replay-actions"><IconButton icon={paused?'play':'pause'} label={paused?playLabel:pauseLabel} onClick={onToggle}/>{onReplay&&<IconButton icon="replay" label={replayLabel} onClick={onReplay}/>}</div>;
}
export function SceneHeader({children,label='Scene navigation'}:{children?:ReactNode;label?:string}){
 return <header className="experience-header"><AppWordmark/>{children&&<nav aria-label={label}>{children}</nav>}</header>;
}
export function SceneOverlay({title,subtitle,children}:{title:string;subtitle?:string;children:ReactNode}){
 return <section className="study-info" aria-label={`${title} controls`}><h1 className="study-title">{title}</h1>{subtitle&&<p className="scene-subtitle">{subtitle}</p>}{children}</section>;
}
