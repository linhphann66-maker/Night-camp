import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
export const BUILD='game-20261025-1758';
export const SOURCE_FILES=['core','fieldgen','maps','camp','fields2','fields3','dungeongen','dungeons','fields4','dungeons2','fields5','fields6','areas_data','fields7'];
export function loadNativeSource(root){
 const base=path.join(root,'dist-full',BUILD,'js'),library=JSON.parse(fs.readFileSync(path.join(root,'dist/studio/library-index.json'))),noop=()=>0,NC={ASSET_MANIFEST_MAPS:structuredClone(library.spriteManifest),SPR:{},SPECIES:{},MONSTERS:{},BOSSES:{},DUNGEON_BOSSES:{},ROSTER:{}},ctx=vm.createContext({window:{NC},NC,URLSearchParams,location:{search:''},localStorage:{removeItem:noop,getItem:()=>null},setInterval:noop,setTimeout:noop,addEventListener:noop});
 const source={};for(const name of SOURCE_FILES){const code=fs.readFileSync(path.join(base,name+'.js'),'utf8');const previous=new Set(Object.keys(NC.BIOMES||{}));vm.runInContext(code,ctx,{filename:name+'.js',timeout:5000});for(const id of Object.keys(NC.BIOMES||{}))if(!previous.has(id))source[id]=name+'.js';if(name==='fieldgen')NC.buildField=()=>({});}
 const sky=fs.readFileSync(path.join(base,'minimap.js'),'utf8'),start=sky.indexOf('NC.skyAmbient = function'),end=sky.indexOf('\n  };',start)+6;vm.runInContext('(()=>{const {lerp,clamp}=NC;'+sky.slice(start,end)+'})()',ctx);
 return {NC,ctx,source,base};
}
export function extractNativeGrounds(root){
 const {NC,source}=loadNativeSource(root),clean=o=>JSON.parse(JSON.stringify(o)),grounds={},maps={};
 for(const [id,b]of Object.entries(NC.BIOMES)){grounds[id]={kind:'field',source:source[id]};for(const k of ['base','patch','vary','patchScale','road','roadEdge','roadMid','water','deep','shore','soil','soilEdge','furrow','ridge','mesaTop','mesaRim','mesaFace','mesaFace2','specks'])if(b[k]!==undefined)grounds[id][k]=clean(b[k]);}
 for(const [id,t]of Object.entries(NC.DUNGEON_THEMES||{})){grounds['dungeon_'+id]={kind:'dungeon',source:id==='roots'?'fields5.js':['owl','ledger','puppet','bell','grave'].includes(id)?'dungeons2.js':'dungeongen.js',floor:clean(t.floor),floor2:clean(t.floor2),rock:clean(t.rock),rock2:clean(t.rock2),ambient:clean(t.ambient),specks:clean(t.specks),...(t.pool?{pool:clean(t.pool)}:{})};}
 // Camp has its own procedural formula, not a field biome. Constants are taken
 // from camp.js. Its clearing geometry is kept for faithful base-ground colors.
 const camp=fs.readFileSync(path.join(root,'dist-full',BUILD,'js/camp.js'),'utf8'),head=camp.slice(camp.indexOf('const W ='),camp.indexOf('// little groves'));
 const C=vm.runInNewContext('(()=>{'+head+'return {CORNERS,FIRE,PLAZA}})()',{NC:{campPt:()=>[]}});grounds.camp={kind:'camp',source:'camp.js',...clean(C)};
 for(const [id,m]of Object.entries(NC.MAPS)){
  const biome=m.dungeon?'dungeon_'+m.dungeon.theme:m.biome|| (id==='camp'?'camp':null);if(!grounds[biome])continue;const record={id,name:m.name,biome,seed:m.seed??7,width:m.W??6200,height:m.H??5000,area:m.area||m.broot||m.biome||'camp',root:m.broot||null,bn:m.bn||null,category:m.dungeon?'dungeon':m.broot?'section':id==='camp'?'camp':'field',dusk:0,tint:[0,0,0],add:[0,0,0]};
  if(m.dungeon){record.dusk=1;record.ambient=grounds[biome].ambient;}
  else if(id!=='camp'){const w=NC.buildField({...m,id});record.dusk=w.dusk||0;if(w.ambient){const sky=NC.skyAmbient;NC.skyAmbient=()=>[0,0,0];const add=w.ambient(1320,1);NC.skyAmbient=()=>[100,100,100];const full=w.ambient(1320,1);record.add=clean(add);record.tint=full.map((v,i)=>(100+add[i]-v)/100);NC.skyAmbient=sky;}}
  maps[id]=record;
 }
 return clean({build:BUILD,grounds,maps});
}
