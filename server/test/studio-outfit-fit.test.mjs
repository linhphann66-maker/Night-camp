import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitOutfitPart,heightGuideLines,drawHeightGuides} from '../../dist/studio/outfit-fit.mjs';
import {validate,gameExport} from '../../dist/studio/model.mjs';
import {applyResourceChanges} from '../../dist/studio/resource-tools.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const measure=(width,height,x=0,y=0,w=width,h=height)=>({width,height,bounds:{x,y,w,h}});
const catalog=JSON.parse(readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url)));
const ref=part=>structuredClone(catalog.sprites[`rig_traveler_${part}`]);
const image={src:'data:image/png;base64,AQ=='};
test('head fits visible height without stretching, ignores transparent padding',()=>{
 const original=ref('head'),before=structuredClone(original);
 const fitted=fitOutfitPart(image,'head',original,measure(600,500,100,50,300,300),measure(200,180,10,10,180,160));
 close(fitted.h*300/500,original.h*160/180);
 close(fitted.w/fitted.h,600/500);
 assert.deepEqual(original,before);assert.equal(fitted.src,image.src);
});
test('all six parts fit from unmodified catalog, image resolution never changes final size',()=>{
 for(const part of ['head','torso','armF','armB','legF','legB']){
  const reference=ref(part),m=measure(reference.w*3,reference.h*3);
  const one=fitOutfitPart(image,part,reference,m,m);
  const two=fitOutfitPart(image,part,reference,measure(m.width*4,m.height*4),m);
  close(one.w,two.w);close(one.h,two.h);
  for(const key of Object.keys(reference.joints)){close(one.joints[key][0],reference.joints[key][0]);close(one.joints[key][1],reference.joints[key][1])}
  for(const key of Object.keys(one.joints)){close(one.joints[key][0],two.joints[key][0]);close(one.joints[key][1],two.joints[key][1])}
 }
});
test('arm and leg chains retain original lengths even for different source aspect ratios',()=>{
 for(const part of ['armF','armB','legF','legB']){
  const r=ref(part),arm=part.startsWith('arm'),[root,mid,end]=arm?['shoulder','elbow','hand']:['hip','knee','foot'];
  const s=fitOutfitPart(image,part,r,measure(480,900,40,50,400,800),measure(90,150,5,5,80,140));
  const length=Math.hypot(s.joints[mid][0]-s.joints[root][0],s.joints[mid][1]-s.joints[root][1])+Math.hypot(s.joints[end][0]-s.joints[mid][0],s.joints[end][1]-s.joints[mid][1]);
  close(length,Math.hypot(r.joints[end][0]-r.joints[root][0],r.joints[end][1]-r.joints[root][1]));
  close(s.w/s.h,480/900);assert.equal(s.overlap,arm?3:12);
 }
});
test('padding moves joint in image space but not its offset from the visible artwork',()=>{
 const r=ref('head'),rm=measure(200,180,10,10,180,160);
 const a=fitOutfitPart(image,'head',r,measure(300,300),rm);
 const b=fitOutfitPart(image,'head',r,measure(600,500,100,50,300,300),rm);
 const k=a.h/300;
 close(b.joints.neck[0]-a.joints.neck[0],100*k);close(b.joints.neck[1]-a.joints.neck[1],50*k);
 close(b.head[2]*b.w,r.head[2]*r.w);
});
test('fits survive existing project/bundle pipeline, do not mutate clips or untouched parts',()=>{
 const parts=Object.fromEntries(['head','torso','armF','armB','legF','legB'].map(p=>[p,ref(p)]));
 const p={format:'nightcamp-cutout-v1',rig:'custom',parts,clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{aF:.5}}]}};
 const snapshot=structuredClone(p),next=applyResourceChanges(p,[],{armF:image});
 next.parts.armF=fitOutfitPart(image,'armF',ref('armF'),measure(100,200),measure(100,200));
 validate(next);const out=gameExport(next);
 assert.equal(out.images.length,1);assert.deepEqual(p,snapshot);assert.deepEqual(next.clip,p.clip);assert.deepEqual(next.parts.legF,p.parts.legF);
 assert.ok(!JSON.stringify(next).includes('heightGuides'));assert.match(out.code,/custom_armF/);
});
test('invalid measurements fail safely',()=>{
 for(const m of [measure(0,100),measure(100,100,0,0,0,30),measure(100,100,80,0,80,100)])assert.throws(()=>fitOutfitPart(image,'head',ref('head'),m,measure(100,100)));
});
test('every shipped outfit can be used as a fitting reference',()=>{
 for(const rig of catalog.rigs){
  const parts={};
  for(const part of ['head','torso','armF','armB','legF','legB']){
   const r=catalog.sprites[`rig_${rig}_${part}`],m=measure(r.w*3,r.h*3);
   parts[part]=fitOutfitPart(image,part,r,m,m);
   close(parts[part].w,r.w);close(parts[part].h,r.h);
  }
  validate({format:'nightcamp-cutout-v1',rig,parts,clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]}});
 }
});
test('horizontal guides share a stable ground and rig units through zoom / viewport changes',()=>{
 const a=heightGuideLines(400,312,2),b=heightGuideLines(800,624,4);
 assert.equal(a[0].units,0);assert.equal(a[0].y,312);
 for(const line of a)close(b.find(l=>l.units===line.units).y,line.y*2);
 assert.deepEqual(heightGuideLines(0,0,1),[]);assert.deepEqual(heightGuideLines(400,312,0),[]);
 const calls=[],ctx={save(){},restore(){},beginPath(){},moveTo(){},lineTo(){},stroke(){calls.push('line')},fillText(){}};
 drawHeightGuides(ctx,600,400,312,2);assert.equal(calls.length,a.length);
});
