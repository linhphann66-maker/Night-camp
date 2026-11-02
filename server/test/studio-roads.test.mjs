import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createMap,validateMap,resizedMap,roadGeometry,nearestRoadPoint,pickRoad,pointWalkable,MapRenderer,MAP_RUNTIME_VERSION,roadTextureRGB,terrainRGB} from '../../dist/studio/maps/runtime.mjs';
const road=(id='road_1')=>({id,material:'dirt',width:100,softness:.25,smoothness:.8,points:[{x:200,y:200},{x:500,y:500},{x:850,y:260},{x:1200,y:650}]});
test('dirt/sand road repeat edges have no noise discontinuity in either axis, day/night or seed',()=>{
 for(const type of ['dirt','sand'])for(const seed of [1,7,97,2026])for(const n of [0,.5,1])for(let i=0;i<300;i+=7){
  const a=roadTextureRGB(type,i,209,seed,n),b=roadTextureRGB(type,i,210,seed,n),c=roadTextureRGB(type,299,i,seed,n),d=roadTextureRGB(type,300,i,seed,n);a.forEach((v,k)=>assert.ok(Math.abs(v-b[k])<=1,`${type} horizontal wrap ${seed} ${n}`));c.forEach((v,k)=>assert.ok(Math.abs(v-d[k])<=1,`${type} vertical wrap ${seed} ${n}`));
  assert.deepEqual(roadTextureRGB(type,i,0,seed,n),roadTextureRGB(type,i,210,seed,n));assert.deepEqual(roadTextureRGB(type,0,i,seed,n),roadTextureRGB(type,300,i,seed,n));
 }
 // Reproduce the old visible horizontal stripe, without involving a grid.
 assert.ok(Math.abs(terrainRGB('dirt',20,209,7,1)[0]-terrainRGB('dirt',20,0,7,1)[0])>1);
});
test('seamless road texture retains flagstone joints, deterministic variation and night palette',()=>{
 assert.deepEqual(roadTextureRGB('stone',0,50,7),[96,96,108]);assert.deepEqual(roadTextureRGB('stone',0,50,7,1),[41,44,58]);assert.notDeepEqual(roadTextureRGB('stone',80,50,7),[96,96,108]);assert.notDeepEqual(roadTextureRGB('dirt',25,30,7),roadTextureRGB('dirt',90,125,7));assert.deepEqual(roadTextureRGB('dirt',25,30,7),roadTextureRGB('dirt',325,240,7));
});
test('roads remain optional for old maps and roundtrip with map format unchanged',()=>{
 const p=createMap();delete p.roads;assert.equal(validateMap(p).format,'darkin-map-v1');assert.equal(pickRoad(p,10,10),null);p.roads=[road()];assert.deepEqual(validateMap(JSON.parse(JSON.stringify(p))).roads,p.roads);assert.deepEqual(resizedMap(p,40,30).roads,p.roads);assert.throws(()=>resizedMap(p,4,4));assert.equal(MAP_RUNTIME_VERSION,2);
});
test('road validation bounds IDs, materials, finite styles, point count, total budget and map coordinates',()=>{
 const p=createMap();for(const changes of [{id:'__proto__'},{material:'water'},{width:0},{width:513},{width:NaN},{softness:1},{softness:'0.2'},{smoothness:Infinity},{smoothness:-1},{points:[]},{points:[{x:1,y:1}]},{points:Array(257).fill({x:1,y:1})},{points:[{x:-1,y:0},{x:50,y:50}]},{points:[{x:0,y:0},{x:99999,y:0}]}])assert.throws(()=>validateMap({...p,roads:[{...road(),...changes}]}));assert.throws(()=>validateMap({...p,roads:[road(),road()]}));assert.throws(()=>validateMap({...p,roads:null}));assert.throws(()=>validateMap({...p,roads:Array.from({length:129},(_,i)=>road('r'+i))}));assert.throws(()=>validateMap({...p,roads:Array.from({length:17},(_,i)=>({...road('r'+i),points:Array(256).fill({x:1,y:1})}))}));
});
test('spline interpolates all control points, creates true cubic curvature and supports straight/repeated points',()=>{
 const r=road(),g=roadGeometry(r);assert.equal(g.segments.length,r.points.length-1);assert.deepEqual(g.segments[0].from,r.points[0]);assert.deepEqual(g.segments.at(-1).to,r.points.at(-1));r.points.forEach(p=>assert.ok(g.samples.some(s=>Math.hypot(s.x-p.x,s.y-p.y)<1e-8)));assert.notEqual(g.segments[0].c1.x,g.segments[0].from.x);assert.ok(g.bounds.x0<=r.points[0].x-r.width/2);r.smoothness=0;const straight=roadGeometry(r);assert.deepEqual(straight.segments[0].c1,r.points[0]);assert.deepEqual(straight.segments[0].c2,r.points[1]);r.points=[{x:4,y:4},{x:4,y:4},{x:40,y:4}];assert.ok(roadGeometry(r).samples.every(v=>Number.isFinite(v.x)&&Number.isFinite(v.y)));assert.ok(Number.isFinite(nearestRoadPoint(r,4,4).distance));
});
test('geometry cache follows point/style edits; picking and insertion target the nearest spline segment',()=>{
 const r=road(),g=roadGeometry(r);assert.equal(roadGeometry(r),g);r.points[1].x+=40;assert.notEqual(roadGeometry(r),g);const near=nearestRoadPoint(r,202,202);assert.ok(near.distance<5);assert.equal(near.segment,0);const p=createMap();p.roads=[r,{...structuredClone(r),id:'top'}];assert.equal(pickRoad(p,202,202).id,'top');assert.equal(pickRoad(p,1800,1200),null);p.roads[0].points.splice(near.segment+1,0,{x:near.x,y:near.y});validateMap(p);assert.equal(p.roads[0].points.length,5);
});
test('roads are purely visual: terrain cells, walls, water and bridge semantics are not overwritten',()=>{
 const p=createMap(),r=road();p.terrain.fill('water');const before=JSON.stringify([p.terrain,p.blocked,p.walkable,p.objects]);p.roads.push(r);assert.equal(pointWalkable(p,500,500),false);assert.equal(JSON.stringify([p.terrain,p.blocked,p.walkable,p.objects]),before);p.terrain.fill('grass');p.blocked[Math.floor(500/p.cell)*p.cols+Math.floor(500/p.cell)]=1;assert.equal(pointWalkable(p,500,500),false);
});
test('renderer clips feathered cubic roads to map, culls offscreen paths, draws under objects and ambient, and balances context',()=>{
 const p=createMap(),r=road();p.roads=[r];let depth=0;const calls=[],ctx=new Proxy({save:()=>depth++,restore:()=>{assert.ok(--depth>=0)},createPattern:()=>({}),bezierCurveTo:()=>calls.push('cubic'),stroke:()=>calls.push('road'),clip:()=>calls.push('clip'),drawImage:img=>{if(img==='tree')calls.push('object')}},{get:(o,k)=>k in o?o[k]:()=>{}}),renderer=new MapRenderer(p,new Map([['tree','tree']]));renderer.tile=()=>({});renderer.roadTexture=()=>({});renderer.atmosphere=()=>calls.push('ambient');renderer.overlay=()=>calls.push('handles');p.assets.tree={src:'data:image/png;base64,aA==',w:100,h:150,ax:.5,ay:1,kind:'tree'};p.objects.push({id:'tree',asset:'tree',x:400,y:400,scale:1,rotation:0,flip:false,layer:'sorted'});renderer.draw(ctx,{width:1400,height:800});assert.equal(depth,0);assert.equal(calls.filter(c=>c==='cubic').length,3);assert.ok(calls.indexOf('road')<calls.indexOf('object'));assert.ok(calls.indexOf('object')<calls.indexOf('ambient'));assert.ok(calls.indexOf('ambient')<calls.indexOf('handles'));assert.ok(calls.includes('clip'));calls.length=0;renderer.drawRoads(ctx,{x:1800,y:1300,width:100,height:100,zoom:1});assert.ok(!calls.includes('road'));assert.equal(depth,0);
});
