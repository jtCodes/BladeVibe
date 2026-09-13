import type {ReactNode} from 'react';

/** Native disclosure keeps editor groups scannable and keyboard accessible. */
export function EditorSettingsSection({title,description,initiallyOpen=false,children}:{title:string;description:string;initiallyOpen?:boolean;children:ReactNode}){
 return <details className="editor-settings-section" open={initiallyOpen}>
  <summary><span><span className="editor-settings-title">{title}</span><span className="editor-settings-description">{description}</span></span></summary>
  <div className="editor-settings-content">{children}</div>
 </details>;
}
