export interface SwordViewState {
 camera:[number,number,number];
 target:[number,number,number];
 rotation:[number,number,number,number];
}

/** A fresh request restores the default view when an imported link has no camera. */
export type SwordViewRequest = SwordViewState | {reset:true};
