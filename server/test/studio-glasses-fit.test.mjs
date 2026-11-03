import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {makeAttachment,validateAttachments} from '../../dist/studio/attachments.mjs';
import {headEyeCenters,headEarContact,glassesTemplePoint,fitLibraryGlasses} from '../../dist/studio/glasses-fit.mjs';
import {gameExport,validate} from '../../dist/studio/model.mjs';
const entries=JSON.parse(fs.readFileSync(new URL('../../dist/studio/accessories.json',import.meta.url))),glasses=entries.filter(e=>e.category==='glasses');
const catalog=JSON.parse(fs.readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url)));
const head=catalog.sprites.rig_talon_head,round=glasses.find(e=>e.id==='glasses_round');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function nativeCorners(e,H){
 const NC={ASSET_MANIFEST:{},SPR:{[e.id]:{...structuredClone(e.sprite),img:{}}},ITEMS:{pair:{sprite:e.id,fit:e.fit,dx:e.dx,dy:e.dy}}};
 vm.runInNewContext(fs.readFileSync(new URL('../../dist-full/game-20261025-1758/js/glasses.js',import.meta.url),'utf8'),{NC,window:{NC},localStorage:{getItem:()=>null}});
 let m=[1,0,0,1,0,0],out;
 const mul=b=>{const [a,c,d,f,x,y]=m;m=[a*b[0]+d*b[1],c*b[0]+f*b[1],a*b[2]+d*b[3],c*b[2]+f*b[3],a*b[4]+d*b[5]+x,c*b[4]+f*b[5]+y]};
 const ctx={save(){},restore(){},translate(x,y){mul([1,0,0,1,x,y])},rotate(t){mul([Math.cos(t),Math.sin(t),-Math.sin(t),Math.cos(t),0,0])},scale(x,y){mul([x,0,0,y,0,0])},drawImage(img,x,y,w,h){out=[[x,y],[x+w,y],[x,y+h],[x+w,y+h]].map(([xx,yy])=>[m[0]*xx+m[2]*yy+m[4],m[1]*xx+m[3]*yy+m[5]])}};
 NC.drawGlasses(ctx,H,{glasses:'pair'},{});return out;
}
test('eye-only baseline for all 28 glasses on all 49 original heads matches the ORIGINAL game renderer',()=>{
 assert.equal(glasses.length,28);
 for(const rig of catalog.rigs)for(const e of glasses){
  const H=catalog.sprites[`rig_${rig}_head`],eyes=headEyeCenters(H),a=fitLibraryGlasses(makeAttachment(e),e,H,eyes,{mode:'eyes'}),c=Math.cos(a.rotation),s=Math.sin(a.rotation),expected=nativeCorners(e,H);
  for(const [i,[u,v]]of [[0,0],[1,0],[0,1],[1,1]].entries()){
   const x=(u-a.anchor[0])*a.w,y=(v-a.anchor[1])*a.h;
   close((eyes[0][0]+eyes[1][0])/2+a.x+c*x-s*y,expected[i][0]);close((eyes[0][1]+eyes[1][1])/2+a.y+s*x+c*y,expected[i][1]);
  }
  validateAttachments([a]);
 }
});
test('native eye-only mode remains available without changing the original renderer transform',()=>{
 const old=makeAttachment(round,head.w*head.head[2]),a=fitLibraryGlasses(old,round,head,undefined,{mode:'eyes'}),eyes=headEyeCenters(head);
 assert.ok(a.w<old.w*.7);assert.ok(a.w>35&&a.w<42);close(a.h/a.w,round.sprite.h/round.sprite.w);
 round.sprite.lens.forEach(([u,v],i)=>{const x=(u-a.anchor[0])*a.w,y=(v-a.anchor[1])*a.h,c=Math.cos(a.rotation),s=Math.sin(a.rotation);close((eyes[0][0]+eyes[1][0])/2+a.x+c*x-s*y,eyes[i][0]);close((eyes[0][1]+eyes[1][1])/2+a.y+s*x+c*y,eyes[i][1])});
});
test('repair is repeatable, pixel-resolution independent, preserves identity/visibility/layer/source and never mutates input',()=>{
 const old={...makeAttachment(round),visible:false,layer:'back',scale:1.7,rotation:.5,x:15,y:-3},before=structuredClone(old),a=fitLibraryGlasses(old,round,head);
 assert.deepEqual(old,before);for(const key of ['id','name','sourceId','visible','layer','src'])assert.deepEqual(a[key],before[key]);assert.deepEqual(fitLibraryGlasses(a,round,head),a);
 const big={...round,sprite:{...round.sprite,w:round.sprite.w*5,h:round.sprite.h*5}},large=fitLibraryGlasses(old,big,head);close(large.w,a.w);close(large.h,a.h);close(large.rotation,a.rotation);assert.deepEqual(large.anchor,a.anchor);
});
test('explicit virtual lens pivots outside the image are clamped with correct position compensation',()=>{
 const e={...round,sprite:{...round.sprite,lens:[[-1,.4],[.1,.35]]}},a=fitLibraryGlasses(makeAttachment(e),e,head,undefined,{mode:'eyes'});validateAttachments([a]);assert.equal(a.anchor[0],0);
 const expected=nativeCorners(e,head),eyes=headEyeCenters(head),x=-a.anchor[0]*a.w,y=-a.anchor[1]*a.h,c=Math.cos(a.rotation),s=Math.sin(a.rotation);
 close((eyes[0][0]+eyes[1][0])/2+a.x+c*x-s*y,expected[0][0]);close((eyes[0][1]+eyes[1][1])/2+a.y+s*x+c*y,expected[0][1]);
});
test('default round fit reaches the ear exactly, stays between oversized and undersized fits and still covers both eyes',()=>{
 for(const rig of catalog.rigs){
  const h=catalog.sprites[`rig_${rig}_head`],old=makeAttachment(round,h.w*h.head[2]),a=fitLibraryGlasses(old,round,h),small=fitLibraryGlasses(old,round,h,undefined,{mode:'eyes'}),eye=headEyeCenters(h),ear=headEarContact(h),hook=glassesTemplePoint(round),c=Math.cos(a.rotation),s=Math.sin(a.rotation);
  const world=([u,v])=>{const x=(u-a.anchor[0])*a.w,y=(v-a.anchor[1])*a.h;return [(eye[0][0]+eye[1][0])/2+a.x+c*x-s*y,(eye[0][1]+eye[1][1])/2+a.y+s*x+c*y]};
  assert.ok(a.w>small.w*1.1);assert.ok(a.w<old.w*.85);close(a.h/a.w,round.sprite.h/round.sprite.w);
  world(hook).forEach((v,i)=>close(v,ear[i]));
  round.sprite.lens.forEach((point,i)=>{const lens=world(point);assert.ok(Math.hypot(lens[0]-eye[i][0],lens[1]-eye[i][1])<3,'lens covers the iris while the hook contacts the ear')});
 }
});
test('authored source temple and target ear markers take precedence over standard head calibration',()=>{
 const h=structuredClone(head);h.joints.earNear=[17,50];const e={...round,sprite:{...round.sprite,temple:[.04,.5]}},a=fitLibraryGlasses(makeAttachment(e),e,h);assert.deepEqual(headEarContact(h),[17,50]);assert.deepEqual(glassesTemplePoint(e),[.04,.5]);validateAttachments([a]);
 assert.throws(()=>fitLibraryGlasses(makeAttachment(round),{...round,sprite:{...round.sprite,temple:[NaN,0]}},head));
});
test('missing/degenerate landmarks and non-glasses fail without changing the old attachment',()=>{
 const a=makeAttachment(round),before=structuredClone(a);
 for(const entry of [{...round,sprite:{...round.sprite,lens:null}},{...round,sprite:{...round.sprite,lens:[[.5,.5],[.5,.5]]}},{...round,category:'hat'},{...round,id:'another'}])assert.throws(()=>fitLibraryGlasses(a,entry,head));
 assert.throws(()=>fitLibraryGlasses(a,round,head,[[0,0],[0,0]]));assert.deepEqual(a,before);
});
test('precise baked geometry survives project/bundle export without changing hats or animation and without runtime migrations',()=>{
 const parts=Object.fromEntries(['head','torso','armF','armB','legF','legB'].map(p=>[p,structuredClone(catalog.sprites['rig_talon_'+p])]));
 const hat=makeAttachment(entries.find(e=>e.id==='hat_paladin')),g=fitLibraryGlasses(makeAttachment(round),round,head),p={format:'nightcamp-cutout-v1',rig:'talon',parts,attachments:[hat,g],clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]}};
 const before=structuredClone(p);validate(p);const out=gameExport(p);assert.deepEqual(p,before);for(const [index,a]of [hat,g].entries())for(const key of Object.keys(a))assert.deepEqual(out.attachments[index][key],a[key]);assert.deepEqual(validate(JSON.parse(JSON.stringify(p))),p);
});
