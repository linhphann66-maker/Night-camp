import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import {loadNativeSkills} from '../../tools/lib/native-skills-source.mjs';
import {createSkillProject,validateSkillProject,newVisualSkill,skillFrame,skillEventPosition,SkillPlayer} from '../../dist/studio/effects/runtime.mjs';
import {createMap,MapRenderer} from '../../dist/studio/maps/runtime.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/effects/catalog.json',import.meta.url))),root=fileURLToPath(new URL('../../',import.meta.url));
function project(){const p=createSkillProject();p.effects.ring=structuredClone(catalog.effects.find(e=>e.id==='studio_ring'));p.effects.ring.id='ring';p.skills.fire=newVisualSkill('fire','Hỏa cầu');p.skills.fire.events=[{id:'moc_01',effectId:'ring',at:.1,duration:.6,scale:1,x:10,y:-20,rotation:0,opacity:.8,anchor:'caster',follow:false,motion:'still',layer:'high',blend:'normal'}];return p}
test('433 native skill metadata records sample original rank formulas without serializing executable functions',()=>{
 const {NC}=loadNativeSkills(root);assert.equal(catalog.skills.length,433);assert.equal(new Set(catalog.skills.map(s=>s.id)).size,433);
 for(const s of catalog.skills){assert.ok(s.source);assert.equal(s.originalName,NC.SKILLS[s.id].name);for(const row of s.ranks){const n=NC.SKILLS[s.id];if(n.sp)assert.equal(row.cost,n.sp(row.rank));if(n.mul)assert.equal(row.multiplier,n.mul(row.rank));if(n.dur)assert.equal(row.duration,n.dur(row.rank));assert.equal(row.unsupported,undefined)}}
});
test('original effects preserve valid independent image/frame geometry; generated primitives are explicitly labeled',()=>{
 assert.equal(catalog.effects.length,228);assert.equal(catalog.effects.filter(e=>e.group==='frames').length,36);assert.equal(catalog.effects.filter(e=>e.group==='image').length,188);const p=createSkillProject();p.effects=Object.fromEntries(catalog.effects.map(e=>[e.id,e]));validateSkillProject(p);for(const e of catalog.effects){assert.ok(e.preview);for(const f of e.frames||[])assert.ok(fs.existsSync(new URL('../../dist-full/'+catalog.build+'/'+f.src,import.meta.url))||fs.existsSync(new URL('../../dist/'+catalog.build+'/'+f.src,import.meta.url)))}
 const e=catalog.effects.find(e=>e.id==='frames_gale_cast');assert.ok(Math.abs(e.frames[0].w-253*.7407)<1e-8);assert.equal(e.frames[0].duration,.1);assert.equal(e.frames[0].ax,100.5/253);assert.equal(skillFrame(e,0),e.frames[0]);assert.equal(skillFrame(e,.1),e.frames[1]);assert.equal(skillFrame(e,99),e.frames.at(-1));
});
test('timeline validation rejects reserved IDs, missing effects, bad source URLs, timing overflow and non-finite transforms',()=>{
 const p=project();validateSkillProject(p);assert.deepEqual(validateSkillProject({format:'darkin-skill-pack-v1',project:p}),p);
 for(const bad of [{at:2},{duration:0},{scale:0},{x:NaN},{layer:'shader'},{effectId:'missing'},{follow:'yes'}]){const q=structuredClone(p);Object.assign(q.skills.fire.events[0],bad);assert.throws(()=>validateSkillProject(q))}
 const q=structuredClone(p);q.skills.fire.events.push({...q.skills.fire.events[0]});assert.throws(()=>validateSkillProject(q));assert.throws(()=>validateSkillProject({...p,id:'__proto__'}));
 for(const src of ['../secret.png','https://evil.invalid/fx.png','javascript:alert(1)']){const q=createSkillProject();q.effects.fx={id:'fx',name:'bad',group:'image',frames:[{src,w:10,h:10,ax:.5,ay:1,duration:.1}]};assert.throws(()=>validateSkillProject(q))}
});
test('visual player reserves cooldown by ID, rejects passive/unknown cast, emits one hit marker and leaves design/currency unchanged',()=>{
 const p=project(),before=JSON.stringify(p),events=[],fx=new SkillPlayer(p,{onEvent:e=>events.push(e)}),caster={x:20,y:40};assert.ok(fx.cast('fire',{caster,target:{x:200,y:70}}));assert.equal(fx.cast('fire',{caster}),null);fx.update(.3);assert.equal(events.filter(e=>e.type==='hit-marker').length,0);fx.update(.2);fx.update(.2);assert.equal(events.filter(e=>e.type==='hit-marker').length,1);assert.equal(events[0].animation,'attack');fx.update(1);assert.equal(fx.instances.length,0);assert.ok(fx.cast('fire',{caster}));assert.equal(JSON.stringify(p),before);assert.equal(p.wallet,undefined);assert.equal(caster.hp,undefined);assert.throws(()=>fx.cast('constructor'));assert.throws(()=>fx.cast('missing'));assert.throws(()=>fx.update(-1));
 p.skills.fire.kind='passive';assert.equal(new SkillPlayer(p).cast('fire',{caster}),null);
});
test('caster snapshot, following source, ground coordinate and projectile anchors remain separate',()=>{
 const e=project().skills.fire.events[0],i={caster:{x:10,y:20},casterRef:{x:80,y:90},target:{x:210,y:120}};assert.deepEqual(skillEventPosition(e,i),{x:20,y:0});assert.deepEqual(skillEventPosition({...e,follow:true},i),{x:90,y:70});assert.deepEqual(skillEventPosition({...e,anchor:'target'},i),{x:220,y:100});assert.deepEqual(skillEventPosition({...e,anchor:'world'},i),{x:10,y:-20});assert.deepEqual(skillEventPosition({...e,motion:'projectile'},i,.5),{x:120,y:50});
});
test('map effect hooks bracket props/entities and lighting without changing terrain or legacy draw behavior',()=>{
 const p=createMap({cols:4,rows:4}),r=new MapRenderer(p),calls=[],ctx=new Proxy({globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{}});r.overview=()=>({});r.atmosphere=()=>calls.push('lighting');r.draw(ctx,{width:200,height:200,zoom:.06,actor:{x:50,y:50},drawActor:()=>calls.push('actor'),beforeEntities:()=>calls.push('low'),afterEntities:()=>calls.push('high'),afterLighting:()=>calls.push('glow')});assert.deepEqual(calls,['low','actor','high','lighting','glow']);
});
