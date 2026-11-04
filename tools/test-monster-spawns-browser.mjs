// PLAYWRIGHT_MODULE=/opt/codex/cua_node/lib/node_modules/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium node tools/test-monster-spawns-browser.mjs http://127.0.0.1:8125/studio/maps/
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),base=process.argv[2];
const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE,args:['--no-sandbox']}),errors=[];
const click=(p,id)=>p.locator(id).evaluate(el=>el.click()),value=(p,id,v)=>p.locator(id).evaluate((el,v)=>{if(el.type==='checkbox')el.checked=v;else el.value=v;el.dispatchEvent(new Event('change',{bubbles:true}))},v),stored=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('darkin.map.studio.v1'))),wait=()=>new Promise(r=>setTimeout(r,100));
const download=async(p,id)=>{try{const[d]=await Promise.all([p.waitForEvent('download'),click(p,id)]);return await fs.readFile(await d.path(),'utf8')}catch(e){throw Error(e.message+' · '+await p.locator('#status').textContent())}};
try{
 const c=await b.newContext({viewport:{width:393,height:852},deviceScaleFactor:2});c.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await c.route('**/game-20261025-1758/assets/**',async r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return r.continue();const dir=path.join(root,'dist-full/game-20261025-1758'),file=path.resolve(dir,u.pathname.split('/game-20261025-1758/')[1]||'');if(!file.startsWith(dir+path.sep))return r.abort();try{await fs.access(file);return r.fulfill({path:file})}catch{return r.continue()}});
 const p=await c.newPage();await p.goto(base,{waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});
 const playerSpawn=(await stored(p)).spawn;assert.deepEqual((await stored(p)).monsterSpawns,[]);
 await p.locator('#menu').click();await p.locator('[data-tab="monsters"]').click();assert.equal(await p.locator('#monsterSpawnPanel').isVisible(),true);
 await p.locator('#newMonsterSpawn').click();await click(p,'#fit');
 async function screen(x,y){return p.locator('#stage').evaluate((el,{x,y})=>{const r=el.getBoundingClientRect(),p=JSON.parse(localStorage.getItem('darkin.map.studio.v1')),zoom=Math.max(.06,Math.min(3,Math.min((r.width-20)/(p.cols*p.cell),(r.height-20)/(p.rows*p.cell)))),cx=-(r.width/zoom-p.cols*p.cell)/2,cy=-(r.height/zoom-p.rows*p.cell)/2;return {x:r.left+(x-cx)*zoom,y:r.top+(y-cy)*zoom}},{x,y})}
 const pt=await screen(500,400);await p.mouse.click(pt.x,pt.y);await p.waitForFunction(()=>JSON.parse(localStorage.getItem('darkin.map.studio.v1')).monsterSpawns.length===1);
 let state=await stored(p);assert.deepEqual(state.spawn,playerSpawn);assert.equal(state.monsterSpawns[0].id,'mob_spawn_01');assert.equal(state.monsterSpawns[0].monsterId,'slime_green');assert.equal(state.objects.length,0);const first={...state.monsterSpawns[0]};
 await value(p,'#monsterSpawnId','bai_slime_01');await value(p,'#monsterSpawnName','Bãi slime phía đông');await value(p,'#monsterSpawnCount',3);await value(p,'#monsterRespawnSeconds',12);await value(p,'#monsterSpawnRadius',120);await wait();
 state=await stored(p);assert.equal(state.monsterSpawns[0].id,'bai_slime_01');assert.equal(state.monsterSpawns[0].count,3);assert.equal(state.monsterSpawns[0].respawnSeconds,12);
 // Drag a point in real world coordinates and undo/redo it.
 const from=await screen(first.x,first.y),to=await screen(700,500);await p.mouse.move(from.x,from.y);await p.mouse.down();await p.mouse.move(to.x,to.y,{steps:4});await p.mouse.up();await wait();assert.ok(Math.abs((await stored(p)).monsterSpawns[0].x-700)<3);
 await click(p,'#undo');await wait();assert.equal((await stored(p)).monsterSpawns[0].x,first.x);await click(p,'#redo');await wait();assert.ok(Math.abs((await stored(p)).monsterSpawns[0].x-700)<3);
 await click(p,'#duplicateMonsterSpawn');await wait();state=await stored(p);assert.equal(state.monsterSpawns.length,2);assert.equal(state.monsterSpawns[1].monsterId,'slime_green');assert.notEqual(state.monsterSpawns[1].id,state.monsterSpawns[0].id);
 await value(p,'#monsterTypeId','wolf_gray');await value(p,'#monsterRespawnSeconds',0);await value(p,'#monsterSpawnEnabled',false);await wait();
 const before=await stored(p);await value(p,'#monsterSpawnId','bai_slime_01');await wait();assert.match(await p.locator('#status').textContent(),/Lỗi/);assert.deepEqual((await stored(p)).monsterSpawns,before.monsterSpawns);
 // Restore the invalid input from the actual selection.
 await value(p,'#monsterSpawnList',before.monsterSpawns[1].id);await value(p,'#showMonsterSpawns',false);assert.deepEqual((await stored(p)).monsterSpawns,before.monsterSpawns);
 await click(p,'#checkMonsterSpawns');assert.match(await p.locator('#monsterSpawnCheck').textContent(),/mọi điểm đang bật/);
 const saved=JSON.parse(await download(p,'#save'));assert.deepEqual(saved.monsterSpawns,before.monsterSpawns);
const bundle=JSON.parse(await download(p,'#export'));assert.ok(bundle.runtime.version>=3);assert.equal(bundle.monsterSpawnSchema.collection,'project.monsterSpawns');assert.deepEqual(bundle.project.monsterSpawns,before.monsterSpawns);assert.ok(!/^import /m.test(bundle.runtime.source));
 const runtime=await download(p,'#runtime');assert.match(runtime,/export class MonsterSpawnController/);
 const api=await import('data:text/javascript;base64,'+Buffer.from(runtime).toString('base64')),spawner=new api.MonsterSpawnController(bundle,{monsterIds:['slime_green','wolf_gray']});assert.equal(spawner.poll().length,3);assert.deepEqual(spawner.poll(100),[]);
 const html=await download(p,'#standalone');assert.ok(html.includes('monsterSpawns'));const offline=await c.newPage();await offline.route('**/offline-spawn-preview',r=>r.fulfill({status:200,contentType:'text/html',body:html}));await offline.goto(new URL('/offline-spawn-preview',base).href);await offline.waitForFunction(()=>document.getElementById('name').textContent.length>0);await offline.close();
 await click(p,'#deleteMonsterSpawn');await wait();assert.equal((await stored(p)).monsterSpawns.length,1);await click(p,'#undo');await wait();assert.equal((await stored(p)).monsterSpawns.length,2);
 await p.locator('#projectFile').setInputFiles({name:'with-spawns.map-bundle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});await wait();assert.deepEqual((await stored(p)).monsterSpawns,bundle.project.monsterSpawns);
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});assert.deepEqual((await stored(p)).monsterSpawns,bundle.project.monsterSpawns);
 const legacy=structuredClone(saved);delete legacy.monsterSpawns;await p.locator('#projectFile').setInputFiles({name:'old-map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(legacy))});await wait();assert.equal((await stored(p)).monsterSpawns,undefined);
 await p.locator('#projectFile').setInputFiles({name:'new-map.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});await wait();
 await p.locator('#menu').click();await p.locator('[data-tab="monsters"]').click();await value(p,'#monsterSpawnList','bai_slime_01');await value(p,'#showMonsterSpawns',true);await p.screenshot({path:'/tmp/monster-spawns-mobile.png'});
 for(const viewport of [{width:393,height:852},{width:852,height:393},{width:1280,height:900}]){await p.setViewportSize(viewport);await wait();assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true)}
 assert.deepEqual(errors,[]);console.log('PASS: mobile menu/place/drag/rename, separate player spawn, type IDs, limits, duplicate rejection, undo/redo/delete, marker visibility, diagnostics, project/bundle/runtime/HTML export, controller, import/reload, legacy maps, responsive layouts.');
}finally{await b.close()}
