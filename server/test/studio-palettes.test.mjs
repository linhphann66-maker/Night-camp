import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadNativeSource,extractNativeGrounds} from '../../tools/lib/native-ground-source.mjs';
import {NATIVE_GROUNDS,NATIVE_MAPS,NATIVE_TERRAINS,nativeGroundRGB,nativeTerrainId,applyNativeEnvironment,ambientRGB,nightness,createMap,validateMap,pointWalkable,terrainRGB,resizedMap} from '../../dist/studio/maps/runtime.mjs';
import {bundleMapRuntime} from '../../dist/studio/maps/runtime-bundle.mjs';
const root=path.resolve(import.meta.dirname,'../..'),{NC,ctx,base}=loadNativeSource(root),bytes=x=>Array.from(new Uint8ClampedArray(x));
test('generated palettes include all 156 source maps and 139 styles without hand-picked replacement colors',()=>{
 const data=extractNativeGrounds(root);assert.deepEqual(NATIVE_GROUNDS,data.grounds);assert.deepEqual(NATIVE_MAPS,data.maps);assert.equal(Object.keys(NATIVE_MAPS).length,156);assert.equal(Object.keys(NATIVE_GROUNDS).length,139);for(const [id,b]of Object.entries(NC.BIOMES))for(const key of ['base','patch','vary','patchScale','road','roadEdge','roadMid','water','deep','shore'])assert.deepEqual(NATIVE_GROUNDS[id][key],JSON.parse(JSON.stringify(b[key])));
});
test('field ground pixels match the original unmodified fieldgen.js loop at multiple coordinates, seeds and times',()=>{
 const source=fs.readFileSync(path.join(base,'fieldgen.js'),'utf8'),start=source.indexOf('const n = NC.fbm(x / PS'),end=source.indexOf('pD[k + 3] = 255;',start)+'pD[k + 3] = 255;'.length;assert.ok(start>0&&end>start);
 const original=vm.runInContext('(x,y,SEED,B)=>{const bn=B.base.n,bd=B.base.d,qn=B.patch.n,qd=B.patch.d,V=B.vary,PS=B.patchScale,k=0,pN=new Uint8ClampedArray(4),pD=new Uint8ClampedArray(4);'+source.slice(start,end)+'return {day:Array.from(pD).slice(0,3),night:Array.from(pN).slice(0,3)}}',ctx);
 for(const [id,b]of Object.entries(NC.BIOMES))for(const [x,y,seed]of [[0,0,7],[122,456,11],[1337,2049,97],[4102,1678,731],[2310,3178,1103]]){const expected=original(x,y,seed,b);for(const n of [0,.25,.5,1])assert.deepEqual(nativeGroundRGB(id,'base',x,y,seed,n),bytes(expected.day.map((v,i)=>v+(expected.night[i]-v)*n)),id+' at '+x+','+y+' n='+n)}
});
test('fixed source channel colors, floor texture and sky tint are not replaced by generic meadow colors',()=>{
 for(const [id,b]of Object.entries(NC.BIOMES))for(const channel of ['road','roadEdge','roadMid','water','deep','shore']){assert.deepEqual(nativeGroundRGB(id,channel,222,888,7,0),bytes(b[channel].d));assert.deepEqual(nativeGroundRGB(id,channel,222,888,7,1),bytes(b[channel].n))}
 for(const m of Object.values(NATIVE_MAPS))for(const [mode,hour]of [['day',12],['night',22],['time',6],['time',18.5]]){const p=createMap();p.environment={map:m.id,nativeLighting:true};p.lighting={mode,hour,ambient:1};const h=hour,n0=mode==='night'?1:mode==='day'?0:h<5||h>=19.5?1:h<7?(7-h)/2:h>=17.5?(h-17.5)/2:0,n=Math.max(n0,m.dusk);assert.equal(nightness(p),n);const sourceMap=NC.MAPS[m.id],w=sourceMap.dungeon?null:m.id==='camp'?{}:NC.buildField({...sourceMap,id:m.id}),expected=sourceMap.dungeon?NC.DUNGEON_THEMES[sourceMap.dungeon.theme].ambient:w.ambient?w.ambient(hour*60,n):NC.skyAmbient(hour*60,n);assert.deepEqual(bytes(ambientRGB(p)),bytes(expected),'ambient '+m.id+' '+mode)}
});
test('native preset preserves map objects, roads, custom image tiles and collision; native water still blocks',()=>{
 const p=createMap();p.assets.own={src:'data:image/png;base64,aA==',w:64,h:64,ax:0,ay:0,kind:'ground'};p.terrain[0]='water';p.terrain[1]='dirt';p.terrain[2]='own';p.blocked[3]=1;const q=applyNativeEnvironment(p,'peak');assert.equal(q.terrain[0],nativeTerrainId('peak','water'));assert.equal(q.terrain[1],nativeTerrainId('peak','road'));assert.equal(q.terrain[2],'own');assert.deepEqual(q.blocked,p.blocked);assert.deepEqual(q.objects,p.objects);assert.deepEqual(q.roads,p.roads);assert.equal(pointWalkable(q,32,32),false);q.walkable[0]=1;assert.equal(pointWalkable(q,32,32),true);assert.equal(p.environment,undefined);validateMap(JSON.parse(JSON.stringify(q)));assert.throws(()=>validateMap({...q,environment:{map:'__proto__',nativeLighting:true}}));assert.throws(()=>validateMap({...q,environment:{map:'peak',nativeLighting:'true'}}));assert.equal(q.seed,NATIVE_MAPS.peak.seed);assert.ok(Object.keys(NATIVE_TERRAINS).length>1000);
});
test('camp base and dungeon room-floor pixels follow their own original source equations, not fieldgen defaults',()=>{
 const camp=fs.readFileSync(path.join(base,'camp.js'),'utf8'),cs=camp.indexOf('const n = NC.fbm(x / 320'),ce=camp.indexOf('// packed earth',cs),campFn=vm.runInContext('(x,y,CORNERS)=>{const openE=(x,y)=>Math.min(...CORNERS.map(o=>((x-o.x)/o.rx)**2+((y-o.y)/o.ry)**2));'+camp.slice(cs,ce)+'return {d:[rd,gd,bd],n:[rn,gn,bn]}}',ctx);
 for(const [x,y]of [[100,200],[3100,2480],[4700,1400],[6200,5000]]){const out=campFn(x,y,NATIVE_GROUNDS.camp.CORNERS);assert.deepEqual(nativeGroundRGB('camp','base',x,y,7,0),bytes(out.d));assert.deepEqual(nativeGroundRGB('camp','base',x,y,7,1),bytes(out.n))}
 const dun=fs.readFileSync(path.join(base,'dungeongen.js'),'utf8'),ds=dun.indexOf('const n = NC.fbm(x / 420'),de=dun.indexOf('if (side[k]',ds),floorFn=vm.runInContext('(x,y,seed,T)=>{const S=seed*5+3,bdat=[255],k=0,mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);let c;'+dun.slice(ds,de)+'return c}',ctx);
 for(const [id,b]of Object.entries(NC.DUNGEON_THEMES))for(const [x,y,seed]of [[120,234,301],[1200,2456,781]])assert.deepEqual(nativeGroundRGB('dungeon_'+id,'floor',x,y,seed,1),bytes(floorFn(x,y,seed,b)),id);
});
test('downloaded runtime bundles all native data with no relative imports and retains the public API',async()=>{
 const code=bundleMapRuntime(fs.readFileSync(path.join(root,'dist/studio/maps/native-ground.mjs'),'utf8'),fs.readFileSync(path.join(root,'dist/studio/maps/runtime.mjs'),'utf8'));assert.ok(!/^import /m.test(code));const mod=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));assert.equal(Object.keys(mod.NATIVE_MAPS).length,156);assert.equal(typeof mod.DarkinMapPlayer.load,'function');assert.deepEqual(mod.terrainRGB(nativeTerrainId('peak'),222,888,7,1),terrainRGB(nativeTerrainId('peak'),222,888,7,1));
});
test('expanding a native map fills only new cells with its selected ground, leaving old tiles and custom artwork intact',()=>{
 const p=applyNativeEnvironment(createMap(),'peak');p.terrain[0]='stone';const q=resizedMap(p,40,30);assert.equal(q.terrain[0],'stone');assert.equal(q.terrain.at(-1),nativeTerrainId('peak','base'));assert.deepEqual(q.environment,p.environment);assert.equal(q.seed,p.seed);
});
