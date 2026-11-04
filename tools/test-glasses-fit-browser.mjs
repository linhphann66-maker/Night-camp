// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium \
// node tools/test-glasses-fit-browser.mjs http://127.0.0.1:8115/studio/
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {makeAttachment} from '../dist/studio/attachments.mjs';
import {fitLibraryGlasses} from '../dist/studio/glasses-fit.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),base=process.argv[2];
if(!base)throw Error('Cần URL Studio/');
const entries=JSON.parse(await fs.readFile(path.join(root,'dist/studio/accessories.json'),'utf8')),entry=entries.find(e=>e.id==='glasses_round');
const b=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const errors=[],near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const click=(p,id)=>p.locator(id).evaluate(el=>el.click());
const value=(p,id,v,event='change')=>p.locator(id).evaluate((el,{v,event})=>{el.value=v;if(event)el.dispatchEvent(new Event(event,{bubbles:true}))},{v,event});
const stored=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')));
const download=async(p,id)=>{const [d]=await Promise.all([p.waitForEvent('download'),click(p,id)]);return JSON.parse(await fs.readFile(await d.path(),'utf8'))};
try{
 const context=await b.newContext({viewport:{width:590,height:1060}});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 await context.route('**/game-20261025-1758/assets/**',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')return route.continue();
  const dir=path.join(root,'dist-full/game-20261025-1758'),file=path.resolve(dir,url.pathname.split('/game-20261025-1758/')[1]||'');
  if(!file.startsWith(dir+path.sep))return route.abort();try{await fs.access(file);return route.fulfill({path:file})}catch{return route.continue()}
 });
 const p=await context.newPage();await p.goto(base,{waitUntil:'domcontentloaded'});
 await p.waitForFunction(()=>document.querySelectorAll('#rig option').length===49&&document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});
 await value(p,'#rig','shadow_knight');await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).rig==='shadow_knight');
 await value(p,'#accessoryCategory','glasses');await value(p,'#accessoryCatalog','glasses_round',null);await click(p,'#addAccessory');
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments?.length===1);
 let project=await stored(p);const hw=project.parts.head.w*project.parts.head.head[2],raw=makeAttachment(entry,hw),expected=fitLibraryGlasses(raw,entry,project.parts.head),glassId=project.attachments[0].id;
 for(const k of ['w','h','x','y','rotation','anchor','scale'])assert.deepEqual(project.attachments[0][k],expected[k]);
 const eyeOnly=fitLibraryGlasses(raw,entry,project.parts.head,undefined,{mode:'eyes'});assert.ok(project.attachments[0].w>eyeOnly.w*1.1&&project.attachments[0].w<raw.w*.85);await p.locator('#bones').uncheck();await p.waitForTimeout(70);await p.screenshot({path:'/tmp/glasses-round-fixed.png'});
 await value(p,'#accessoryCategory','hat');await value(p,'#accessoryCatalog','hat_paladin',null);await click(p,'#addAccessory');
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments?.length===2);project=await stored(p);
 const hat=structuredClone(project.attachments[1]),custom={...makeAttachment(entry,hw),sourceId:'my-own-glasses.png',name:'custom glasses',category:'glasses',visible:false,src:'data:image/png;base64,'+(await fs.readFile(path.join(root,'dist-full/game-20261025-1758',entry.sprite.src))).toString('base64')};
 const old=structuredClone(project);Object.assign(old.attachments[0],{w:raw.w,h:raw.h,rotation:0,x:0,y:0});old.attachments.push(custom);
 await p.locator('#projectFile').setInputFiles({name:'oversized-old-glasses.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await p.waitForFunction(w=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments[0].w===w,raw.w);
 assert.deepEqual((await stored(p)).attachments,old.attachments,'opening old project must not change manual artwork');
 await value(p,'#attachmentList',glassId);await p.waitForFunction(()=>!document.getElementById('restoreGlassesSizes').hidden);
 await click(p,'#restoreGlassesSizes');await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Đã căn cỡ kính theo mắt'));
 const fixed=await stored(p);for(const k of ['w','h','rotation','anchor','x','y','scale'])assert.deepEqual(fixed.attachments[0][k],expected[k]);
 assert.deepEqual(fixed.attachments[1],hat);assert.deepEqual(fixed.attachments[2],custom);assert.deepEqual(fixed.parts,old.parts);assert.deepEqual(fixed.clip,old.clip);
 await click(p,'#undo');await p.waitForTimeout(100);assert.deepEqual((await stored(p)).attachments,old.attachments);
 await click(p,'#redo');await p.waitForTimeout(100);assert.deepEqual((await stored(p)).attachments,fixed.attachments);
 await click(p,'#restoreGlassesSizes');await p.waitForTimeout(100);assert.deepEqual((await stored(p)).attachments,fixed.attachments);
 const saved=await download(p,'#save');assert.ok(saved.attachments[0].src.startsWith('data:'));
 await p.locator('#projectFile').setInputFiles({name:'precise-glasses.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await p.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments[0].src.startsWith('data:'));
 const bundle=await download(p,'#export');for(const k of ['w','h','x','y','rotation','scale','anchor'])assert.deepEqual(bundle.attachments[0][k],expected[k]);
 await value(p,'#attachmentList',custom.id);await p.waitForTimeout(50);assert.ok(await p.locator('#restoreGlassesSizes').isHidden());
 await click(p,'#fitGlasses');await p.waitForTimeout(70);const retained=(await stored(p)).attachments[2];for(const k of ['w','h','rotation','scale'])assert.deepEqual(retained[k],custom[k]);
 for(const move of ['idle','walk','run']){await value(p,'#preset',move);await click(p,'#sample');await p.waitForTimeout(50);await click(p,'#play');await p.waitForTimeout(120);await click(p,'#play');near((await stored(p)).attachments[0].w,expected.w)}
 await p.locator('#flip').check();await p.waitForTimeout(70);await p.locator('#flip').uncheck();
 for(const viewport of [{width:393,height:852},{width:852,height:393},{width:1280,height:960}]){await p.setViewportSize(viewport);await p.waitForTimeout(50);assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false)}
 await p.reload({waitUntil:'domcontentloaded'});await p.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});near((await stored(p)).attachments[0].w,expected.w);
 if(process.env.GLASSES_DEMO_URL){
  const demo=await context.newPage();await demo.goto(process.env.GLASSES_DEMO_URL);await demo.waitForFunction(()=>document.getElementById('message').textContent.includes('Sẵn sàng'));
  await demo.locator('#file').setInputFiles({name:'precise-glasses.game-bundle.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(bundle))});
  await demo.waitForFunction(()=>document.getElementById('message').textContent.includes('Đã nạp shadow_knight'));
 }
 assert.deepEqual(errors,[]);console.log('PASS: round glasses balance lenses and pin the temple onto the ear; old project repair, hats/custom artwork preserved, undo/redo, repeated fit, portable save/reopen/bundle, locomotion, flip, responsive layouts'+(process.env.GLASSES_DEMO_URL?' and demo import':'')+'. Width '+raw.w.toFixed(2)+' → '+expected.w.toFixed(2));
}finally{await b.close()}
