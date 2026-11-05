import {validateAttachments} from './attachments.mjs';
import {ACCESSORY_FORMAT,ORIGINAL_HEAD_ID,validMountId,fingerprint,targetSignature,mountTarget,fitTransform,validateProfile,validateAccessoryPack,resolveAccessory,validateAnimationProfiles} from './accessory-runtime.mjs';
export {ORIGINAL_HEAD_ID,targetSignature,mountTarget};
const partFor=(p,t)=>p.parts[t==='head'?'head':'torso'];
function initialId(p,target,catalog){
 const part=partFor(p,target),slot=target==='head'?'head':'torso';
 const rig=catalog?.rigs.find(r=>{const ref=catalog.sprites['rig_'+r+'_'+slot];return ref&&ref.src===part.src&&targetSignature(ref)===targetSignature(part)});
 return rig?(target==='head'&&rig==='traveler'?ORIGINAL_HEAD_ID:'nightcamp-'+target+'-'+rig+'-v1'):'custom-'+target+'-'+fingerprint([part.src,targetSignature(part)]);
}
export function saveMountProfile(a,p){
 const target=mountTarget(a);if(!target)return a;
 const key=target==='head'?'headId':'bodyId',fit={target,[key]:p[key],signature:targetSignature(partFor(p,target)),transform:fitTransform(a)};validateProfile(fit);
 a.mountProfiles=(a.mountProfiles||[]).filter(f=>!(f.target===target&&f[key]===fit[key]&&f.signature===fit.signature));a.mountProfiles.push(fit);delete a.mountStatus;return a;
}
export function validateMountProject(p){
 for(const a of p.attachments||[])validateAnimationProfiles(a);
 for(const key of ['headId','bodyId'])if(p[key]!==undefined&&!validMountId(p[key]))throw Error('Mã đầu / thân chỉ gồm chữ Latin, số, _ hoặc -, tối đa 120 ký tự');
 const ids=new Set();for(const a of p.attachments||[]){if(a.accessoryId!==undefined){if(!validMountId(a.accessoryId)||ids.has(a.accessoryId))throw Error('Mã phụ kiện không hợp lệ hoặc trùng');ids.add(a.accessoryId)}if(a.mountProfiles!==undefined){if(!Array.isArray(a.mountProfiles)||a.mountProfiles.length>100)throw Error('Tối đa 100 cấu hình cho một phụ kiện');const keys=new Set();for(const f of a.mountProfiles){validateProfile(f);const key=f.target+':'+(f.headId||f.bodyId)+':'+f.signature;if(keys.has(key))throw Error('Cấu hình gắn bị trùng');keys.add(key);validateAttachments([{...a,...f.transform}])}}}
 return p;
}
// Called after edits. Old projects gain metadata only; no automatic resizing.
export function reconcileMounts(p,catalog){
 const changed={};p.mountState||={};p.mountSignatures||={};
 for(const target of ['head','body']){
  const key=target==='head'?'headId':'bodyId',part=partFor(p,target),signature=targetSignature(part),sourceKey=fingerprint(part.src),old=p.mountState[target];
  if(!p[key])p[key]=initialId(p,target,catalog);
  else if(old&&(old.signature!==signature||old.sourceKey!==sourceKey)&&p[key]===old.id)p[key]=initialId(p,target,catalog);
  if(!validMountId(p[key]))throw Error('Mã '+key+' không hợp lệ');
  changed[target]=!old||old.id!==p[key]||old.signature!==signature||old.sourceKey!==sourceKey;
  p.mountState[target]={id:p[key],signature,sourceKey};p.mountSignatures[target]=signature;
 }
 const ids=new Set();for(const a of p.attachments||[]){
  if(!a.accessoryId){const source=validMountId(a.sourceId)?a.sourceId:a.id;a.accessoryId=ids.has(source)?a.id:source}ids.add(a.accessoryId);
  a.mountProfiles||=[];
  const target=mountTarget(a);if(!target)continue;
  if(!a.mountProfiles?.length){saveMountProfile(a,p);continue}
  if(changed[target]){try{Object.assign(a,resolveAccessory(a,p));delete a.mountStatus}catch{a.visible=false;a.mountStatus='missing-profile'}}
  else if(a.mountStatus!=='missing-profile'&&!a.animationBase)saveMountProfile(a,p);
 }
 return validateMountProject(p);
}
export function setMountId(p,target,id){
 if(!validMountId(id))throw Error('Mã chỉ gồm chữ Latin, số, _ hoặc -, tối đa 120 ký tự');
 p[target==='head'?'headId':'bodyId']=id;return p;
}
export function rebasePortableMounts(p){
 for(const target of ['head','body'])if(p.mountState?.[target])p.mountState[target].sourceKey=fingerprint(partFor(p,target).src);
 return p;
}
export async function exportAccessoryPack(p,ids,portableImage){
 if(!Array.isArray(ids)||!ids.length||new Set(ids).size!==ids.length)throw Error('Chọn ít nhất một phụ kiện, không chọn trùng');
 const character={headId:p.headId,bodyId:p.bodyId,parts:structuredClone({head:p.parts.head,torso:p.parts.torso})};
 const items=ids.map(id=>{const a=p.attachments?.find(v=>v.id===id);if(!a)throw Error('Không tìm thấy phụ kiện đã chọn');if(a.mountStatus==='missing-profile'&&a.visible!==false)throw Error('Hãy lưu cấu hình cho đầu / thân hiện tại trước khi xuất '+a.name);return structuredClone(a)});
 for(const a of items){if(mountTarget(a)&&a.mountStatus!=='missing-profile'&&!a.animationBase)saveMountProfile(a,character);delete a.mountStatus;const sprites=a.wingRig?Object.values(a.wingRig.sprites):[a];await Promise.all(sprites.map(async s=>{s.src=await portableImage(s.src)}))}
 const pack={format:ACCESSORY_FORMAT,version:items.some(a=>a.animationProfiles?.length)?2:1,runtimeVersion:2,items};validateAccessoryPack(pack);validateAttachments(items);return pack;
}
export function importAccessoryPack(p,pack){
 validateAccessoryPack(pack);validateAttachments(pack.items);const next=structuredClone(p);next.attachments||=[];
 for(const original of pack.items){
  let a=structuredClone(original);
  const i=next.attachments.findIndex(v=>v.accessoryId===a.accessoryId);
  if(i>=0){const old=next.attachments[i];a.id=old.id;const profiles=new Map((old.mountProfiles||[]).map(f=>[f.target+':'+(f.headId||f.bodyId)+':'+f.signature,f]));for(const f of a.mountProfiles)profiles.set(f.target+':'+(f.headId||f.bodyId)+':'+f.signature,f);a.mountProfiles=[...profiles.values()]}
  else{a.id=a.accessoryId;let seq=1;while(next.attachments.some(v=>v.id===a.id))a.id=a.accessoryId+'_'+seq++}
  if(i>=0){const key=f=>f.animationId+':'+(f.targetId||''),profiles=new Map((next.attachments[i].animationProfiles||[]).map(f=>[key(f),f]));for(const f of a.animationProfiles||[])profiles.set(key(f),f);if(profiles.size)a.animationProfiles=[...profiles.values()];a.animationBase||=structuredClone(next.attachments[i].animationBase)}
  try{a=resolveAccessory(a,next,next.clip?.id)}catch{a.visible=false;a.mountStatus='missing-profile'}
  if(i>=0)next.attachments[i]=a;else next.attachments.push(a);
 }
 validateAttachments(next.attachments);validateMountProject(next);return next;
}
