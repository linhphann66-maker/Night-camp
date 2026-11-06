import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {bundleMapRuntime} from '../dist/studio/maps/runtime-bundle.mjs';
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright'),root=fileURLToPath(new URL('../',import.meta.url)),base=process.argv[2]||'http://127.0.0.1:8163/studio/maps/',native=await fs.readFile(path.join(root,'dist/studio/maps/native-ground.mjs'),'utf8'),oldCode=execFileSync('git',['show','e7e7df1:dist/studio/maps/runtime.mjs'],{cwd:root,encoding:'utf8'}),newCode=await fs.readFile(path.join(root,'dist/studio/maps/runtime.mjs'),'utf8');
const browser=await chromium.launch({executablePath:process.env.CHROMIUM_EXECUTABLE||'/usr/bin/chromium',args:['--no-sandbox']}),context=await browser.newContext({viewport:{width:393,height:852}}),errors=[];
context.on('page',p=>p.on('pageerror',e=>errors.push(e.message)));
const click=(p,id)=>p.locator(id).evaluate(el=>el.click());
await context.route('**/baseline-map-runtime.mjs',r=>r.fulfill({contentType:'text/javascript',body:bundleMapRuntime(native,oldCode)}));
await context.route('**/fixed-map-runtime.mjs',r=>r.fulfill({contentType:'text/javascript',body:bundleMapRuntime(native,newCode)}));
await context.route('**/game-20261025-1758/assets/**',async r=>{const u=new URL(r.request().url());if(!['localhost','127.0.0.1'].includes(u.hostname))return r.continue();const dir=path.join(root,'dist-full/game-20261025-1758'),file=path.resolve(dir,u.pathname.split('/game-20261025-1758/')[1]||'');if(!file.startsWith(dir+path.sep))return r.abort();try{await fs.access(file);return r.fulfill({path:file})}catch{return r.continue()}});
try{
 const page=await context.newPage();await page.goto(base);await page.waitForFunction(()=>document.getElementById('status').textContent.includes('Sẵn sàng'),null,{timeout:60000});
 const stats=await page.evaluate(async base=>{
  const old=await import(new URL('baseline-map-runtime.mjs',base).href),api=await import(new URL('fixed-map-runtime.mjs',base).href),raw=CanvasRenderingContext2D.prototype.createImageData;let rasters=0;CanvasRenderingContext2D.prototype.createImageData=function(...args){rasters++;return raw.apply(this,args)};
  function scene(mod){const p=mod.createMap();p.lighting={mode:'time',hour:5.5,playerLight:false,vignette:false};p.roads=[{id:'curved',material:'dirt',width:70,softness:.4,smoothness:.7,points:[{x:40,y:300},{x:220,y:200},{x:500,y:350}]}];return p}
  function bench(mod){const p=scene(mod),cv=Object.assign(document.createElement('canvas'),{width:393,height:640}),ctx=cv.getContext('2d'),r=new mod.MapRenderer(p),view={width:393,height:640,x:0,y:0,zoom:1,dt:1/60,time:0};r.draw(ctx,view);const rasterStart=rasters,entries=r.cache.size,times=[],steps=[],alphas=[];let last=r.displayLighting?.n;
   for(let i=1;i<=12;i++){p.lighting.hour=5.5+i*.005;const start=performance.now();r.draw(ctx,{...view,time:i/60});times.push(performance.now()-start);if(last!==undefined){steps.push(Math.abs(last-r.displayLighting.n));last=r.displayLighting.n;alphas.push(last)}}
   const result={newRasters:rasters-rasterStart,maxMs:Math.max(...times),meanMs:times.reduce((a,b)=>a+b,0)/times.length,initialTiles:entries,tiles:r.cache.size,roads:r.roadTextures.size,maxLightStep:steps.length?Math.max(...steps):null};
   if(mod.MAP_RUNTIME_VERSION>=8){const mark=rasters;for(const h of [7,12,18,20,0,6.5]){p.lighting.hour=h;r.draw(ctx,{...view,dt:1/60})}result.cycleRasters=rasters-mark;result.cycleTiles=r.cache.size;const before=JSON.stringify(p);let hits=0;r.draw(ctx,{...view,afterEntities:()=>hits++});if(hits!==1||JSON.stringify(p)!==before)throw Error('Lighting altered gameplay data/callbacks');const rr=new mod.MapRenderer(p);rr.draw(ctx,{...view,zoom:.1});const overviewStart=rasters;for(let i=0;i<10;i++){p.lighting.hour=5+i*.1;rr.draw(ctx,{...view,zoom:.1})}result.overviewRasters=rasters-overviewStart;result.overviews=rr.overviewCaches.size;
    // The same endpoint canvases must survive 60 continuous dawn frames while
    // movement and combat callbacks continue on every frame.
    const moving=new mod.DarkinMapPlayer(scene(mod),new Map());let combat=0;for(let i=0;i<60;i++){moving.setTimeOfDay(5.5+i/300);moving.update(1/60,1,0);moving.draw(ctx,393,640,{dt:1/60,afterEntities:()=>combat++})}result.movement=moving.actor.x-moving.project.spawn.x;result.combatFrames=combat;
   }
   return result;
  }
  try{return {old:bench(old),fixed:bench(api)}}finally{CanvasRenderingContext2D.prototype.createImageData=raw}
 },base);
 assert.ok(stats.old.newRasters>100);assert.equal(stats.fixed.newRasters,0);assert.equal(stats.fixed.cycleRasters,0);assert.equal(stats.fixed.tiles,stats.fixed.initialTiles);assert.equal(stats.fixed.cycleTiles,stats.fixed.tiles);assert.equal(stats.fixed.roads,2);assert.equal(stats.fixed.overviewRasters,0);assert.equal(stats.fixed.overviews,2);assert.ok(stats.fixed.maxLightStep<.01);assert.ok(stats.fixed.movement>100);assert.equal(stats.fixed.combatFrames,60);console.log('PERFORMANCE',JSON.stringify(stats));
 // The actual export UI embeds a portable alpha mask and the new runtime.
 await page.locator('#imageFile').setInputFiles({name:'cay-rieng.png',mimeType:'image/png',buffer:await fs.readFile(path.join(root,'dist-full/game-20261025-1758/assets/maps/b_burnttree.png'))});await page.waitForFunction(()=>Object.values(JSON.parse(localStorage.getItem('darkin.map.studio.v1')).assets).some(s=>s.user));
 const [download]=await Promise.all([page.waitForEvent('download'),click(page,'#export')]),bundle=JSON.parse(await fs.readFile(await download.path(),'utf8'));assert.equal(bundle.runtime.version,8);const entry=Object.values(bundle.project.assets).find(s=>s.user);assert.equal(entry.occlusionMask.version,1);assert.ok(entry.src.startsWith('data:'));assert.ok(entry.occlusionMask.bits.length<12000);
 // A different origin without CORS is intentionally unreadable to canvas.
 // The exported mask must still distinguish padding, holes and real canopy.
 const shape=await page.evaluate(()=>{const c=Object.assign(document.createElement('canvas'),{width:100,height:100}),ctx=c.getContext('2d');ctx.fillStyle='#44a45c';ctx.fillRect(20,45,60,30);ctx.fillStyle='#885529';ctx.fillRect(45,75,10,20);ctx.clearRect(25,50,15,15);return c.toDataURL()});
 await context.route('http://127.0.0.1:8165/no-cors.png',r=>r.fulfill({status:200,contentType:'image/png',body:Buffer.from(shape.split(',')[1],'base64')}));
 const alpha=await page.evaluate(async({base,shape,bundle})=>{
  const api=await import(new URL('fixed-map-runtime.mjs',base).href),old=await import(new URL('baseline-map-runtime.mjs',base).href),fromBundle=await import(URL.createObjectURL(new Blob([bundle.runtime.source],{type:'text/javascript'})));
  const loaded=new Image();loaded.src=shape;const before=api.imageGeometry(loaded);await loaded.decode();const geometry=api.imageGeometry(loaded);if(before!==null||!geometry)throw Error('Pending image was permanently cached');
  const image=new Image();image.src='http://127.0.0.1:8165/no-cors.png';await image.decode();const cc=document.createElement('canvas').getContext('2d');cc.drawImage(image,0,0);let tainted=false;try{cc.getImageData(0,0,1,1)}catch{tainted=true}if(!tainted)throw Error('CORS fixture must be unreadable');
  const p=api.createMap();p.assets.tree={src:shape,w:100,h:100,ax:.5,ay:1,kind:'custom',user:true,fadeBehind:true,grounding:'anchor',occlusionMask:api.packOcclusionMask(geometry)};const o={id:'tree',asset:'tree',x:200,y:200,scale:1,rotation:0,flip:false,layer:'sorted',collider:null,walk:null};p.objects=[o];const outside={x:200,y:135,occlusionHeight:20},inside={x:200,y:170,occlusionHeight:20},hole={x:180,y:170,occlusionHeight:20,radius:0};
  const result={oldOutside:old.objectOccludesActor(p,o,outside),outside:api.objectOccludesActor(p,o,outside),inside:api.objectOccludesActor(p,o,inside),hole:api.objectOccludesActor(p,o,hole),tainted,fromBundle:fromBundle.objectOccludesActor(p,o,outside)};
  const r=new fromBundle.MapRenderer(p,new Map([['tree',image]])),ctx=Object.assign(document.createElement('canvas'),{width:300,height:250}).getContext('2d'),draw=ctx.drawImage.bind(ctx),alphas=[];ctx.drawImage=(img,...args)=>{if(img===image)alphas.push(ctx.globalAlpha);draw(img,...args)};for(const actor of [outside,inside,hole])r.draw(ctx,{width:300,height:250,actor});result.drawAlphas=alphas;
  const player=new fromBundle.DarkinMapPlayer(p,new Map([['tree',image]]));let received;player.renderer.draw=(ctx,opts)=>received=opts.actor;player.draw(ctx,300,250,{actor:outside});result.externalActor=received===outside;
  return result;
 },{base,shape,bundle});
 assert.equal(alpha.oldOutside,true);assert.equal(alpha.outside,false);assert.equal(alpha.inside,true);assert.equal(alpha.hole,false);assert.equal(alpha.fromBundle,false);assert.deepEqual(alpha.drawAlphas,[1,.5,1]);assert.ok(alpha.externalActor);console.log('ALPHA',JSON.stringify(alpha));
 const [standalone]=await Promise.all([page.waitForEvent('download'),click(page,'#standalone')]),html=await fs.readFile(await standalone.path(),'utf8'),offline=await context.newPage();await offline.route('**/offline-map-runtime-check',r=>r.fulfill({contentType:'text/html',body:html}));await offline.goto(new URL('/offline-map-runtime-check',base).href);await offline.waitForFunction(()=>document.querySelector('canvas')?.width>0&&document.getElementById('mode')?.value==='day');await offline.waitForTimeout(300);await offline.close();
 assert.deepEqual(errors,[]);console.log('PASS v8 browser: no terrain/road/overview rebuilds from clock changes; continuous light interpolation; movement/combat callbacks every frame; actual map export embeds alpha; CORS/pending image padding does not fade; real occlusion does; external actor honored; bundled module and standalone HTML work.');
}finally{await browser.close()}
