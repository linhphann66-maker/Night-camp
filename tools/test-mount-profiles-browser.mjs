// PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium node tools/test-mount-profiles-browser.mjs http://127.0.0.1:8115/studio/
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),base=process.argv[2],b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']});
const errors=[],click=(p,id)=>p.locator(id).evaluate(el=>el.click()),value=(p,id,v)=>p.locator(id).evaluate((el,v)=>{el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))},v),stored=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1'))),wait=()=>new Promise(r=>setTimeout(r,180));
const download=async(p,id)=>{const[d]=await Promise.all([p.waitForEvent('download'),click(p,id)]);return JSON.parse(await fs.readFile(await d.path(),'utf8'))};
try{
 const c=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await c.route('**/game-20261025-1758/assets/**',async r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return r.continue();const dir=path.join(root,'dist-full/game-20261025-1758'),file=path.resolve(dir,u.pathname.split('/game-20261025-1758/')[1]||'');if(!file.startsWith(dir+path.sep))return r.abort();try{await fs.access(file);return r.fulfill({path:file})}catch{return r.continue()}});
 const p=await c.newPage();await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});
 assert.equal((await stored(p)).headId,'nightcamp-head-original-v1');
 async function add(id,type){await value(p,'#accessoryCategory',type);await value(p,'#accessoryCatalog',id);await click(p,'#addAccessory');await p.waitForFunction(id=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments?.some(a=>a.sourceId===id),id);await wait()}
 await add('hat_paladin','hat');await add('glasses_round','glasses');
 const old=await stored(p),hat=old.attachments.find(a=>a.sourceId==='hat_paladin');await value(p,'#attachmentList',hat.id);await wait();
 const single=await download(p,'#exportSelectedAccessory');assert.equal(single.items.length,1);assert.equal(single.items[0].accessoryId,'hat_paladin');assert.equal(single.parts,undefined);assert.ok(single.items[0].src.startsWith('data:'));
 await value(p,'#mountHeadId','dau_tien_v1');await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).headId==='dau_tien_v1');await wait();assert.equal((await stored(p)).attachments.find(a=>a.id===hat.id).mountStatus,'missing-profile');assert.match(await p.locator('#mountFitInfo').textContent(),/Chưa có cấu hình/);
 await p.locator('#attachmentVisible').evaluate(el=>{el.checked=true;el.dispatchEvent(new Event('change',{bubbles:true}))});await wait();await value(p,'#attachmentX',19);await wait();await click(p,'#saveMountProfile');await wait();assert.equal((await stored(p)).attachments.find(a=>a.id===hat.id).mountProfiles.length,2);
 await value(p,'#mountHeadId','nightcamp-head-original-v1');await wait();assert.equal((await stored(p)).attachments.find(a=>a.id===hat.id).x,hat.x);
 await value(p,'#mountHeadId','dau_tien_v1');await wait();assert.equal((await stored(p)).attachments.find(a=>a.id===hat.id).x,19);
 await click(p,'#useOriginalHead');await wait();assert.equal((await stored(p)).headId,'nightcamp-head-original-v1');
 await click(p,'#mountSelectAll');const multi=await download(p,'#exportAccessoryPack');assert.equal(multi.items.length,2);
 await click(p,'#mountSelectNone');assert.equal(await p.locator('#exportAccessoryPack').isDisabled(),true);
 const saved=await download(p,'#save');assert.equal(saved.headId,'nightcamp-head-original-v1');await p.locator('#projectFile').setInputFiles({name:'roundtrip.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});await wait();assert.equal((await stored(p)).headId,saved.headId);
 await p.locator('#accessoryPackFile').setInputFiles({name:'pack.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(single))});await wait();assert.equal((await stored(p)).attachments.length,2);assert.equal((await stored(p)).attachments.find(a=>a.accessoryId==='hat_paladin').mountProfiles.length,2);
 // Exercise actual iframe protocol and attachment apply, not a fabricated wing.
 await click(p,'#wingStudioButton');await p.waitForFunction(()=>document.querySelector('#wingStudioDialog iframe')?.contentDocument?.getElementById('status')?.textContent.includes('Dựng rig →'),{},{timeout:60000});
 const frame=p.frames().find(f=>f.url().includes('mode=wings'));assert.ok(frame);await value(frame,'#pet','falcon_wings');await wait();
 const applyId=await frame.locator('button').evaluateAll(ns=>ns.find(n=>n.textContent.includes('Gắn vào nhân vật'))?.id);assert.ok(applyId);await click(frame,'#'+applyId);
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments.some(a=>a.wingRig));await wait();
 await frame.evaluate(()=>parent.postMessage({type:'nightcamp.wing.close'},location.origin));await wait();
 let state=await stored(p);const wing=state.attachments.find(a=>a.wingRig);assert.equal(wing.mountProfiles[0].bodyId,state.bodyId);
 await value(p,'#attachmentList',wing.id);await wait();await value(p,'#mountBodyId','than_giap_v2');await wait();state=await stored(p);assert.equal(state.attachments.find(a=>a.wingRig).mountStatus,'missing-profile');
 await value(p,'#attachmentScale',1.2);await wait();await click(p,'#saveMountProfile');await wait();const wings=await download(p,'#exportSelectedAccessory');assert.equal(wings.items[0].mountProfiles.length,2);assert.ok(Object.values(wings.items[0].wingRig.sprites).every(s=>s.src.startsWith('data:')));
 const bundle=await download(p,'#export');assert.equal(bundle.bodyId,'than_giap_v2');assert.equal(bundle.project.attachments.find(a=>a.wingRig).mountProfiles.length,2);
 const [runtime]=await Promise.all([p.waitForEvent('download'),click(p,'#downloadAccessoryRuntime')]);assert.match(await fs.readFile(await runtime.path(),'utf8'),/export function equipAccessory/);
 await click(p,'#mobileMenuButton');await p.locator('[data-studio-tab="accessories"]').click();await p.locator('#mountProfilePanel').evaluate(el=>el.scrollIntoView({block:'start'}));assert.ok(await p.locator('#mountProfilePanel').isVisible());
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true);await p.screenshot({path:'/tmp/mount-profiles-mobile.png'});
 assert.deepEqual(errors,[]);console.log('PASS mobile UI: original head ID, single/multi export, two-head fit switching, save/import merge, real wing iframe/apply, two-body fits, nested wing image export, full bundle IDs, dependency-free runtime download, responsive layout.');
}finally{await b.close()}
