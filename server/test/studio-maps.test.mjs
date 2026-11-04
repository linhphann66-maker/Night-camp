import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,validateMap,resizedMap,paintLine,cellIndex,pointWalkable,canWalk,moveActor,objectLocal,objectWorld,objectBounds,pickObject,warpAt,terrainRGB,groundRGB,MapRenderer,DEFAULT_LIGHTING,lightingSettings,nightness,ambientRGB} from '../../dist/studio/maps/runtime.mjs';
import {standalonePreview} from '../../dist/studio/maps/preview.mjs';
const src='data:image/png;base64,aGVsbG8=';
function asset(p,id='tree'){p.assets[id]={src,w:100,h:160,ax:.5,ay:1,kind:'tree',collider:null,walk:null};return id}
function object(p,opts={}){const o={id:'object_'+p.objects.length,asset:asset(p),x:200,y:200,scale:1,rotation:0,flip:false,layer:'sorted',collider:null,walk:null,...opts};p.objects.push(o);return o}
test('map catalog reuses original environmental/decorative artwork with valid anchors, no character equipment',()=>{
 const c=JSON.parse(fs.readFileSync(new URL('../../dist/studio/maps/catalog.json',import.meta.url)));assert.ok(c.assets.length>=1177);assert.equal(c.assets.filter(a=>a.legacyV1).length,377);assert.equal(c.assets.filter(a=>a.category==='bridge').length,8);
 for(const a of c.assets){assert.ok(['tree','rock','bridge','plants','building','camp','decor','fence','lights','landmark'].includes(a.category));assert.ok(a.ax>=0&&a.ax<=1&&a.ay>=0&&a.ay<=1);assert.ok(fs.existsSync(new URL('../../dist-full/'+c.build+'/'+a.src,import.meta.url)));assert.ok(!/^rig_|^hat_|^glasses_/.test(a.id))}
});
test('blank map is independent data with no original objects, supports custom image tiles and validates roundtrip',()=>{
 const p=createMap();assert.equal(p.objects.length,0);assert.equal(Object.keys(p.assets).length,0);assert.equal(p.terrain.length,p.cols*p.rows);p.assets.custom={src,w:64,h:64,ax:0,ay:0,kind:'ground'};p.terrain[0]='custom';validateMap(JSON.parse(JSON.stringify(p)));
 for(const [key,value]of [['cols',129],['cell',16],['id','__proto__']])assert.throws(()=>validateMap({...p,[key]:value}));p.assets.custom.src='assets/../secrets.png';assert.throws(()=>validateMap(p));
});
test('painting a fast drag fills the entire line and one history snapshot can restore it; collision layers stay separate',()=>{
 const p=createMap(),before=structuredClone(p);paintLine(p,[32,32],[900,32],{value:'dirt'});for(let x=0;x<=14;x++)assert.equal(p.terrain[x],'dirt');assert.deepEqual(p.blocked,before.blocked);paintLine(p,[100,100],[100,100],{layer:'blocked',value:1,radius:1});assert.equal(p.blocked.filter(Boolean).length,9);paintLine(p,[100,100],[100,100],{layer:'blocked',value:0,radius:1});assert.equal(p.blocked.filter(Boolean).length,0);assert.equal(before.terrain[0],'grass');
});
test('resize preserves retained tiles and refuses to silently discard a prop or spawn outside smaller bounds',()=>{
 const p=createMap();p.terrain[0]='stone';const q=resizedMap(p,40,30);assert.equal(q.terrain[0],'stone');assert.equal(q.terrain.length,1200);object(p,{x:1900,y:1000});assert.throws(()=>resizedMap(p,4,4));assert.equal(p.objects[0].x,1900);
});
test('water blocks movement, bridge decks and painted crossings permit only water and never erase walls/footprints',()=>{
 const p=createMap();p.terrain.fill('water');assert.equal(pointWalkable(p,200,200),false);const b=object(p,{walk:{type:'rect',x:0,y:0,w:150,h:60}});assert.ok(canWalk(p,200,200));assert.equal(pointWalkable(p,200,250),false);const index=cellIndex(p,200,200);p.blocked[index]=1;assert.equal(pointWalkable(p,200,200),false);p.blocked[index]=0;b.walk=null;p.walkable[index]=1;assert.ok(pointWalkable(p,200,200));b.collider={type:'ellipse',x:0,y:0,w:40,h:25};assert.equal(pointWalkable(p,200,200),false);
});
test('object collision is a footprint, not the full image; rotated/flipped coordinates and anchor bounds agree',()=>{
 const p=createMap(),o=object(p,{collider:{type:'ellipse',x:0,y:0,w:40,h:20},rotation:.7,scale:1.6,flip:true});for(const pt of [[0,0],[-20,-40],[40,-70]]){const w=objectWorld(o,...pt),q=objectLocal(o,...w);assert.ok(Math.abs(q[0]-pt[0])<1e-8&&Math.abs(q[1]-pt[1])<1e-8)}assert.equal(pointWalkable(p,200,200),false);const crown=objectWorld(o,0,-120);assert.ok(pointWalkable(p,...crown));const bounds=objectBounds(p,o);assert.ok(bounds.y0<o.y&&bounds.x0<bounds.x1);
});
test('movement normalizes diagonals, stops at map edges and substeps cannot jump a thin prop wall',()=>{
 const p=createMap(),a={x:400,y:400,radius:0},b={...a};moveActor(p,a,1,0,.1,100);moveActor(p,b,1,1,.1,100);assert.ok(Math.abs(Math.hypot(a.x-400,a.y-400)-Math.hypot(b.x-400,b.y-400))<1e-8);object(p,{x:440,y:400,collider:{type:'rect',x:0,y:0,w:12,h:200}});const c={x:400,y:400,radius:2};moveActor(p,c,1,0,.1,1000);assert.ok(c.x<434);assert.equal(pointWalkable(p,-1,100),false);
});
test('picking respects layers and foot depth; warp trigger is data for the target-map loader',()=>{
 const p=createMap(),back=object(p,{id:'back',y:210}),front=object(p,{id:'front',y:220}),ground=object(p,{id:'ground',y:230,layer:'ground'});assert.equal(pickObject(p,200,180).id,'front');ground.layer='front';assert.equal(pickObject(p,200,180).id,'ground');p.warps.push({id:'east',x:500,y:500,radius:40,to:'woods',at:'west'});validateMap(p);assert.equal(warpAt(p,510,500).to,'woods');assert.equal(warpAt(p,100,100),null);
});
test('edge-anchored sprites remain pickable outside terrain on all four sides and at a rotated/flipped corner',()=>{
 const cases=[{x:500,y:0,pt:[500,-80]},{x:0,y:500,pt:[-25,420]},{x:2048,y:500,pt:[2073,420]},{x:500,y:1536,pt:[500,1536]}];
 for(const {pt,...opts}of cases){const p=createMap(),o=object(p,opts);validateMap(p);assert.equal(cellIndex(p,...pt),-1);assert.equal(pickObject(p,...pt)?.id,o.id);const untouched=JSON.stringify(p);assert.equal(pickObject(p,-500,-500),null);assert.equal(JSON.stringify(p),untouched)}
 const p=createMap(),o=object(p,{x:0,y:0,rotation:.5,flip:true,scale:1.5}),pt=objectWorld(o,20,-80);assert.equal(cellIndex(p,...pt),-1);assert.equal(pickObject(p,...pt)?.id,o.id);
});
test('procedural ground is deterministic, seed-sensitive and flagstone seams use the original spacing',()=>{
 assert.deepEqual(terrainRGB('grass',123,456,7),terrainRGB('grass',123,456,7));assert.notDeepEqual(terrainRGB('grass',123,456,7),terrainRGB('grass',123,456,97));assert.deepEqual(terrainRGB('stone',0,50,7),[96,96,108]);assert.notDeepEqual(terrainRGB('stone',80,50,7),[96,96,108]);
});
test('legacy maps stay day, optional lighting is validated, serialized, resized and independent of terrain/collisions',()=>{
 const p=createMap(),before=structuredClone(p);assert.equal(nightness(p),0);assert.deepEqual(lightingSettings(p),DEFAULT_LIGHTING);p.lighting={mode:'night',hour:22,ambient:.8,vignette:true,playerLight:false,blend:true,details:true};assert.equal(nightness(p),1);const q=validateMap(JSON.parse(JSON.stringify(p)));assert.deepEqual(q.lighting,p.lighting);assert.deepEqual(resizedMap(q,40,30).lighting,p.lighting);for(const k of ['terrain','blocked','walkable','objects'])assert.deepEqual(p[k],before[k]);
 for(const lighting of [null,[],{mode:'unknown'},{ambient:2},{ambient:'1'},{hour:24},{hour:NaN},{vignette:1},{details:'true'},{unknown:true}])assert.throws(()=>validateMap({...p,lighting}));
});
test('fixed hour matches the original dawn/dusk thresholds with smooth palette interpolation',()=>{
 const p=createMap();for(const [hour,n]of [[0,1],[5,1],[6,.5],[7,0],[12,0],[17.5,0],[18.5,.5],[19.5,1],[23.99,1]]){p.lighting={mode:'time',hour};assert.equal(nightness(p),n)}
 for(const type of ['grass','dirt','stone','sand','water','moss']){const d=terrainRGB(type,90,90,7,0),n=terrainRGB(type,90,90,7,1),h=terrainRGB(type,90,90,7,.5);assert.ok(n.reduce((a,b)=>a+b)<d.reduce((a,b)=>a+b));h.forEach((v,i)=>assert.ok(Math.abs(v-(d[i]+n[i])/2)<=1))}assert.deepEqual(terrainRGB('stone',0,50,7,1),[41,44,58]);
});
test('soft terrain edges preserve interiors and do not blend water, stone or custom images',()=>{
 const p=createMap();p.terrain[1]='dirt';const plain=terrainRGB('grass',63,32,7);assert.notDeepEqual(groundRGB(p,'grass',63,32,0),plain);assert.deepEqual(groundRGB(p,'grass',32,32,0),terrainRGB('grass',32,32,7));p.lighting={blend:false};assert.deepEqual(groundRGB(p,'grass',63,32,0),plain);delete p.lighting;p.terrain[1]='water';assert.deepEqual(groundRGB(p,'grass',63,32,0),plain);assert.deepEqual(groundRGB(p,'stone',63,32,0),terrainRGB('stone',63,32,7));
});
test('standalone preview embeds identical saved lighting and safe JSON, with local comparison controls',()=>{
 const p=createMap();p.name='</script><img src=x>';p.lighting={mode:'night',hour:22,ambient:.6};const text=standalonePreview(p,'// runtime');assert.ok(text.includes('"mode":"night","hour":22,"ambient":0.6'));assert.ok(!text.includes('</script><img'));assert.ok(text.includes('id="original"'));assert.ok(text.includes('id="mode"'));assert.ok(!text.includes('src="http'));
});
test('large-map overview uses one whole-world raster instead of thrashing thousands of detail tiles',()=>{
 const p=createMap({cols:128,rows:128}),renderer=new MapRenderer(p),seen=new Set(),ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{}});let overviewCalls=0;renderer.overview=()=>{overviewCalls++;return {}};renderer.tile=(type,x,y)=>{seen.add([type,x,y].join(':'));return {}};renderer.draw(ctx,{width:400,height:650,zoom:.06});assert.equal(seen.size,0);assert.equal(overviewCalls,1);renderer.draw(ctx,{width:400,height:650,zoom:1});assert.ok(seen.size>10);
});
test('ambient keeps original night blue and warm dusk/dawn, zero strength is neutral',()=>{
 const p=createMap();assert.deepEqual(ambientRGB(p),[255,255,255]);p.lighting={mode:'night'};assert.deepEqual(ambientRGB(p),[172,186,232]);p.lighting={mode:'time',hour:18.5};const dusk=ambientRGB(p);assert.ok(dusk[0]>dusk[2]);p.lighting.hour=6;const dawn=ambientRGB(p);assert.notDeepEqual(dawn,dusk);p.lighting.ambient=0;assert.deepEqual(ambientRGB(p),[255,255,255]);
});
test('detail and overview caches invalidate on palette/neighbor changes; overlays remain above ambient',()=>{
 const old=globalThis.document,calls=[],fakeCtx=new Proxy({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),createRadialGradient:()=>({addColorStop(){}}),drawImage:()=>calls.push('image'),strokeRect:()=>calls.push('overlay'),fillText:()=>calls.push('marker')},{get:(o,k)=>k in o?o[k]:()=>{}});globalThis.document={createElement:()=>({getContext:()=>fakeCtx})};
 try{const p=createMap({cols:4,rows:4}),r=new MapRenderer(p),a=r.tile('grass',0,0);assert.equal(r.tile('grass',0,0),a);p.lighting={mode:'night',vignette:false};assert.notEqual(r.tile('grass',0,0),a);const b=r.tile('grass',0,0);p.terrain[1]='dirt';assert.notEqual(r.tile('grass',0,0),b);const small=r.overview();assert.equal(r.overview(),small);assert.equal(small.width,16);p.terrain[1]='water';assert.notEqual(r.overview(),small);p.lighting.mode='day';assert.notEqual(r.overview(),small);p.lighting.mode='night';r.atmosphere=()=>calls.push('lighting');r.draw(fakeCtx,{width:200,height:200,zoom:1,grid:true,markers:true});assert.ok(calls.indexOf('overlay')>calls.indexOf('lighting'));assert.ok(calls.indexOf('marker')>calls.indexOf('lighting'))}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old}
});
test('renderer keeps canvas save/restore balanced with optional markers, draws depth-sorted props and skips off-screen sprites',()=>{
 const p=createMap();object(p,{id:'tree_behind',y:180});object(p,{id:'tree_front',y:230});object(p,{id:'out',x:1800,y:1300});let depth=0;const calls=[];const ctx=new Proxy({save:()=>depth++,restore:()=>{depth--;assert.ok(depth>=0)},drawImage:(img)=>{if(img==='tree')calls.push('tree')},globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{}});const r=new MapRenderer(p,new Map([['tree','tree']]));r.tile=()=>({});r.draw(ctx,{width:500,height:500,actor:{x:200,y:210},drawActor:()=>calls.push('hero'),markers:true});assert.equal(depth,0);assert.deepEqual(calls,['tree','hero','tree']);r.draw(ctx,{width:500,height:500,markers:false});assert.equal(depth,0);
});
