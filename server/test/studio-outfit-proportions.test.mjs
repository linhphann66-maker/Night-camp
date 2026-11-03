import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fitOutfitPart} from '../../dist/studio/outfit-fit.mjs';
import {measureOutfitPixels,detectOutfitFace} from '../../dist/studio/outfit-measure.mjs';
import {validate,gameExport} from '../../dist/studio/model.mjs';
import {ensureMiddleJoints} from '../../dist/studio/rig-edit.mjs';
const catalog=JSON.parse(readFileSync(new URL('../../dist/studio/catalog.json',import.meta.url)));
const names=['head','torso','armF','armB','legF','legB'];
const ref=p=>structuredClone(catalog.sprites['rig_talon_'+p]);
const m=(width,height,bounds={x:0,y:0,w:width,h:height},face=null)=>({width,height,bounds,face});
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const image={src:'data:image/png;base64,AQ=='};
test('template mode fixes width AND height, not only chain length, for all six parts',()=>{
 for(const part of names){
  const r=ref(part),src=m(600,900,{x:60,y:80,w:360,h:700}),rm=m(r.w*3,r.h*3);
  const s=fitOutfitPart(image,part,r,src,rm,{mode:'template'});
  close(s.w*360/600,r.w);close(s.h*700/900,r.h);
  for(const [id,p] of Object.entries(r.joints)){
   close(s.joints[id][0]-60/600*s.w,p[0]);close(s.joints[id][1]-80/900*s.h,p[1]);
  }
 }
});
test('new mode keeps canonical rest angles, joint vectors and animation lengths for every original rig',()=>{
 for(const rig of catalog.rigs){
  const originals=Object.fromEntries(names.map(p=>[p,structuredClone(catalog.sprites[`rig_${rig}_${p}`])]));ensureMiddleJoints(originals);
  for(const part of names){
   const r=originals[part],s=fitOutfitPart(image,part,r,m(240,480,{x:8,y:20,w:190,h:430}),m(r.w*3,r.h*3),{mode:'template'}),root=part==='head'?'neck':part==='torso'?'pelvis':part.startsWith('arm')?'shoulder':'hip';
   for(const [id,p] of Object.entries(r.joints))for(let i=0;i<2;i++)close(s.joints[id][i]-s.joints[root][i],p[i]-r.joints[root][i]);
  }
 }
});
test('long-haired head uses face to locate neck, retains original scalp-to-neck height and head socket offsets',()=>{
 // Geometry from a separated portrait with hair extending BELOW the chin.
 const r=ref('head'),source=m(404,376,{x:2,y:2,w:400,h:372},{bounds:{x:106,y:122,w:264,h:136},confidence:.75});
 const target=m(117,95,{x:0,y:0,w:117,h:95},{bounds:{x:25,y:57,w:69,h:36},confidence:.75});
 const legacy=fitOutfitPart(image,'head',r,source,target,{mode:'aspect'}),s=fitOutfitPart(image,'head',r,source,target,{mode:'template'});
 assert.ok(s.joints.neck[1]/s.h<.8,'neck follows chin, not hair tips');assert.ok(legacy.joints.neck[1]/legacy.h>.9);
 close(s.joints.neck[1]-2/376*s.h,r.joints.neck[1]);close(s.w*400/404,r.w);
 for(let i=0;i<2;i++)close(s.head[i]*(i===0?s.w:s.h)-s.joints.neck[i],r.head[i]*(i===0?r.w:r.h)-r.joints.neck[i]);
 close(s.head[2]*s.w,r.head[2]*r.w);
});
test('uncertain face falls back to silhouette, and all new sizes/anchors export without a new runtime',()=>{
 const parts={};for(const part of names){const r=ref(part),source=m(500,800),target=m(r.w*3,r.h*3);source.face={bounds:{x:20,y:30,w:80,h:90},confidence:.2};parts[part]=fitOutfitPart(image,part,r,source,target,{mode:'template'});close(parts[part].w,r.w);close(parts[part].h,r.h)}
 const p={format:'nightcamp-cutout-v1',rig:'elf_talon_test',parts,clip:{name:'idle',kind:'loop',dur:1,hit:0,keys:[{t:0,curve:'lin',P:{}}]}};
 validate(p);const out=gameExport(p);assert.equal(out.images.length,6);assert.deepEqual(validate(JSON.parse(JSON.stringify(p))),p);assert.match(out.code,/elf_talon_test_head/);
});
test('face estimator abstains on blue/empty/flat gold images instead of hallucinating a neck',()=>{
 const w=100,h=100;
 for(const rgba of [[50,110,220,255],[0,0,0,0],[220,170,100,255]]){
  const data=new Uint8ClampedArray(w*h*4);for(let i=0;i<w*h;i++)data.set(rgba,i*4);
  if(rgba[3])assert.equal(measureOutfitPixels(data,w,h,{head:true}).face,null);
  else assert.throws(()=>measureOutfitPixels(data,w,h,{head:true}));
 }
});
test('face estimator finds a conservative lower face and does not use the long grey hair as its chin',()=>{
 const w=160,h=160,data=new Uint8ClampedArray(w*h*4);
 const fill=(x,y,ww,hh,rgba)=>{for(let yy=y;yy<y+hh;yy++)for(let xx=x;xx<x+ww;xx++)data.set(rgba,(yy*w+xx)*4)};
 fill(10,4,138,152,[185,185,190,255]);fill(70,60,65,67,[180,125,85,255]);fill(82,81,9,7,[25,20,20,255]);fill(113,81,9,7,[25,20,20,255]);
 const face=detectOutfitFace(data,w,h);assert.ok(face);assert.ok(face.confidence>=.7);assert.ok(face.bounds.y+face.bounds.h<145);
});
test('same-image fitting is an identity, including measured face and neck padding',()=>{
 const r=ref('head'),measure=m(117,95,{x:0,y:0,w:117,h:95},{bounds:{x:25,y:57,w:69,h:36},confidence:.75});
 const s=fitOutfitPart(image,'head',r,measure,measure,{mode:'template'});
 close(s.w,r.w);close(s.h,r.h);close(s.joints.neck[0],r.joints.neck[0]);close(s.joints.neck[1],r.joints.neck[1]);
 assert.deepEqual(s.head,r.head);
});
