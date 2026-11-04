import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,validateMap,pointWalkable,objectOccludesActor,MAP_RUNTIME_VERSION,MAP_OBJECT_KINDS} from '../../dist/studio/maps/runtime.mjs';
import {matchesMapProp,MAP_PROP_CATEGORIES,MAP_PROP_KINDS} from '../../dist/studio/maps/prop-library.mjs';
import {loadNativeSource} from '../../tools/lib/native-ground-source.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/maps/catalog.json',import.meta.url))),byId=new Map(catalog.assets.map(a=>[a.id,a]));
const placed=(id,asset,x=500,y=500)=>({id,asset,x,y,scale:1,rotation:0,flip:false,layer:'sorted',collider:structuredClone(byId.get(asset).collider),walk:structuredClone(byId.get(asset).walk)});
test('all original scenery categories have usable unique assets; character/UI art is excluded',()=>{
 assert.equal(catalog.assets.length,1177);assert.equal(byId.size,1177);assert.equal(catalog.assets.filter(a=>a.legacyV1).length,377);
 for(const a of catalog.assets){assert.ok(MAP_PROP_CATEGORIES[a.category]);assert.ok(MAP_PROP_KINDS[a.kind]);assert.ok(MAP_OBJECT_KINDS.includes(a.kind));assert.ok(!/^(hat_|glasses_|rig_)/.test(a.id));assert.ok(/^assets\/(maps|camp)\//.test(a.src)||!a.src.includes('/',7));const p=createMap();p.assets[a.id]=structuredClone(a);p.objects.push(placed('copy_01',a.id));validateMap(p);assert.equal(p.objects[0].interaction,undefined)}
 for(const id of ['m_cottage','f_farmhouse','camp_tent','camp_crates','camp_lantern','camp_firebase','m_fence','d_chest_gold','rug_red'])assert.ok(byId.has(id),id);
 assert.equal(byId.get('rug_red').defaultLayer,'ground');assert.equal(byId.get('camp_firebase').kind,'fire');assert.ok(MAP_RUNTIME_VERSION>=5);
});
test('native house proportions and foot rects are retained, roof does not block movement, houses can fade behind actor',()=>{
 const root=new URL('../../',import.meta.url).pathname,{NC}=loadNativeSource(root),defs={...NC.FIELD_PROPS,...NC.CAMP_PROPS,...NC.AREA_DATA.props};
 for(const id of ['m_cottage','f_farmhouse']){const a=byId.get(id),s=NC.ASSET_MANIFEST_MAPS[id],d=defs[id];for(const k of ['src','w','h','ax','ay'])assert.equal(a[k],s[k]);assert.equal(a.collider.w,a.w*d.rect[0]);assert.equal(a.collider.h,d.rect[1]-4);assert.equal(a.fadeBehind,true);assert.equal(a.kind,'house');const p=createMap();p.assets[id]=a;const o=placed('house_a',id);p.objects.push(o);assert.equal(pointWalkable(p,500,500+a.collider.y),false);assert.equal(pointWalkable(p,500,500-a.h*.65),true);assert.equal(objectOccludesActor(p,o,{x:500,y:500-a.h*.55}),true);assert.equal(objectOccludesActor(p,o,{x:500,y:510}),false)}
});
test('legacy footprint defaults and exact original asset geometry remain unchanged',()=>{
 const root=new URL('../../',import.meta.url).pathname,{NC}=loadNativeSource(root);
 for(const a of catalog.assets.filter(a=>a.legacyV1)){const s=NC.ASSET_MANIFEST_MAPS[a.id];assert.equal(a.src,s.src);if(a.kind==='tree'||a.kind==='rock'||a.kind==='bush')assert.deepEqual(a.collider,{type:'ellipse',x:0,y:-4,w:Math.max(18,Math.min(110,a.w*.22)),h:Math.max(10,Math.min(50,a.w*.1))});assert.equal(a.defaultLayer,'sorted')}
});
test('Vietnamese searches work with or without accents and exact technical IDs',()=>{
 for(const [id,q]of [['m_cottage','nha'],['camp_tent','leu'],['camp_lantern','den'],['m_fence','hang rao'],['f_farmhouse','f_farmhouse']])assert.equal(matchesMapProp(byId.get(id),q),true);
 assert.equal(matchesMapProp(byId.get('m_cottage'),'vũ khí không tồn tại'),false);
});
test('decoration copies retain per-map IDs, independent footprints and optional interactions through full bundle roundtrip',()=>{
 const p=createMap();p.assets.home=structuredClone(byId.get('m_cottage'));const a={...placed('nha_01','m_cottage'),asset:'home'},b={...structuredClone(a),id:'nha_02',x:1100};p.objects.push(a,b);a.interaction={enabled:true,type:'custom',actionId:'xem_nha',label:'Xem nhà',range:96,point:{x:0,y:30},durationSeconds:1,respawnSeconds:0,deplete:false,reward:null};validateMap(p);const saved=JSON.stringify(p),q=validateMap(JSON.parse(saved));assert.equal(q.objects[1].interaction,undefined);q.objects[1].collider.w=10;assert.notEqual(q.objects[0].collider.w,10);assert.equal(JSON.stringify(p),saved);assert.deepEqual(validateMap(JSON.parse(JSON.stringify({format:'darkin-map-bundle-v1',project:p})).project),p);
});
