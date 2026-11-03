// Optional Playwright regression, using actual game PNGs and the real editor.
// PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium \
// node tools/test-stock-hats-browser.mjs http://127.0.0.1:8115/studio/
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {validate} from '../dist/studio/model.mjs';
import {fitLibraryGlasses} from '../dist/studio/glasses-fit.mjs';
import {makeAttachment} from '../dist/studio/attachments.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=fileURLToPath(new URL('../',import.meta.url)),base=process.argv[2];if(!base)throw Error('Cần URL Studio/');
const entries=JSON.parse(await fs.readFile(path.join(root,'dist/studio/accessories.json'),'utf8'));
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const errors=[];
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const value=(page,id,v,event='change')=>page.locator(id).evaluate((el,{v,event})=>{el.value=v;if(event)el.dispatchEvent(new Event(event,{bubbles:true}))},{v,event});
const click=(page,id)=>page.locator(id).evaluate(el=>el.click());
const stored=p=>p.evaluate(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')));
const download=async(p,id)=>{const [d]=await Promise.all([p.waitForEvent('download'),click(p,id)]);return JSON.parse(await fs.readFile(await d.path(),'utf8'))};
try{
 const context=await browser.newContext({viewport:{width:590,height:1060}});context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 // Buildless local preview serves compact assets only. Supply real full-archive
 // PNGs from disk; deployed/GitHub previews use their actual remote asset URLs.
 await context.route('**/game-20261025-1758/assets/**',async route=>{
  const url=new URL(route.request().url());if(url.hostname!=='127.0.0.1'&&url.hostname!=='localhost')return route.continue();
  const asset=url.pathname.split('/game-20261025-1758/')[1],folder=path.join(root,'dist-full/game-20261025-1758'),file=path.resolve(folder,asset||'');
  if(!file.startsWith(folder+path.sep))return route.abort();
  try{await fs.access(file);return route.fulfill({path:file})}catch{return route.continue()}
 });
 if(!process.env.HAT_USE_REAL_CATALOG)await context.route('**/accessories.json',route=>{
  const cached=structuredClone(entries),hat=cached.find(e=>e.id==='hat_paladin');Object.assign(hat,{fit:1.63,seat:.477,dx:-.29});
  return route.fulfill({json:cached});
 });
 const page=await context.newPage();await page.goto(base,{waitUntil:'domcontentloaded'});
 await page.waitForFunction(()=>document.querySelectorAll('#rig option').length===49&&document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});
 await value(page,'#rig','apothecary');await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).rig==='apothecary');
 await value(page,'#accessoryCatalog','hat_paladin',null);await click(page,'#addAccessory');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments?.length===1);
 let p=await stored(page),hat=p.attachments[0],hw=p.parts.head.w*p.parts.head.head[2];near(hat.w,hw*1.205);near(hat.x,hw*-.179);near(hat.y,hw*.497);
 await page.locator('#bones').uncheck();await page.waitForTimeout(80);await page.screenshot({path:'/tmp/paladin-hat-after.png'});
 await value(page,'#accessoryCategory','glasses');await value(page,'#accessoryCatalog','glasses_round',null);await click(page,'#addAccessory');
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments?.length===2);
 p=await stored(page);const glasses=structuredClone(p.attachments[1]),glassEntry=entries.find(e=>e.id==='glasses_round');near(glasses.w,fitLibraryGlasses(makeAttachment(glassEntry),glassEntry,p.parts.head).w);
 const old=structuredClone(p);Object.assign(old.attachments[0],{w:hw*1.63,h:hw*1.63*66/63,x:hw*-.29,y:hw*.477});
 await page.locator('#projectFile').setInputFiles({name:'old-hat-project.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(old))});
 await page.waitForFunction(w=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments[0].w===w,old.attachments[0].w);
 assert.deepEqual((await stored(page)).attachments,old.attachments,'opening a project must not silently change custom transforms');
 await value(page,'#attachmentList',hat.id);await page.waitForFunction(()=>!document.getElementById('restoreLibraryHat').hidden);
 await page.screenshot({path:'/tmp/paladin-hat-before-repair.png'});
 await click(page,'#restoreLibraryHat');await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Đã khôi phục cỡ và neo chuẩn'));
 const fixed=await stored(page);near(fixed.attachments[0].w,hw*1.205);near(fixed.attachments[0].x,hw*-.179);near(fixed.attachments[0].y,hw*.497);
 assert.deepEqual(fixed.attachments[1],glasses);assert.deepEqual(fixed.parts,old.parts);assert.deepEqual(fixed.clip,old.clip);
 await click(page,'#undo');await page.waitForTimeout(100);assert.deepEqual((await stored(page)).attachments,old.attachments);
 await click(page,'#redo');await page.waitForTimeout(100);assert.deepEqual((await stored(page)).attachments,fixed.attachments);
 await click(page,'#restoreLibraryHat');await page.waitForTimeout(100);assert.deepEqual((await stored(page)).attachments,fixed.attachments);
 const saved=validate(await download(page,'#save'));assert.ok(saved.attachments[0].src.startsWith('data:'));
 for(const key of ['w','h','scale','x','y','rotation','anchor'])assert.deepEqual(saved.attachments[0][key],fixed.attachments[0][key]);
 await page.locator('#projectFile').setInputFiles({name:'portable-hat.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(saved))});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).attachments[0].src.startsWith('data:'));
 const bundle=await download(page,'#export');for(const key of ['w','h','scale','x','y','rotation','anchor'])assert.deepEqual(bundle.attachments[0][key],fixed.attachments[0][key]);
 assert.deepEqual(bundle.project.attachments[1],saved.attachments[1]);
 for(const pose of ['idle','walk','run']){
  await value(page,'#preset',pose);await click(page,'#sample');await page.waitForTimeout(80);await click(page,'#play');await page.waitForTimeout(150);await click(page,'#play');
  const moving=await stored(page);for(const key of ['w','h','x','y','anchor'])assert.deepEqual(moving.attachments[0][key],fixed.attachments[0][key]);
 }
 await page.locator('#flip').check();await page.waitForTimeout(80);await page.locator('#flip').uncheck();
 for(const viewport of [{width:393,height:852},{width:852,height:393},{width:1280,height:960}]){
  await page.setViewportSize(viewport);await page.waitForTimeout(80);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 }
 await page.reload({waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:60000});
 near((await stored(page)).attachments[0].w,hw*1.205);assert.deepEqual(errors,[]);
 console.log('PASS: Paladin native 1.205/.497/-.179, cached old catalog override, explicit repair without changing glasses/body/clip, undo/redo, repeat repair, embedded save/reopen, game bundle, idle/walk/run, flip and mobile/landscape/desktop.');
}finally{await browser.close()}
