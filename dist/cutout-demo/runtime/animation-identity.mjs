// A clip's identity is data, never its current display name or selector index.
const valid=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
function hash(value){let h=2166136261;for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
export const validAnimationId=valid;
export function builtinAnimationId(key){return 'nightcamp-animation-'+String(key).replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,70)+'-'+hash(String(key))+'-v1'}
export function newAnimationId(){return 'animation-'+globalThis.crypto.randomUUID()}
export function ensureAnimationId(clip,{sourceKey}={}){
 if(clip.id!==undefined&&!valid(clip.id))throw Error('ID hoạt ảnh không hợp lệ');
 // Legacy migration is deterministic even when the old file is imported twice.
 clip.id||=sourceKey?builtinAnimationId(sourceKey):'animation-legacy-'+hash([clip.name,clip.kind,clip.dur,clip.keys]);
 return clip.id;
}
export function animationPack(clip){const c=structuredClone(clip);ensureAnimationId(c);return {format:'darkin-animation-pack-v1',version:1,animationId:c.id,clip:c}}
export function readAnimationPack(pack){if(pack?.format!=='darkin-animation-pack-v1'||pack.version!==1||!valid(pack.animationId)||pack.clip?.id!==pack.animationId)throw Error('Gói hoạt ảnh / ID không hợp lệ');return structuredClone(pack.clip)}
