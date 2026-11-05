import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {builtinAnimationId,ensureAnimationId,animationPack,readAnimationPack} from '../../dist/studio/animation-identity.mjs';
import {blankClip} from '../../dist/studio/timeline.mjs';
import {saveAnimationProfile,resolveAccessory,validateAccessoryPack,equipAccessory,fitTransform} from '../../dist/studio/accessory-runtime.mjs';
import {switchAnimationMounts,captureAnimationEdits} from '../../dist/studio/animation-mounts.mjs';
import {reconcileMounts,exportAccessoryPack,importAccessoryPack,saveMountProfile} from '../../dist/studio/mount-profiles.mjs';
import {makeAttachment} from '../../dist/studio/attachments.mjs';
import {PARTS,gameExport} from '../../dist/studio/model.mjs';
import {EMPTY_IMAGE} from '../../dist/studio/wings.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url))),entries=JSON.parse(fs.readFileSync(new URL('../../dist/studio/accessories.json',import.meta.url)));
const create=()=>reconcileMounts({format:'nightcamp-cutout-v1',rig:'traveler',parts:Object.fromEntries(PARTS.map(p=>[p,structuredClone(catalog.sprites['rig_traveler_'+p])])),clip:{id:builtinAnimationId('run'),name:'run',kind:'walk',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]},attachments:[{...makeAttachment(entries.find(e=>e.id==='sword')),category:'weapon'}]},catalog);
test('stock run ID survives reload and switching; custom IDs survive rename and editing, copies have new IDs',()=>{
 const run={name:'run',keys:[]};assert.equal(ensureAnimationId(run,{sourceKey:'run'}),builtinAnimationId('run'));const restored=JSON.parse(JSON.stringify(run));restored.name='Tên mới';restored.keys.push({t:1});assert.equal(ensureAnimationId(restored),run.id);assert.equal(ensureAnimationId({},{sourceKey:'run'}),run.id);
 const a=blankClip({name:'Bắn cung',pose:{}}),b=blankClip({name:'Bắn cung',pose:{}});assert.notEqual(a.id,b.id);const id=a.id;a.name='Đổi tên';a.dur=2;assert.equal(ensureAnimationId(a),id);assert.equal(readAnimationPack(animationPack(a)).id,id);assert.throws(()=>readAnimationPack({...animationPack(a),animationId:b.id}));
});
test('legacy migration deterministic and standalone animation export contains only clip and identity',()=>{
 const old={name:'Cũ',kind:'loop',dur:1,hit:0,keys:[]};assert.equal(ensureAnimationId(structuredClone(old)),ensureAnimationId(structuredClone(old)));const pack=animationPack(old);assert.equal(pack.parts,undefined);assert.equal(pack.clip.id,pack.animationId);assert.throws(()=>ensureAnimationId({id:'constructor'}));
 const p=create(),bundle=gameExport(p);assert.equal(bundle.id,p.clip.id);assert.equal(bundle.animationId,p.clip.id);assert.ok(bundle.code.includes(p.clip.id));
});
test('one weapon carries right on run and left on shoot; default, previous fit and sibling inventory do not leak',()=>{
 const p=create(),a=p.attachments[0],base=fitTransform(a),run=p.clip.id,shoot=blankClip({name:'Bắn',pose:{}}).id;
 saveAnimationProfile(a,run);a.socket='handB';a.x=27;a.rotation=.75;saveAnimationProfile(a,shoot);const left=fitTransform(a);
 assert.deepEqual(fitTransform(resolveAccessory(a,p,run)),base);assert.deepEqual(fitTransform(resolveAccessory(a,p,shoot)),left);assert.deepEqual(fitTransform(resolveAccessory(a,p,'unknown')),base);
 p.clip.id=run;switchAnimationMounts(p);assert.equal(p.attachments[0].socket,'handF');p.clip.id=shoot;switchAnimationMounts(p);assert.equal(p.attachments[0].socket,'handB');p.clip.id=run;switchAnimationMounts(p);assert.equal(p.attachments[0].socket,'handF');
 const old=structuredClone(p.attachments),edit=structuredClone(old);edit[0].x=42;captureAnimationEdits(old,edit,p.clip,p);assert.equal(resolveAccessory(edit[0],p,run).x,42);assert.equal(resolveAccessory(edit[0],p,shoot).x,27);assert.equal(old[0].x,base.x);
});
test('first weapon edit captures original fallback before fitting current animation',()=>{
 const p=create(),old=structuredClone(p.attachments),next=structuredClone(old);next[0].socket='handB';next[0].x=30;captureAnimationEdits(old,next,p.clip,p);assert.equal(next[0].animationBase.socket,'handF');assert.equal(resolveAccessory(next[0],p,p.clip.id).socket,'handB');assert.equal(resolveAccessory(next[0],p,'another').socket,'handF');
});
test('accessory-only files merge animation IDs without replacing previously installed animation or inventory identity',async()=>{
 const p=create(),a=p.attachments[0],run=p.clip.id;saveAnimationProfile(a,run);const first=await exportAccessoryPack(p,[a.id],async()=>EMPTY_IMAGE);a.socket='handB';saveAnimationProfile(a,'animation-shoot');const second=await exportAccessoryPack(p,[a.id],async()=>EMPTY_IMAGE);second.items[0].animationProfiles=second.items[0].animationProfiles.filter(f=>f.animationId==='animation-shoot');validateAccessoryPack(second);
 assert.equal(first.version,2);assert.equal(first.project,undefined);assert.equal(first.parts,undefined);const inventory=equipAccessory(equipAccessory([],first.items[0],p),second.items[0],p);assert.equal(inventory.length,1);assert.equal(inventory[0].animationProfiles.length,2);assert.equal(resolveAccessory(inventory[0],p,run).socket,'handF');assert.equal(resolveAccessory(inventory[0],p,'animation-shoot').socket,'handB');
 const merged=importAccessoryPack(importAccessoryPack(p,first),second);assert.equal(merged.attachments[0].animationProfiles.length,2);assert.equal(merged.clip.id,run);
});
test('animation fits on hats/wings stay scoped to the correct head/body, retaining generic mount profiles',()=>{
 const p=create(),a={...makeAttachment(entries.find(e=>e.id==='hat_paladin')),category:'hat'};p.attachments=[a];reconcileMounts(p,catalog);const x=a.x;saveAnimationProfile(a,p.clip.id,p);a.x=19;saveAnimationProfile(a,p.clip.id,p);assert.equal(resolveAccessory(a,p,p.clip.id).x,19);
 const other=structuredClone(p);other.headId='another-head';const b=other.attachments[0];b.x=2;saveMountProfile(b,other);assert.equal(resolveAccessory(b,other,p.clip.id).x,2);saveAnimationProfile(b,p.clip.id,other);assert.equal(b.animationProfiles.length,2);assert.equal(resolveAccessory(b,p,p.clip.id).x,19);
});
