// Portable map v1: data-only terrain, anchored props, foot collisions and water
// crossings. No Night Camp client globals, network, combat or server required.
import {NATIVE_GROUNDS,NATIVE_MAPS,NATIVE_GROUND_BUILD} from './native-ground.mjs';
export {NATIVE_GROUNDS,NATIVE_MAPS,NATIVE_GROUND_BUILD};
export const TERRAINS={grass:{name:'Cỏ',color:'#76aa5e'},dirt:{name:'Đất / đường',color:'#cdaa76'},stone:{name:'Đá lát',color:'#92929a'},sand:{name:'Cát',color:'#dcc08c'},water:{name:'Nước',color:'#5caccf'},moss:{name:'Rêu / cỏ tối',color:'#567e64'}};
export const MAP_RUNTIME_VERSION=5;
export const MAP_OBJECT_KINDS=Object.freeze(['tree','rock','bush','low','bridge','custom','ground','house','tall','post','fence','seat','fire']);
export const MAP_INTERACTION_SCHEMA=Object.freeze({version:1,collection:'project.objects[].interaction',identity:'mapId + object.id; IDs belong to this map, not separate object packs',actionId:'Shared handler ID; many objects may use mine_spirit_stone',range:'World units from player feet to object-local interaction.point after scale/rotation/flip',reward:'resourceId + inclusive integer min/max; spirit_stone is Linh thạch',respawnSeconds:'Seconds after successful collection; 0 means no respawn',runtime:'interactionDefinitions, nearestInteraction. InteractionSimulator is PREVIEW ONLY: not an authoritative currency or multiplayer system. Game server must validate channeling and atomically credit wallet once + deplete the node.'});
export const MONSTER_SPAWN_SCHEMA=Object.freeze({version:1,collection:'project.monsterSpawns',pointId:'id',monsterTypeId:'monsterId',identity:'mapId + spawnId',coordinates:'World XY at monster feet, same units/origin as project.spawn; not cells or screen pixels',count:'Maximum alive + pending per point',respawnSeconds:'Seconds after death; 0 means no respawn',registry:'Game must map monsterId to its own template/assets/AI. Never infer type from spawn point ID or image filename.',runtime:'MonsterSpawnController: poll(dt) -> requests; confirm(instanceId) on creation, reject on failure, markDead on death. Use one authoritative controller per map instance on server; offline can run locally.'});
const safeId=id=>typeof id==='string'&&/^[a-zA-Z0-9_-]{1,100}$/.test(id)&&!['__proto__','constructor','prototype'].includes(id);
const finite=(v,min,max)=>Number.isFinite(v)&&v>=min&&v<=max;
export const DEFAULT_LIGHTING=Object.freeze({mode:'day',hour:22,ambient:1,vignette:true,playerLight:true,blend:true,details:true});
export function lightingSettings(p){return {...DEFAULT_LIGHTING,...p.lighting}}
export function nightness(p){const l=lightingSettings(p),h=l.hour,n=l.mode==='night'?1:l.mode==='day'?0:h<5||h>=19.5?1:h<7?(7-h)/2:h>=17.5?(h-17.5)/2:0,m=p.environment?.nativeLighting&&NATIVE_MAPS[p.environment.map];return Math.max(n,m?.dusk||0)}
const fail=msg=>{throw Error(msg)};
const validSrc=src=>typeof src==='string'&&(/^assets\/[\w./-]+\.(png|webp|jpg|jpeg)$/.test(src)&&!src.split('/').includes('..')||/^data:image\/(png|webp);base64,[A-Za-z0-9+/=]+$/.test(src));
function shape(s){return s===null||!!s&&['rect','ellipse'].includes(s.type)&&finite(s.x,-4096,4096)&&finite(s.y,-4096,4096)&&finite(s.w,1,4096)&&finite(s.h,1,4096)}
export function validateMap(p){
 if(p?.format!=='darkin-map-v1'||!safeId(p.id)||typeof p.name!=='string'||!p.name.trim()||p.name.length>100)fail('Không đúng project map Darkin v1 / tên map không hợp lệ');
 if(!Number.isInteger(p.cols)||!finite(p.cols,4,128)||!Number.isInteger(p.rows)||!finite(p.rows,4,128)||![32,64,128].includes(p.cell)||!Number.isInteger(p.seed)||!finite(p.seed,0,2147483647))fail('Map tối đa 128×128 ô, cỡ ô 32/64/128');
 if(p.lighting!==undefined){const l=p.lighting;if(!l||typeof l!=='object'||Array.isArray(l)||Object.keys(l).some(k=>!Object.hasOwn(DEFAULT_LIGHTING,k)))fail('Thiết lập ánh sáng không hợp lệ');const v=lightingSettings(p);if(!['day','night','time'].includes(v.mode)||!finite(v.hour,0,23.99)||!finite(v.ambient,0,1)||['vignette','playerLight','blend','details'].some(k=>typeof v[k]!=='boolean'))fail('Giờ / cường độ ánh sáng không hợp lệ')}
 if(p.environment!==undefined&&(!p.environment||Array.isArray(p.environment)||!Object.hasOwn(NATIVE_MAPS,p.environment.map)||typeof p.environment.nativeLighting!=='boolean'))fail('Bảng màu / ánh sáng map nguồn không hợp lệ');
 if(!p.assets||Array.isArray(p.assets)||Object.keys(p.assets).length>1000)fail('Danh mục tài nguyên map không hợp lệ');
 for(const [id,s]of Object.entries(p.assets))if(!safeId(id)||!s||!validSrc(s.src)||!finite(s.w,1,4096)||!finite(s.h,1,4096)||!finite(s.ax,0,1)||!finite(s.ay,0,1)||!MAP_OBJECT_KINDS.includes(s.kind)||!shape(s.collider??null)||!shape(s.walk??null))fail('Tài nguyên không hợp lệ: '+id);
 for(const s of Object.values(p.assets))if(['fadeBehind','groundShadow'].some(k=>s[k]!==undefined&&typeof s[k]!=='boolean')||s.grounding!==undefined&&!['image','anchor'].includes(s.grounding))fail('Thiết lập che nhân vật / chạm đất không hợp lệ');
 const n=p.cols*p.rows;for(const key of ['terrain','blocked','walkable'])if(!Array.isArray(p[key])||p[key].length!==n)fail('Sai số ô lớp '+key);
 if(p.terrain.some(id=>!Object.hasOwn(TERRAINS,id)&&p.assets[id]?.kind!=='ground')||p.blocked.some(v=>v!==0&&v!==1)||p.walkable.some(v=>v!==0&&v!==1))fail('Ô nền / vùng va chạm không hợp lệ');
 if(p.roads!==undefined){if(!Array.isArray(p.roads)||p.roads.length>128)fail('Tối đa 128 đường cong');const ids=new Set();let count=0;for(const r of p.roads){if(!r||!safeId(r.id)||ids.has(r.id)||!['dirt','sand','stone'].includes(r.material)||!finite(r.width,8,512)||!finite(r.softness,0,.9)||!finite(r.smoothness,0,1)||!Array.isArray(r.points)||r.points.length<2||r.points.length>256)fail('Đường cong không hợp lệ: cần 2–256 điểm, rộng 8–512');ids.add(r.id);count+=r.points.length;for(const v of r.points)if(!v||!finite(v.x,0,p.cols*p.cell)||!finite(v.y,0,p.rows*p.cell))fail('Điểm đường cong nằm ngoài map')}if(count>4096)fail('Tối đa 4096 điểm đường cong mỗi map')}
 if(!Array.isArray(p.objects)||p.objects.length>5000)fail('Tối đa 5000 vật thể');const ids=new Set();
 for(const o of p.objects){if(!safeId(o.id)||ids.has(o.id)||!Object.hasOwn(p.assets,o.asset)||p.assets[o.asset].kind==='ground'||!finite(o.x,0,p.cols*p.cell)||!finite(o.y,0,p.rows*p.cell)||!finite(o.scale,.05,10)||!finite(o.rotation,-Math.PI*20,Math.PI*20)||typeof o.flip!=='boolean'||!['ground','sorted','front'].includes(o.layer)||!shape(o.collider??null)||!shape(o.walk??null))fail('Vật thể / điểm neo không hợp lệ');ids.add(o.id);validateInteraction(o.interaction)}
 if(!p.spawn||!finite(p.spawn.x,0,p.cols*p.cell)||!finite(p.spawn.y,0,p.rows*p.cell))fail('Điểm xuất hiện nằm ngoài map');
 if(!Array.isArray(p.warps)||p.warps.length>200)fail('Danh sách cửa map không hợp lệ');
 const warps=new Set();for(const w of p.warps){if(!safeId(w.id)||warps.has(w.id)||!safeId(w.to)||!safeId(w.at)||!finite(w.x,0,p.cols*p.cell)||!finite(w.y,0,p.rows*p.cell)||!finite(w.radius,8,500))fail('Cửa chuyển map không hợp lệ');warps.add(w.id)}
 validateMonsterSpawns(p);
 return p;
}
export function createMap({id='custom_map',name='Map mới',cols=32,rows=24,cell=64,seed=7,terrain='grass'}={}){return validateMap({format:'darkin-map-v1',id,name,cols,rows,cell,seed,assets:{},terrain:Array(cols*rows).fill(terrain),blocked:Array(cols*rows).fill(0),walkable:Array(cols*rows).fill(0),objects:[],roads:[],monsterSpawns:[],spawn:{x:cell*2.5,y:cell*2.5},warps:[]})}
export function resizedMap(project,cols,rows,cell=project.cell){
 const p=structuredClone(project);p.cols=cols;p.rows=rows;p.cell=cell;
 if(!Number.isInteger(cols)||!Number.isInteger(rows)||!finite(cols,4,128)||!finite(rows,4,128))fail('Map từ 4 đến 128 ô mỗi chiều');
 const m=NATIVE_MAPS[project.environment?.map],fill=m?nativeTerrainId(m.biome,NATIVE_GROUNDS[m.biome].kind==='dungeon'?'floor':'base'):'grass';
 for(const key of ['terrain','blocked','walkable']){p[key]=Array(cols*rows).fill(key==='terrain'?fill:0);for(let y=0;y<Math.min(rows,project.rows);y++)for(let x=0;x<Math.min(cols,project.cols);x++)p[key][y*cols+x]=project[key][y*project.cols+x]}
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
// Alpha is measured once per image at bounded resolution; no pixels are cropped
// or resized in the stored asset, and there is no per-frame getImageData call.
export function alphaGeometry(rgba,w,h){
 let x0=w,y0=h,x1=-1,y1=-1;const alpha=new Uint8Array(w*h);for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=rgba[(y*w+x)*4+3];alpha[y*w+x]=a;if(a>=24){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y)}}if(x1<0)return null;
 let sx=0,total=0;const band=Math.max(1,Math.ceil((y1-y0+1)*.04));for(let y=Math.max(y0,y1-band+1);y<=y1;y++)for(let x=x0;x<=x1;x++){const a=alpha[y*w+x];if(a>=24){sx+=(x+.5)*a;total+=a}}
 return {width:w,height:h,alpha,bounds:{x0:x0/w,y0:y0/h,x1:(x1+1)/w,y1:(y1+1)/h},foot:{x:total?sx/total/w:(x0+x1+1)/2/w,y:(y1+1)/h}};
}
const imageGeometryCache=new WeakMap();
export function imageGeometry(image){
 if(!image||typeof image!=='object')return null;if(imageGeometryCache.has(image))return imageGeometryCache.get(image);let result=null;
 try{const w=image.naturalWidth||image.width,h=image.naturalHeight||image.height;if(w&&h&&typeof document!=='undefined'){const k=Math.min(1,256/Math.max(w,h)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(w*k));c.height=Math.max(1,Math.round(h*k));const cc=c.getContext('2d',{willReadFrequently:true});cc.drawImage(image,0,0,c.width,c.height);result=alphaGeometry(cc.getImageData(0,0,c.width,c.height).data,c.width,c.height)}}catch{/* Tainted/unreadable images retain authored anchors and rectangle fallback. */}
 imageGeometryCache.set(image,result);return result;
}
export function objectGroundPoint(p,o,geometry=null){const s=p.assets[o.asset],auto=s.grounding==='image'||s.grounding===undefined&&s.user;if(!auto||!geometry)return {x:o.x,y:o.y};const [x,y]=objectWorld(o,(geometry.foot.x-s.ax)*s.w,(geometry.foot.y-s.ay)*s.h);return {x,y}}
export function orderedObjects(p,images=null){const foot=o=>objectGroundPoint(p,o,imageGeometry(images?.get(o.asset))).y;return [...p.objects].sort((a,b)=>foot(a)-foot(b))}
export function pickObject(p,x,y,images=null){const sorted=orderedObjects(p,images);return [...sorted.filter(o=>o.layer==='ground'),...sorted.filter(o=>o.layer==='sorted'),...sorted.filter(o=>o.layer==='front')].reverse().find(o=>{const s=p.assets[o.asset],[px,py]=objectLocal(o,x,y);return px>=-s.ax*s.w&&px<=(1-s.ax)*s.w&&py>=-s.ay*s.h&&py<=(1-s.ay)*s.h})||null}
export function objectOccludesActor(p,o,actor,geometry=null){
 const s=p.assets[o.asset];if(!actor||o.layer==='ground'||!(s.fadeBehind??(s.kind==='tree'||s.kind==='custom')))return false;const foot=objectGroundPoint(p,o,geometry);if(o.layer!=='front'&&actor.y>=foot.y)return false;
 const height=actor.occlusionHeight||32,r=actor.radius??12;for(const [dx,dy]of [[0,-height*.9],[0,-height*.55],[-r*.5,-height*.55],[r*.5,-height*.55]]){const [lx,ly]=objectLocal(o,actor.x+dx,actor.y+dy),u=lx/s.w+s.ax,v=ly/s.h+s.ay;if(u<0||u>=1||v<0||v>=1)continue;if(!geometry||geometry.alpha[Math.floor(v*geometry.height)*geometry.width+Math.floor(u*geometry.width)]>=24)return true}return false;
}
// Explicit repair: move origins, not artwork. Preserve every placed image and
// footprint in world space, including mirrored/rotated/scaled copies.
export function reanchorAsset(p,id,ax,ay){
 if(!finite(ax,0,1)||!finite(ay,0,1))fail('Neo ảnh phải nằm trong 0–1');const next=structuredClone(p),s=next.assets[id];if(!s||s.kind==='ground')fail('Chọn một vật thể để đặt neo gốc');const dx=(ax-s.ax)*s.w,dy=(ay-s.ay)*s.h,shift=shape=>{if(shape){shape.x-=dx;shape.y-=dy}};
 for(const o of next.objects.filter(o=>o.asset===id)){const [x,y]=objectWorld(o,dx,dy);o.x=x;o.y=y;shift(o.collider);shift(o.walk)}shift(s.collider);shift(s.walk);s.ax=ax;s.ay=ay;s.grounding='anchor';return validateMap(next);
}
export function pointWalkable(p,x,y,{isObjectActive=()=>true}={}){
 const i=cellIndex(p,x,y);if(i<0||p.blocked[i])return false;
 let onBridge=false;for(const o of p.objects){if(!isObjectActive(o.id))continue;const [lx,ly]=objectLocal(o,x,y);if(insideShape(o.collider,lx,ly))return false;if(insideShape(o.walk,lx,ly))onBridge=true}
 return !(p.terrain[i]==='water'||TERRAINS[p.terrain[i]]?.water)||p.walkable[i]===1||onBridge;
}
export function canWalk(p,x,y,r=12,options={}){if(!pointWalkable(p,x,y,options))return false;for(let i=0;i<8;i++)if(!pointWalkable(p,x+Math.cos(i*Math.PI/4)*r,y+Math.sin(i*Math.PI/4)*r*.6,options))return false;return true}
export function moveActor(p,actor,dx,dy,dt,speed=180,options={}){const len=Math.max(1,Math.hypot(dx,dy)),x=dx/len*speed*Math.max(0,Math.min(.1,dt)),y=dy/len*speed*Math.max(0,Math.min(.1,dt)),n=Math.max(1,Math.ceil(Math.hypot(x,y)/5));for(let i=0;i<n;i++){if(canWalk(p,actor.x+x/n,actor.y,actor.radius??12,options))actor.x+=x/n;if(canWalk(p,actor.x,actor.y+y/n,actor.radius??12,options))actor.y+=y/n}return actor}
export function warpAt(p,x,y){return p.warps.find(w=>Math.hypot(w.x-x,w.y-y)<=w.radius)||null}
export function defaultInteraction(type='mine'){
 return {enabled:true,type,actionId:type==='mine'?'mine_spirit_stone':type==='gather'?'gather_resource':'interact_custom',label:type==='mine'?'Đào linh thạch':type==='gather'?'Thu thập':'Tương tác',range:96,point:{x:0,y:0},durationSeconds:3,respawnSeconds:30,deplete:type!=='custom',reward:type==='custom'?null:{resourceId:'spirit_stone',min:3,max:8}};
}
export function validateInteraction(i){
 if(i===undefined)return;
 if(!i||typeof i.enabled!=='boolean'||!['mine','gather','custom'].includes(i.type)||!safeId(i.actionId)||typeof i.label!=='string'||!i.label.trim()||i.label.length>100||!finite(i.range,1,2000)||!i.point||!finite(i.point.x,-4096,4096)||!finite(i.point.y,-4096,4096)||!finite(i.durationSeconds,.1,600)||!finite(i.respawnSeconds,0,86400)||typeof i.deplete!=='boolean')fail('Cấu hình tương tác vật thể không hợp lệ');
 const r=i.reward;if(i.type==='custom'){if(r!==null)fail('Tương tác tùy chỉnh dùng handler của game, không tự phát tiền')}else if(!r||!safeId(r.resourceId)||!Number.isSafeInteger(r.min)||!Number.isSafeInteger(r.max)||!finite(r.min,1,1000000)||!finite(r.max,r.min,1000000))fail('Lượng tài nguyên phải là số nguyên 1–1000000, tối đa không nhỏ hơn tối thiểu');
}
export function interactionPoint(o){return objectWorld(o,o.interaction.point.x,o.interaction.point.y)}
export function drawInteractionMarkers(ctx,p,{zoom=1,selected=null}={}){
 ctx.save();ctx.lineWidth=1.5/zoom;ctx.font=`${11/zoom}px system-ui`;ctx.setLineDash([4/zoom,4/zoom]);for(const o of p.objects){const i=o.interaction;if(!i?.enabled)continue;const [x,y]=interactionPoint(o);ctx.strokeStyle=o.id===selected?'#ffe7a4':'#86e4e4';ctx.fillStyle=ctx.strokeStyle;ctx.beginPath();ctx.arc(x,y,i.range,0,Math.PI*2);ctx.stroke();ctx.fillText(o.id+' · '+i.label,x+8/zoom,y-8/zoom)}ctx.restore();
}
export function interactionDefinitions(data,{enabledOnly=true}={}){
 const p=validateMap(data?.format==='darkin-map-bundle-v1'?data.project:data);
 return p.objects.filter(o=>o.interaction&&(!enabledOnly||o.interaction.enabled)).map(o=>{const [x,y]=interactionPoint(o);return {mapId:p.id,objectId:o.id,assetId:o.asset,x,y,interaction:structuredClone(o.interaction)}});
}
export function nearestInteraction(p,actor,{isAvailable=()=>true,canInteract=()=>true}={}){
 if(!actor||!Number.isFinite(actor.x)||!Number.isFinite(actor.y)||actor.dead||actor.hp===0)return null;let found=null;
 for(const o of p.objects){const i=o.interaction;if(!i?.enabled||!isAvailable(o.id))continue;const [x,y]=interactionPoint(o),distance=Math.hypot(actor.x-x,actor.y-y);if(distance<=i.range&&(!found||distance<found.distance)&&canInteract(o,actor))found={objectId:o.id,mapId:p.id,x,y,distance,interaction:structuredClone(i)}}
 return found;
}
// Single-user design simulation ONLY. Never use its reward as server authority.
// No wallet writes, persistence, networking or multiplayer locking is performed.
export class InteractionSimulator{
 constructor(data,{random=Math.random}={}){this.project=validateMap(data?.format==='darkin-map-bundle-v1'?data.project:data);this.random=random;this.time=0;this.active=null;this.states=new Map(interactionDefinitions(this.project).map(d=>[d.objectId,{definition:d,status:'ready',progress:0,respawnAt:0}]))}
 target(actor){return nearestInteraction(this.project,actor,{isAvailable:id=>this.states.get(id)?.status==='ready'})}
 begin(id,actor){const s=this.states.get(id);if(this.active||s?.status!=='ready')return false;const t=nearestInteraction(this.project,actor,{isAvailable:key=>key===id});if(!t)return false;this.active=id;s.status='working';s.progress=0;s.origin={x:actor.x,y:actor.y};return true}
 cancel(){const s=this.states.get(this.active);if(!s)return false;s.status='ready';s.progress=0;this.active=null;return true}
 update(dt,actor){
  if(!finite(dt,0,86400))fail('Bước thời gian tương tác không hợp lệ');this.time+=dt;const events=[];
  for(const [id,s]of this.states)if(s.status==='cooldown'&&s.respawnAt<=this.time){s.status='ready';s.progress=0;events.push({type:'respawned',objectId:id})}
  const s=this.states.get(this.active);if(!s)return events;const d=s.definition,i=d.interaction;
  if(!actor||actor.dead||actor.hp===0||!Number.isFinite(actor.x)||!Number.isFinite(actor.y)||Math.hypot(actor.x-d.x,actor.y-d.y)>i.range||Math.hypot(actor.x-s.origin.x,actor.y-s.origin.y)>2){const id=this.active;this.cancel();events.push({type:'cancelled',objectId:id});return events}
  const progress=Math.min(i.durationSeconds,s.progress+dt);if(progress<i.durationSeconds){s.progress=progress;return events}
  let reward=null;if(i.reward){const random=this.random();if(!finite(random,0,1)||random===1)fail('Nguồn random phải nằm trong [0,1)');reward={resourceId:i.reward.resourceId,amount:i.reward.min+Math.floor(random*(i.reward.max-i.reward.min+1))}}
  s.progress=progress;s.status=i.respawnSeconds>0?'cooldown':i.deplete?'depleted':'ready';s.respawnAt=this.time+i.respawnSeconds;this.active=null;events.push({type:'completed',mapId:this.project.id,objectId:d.objectId,actionId:i.actionId,reward});return events;
 }
 objectState(id){const s=this.states.get(id);if(!s)return null;const i=s.definition.interaction,hidden=i.deplete&&['cooldown','depleted'].includes(s.status),shake=s.status==='working';return {hidden,shakeX:shake?Math.sin(this.time*45)*1.5:0,shakeAngle:shake?Math.sin(this.time*33)*.012:0}}
 walkOptions(){return {isObjectActive:id=>!this.objectState(id)?.hidden}}
}
export function validateMonsterSpawns(p){
 if(p.monsterSpawns===undefined)return;
 if(!Array.isArray(p.monsterSpawns)||p.monsterSpawns.length>256)fail('Tối đa 256 điểm sinh quái');
 const ids=new Set();let total=0;
 for(const s of p.monsterSpawns){
  if(!s||!safeId(s.id)||ids.has(s.id)||!safeId(s.monsterId)||typeof s.name!=='string'||s.name.length>100||typeof s.enabled!=='boolean'||!finite(s.x,0,p.cols*p.cell)||!finite(s.y,0,p.rows*p.cell)||s.x>=p.cols*p.cell||s.y>=p.rows*p.cell||!finite(s.radius,0,1024)||!Number.isInteger(s.count)||!finite(s.count,1,50)||!finite(s.respawnSeconds,0,86400))fail('Điểm sinh quái không hợp lệ: ID phải riêng, tọa độ trong map, 1–50 quái, bán kính 0–1024, hồi sinh 0–86400 giây');
  ids.add(s.id);total+=s.count;
 }
 if(total>1024)fail('Tổng giới hạn số quái tại các điểm không quá 1024 mỗi map');
}
export function monsterSpawnDefinitions(data,{enabledOnly=true}={}){
 const p=validateMap(data?.format==='darkin-map-bundle-v1'?data.project:data);
 return (p.monsterSpawns||[]).filter(s=>!enabledOnly||s.enabled).map(s=>({...structuredClone(s),mapId:p.id}));
}
// World coordinates, not tiles or camera pixels. Fail closed on water/walls.
export function monsterSpawnPosition(p,s,{random=Math.random,actorRadius=12,canSpawn=()=>true}={}){
 if(!finite(actorRadius,0,256))fail('Bán kính chân quái không hợp lệ');
 const rand=()=>{const v=random();if(!finite(v,0,1)||v===1)fail('Nguồn random phải trả số trong [0,1)');return v};
 for(let i=0;i<(s.radius?33:1);i++){
  const angle=s.radius&&i<32?rand()*Math.PI*2:0,r=s.radius&&i<32?Math.sqrt(rand())*s.radius:0,x=s.x+Math.cos(angle)*r,y=s.y+Math.sin(angle)*r;
  if(canWalk(p,x,y,actorRadius)&&canSpawn(x,y,s))return {x,y};
 }
 return null;
}
// Pure scheduling: game/server owns entities, combat, AI and death events.
// Pending requests reserve capacity until confirm/reject, avoiding async dupes.
export class MonsterSpawnController{
 constructor(data,{monsterIds,random=Math.random,actorRadius=12,canSpawn=()=>true}={}){
  this.project=validateMap(data?.format==='darkin-map-bundle-v1'?data.project:data);this.definitions=monsterSpawnDefinitions(this.project);this.time=0;this.instances=new Map();this.options={random,actorRadius,canSpawn};
  if(!Array.isArray(monsterIds)&&!(monsterIds instanceof Set))fail('Truyền monsterIds từ registry quái của game');
  const known=new Set(monsterIds);for(const s of this.definitions)if(!known.has(s.monsterId))fail('Game chưa đăng ký monsterId='+s.monsterId+' (điểm '+s.id+')');
  this.slots=this.definitions.flatMap(s=>Array.from({length:s.count},(_,slot)=>({definition:s,slot,state:'ready',readyAt:0,sequence:0,instanceId:null})));
 }
 poll(dt=0){
  if(!finite(dt,0,86400))fail('Bước thời gian sinh quái phải từ 0 đến 86400 giây');this.time+=dt;const requests=[];
  try{for(const slot of this.slots){if(!['ready','waiting'].includes(slot.state)||slot.readyAt>this.time)continue;
   const s=slot.definition,pos=monsterSpawnPosition(this.project,s,this.options);if(!pos){slot.readyAt=this.time+1;continue}
   const instanceId=this.project.id+':'+s.id+':'+slot.slot+':'+(++slot.sequence);slot.state='pending';slot.instanceId=instanceId;this.instances.set(instanceId,slot);
   requests.push({instanceId,mapId:this.project.id,spawnId:s.id,monsterId:s.monsterId,slot:slot.slot,...pos});
  }}catch(error){for(const r of requests)this.reject(r.instanceId);throw error}
  return requests;
 }
 confirm(instanceId){const s=this.instances.get(instanceId);if(!s||s.state!=='pending')return false;s.state='alive';return true}
 reject(instanceId){const s=this.instances.get(instanceId);if(!s||s.state!=='pending')return false;this.instances.delete(instanceId);s.instanceId=null;s.state='ready';s.readyAt=this.time+1;return true}
 markDead(instanceId){const s=this.instances.get(instanceId);if(!s||s.state!=='alive')return false;this.instances.delete(instanceId);s.instanceId=null;s.state=s.definition.respawnSeconds>0?'waiting':'retired';s.readyAt=this.time+s.definition.respawnSeconds;return true}
 stats(){return this.slots.reduce((v,s)=>(v[s.state]=(v[s.state]||0)+1,v),{ready:0,pending:0,alive:0,waiting:0,retired:0})}
}
export function drawMonsterSpawnMarkers(ctx,p,{zoom=1,selected=null}={}){
 ctx.save();ctx.font=`${12/zoom}px system-ui`;ctx.lineWidth=1.5/zoom;
 for(const s of p.monsterSpawns||[]){ctx.strokeStyle=s.id===selected?'#fff4b0':s.enabled?'#ffad87':'#9aabb8';ctx.fillStyle=ctx.strokeStyle;ctx.setLineDash(s.enabled?[]:[4/zoom,4/zoom]);
  if(s.radius){ctx.beginPath();ctx.arc(s.x,s.y,s.radius,0,Math.PI*2);ctx.stroke()}
  ctx.setLineDash([]);ctx.beginPath();ctx.arc(s.x,s.y,(s.id===selected?10:7)/zoom,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.moveTo(s.x-4/zoom,s.y);ctx.lineTo(s.x+4/zoom,s.y);ctx.moveTo(s.x,s.y-4/zoom);ctx.lineTo(s.x,s.y+4/zoom);ctx.stroke();
  ctx.fillText(s.id+' → '+s.monsterId+' ×'+s.count+(s.enabled?'':' · tắt'),s.x+14/zoom,s.y-10/zoom);
 }ctx.restore();
}
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
export const NATIVE_TERRAINS={};
export function nativeTerrainId(biome,channel='base'){return 'nc_'+biome+'__'+channel}
const channelNames={base:'Nền chính',road:'Đường đất',roadEdge:'Mép đường',roadMid:'Giữa đường',water:'Nước',deep:'Nước sâu',shore:'Cát / bờ hồ',soil:'Đất trồng',soilEdge:'Mép đất trồng',furrow:'Rãnh đất',ridge:'Luống đất',mesaTop:'Mặt cao nguyên',mesaRim:'Viền cao nguyên',mesaFace:'Vách đá',mesaFace2:'Vách đá tối',floor:'Sàn hang',floor2:'Sàn sáng',rock:'Đá khối',rock2:'Đá sáng',pool:'Hồ ngầm / dung nham',clearing:'Cỏ bãi trống',ash:'Tro lửa'};
for(const [biome,b]of Object.entries(NATIVE_GROUNDS))for(const channel of b.kind==='camp'?['base','clearing','road','ash']:Object.keys(channelNames).filter(k=>b[k]&&k!=='clearing'&&k!=='ash')){const id=nativeTerrainId(biome,channel),entry={biome,channel,name:channelNames[channel]};NATIVE_TERRAINS[id]=entry;TERRAINS[id]={name:entry.name,color:'#566b65',native:entry,water:['water','deep','pool'].includes(channel)}}
function sourceNoise(x,y,s){const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),a=hash(ix,iy,s),b=hash(ix+1,iy,s),c=hash(ix,iy+1,s),d=hash(ix+1,iy+1,s);return a+(b-a)*u+(c-a)*v+(a-b-c+d)*u*v}
function sourceFbm(x,y,s,oct){let sum=0,amp=.5,f=1,norm=0;for(let i=0;i<oct;i++){sum+=amp*sourceNoise(x*f,y*f,s+i*31);norm+=amp;amp*=.5;f*=2}return sum/norm}
const bytes=rgb=>Array.from(new Uint8ClampedArray(rgb));
export function nativeGroundRGB(biome,channel,x,y,seed,n=0){
 const b=NATIVE_GROUNDS[biome];if(!b)throw Error('Không có bảng màu gốc '+biome);let day,night;
 if(b.kind==='field'){
  if(channel==='base'){const t=clamp((sourceFbm(x/b.patchScale,y/b.patchScale,seed+3,2)-.44)/.18),v=(sourceNoise(x/64,y/64,seed+9)-.5)*b.vary;night=b.base.n.map((c,i)=>c+(b.patch.n[i]-c)*t+v*(i===2?.8:1));day=b.base.d.map((c,i)=>c+(b.patch.d[i]-c)*t+v*(i===2?1:1.3))}
  else{const c=b[channel];if(!c?.d||!c?.n)throw Error('Không có màu nền '+channel);day=c.d;night=c.n}
 }else if(b.kind==='dungeon'){
  const S=seed*5+3;if(channel==='floor'){const t=clamp((sourceFbm(x/420,y/420,S+1,2)-.42)/.2),v=(sourceFbm(x/60,y/60,S+2,2)-.5)*18;day=night=mix(b.floor,b.floor2,t).map(c=>c+v)}
  else if(channel==='pool'){const t=clamp(sourceNoise(x/60,y/60,S+9)*1.4-.2);day=night=mix(b.pool.c2,b.pool.c1,t)}
  else day=night=b[channel];
 }else{
  const v=(sourceFbm(x/320,y/320,5,3)-.5)*22+(sourceNoise(x/58,y/58,8)-.5)*8;
  const e=Math.min(...b.CORNERS.map(c=>((x-c.x)/c.rx)**2+((y-c.y)/c.ry)**2)),open=channel==='clearing'?.75:clamp(1.15-Math.sqrt(e)*.55)*.75;
  day=[88+v*1.3+open*22,132+v*1.4+open*22,80+v+open*8];night=[46+v+open*8,64+v+open*10,78+v*.9+open*4];
  if(channel==='road'){const w=sourceNoise(x/36,y/36,12)*10;night=[64+w*.5,66+w*.4,80+w*.3];day=[184+w,154+w,110+w*.6]}if(channel==='ash'){night=[52,48,60];day=[122,104,86]}
 }
 // Original ground is written to Uint8ClampedArray BEFORE day/night blending.
 return bytes(mix(bytes(day),bytes(night),clamp(n)));
}
for(const [id,{biome,channel}]of Object.entries(NATIVE_TERRAINS))TERRAINS[id].color=`rgb(${nativeGroundRGB(biome,channel,100,100,7,0).join(',')})`;
export function nativeRoadMaterial(p,material){const m=NATIVE_MAPS[p.environment?.map];if(!m||material==='stone')return material;const b=NATIVE_GROUNDS[m.biome],channel=b.kind==='dungeon'?'floor':material==='sand'&&b.shore?'shore':'road';return Object.hasOwn(NATIVE_TERRAINS,nativeTerrainId(m.biome,channel))?nativeTerrainId(m.biome,channel):material}
export function applyNativeEnvironment(project,mapId,{nativeLighting=true,useSeed=true}={}){
 const m=NATIVE_MAPS[mapId];if(!m)throw Error('Không tìm thấy map nguồn');const p=structuredClone(project),b=NATIVE_GROUNDS[m.biome],base=b.kind==='dungeon'?'floor':'base',alias={grass:base,moss:base,dirt:b.kind==='dungeon'?'floor':'road',sand:b.shore?'shore':base,water:b.water?'water':b.pool?'pool':null};
 p.terrain=p.terrain.map(id=>{const channel=NATIVE_TERRAINS[id]?.channel||alias[id],target=channel&&nativeTerrainId(m.biome,channel);return target&&Object.hasOwn(NATIVE_TERRAINS,target)?target:id});p.environment={map:mapId,nativeLighting};if(useSeed)p.seed=m.seed;return validateMap(p);
}
export function terrainRGB(type,x,y,seed,n=0){
 if(NATIVE_TERRAINS[type]){const {biome,channel}=NATIVE_TERRAINS[type];return nativeGroundRGB(biome,channel,x,y,seed,n)}
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
export function ambientRGB(p){const l=lightingSettings(p),n=nightness(p),m=p.environment?.nativeLighting&&NATIVE_MAPS[p.environment.map];if(m){const h=l.mode==='time'?l.hour:l.mode==='day'?12:22,warm=h>12?[255,164,108]:[255,184,196],k=Math.sin(Math.PI*n)*(h>12?.6:.45),sky=mix(mix([255,255,255],[172,186,232],n),warm,k).map(Math.round),target=m.ambient||sky.map((c,i)=>Math.min(255,Math.round(c*(1-m.tint[i]*n))+m.add[i]*n));return mix([255,255,255],target,l.ambient)}const warm=l.hour>12?[255,164,108]:[255,184,196],k=l.mode==='time'?Math.sin(Math.PI*n)*(l.hour>12?.6:.45):0;return mix([255,255,255],mix(mix([255,255,255],[172,186,232],n),warm,k),l.ambient).map(Math.round)}
export class MapRenderer{
 constructor(project,images=new Map()){this.project=project;this.images=images;this.cache=new Map()}
 drawGroundShadows(ctx,objects,visible){for(const o of objects){const s=this.project.assets[o.asset];if(s.kind==='ground'||!(s.groundShadow??!!s.user)||!visible(objectBounds(this.project,o)))continue;const g=imageGeometry(this.images.get(o.asset));if(!g)continue;const f=objectGroundPoint(this.project,o,g),w=(g.bounds.x1-g.bounds.x0)*s.w*o.scale,rx=Math.max(3,w*.2),ry=Math.max(1.5,rx*.23);ctx.save();ctx.translate(f.x,f.y);ctx.scale(rx,ry);const gradient=ctx.createRadialGradient(0,0,0,0,0,1);gradient.addColorStop(0,'rgba(8,17,20,.3)');gradient.addColorStop(1,'rgba(8,17,20,0)');ctx.fillStyle=gradient;ctx.fillRect(-1,-1,2,2);ctx.restore()}}
 roadTexture(ctx,material){const p=this.project,type=nativeRoadMaterial(p,material),key=[type,p.seed,nightness(p)].join(':');this.roadTextures||=new Map();if(this.roadTextures.has(key))return this.roadTextures.get(key);const c=document.createElement('canvas');c.width=300;c.height=210;const cc=c.getContext('2d'),data=cc.createImageData(c.width,c.height),n=nightness(p);for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)data.data.set([...roadTextureRGB(type,x,y,p.seed,n),255],(y*c.width+x)*4);cc.putImageData(data,0,0);const pattern=ctx.createPattern(c,'repeat');this.roadTextures.set(key,pattern);if(this.roadTextures.size>12)this.roadTextures.delete(this.roadTextures.keys().next().value);return pattern}
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
 draw(ctx,{x=0,y=0,zoom=1,width,height,grid=false,collision=false,selected=null,actor=null,time=0,markers=false,monsterMarkers=markers,selectedMonsterSpawn=null,interactionMarkers=false,objectState=null,drawActor=null}={}){
  const p=this.project,cs=p.cell,overview=cs*zoom<18,visible=b=>b.x1>=x&&b.y1>=y&&b.x0<=x+width/zoom&&b.y0<=y+height/zoom;ctx.save();ctx.scale(zoom,zoom);ctx.translate(-x,-y);ctx.fillStyle='#0d1520';ctx.fillRect(x,y,width/zoom,height/zoom);
  if(overview)ctx.drawImage(this.overview(),0,0,p.cols*cs,p.rows*cs);
  else for(let gy=Math.max(0,Math.floor(y/cs));gy<Math.min(p.rows,Math.ceil((y+height/zoom)/cs));gy++)for(let gx=Math.max(0,Math.floor(x/cs));gx<Math.min(p.cols,Math.ceil((x+width/zoom)/cs));gx++){const type=p.terrain[gy*p.cols+gx];ctx.drawImage(this.tile(type,gx,gy),gx*cs,gy*cs,cs+.2,cs+.2);if(type==='water'){ctx.strokeStyle='#d5f5ff33';ctx.lineWidth=1/zoom;ctx.beginPath();ctx.moveTo(gx*cs+8,gy*cs+cs*.5+Math.sin(time*2+gx)*3);ctx.lineTo(gx*cs+cs-8,gy*cs+cs*.5+Math.sin(time*2+gx+1)*3);ctx.stroke()}}
  this.drawRoads(ctx,{x,y,zoom,width,height});
  const objects=orderedObjects(p,this.images).filter(o=>!objectState?.(o.id)?.hidden);this.drawGroundShadows(ctx,objects,visible);
  const draw=o=>{if(!visible(objectBounds(p,o)))return;const s=p.assets[o.asset],img=this.images.get(o.asset),v=objectState?.(o.id);ctx.save();ctx.translate(o.x+(v?.shakeX||0),o.y);ctx.rotate(o.rotation+(v?.shakeAngle||0));ctx.scale(o.scale*(o.flip?-1:1),o.scale);if(img){if(objectOccludesActor(p,o,actor,imageGeometry(img)))ctx.globalAlpha*=.5;ctx.drawImage(img,-s.ax*s.w,-s.ay*s.h,s.w,s.h)}ctx.restore()};
  for(const o of objects.filter(o=>o.layer==='ground'))draw(o);
  const sorted=objects.filter(o=>o.layer==='sorted');let done=false;const drawHero=()=>{if(drawActor)drawActor(ctx,actor);else{ctx.save();ctx.translate(actor.x,actor.y);ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(0,0,14,6,0,0,Math.PI*2);ctx.fill();ctx.fillStyle='#d3ed92';ctx.beginPath();ctx.arc(0,-17,12,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#2c4936';ctx.lineWidth=2;ctx.stroke();ctx.restore()}};
  for(const o of sorted){if(actor&&!done&&actor.y<objectGroundPoint(p,o,imageGeometry(this.images.get(o.asset))).y){drawHero();done=true}draw(o)}if(actor&&!done)drawHero();for(const o of objects.filter(o=>o.layer==='front'))draw(o);
  this.atmosphere(ctx,{x,y,zoom,width,height,actor});
  // Editor overlays deliberately follow lighting, so night mode cannot hide
  // collision paint, selection handles or spawn/warp markers.
  for(let gy=Math.max(0,Math.floor(y/cs));gy<Math.min(p.rows,Math.ceil((y+height/zoom)/cs));gy++)for(let gx=Math.max(0,Math.floor(x/cs));gx<Math.min(p.cols,Math.ceil((x+width/zoom)/cs));gx++){if(grid&&cs*zoom>=10){ctx.strokeStyle='#101a2c36';ctx.lineWidth=1/zoom;ctx.strokeRect(gx*cs,gy*cs,cs,cs)}if(collision&&(p.blocked[gy*p.cols+gx]||p.walkable[gy*p.cols+gx])){ctx.fillStyle=p.blocked[gy*p.cols+gx]?'#ff675577':'#62d6cd66';ctx.fillRect(gx*cs,gy*cs,cs,cs)}}
  if(collision||selected)for(const o of objects){if(!visible(objectBounds(p,o)))continue;const s=p.assets[o.asset];ctx.save();ctx.translate(o.x,o.y);ctx.rotate(o.rotation);ctx.scale(o.scale*(o.flip?-1:1),o.scale);if(collision)for(const [shape,color]of [[o.collider,'#ff8c77'],[o.walk,'#74f0d2']])if(shape){ctx.strokeStyle=color;ctx.lineWidth=2/(zoom*o.scale);ctx.beginPath();if(shape.type==='ellipse')ctx.ellipse(shape.x,shape.y,shape.w/2,shape.h/2,0,0,Math.PI*2);else ctx.rect(shape.x-shape.w/2,shape.y-shape.h/2,shape.w,shape.h);ctx.stroke()}if(selected===o.id){ctx.strokeStyle='#e1f7a8';ctx.lineWidth=2/(zoom*o.scale);ctx.strokeRect(-s.ax*s.w,-s.ay*s.h,s.w,s.h);ctx.fillStyle='#ffbd80';ctx.beginPath();ctx.arc(0,0,5/o.scale,0,Math.PI*2);ctx.fill()}ctx.restore()}
  this.overlay?.(ctx,{x,y,zoom,width,height});
  if(monsterMarkers)drawMonsterSpawnMarkers(ctx,p,{zoom,selected:selectedMonsterSpawn});
  if(interactionMarkers)drawInteractionMarkers(ctx,p,{zoom,selected});
  if(markers){ctx.save();ctx.lineWidth=2/zoom;ctx.strokeStyle='#c7ef89';ctx.beginPath();ctx.arc(p.spawn.x,p.spawn.y,18,0,Math.PI*2);ctx.stroke();ctx.fillStyle='#e5ffbe';ctx.font=`${12/zoom}px system-ui`;ctx.fillText('Spawn',p.spawn.x+22,p.spawn.y);for(const w of p.warps){ctx.strokeStyle='#b99cff';ctx.beginPath();ctx.arc(w.x,w.y,w.radius,0,Math.PI*2);ctx.stroke();ctx.fillText(w.id+' → '+w.to,w.x+w.radius,w.y)}ctx.restore()}ctx.restore();
 }
}
export class DarkinMapPlayer{
 static async load(data,resolve=src=>src){const p=structuredClone(validateMap(data.format==='darkin-map-bundle-v1'?data.project:data)),images=new Map();await Promise.all(Object.entries(p.assets).map(async([id,s])=>{const img=new Image();img.crossOrigin='anonymous';await new Promise((ok,no)=>{img.onload=ok;img.onerror=()=>no(Error('Không tải được ảnh map '+id));img.src=resolve(s.src)});images.set(id,img)}));return new DarkinMapPlayer(p,images)}
 constructor(p,images){this.project=p;this.renderer=new MapRenderer(p,images);this.actor={...p.spawn,radius:12};this.time=0}
 getMonsterSpawns(options){return monsterSpawnDefinitions(this.project,options)}
 getInteractions(options){return interactionDefinitions(this.project,options)}
 update(dt,dx=0,dy=0,walkOptions={}){this.time+=Math.max(0,dt);moveActor(this.project,this.actor,dx,dy,dt,180,walkOptions);return warpAt(this.project,this.actor.x,this.actor.y)}
 draw(ctx,width,height,{zoom=1,...opts}={}){const p=this.project,x=Math.max(0,Math.min(p.cols*p.cell-width/zoom,this.actor.x-width/zoom/2)),y=Math.max(0,Math.min(p.rows*p.cell-height/zoom,this.actor.y-height/zoom/2));this.renderer.draw(ctx,{...opts,x,y,zoom,width,height,actor:this.actor,time:this.time})}
}
