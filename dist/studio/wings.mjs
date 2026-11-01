// Wings use the same rigid FK/keyframe format as custom pets, but are equipped
// as a back attachment. No inherited character bones, mesh or game globals.
import {validatePet,resolvedWingView,boneMatrices,point} from './pets/runtime.mjs';
import {createBlankPet,descendants} from './pets/rig-authoring.mjs';
export const EMPTY_IMAGE='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVQIHWP4z8DwHwAFgAI/ScLbtAAAAABJRU5ErkJggg==';
export const DEFAULT_WING_VIEW={version:2,mode:'three-quarter',yaw:55,farScale:.96,sweep:.15};
export function prepareWingProject(project){
 const p=structuredClone(project);p.wingView=resolvedWingView(p.wingView)||{...DEFAULT_WING_VIEW};
 for(const b of p.bones)if(b.wingSide===undefined){
  if(b.id==='wing'&&p.id==='falcon_wings')b.wingSide='pair';
  else if(b.id==='wingLeft'){b.wingSide='near';b.wingSource='left'}
  else if(b.id==='wingRight'){b.wingSide='far';b.wingSource='right'}
  else if(b.sprite&&!p.bones.find(n=>n.id===b.parent)?.wingSide)b.wingSide='near';
 }
 return validatePet(p);
}
// Explicit rest-rig calibration for sheets where the far artwork itself was
// painted smaller. Do not run on load: preserve hand-authored scales by default.
export function balanceWingSizes(project,ratio=.96){
 const p=prepareWingProject(project);p.wingView.farScale=ratio;p.wingView.version=2;
 if(p.bones.some(b=>b.wingSide==='pair'&&b.sprite))return {project:validatePet(p),resized:false};
 const roots=side=>p.bones.filter(b=>b.wingSide===side),near=roots('near'),far=roots('far');
 if(near.length!==1||far.length!==1||descendants(p,near[0].id).has(far[0].id)||descendants(p,far[0].id).has(near[0].id))throw Error('Đặt đúng một gốc Cánh gần và một gốc Cánh xa, mỗi gốc chứa các đoạn con. Hoặc chọn vai trò Ảnh nguyên đôi cánh.');
 const flat={...p,wingView:{...p.wingView,mode:'front'}},M=boneMatrices(flat,{});
 const reach=root=>{const ids=descendants(p,root.id),origin=point(M[root.id],0,0);let max=0;for(const b of p.bones){const s=p.sprites[b.sprite];if(!ids.has(b.id)||!s||b.visible===false)continue;for(const x of [-b.pivot[0]*s.w,(1-b.pivot[0])*s.w])for(const y of [-b.pivot[1]*s.h,(1-b.pivot[1])*s.h]){const pt=point(M[b.id],x,y);max=Math.max(max,Math.hypot(pt[0]-origin[0],pt[1]-origin[1]))}}return max};
 const a=reach(near[0]),b=reach(far[0]);if(a<1e-6||b<1e-6)throw Error('Gán ảnh cho cả cánh gần và cánh xa trước khi cân.');
 const factor=a/b;if(Math.abs(factor-1)>1e-7)far[0].scale*=factor;
 return {project:validatePet(p),resized:Math.abs(factor-1)>1e-7};
}
export function createWingCatalog(catalog){
 const blank=createBlankPet('custom_wings','Cánh mới');
 const pair=createBlankPet('paired_wings','Khung cánh hai bên · gán ảnh riêng');
 const bone=(id,parent,at,name)=>({id,name,parent,sprite:null,pivot:[.5,.5],at,scale:1,visible:true});
 pair.bones.push(bone('wingLeft','root',[-5,0],'Gốc cánh trái'),bone('wingLeftTip','wingLeft',[-35,-12],'Ngọn cánh trái'),bone('wingRight','root',[5,0],'Gốc cánh phải'),bone('wingRightTip','wingRight',[35,-12],'Ngọn cánh phải'));
 const flap={name:'Vỗ cánh · mẫu góc, chưa có ảnh',kind:'loop',dur:1,hit:0,keys:[0,.25,.5,.75,1].map(t=>({t,curve:'inout',P:{'wingLeft:rot':Math.sin(t*Math.PI*2)*.25,'wingRight:rot':-Math.sin(t*Math.PI*2)*.25,'wingLeftTip:rot':Math.sin(t*Math.PI*2-.5)*.15,'wingRightTip:rot':-Math.sin(t*Math.PI*2-.5)*.15}}))};
 pair.clip=flap;pair.clips={idle:structuredClone(flap)};
 const rigs={custom_wings:blank,paired_wings:pair};
 const ids=['rig_wfalcon_cape','rig_wfalcon_wings1','rig_wfalcon_wings2'];
 if(ids.every(id=>catalog.sprites[id])){
  const p=createBlankPet('falcon_wings','Falcon · ảnh gập / hé / mở có sẵn');
  p.sprites=Object.fromEntries(ids.map(id=>{const s=catalog.sprites[id];return [id,{src:s.src,w:s.w,h:s.h}]}));p.spriteOrder=ids;
  const pivots=Object.fromEntries(ids.map(id=>{const s=catalog.sprites[id];return [id,[s.joints.top[0]/s.w,s.joints.top[1]/s.h]]}));
  p.bones.push({id:'wing',name:'Cánh · biến thể ảnh',parent:'root',sprite:ids[0],pivot:pivots[ids[0]],variantPivots:pivots,at:[0,0],scale:1,visible:true});
  const clip=(name,keys,dur=1.5,kind='loop')=>({name,kind,dur,hit:0,keys:keys.map(([t,img,rot=0])=>({t,curve:'inout',P:{'wing:img':img,'wing:rot':rot}}))});
  p.clips={idle:clip('Gập → mở → gập',[[0,0],[.25,1],[.5,2],[.9,2],[1.15,1],[1.5,0]]),open:clip('Mở · dao động cutout',[[0,2,-.07],[.5,2,.07],[1,2,-.07]],1),fold:clip('Gập',[[0,0]],1,'pose')};p.clip=structuredClone(p.clips.idle);rigs.falcon_wings=p;
 }
 for(const [id,p]of Object.entries(rigs))rigs[id]=prepareWingProject(p);return {rigs};
}
export function makeWingAttachment(project,previous){
 validatePet(project);
 return {...(previous||{id:'wings_'+Date.now().toString(36),x:0,y:0,scale:1,rotation:0,visible:true}),name:project.name,socket:'back',layer:'back',src:EMPTY_IMAGE,w:1,h:1,anchor:[0,0],wingRig:structuredClone(project)};
}
export async function loadAttachmentSprites(items,load,register,prefix){
 return Promise.all((items||[]).map(async(item,i)=>{
  const a=structuredClone(item),name=prefix+'_attachment_'+i;
  if(a.wingRig){await Promise.all(a.wingRig.spriteOrder.map(async id=>{const s=a.wingRig.sprites[id],key=name+'_'+id;register(key,await load(s.src));s.sprite=key}));}
  else {register(name,await load(a.src));a.sprite=name}
  return a;
 }));
}
export function attachmentImages(project){return [...Object.values(project.parts),...(project.attachments||[]).flatMap(a=>a.wingRig?Object.values(a.wingRig.sprites):[a])]}
