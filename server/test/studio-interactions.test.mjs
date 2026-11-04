import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createMap,validateMap,resizedMap,defaultInteraction,interactionDefinitions,interactionPoint,nearestInteraction,InteractionSimulator,MapRenderer,objectWorld,canWalk,MAP_RUNTIME_VERSION,MAP_INTERACTION_SCHEMA} from '../../dist/studio/maps/runtime.mjs';
import {bundleMapRuntime} from '../../dist/studio/maps/runtime-bundle.mjs';
const src='data:image/png;base64,aA==';
function map(){const p=createMap();p.assets.rock={src,w:100,h:100,ax:.5,ay:1,kind:'rock'};p.objects=[{id:'ore_01',asset:'rock',x:400,y:400,scale:1,rotation:0,flip:false,layer:'sorted',collider:{type:'ellipse',x:0,y:0,w:60,h:30},walk:null}];return p}
function mining(){const p=map();p.objects[0].interaction=defaultInteraction();return p}
const actor=()=>({x:400,y:450,radius:12,hp:100});
test('legacy props stay non-interactive; config and IDs belong to map object instances, not asset images',()=>{
 const p=map(),snapshot=structuredClone(p);validateMap(p);assert.deepEqual(interactionDefinitions(p),[]);assert.deepEqual(p,snapshot);p.objects[0].interaction=defaultInteraction();p.objects.push({...structuredClone(p.objects[0]),id:'ore_02',x:600});assert.equal(interactionDefinitions(p).length,2);assert.equal(p.assets.rock.interaction,undefined);p.objects[1].interaction.range=150;assert.equal(p.objects[0].interaction.range,96);assert.ok(MAP_RUNTIME_VERSION>=4);assert.equal(MAP_INTERACTION_SCHEMA.collection,'project.objects[].interaction');
});
test('full project/bundle roundtrip retains config, duplicate IDs fail and different maps may reuse IDs',()=>{
 const p=mining(),bundle={format:'darkin-map-bundle-v1',project:JSON.parse(JSON.stringify(p))},defs=interactionDefinitions(bundle);assert.equal(defs[0].objectId,'ore_01');assert.equal(defs[0].mapId,p.id);defs[0].interaction.range=2;assert.equal(p.objects[0].interaction.range,96);const q={...p,id:'map_b'};assert.notEqual(interactionDefinitions(q)[0].mapId,interactionDefinitions(p)[0].mapId);p.objects.push(structuredClone(p.objects[0]));assert.throws(()=>validateMap(p));
});
test('invalid IDs, range/duration/respawn, local points and resource quantities reject atomically',()=>{
 const p=mining();for(const change of [{enabled:1},{type:'hack'},{actionId:'__proto__'},{label:''},{range:0},{range:2001},{durationSeconds:0},{durationSeconds:601},{respawnSeconds:-1},{respawnSeconds:86401},{deplete:0},{point:{x:Infinity,y:0}},{reward:{resourceId:'spirit_stone',min:9,max:2}},{reward:{resourceId:'x',min:1.5,max:3}},{reward:{resourceId:'../x',min:1,max:2}},{reward:{resourceId:'x',min:1,max:1000001}}]){const q=structuredClone(p);Object.assign(q.objects[0].interaction,change);assert.throws(()=>validateMap(q),JSON.stringify(change))}const custom=structuredClone(p);custom.objects[0].interaction=defaultInteraction('custom');validateMap(custom);custom.objects[0].interaction.reward={resourceId:'x',min:1,max:1};assert.throws(()=>validateMap(custom));
});
test('interaction point follows object-local offset, rotation, mirroring and scale, independent of sprite bounds',()=>{
 const p=mining(),o=p.objects[0];o.interaction.point={x:20,y:-10};o.rotation=.7;o.flip=true;o.scale=1.8;assert.deepEqual(interactionPoint(o),objectWorld(o,20,-10));const [x,y]=interactionPoint(o),a={x:x+50,y};assert.equal(nearestInteraction(p,a).objectId,o.id);a.x=x+200;assert.equal(nearestInteraction(p,a),null);
});
test('nearest target uses enabled objects and availability/permission predicates, not visual rock category alone',()=>{
 const p=mining(),a=actor();p.objects.push({...structuredClone(p.objects[0]),id:'nearer',y:440});assert.equal(nearestInteraction(p,a).objectId,'nearer');assert.equal(nearestInteraction(p,a,{isAvailable:id=>id!=='nearer'}).objectId,'ore_01');assert.equal(nearestInteraction(p,a,{canInteract:()=>false}),null);p.objects[1].interaction.enabled=false;assert.equal(nearestInteraction(p,a).objectId,'ore_01');p.objects[0].interaction.enabled=false;assert.equal(nearestInteraction(p,a),null);assert.equal(interactionDefinitions(p).length,0);assert.equal(interactionDefinitions(p,{enabledOnly:false}).length,2);
});
test('simulation starts only in range, reserves one action, rewards once and depletes without editing authored map',()=>{
 const p=mining(),before=structuredClone(p),a=actor(),s=new InteractionSimulator(p,{random:()=>0});assert.equal(s.begin('ore_01',{x:0,y:0}),false);assert.equal(s.begin('missing',a),false);assert.equal(s.begin('ore_01',a),true);assert.equal(s.begin('ore_01',a),false);assert.deepEqual(s.update(1,a),[]);assert.notEqual(s.objectState('ore_01').shakeX,0);assert.equal(s.objectState('ore_01').hidden,false);const events=s.update(2,a);assert.equal(events.length,1);assert.equal(events[0].reward.resourceId,'spirit_stone');assert.equal(events[0].reward.amount,3);assert.equal(s.objectState('ore_01').hidden,true);assert.equal(s.target(a),null);assert.equal(s.begin('ore_01',a),false);assert.deepEqual(s.update(1,a),[]);assert.deepEqual(p,before);
});
test('movement, death and invalid actor state cancel channeling without partial reward; retry starts from zero',()=>{
 for(const changed of [{x:410,y:450},{x:2000,y:2000},{x:400,y:450,dead:true},{x:400,y:450,hp:0},{x:NaN,y:450},null]){const s=new InteractionSimulator(mining()),a=actor();s.begin('ore_01',a);s.update(1,a);const events=s.update(3,changed);assert.equal(events[0].type,'cancelled');assert.equal(events[0].reward,undefined);assert.equal(s.objectState('ore_01').hidden,false);assert.equal(s.begin('ore_01',a),true);assert.equal(s.states.get('ore_01').progress,0)}
});
test('cooldown restores node at configured time; no-respawn node stays gone and other copies remain independent',()=>{
 const p=mining(),a=actor(),s=new InteractionSimulator(p);s.begin('ore_01',a);s.update(3,a);assert.deepEqual(s.update(29,a),[]);assert.equal(s.update(1,a)[0].type,'respawned');assert.equal(s.objectState('ore_01').hidden,false);assert.equal(s.begin('ore_01',a),true);
 const q=mining();q.objects[0].interaction.respawnSeconds=0;q.objects.push({...structuredClone(q.objects[0]),id:'ore_02',x:600});const once=new InteractionSimulator(q);once.begin('ore_01',a);once.update(3,a);assert.deepEqual(once.update(86400,a),[]);assert.equal(once.objectState('ore_01').hidden,true);assert.equal(once.objectState('ore_02').hidden,false);
});
test('inclusive integer reward bounds and bad randomness cannot create partial state or money writes',()=>{
 const p=mining(),a=actor(),s=new InteractionSimulator(p,{random:()=>.999999});s.begin('ore_01',a);assert.equal(s.update(3,a)[0].reward.amount,8);const q=new InteractionSimulator(p,{random:()=>1});q.begin('ore_01',a);assert.throws(()=>q.update(3,a));assert.equal(q.states.get('ore_01').status,'working');assert.equal(q.objectState('ore_01').hidden,false);for(const dt of [-1,NaN,Infinity,86401])assert.throws(()=>s.update(dt,a));assert.equal(s.wallet,undefined);
});
test('custom actions dispatch IDs without currency, and non-disappearing nodes respect cooldown',()=>{
 const p=mining(),a=actor();p.objects[0].interaction=defaultInteraction('custom');p.objects[0].interaction.respawnSeconds=2;const s=new InteractionSimulator(p);s.begin('ore_01',a);const event=s.update(3,a)[0];assert.equal(event.actionId,'interact_custom');assert.equal(event.reward,null);assert.equal(s.objectState('ore_01').hidden,false);assert.equal(s.begin('ore_01',a),false);s.update(2,a);assert.equal(s.begin('ore_01',a),true);
});
test('hidden-node collision is opt-in runtime state; default collision and stored footprints remain intact',()=>{
 const p=mining(),a=actor(),s=new InteractionSimulator(p);assert.equal(canWalk(p,400,400),false);s.begin('ore_01',a);s.update(3,a);assert.equal(canWalk(p,400,400,12,s.walkOptions()),true);assert.equal(canWalk(p,400,400),false);assert.ok(p.objects[0].collider);s.update(30,a);assert.equal(canWalk(p,400,400,12,s.walkOptions()),false);
});
test('renderer shakes only visual transform and hides depleted art/selection without mutating object coordinates',()=>{
 const p=mining(),a=actor(),s=new InteractionSimulator(p),drawn=[],translations=[];let depth=0;const ctx=new Proxy({save:()=>depth++,restore:()=>depth--,drawImage:img=>{if(img==='rock')drawn.push(img)},translate:(x,y)=>translations.push([x,y])},{get:(o,k)=>k in o?o[k]:()=>{}}),r=new MapRenderer(p,new Map([['rock','rock']]));r.tile=()=>({});r.atmosphere=()=>{};s.begin('ore_01',a);s.update(1,a);r.draw(ctx,{width:800,height:600,objectState:id=>s.objectState(id)});assert.equal(drawn.length,1);assert.ok(translations.some(([x,y])=>y===400&&x!==400));assert.equal(p.objects[0].x,400);s.update(2,a);drawn.length=0;r.draw(ctx,{width:800,height:600,collision:true,selected:'ore_01',objectState:id=>s.objectState(id)});assert.equal(drawn.length,0);assert.equal(depth,0);
});
test('resizing/export data retain per-object configuration and portable runtime works in Node',async()=>{
 const p=mining();assert.deepEqual(resizedMap(p,40,30).objects[0].interaction,p.objects[0].interaction);const dir=new URL('../../dist/studio/maps/',import.meta.url),code=bundleMapRuntime(fs.readFileSync(new URL('native-ground.mjs',dir),'utf8'),fs.readFileSync(new URL('runtime.mjs',dir),'utf8'));assert.ok(!/^import /m.test(code));const m=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));assert.equal(m.MAP_RUNTIME_VERSION,4);assert.equal(m.interactionDefinitions({format:'darkin-map-bundle-v1',project:p})[0].objectId,'ore_01');const sim=new m.InteractionSimulator(p);sim.begin('ore_01',actor());assert.equal(sim.update(3,actor())[0].type,'completed');
});
