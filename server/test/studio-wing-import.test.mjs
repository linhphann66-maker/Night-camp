import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createWingCatalog,prepareWingProject} from '../../dist/studio/wings.mjs';
import {validatePet,boneMatrices,wingProjection,point,poseBounds,spritePlanes,drawPet} from '../../dist/studio/pets/runtime.mjs';
import {movePetBone,setPetPivot} from '../../dist/studio/pets/rig-authoring.mjs';
import {petHandles,beginPetDrag,dragPetBone} from '../../dist/studio/pets/rig-controls.mjs';
import {applyWingResources,wingResources,wingAssignments,NEW_NEAR,NEW_FAR,VARIANTS} from '../../dist/studio/wing-resources.mjs';
const wings=createWingCatalog(JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url)))).rigs;
const pieces=()=>[0,1,2,3].map((i)=>({id:'piece_'+i,name:'Mảnh '+i,src:'data:image/png;base64,aGVsbG8=',w:140-i*10,h:90-i*5,part:NEW_NEAR}));
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
test('three-quarter projection sweeps both canonical sides behind the hero and foreshortens the far wing',()=>{
 const p=wings.paired_wings,n=wingProjection(p,p.bones.find(b=>b.id==='wingLeft')),f=wingProjection(p,p.bones.find(b=>b.id==='wingRight'));
 assert.ok(point(n,-100,0)[0]<0);assert.ok(point(f,100,0)[0]<0);assert.ok(Math.abs(f[0])<Math.abs(n[0]));assert.ok(f[3]<n[3]);
 const front=structuredClone(p);front.wingView.mode='front';assert.deepEqual(wingProjection(front,front.bones[1]),[1,0,0,1,0,0]);
 assert.deepEqual(wingProjection(p,{wingSide:'center'}),[1,0,0,1,0,0]);
});
test('already side-painted wing images keep their direction; pair images split around their own variant pivots',()=>{
 const p=wings.falcon_wings,b=p.bones[1],s=p.sprites[p.spriteOrder[2]],pivot=b.variantPivots[p.spriteOrder[2]],planes=spritePlanes(p,b,s,pivot);
 assert.equal(planes.length,2);assert.equal(planes[0].rect[0],0);close(planes[0].rect[2]+planes[1].rect[2],s.w);
 assert.ok(point(wingProjection(p,{wingSide:'far',wingSource:'left'}),-100,0)[0]<0);
 const bounds=poseBounds(p,{'wing:img':2});assert.ok(bounds.x1<10);assert.ok(bounds.x0< -50);
 const drawn=[],ctx=new Proxy({drawImage:img=>drawn.push(img),globalAlpha:1},{get:(o,k)=>k in o?o[k]:()=>{}});drawPet(ctx,p,{'wing:img':2},Object.fromEntries(p.spriteOrder.map(id=>[id,id])),[1,0,0,1,0,0]);assert.equal(drawn.length,2);
});
test('perspective-aware rotation drag keeps all rig attachments and offsets intact, including mirrored preview',()=>{
 const p=structuredClone(wings.paired_wings);p.sprites.art={src:pieces()[0].src,w:90,h:60};p.spriteOrder=['art'];p.bones[1].sprite='art';
 for(const face of [1,-1]){const base=[face*3,0,0,3,300,200],P={},h=petHandles(p,P,base).find(h=>h.id==='wingLeft'&&h.kind==='tip'),drag=beginPetDrag(p,P,h,h.xy,base),result=dragPetBone(drag,[h.xy[0]+10,h.xy[1]+25]);
 assert.notEqual(result['wingLeft:rot'],0);for(const b of p.bones)for(const field of ['dx','dy'])assert.equal(result[b.id+':'+field],undefined);
 const before=boneMatrices(p,P,base),after=boneMatrices(p,result,base);close(before.wingLeft[4],after.wingLeft[4]);close(before.wingLeft[5],after.wingLeft[5]);}
});
test('moving a projected wing joint reaches the requested screen-space position, not the unprojected plane',()=>{
 const p=wings.paired_wings,target=[-45,-12],next=movePetBone(p,'wingRight',target),m=boneMatrices(next,{}).wingRight;close(m[4],target[0]);close(m[5],target[1]);
});
test('wing resources store once and retain labels, bone assignments and proportional sizes through roundtrip',()=>{
 const p=wings.custom_wings,rs=pieces(),saved=applyWingResources(p,rs,[],[],{selectedBone:'root'});assert.equal(saved.bones.length,1);assert.equal(wingResources(saved).length,4);assert.equal(saved.sprites.piece_3.w/saved.sprites.piece_0.w,110/140);
 const next=applyWingResources(saved,[],[rs[0]],[],{selectedBone:'root'}),r=wingResources(next)[0];assert.equal(r.name,rs[0].name);assert.ok(next.bones.some(b=>b.id===r.part&&b.sprite===r.id));assert.equal(next.spriteOrder.length,4);validatePet(JSON.parse(JSON.stringify(next)));
});
test('batch assignment creates near/far bones or binds existing bones without resetting the existing animation',()=>{
 const rs=pieces();rs[1].part=NEW_FAR;rs[2].part='wingLeft';rs[3].part='wingRight';
 const p=wings.paired_wings,before=JSON.stringify(p.clip),next=applyWingResources(p,rs,wingAssignments(rs,p),[],{selectedBone:'root'});
 assert.equal(next.bones.length,7);assert.equal(JSON.stringify(next.clip),before);assert.equal(next.bones.find(b=>b.id==='wingRight').sprite,'piece_3');assert.equal(next.bones.find(b=>b.sprite==='piece_1').wingSide,'far');
 assert.equal(JSON.stringify(p.clip),before);assert.equal(p.spriteOrder.length,0);
});
test('four poses from a sprite sheet become four discrete animation frames, not four wings drawn simultaneously',()=>{
 const p=wings.custom_wings,rs=pieces().map(r=>({...r,part:VARIANTS})),next=applyWingResources(p,rs,wingAssignments(rs,p),[],{selectedBone:'root',step:.15});
 assert.equal(next.bones.length,1);assert.equal(next.clip.keys.length,5);assert.equal(next.clip.keys[2].P['root:img'],2);assert.equal(next.clip.keys[4].P['root:img'],0);assert.equal(next.clip.keys[1].curve,'step');assert.equal(next.bones[0].wingSide,'near');assert.deepEqual(next.clip.keys.map(k=>k.t),[0,.15,.3,.45,.6]);
 assert.ok(next.clips.idle);assert.equal(p.spriteOrder.length,0);assert.equal(next.spriteOrder.length,4);
});
test('resource conflicts, mixed parts and variants, duration overflow and capacity limits fail atomically',()=>{
 const p=wings.custom_wings,before=JSON.stringify(p),rs=pieces();rs[0].part=VARIANTS;assert.throws(()=>wingAssignments(rs,p));assert.throws(()=>wingAssignments([{...rs[1],part:'root'},{...rs[2],part:'root'}],p));
 assert.throws(()=>applyWingResources(p,rs.map(r=>({...r,part:VARIANTS})),rs.map(r=>({...r,part:VARIANTS})),[],{selectedBone:'root',step:9}));assert.equal(JSON.stringify(p),before);
});
test('legacy wing migration adds a reversible view but does not rewrite any original joint or pose value',()=>{
 const p=structuredClone(wings.falcon_wings);delete p.wingView;for(const b of p.bones)delete b.wingSide;const before=JSON.stringify(p),m=prepareWingProject(p);assert.equal(m.wingView.mode,'three-quarter');assert.equal(m.bones[1].wingSide,'pair');assert.deepEqual(m.clip,p.clip);assert.deepEqual(m.bones.map(b=>b.at),p.bones.map(b=>b.at));assert.equal(JSON.stringify(p),before);
 const bad=structuredClone(m);bad.wingView.farScale=0;assert.throws(()=>validatePet(bad));bad.wingView.farScale=.7;bad.wingView.yaw=NaN;assert.throws(()=>validatePet(bad));
});
