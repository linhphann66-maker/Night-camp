// Dependency-free companion for games consuming accessory-only packages.
export const ACCESSORY_FORMAT='darkin-accessory-pack-v1';
export const ORIGINAL_HEAD_ID='nightcamp-head-original-v1';
export const FIT_FIELDS=['socket','layer','w','h','scale','x','y','rotation','anchor','headFit'];
export const validMountId=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,119}$/.test(id);
export function fingerprint(value){let h=2166136261;for(const c of JSON.stringify(value)){h^=c.charCodeAt(0);h=Math.imul(h,16777619)}return (h>>>0).toString(16).padStart(8,'0')}
export function targetSignature(part){
 if(!part)throw Error('Thiếu bộ phận để kiểm tra cấu hình gắn');
 const round=v=>typeof v==='number'?Math.round(v*10000)/10000:Array.isArray(v)?v.map(round):v;
 return fingerprint([round(part.w),round(part.h),Object.keys(part.joints||{}).sort().map(k=>[k,round(part.joints[k])]),round(part.head||null)]);
}
export function mountTarget(a){return a.wingRig||a.socket==='back'?'body':['head','face'].includes(a.socket)?'head':null}
export function fitTransform(a){return Object.fromEntries(FIT_FIELDS.filter(k=>a[k]!==undefined).map(k=>[k,structuredClone(a[k])]))}
export function validateProfile(f){
 const key=f?.target==='head'?'headId':f?.target==='body'?'bodyId':null,t=f?.transform;
 if(!key||!validMountId(f[key])||!/^[a-f0-9]{8}$/.test(f.signature||'')||!t||Object.keys(t).some(k=>!FIT_FIELDS.includes(k))||!['head','face','back'].includes(t.socket)||!['front','back'].includes(t.layer)||!['w','h','scale','x','y','rotation'].every(k=>Number.isFinite(t[k]))||t.w<1||t.w>2000||t.h<1||t.h>2000||t.scale<.05||t.scale>10||Math.abs(t.x)>2000||Math.abs(t.y)>2000||Math.abs(t.rotation)>20*Math.PI||!Array.isArray(t.anchor)||t.anchor.length!==2||!t.anchor.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||(f.target==='body')!==(t.socket==='back'))throw Error('Cấu hình gắn đầu / thân không hợp lệ');
 return f;
}
export function validateAccessoryPack(pack){
 if(pack?.format!==ACCESSORY_FORMAT||pack.version!==1||!Array.isArray(pack.items)||!pack.items.length||pack.items.length>32)throw Error('Không đúng gói phụ kiện v1 (tối đa 32 món)');
 const ids=new Set();
 for(const a of pack.items){
  if(!validMountId(a?.accessoryId)||ids.has(a.accessoryId))throw Error('Mã phụ kiện không hợp lệ hoặc trùng');ids.add(a.accessoryId);
  if(typeof a.id!=='string'||!['head','face','handF','handB','back'].includes(a.socket)||!['front','back'].includes(a.layer)||!['w','h','scale','x','y','rotation'].every(k=>Number.isFinite(a[k]))||a.w<1||a.w>2000||a.h<1||a.h>2000||a.scale<.05||a.scale>10||Math.abs(a.x)>2000||Math.abs(a.y)>2000||Math.abs(a.rotation)>20*Math.PI||!Array.isArray(a.anchor)||a.anchor.length!==2||!a.anchor.every(v=>Number.isFinite(v)&&v>=0&&v<=1)||(a.visible!==undefined&&typeof a.visible!=='boolean')||(a.wingRig&&(a.socket!=='back'||a.layer!=='back')))throw Error('Thông số phụ kiện không hợp lệ');
  if(typeof a.name!=='string'||!Array.isArray(a.mountProfiles)||a.mountProfiles.length>100)throw Error('Phụ kiện thiếu danh sách cấu hình');
  const keys=new Set();for(const f of a.mountProfiles){validateProfile(f);const k=f.target+':'+(f.headId||f.bodyId)+':'+f.signature;if(keys.has(k))throw Error('Cấu hình gắn bị trùng');keys.add(k)}
  if(mountTarget(a)&&!a.mountProfiles.some(f=>f.target===mountTarget(a)))throw Error('Phụ kiện chưa có cấu hình đúng loại điểm gắn');
  const sprites=a.wingRig?Object.values(a.wingRig.sprites||{}):[a];
  if(!sprites.length||sprites.some(s=>!/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(s.src||'')))throw Error('Gói phụ kiện phải chứa đủ ảnh PNG/WebP, không phụ thuộc server cũ');
 }
 return pack;
}
// Never infer a fit from an outfit name or silently use another head's fit.
// Pass parts as well as IDs to catch accidental reuse after changing geometry.
export function resolveAccessory(item,character){
 const a=structuredClone(item),target=mountTarget(a);delete a.mountStatus;
 if(!target)return a;
 const key=target==='head'?'headId':'bodyId',id=character[key],part=character.parts?.[target==='head'?'head':'torso'];
 if(!validMountId(id))throw Error('Nhân vật thiếu '+key);
 const profiles=(a.mountProfiles||[]).filter(f=>f.target===target&&f[key]===id);
 const signature=part?targetSignature(part):character.mountSignatures?.[target];
 if(!signature)throw Error('Cần parts hoặc mountSignatures để kiểm tra đúng kích thước '+key);
 const fit=profiles.find(f=>f.signature===signature);
 if(!fit)throw Error('Chưa có cấu hình '+a.name+' cho '+key+'='+id+' ('+signature+')');
 validateProfile(fit);for(const k of FIT_FIELDS)delete a[k];Object.assign(a,structuredClone(fit.transform));return a;
}
export function equipAccessory(inventory,item,character){
 const a=resolveAccessory(item,character);a.id=a.accessoryId||a.id;a.visible=true;
 const type=v=>v.wingRig?'wings':v.category||({head:'hat',face:'glasses',handF:'weapon',handB:'weapon',back:'wings'})[v.socket];
 const next=inventory.filter(v=>(v.accessoryId||v.id)!==(a.accessoryId||a.id)).map(v=>({...structuredClone(v),visible:type(v)===type(a)?false:v.visible}));next.push(a);return next;
}
