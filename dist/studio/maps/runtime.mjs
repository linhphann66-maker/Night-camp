// Portable map v1: data-only terrain, anchored props, foot collisions and water
// crossings. No Night Camp client globals, network, combat or server required.
export const TERRAINS={grass:{name:'Cỏ',color:'#76aa5e'},dirt:{name:'Đất / đường',color:'#cdaa76'},stone:{name:'Đá lát',color:'#92929a'},sand:{name:'Cát',color:'#dcc08c'},water:{name:'Nước',color:'#5caccf'},moss:{name:'Rêu / cỏ tối',color:'#567e64'}};
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
const fail=msg=>{throw Error(msg)};
const validSrc=src=>typeof src==='string'&&(/^assets\/[\w./-]+\.(png|webp|jpg|jpeg)$/.test(src)&&!src.split('/').includes('..')||/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(src));
function shape(s){return s===null||!!s&&['rect','ellipse'].includes(s.type)&&finite(s.x,-4096,4096)&&finite(s.y,-4096,4096)&&finite(s.w,1,4096)&&finite(s.h,1,4096)}
export function validateMap(p){
 if(p?.format!=='darkin-map-v1'||!safeId(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100)fail('Không đúng project map Darkin v1 / tên map không hợp lệ');
 if(!Number.isInteger(p.cols)||!finite(p.cols,4,128)||!Number.isInteger(p.rows)||!finite(p.rows,4,128)||![32,64,128].includes(p.cell)||!Number.isInteger(p.seed)||!finite(p.seed,0,2147483647))fail('Map tối đa 128×128 ô, cỡ ô 32/64/128');
 if(!p.assets||Array.isArray(p.assets)||Object.keys(p.assets).length>1000)fail('Danh mục tài nguyên map không hợp lệ');
 for(const [id,s]of Object.entries(p.assets))if(!safeId(id)||!s||!validSrc(s.src)||!finite(s.w,1,4096)||!finite(s.h,1,4096)||!finite(s.ax,0,1)||!finite(s.ay,0,1)||!['tree','rock','bush','low','bridge','custom','ground'].includes(s.kind)||!shape(s.collider??null)||!shape(s.walk??null))fail('Tài nguyên không hợp lệ: '+id);
 const n=p.cols*p.rows;for(const key of ['terrain','blocked','walkable'])if(!Array.isArray(p[key])||p[key].length!==n)fail('Sai số ô lớp '+key);
 if(p.terrain.some(id=>!Object.hasOwn(TERRAINS,id)&&p.assets[id]?.kind!=='ground')||p.blocked.some(v=>v!==0&&v!==1)||p.walkable.some(v=>v!==0&&v!==1))fail('Ô nền / vùng va chạm không hợp lệ');
 if(!Array.isArray(p.objects)||p.objects.length>5000)fail('Tối đa 5000 vật thể');const ids=new Set();
 for(const o of p.objects){if(!safeId(o.id)||ids.has(o.id)||!Object.hasOwn(p.assets,o.asset)||p.assets[o.asset].kind==='ground'||!finite(o.x,0,p.cols*p.cell)||!finite(o.y,0,p.rows*p.cell)||!finite(o.scale,.05,10)||!finite(o.rotation,-Math.PI*20,Math.PI*20)||typeof o.flip!=='boolean'||!['ground','sorted','front'].includes(o.layer)||!shape(o.collider??null)||!shape(o.walk??null))fail('Vật thể / điểm neo không hợp lệ');ids.add(o.id)}
 if(!p.spawn||!finite(p.spawn.x,0,p.cols*p.cell)||!finite(p.spawn.y,0,p.rows*p.cell))fail('Điểm xuất hiện nằm ngoài map');
 if(!Array.isArray(p.warps)||p.warps.length>200)fail('Danh sách cửa map không hợp lệ');
 const warps=new Set();for(const w of p.warps){if(!safeId(w.id)||warps.has(w.id)||!safeId(w.to)||!safeId(w.at)||!finite(w.x,0,p.cols*p.cell)||!finite(w.y,0,p.rows*p.cell)||!finite(w.radius,8,500))fail('Cửa chuyển map không hợp lệ');warps.add(w.id)}
 return p;
}
export function createMap({id='custom_map',name='Map mới',cols=32,rows=24,cell=64,seed=7,terrain='grass'}={}){return validateMap({format:'darkin-map-v1',id,name,cols,rows,cell,seed,assets:{},terrain:Array(cols*rows).fill(terrain),blocked:Array(cols*rows).fill(0),walkable:Array(cols*rows).fill(0),objects:[],spawn:{x:cell*2.5,y:cell*2.5},warps:[]})}
export function resizedMap(project,cols,rows,cell=project.cell){
 const p=structuredClone(project);p.cols=cols;p.rows=rows;p.cell=cell;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||!finite(cols,4,128)||!finite(rows,4,128))fail('Map từ 4 đến 128 ô mỗi chiều');
 for(const key of ['terrain','blocked','walkable']){p[key]=Array(cols*rows).fill(key==='terrain'?'grass':0);for(let y=0;y<Math.min(rows,project.rows);y++)for(let x=0;x<Math.min(cols,project.cols);x++)p[key][y*cols+x]=project[key][y*project.cols+x]}
 return validateMap(p); // Never silently remove props, spawn or warps beyond a shrinking edge.
}
export function cellIndex(p,x,y){return x<0||y<0||x>=p.cols*p.cell||y>=p.rows*p.cell?-1:Math.floor(y/p.cell)*p.cols+Math.floor(x/p.cell)}
export function paintLine(p,from,to,{layer='terrain',value='grass',radius=0}={}){
 if(!['terrain','blocked','walkable'].includes(layer)||!Number.isInteger(radius)||!finite(radius,0,8)||layer==='terrain'&&!Object.hasOwn(TERRAINS,value)&&p.assets[value]?.kind!=='ground'||layer!=='terrain'&&value!==0&&value!==1)fail('Cọ vẽ không hợp lệ');
 if(![...from,...to].every(Number.isFinite))fail('Tọa độ cọ không hợp lệ');
 const ax=Math.floor(from[0]/p.cell),ay=Math.floor(from[1]/p.cell),bx=Math.floor(to[0]/p.cell),by=Math.floor(to[1]/p.cell),n=Math.max(1,Math.abs(bx-ax),Math.abs(by-ay));
 for(let i=0;i<=n;i++){const cx=Math.round(ax+(bx-ax)*i/n),cy=Math.round(ay+(by-ay)*i/n);for(let y=cy-radius;y<=cy+radius;y++)for(let x=cx-radius;x<=cx+radius;x++)if(x>=0&&y>=0&&x<p.cols&&y<p.rows)p[layer][y*p.cols+x]=value}
}
export function objectLocal(o,x,y){const a=-o.rotation,c=Math.cos(a),s=Math.sin(a),dx=(x-o.x)/o.scale,dy=(y-o.y)/o.scale;return [(dx*c-dy*s)*(o.flip?-1:1),dx*s+dy*c]}
export function objectWorld(o,x,y){const a=o.rotation,c=Math.cos(a),s=Math.sin(a),xx=x*(o.flip?-1:1);return [o.x+(xx*c-y*s)*o.scale,o.y+(xx*s+y*c)*o.scale]}
export function insideShape(s,x,y){if(!s)return false;const dx=(x-s.x)/(s.w/2),dy=(y-s.y)/(s.h/2);return s.type==='ellipse'?dx*dx+dy*dy<=1:Math.abs(dx)<=1&&Math.abs(dy)<=1}
export function objectBounds(p,o){const s=p.assets[o.asset],xy=[[-s.ax*s.w,-s.ay*s.h],[(1-s.ax)*s.w,-s.ay*s.h],[-s.ax*s.w,(1-s.ay)*s.h],[(1-s.ax)*s.w,(1-s.ay)*s.h]].map(pt=>objectWorld(o,...pt));return {x0:Math.min(...xy.map(v=>v[0])),y0:Math.min(...xy.map(v=>v[1])),x1:Math.max(...xy.map(v=>v[0])),y1:Math.max(...xy.map(v=>v[1]))}}
export function orderedObjects(p){return [...p.objects].sort((a,b)=>a.y-b.y)}
export function pickObject(p,x,y){return [...orderedObjects(p).filter(o=>o.layer==='ground'),...orderedObjects(p).filter(o=>o.layer==='sorted'),...orderedObjects(p).filter(o=>o.layer==='front')].reverse().find(o=>{const s=p.assets[o.asset],[px,py]=objectLocal(o,x,y);return px>=-s.ax*s.w&&px<=(1-s.ax)*s.w&&py>=-s.ay*s.h&&py<=(1-s.ay)*s.h})||null}
export function pointWalkable(p,x,y){
 const i=cellIndex(p,x,y);if(i<0||p.blocked[i])return false;
 let onBridge=false;for(const o of p.objects){const [lx,ly]=objectLocal(o,x,y);if(insideShape(o.collider,lx,ly))return false;if(insideShape(o.walk,lx,ly))onBridge=true}
 return p.terrain[i]!=='water'||p.walkable[i]===1||onBridge;
}
export function canWalk(p,x,y,r=12){if(!pointWalkable(p,x,y))return false;for(let i=0;i<8;i++)if(!pointWalkable(p,x+Math.cos(i*Math.PI/4)*r,y+Math.sin(i*Math.PI/4)*r*.6))return false;return true}
export function moveActor(p,actor,dx,dy,dt,speed=180){const len=Math.max(1,Math.hypot(dx,dy)),x=dx/len*speed*Math.max(0,Math.min(.1,dt)),y=dy/len*speed*Math.max(0,Math.min(.1,dt)),n=Math.max(1,Math.ceil(Math.hypot(x,y)/5));for(let i=0;i<n;i++){if(canWalk(p,actor.x+x/n,actor.y,actor.radius??12))actor.x+=x/n;if(canWalk(p,actor.x,actor.y+y/n,actor.radius??12))actor.y+=y/n}return actor}
export function warpAt(p,x,y){return p.warps.find(w=>Math.hypot(w.x-x,w.y-y)<=w.radius)||null}
const hash=(x,y,seed)=>{const n=Math.sin(x*127.1+y*311.7+seed*74.7)*43758.5453;return n-Math.floor(n)};
function noise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hash(ix,iy,s),b=hash(ix+1,iy,s),c=hash(ix,iy+1,s),d=hash(ix+1,iy+1,s);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v}
// Original ground is procedural, not a PNG tileset. These day palettes and
// stone seam sizes come from fieldgen.js/world.js; rasterized here per tile.
export function terrainRGB(type,x,y,seed){const base={grass:[118,170,94],dirt:[205,170,118],stone:[146,146,154],sand:[220,192,140],water:[92,172,216],moss:[86,126,100]}[type]||[118,170,94],n=(noise(x/300,y/300,seed)-.5)*22+(noise(x/55,y/55,seed+3)-.5)*8;if(type==='stone'){const fx=x/150-Math.floor(x/150),fy=y/105-Math.floor(y/105);if(fx<.035||fy<.05)return [96,96,108]}return base.map((v,i)=>Math.max(0,Math.min(255,Math.round(v+n*(i===2?.8:1)))))}
export class MapRenderer{
 constructor(project,images=new Map()){this.project=project;this.images=images;this.cache=new Map()}
 tile(type,x,y){const p=this.project,key=[type,x,y,p.cell,p.seed].join(':');if(this.cache.has(key))return this.cache.get(key);const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d'),asset=p.assets[type],image=this.images.get(type);if(asset?.kind==='ground'&&image)ctx.drawImage(image,0,0,32,32);else{const data=ctx.createImageData(32,32);for(let j=0;j<32;j++)for(let i=0;i<32;i++){const k=(j*32+i)*4,rgb=terrainRGB(type,x*p.cell+i*p.cell/32,y*p.cell+j*p.cell/32,p.seed);data.data.set([...rgb,255],k)}ctx.putImageData(data,0,0)}this.cache.set(key,c);if(this.cache.size>1200)this.cache.delete(this.cache.keys().next().value);return c}
 draw(ctx,{x=0,y=0,zoom=1,width,height,grid=false,collision=false,selected=null,actor=null,time=0,markers=false,drawActor=null}={}){
  const p=this.project,cs=p.cell,overview=cs*zoom<18,visible=b=>b.x1>=x&&b.y1>=y&&b.x0<=x+width/zoom&&b.y0<=y+height/zoom;ctx.save();ctx.scale(zoom,zoom);ctx.translate(-x,-y);ctx.fillStyle='#0d1520';ctx.fillRect(x,y,width/zoom,height/zoom);
  for(let gy=Math.max(0,Math.floor(y/cs));gy<Math.min(p.rows,Math.ceil((y+height/zoom)/cs));gy++)for(let gx=Math.max(0,Math.floor(x/cs));gx<Math.min(p.cols,Math.ceil((x+width/zoom)/cs));gx++){const type=p.terrain[gy*p.cols+gx];ctx.drawImage(this.tile(type,overview?0:gx,overview?0:gy),gx*cs,gy*cs,cs+.2,cs+.2);if(type==='water'&&!overview){ctx.strokeStyle='#d5f5ff33';ctx.lineWidth=1/zoom;ctx.beginPath();ctx.moveTo(gx*cs+8,gy*cs+cs*.5+Math.sin(time*2+gx)*3);ctx.lineTo(gx*cs+cs-8,gy*cs+cs*.5+Math.sin(time*2+gx+1)*3);ctx.stroke()}if(grid&&cs*zoom>=10){ctx.strokeStyle='#101a2c36';ctx.lineWidth=1/zoom;ctx.strokeRect(gx*cs,gy*cs,cs,cs)}if(collision&&(p.blocked[gy*p.cols+gx]||p.walkable[gy*p.cols+gx])){ctx.fillStyle=p.blocked[gy*p.cols+gx]?'#ff675577':'#62d6cd66';ctx.fillRect(gx*cs,gy*cs,cs,cs)}}
  const draw=o=>{if(!visible(objectBounds(p,o)))return;const s=p.assets[o.asset],img=this.images.get(o.asset);ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rotation);ctx.scale(o.scale*(o.flip?-1:1),o.scale);if(img){if(s.kind==='tree'&&actor&&actor.y<o.y&&Math.abs(actor.x-o.x)<s.w*o.scale*.35&&actor.y>o.y-s.h*o.scale)ctx.globalAlpha=.5;ctx.drawImage(img,-s.ax*s.w,-s.ay*s.h,s.w,s.h)}if(collision){for(const [shape,color]of [[o.collider,'#ff8c77'],[o.walk,'#74f0d2']])if(shape){ctx.strokeStyle=color;ctx.lineWidth=2/(zoom*o.scale);ctx.beginPath();if(shape.type==='ellipse')ctx.ellipse(shape.x,shape.y,shape.w/2,shape.h/2,0,0,Math.PI*2);else ctx.rect(shape.x-shape.w/2,shape.y-shape.h/2,shape.w,shape.h);ctx.stroke()}}if(selected===o.id){ctx.strokeStyle='#e1f7a8';ctx.lineWidth=2/(zoom*o.scale);ctx.strokeRect(-s.ax*s.w,-s.ay*s.h,s.w,s.h);ctx.fillStyle='#ffbd80';ctx.beginPath();ctx.arc(0,0,5/o.scale,0,Math.PI*2);ctx.fill()}ctx.restore()};
  for(const o of orderedObjects(p).filter(o=>o.layer==='ground'))draw(o);
  const sorted=orderedObjects(p).filter(o=>o.layer==='sorted');let done=false;const drawHero=()=>{if(drawActor)drawActor(ctx,actor);else{ctx.save();ctx.translate(actor.x,actor.y);ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d3ed92';ctx.beginPath();ctx.arc(0,-17,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#2c4936';ctx.lineWidth=2;ctx.stroke();ctx.restore()}};
  for(const o of sorted){if(actor&&!done&&actor.y<o.y){drawHero();done=true}draw(o)}if(actor&&!done)drawHero();for(const o of orderedObjects(p).filter(o=>o.layer==='front'))draw(o);
  if(markers){ctx.save();ctx.lineWidth=2/zoom;ctx.strokeStyle='#c7ef89';ctx.beginPath();ctx.arc(p.spawn.x,p.spawn.y,18,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e5ffbe';ctx.font=`${12/zoom}px system-ui`;ctx.fillText('Spawn',p.spawn.x+22,p.spawn.y);for(const w of p.warps){ctx.strokeStyle='#b99cff';ctx.beginPath();ctx.arc(w.x,w.y,w.radius,0,Math.PI*2);ctx.stroke();ctx.fillText(w.id+' → '+w.to,w.x+w.radius,w.y)}ctx.restore()}ctx.restore();
 }
}
export class DarkinMapPlayer{
 static async load(data,resolve=src=>src){const p=structuredClone(validateMap(data.format==='darkin-map-bundle-v1'?data.project:data)),images=new Map();await Promise.all(Object.entries(p.assets).map(async([id,s])=>{const img=new Image();img.crossOrigin='anonymous';await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Không tải được ảnh map '+id));img.src=resolve(s.src)});images.set(id,img)}));return new DarkinMapPlayer(p,images)}
 constructor(p,images){this.project=p;this.renderer=new MapRenderer(p,images);this.actor={...p.spawn,radius:12};this.time=0}
 update(dt,dx=0,dy=0){this.time+=Math.max(0,dt);moveActor(this.project,this.actor,dx,dy,dt);return warpAt(this.project,this.actor.x,this.actor.y)}
 draw(ctx,width,height,{zoom=1,...opts}={}){const p=this.project,x=Math.max(0,Math.min(p.cols*p.cell-width/zoom,this.actor.x-width/zoom/2)),y=Math.max(0,Math.min(p.rows*p.cell-height/zoom,this.actor.y-height/zoom/2));this.renderer.draw(ctx,{...opts,x,y,zoom,width,height,actor:this.actor,time:this.time})}
}
