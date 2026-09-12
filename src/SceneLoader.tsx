import {StudyIcon} from './StudyIcon';

export function SceneLoader(){
 return <div className="scene-loading" role="status" aria-label="Loading scene">
  <span className="scene-loading-spinner"><StudyIcon name="loading"/></span>
 </div>;
}
