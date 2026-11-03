import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeAttachment,validateAttachments} from '../../dist/studio/attachments.mjs';
import {resolveStockHat,restoreLibraryHat} from '../../dist/studio/stock-hats.mjs';
import {STOCK_HAT_BUILD,STOCK_HAT_FITS} from '../../dist/studio/stock-hat-fits.mjs';
import {gameExport,validate} from '../../dist/studio/model.mjs';
const entries=JSON.parse(fs.readFileSync(new URL('../../dist/studio/accessories.json',import.meta.url)));
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url)));
const native={};vm.runInNewContext(fs.readFileSync(new URL('../../dist-full/game-20261025-1758/js/hatfit_data.js',import.meta.url),'utf8'),{NC:native});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const paladin=entries.find(e=>e.id==='hat_paladin');
test('bundled hat profiles match ALL 84 original hand-authored game profiles, not server code defaults',()=>{
 assert.equal(STOCK_HAT_BUILD,catalog.build);assert.equal(Object.keys(STOCK_HAT_FITS).length,84);
 assert.equal(JSON.stringify(STOCK_HAT_FITS),JSON.stringify(native.HATFIT_DATA.hats));
 for(const e of entries.filter(e=>e.category==='hat')){
  const authored=native.HATFIT_DATA.hats[e.hatFitId||e.id];if(!authored)continue;
  for(const key of ['fit','seat','dx','clip'])if(authored[key]!==undefined)assert.equal(e[key],authored[key],e.id+'.'+key);
 }
});
test('Paladin restores its original 1.205 fit, .497 seat and -.179 offset; plume is not a head measurement',()=>{
 assert.equal(paladin.fit,1.205);assert.equal(paladin.seat,.497);assert.equal(paladin.dx,-.179);
 for(const headWidth of [45,72.66,108]){
  const a=makeAttachment(paladin,headWidth);close(a.w,headWidth*1.205);close(a.h,a.w*66/63);close(a.x,headWidth*-.179);close(a.y,headWidth*.497);
  assert.deepEqual(a.anchor,[.5,.68]);validateAttachments([a]);
 }
});
test('cached old GitHub profiles resolve without mutating input, and future builds are not patched with old data',()=>{
 const old={...paladin,fit:1.63,seat:.477,dx:-.29},snapshot=structuredClone(old),fixed=resolveStockHat(old,catalog.build);
 assert.deepEqual(old,snapshot);assert.equal(fixed.fit,1.205);assert.equal(fixed.seat,.497);assert.equal(fixed.dx,-.179);
 assert.deepEqual(resolveStockHat(fixed,catalog.build),fixed);
 assert.equal(resolveStockHat(old,'future-unrelated-build'),old);
});
test('explicit repair updates only selected hat geometry, not visibility, layer, source image, other items or input',()=>{
 const headWidth=72.66,old=makeAttachment({...paladin,fit:1.63,seat:.477,dx:-.29},headWidth);
 Object.assign(old,{scale:1.4,rotation:.7,layer:'back',visible:false,headFit:{previous:true},fitError:3});
 const snapshot=structuredClone(old),fixed=restoreLibraryHat(old,paladin,headWidth),defaults=makeAttachment(paladin,headWidth);
 for(const k of ['w','h','x','y','scale','rotation','anchor'])assert.deepEqual(fixed[k],defaults[k]);
 for(const k of ['id','name','sourceId','src','layer','visible'])assert.deepEqual(fixed[k],snapshot[k]);
 assert.equal(fixed.headFit,undefined);assert.equal(fixed.fitError,undefined);assert.deepEqual(old,snapshot);
 assert.deepEqual(restoreLibraryHat(fixed,paladin,headWidth),fixed);validateAttachments([fixed]);
});
test('glasses, weapons, uploaded hats, wings and uncalibrated library entries never receive this profile repair',()=>{
 for(const entry of entries.filter(e=>e.category!=='hat'))assert.equal(resolveStockHat(entry),entry);
 for(const entry of entries.filter(e=>e.category!=='hat'))assert.throws(()=>restoreLibraryHat(makeAttachment(entry),entry,72));
 const a=makeAttachment(paladin);assert.throws(()=>restoreLibraryHat({...a,sourceId:'my_uploaded_helmet.png'},paladin,72));
 assert.throws(()=>restoreLibraryHat({...a,wingRig:{}},paladin,72));
 const custom={id:'custom.png',category:'hat',fit:1.2,sprite:{w:30,h:50}};assert.equal(resolveStockHat(custom),custom);
 for(const hw of [45,72.66,108]){const g=makeAttachment(entries.find(e=>e.category==='glasses'),hw);close(g.w,hw*.85)}
});
test('repaired stock hat keeps baked dimensions through project / bundle export without runtime changes',()=>{
 const parts=Object.fromEntries(['head','torso','armF','armB','legF','legB'].map(p=>[p,structuredClone(catalog.sprites['rig_apothecary_'+p])]));
 const p={format:'nightcamp-cutout-v1',rig:'apothecary',parts,attachments:[makeAttachment(paladin,parts.head.w*parts.head.head[2])],clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]}};
 validate(p);const before=structuredClone(p),out=gameExport(p);assert.deepEqual(out.attachments[0].w,p.attachments[0].w);assert.deepEqual(out.attachments[0].h,p.attachments[0].h);assert.deepEqual(out.attachments[0].x,p.attachments[0].x);assert.deepEqual(out.attachments[0].y,p.attachments[0].y);assert.deepEqual(p,before);
});
