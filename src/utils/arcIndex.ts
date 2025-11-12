// some helpful functions for working with arc indices

import { ArcBasicIndex } from '@/types';

export function getFirstArcWithSessions(arcIndex: ArcBasicIndex[]): ArcBasicIndex | null {
  return arcIndex.find((arc)=>arc.startSessionNumber !== -1) || null;
}  

export function getLastArcWithSessions(arcIndex: ArcBasicIndex[]): ArcBasicIndex | null {
  for (let i=arcIndex.length-1; i>=0; i--) {
    if (arcIndex[i].startSessionNumber !== -1)
      return arcIndex[i];
  }
  return null;
}  