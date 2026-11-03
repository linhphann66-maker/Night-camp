import {test} from 'node:test';
import assert from 'node:assert/strict';
import {alphaGeometry,createMap,validateMap,objectWorld,objectGroundPoint,objectOccludesActor,reanchorAsset,pointWalkable} from '../../dist/studio/maps/runtime.mjs';
function pixels(){const d=new Uint8ClampedArray(100*100*4);for(let y=10;y<80;y++)for(let x=y<40?10:45;x<(y<40?90:55);x++)d[(y*100+x)*4+3]=255;return d}
function scene(){const p=createMap();p.assets.tree={src:'data:image/png;base64,aA==',w:100,h:100,ax:.5,ay:1,kind:'custom',user:true,collider:null,walk:null};p.objects=[{id:'tree',asset:'tree',x:200,y:200,scale:1,rotation:0,flip:false,layer:'sorted',collider:null,walk:null}];return p}
test('alpha bounds and root exclude transparent padding, preserve pixel data and handle empty/full images',()=>{
 const rgba=pixels(),before=rgba.slice(),g=alphaGeometry(rgba,100,100);assert.deepEqual(g.bounds,{x0:.1,y0:.1,x1:.9,y1:.8});assert.deepEqual(g.foot,{x:.5,y:.8});assert.deepEqual(rgba,before);assert.equal(alphaGeometry(new Uint8ClampedArray(400),10,10),null);assert.deepEqual(alphaGeometry(new Uint8ClampedArray(400).fill(255),10,10).foot,{x:.5,y:1});
});
test('legacy custom uploads fade only when opaque pixels cover the actor and actual ground point is in front',()=>{
 const p=scene(),o=p.objects[0],g=alphaGeometry(pixels(),100,100);assert.deepEqual(objectGroundPoint(p,o,g),{x:200,y:180});assert.equal(objectOccludesActor(p,o,{x:200,y:170},g),true);assert.equal(objectOccludesActor(p,o,{x:200,y:195},g),false);assert.equal(objectOccludesActor(p,o,{x:100,y:170},g),false);p.assets.tree.fadeBehind=false;assert.equal(objectOccludesActor(p,o,{x:200,y:170},g),false);delete p.assets.tree.fadeBehind;o.layer='ground';assert.equal(objectOccludesActor(p,o,{x:200,y:170},g),false);
});
test('alpha holes do not trigger fade and custom anchor override, flipped/rotated coordinates and builtin trees remain supported',()=>{
 const p=scene(),o=p.objects[0],rgba=pixels();for(let y=10;y<40;y++)for(let x=15;x<40;x++)rgba[(y*100+x)*4+3]=0;const g=alphaGeometry(rgba,100,100);assert.equal(objectOccludesActor(p,o,{x:175,y:145},g),false);p.assets.tree.grounding='anchor';assert.deepEqual(objectGroundPoint(p,o,g),{x:200,y:200});delete p.assets.tree.user;p.assets.tree.kind='tree';assert.equal(objectOccludesActor(p,o,{x:200,y:170}),true);o.rotation=.2;o.flip=true;o.scale=1.5;const [x,y]=objectWorld(o,0,-35);assert.equal(objectOccludesActor(p,o,{x,y},alphaGeometry(new Uint8ClampedArray(40000).fill(255),100,100)),true);
});
test('explicit reanchor preserves every image corner and world-space footprint for all copies, without resizing',()=>{
 const p=scene(),base=p.objects[0];base.collider={type:'ellipse',x:0,y:-10,w:20,h:10};p.assets.tree.collider=structuredClone(base.collider);p.objects.push({...structuredClone(base),id:'copy',x:400,y:400,rotation:.6,flip:true,scale:1.7,walk:{type:'rect',x:5,y:-5,w:40,h:12}});const before=structuredClone(p),q=reanchorAsset(p,'tree',.45,.8);
 for(let i=0;i<p.objects.length;i++){const a=p.objects[i],b=q.objects[i];for(const [u,v]of [[0,0],[.3,.7],[1,1]]){const old=objectWorld(a,(u-p.assets.tree.ax)*100,(v-p.assets.tree.ay)*100),now=objectWorld(b,(u-q.assets.tree.ax)*100,(v-q.assets.tree.ay)*100);old.forEach((n,j)=>assert.ok(Math.abs(n-now[j])<1e-8))}for(const k of ['collider','walk'])if(a[k]){const old=objectWorld(a,a[k].x,a[k].y),now=objectWorld(b,b[k].x,b[k].y);old.forEach((n,j)=>assert.ok(Math.abs(n-now[j])<1e-8))}}
 assert.equal(q.assets.tree.w,100);assert.equal(q.assets.tree.h,100);assert.equal(q.assets.tree.src,p.assets.tree.src);assert.equal(q.assets.tree.grounding,'anchor');assert.deepEqual(p,before);assert.equal(pointWalkable(p,200,190),pointWalkable(q,200,190));
});
test('unsafe edge repair fails atomically; new visual flags validate and roundtrip without migrating old positions',()=>{
 const p=scene();p.objects[0].y=0;const before=structuredClone(p);assert.throws(()=>reanchorAsset(p,'tree',.5,.8));assert.deepEqual(p,before);p.assets.tree.groundShadow=true;p.assets.tree.fadeBehind=true;p.assets.tree.grounding='image';assert.deepEqual(validateMap(JSON.parse(JSON.stringify(p))),p);for(const [key,value]of [['groundShadow','true'],['fadeBehind',1],['grounding','auto-anything']])assert.throws(()=>validateMap({...p,assets:{tree:{...p.assets.tree,[key]:value}}}));
});
