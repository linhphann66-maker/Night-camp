import fs from 'node:fs';
import path from 'node:path';
import {loadNativeSource} from './lib/native-ground-source.mjs';
import {mapPropName,mapPropCategory} from '../dist/studio/maps/prop-library.mjs';
const root=path.resolve(import.meta.dirname,'..'),base=path.join(root,'dist-full/game-20261025-1758'),library=JSON.parse(fs.readFileSync(path.join(root,'dist/studio/library-index.json')));
const {NC}=loadNativeSource(root),defs={...NC.FIELD_PROPS,...NC.CAMP_PROPS,...NC.AREA_DATA?.props};
const rootProps={tree:{kind:'tree'},tree2:{kind:'tree'},stone:{kind:'rock'},grass:{kind:'low'},tent:{kind:'house',rect:[.7,70]},roundtent:{kind:'house',rect:[.7,70]},wagon:{kind:'house',rect:[.74,48]},crates:{kind:'rock'},barrel:{kind:'rock'},rack:{kind:'fence'},lamp:{kind:'post'},torch:{kind:'post'},rug_red:{kind:'low',walkThrough:true},rug_orange:{kind:'low',walkThrough:true}};
Object.assign(defs,rootProps);defs.camp_firebase={kind:'fire'};for(const id of ['d_chest_wood','d_chest_iron','d_chest_gold'])defs[id]={kind:'rock'};for(const id of ['d_spikes_down','d_spikes_up'])defs[id]={kind:'low',walkThrough:true};defs.tc_wall2=defs.tc_wall2||{kind:'fence'};
const previous=JSON.parse(fs.readFileSync(path.join(root,'dist/studio/maps/catalog.json'),'utf8')),legacyById=new Map(previous.assets.filter(a=>previous.version===1||a.legacyV1===true).map(a=>[a.id,a]));
const rows=[];
for(const [id,s0]of Object.entries({...library.spriteManifest,...NC.ASSET_MANIFEST_MAPS})){
 if(!s0?.src||!/^assets\/(maps|camp)\//.test(s0.src)&&!Object.hasOwn(rootProps,id))continue;
 const d=defs[id],bridge=/bridge/.test(id),kind=bridge?'bridge':d?.kind,old=legacyById.get(id),s=old||s0;
 if(!['tree','house','tall','rock','bush','post','fence','low','seat','fire','bridge'].includes(kind)||![s.w,s.h,s.ax,s.ay].every(Number.isFinite)||!library.files.some(f=>f.path===s.src)||!fs.existsSync(path.join(base,s.src)))continue;
 let collider=old?.collider??null;
 if(!old){if(d?.legs||d?.walkThrough)collider=null;else if(kind==='house'&&Array.isArray(d.rect))collider={type:'rect',x:0,y:-(d.rect[1]+4)/2,w:s.w*d.rect[0],h:Math.max(1,d.rect[1]-4)};else if(kind==='fence')collider={type:'rect',x:0,y:-13,w:s.w*.94,h:22};else if(['post','seat','tall','fire'].includes(kind))collider={type:'ellipse',x:0,y:-6,w:Math.max(12,Math.min(110,s.w*.28)),h:18};else if(['tree','rock','bush'].includes(kind))collider={type:'ellipse',x:0,y:-4,w:Math.max(18,Math.min(110,s.w*.22)),h:Math.max(10,Math.min(50,s.w*.1))}}
 const walk=old?.walk??(bridge?{type:'rect',x:0,y:-s.h*.2,w:s.w*.65,h:Math.max(24,s.h*.14)}:null),category=mapPropCategory(id,kind);
 rows.push({id,name:mapPropName(id,kind),category,kind,src:s.src,w:s.w,h:s.h,ax:s.ax,ay:s.ay,collider,walk,legacyV1:!!old,sourceKind:d?.kind||kind,fadeBehind:['tree','house','tall'].includes(kind),groundShadow:!['low','bridge'].includes(kind),defaultLayer:/^rug_/.test(id)?'ground':'sorted',...(d?.light?{sourceLight:Array.from(d.light)}:{}),...(d?.legs?{sourceLegs:JSON.parse(JSON.stringify(d.legs))}:{}),provenance:'Night Camp archived '+library.build});
}
rows.sort((a,b)=>a.category.localeCompare(b.category)||a.id.localeCompare(b.id));
const out=path.join(root,'dist/studio/maps');fs.mkdirSync(out,{recursive:true});
const categories=Object.fromEntries([...new Set(rows.map(r=>r.category))].sort().map(k=>[k,rows.filter(r=>r.category===k).length]));
fs.writeFileSync(path.join(out,'catalog.json'),JSON.stringify({version:2,build:library.build,categories,ground:'Procedural palettes and flagstone equations adapted from camp.js, fieldgen.js and world.js, not extracted ground PNG tiles.',assets:rows},null,2));
console.log('Map Studio:',rows.length,'original environmental assets',categories);
