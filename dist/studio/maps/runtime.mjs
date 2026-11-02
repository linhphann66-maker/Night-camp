// Portable map v1: data-only terrain, anchored props, foot collisions and water
// crossings. No Night Camp client globals, network, combat or server required.
export const TERRAINS={grass:{name:'Cỏ',color:'#76aa5e'},dirt:{name:'Đất / đường',color:'#cdaa76'},stone:{name:'Đá lát',color:'#92929a'},sand:{name:'Cát',color:'#dcc08c'},water:{name:'Nước',color:'#5caccf'},moss:{name:'Rêu / cỏ tối',color:'#567e64'}};
export const MAP_RUNTIME_VERSION=2;
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export const DEFAULT_LIGHTING=Object.freeze({mode:'day',hour:22,ambient:1,vignette:true,playerLight:true,blend:true,details:true});
export function lightingSettings(p){return {...DEFAULT_LIGHTING,...p.lighting}}
export function nightness(p){const l=lightingSettings(p),h=l.hour;return l.mode==='night'?1:l.mode==='day'?0:h<5||h>=19.5?1:h<7?(7-h)/2:h>=17.5?(h-17.5)/2:0}
const fail=msg=>{throw Error(msg)};
const validSrc=src=>typeof src==='string'&&(/^assets\/[\w./-]+\.(png|webp|jpg|jpeg)$/.test(src)&&!src.split('/').includes('..')||/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(src));
function shape(s){return s===null||!!s&&['rect','ellipse'].includes(s.type)&&finite(s.x,-4096,4096)&&finite(s.y,-4096,4096)&&finite(s.w,1,4096)&&finite(s.h,1,4096)}
export function validateMap(p){
 if(p?.format!=='darkin-map-v1'||!safeId(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100)fail('Không đúng project map Darkin v1 / tên map không hợp lệ');
 if(!Number.isInteger(p.cols)||!finite(p.cols,4,128)||!Number.isInteger(p.rows)||!finite(p.rows,4,128)||![32,64,128].includes(p.cell)||!Number.isInteger(p.seed)||!finite(p.seed,0,2147483647))fail('Map tối đa 128×128 ô, cỡ ô 32/64/128');
 if(p.lighting!==undefined){const l=p.lighting;if(!l||typeof l!=='object'||Array.isArray(l)||Object.keys(l).some(k=>!Object.hasOwn(DEFAULT_LIGHTING,k)))fail('Thiết lập ánh sáng không hợp lệ');const v=lightingSettings(p);if(!['day','night','time'].includes(v.mode)||!finite(v.hour,0,23.99)||!finite(v.ambient,0,1)||['vignette','playerLight','blend','details'].some(k=>typeof v[k]!=='boolean'))fail('Giờ / cường độ ánh sáng không hợp lệ')}
 if(!p.assets||Array.isArray(p.assets)||Object.keys(p.assets).length>1000)fail('Danh mục tài nguyên map không hợp lệ');
 for(const [id,s]of Object.entries(p.assets))if(!safeId(id)||!s||!validSrc(s.src)||!finite(s.w,1,4096)||!finite(s.h,1,4096)||!finite(s.ax,0,1)||!finite(s.ay,0,1)||!['tree','rock','bush','low','bridge','custom','ground'].includes(s.kind)||!shape(s.collider??null)||!shape(s.walk??null))fail('Tài nguyên không hợp lệ: '+id);
 const n=p.cols*p.rows;for(const key of ['terrain','blocked','walkable'])if(!Array.isArray(p[key])||p[key].length!==n)fail('Sai số ô lớp '+key);
 if(p.terrain.some(id=>!Object.hasOwn(TERRAINS,id)&&p.assets[id]?.kind!=='ground')||p.blocked.some(v=>v!==0&&v!==1)||p.walkable.some(v=>v!==0&&v!==1))fail('Ô nền / vùng va chạm không hợp lệ');
 if(p.roads!==undefined){if(!Array.isArray(p.roads)||p.roads.length>128)fail('Tối đa 128 đường cong');const ids=new Set();let count=0;for(const r of p.roads){if(!r||!safeId(r.id)||ids.has(r.id)||!['dirt','sand','stone'].includes(r.material)||!finite(r.width,8,512)||!finite(r.softness,0,.9)||!finite(r.smoothness,0,1)||!Array.isArray(r.points)||r.points.length<2||r.points.length>256)fail('Đường cong không hợp lệ: cần 2–256 điểm, rộng 8–512');ids.add(r.id);count+=r.points.length;for(const v of r.points)if(!v||!finite(v.x,0,p.cols*p.cell)||!finite(v.y,0,p.rows*p.cell))fail('Điểm đường cong nằm ngoài map')}if(count>4096)fail('Tối đa 4096 điểm đường cong mỗi map')}
 if(!Array.isArray(p.objects)||p.objects.length>5000)fail('Tối đa 5000 vật thể');const ids=new Set();
 for(const o of p.objects){if(!safeId(o.id)||ids.has(o.id)||!Object.hasOwn(p.assets,o.asset)||p.assets[o.asset].kind==='ground'||!finite(o.x,0,p.cols*p.cell)||!finite(o.y,0,p.rows*p.cell)||!finite(o.scale,.05,10)||!finite(o.rotation,-Math.PI*20,Math.PI*20)||typeof o.flip!=='boolean'||!['ground','sorted','front'].includes(o.layer)||!shape(o.collider??null)||!shape(o.walk??null))fail('Vật thể / điểm neo không hợp lệ');ids.add(o.id)}
 if(!p.spawn||!finite(p.spawn.x,0,p.cols*p.cell)||!finite(p.spawn.y,0,p.rows*p.cell))fail('Điểm xuất hiện nằm ngoài map');
 if(!Array.isArray(p.warps)||p.warps.length>200)fail('Danh sách cửa map không hợp lệ');
 const warps=new Set();for(const w of p.warps){if(!safeId(w.id)||warps.has(w.id)||!safeId(w.to)||!safeId(w.at)||!finite(w.x,0,p.cols*p.cell)||!finite(w.y,0,p.rows*p.cell)||!finite(w.radius,8,500))fail('Cửa chuyển map không hợp lệ');warps.add(w.id)}
 return p;
}
export function createMap({id='custom_map',name='Map mới',cols=32,rows=24,cell=64,seed=7,terrain='grass'}={}){return validateMap({format:'darkin-map-v1',id,name,cols,rows,cell,seed,assets:{},terrain:Array(cols*rows).fill(terrain),blocked:Array(cols*rows).fill(0),walkable:Array(cols*rows).fill(0),objects:[],roads:[],spawn:{x:cell*2.5,y:cell*2.5},warps:[]})}
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
// Interpolating cardinal spline: the editable points lie ON the road. Repeated
// points and a zero-length segment are valid and never divide by zero.
const roadGeometryCache=new WeakMap();
export function roadGeometry(road){
 const key=JSON.stringify([road.points,road.smoothness,road.width]),saved=roadGeometryCache.get(road);if(saved?.key===key)return saved.value;
 const pts=road.points,segments=[],samples=[],factor=road.smoothness/6;
 for(let i=0;i<pts.length-1;i++){const a=pts[Math.max(0,i-1)],b=pts[i],c=pts[i+1],d=pts[Math.min(pts.length-1,i+2)],c1={x:b.x+(c.x-a.x)*factor,y:b.y+(c.y-a.y)*factor},c2={x:c.x-(d.x-b.x)*factor,y:c.y-(d.y-b.y)*factor};segments.push({from:b,c1,c2,to:c});const steps=Math.max(8,Math.min(48,Math.ceil(Math.hypot(c.x-b.x,c.y-b.y)/12)));for(let j=0;j<=steps;j++){const t=j/steps,u=1-t;samples.push({x:u*u*u*b.x+3*u*u*t*c1.x+3*u*t*t*c2.x+t*t*t*c.x,y:u*u*u*b.y+3*u*u*t*c1.y+3*u*t*t*c2.y+t*t*t*c.y,segment:i})}}
 const all=segments.flatMap(s=>[s.from,s.c1,s.c2,s.to]),r=road.width/2,bounds=all.length?{x0:Math.min(...all.map(v=>v.x))-r,y0:Math.min(...all.map(v=>v.y))-r,x1:Math.max(...all.map(v=>v.x))+r,y1:Math.max(...all.map(v=>v.y))+r}:null,value={segments,samples,bounds};roadGeometryCache.set(road,{key,value});return value;
}
export function nearestRoadPoint(road,x,y){let best={distance:Infinity,segment:0,x,y};const pts=roadGeometry(road).samples;for(let i=1;i<pts.length;i++){const a=pts[i-1],b=pts[i],dx=b.x-a.x,dy=b.y-a.y,len=dx*dx+dy*dy,t=len?Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/len)):0,px=a.x+t*dx,py=a.y+t*dy,distance=Math.hypot(x-px,y-py);if(distance<best.distance)best={distance,segment:b.segment,x:px,y:py}}return best}
export function pickRoad(p,x,y,tolerance=0){return [...(p.roads||[])].reverse().find(r=>nearestRoadPoint(r,x,y).distance<=r.width/2+tolerance)||null}
export function traceRoad(ctx,road){const {segments}=roadGeometry(road);ctx.beginPath();if(!segments.length)return;ctx.moveTo(segments[0].from.x,segments[0].from.y);for(const s of segments)ctx.bezierCurveTo(s.c1.x,s.c1.y,s.c2.x,s.c2.y,s.to.x,s.to.y)}
const hash=(x,y,seed)=>{let h=(Math.imul(x|0,374761393)+Math.imul(y|0,668265263)+Math.imul(seed|0,144664051))|0;h=Math.imul(h^(h>>>13),1274126177);h^=h>>>16;return (h>>>0)/4294967296};
function noise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hash(ix,iy,s),b=hash(ix+1,iy,s),c=hash(ix,iy+1,s),d=hash(ix+1,iy+1,s);return (a+(b-a)*u)*(1-v)+(c+(d-c)*u)*v}
// Meadow night/day palettes and patch thresholds: original fieldgen.js.
// Stone spacing/seams: world.js. Sand/moss are editor adaptations.
const mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t),clamp=v=>Math.max(0,Math.min(1,v));
const PALETTES={grass:[[118,170,94],[50,76,74]],dirt:[[205,170,118],[64,70,82]],sand:[[220,192,140],[66,74,86]],water:[[92,172,216],[38,62,104]],moss:[[86,126,100],[38,60,62]]};
export function terrainRGB(type,x,y,seed,n=0){
 n=clamp(n);let day,night;
 if(type==='stone'){const fx=x/150-Math.floor(x/150),fy=y/105-Math.floor(y/105),v=hash(Math.floor(x/150),Math.floor(y/105),seed)*10+noise(x/60,y/60,seed+1)*6;day=fx<.035||fy<.05?[96,96,108]:[128+2*v,128+2*v,138+2*v];night=fx<.035||fy<.05?[41,44,58]:[47+v,51+v,68+v]}
 else{const palette=PALETTES[type]||PALETTES.grass;[day,night]=palette;
  if(type==='grass'||type==='moss'){const f=(noise(x/560,y/560,seed+3)+noise(x/280,y/280,seed+34)*.5)/1.5,t=clamp((f-.44)/.18);day=mix(day,type==='grass'?[142,190,104]:[100,142,104],t);night=mix(night,type==='grass'?[60,90,78]:[44,68,66],t)}
  const v=(noise(x/64,y/64,seed+9)-.5)*(type==='grass'?20:12);day=day.map((c,i)=>c+v*(i===2?1:1.3));night=night.map((c,i)=>c+v*(i===2?.8:1));
 }return mix(day,night,n).map(v=>Math.max(0,Math.min(255,Math.round(v))));
}
// Road paint uses a repeating 300×210 pattern. Raw world noise is NOT tileable:
// sampling it directly causes a visible brightness jump at each repeat. Blend
// translated copies with smooth weights so opposite edges and their slopes
// agree. Stone's deliberate 150×105 joints still align at the repeat boundary.
export function roadTextureRGB(type,x,y,seed,n=0){
 const w=300,h=210,px=((x%w)+w)%w,py=((y%h)+h)%h,smooth=t=>t*t*(3-2*t),u=smooth(px/w),v=smooth(py/h);
 return mix(mix(terrainRGB(type,px,py,seed,n),terrainRGB(type,px-w,py,seed,n),u),mix(terrainRGB(type,px,py-h,seed,n),terrainRGB(type,px-w,py-h,seed,n),u),v).map(Math.round);
}
// The same blend on both sides of a boundary. Visual only: no change to water,
// collision or bridge semantics. Separate custom image tiles are never recolored.
export function groundRGB(p,type,x,y,n=nightness(p)){
 let rgb=terrainRGB(type,x,y,p.seed,n);if(!lightingSettings(p).blend||!['grass','moss','dirt','sand'].includes(type))return rgb;
 const cs=p.cell,gx=Math.floor(x/cs),gy=Math.floor(y/cs),fx=x-gx*cs,fy=y-gy*cs,edge=Math.min(10,cs*.18);
 for(const [dx,dy,d]of [[-1,0,fx],[1,0,cs-fx],[0,-1,fy],[0,1,cs-fy]]){if(d>=edge||gx+dx<0||gy+dy<0||gx+dx>=p.cols||gy+dy>=p.rows)continue;const other=p.terrain[(gy+dy)*p.cols+gx+dx];if(other===type||!['grass','moss','dirt','sand'].includes(other))continue;const t=clamp(1-d/edge);rgb=mix(rgb,terrainRGB(other,x,y,p.seed,n),.5*t*t*(3-2*t))}return rgb.map(Math.round);
}
// Original skyAmbient's warm dawn/dusk, with a user-controlled tint strength.
export function ambientRGB(p){const l=lightingSettings(p),n=nightness(p),warm=l.hour>12?[255,164,108]:[255,184,196],k=l.mode==='time'?Math.sin(Math.PI*n)*(l.hour>12?.6:.45):0;return mix([255,255,255],mix(mix([255,255,255],[172,186,232],n),warm,k),l.ambient).map(Math.round)}
export class MapRenderer{
 constructor(project,images=new Map()){this.project=project;this.images=images;this.cache=new Map()}
 roadTexture(ctx,material){const p=this.project,key=[material,p.seed,nightness(p)].join(':');this.roadTextures||=new Map();if(this.roadTextures.has(key))return this.roadTextures.get(key);const c=document.createElement('canvas');c.width=300;c.height=210;const cc=c.getContext('2d'),data=cc.createImageData(c.width,c.height),n=nightness(p);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)data.data.set([...roadTextureRGB(material,x,y,p.seed,n),255],(y*c.width+x)*4);cc.putImageData(data,0,0);const pattern=ctx.createPattern(c,'repeat');this.roadTextures.set(key,pattern);if(this.roadTextures.size>12)this.roadTextures.delete(this.roadTextures.keys().next().value);return pattern}
 drawRoads(ctx,{x,y,zoom,width,height}){
  const p=this.project,roads=[...(p.roads||[]),...(this.previewRoad?[this.previewRoad]:[])];if(!roads.length)return;ctx.save();ctx.beginPath();ctx.rect(0,0,p.cols*p.cell,p.rows*p.cell);ctx.clip();ctx.lineCap=ctx.lineJoin='round';
  for(const r of roads){const b=roadGeometry(r).bounds;if(!b||b.x1<x||b.y1<y||b.x0>x+width/zoom||b.y0>y+height/zoom)continue;traceRoad(ctx,r);ctx.strokeStyle=this.roadTexture(ctx,r.material)||`rgb(${terrainRGB(r.material,0,0,p.seed,nightness(p)).join(',')})`;const inner=Math.max(2,r.width*(1-r.softness));if(r.softness>0)for(let i=0;i<8;i++){ctx.globalAlpha=1/(10-i);ctx.lineWidth=r.width-(r.width-inner)*i/8;ctx.stroke()}ctx.globalAlpha=1;ctx.lineWidth=inner;ctx.stroke()}
  ctx.restore();
 }
 overview(){
  const p=this.project,l=lightingSettings(p),n=nightness(p),key=[p.cols,p.rows,p.cell,p.seed,n,l.blend,this.images.size,p.terrain.join(',')].join(':');if(this.overviewCache?.key===key)return this.overviewCache.canvas;
  // Four samples per map cell preserve world-scale grass patches at fit-to-map
  // zoom. A single small raster avoids thousands of unique tile cache entries.
  const c=document.createElement('canvas');c.width=p.cols*4;c.height=p.rows*4;const ctx=c.getContext('2d'),data=ctx.createImageData(c.width,c.height);
  for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++){const type=p.terrain[Math.floor(y/4)*p.cols+Math.floor(x/4)],rgb=groundRGB(p,type,(x+.5)*p.cell/4,(y+.5)*p.cell/4,n);data.data.set([...rgb,255],(y*c.width+x)*4)}ctx.putImageData(data,0,0);
  for(let y=0;y<p.rows;y++)for(let x=0;x<p.cols;x++){const type=p.terrain[y*p.cols+x],img=this.images.get(type);if(p.assets[type]?.kind==='ground'&&img)ctx.drawImage(img,x*4,y*4,4,4)}this.overviewCache={key,canvas:c};return c;
 }
 tile(type,x,y,overview=false){const p=this.project,l=lightingSettings(p),n=nightness(p),neighbors=overview?'':[[0,0],[-1,0],[1,0],[0,-1],[0,1]].map(([dx,dy])=>x+dx>=0&&y+dy>=0&&x+dx<p.cols&&y+dy<p.rows?p.terrain[(y+dy)*p.cols+x+dx]:'').join(','),key=[type,x,y,p.cell,p.seed,n,l.blend,l.details,overview,neighbors].join(':');if(this.cache.has(key))return this.cache.get(key);const c=document.createElement('canvas');c.width=c.height=32;const ctx=c.getContext('2d'),asset=p.assets[type],image=this.images.get(type);if(asset?.kind==='ground'&&image)ctx.drawImage(image,0,0,32,32);else{const data=ctx.createImageData(32,32);for(let j=0;j<32;j++)for(let i=0;i<32;i++){const k=(j*32+i)*4,wx=x*p.cell+(i+.5)*p.cell/32,wy=y*p.cell+(j+.5)*p.cell/32,rgb=overview?terrainRGB(type,wx,wy,p.seed,n):groundRGB(p,type,wx,wy,n);data.data.set([...rgb,255],k)}ctx.putImageData(data,0,0);if(l.details&&!overview&&['grass','moss','dirt','sand'].includes(type))for(let i=0;i<3;i++){const a=hash(x*3+i,y,p.seed+20),b=hash(x,y*3+i,p.seed+21);ctx.fillStyle=i===0?(n>.5?'#d8e1dc66':'#fff4be77'):(n>.5?'#182f344d':'#356a363d');ctx.fillRect(2+a*28,2+b*28,i===0?.8:.65,i===0?.8:1.8)}}this.cache.set(key,c);if(this.cache.size>1200)this.cache.delete(this.cache.keys().next().value);return c}
 atmosphere(ctx,{x,y,zoom,width,height,actor}){
  const n=nightness(this.project),l=lightingSettings(this.project);if(n<=.001)return;
  const w=width/zoom,h=height/zoom,strength=n*l.ambient;
  if(strength>0){const light=this.lightCanvas||=document.createElement('canvas'),res=Math.min(1,1024/Math.max(width,height));light.width=Math.max(1,Math.ceil(width*res));light.height=Math.max(1,Math.ceil(height*res));const lc=light.getContext('2d');lc.fillStyle=`rgb(${ambientRGB(this.project).join(',')})`;lc.fillRect(0,0,light.width,light.height);
   if(l.playerLight&&actor){const px=(actor.x-x)*zoom*res,py=(actor.y-y-35)*zoom*res,r=Math.max(1,330*zoom*res),glow=lc.createRadialGradient(px,py,0,px,py,r);glow.addColorStop(0,`rgba(130,130,170,${.5*strength})`);glow.addColorStop(1,'rgba(130,130,170,0)');lc.globalCompositeOperation='lighter';lc.fillStyle=glow;lc.fillRect(0,0,light.width,light.height)}
   ctx.save();ctx.globalCompositeOperation='multiply';ctx.drawImage(light,x,y,w,h);ctx.restore();
  }
  if(l.vignette){ctx.save();const r=Math.max(w,h),g=ctx.createRadialGradient(x+w*.5,y+h*.45,0,x+w*.5,y+h*.45,r*.72);g.addColorStop(0,'rgba(8,10,28,0)');g.addColorStop(1,`rgba(8,10,28,${n*.5})`);ctx.fillStyle=g;ctx.fillRect(x,y,w,h);ctx.restore()}
 }
 draw(ctx,{x=0,y=0,zoom=1,width,height,grid=false,collision=false,selected=null,actor=null,time=0,markers=false,drawActor=null}={}){
  const p=this.project,cs=p.cell,overview=cs*zoom<18,visible=b=>b.x1>=x&&b.y1>=y&&b.x0<=x+width/zoom&&b.y0<=y+height/zoom;ctx.save();ctx.scale(zoom,zoom);ctx.translate(-x,-y);ctx.fillStyle='#0d1520';ctx.fillRect(x,y,width/zoom,height/zoom);
  if(overview)ctx.drawImage(this.overview(),0,0,p.cols*cs,p.rows*cs);
  else for(let gy=Math.max(0,Math.floor(y/cs));gy<Math.min(p.rows,Math.ceil((y+height/zoom)/cs));gy++)for(let gx=Math.max(0,Math.floor(x/cs));gx<Math.min(p.cols,Math.ceil((x+width/zoom)/cs));gx++){const type=p.terrain[gy*p.cols+gx];ctx.drawImage(this.tile(type,gx,gy),gx*cs,gy*cs,cs+.2,cs+.2);if(type==='water'){ctx.strokeStyle='#d5f5ff33';ctx.lineWidth=1/zoom;ctx.beginPath();ctx.moveTo(gx*cs+8,gy*cs+cs*.5+Math.sin(time*2+gx)*3);ctx.lineTo(gx*cs+cs-8,gy*cs+cs*.5+Math.sin(time*2+gx+1)*3);ctx.stroke()}}
  this.drawRoads(ctx,{x,y,zoom,width,height});
  const draw=o=>{if(!visible(objectBounds(p,o)))return;const s=p.assets[o.asset],img=this.images.get(o.asset);ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rotation);ctx.scale(o.scale*(o.flip?-1:1),o.scale);if(img){if(s.kind==='tree'&&actor&&actor.y<o.y&&Math.abs(actor.x-o.x)<s.w*o.scale*.35&&actor.y>o.y-s.h*o.scale)ctx.globalAlpha=.5;ctx.drawImage(img,-s.ax*s.w,-s.ay*s.h,s.w,s.h)}ctx.restore()};
  for(const o of orderedObjects(p).filter(o=>o.layer==='ground'))draw(o);
  const sorted=orderedObjects(p).filter(o=>o.layer==='sorted');let done=false;const drawHero=()=>{if(drawActor)drawActor(ctx,actor);else{ctx.save();ctx.translate(actor.x,actor.y);ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d3ed92';ctx.beginPath();ctx.arc(0,-17,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#2c4936';ctx.lineWidth=2;ctx.stroke();ctx.restore()}};
  for(const o of sorted){if(actor&&!done&&actor.y<o.y){drawHero();done=true}draw(o)}if(actor&&!done)drawHero();for(const o of orderedObjects(p).filter(o=>o.layer==='front'))draw(o);
  this.atmosphere(ctx,{x,y,zoom,width,height,actor});
  // Editor overlays deliberately follow lighting, so night mode cannot hide
  // collision paint, selection handles or spawn/warp markers.
  for(let gy=Math.max(0,Math.floor(y/cs));gy<Math.min(p.rows,Math.ceil((y+height/zoom)/cs));gy++)for(let gx=Math.max(0,Math.floor(x/cs));gx<Math.min(p.cols,Math.ceil((x+width/zoom)/cs));gx++){if(grid&&cs*zoom>=10){ctx.strokeStyle='#101a2c36';ctx.lineWidth=1/zoom;ctx.strokeRect(gx*cs,gy*cs,cs,cs)}if(collision&&(p.blocked[gy*p.cols+gx]||p.walkable[gy*p.cols+gx])){ctx.fillStyle=p.blocked[gy*p.cols+gx]?'#ff675577':'#62d6cd66';ctx.fillRect(gx*cs,gy*cs,cs,cs)}}
  if(collision||selected)for(const o of p.objects){if(!visible(objectBounds(p,o)))continue;const s=p.assets[o.asset];ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rotation);ctx.scale(o.scale*(o.flip?-1:1),o.scale);if(collision)for(const [shape,color]of [[o.collider,'#ff8c77'],[o.walk,'#74f0d2']])if(shape){ctx.strokeStyle=color;ctx.lineWidth=2/(zoom*o.scale);ctx.beginPath();if(shape.type==='ellipse')ctx.ellipse(shape.x,shape.y,shape.w/2,shape.h/2,0,0,Math.PI*2);else ctx.rect(shape.x-shape.w/2,shape.y-shape.h/2,shape.w,shape.h);ctx.stroke()}if(selected===o.id){ctx.strokeStyle='#e1f7a8';ctx.lineWidth=2/(zoom*o.scale);ctx.strokeRect(-s.ax*s.w,-s.ay*s.h,s.w,s.h);ctx.fillStyle='#ffbd80';ctx.beginPath();ctx.arc(0,0,5/o.scale,0,Math.PI*2);ctx.fill()}ctx.restore()}
  this.overlay?.(ctx,{x,y,zoom,width,height});
  if(markers){ctx.save();ctx.lineWidth=2/zoom;ctx.strokeStyle='#c7ef89';ctx.beginPath();ctx.arc(p.spawn.x,p.spawn.y,18,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e5ffbe';ctx.font=`${12/zoom}px system-ui`;ctx.fillText('Spawn',p.spawn.x+22,p.spawn.y);for(const w of p.warps){ctx.strokeStyle='#b99cff';ctx.beginPath();ctx.arc(w.x,w.y,w.radius,0,Math.PI*2);ctx.stroke();ctx.fillText(w.id+' → '+w.to,w.x+w.radius,w.y)}ctx.restore()}ctx.restore();
 }
}
export class DarkinMapPlayer{
 static async load(data,resolve=src=>src){const p=structuredClone(validateMap(data.format==='darkin-map-bundle-v1'?data.project:data)),images=new Map();await Promise.all(Object.entries(p.assets).map(async([id,s])=>{const img=new Image();img.crossOrigin='anonymous';await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Không tải được ảnh map '+id));img.src=resolve(s.src)});images.set(id,img)}));return new DarkinMapPlayer(p,images)}
 constructor(p,images){this.project=p;this.renderer=new MapRenderer(p,images);this.actor={...p.spawn,radius:12};this.time=0}
 update(dt,dx=0,dy=0){this.time+=Math.max(0,dt);moveActor(this.project,this.actor,dx,dy,dt);return warpAt(this.project,this.actor.x,this.actor.y)}
 draw(ctx,width,height,{zoom=1,...opts}={}){const p=this.project,x=Math.max(0,Math.min(p.cols*p.cell-width/zoom,this.actor.x-width/zoom/2)),y=Math.max(0,Math.min(p.rows*p.cell-height/zoom,this.actor.y-height/zoom/2));this.renderer.draw(ctx,{...opts,x,y,zoom,width,height,actor:this.actor,time:this.time})}
}
