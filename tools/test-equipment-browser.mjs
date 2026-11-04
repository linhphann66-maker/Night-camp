// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium \
// node tools/test-equipment-browser.mjs http://127.0.0.1:8115/studio/
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {equipmentType} from '../dist/studio/equipment.mjs';
import {OUTFIT_NAMES,PET_NAMES,accessoryName} from '../dist/studio/names-vi.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),base=process.argv[2];if(!base)throw Error('Cần URL Studio/');
const entries=JSON.parse(await fs.readFile(path.join(root,'dist/studio/accessories.json'),'utf8')),byId=id=>entries.find(e=>e.id===id);
const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']}),errors=[];
const click=(p,id)=>p.locator(id).evaluate(el=>el.click()),value=(p,id,v,event='change')=>p.locator(id).evaluate((el,{v,event})=>{el.value=v;if(event)el.dispatchEvent(new Event(event,{bubbles:true}))},{v,event});
const stored=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')));
const pause=()=>new Promise(r=>setTimeout(r,90));
const geometry=a=>Object.fromEntries(['id','src','w','h','scale','rotation','x','y','anchor'].map(k=>[k,a[k]]));
const invariant=items=>{const seen=new Set();for(const a of items)if(a.visible!==false){const type=equipmentType(a,entries);assert.ok(!seen.has(type),'overlapping '+type);seen.add(type)}};
const download=async(p,id)=>{const[d]=await Promise.all([p.waitForEvent('download'),click(p,id)]);return JSON.parse(await fs.readFile(await d.path(),'utf8'))};
try{
 const context=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/game-20261025-1758/assets/**',async r=>{
  const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return r.continue();
  const dir=path.join(root,'dist-full/game-20261025-1758'),file=path.resolve(dir,u.pathname.split('/game-20261025-1758/')[1]||'');if(!file.startsWith(dir+path.sep))return r.abort();
  try{await fs.access(file);return r.fulfill({path:file})}catch{return r.continue()}
 });
 const p=await context.newPage();await p.goto(base,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});
 const rigLabels=await p.locator('#rig option').evaluateAll(ns=>ns.map(n=>[n.value,n.textContent]));assert.equal(rigLabels.length,49);for(const[id,label]of rigLabels)assert.equal(label,OUTFIT_NAMES[id]);
 for(const type of ['hat','glasses','weapon']){await value(p,'#accessoryCategory',type);const options=await p.locator('#accessoryCatalog option').evaluateAll(ns=>ns.map(n=>[n.value,n.textContent]));assert.equal(options.length,entries.filter(e=>e.category===type).length);for(const[id,label]of options)assert.equal(label,accessoryName(byId(id)))}
 async function add(id){await value(p,'#accessoryCategory',byId(id).category);await value(p,'#accessoryCatalog',id,null);const before=(await stored(p)).attachments?.length||0;await click(p,'#addAccessory');await p.waitForFunction(n=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments?.length===n,before+1);const state=await stored(p);invariant(state.attachments);return state.attachments.find(a=>a.sourceId===id)}
 const sword=await add('sword'),spear=await add('spear'),hat=await add('hat_paladin'),helmet=await add('hat_helmet'),round=await add('glasses_round'),square=await add('glasses_square');
 let items=(await stored(p)).attachments;assert.equal(items.length,6);for(const a of [sword,hat,round])assert.equal(items.find(i=>i.id===a.id).visible,false);for(const a of [spear,helmet,square])assert.equal(items.find(i=>i.id===a.id).visible,true);
 const original=items.map(geometry);
 for(const a of [sword,hat,round]){await value(p,'#attachmentList',a.id);await pause();const next=(await stored(p)).attachments;invariant(next);assert.ok(next.find(i=>i.id===a.id).visible);assert.deepEqual(next.map(geometry),original);assert.equal(await p.locator('#attachmentVisible').isChecked(),true)}
 await p.locator('#attachmentVisible').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}))});await pause();assert.equal((await stored(p)).attachments.find(a=>a.id===round.id).visible,false);assert.equal(await p.locator('#attachmentList').inputValue(),'');
 await value(p,'#attachmentList',round.id);await pause();assert.equal((await stored(p)).attachments.find(a=>a.id===round.id).visible,true);
 await value(p,'#attachmentSocket','head');await pause();items=(await stored(p)).attachments;assert.equal(items.find(a=>a.id===hat.id).visible,true);assert.equal(items.find(a=>a.id===round.id).category,'glasses');
 await value(p,'#attachmentList',sword.id);await pause();await value(p,'#attachmentX',12);await pause();const swordGeometry=geometry((await stored(p)).attachments.find(a=>a.id===sword.id));
 await value(p,'#attachmentList',spear.id);await pause();const beforeSwitch=await stored(p);await value(p,'#attachmentList',sword.id);await pause();assert.deepEqual(geometry((await stored(p)).attachments.find(a=>a.id===sword.id)),swordGeometry);
 await click(p,'#undo');await pause();assert.deepEqual((await stored(p)).attachments,beforeSwitch.attachments);await click(p,'#redo');await pause();assert.equal((await stored(p)).attachments.find(a=>a.id===sword.id).visible,true);
 await value(p,'#accessoryCategory','weapon');await value(p,'#accessoryCatalog','sword',null);await click(p,'#addAccessory');await pause();assert.equal((await stored(p)).attachments.length,6);assert.deepEqual(geometry((await stored(p)).attachments.find(a=>a.id===sword.id)),swordGeometry);
 await value(p,'#accessoryCategory','hat');await p.locator('#autoHatFitUpload').evaluate(el=>{el.checked=false});
 await p.locator('#accessoryFile').setInputFiles({name:'A79FD10D-9CB1-4840.png',mimeType:'image/png',buffer:await fs.readFile(path.join(root,'dist-full/game-20261025-1758/assets/class2/hat_paladin.png'))});
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments.length===7);items=(await stored(p)).attachments;invariant(items);const upload=items.at(-1);assert.match(upload.name,/^Mũ tải lên/);assert.equal(upload.category,'hat');assert.equal(items.find(a=>a.id===hat.id).visible,false);
 await value(p,'#accessorySearch','kinh tron','input');await value(p,'#accessoryCategory','glasses');assert.ok((await p.locator('#accessoryCatalog option').allTextContents()).includes('Kính tròn'));await value(p,'#accessorySearch','','input');
 const saved=await download(p,'#save');assert.equal(saved.attachments.length,7);invariant(saved.attachments);const bundle=await download(p,'#export');assert.equal(bundle.project.attachments.length,7);assert.deepEqual(bundle.project.attachments.map(a=>a.visible),saved.attachments.map(a=>a.visible));
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});assert.deepEqual((await stored(p)).attachments.map(geometry),items.map(geometry));invariant((await stored(p)).attachments);
 // An old stacked project is repaired by visibility only, using the newest
 // visible item per group; every original image/anchor remains available.
 const legacy=await stored(p);for(const a of legacy.attachments){a.visible=true;if(byId(a.sourceId)){delete a.category;a.name=byId(a.sourceId).originalName}}
 await p.locator('#projectFile').setInputFiles({name:'legacy-stacked.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await pause();const restored=await stored(p);invariant(restored.attachments);assert.equal(restored.attachments.length,7);assert.deepEqual(restored.attachments.map(geometry),legacy.attachments.map(geometry));assert.ok(restored.attachments.every(a=>!/[\u0E00-\u0E7F]/.test(a.name)));
 const pet=await context.newPage();await pet.goto(new URL('pets/',base).href,{waitUntil:'domcontentloaded'});await pet.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});
 const petOptions=await pet.locator('#pet option').evaluateAll(ns=>ns.map(n=>[n.value,n.textContent]));assert.equal(petOptions.length,7);for(const[id,label]of petOptions)assert.equal(label,PET_NAMES[id]);
 await value(pet,'#pet','wyvern');await pet.waitForFunction(()=>document.getElementById('petName').value==='Tiểu phi long');
 // Representative screenshot: use calibrated library wear, rather than the
 // intentionally uncalibrated custom-upload fixture used above.
 await value(p,'#attachmentList',spear.id);await pause();await p.locator('#attachmentVisible').evaluate(el=>{el.checked=false;el.dispatchEvent(new Event('change',{bubbles:true}))});await pause();
 await value(p,'#attachmentList',round.id);await pause();await value(p,'#attachmentSocket','face');await pause();await value(p,'#attachmentList',hat.id);await pause();
 await click(p,'#mobileMenuButton');await p.locator('[data-studio-tab="accessories"]').click();
 await p.locator('#attachmentList').evaluate(el=>el.scrollIntoView({block:'center'}));
 await p.screenshot({path:'/tmp/equipment-vi-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS: 3 independent single-active categories, hidden-item reselect on mobile, checkbox, same-item reuse, geometry retained, undo/redo, upload grouping, legacy stack normalization, save/export/reload, all 493 accessory labels +49 outfits +7 pets Vietnamese, accent-free search.');
}finally{await b.close()}
