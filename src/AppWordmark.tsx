import {AppLink} from './navigation';

/** A shared editorial signature for every app header. */
export function AppWordmark(){
 return <AppLink className="wordmark" href="/" aria-label="BladeX — collection">
  <span className="wordmark-lettering" aria-hidden="true">BladeX</span>
 </AppLink>;
}
