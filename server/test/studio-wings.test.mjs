import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createWingCatalog,makeWingAttachment,loadAttachmentSprites,attachmentImages} from '../../dist/studio/wings.mjs';
import {validateAttachments} from '../../dist/studio/attachments.mjs';
import {validate,gameExport,PARTS} from '../../dist/studio/model.mjs';
import {boneMatrices,samplePet} from '../../dist/studio/pets/runtime.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url)));
const wings=createWingCatalog(catalog).rigs;
const parts=()=>Object.fromEntries(PARTS.map(id=>[id,structuredClone(catalog.sprites['rig_traveler_'+id])]));
const hero=wing=>({format:'nightcamp-cutout-v1',rig:'traveler',parts:parts(),attachments:[makeWingAttachment(wing)],clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]}});
test('wings have an empty neutral project, an editable two-sided FK frame and truthful Falcon image variants',()=>{
 assert.equal(wings.custom_wings.bones.length,1);assert.equal(wings.custom_wings.clip.keys.length,1);assert.equal(wings.custom_wings.spriteOrder.length,0);
 assert.equal(wings.paired_wings.bones.length,5);assert.equal(wings.paired_wings.bones.find(b=>b.id==='wingLeftTip').parent,'wingLeft');
 assert.equal(wings.falcon_wings.spriteOrder.length,3);assert.equal(wings.falcon_wings.bones.length,2);
 for(const id of wings.falcon_wings.spriteOrder)assert.ok(fs.existsSync(new URL('../../dist-full/game-20261025-1758/'+wings.falcon_wings.sprites[id].src,import.meta.url)));
 const p=samplePet(wings.paired_wings.clip,.25),M=boneMatrices(wings.paired_wings,p);assert.notEqual(M.wingLeftTip[5],-12);assert.equal(p['wingLeft:rot'],-p['wingRight:rot']);
});
test('wing accessories validate independently and keep user offsets, scale and visibility on replacement',()=>{
 const a=makeWingAttachment(wings.falcon_wings);validateAttachments([a]);a.x=-5;a.y=12;a.scale=1.8;a.rotation=.3;a.visible=false;
 const b=makeWingAttachment(wings.paired_wings,a);for(const k of ['id','x','y','scale','rotation','visible'])assert.equal(a[k],b[k]);validateAttachments([b]);
 assert.throws(()=>validateAttachments([{...b,socket:'head'}]));const invalid=structuredClone(b);invalid.wingRig.bones[1].parent='wingLeftTip';assert.throws(()=>validateAttachments([invalid]));
});
test('sprite preparation and portable image enumeration include every nested wing image without mutating authored data',async()=>{
 const p=hero(wings.falcon_wings),before=JSON.stringify(p),seen=[];
 const a=await loadAttachmentSprites(p.attachments,async src=>({src}),(key,img)=>seen.push([key,img]),'hero');
 assert.equal(seen.length,3);assert.equal(attachmentImages(p).length,9);assert.equal(JSON.stringify(p),before);
 for(const s of Object.values(a[0].wingRig.sprites))assert.ok(seen.some(([key])=>key===s.sprite));
});
test('hero export preserves all wing clips and registers embedded cutout images for the same generated renderer',()=>{
 const p=hero(wings.falcon_wings);for(const s of Object.values(p.attachments[0].wingRig.sprites))s.src='data:image/png;base64,aGVsbG8=';
 const before=JSON.stringify(p),e=gameExport(validate(p));assert.equal(e.images.length,3);assert.equal(e.attachments[0].wingRig.clips.open.keys.length,3);assert.equal(JSON.stringify(p),before);
 const NC={};vm.runInNewContext(e.code,{window:{NC},NC});assert.equal(Object.keys(NC.ASSET_MANIFEST).length,9);for(const s of Object.values(e.attachments[0].wingRig.sprites))assert.equal(NC.ASSET_MANIFEST[s.sprite].src,s.src);
});
test('back socket follows torso independently of head/arms, mirrors with the root and draws wings behind the entire character',async()=>{
 const NC={SPR:{},ITEMS:{top:{rig:'traveler'},weapon:{restAng:1.2,stance:-.7,grip:.12,wtype:'sword'}},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t};
 for(const [key,s]of Object.entries(catalog.sprites))NC.SPR[key]={...structuredClone(s),name:key,img:{id:key}};
 const context=vm.createContext({window:{NC},NC,structuredClone,performance:{now:()=>1000},document:{createElement:()=>({getContext:()=>({})})}});
 for(const file of ['anim.js','avatar.js'])vm.runInContext(fs.readFileSync(new URL('../../dist/studio/runtime/'+file,import.meta.url),'utf8'),context);
 NC.GRIPFIX=false;NC.BendCache.on=false;const equip={top:'top',weapon:'weapon'},rig=NC.getRig('traveler'),P=NC.Anim.sample('idle',0,NC.animCtx(equip)),a=makeWingAttachment(wings.falcon_wings);
 const matrix=pose=>NC.attachmentMatrix(equip,pose,a,200,300,2),rest=matrix(P),head=matrix({...P,head:.6,aF:.9});assert.deepEqual(rest,head);assert.notEqual(matrix({...P,lean:.6}).e,rest.e);
 const mirror=matrix({...P,face:-1});assert.ok(Math.abs(rest.e+mirror.e-400)<1e-8);
 NC.ITEMS.top.attachments=await loadAttachmentSprites([a],async src=>({id:src}),(name,img)=>{NC.SPR[name]={name,img}},'test');
 for(const [time,expected]of [[0,'cape'],[.25,'wings1'],[.5,'wings2'],[1.5,'cape'],[2,'wings2']]){
  const drawn=[],ctx=new Proxy({drawImage:img=>drawn.push(img.id),globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{}});NC.drawRig(ctx,rig,equip,{...P,attachmentTime:time},0,0,{scale:1,noWeapon:true});
  assert.match(drawn[0],new RegExp('wfalcon_'+expected));assert.ok(drawn.findIndex(id=>id==='rig_traveler_torso')>0);
 }
});
test('studio and demo ship identical wing validation, FK runtime and renderer',()=>{
 for(const f of ['model.mjs','attachments.mjs','wings.mjs','pets/runtime.mjs','pets/rig-authoring.mjs'])assert.equal(fs.readFileSync(new URL('../../dist/studio/'+f,import.meta.url),'utf8'),fs.readFileSync(new URL('../../dist/cutout-demo/runtime/'+f,import.meta.url),'utf8'));
 assert.equal(fs.readFileSync(new URL('../../dist/studio/runtime/avatar.js',import.meta.url),'utf8'),fs.readFileSync(new URL('../../dist/cutout-demo/runtime/avatar.js',import.meta.url),'utf8'));
});
