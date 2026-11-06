import test from 'node:test';
import assert from 'node:assert/strict';
import {createMap,validateMap,alphaGeometry,packOcclusionMask,unpackOcclusionMask,assetGeometry,imageGeometry,objectOccludesActor,objectGroundPoint,objectWorld,LightingTransition,nightness,MapRenderer,DarkinMapPlayer} from '../../dist/studio/maps/runtime.mjs';
function fixture(){const p=createMap(),rgba=new Uint8ClampedArray(100*100*4);for(let y=45;y<75;y++)for(let x=20;x<80;x++)rgba[(y*100+x)*4+3]=255;for(let y=75;y<95;y++)for(let x=45;x<55;x++)rgba[(y*100+x)*4+3]=255;for(let y=50;y<65;y++)for(let x=25;x<40;x++)rgba[(y*100+x)*4+3]=0;const g=alphaGeometry(rgba,100,100);p.assets.tree={src:'data:image/png;base64,aA==',w:100,h:100,ax:.5,ay:1,kind:'custom',user:true,fadeBehind:true,grounding:'anchor',occlusionMask:packOcclusionMask(g)};p.objects=[{id:'tree',asset:'tree',x:200,y:200,rotation:0,scale:1,flip:false,layer:'sorted',collider:null,walk:null}];return {p,g,o:p.objects[0]}}
test('portable alpha survives whole-map roundtrip and keeps padding/holes opaque-test identical without any image access',()=>{
 const {p,g,o}=fixture(),q=JSON.parse(JSON.stringify(p)),mask=q.assets.tree.occlusionMask,decoded=unpackOcclusionMask(mask);validateMap(q);assert.equal(assetGeometry(q.assets.tree,null),decoded);assert.deepEqual(decoded.foot,g.foot);assert.deepEqual(decoded.bounds,g.bounds);
 for(let y=100;y<200;y+=3)for(let x=150;x<250;x+=3){const a={x,y,radius:4,occlusionHeight:20};assert.equal(objectOccludesActor(q,o,a),objectOccludesActor(p,o,a,g))}
 assert.equal(objectOccludesActor(q,o,{x:200,y:135,occlusionHeight:20}),false);assert.equal(objectOccludesActor(q,o,{x:200,y:170,occlusionHeight:20}),true);assert.equal(objectOccludesActor(q,o,{x:180,y:170,occlusionHeight:20,radius:0}),false);
 q.assets.tree.grounding='image';assert.deepEqual(objectGroundPoint(q,o),{x:200,y:195});
});
test('unreadable legacy custom image never fades because of its transparent rectangle; native rectangle fallback stays compatible',()=>{
 const {p,o}=fixture();delete p.assets.tree.occlusionMask;assert.equal(objectOccludesActor(p,o,{x:200,y:130}),false);delete p.assets.tree.user;p.assets.tree.kind='tree';assert.equal(objectOccludesActor(p,o,{x:200,y:130}),true);
});
test('mask lookup works through object-local rotation, reflection and scale and only covers actual art',()=>{
 const {p,o}=fixture();o.flip=true;o.rotation=.3;o.scale=1.7;for(const point of [[0,-42],[-30,-45],[0,-80]]){const [x,y]=objectWorld(o,...point),actor={x,y,occlusionHeight:1e-6,radius:0};assert.equal(objectOccludesActor(p,o,actor),objectOccludesActor(p,o,actor,unpackOcclusionMask(p.assets.tree.occlusionMask)))}
 for(const change of [{width:1000},{bits:'AAAA'},{bounds:{x0:1,x1:0,y0:0,y1:1}},{foot:{x:NaN,y:1}}])assert.throws(()=>validateMap({...p,assets:{tree:{...p.assets.tree,occlusionMask:{...p.assets.tree.occlusionMask,...change}}}}));
});
test('an image observed before onload is retried, not permanently cached as a rectangle; CORS errors are not retried every frame',()=>{
 const old=globalThis.document;let reads=0,throws=false;const rgba=new Uint8ClampedArray(8*8*4).fill(255);globalThis.document={createElement:()=>({getContext:()=>({drawImage(){},getImageData(){reads++;if(throws)throw Error('SecurityError');return {data:rgba}}})})};
 try{const image={complete:false,naturalWidth:8,naturalHeight:8,src:'first.png'};assert.equal(imageGeometry(image),null);assert.equal(reads,0);image.complete=true;assert.ok(imageGeometry(image));assert.equal(reads,1);assert.ok(imageGeometry(image));assert.equal(reads,1);image.src='cross-origin.png';throws=true;assert.equal(imageGeometry(image),null);assert.equal(imageGeometry(image),null);assert.equal(reads,2);image.src='fixed.png';throws=false;assert.ok(imageGeometry(image));assert.equal(reads,3)}finally{if(old===undefined)delete globalThis.document;else globalThis.document=old}
});
test('coarse clock updates blend monotonically at render rate without altering the authoritative clock/map or causing midnight jumps',()=>{
 const p=createMap();p.lighting={mode:'time',hour:5.5};const s=new LightingTransition();assert.equal(s.sample(p).n,.75);p.lighting.hour=6;let last=.75;for(let i=0;i<90;i++){const v=s.sample(p,1/60);assert.ok(v.n<=last&&v.n>=.5);assert.ok(last-v.n<.03);assert.ok(v.rgb.every(Number.isFinite));last=v.n}assert.ok(Math.abs(last-.5)<.0001);assert.equal(p.lighting.hour,6);
 p.lighting.hour=23.99999;validateMap(p);s.reset();assert.equal(s.sample(p).n,1);p.lighting.hour=0;assert.equal(s.sample(p,1/60).n,1);p.lighting.mode='day';assert.equal(s.sample(p,1/60).n,0);p.lighting.mode='night';assert.equal(s.sample(p,1/60).n,1);assert.ok(s.sample(p,NaN).rgb.every(Number.isFinite));
});
test('game-owned actor feet are honored by player draw, rather than overwritten by an unrelated spawn actor',()=>{
 const p=createMap(),player=new DarkinMapPlayer(p,new Map()),actor={x:900,y:700,occlusionHeight:65,radius:10},calls=[];player.renderer.draw=(ctx,opts)=>calls.push(opts);player.draw({},393,700,{actor,dt:1/60});assert.equal(calls[0].actor,actor);assert.equal(calls[0].x,900-393/2);assert.equal(player.actor.x,p.spawn.x);player.draw({},393,700,{actor:null});assert.equal(calls[1].actor,null);player.draw({},393,700);assert.equal(calls[2].actor,player.actor);player.setTimeOfDay(24);assert.equal(player.project.lighting.hour,0);assert.throws(()=>player.setTimeOfDay(NaN));
});
