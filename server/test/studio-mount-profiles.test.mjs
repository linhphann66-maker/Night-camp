import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {makeAttachment} from '../../dist/studio/attachments.mjs';
import {validate,gameExport,PARTS} from '../../dist/studio/model.mjs';
import {reconcileMounts,saveMountProfile,setMountId,rebasePortableMounts,exportAccessoryPack,importAccessoryPack,ORIGINAL_HEAD_ID,targetSignature} from '../../dist/studio/mount-profiles.mjs';
import {resolveAccessory,equipAccessory,validateAccessoryPack} from '../../dist/studio/accessory-runtime.mjs';
import {createWingCatalog,makeWingAttachment,EMPTY_IMAGE} from '../../dist/studio/wings.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url))),entries=JSON.parse(fs.readFileSync(new URL('../../dist/studio/accessories.json',import.meta.url)));
const create=id=>({...makeAttachment(entries.find(e=>e.id===id)),category:entries.find(e=>e.id===id).category});
const project=()=>({format:'nightcamp-cutout-v1',rig:'traveler',parts:Object.fromEntries(PARTS.map(p=>[p,structuredClone(catalog.sprites['rig_traveler_'+p])])),attachments:[create('hat_paladin'),create('glasses_round'),create('sword')],clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]}});
const initialized=()=>reconcileMounts(project(),catalog),portable=async()=>EMPTY_IMAGE;
test('legacy migration adds stable original head/body identities without resizing, changing visibility or anchors',()=>{
 const p=project(),old=structuredClone(p.attachments);reconcileMounts(p,catalog);assert.equal(p.headId,ORIGINAL_HEAD_ID);assert.equal(p.bodyId,'nightcamp-body-traveler-v1');
 for(let i=0;i<old.length;i++)for(const k of Object.keys(old[i]))assert.deepEqual(p.attachments[i][k],old[i][k]);
 assert.equal(p.attachments[0].mountProfiles.length,1);assert.equal(p.attachments[2].mountProfiles.length,0);validate(p);
 const before=structuredClone(p);reconcileMounts(p,catalog);assert.deepEqual(p,before);
});
test('a different head hides an uncalibrated hat, keeps old fit and requires explicit capture',()=>{
 const p=initialized(),a=p.attachments[0],original=structuredClone(a.mountProfiles);setMountId(p,'head','dau_tien_v1');reconcileMounts(p,catalog);
 assert.equal(a.visible,false);assert.equal(a.mountStatus,'missing-profile');assert.deepEqual(a.mountProfiles,original);assert.throws(()=>resolveAccessory(a,p),/Chưa có cấu hình/);
 a.visible=true;a.x=17;a.scale=.7;reconcileMounts(p,catalog);assert.deepEqual(a.mountProfiles,original);
 saveMountProfile(a,p);reconcileMounts(p,catalog);assert.equal(a.mountProfiles.length,2);assert.equal(resolveAccessory(a,p).x,17);
 setMountId(p,'head',ORIGINAL_HEAD_ID);reconcileMounts(p,catalog);assert.equal(a.x,original[0].transform.x);assert.equal(a.scale,original[0].transform.scale);
 setMountId(p,'head','dau_tien_v1');reconcileMounts(p,catalog);assert.equal(a.x,17);assert.equal(a.scale,.7);
});
test('geometry and image changes distinguish targets, while rig renames and animation edits do not',()=>{
 const p=initialized(),id=p.headId,body=p.bodyId;p.rig='custom_hero';p.clip.name='run';reconcileMounts(p,catalog);assert.equal(p.headId,id);assert.equal(p.bodyId,body);
 p.parts.head.w+=10;reconcileMounts(p,catalog);assert.notEqual(p.headId,id);assert.equal(p.bodyId,body);assert.equal(p.attachments[0].mountStatus,'missing-profile');
 const previous=p.headId;p.parts.head.src=EMPTY_IMAGE;reconcileMounts(p,catalog);assert.notEqual(p.headId,previous);
});
test('same ID alone is insufficient when character geometry differs; explicit signatures also supported',()=>{
 const p=initialized(),a=p.attachments[0],wrong=structuredClone(p);wrong.parts.head.h+=1;assert.throws(()=>resolveAccessory(a,wrong));
 assert.equal(resolveAccessory(a,{headId:p.headId,mountSignatures:p.mountSignatures}).w,a.w);assert.throws(()=>resolveAccessory(a,{headId:p.headId}));
 const reordered=structuredClone(p.parts.head);reordered.joints=Object.fromEntries(Object.entries(reordered.joints).reverse());assert.equal(targetSignature(reordered),targetSignature(p.parts.head));
});
test('portable project roundtrip keeps original IDs and profile transforms, even after paths become data URLs',()=>{
 const p=initialized();for(const s of Object.values(p.parts))s.src=EMPTY_IMAGE;rebasePortableMounts(p);const copy=JSON.parse(JSON.stringify(p));reconcileMounts(copy,catalog);assert.equal(copy.headId,ORIGINAL_HEAD_ID);assert.deepEqual(copy.attachments,p.attachments);validate(copy);
});
test('single/multiple packs contain only requested accessories with embedded images, not base character/clip',async()=>{
 const p=initialized(),before=structuredClone(p);p.attachments[0].visible=false;
 const pack=await exportAccessoryPack(p,[p.attachments[0].id],portable);assert.equal(pack.items.length,1);assert.equal(pack.items[0].visible,false);assert.equal(pack.items[0].src,EMPTY_IMAGE);assert.equal(pack.parts,undefined);assert.equal(pack.clip,undefined);validateAccessoryPack(pack);
 const all=await exportAccessoryPack(p,p.attachments.map(a=>a.id),portable);assert.equal(all.items.length,3);assert.equal(all.items[2].mountProfiles.length,0);
 assert.deepEqual(p.attachments.map(a=>a.mountProfiles),before.attachments.map(a=>a.mountProfiles));assert.ok(p.attachments[0].src.startsWith('assets/'));
 await assert.rejects(()=>exportAccessoryPack(p,[],portable));await assert.rejects(()=>exportAccessoryPack(p,['missing'],portable));await assert.rejects(()=>exportAccessoryPack(p,[p.attachments[0].id,p.attachments[0].id],portable));
});
test('hidden fitted inventory exports only saved fits; visible uncalibrated edits cannot declare compatibility',async()=>{
 const p=initialized();setMountId(p,'head','another_head');reconcileMounts(p,catalog);const pack=await exportAccessoryPack(p,[p.attachments[0].id],portable);assert.equal(pack.items[0].mountProfiles.length,1);assert.equal(pack.items[0].mountProfiles[0].headId,ORIGINAL_HEAD_ID);assert.throws(()=>resolveAccessory(pack.items[0],p));p.attachments[0].visible=true;await assert.rejects(()=>exportAccessoryPack(p,[p.attachments[0].id],portable),/lưu cấu hình/);
});
test('wings retain every nested sprite, rig and animation and resolve independently by body ID',async()=>{
 const p=initialized(),wing=makeWingAttachment(createWingCatalog(catalog).rigs.falcon_wings);p.attachments.push(wing);reconcileMounts(p,catalog);
 assert.equal(wing.mountProfiles[0].bodyId,p.bodyId);setMountId(p,'head','other_head');reconcileMounts(p,catalog);assert.equal(wing.visible,true);
 setMountId(p,'body','than_giap_v2');reconcileMounts(p,catalog);assert.equal(wing.mountStatus,'missing-profile');wing.x=-19;wing.scale=1.2;saveMountProfile(wing,p);reconcileMounts(p,catalog);
 const pack=await exportAccessoryPack(p,[wing.id],portable),a=pack.items[0];assert.equal(a.mountProfiles.length,2);assert.ok(Object.values(a.wingRig.sprites).every(s=>s.src===EMPTY_IMAGE));assert.deepEqual(a.wingRig.clips,wing.wingRig.clips);
 assert.equal(resolveAccessory(a,p).x,-19);const orig={...p,bodyId:'nightcamp-body-traveler-v1'};assert.equal(resolveAccessory(a,orig).x,0);
 const wrong=structuredClone(p);wrong.parts.torso.joints.neck[0]+=1;assert.throws(()=>resolveAccessory(a,wrong));
});
test('package imports merge by accessory ID, preserve existing fits and resolve after merging',async()=>{
 const p=initialized(),id=p.attachments[0].id,pack=await exportAccessoryPack(p,[id],portable);setMountId(p,'head','head_b');reconcileMounts(p,catalog);p.attachments[0].x=21;saveMountProfile(p.attachments[0],p);
 let next=importAccessoryPack(p,pack);assert.equal(next.attachments.length,p.attachments.length);assert.equal(next.attachments[0].id,id);assert.equal(next.attachments[0].mountProfiles.length,2);assert.equal(next.attachments[0].x,21);assert.equal(next.attachments[0].mountStatus,undefined);
 next=importAccessoryPack(next,pack);assert.equal(next.attachments.length,p.attachments.length);assert.equal(next.attachments[0].mountProfiles.length,2);
 const fresh=initialized();fresh.headId='head_unknown';fresh.attachments=[];next=importAccessoryPack(fresh,pack);assert.equal(next.attachments[0].visible,false);assert.equal(next.attachments[0].mountStatus,'missing-profile');
});
test('runtime equip returns matching fit and hides same slot only, without mutating inputs',async()=>{
 const p=initialized(),pack=await exportAccessoryPack(p,p.attachments.map(a=>a.id),portable),a=pack.items[0],hatB=create('hat_helmet');hatB.category='hat';
 const previous=[hatB,pack.items[1],pack.items[2]],copy=structuredClone(previous),next=equipAccessory(previous,a,p);assert.equal(next[0].visible,false);assert.equal(next[1].visible,true);assert.equal(next[2].visible,true);assert.equal(next.at(-1).accessoryId,a.accessoryId);assert.deepEqual(previous,copy);assert.equal(equipAccessory(next,a,p).length,4);
});
test('malformed or ambiguous packages and unsafe transform fields are rejected',async()=>{
 const p=initialized(),pack=await exportAccessoryPack(p,[p.attachments[0].id],portable);
 for(const mutate of [v=>v.items.push(structuredClone(v.items[0])),v=>v.items[0].mountProfiles[0].transform.scale=0,v=>v.items[0].mountProfiles[0].transform.unexpected=1,v=>v.items[0].mountProfiles[0].headId='../head',v=>v.items[0].src='https://other/hat.png',v=>v.items[0].mountProfiles.push(structuredClone(v.items[0].mountProfiles[0]))]){const bad=structuredClone(pack);mutate(bad);assert.throws(()=>validateAccessoryPack(bad))}
 assert.throws(()=>setMountId(p,'head',''));assert.throws(()=>setMountId(p,'body','x'.repeat(121)));
});
test('full character export keeps original formats and carries identities/profile tables',()=>{
 const p=initialized(),e=gameExport(p);assert.equal(p.format,'nightcamp-cutout-v1');assert.equal(e.headId,ORIGINAL_HEAD_ID);assert.equal(e.bodyId,p.bodyId);assert.deepEqual(e.mountSignatures,p.mountSignatures);assert.deepEqual(e.attachments[0].mountProfiles,p.attachments[0].mountProfiles);
});
test('project validation rejects duplicate accessory IDs and duplicate fitting keys',()=>{
 const p=initialized();p.attachments[1].accessoryId=p.attachments[0].accessoryId;assert.throws(()=>validate(p));
 const q=initialized();q.attachments[0].mountProfiles.push(structuredClone(q.attachments[0].mountProfiles[0]));assert.throws(()=>validate(q));
});
test('export captures target geometry before asynchronous image reads',async()=>{
 const p=initialized();let count=0;const pack=await exportAccessoryPack(p,p.attachments.slice(0,2).map(a=>a.id),async()=>{if(count++===0){p.headId='changed_while_loading';p.parts.head.w+=20}return EMPTY_IMAGE});
 for(const a of pack.items){assert.equal(a.mountProfiles.length,1);assert.equal(a.mountProfiles[0].headId,ORIGINAL_HEAD_ID)}
});
