// Optional browser regression. Supply the ORIGINAL user sprite sheet privately;
// do not copy it into the public GitHub repository just to run this test.
// PLAYWRIGHT_MODULE=/absolute/path/to/playwright/index.mjs CHROMIUM_EXECUTABLE=/usr/bin/chromium \
// node tools/test-outfit-fit-browser.mjs http://127.0.0.1:8115/studio/ /absolute/path/to/elf-sheet.png
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {validate} from '../dist/studio/model.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const [base,fixture]=process.argv.slice(2);if(!base||!fixture)throw Error('Cần URL Studio/ và đường dẫn ảnh tiên tộc gốc');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||undefined,args:['--no-sandbox']});
const errors=[],sheet='data:image/png;base64,'+(await readFile(fixture)).toString('base64');
const getProject=page=>page.evaluate(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')));
const download=async(page,id)=>{
 const [d]=await Promise.all([page.waitForEvent('download'),page.locator(id).evaluate(el=>el.click())]);return JSON.parse(await readFile(await d.path(),'utf8'));
};
try{
 const context=await browser.newContext({viewport:{width:393,height:852},deviceScaleFactor:2});
 context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
 if(!process.env.OUTFIT_USE_HOSTED_FIXTURE)await context.route('**/fit-test-data/elf-sheet.png',r=>r.fulfill({path:fixture,contentType:'image/png'}));
 const testPage=await context.newPage();await testPage.goto(new URL('fit-test.html',base).href);
 await testPage.waitForFunction(()=>document.getElementById('testStatus').textContent.includes('Sẵn sàng'),{},{timeout:45000});
 const rows=await testPage.locator('#fitMetrics tr').evaluateAll(rs=>rs.map(r=>({part:r.dataset.part,error:+r.dataset.error})));
 assert.equal(rows.length,6);for(const row of rows)assert.ok(row.error<1e-6,JSON.stringify(row));
 assert.match(await testPage.locator('#faceReport').textContent(),/Đã tìm thấy vùng mặt/);
 const project=validate(await download(testPage,'#testProject'));
 assert.equal(Object.keys(project.parts).length,6);
 const bundle=await download(testPage,'#testBundle');assert.equal(bundle.format,'nightcamp-cutout-export-v1');assert.equal(bundle.images.length,6);
 assert.deepEqual(bundle.project.parts,project.parts);
 await testPage.screenshot({path:'/tmp/elf-talon-comparison-mobile.png',fullPage:true});
 for(const clip of ['idle','walk','run','attack']){
  await testPage.locator('#testAnimation').selectOption(clip);const start=await testPage.locator('#testFitted').screenshot();
  await testPage.locator('#testPlay').click();await testPage.waitForTimeout(350);await testPage.locator('#testPlay').click();
  assert.notDeepEqual(await testPage.locator('#testFitted').screenshot(),start,clip+' must change pose');
  const exported=validate(await download(testPage,'#testProject'));assert.equal(exported.clip.keys.length,31);
 }
 await testPage.locator('#testAnimation').selectOption('idle');await testPage.locator('#testReset').click();
 await testPage.locator('#testBefore').check();assert.ok(await testPage.locator('#beforeCard').isVisible());
 await testPage.locator('#testFlip').check();await testPage.locator('#testBones').check();await testPage.waitForTimeout(60);
 await testPage.locator('#testFlip').uncheck();await testPage.locator('#testBones').uncheck();await testPage.locator('#testBefore').uncheck();
 for(const viewport of [{width:320,height:640},{width:852,height:393},{width:1280,height:1000}]){
  await testPage.setViewportSize(viewport);await testPage.waitForTimeout(60);
  assert.equal(await testPage.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,JSON.stringify(viewport));
 }
 await testPage.screenshot({path:'/tmp/elf-talon-comparison-desktop.png',fullPage:true});
 const studio=await context.newPage();await studio.goto(base);
 await studio.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),{},{timeout:45000});
 assert.equal(await studio.locator('#heightGuides').isChecked(),false);
 await studio.locator('#rig').evaluate(el=>{el.value='talon';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await studio.waitForFunction(()=>JSON.parse(localStorage.getItem('nightcamp.cutout.v1')).rig==='talon'&&document.querySelector('#outfitFit .outfit-reference').value==='talon');
 const before=await getProject(studio);
 const mapping=await studio.evaluate(async src=>{
  const im=new Image();im.src=src;await im.decode();const c=document.createElement('canvas');c.width=im.width;c.height=im.height;c.getContext('2d').drawImage(im,0,0);
  const {detectPieces}=await import('./slice.mjs'),boxes=detectPieces(c.getContext('2d').getImageData(0,0,c.width,c.height).data,c.width,c.height),ordered=[...boxes].sort((a,b)=>a.x-b.x);
  return boxes.map(b=>['head','torso','armF','armB','legF','legB'][ordered.indexOf(b)]);
 },sheet);
 await studio.locator('#imageFile').setInputFiles(fixture);
 await studio.waitForFunction(()=>document.querySelectorAll('.sheet-piece').length===6&&!document.getElementById('sheetApply').disabled);
 assert.equal(await studio.locator('#sheetOutfitFit .outfit-mode').inputValue(),'template');
 for(let i=0;i<mapping.length;i++)await studio.locator('.sheet-slot').nth(i).selectOption(mapping[i]);
 await studio.locator('#sheetApply').click();await studio.waitForFunction(()=>!document.getElementById('sheetDialog').open);
 const applied=await getProject(studio);assert.deepEqual(applied.parts,project.parts,'demo and real Studio must produce identical sizes AND anchors from original upload');
 assert.deepEqual(applied.clip,before.clip);assert.equal(applied.resources.length,6);
 const waitMessage=text=>studio.waitForFunction(t=>document.getElementById('status').textContent.includes(t),text);
 await studio.locator('#outfitFit .outfit-mode').evaluate(el=>{el.value='aspect';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await studio.locator('#refitOutfit').evaluate(el=>el.click());await waitMessage('Đã căn lại');
 const legacy=await getProject(studio);assert.notDeepEqual(legacy.parts,project.parts);
 await studio.locator('#outfitFit .outfit-mode').evaluate(el=>{el.value='template';el.dispatchEvent(new Event('change',{bubbles:true}))});
 await studio.locator('#refitOutfit').evaluate(el=>el.click());await waitMessage('khớp rộng/cao');
 const repaired=await getProject(studio);assert.deepEqual(repaired.parts,project.parts,'old saved import can be explicitly repaired');
 await studio.locator('#refitOutfit').evaluate(el=>el.click());await studio.waitForTimeout(150);assert.deepEqual((await getProject(studio)).parts,repaired.parts,'fit must not compound');
 await studio.locator('#undo').evaluate(el=>el.click());await studio.waitForTimeout(120);
 await studio.locator('#undo').evaluate(el=>el.click());await studio.waitForTimeout(120);assert.deepEqual((await getProject(studio)).parts,legacy.parts);
 await studio.locator('#redo').evaluate(el=>el.click());await studio.waitForTimeout(120);assert.deepEqual((await getProject(studio)).parts,repaired.parts);
 const out=await download(studio,'#export');assert.deepEqual(out.project.parts,project.parts);
 await studio.reload();await studio.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'));
 assert.deepEqual((await getProject(studio)).parts,repaired.parts,'opening saved project must not refit silently');assert.equal(await studio.locator('#heightGuides').isChecked(),false);
 assert.deepEqual(errors,[]);
 console.log('PASS: ORIGINAL user PNG → six real slices → Studio == test page; all six stock-size errors <0.000001%; face/neck repair, old/new modes, explicit refit, no compounding, undo/redo, saved project/bundle, 4 animations and responsive layouts.');
 console.log(JSON.stringify(rows));
}finally{await browser.close()}
