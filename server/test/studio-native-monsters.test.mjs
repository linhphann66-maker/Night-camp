import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadNativeMonsters} from '../../tools/lib/native-monsters-source.mjs';
import {createMap,validateMap,nativeMonsterStats,MonsterPreview,MonsterSpawnController,MapRenderer} from '../../dist/studio/maps/runtime.mjs';
const root=fileURLToPath(new URL('../../',import.meta.url)),catalog=JSON.parse(fs.readFileSync(path.join(root,'dist/studio/maps/monsters.json'))),types=Object.fromEntries(catalog.monsters.map(m=>[m.id,m]));
const spawn=(opts={})=>({id:'bai_01',name:'Bãi quái',monsterId:'slime_green',x:300,y:300,radius:0,count:1,respawnSeconds:1,enabled:true,...opts});
function fixture(){const p=createMap();p.monsterTypes={slime_green:structuredClone(types.slime_green)};p.monsterSpawns=[spawn()];return p}
test('native monster library includes original stats, all extant poses, elites and bosses without equipment',()=>{
 assert.equal(catalog.monsters.length,432);assert.equal(Object.keys(types).length,432);const p=createMap();p.monsterTypes=types;validateMap(p);
 for(const m of catalog.monsters){for(const s of Object.values(m.poses))assert.ok(fs.existsSync(path.join(root,'dist-full',m.build,s.src))||fs.existsSync(path.join(root,'dist',m.build,s.src)));assert.ok(m.source);assert.ok(!/^(hat_|rig_|glasses_)/.test(m.id))}
 assert.equal(types.bat_king.category,'boss');assert.equal(types.wolf_frost.category,'elite');assert.equal(types.wolf_frost.native.eliteOf,'wolf');assert.deepEqual(types.wolf_frost.poses,types.wolf.poses);assert.equal(types.bee.kind,'fly');
});
test('all 432 templates match original NC.monsterStats at every level 1–99, not guessed preview numbers',()=>{
 const {NC}=loadNativeMonsters(root);for(const m of catalog.monsters)for(let level=1;level<=99;level++)assert.deepEqual(nativeMonsterStats(m,level),JSON.parse(JSON.stringify(NC.monsterStats(m.id,level))),m.id+' level '+level);
});
test('spawn level/scale are optional, validated and carried to a single reserved entity request',()=>{
 const p=fixture(),before=JSON.stringify(p);validateMap(p);assert.equal(JSON.stringify(p),before);p.monsterSpawns[0].level=40;p.monsterSpawns[0].scale=1.4;const c=new MonsterSpawnController(p,{monsterIds:Object.keys(types)}),requests=c.poll();assert.equal(requests.length,1);assert.equal(requests[0].level,40);assert.equal(requests[0].scale,1.4);assert.deepEqual(c.poll(),[]);
 for(const bad of [{level:0},{level:100},{level:1.5},{scale:0},{scale:6}])assert.throws(()=>validateMap({...p,monsterSpawns:[spawn(bad)]}));
 for(const m of [null,{...types.slime_green,id:'wrong'},{...types.slime_green,native:{...types.slime_green.native,hpK:Infinity}},{...types.slime_green,poses:{idle:{...types.slime_green.poses.idle,src:'../secrets.png'}}}])assert.throws(()=>validateMap({...p,monsterTypes:{slime_green:m}}));
});
test('preview attack/death/respawn never changes map, grants XP or treats unknown IDs as a different species',()=>{
 const p=fixture();p.monsterSpawns.push(spawn({id:'custom_01',monsterId:'my_custom_monster'}));const before=JSON.stringify(p),s=new MonsterPreview(p,{random:()=>.5}),actor={x:300,y:320};s.update(.1,actor,{wander:false});assert.equal(s.entities.size,1);assert.deepEqual(s.missing,['my_custom_monster']);const old=[...s.entities.keys()][0];
 assert.equal(s.attack(actor).killed,false);assert.equal(s.attack(actor),null);for(let hit=0;hit<2;hit++){for(let i=0;i<4;i++)s.update(.1,actor,{wander:false});s.attack(actor)}assert.equal(s.kills,1);assert.equal(s.entities.size,0);assert.equal(s.controller.stats().waiting,1);for(let i=0;i<12;i++)s.update(.1,actor,{wander:false});assert.equal(s.entities.size,1);assert.notEqual([...s.entities.keys()][0],old);assert.equal(JSON.stringify(p),before);assert.equal(p.wallet,undefined);
 const noRespawn=fixture();noRespawn.monsterSpawns[0].respawnSeconds=0;const once=new MonsterPreview(noRespawn);once.update(.1,actor);const e=[...once.entities.values()][0];e.hp=1;once.attack(actor);for(let i=0;i<50;i++)once.update(.1,actor);assert.equal(once.entities.size,0);assert.equal(once.controller.stats().retired,1);
});
test('preview excludes disabled and blocked spawns, observes native foot radius, movement stays out of water',()=>{
 const p=fixture();p.monsterSpawns[0].enabled=false;assert.equal(new MonsterPreview(p).controller.slots.length,0);p.monsterSpawns[0].enabled=true;p.terrain.fill('water');const s=new MonsterPreview(p);s.update(.1,p.spawn);assert.equal(s.entities.size,0);
 const q=fixture();q.monsterSpawns[0].x=4;const edge=new MonsterPreview(q);edge.update(.1,q.spawn);assert.equal(edge.entities.size,0);
});
test('renderer depth-sorts monster callbacks with player and props and applies lighting afterward',()=>{
 const p=createMap({cols:4,rows:4}),calls=[],ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{}}),r=new MapRenderer(p);r.overview=()=>({});r.atmosphere=()=>calls.push('light');r.draw(ctx,{width:200,height:200,zoom:.06,actor:{x:50,y:100},drawActor:()=>calls.push('hero'),entities:[{x:50,y:120,draw:()=>calls.push('near')},{x:50,y:80,draw:()=>calls.push('far')}]});assert.deepEqual(calls,['far','hero','near','light']);
});
