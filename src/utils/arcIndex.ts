// some helpful functions for working with arc indices

import { ArcBasicIndex } from '@/types';

/** find the first arc with sessions */
export function getFirstArcWithSessions(arcIndex: ArcBasicIndex[]): ArcBasicIndex | null {
  return arcIndex.find((arc)=>arc.startSessionNumber !== -1) || null;
}  

/** find the last arc with sessions */
export function getLastArcWithSessions(arcIndex: ArcBasicIndex[]): ArcBasicIndex | null {
  for (let i=arcIndex.length-1; i>=0; i--) {
    if (arcIndex[i].startSessionNumber !== -1)
      return arcIndex[i];
  }
  return null;
}  

/** find the arc that covers the given session number */
export function getArcForSession(arcIndex: ArcBasicIndex[], sessionNumber: number): ArcBasicIndex | null {
  let retval = null as ArcBasicIndex | null;

  // arcs are always sorted in order
  for (const index of arcIndex) {
    if (index.startSessionNumber <= sessionNumber && index.endSessionNumber >= sessionNumber) {
      retval = index;
      break;
    }
  }

  return retval;
}
