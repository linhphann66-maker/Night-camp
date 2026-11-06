// Data-only character skills. Trusted engine code, no eval or imported JS in a pack.
import {sample,CURVES,PARTS} from './model.mjs';
import {validAnimationId} from './animation-identity.mjs';
import {validateAccessoryPack,resolveAccessory,mergeAccessoryProfiles} from './accessory-runtime.mjs';
export const CHARACTER_SKILL_FORMAT='darkin-character-skill-pack-v1';
export const CHARACTER_SKILL_RUNTIME_VERSION=2;
export const CHARACTER_SKILL_LIGHT_ENCODING='max-channel-alpha-v1';
// PixelFX light buffers store RGB energy, not opaque paint. Keep premultiplied
// RGB energy unchanged while making faint glow faintly transparent. This is
// also the upstream composite() convention over a transparent background.
export function encodeCharacterSkillLight(bytes){
 for(let i=0;i<bytes.length;i+=4){const a=Math.max(bytes[i],bytes[i+1],bytes[i+2]);for(let k=0;k<3;k++)bytes[i+k]=a?Math.round(bytes[i+k]*255/a):0;bytes[i+3]=a}return bytes;
}
export const CHARACTER_SKILL_RIG='nightcamp-humanoid-v1';
export const SKILL_ANCHORS=['feet','handF','handB','weapon','head','target'];
const finite=(v,a,b)=>Number.isFinite(v)&&v>=a&&v<=b,fail=m=>{throw Error(m)},png=s=>typeof s==='string'&&s.length<=16*1024*1024&&/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(s),valid=id=>validAnimationId(id),dict=o=>!!o&&typeof o==='object'&&!Array.isArray(o);
export function validateCharacterAnimation(c){
 if(!c||!valid(c.id)||typeof c.name!=='string'||!c.name.trim()||!['loop','walk','pose','attack'].includes(c.kind)||!finite(c.dur,.1,30)||!finite(c.hit,0,c.dur)||!Array.isArray(c.keys)||!c.keys.length||c.keys.length>2000)fail('Hoạt ảnh skill không hợp lệ');
 const times=new Set();for(const k of c.keys){if(!finite(k.t,0,c.dur)||times.has(k.t)||!Object.hasOwn(CURVES,k.curve)||!dict(k.P)||Object.values(k.P).some(v=>typeof v!=='boolean'&&!Number.isFinite(v)))fail('Frame hoạt ảnh skill không hợp lệ');times.add(k.t)}return c;
}
export function validateCharacterSkill(s,{draft=false}={}){
 if(!s||!valid(s.id)||typeof s.name!=='string'||!s.name.trim()||s.name.length>150||s.weaponId!==null&&!valid(s.weaponId)||!valid(s.animationId)||!finite(s.duration,.1,30)||!finite(s.hitAt,0,s.duration)||!Array.isArray(s.tracks)||s.tracks.length>32)fail('Thông tin skill nhân vật không hợp lệ');
 const ids=new Set();for(const t of s.tracks){if(!valid(t.id)||ids.has(t.id)||typeof t.sourceId!=='string'||!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(t.sourceId)||!finite(t.at,0,s.duration)||!finite(t.duration,.01,30)||t.at+t.duration>s.duration+1e-6||!finite(t.x,-2000,2000)||!finite(t.y,-2000,2000)||!finite(t.scale,.05,10)||!finite(t.rotation,-3600,3600)||!finite(t.opacity,0,1)||!SKILL_ANCHORS.includes(t.anchor)||!['front','back','both'].includes(t.plane)||typeof t.visible!=='boolean'||!Number.isInteger(t.seed)||!finite(t.seed,0,2147483647)||!Array.isArray(t.palette)||t.palette.length>16||t.palette.some(c=>!/^#[a-fA-F0-9]{6}$/.test(c))||!draft&&!valid(t.effectId))fail('Mốc hiệu ứng skill không hợp lệ');ids.add(t.id)}return s;
}
export function validateCharacterSkillDraft(d){if(!d||d.version!==1||!dict(d.skills)||Object.keys(d.skills).length>64||d.activeSkillId!==null&&!Object.hasOwn(d.skills,d.activeSkillId))fail('Thư viện skill nhân vật không hợp lệ');for(const[id,s]of Object.entries(d.skills)){if(id!==s.id)fail('ID skill nháp không khớp');validateCharacterSkill(s,{draft:true})}return d}
export function validateCharacterSkillPack(p){
 if(p?.format!==CHARACTER_SKILL_FORMAT||p.version!==1||p.rigContract!==CHARACTER_SKILL_RIG||![p.skills,p.animations,p.effects].every(dict)||!Object.keys(p.skills).length||Object.keys(p.skills).length>64||Object.keys(p.effects).length>64||Object.keys(p.animations).length>64)fail('Không đúng gói skill nhân vật');
 if(p.weapons!==null)validateAccessoryPack(p.weapons);
 const weapons=new Set(p.weapons?.items.map(a=>a.accessoryId)||[]);
 let totalPixels=0,totalBytes=0;for(const e of Object.values(p.effects)){if(!e||!dict(e.sheets))fail('Atlas không hợp lệ');totalPixels+=(e.columns*e.w*Math.ceil(e.count/e.columns)*e.h)*Object.keys(e.sheets).length;totalBytes+=Object.values(e.sheets).reduce((n,s)=>n+(typeof s==='string'?s.length:0),0)}if(!Number.isFinite(totalPixels)||totalPixels>32_000_000||totalBytes>48*1024*1024)fail('Gói có quá nhiều atlas lớn; hãy tách bộ chiêu để tránh đầy bộ nhớ');
 for(const[id,c]of Object.entries(p.animations)){if(id!==c.id)fail('ID hoạt ảnh không khớp');validateCharacterAnimation(c)}
 for(const[id,e]of Object.entries(p.effects)){if(!valid(id)||!e||!['original','peripheral-only'].includes(e.variant)||typeof e.sourceId!=='string'||!/^[a-z0-9-]+\/[a-z0-9-]+$/.test(e.sourceId)||!/^[a-f0-9]{40}$/.test(e.sourceRevision)||!finite(e.duration,.01,30)||!Number.isInteger(e.w)||!finite(e.w,1,1024)||!Number.isInteger(e.h)||!finite(e.h,1,1024)||!Array.isArray(e.pivot)||e.pivot.length!==2||!e.pivot.every(v=>finite(v,-2048,2048))||!Number.isInteger(e.columns)||!finite(e.columns,1,128)||!Number.isInteger(e.count)||!finite(e.count,1,240)||e.columns*e.w>4096||Math.ceil(e.count/e.columns)*e.h>4096||e.columns*e.w*Math.ceil(e.count/e.columns)*e.h>6_000_000||!dict(e.sheets)||Object.keys(e.sheets).some(k=>!['backColor','backLight','frontColor','frontLight'].includes(k))||Object.values(e.sheets).some(s=>!png(s)))fail('Atlas PixelFX không hợp lệ')}
 for(const e of Object.values(p.effects))if(e.lightEncoding!==undefined&&e.lightEncoding!==CHARACTER_SKILL_LIGHT_ENCODING)fail('Cách mã hóa ánh sáng skill chưa được hỗ trợ');
 for(const[id,s]of Object.entries(p.skills)){if(id!==s.id)fail('ID skill không khớp');validateCharacterSkill(s);const c=p.animations[s.animationId];if(!c||c.dur>s.duration+1e-6||s.weaponId!==null&&!weapons.has(s.weaponId)||s.tracks.some(t=>!Object.hasOwn(p.effects,t.effectId)||p.effects[t.effectId].sourceId!==t.sourceId))fail('Thiếu hoạt ảnh, vũ khí hoặc hiệu ứng được skill tham chiếu');if(s.tracks.some(t=>t.anchor==='weapon')&&s.weaponId===null)fail('Neo vũ khí cần liên kết một vũ khí')}
 if(!p.attribution||typeof p.attribution.license!=='string'||!p.attribution.license.includes('MIT License')||typeof p.attribution.notice!=='string')fail('Thiếu giấy phép PixelFX');return p;
}
export function createCharacterSkill(clip,weaponId=null){return {id:'skill-'+crypto.randomUUID(),name:'Quét kiếm mới',weaponId,animationId:clip.id,duration:clip.dur,hitAt:clip.hit,tracks:[]}}
export function newCharacterSkillTrack(entry,at=0){return {id:'track-'+crypto.randomUUID(),sourceId:entry.sourceId,at,duration:entry.duration,anchor:'feet',x:0,y:0,scale:2.5,rotation:0,opacity:1,plane:'both',visible:true,seed:2,palette:[]}}
export function atlasFrame(e,age,duration){return Math.max(0,Math.min(e.count-1,Math.floor(age/duration*e.count)))}
export async function loadCharacterSkillImages(pack){
 validateCharacterSkillPack(pack);const images=new Map(),legacyLight=new Set(),keepOriginal=new Set();
 await Promise.all([...new Set(Object.values(pack.effects).flatMap(e=>Object.values(e.sheets)))].map(src=>new Promise((ok,no)=>{const im=new Image();im.onload=()=>{if(im.naturalWidth*im.naturalHeight>6_000_000)return no(Error('Atlas quá lớn'));images.set(src,im);ok()};im.onerror=()=>no(Error('Không đọc được ảnh skill'));im.src=src})));
 for(const e of Object.values(pack.effects))for(const [key,src]of Object.entries(e.sheets)){const im=images.get(src);if(im.naturalWidth!==e.columns*e.w||im.naturalHeight!==Math.ceil(e.count/e.columns)*e.h)fail('Kích thước ảnh atlas không khớp metadata');(key.endsWith('Light')&&!e.lightEncoding?legacyLight:keepOriginal).add(src)}
 // Repair v1 exports at load time, once per atlas, never in the render loop.
 // Separate keys keep a shared PNG usable as color as well as legacy light.
 for(const src of legacyLight){const im=images.get(src),cv=Object.assign(document.createElement('canvas'),{width:im.naturalWidth,height:im.naturalHeight}),ctx=cv.getContext('2d');ctx.drawImage(im,0,0);const data=ctx.getImageData(0,0,cv.width,cv.height);encodeCharacterSkillLight(data.data);ctx.putImageData(data,0,0);images.set('light:'+src,cv);if(!keepOriginal.has(src))images.delete(src)}return images;
}
export function mergeCharacterSkillPacks(current,incoming){validateCharacterSkillPack(current);validateCharacterSkillPack(incoming);const p=structuredClone(current);for(const key of ['skills','animations','effects'])Object.assign(p[key],structuredClone(incoming[key]));if(incoming.weapons){const items=new Map((p.weapons?.items||[]).map(a=>[a.accessoryId,a]));for(const a of incoming.weapons.items)items.set(a.accessoryId,mergeAccessoryProfiles(items.get(a.accessoryId),a));p.weapons={format:'darkin-accessory-pack-v1',version:2,items:[...items.values()]}}return validateCharacterSkillPack(p)}
// Both Studio and games use this exact placement math (world/rig units).
export function characterSkillAnchor({equip,pose,character,weaponId,x,y,scale},anchor){
 const NC=globalThis.NC||globalThis.window?.NC;if(!NC)fail('Chưa nạp Cutout renderer');if(anchor==='feet')return [x,y];if(anchor==='target')return [x+(pose.face||1)*85*scale,y];
 const joints=NC.rigJoints(equip,pose,x,y,scale);if(anchor==='handF')return joints.haN;if(anchor==='handB')return joints.haF;if(anchor==='head')return joints.headTop;
 const raw=NC.ITEMS[equip.top]?.attachments?.find(a=>a.visible!==false&&(a.accessoryId||a.id)===weaponId);if(!raw)return null;const a=pose.animationEditing?raw:resolveAccessory(raw,character,pose.animationId),m=NC.attachmentMatrix(equip,pose,a,x,y,scale);return [m.e,m.f];
}
export function drawCharacterSkillTrack(ctx,t,e,age,images,placement,plane,{pixelated=true}={}){
 if(t.visible===false||age<0||age>=t.duration||t.plane!=='both'&&t.plane!==plane)return;const anchor=characterSkillAnchor(placement,t.anchor);if(!anchor)return;const frame=atlasFrame(e,age,t.duration),sx=frame%e.columns*e.w,sy=Math.floor(frame/e.columns)*e.h;ctx.save();try{ctx.translate(...anchor);ctx.scale((placement.pose.face||1)*placement.scale,placement.scale);ctx.translate(t.x,t.y);ctx.rotate(t.rotation*Math.PI/180);ctx.scale(t.scale,t.scale);ctx.globalAlpha*=t.opacity;ctx.imageSmoothingEnabled=!pixelated;for(const suffix of ['Color','Light']){const src=e.sheets[plane+suffix],img=(suffix==='Light'&&!e.lightEncoding?images.get('light:'+src):null)||images.get(src);if(!img)continue;ctx.globalCompositeOperation=suffix==='Light'?'lighter':'source-over';ctx.drawImage(img,sx,sy,e.w,e.h,-e.pivot[0],-e.pivot[1],e.w,e.h)}}finally{ctx.restore()}
}
export function equippedCharacterWeapon(player){return player.spec.attachments?.find(a=>a.visible!==false&&(a.category==='weapon'||['handF','handB'].includes(a.animationBase?.socket||a.socket)))?.accessoryId||player.spec.weapon?.id||null}
export class CharacterSkillController{
 static async load(player,pack,options={}){pack=structuredClone(validateCharacterSkillPack(pack));if(player.spec?.format!=='cutout-character-v1'||!PARTS.every(k=>player.spec.parts?.[k]))fail('Nhân vật không cùng hợp đồng xương Cutout');const images=await loadCharacterSkillImages(pack);for(const clip of Object.values(pack.animations))player.addAnimation({format:'darkin-animation-pack-v1',version:1,animationId:clip.id,clip});return new CharacterSkillController(player,pack,images,options)}
 constructor(player,pack,images,{ownedSkills=[],getWeaponId=()=>equippedCharacterWeapon(player),onEvent=()=>{}}={}){this.player=player;this.pack=pack;this.images=images;this.ownedSkills=new Set(ownedSkills);this.getWeaponId=getWeaponId;this.onEvent=onEvent;this.active=null}
 get isCasting(){return !!this.active}
 canCast(id){const s=this.pack.skills[id];return !s?'unknown-skill':!this.ownedSkills.has(id)?'skill-not-owned':s.weaponId!==null&&s.weaponId!==this.getWeaponId()?'wrong-weapon':this.active?'busy':null}
 cast(id){const reason=this.canCast(id);if(reason)return {ok:false,reason};const skill=this.pack.skills[id];this.player.play(skill.animationId,{restart:true});this.player.blend=null;this.active={skill,time:0,face:this.player.face,hit:false};this.onEvent({type:'cast-visual',skillId:id,animationId:skill.animationId,weaponId:skill.weaponId});return {ok:true}}
 seek(time){if(!this.active)return;const a=this.active,c=this.pack.animations[a.skill.animationId];a.time=Math.max(0,Math.min(a.skill.duration,time));this.player.time=Math.min(a.time,c.dur);this.player.attachmentTime=a.time;this.player.pose=sample(c,this.player.time);this.player.face=a.face}
 update(dt,onNormalHit=()=>{}){if(!finite(dt,0,1))fail('dt skill phải là giây, trong 0–1');if(!this.active){this.player.update(dt,onNormalHit);return}const a=this.active;if(a.skill.weaponId!==null&&this.getWeaponId()!==a.skill.weaponId){this.cancel('weapon-changed');this.player.update(dt,onNormalHit);return}this.seek(a.time+dt);if(!a.hit&&a.time>=a.skill.hitAt){a.hit=true;this.onEvent({type:'hit-marker-visual',skillId:a.skill.id,weaponId:a.skill.weaponId})}if(a.time>=a.skill.duration)this.cancel('completed')}
 async addPack(incoming){const pack=mergeCharacterSkillPacks(this.pack,incoming),images=await loadCharacterSkillImages(pack);for(const clip of Object.values(pack.animations))this.player.addAnimation({format:'darkin-animation-pack-v1',version:1,animationId:clip.id,clip});this.cancel('pack-updated');this.pack=structuredClone(pack);this.images=images;return this}
 cancel(reason='cancelled'){const a=this.active;this.active=null;if(a){this.onEvent({type:reason==='completed'?'completed':'cancelled',skillId:a.skill.id,reason});if(this.player.spec.clips.idle)this.player.play('idle',{restart:true})}}
 drawEffects(ctx,x,y,scale,plane){const a=this.active;if(!a)return;const p=this.player,placement={equip:p.equip,character:p.spec,pose:{...p.pose,face:p.face,animationId:a.skill.animationId,attachmentTime:a.time,headId:p.spec.headId,bodyId:p.spec.bodyId,mountSignatures:p.spec.mountSignatures},weaponId:a.skill.weaponId,x,y,scale};for(const t of a.skill.tracks)drawCharacterSkillTrack(ctx,t,this.pack.effects[t.effectId],a.time-t.at,this.images,placement,plane)}
 draw(ctx,x,y,scale,options={}){this.drawEffects(ctx,x,y,scale,'back');this.player.draw(ctx,x,y,scale,options);this.drawEffects(ctx,x,y,scale,'front')}
}
