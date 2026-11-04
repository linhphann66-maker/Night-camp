import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {equipmentType,normalizeEquipment,activateEquipment} from '../../dist/studio/equipment.mjs';
import {makeAttachment} from '../../dist/studio/attachments.mjs';
import {validate,gameExport} from '../../dist/studio/model.mjs';
import {OUTFIT_NAMES,PET_NAMES,outfitName,petName,translatedAccessoryName,accessoryName,attachmentName,spriteName,searchNames} from '../../dist/studio/names-vi.mjs';
const entries=JSON.parse(fs.readFileSync(new URL('../../dist/studio/accessories.json',import.meta.url))),catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url))),pets=JSON.parse(fs.readFileSync(new URL('../../dist/studio/pets/catalog.json',import.meta.url)));
const create=id=>makeAttachment(entries.find(e=>e.id===id));
test('activating a stored weapon hides its peer without deleting, resizing, moving or mutating any asset',()=>{
 const a=create('sword'),b=create('spear'),hat=create('hat_paladin'),glasses=create('glasses_round');Object.assign(a,{x:32,rotation:.2,scale:1.4,visible:false});
 const original=[a,b,hat,glasses],snapshot=structuredClone(original),next=activateEquipment(original,a.id,entries);
 assert.equal(next.length,4);assert.equal(next[0].visible,true);assert.equal(next[1].visible,false);assert.equal(next[2].visible,true);assert.equal(next[3].visible,true);
 for(let i=0;i<4;i++)for(const key of ['w','h','x','y','rotation','scale','src','anchor','id','name'])assert.deepEqual(next[i][key],snapshot[i][key]);
 assert.deepEqual(original,snapshot);assert.deepEqual(activateEquipment(next,a.id,entries),next);
 assert.equal(activateEquipment(next,b.id,entries)[0].visible,false);
});
test('same rule covers hats/headphones, glasses, custom images and separate wing slot, regardless of socket',()=>{
 for(const [aId,bId]of [['hat_paladin','hat_hc_misc_headphones'],['glasses_round','glasses_square'],['sword','spear']]){
  const a=create(aId),b=create(bId),type=equipmentType(a,entries);a.socket='head';a.category=type;
  const next=activateEquipment([a,b],a.id,entries);assert.equal(next[0].visible,true);assert.equal(next[1].visible,false);
 }
 const a={...create('hat_paladin'),sourceId:'uuid-file.png',category:'glasses'},b=create('glasses_round'),hat=create('hat_helmet');
 const next=activateEquipment([a,b,hat],a.id,entries);assert.equal(next[1].visible,false);assert.equal(next[2].visible,true);
 const w1={...create('hat_straw'),id:'w1',socket:'back',wingRig:{}},w2={...w1,id:'w2'};const wing=activateEquipment([w1,w2,hat],'w1',entries);assert.equal(wing[1].visible,false);assert.equal(wing[2].visible,true);
});
test('legacy overlapping projects keep last visible per category; all-hidden categories stay hidden',()=>{
 const a=create('sword'),b=create('spear'),h=create('hat_paladin'),g=create('glasses_round');h.visible=false;g.visible=false;
 const original=[a,b,h,g],out=normalizeEquipment(original,entries);
 assert.equal(out[0].visible,false);assert.equal(out[1].visible,true);assert.equal(out[2].visible,false);assert.equal(out[3].visible,false);
 assert.deepEqual(normalizeEquipment(out,entries),out);assert.throws(()=>activateEquipment(out,'missing',entries));assert.equal(original[0].visible,true);
});
test('all built-in accessories, outfits and pets have explicit Vietnamese names while IDs remain unchanged',()=>{
 assert.equal(entries.length,493);assert.equal(catalog.rigs.length,49);assert.equal(Object.keys(pets.rigs).length,7);
 const valid=name=>{assert.ok(name?.length>1);assert.doesNotMatch(name,/[\u0E00-\u0E7F_]/)};
 for(const entry of entries){assert.ok(translatedAccessoryName(entry),entry.id);valid(accessoryName(entry));assert.equal(entry.name,accessoryName(entry));assert.ok(entry.originalName)}
 for(const id of catalog.rigs){assert.ok(OUTFIT_NAMES[id],id);valid(outfitName(id));valid(spriteName('rig_'+id+'_head'))}
 for(const [id,p]of Object.entries(pets.rigs)){assert.ok(PET_NAMES[id]);valid(petName(id));assert.equal(p.name,petName(id));assert.equal(p.id,id)}
});
test('legacy Thai labels and UUID upload names display in Vietnamese; custom authored names survive',()=>{
 const h=create('hat_paladin');h.name=entries.find(e=>e.id===h.sourceId).originalName;assert.equal(attachmentName(h,entries),'Mũ cánh thánh kỵ sĩ');
 assert.equal(attachmentName({...h,sourceId:'79FD.png',name:'79FD.png',category:'hat'},entries,2),'Mũ tải lên 3');
 assert.equal(attachmentName({...h,name:'Mũ của nhân vật chính'},entries),'Mũ của nhân vật chính');
 assert.ok(searchNames('mu sat','Mũ sắt','hat_helmet'));assert.ok(searchNames('hat_helmet','Mũ sắt','hat_helmet'));assert.ok(searchNames('chien binh','Chiến binh vuốt nhọn'));
});
test('hidden inventory and categories roundtrip through project and game bundle; renderer-visible flags remain data',()=>{
 const a=create('sword'),b=create('spear'),h=create('hat_paladin'),attachments=activateEquipment([a,b,h],a.id,entries);
 const parts=Object.fromEntries(['head','torso','armF','armB','legF','legB'].map(part=>[part,structuredClone(catalog.sprites['rig_traveler_'+part])]));
 const p={format:'nightcamp-cutout-v1',rig:'traveler',parts,attachments,clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]}};
 validate(p);const exported=gameExport(p);assert.equal(exported.attachments.length,3);assert.equal(exported.attachments[1].visible,false);assert.equal(exported.attachments[0].category,'weapon');
 assert.deepEqual(validate(JSON.parse(JSON.stringify(p))),p);assert.equal(p.attachments[1].id,b.id);assert.equal(p.attachments[1].src,b.src);
});
