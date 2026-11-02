import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const root=path.resolve(import.meta.dirname,'..'),base=path.join(root,'dist-full/game-20261025-1758'),library=JSON.parse(fs.readFileSync(path.join(root,'dist/studio/library-index.json')));
const NC={},ctx=vm.createContext({window:{NC},NC});
const read=file=>fs.readFileSync(path.join(base,'js',file),'utf8');
vm.runInContext(read('fieldgen.js'),ctx);
const camp=read('camp.js'),start=camp.indexOf('const PROPS ='),end=camp.indexOf('NC.CAMP_PROPS = PROPS;');
const campProps=vm.runInContext('(()=>{'+camp.slice(start,end)+'return PROPS})()',ctx);
vm.runInContext(read('areas_data.js'),ctx);
const defs={...NC.FIELD_PROPS,...campProps,...NC.AREA_DATA?.props};
const rows=[];
for(const [id,s]of Object.entries(library.spriteManifest)){
 if(!s?.src||!/^assets\/(maps|camp)\//.test(s.src)&&!['tree','tree2','stone','grass'].includes(id))continue;
 const bridge=/bridge|drawbridge/.test(id),kind=bridge?'bridge':defs[id]?.kind||(['tree','tree2'].includes(id)?'tree':id==='stone'?'rock':id==='grass'?'low':null);
 if(!['tree','rock','bush','low','bridge'].includes(kind)||![s.w,s.h,s.ax,s.ay].every(Number.isFinite)||!library.files.some(f=>f.path===s.src))continue;
 const category=kind==='tree'?'tree':kind==='rock'?'rock':kind==='bridge'?'bridge':'plants';
 const collider=['tree','rock','bush'].includes(kind)?{type:'ellipse',x:0,y:-4,w:Math.max(18,Math.min(110,s.w*.22)),h:Math.max(10,Math.min(50,s.w*.1))}:null;
 const walk=bridge?{type:'rect',x:0,y:-s.h*.2,w:s.w*.65,h:Math.max(24,s.h*.14)}:null;
 rows.push({id,name:id,category,kind,src:s.src,w:s.w,h:s.h,ax:s.ax,ay:s.ay,collider,walk,provenance:'Night Camp archived '+library.build});
}
rows.sort((a,b)=>a.category.localeCompare(b.category)||a.id.localeCompare(b.id));
const out=path.join(root,'dist/studio/maps');fs.mkdirSync(out,{recursive:true});
fs.writeFileSync(path.join(out,'catalog.json'),JSON.stringify({version:1,build:library.build,ground:'Procedural palettes and flagstone equations adapted from camp.js, fieldgen.js and world.js, not extracted ground PNG tiles.',assets:rows},null,2));
console.log('Map Studio:',rows.length,'original environmental assets',Object.fromEntries(['tree','rock','bridge','plants'].map(k=>[k,rows.filter(r=>r.category===k).length])));
