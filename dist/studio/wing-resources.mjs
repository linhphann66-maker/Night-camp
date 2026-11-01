import {validatePet} from './pets/runtime.mjs';
import {prepareWingProject} from './wings.mjs';
export const NEW_NEAR='@new_near',NEW_FAR='@new_far',VARIANTS='@variants';
export function wingResourceRoles(p){return [[NEW_NEAR,'＋ Xương cánh gần mới'],[NEW_FAR,'＋ Xương cánh xa mới'],[VARIANTS,'Ảnh động / biến thể của xương đang chọn'],...p.bones.map(b=>[b.id,b.name||b.id])]}
export function wingResources(p){return p.spriteOrder.filter(id=>p.sprites[id].imported).map(id=>({id,...structuredClone(p.sprites[id])}))}
export function wingResourceRole(r,p){return wingResourceRoles(p).some(([id])=>id===r.part)?r.part:''}
export function wingSelection(resources){const seen=new Map(),selected=new Set();for(const r of resources)if(r.part?.startsWith('@'))selected.add(r.id);else if(r.part)seen.set(r.part,r.id);for(const id of seen.values())selected.add(id);return selected}
export function wingAssignments(resources,p){
 const seen=new Set(),variants=resources.some(r=>r.part===VARIANTS);
 if(variants&&resources.some(r=>r.part!==VARIANTS))throw Error('Chọn cùng kiểu Ảnh động cho mọi mảnh, hoặc nhập bộ phận riêng.');
 for(const r of resources){const role=wingResourceRole(r,p);if(!role)throw Error('Chọn xương / kiểu nhập cho '+r.name);if(!role.startsWith('@')){if(seen.has(role))throw Error('Có nhiều mảnh cùng gán vào một xương. Dùng Ảnh động để tạo frame từ nhiều tư thế.');seen.add(role)}}
 return structuredClone(resources);
}
// Changes are atomic; sprite indices already referenced by animations never move.
// A single sheet-wide unit scale keeps large/small fragments in proportion.
export function applyWingResources(project,newResources,assignments,updates=[],{selectedBone,step=.15,replaceSheet=false,sourceDirection='left'}={}){
 if(!['left','right'].includes(sourceDirection))throw Error('Hướng ngọn cánh không hợp lệ');
 const p=prepareWingProject(project),selected=p.bones.find(b=>b.id===selectedBone);if(!selected)throw Error('Chọn xương trước khi nhập ảnh cánh');
 const oldIds=new Set(p.spriteOrder),size=Math.max(1,...newResources.map(r=>r.w)),unit=Math.min(1,140/size);
 for(const r of newResources){if(p.sprites[r.id])throw Error('Trùng ID tài nguyên');p.spriteOrder.push(r.id);p.sprites[r.id]={src:r.src,w:r.w*unit,h:r.h*unit,name:r.name,part:r.part||'',imported:true,rect:r.rect}}
 for(const r of updates){const s=p.sprites[r.id];if(!s?.imported)throw Error('Tài nguyên không còn trong project');s.name=r.name;s.part=r.part||''}
 for(const r of assignments)if(!p.sprites[r.id]||!oldIds.has(r.id)&&!newResources.some(n=>n.id===r.id))throw Error('Tài nguyên chưa được lưu');
 if(assignments.length){
  wingAssignments(assignments,p);
  if(assignments.every(r=>r.part===VARIANTS)){
   if(!Number.isFinite(step)||step<.01||step>5||assignments.length*step>30)throw Error('Thời lượng ảnh động tối đa 30 giây; giảm bước frame hoặc số ảnh.');
   const base=structuredClone(p.clip.keys[0].P),keys=assignments.map((r,i)=>({t:Number((i*step).toFixed(6)),curve:'step',P:{...base,[selected.id+':img']:p.spriteOrder.indexOf(r.id)}}));
   const dur=Math.max(.1,Number((assignments.length*step).toFixed(6)));keys.push({t:dur,curve:'step',P:structuredClone(keys[0].P)});
   p.clips||={};p.clips[p.activeClipId||'idle']=structuredClone(p.clip);let id='sheet_animation';while(p.clips[id])id+='_';p.clip={name:'Vỗ cánh · ảnh đã tách',kind:'loop',dur,hit:0,keys};p.clips[id]=structuredClone(p.clip);p.activeClipId=id;
   selected.sprite=assignments[0].id;selected.pivot=[sourceDirection==='left'?.94:.06,.75];
   let ancestor=p.bones.find(b=>b.id===selected.parent);while(ancestor&&!ancestor.wingSide)ancestor=p.bones.find(b=>b.id===ancestor.parent);
   if(selected.wingSide||!['near','far'].includes(ancestor?.wingSide))selected.wingSide=selected.wingSide==='far'?'far':'near';selected.wingSource=sourceDirection;
   selected.variantPivots||={};for(const r of assignments){selected.variantPivots[r.id]=[...selected.pivot];p.sprites[r.id].part=VARIANTS}
  }else{
   const allNew=assignments.every(r=>[NEW_NEAR,NEW_FAR].includes(r.part));
   if(replaceSheet&&allNew){selected.sprite=null;selected.wingSide='center';const clean=c=>{for(const k of c.keys)delete k.P[selected.id+':img']};clean(p.clip);for(const c of Object.values(p.clips||{}))clean(c)}
   for(const r of assignments){
    let b=p.bones.find(b=>b.id===r.part);
    if(!b){let id='wing_piece_'+r.id;while(p.bones.some(b=>b.id===id))id+='_';const far=r.part===NEW_FAR;b={id,name:r.name,parent:selected.id,sprite:null,pivot:[sourceDirection==='left'?.94:.06,.75],at:[0,0],scale:1,rotation:0,visible:true,wingSide:far?'far':'near',wingSource:sourceDirection};p.bones.push(b)}
    b.sprite=r.id;p.sprites[r.id].part=b.id;
    let ancestor=p.bones.find(n=>n.id===b.parent);while(ancestor&&!ancestor.wingSide)ancestor=p.bones.find(n=>n.id===ancestor.parent);
    if(b.wingSide==='center'||!b.wingSide&&!['near','far'].includes(ancestor?.wingSide))b.wingSide='near';b.wingSource=sourceDirection;
   }
  }
 }
 // All assigned resources must have been saved or already exist in the gallery.
 for(const r of assignments)if(!p.sprites[r.id]||!oldIds.has(r.id)&&!newResources.some(n=>n.id===r.id))throw Error('Tài nguyên chưa được lưu');
 return validatePet(p);
}
