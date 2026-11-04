import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,validateMap,resizedMap,monsterSpawnDefinitions,monsterSpawnPosition,MonsterSpawnController,drawMonsterSpawnMarkers,MapRenderer,MAP_RUNTIME_VERSION,MONSTER_SPAWN_SCHEMA,canWalk} from '../../dist/studio/maps/runtime.mjs';
import {bundleMapRuntime} from '../../dist/studio/maps/runtime-bundle.mjs';
const point=(id='bai_slime_01',overrides={})=>({id,name:'Bãi slime',monsterId:'slime_green',x:400,y:300,radius:0,count:2,respawnSeconds:3,enabled:true,...overrides});
const map=(...points)=>({...createMap(),monsterSpawns:points});
const controller=p=>new MonsterSpawnController(p,{monsterIds:['slime_green','wolf_gray'],random:()=>.25});
test('legacy maps retain original formats and no monsters; new maps have independent empty spawn list',()=>{
 const p=createMap();assert.deepEqual(p.monsterSpawns,[]);delete p.monsterSpawns;assert.equal(validateMap(p).format,'darkin-map-v1');assert.deepEqual(monsterSpawnDefinitions(p),[]);assert.equal(MAP_RUNTIME_VERSION,3);assert.equal(MONSTER_SPAWN_SCHEMA.collection,'project.monsterSpawns');
});
test('point identity differs from monster type, allowing several points and maps to reuse one monsterId',()=>{
 const p=map(point('bai_a'),point('bai_b'));validateMap(p);const defs=monsterSpawnDefinitions({format:'darkin-map-bundle-v1',project:p});assert.equal(defs.length,2);assert.equal(defs[0].monsterId,defs[1].monsterId);assert.notEqual(defs[0].id,defs[1].id);assert.equal(defs[0].mapId,p.id);defs[0].x=0;assert.equal(p.monsterSpawns[0].x,400);
 const q={...p,id:'map_b'};assert.notEqual(monsterSpawnDefinitions(q)[0].mapId,monsterSpawnDefinitions(p)[0].mapId);
});
test('disabled points remain in project and optional definitions but do not create slots',()=>{
 const p=map(point(),point('disabled',{enabled:false,monsterId:'not_registered'}));assert.equal(monsterSpawnDefinitions(p).length,1);assert.equal(monsterSpawnDefinitions(p,{enabledOnly:false}).length,2);assert.equal(controller(p).slots.length,2);assert.equal(validateMap(JSON.parse(JSON.stringify(p))).monsterSpawns.length,2);
});
test('validation rejects malformed/duplicate IDs, coordinates, non-finite/integer limits and excess capacity',()=>{
 for(const change of [{id:'__proto__'},{id:'../a'},{monsterId:''},{monsterId:'constructor'},{name:1},{name:'x'.repeat(101)},{enabled:1},{x:-1},{x:2048},{y:1536},{radius:-1},{radius:1025},{radius:Infinity},{count:0},{count:1.2},{count:51},{respawnSeconds:-1},{respawnSeconds:86401},{respawnSeconds:NaN}])assert.throws(()=>validateMap(map(point('a',change))),JSON.stringify(change));
 assert.throws(()=>validateMap(map(point(),point())));assert.throws(()=>validateMap({...createMap(),monsterSpawns:null}));assert.throws(()=>validateMap(map(...Array.from({length:257},(_,i)=>point('p'+i,{count:1})))));assert.throws(()=>validateMap(map(...Array.from({length:21},(_,i)=>point('p'+i,{count:50})))));
});
test('resize preserves all points and refuses silent loss at a shrinking edge',()=>{
 const p=map(point());assert.deepEqual(resizedMap(p,40,40).monsterSpawns,p.monsterSpawns);assert.throws(()=>resizedMap(p,4,4));assert.equal(p.monsterSpawns[0].x,400);
});
test('spawn selection uses world coordinates, honors radius and never spawns on walls/water/outside',()=>{
 const p=map(point());assert.deepEqual(monsterSpawnPosition(p,p.monsterSpawns[0]),{x:400,y:300});p.terrain.fill('water');assert.equal(monsterSpawnPosition(p,p.monsterSpawns[0]),null);p.terrain.fill('grass');p.blocked.fill(1);assert.equal(monsterSpawnPosition(p,p.monsterSpawns[0]),null);p.blocked.fill(0);
 const s=point('edge',{x:4,y:4,radius:100});let n=0;const random=()=>((n++*37)%100)/100,pos=monsterSpawnPosition(p,s,{random});assert.ok(pos);assert.ok(canWalk(p,pos.x,pos.y));assert.ok(Math.hypot(pos.x-s.x,pos.y-s.y)<=s.radius);assert.equal(monsterSpawnPosition(p,s,{canSpawn:()=>false}),null);assert.throws(()=>monsterSpawnPosition(p,s,{random:()=>1}));
});
test('registry is required, unknown enabled types fail before spawning, duplicate point names are harmless',()=>{
 const p=map(point());assert.throws(()=>new MonsterSpawnController(p));assert.throws(()=>new MonsterSpawnController(p,{monsterIds:[]}),/monsterId=slime_green/);assert.equal(controller(p).poll().length,2);
});
test('poll reserves capacity before async creation and never spawns every frame',()=>{
 const c=controller(map(point())),requests=c.poll();assert.equal(requests.length,2);assert.equal(new Set(requests.map(r=>r.instanceId)).size,2);for(const r of requests){assert.equal(r.monsterId,'slime_green');assert.equal(r.spawnId,'bai_slime_01');assert.equal(r.mapId,'custom_map');assert.equal(c.confirm(r.instanceId),true)}assert.deepEqual(c.poll(100),[]);assert.equal(c.stats().alive,2);
 const pending=controller(map(point()));assert.equal(pending.poll().length,2);assert.deepEqual(pending.poll(200),[]);assert.equal(pending.stats().pending,2);
});
test('death schedules exactly one replacement after its delay; repeated death and confirmation cannot duplicate',()=>{
 const c=controller(map(point())),[a,b]=c.poll();c.confirm(a.instanceId);c.confirm(b.instanceId);assert.equal(c.confirm(a.instanceId),false);assert.equal(c.markDead(a.instanceId),true);assert.equal(c.markDead(a.instanceId),false);assert.equal(c.markDead('unknown'),false);assert.deepEqual(c.poll(2.9),[]);const next=c.poll(.11);assert.equal(next.length,1);assert.notEqual(next[0].instanceId,a.instanceId);assert.equal(next[0].spawnId,a.spawnId);assert.equal(c.stats().alive,1);assert.equal(c.stats().pending,1);assert.deepEqual(c.poll(50),[]);
});
test('zero respawn is a one-off wave; failed creation retries with a new instance ID without exceeding count',()=>{
 const c=controller(map(point('once',{count:1,respawnSeconds:0}))),[first]=c.poll();assert.equal(c.reject(first.instanceId),true);assert.equal(c.reject(first.instanceId),false);assert.deepEqual(c.poll(.5),[]);const [retry]=c.poll(.5);assert.ok(retry);assert.notEqual(retry.instanceId,first.instanceId);c.confirm(retry.instanceId);c.markDead(retry.instanceId);assert.deepEqual(c.poll(86400),[]);assert.equal(c.stats().retired,1);
});
test('blocked spawn defers and resumes if the game opens a valid area, instead of forcing bad coordinates',()=>{
 const p=map(point('blocked',{count:1})),c=controller(p);p.blocked.fill(1);assert.deepEqual(c.poll(),[]);assert.equal(c.stats().ready,1);p.blocked.fill(0);assert.deepEqual(c.poll(.5),[]);assert.equal(c.poll(.5).length,1);for(const dt of [-1,NaN,Infinity,86401])assert.throws(()=>c.poll(dt));
});
test('independent map instances and per-type templates keep correct spawn and monster identity',()=>{
 const p=map(point('slimes',{count:1}),point('wolves',{monsterId:'wolf_gray',count:1,x:600})),a=controller(p),b=controller({...p,id:'map_b'}),ra=a.poll(),rb=b.poll();assert.deepEqual(ra.map(r=>[r.spawnId,r.monsterId]),[['slimes','slime_green'],['wolves','wolf_gray']]);assert.notEqual(ra[0].instanceId,rb[0].instanceId);a.confirm(ra[0].instanceId);assert.equal(b.stats().pending,2);
});
test('a failing game collision callback rolls back pending requests instead of leaking capacity',()=>{
 let n=0;const c=new MonsterSpawnController(map(point()),{monsterIds:['slime_green'],canSpawn:()=>{if(++n===2)throw Error('Game callback failed');return true}});assert.throws(()=>c.poll(),/callback failed/);assert.equal(c.stats().pending,0);assert.equal(c.instances.size,0);assert.equal(c.poll(1).length,2);
});
test('marker rendering identifies points and types independently of player spawn and honors view visibility',()=>{
 const p=map(point('a'),point('off',{enabled:false})),labels=[];let depth=0;const ctx=new Proxy({save:()=>depth++,restore:()=>depth--,fillText:t=>labels.push(t)},{get:(o,k)=>k in o?o[k]:()=>{}});drawMonsterSpawnMarkers(ctx,p,{zoom:.5,selected:'a'});assert.equal(depth,0);assert.ok(labels.some(t=>t.includes('a → slime_green')));assert.ok(labels.some(t=>t.includes('off →')&&t.includes('tắt')));
 const renderer=new MapRenderer(p);renderer.tile=()=>({});renderer.atmosphere=()=>{};labels.length=0;renderer.draw(ctx,{width:1000,height:800,markers:true,monsterMarkers:false});assert.ok(!labels.some(t=>t.includes('slime_green')));assert.ok(labels.includes('Spawn'));assert.equal(depth,0);
});
test('downloadable runtime is self-contained and its Node controller reads bundle definitions',async()=>{
 const dir=new URL('../../dist/studio/maps/',import.meta.url),code=bundleMapRuntime(fs.readFileSync(new URL('native-ground.mjs',dir),'utf8'),fs.readFileSync(new URL('runtime.mjs',dir),'utf8'));assert.ok(!/^import /m.test(code));const m=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64')),bundle={format:'darkin-map-bundle-v1',project:map(point())};assert.equal(m.monsterSpawnDefinitions(bundle).length,1);assert.equal(new m.MonsterSpawnController(bundle,{monsterIds:['slime_green']}).poll().length,2);
});
