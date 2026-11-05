import {fitTransform,resolveAnimationAccessory,resolveAccessory,saveAnimationProfile,mountTarget,animationProfileFor} from './accessory-runtime.mjs';
import {ensureAnimationId} from './animation-identity.mjs';
export function switchAnimationMounts(p){const id=ensureAnimationId(p.clip);p.attachments=(p.attachments||[]).map(a=>{if(mountTarget(a)){try{return resolveAccessory(a,p,id)}catch{return a}}return resolveAnimationAccessory(a,id)});return p}
export function captureAnimationEdits(oldItems,items,clip,character={}){
 const id=ensureAnimationId(clip);
 for(const a of items){const old=oldItems?.find(v=>v.id===a.id);if(!old||JSON.stringify(fitTransform(old))===JSON.stringify(fitTransform(a)))continue;
  if(!mountTarget(a)||animationProfileFor(a,id,character)){a.animationBase||=fitTransform(old);saveAnimationProfile(a,id,character)}
  else if(a.animationBase)a.animationBase=fitTransform(a);
 }
 return items;
}
