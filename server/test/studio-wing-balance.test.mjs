import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createWingCatalog,prepareWingProject,balanceWingSizes,DEFAULT_WING_VIEW} from '../../dist/studio/wings.mjs';
import {wingProjection,resolvedWingView,validatePet} from '../../dist/studio/pets/runtime.mjs';
import {wingIdlePose} from '../../dist/studio/wing-preview.mjs';
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url)));
const wings=createWingCatalog(catalog).rigs,close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('far wing is exactly 96% of the near linear view plane at every supported yaw, not cos(yaw) smaller again',()=>{
 for(const yaw of [10,30,55,70,80])for(const source of ['left','right']){const p={wingView:{...DEFAULT_WING_VIEW,yaw}},n=wingProjection(p,{wingSide:'near',wingSource:source}),f=wingProjection(p,{wingSide:'far',wingSource:source});for(const i of [0,1,2,3])close(f[i],n[i]*.96)}
});
test('only the exact old stock view is repaired; v2 and custom values survive without resizing artwork or changing clips',()=>{
 const old={mode:'three-quarter',yaw:55,farScale:.72,sweep:.15},before=JSON.stringify(old);assert.equal(resolvedWingView(old).farScale,.96);assert.equal(JSON.stringify(old),before);
 assert.equal(resolvedWingView({...old,version:2}).farScale,.72);assert.equal(resolvedWingView({...old,yaw:40}).farScale,.72);assert.equal(resolvedWingView({...old,farScale:.8}).farScale,.8);
 const p=structuredClone(wings.falcon_wings);p.wingView=old;const migrated=prepareWingProject(p);assert.deepEqual(migrated.sprites,p.sprites);assert.deepEqual(migrated.bones,p.bones);assert.deepEqual(migrated.clip,p.clip);assert.equal(migrated.wingView.farScale,.96);assert.deepEqual(prepareWingProject(migrated),migrated);
 const bad=structuredClone(migrated);bad.wingView.version=3;assert.throws(()=>validatePet(bad));assert.throws(()=>prepareWingProject(bad));
});
test('explicit balance compensates smaller far artwork by changing only the far branch root scale and is repeatable',()=>{
 const p=structuredClone(wings.paired_wings);p.sprites={near:{src:'data:image/png;base64,aGVsbG8=',w:140,h:80},far:{src:'data:image/png;base64,aGVsbG8=',w:70,h:40}};p.spriteOrder=['near','far'];p.bones[1].sprite='near';p.bones[3].sprite='far';const before=JSON.stringify(p),result=balanceWingSizes(p),q=result.project;
 assert.equal(result.resized,true);close(q.bones[3].scale,2);assert.equal(q.bones[1].scale,p.bones[1].scale);assert.deepEqual(q.sprites,p.sprites);assert.deepEqual(q.clip,p.clip);assert.deepEqual(q.clips,p.clips);assert.deepEqual(q.bones.map(b=>b.at),p.bones.map(b=>b.at));assert.deepEqual(balanceWingSizes(q).project,q);assert.equal(JSON.stringify(p),before);
});
test('pair-image balance keeps every asset and bone dimension; missing or ambiguous branches fail atomically',()=>{
 const p=structuredClone(wings.falcon_wings),q=balanceWingSizes(p).project;assert.deepEqual(q.sprites,p.sprites);assert.deepEqual(q.bones,p.bones);assert.equal(q.wingView.farScale,.96);const empty=JSON.stringify(wings.custom_wings);assert.throws(()=>balanceWingSizes(wings.custom_wings));assert.equal(JSON.stringify(wings.custom_wings),empty);
});
test('preview neutral idle has no inherited attack/aim/stride and uses the current outfit rest arm angles',()=>{
 const NC={SPR:{},ITEMS:{top:{rig:'traveler'},weapon:{restAng:1.2,stance:-.7,grip:.12,wtype:'sword'}},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t};for(const [name,s]of Object.entries(catalog.sprites))NC.SPR[name]={...structuredClone(s),name,img:{}};
 const c=vm.createContext({window:{NC},NC,structuredClone,document:{createElement:()=>({getContext:()=>({})})}});for(const file of ['anim.js','avatar.js'])vm.runInContext(fs.readFileSync(new URL('../../dist/studio/runtime/'+file,import.meta.url),'utf8'),c);
 const equip={top:'top',weapon:'weapon'},context=NC.animCtx(equip,{}),P=wingIdlePose(NC,equip);for(const key of ['x','y','rot','lean','head','headY','legF','legB','kF','kB','hk','bk','ik','plant','turn'])assert.equal(P[key],0,key);assert.equal(P.aF,context.rF);assert.equal(P.aB,context.rB);assert.equal(P.face,1);assert.equal(P.wHide,1);
 NC.GRIPFIX=false;const joints=NC.rigJoints(equip,P,0,0,1);assert.ok(joints.haN[1]>joints.shN[1]+10);assert.ok(joints.haF[1]>joints.shF[1]+10);assert.ok(joints.ftN[1]>joints.hipN[1]+20);assert.ok(joints.ftF[1]>joints.hipF[1]+20);assert.ok(Math.abs(joints.ftN[1]-joints.ftF[1])<10);
});
