import {createFrame,clearFrame,createFx,stockActor} from './vendor/pixelfx/src/core/index.js';
import {encodeCharacterSkillLight,CHARACTER_SKILL_LIGHT_ENCODING} from '../character-skill-runtime.mjs';
let catalogPromise;const modules=new Map();
export const pixelCatalog=()=>catalogPromise||=(fetch(new URL('catalog.json',import.meta.url)).then(r=>{if(!r.ok)throw Error('Không tải được kho PixelFX');return r.json()}));
export async function loadPixelEffect(sourceId){const catalog=await pixelCatalog(),entry=catalog.effects.find(e=>e.sourceId===sourceId);if(!entry)throw Error('Hiệu ứng không có trong kho PixelFX đã kiểm tra');if(!modules.has(sourceId))modules.set(sourceId,import(new URL('vendor/pixelfx/src/fx/'+entry.sourceId+'.js',import.meta.url)));return {entry,module:await modules.get(sourceId),catalog}}
const canvas=(w,h)=>Object.assign(document.createElement('canvas'),{width:w,height:h});
export const PIXEL_BODY_SEPARATION='external-actor-v1';
// Keep reference positions (head/chest/size), but do not give effect code a
// dummy silhouette to recolor, outline, or cut out. Environmental/back/front
// FX still draw continuously through this space; live body FX are separate.
export function externalPixelActor(actor){return {...actor,mask:{...actor.mask,data:new Uint8Array(actor.w*actor.h)},pixels:new Uint32Array(actor.w*actor.h)}}
export class PixelEffect{
 static async load(sourceId,{seed=2,palette=[]}={}){const spec=await loadPixelEffect(sourceId);return new PixelEffect(spec,{seed,palette})}
 constructor(spec,options){Object.assign(this,spec);this.options={seed:options.seed,...(options.palette?.length?{palette:options.palette}:{})};const e=this.entry;this.w=e.size[0]+32;this.h=e.size[1]+32;this.pivot=[e.origin[0]+16,e.origin[1]+16];this.actor=stockActor(e.actor===2?2:1);this.frames={back:createFrame(this.w,this.h),front:createFrame(this.w,this.h)};this.canvases=Object.fromEntries(['backColor','backLight','frontColor','frontLight'].map(k=>[k,canvas(this.w,this.h)]));this.reset()}
 reset(){this.effectActor=this.entry.bodyDependent?externalPixelActor(this.actor):this.actor;this.fx=createFx(this.module,{...this.options,x:this.pivot[0],y:this.pivot[1],actor:this.effectActor});this.last=-1}
 raster(time){time=Math.max(0,Math.min(this.entry.duration,time));const tick=Math.floor(time*30+1e-6);if(tick===this.last)return this.canvases;if(time<this.fx.t)this.reset();if(time>this.fx.t)this.fx.update(time-this.fx.t);
  for(const plane of ['back','front']){const f=this.frames[plane];clearFrame(f);this.fx.draw(f,plane);
   // Never erase pixels in the stock body's area: that made holes in shafts,
   // shields, motes and front layers. No body/outline is drawn in the first place.
   for(const [suffix,values,glow]of [['Color',f.color,false],['Light',f.light,true]]){const cv=this.canvases[plane+suffix],ctx=cv.getContext('2d'),data=ctx.createImageData(f.w,f.h);for(let i=0;i<values.length;i++){const c=values[i],j=i*4;data.data[j]=c&255;data.data[j+1]=(c>>>8)&255;data.data[j+2]=(c>>>16)&255;data.data[j+3]=c>>>24}if(glow)encodeCharacterSkillLight(data.data);ctx.putImageData(data,0,0)}
  }this.last=tick;return this.canvases;
 }
 async bake({onProgress=()=>{},signal}={}){const D=this.entry.duration,w=this.w,h=this.h,columns=Math.max(1,Math.min(Math.floor(2048/w),Math.ceil(Math.sqrt(D*24*h/w)))),maxRows=Math.min(Math.floor(4096/h),Math.floor(6_000_000/(columns*w*h))),count=Math.max(1,Math.min(180,Math.ceil(D*24),columns*maxRows)),rows=Math.ceil(count/columns);if(columns*w>4096||rows*h>4096)throw Error('Hiệu ứng quá lớn để đóng gói');const sheets=Object.fromEntries(Object.keys(this.canvases).map(k=>[k,canvas(columns*w,rows*h)])),nonempty=new Set();this.reset();
  for(let i=0;i<count;i++){if(signal?.aborted)throw Error('Đã hủy đóng gói');const frames=this.raster(i*D/count);for(const[k,cv]of Object.entries(frames)){sheets[k].getContext('2d').drawImage(cv,(i%columns)*w,Math.floor(i/columns)*h);if(!nonempty.has(k)){const data=cv.getContext('2d').getImageData(0,0,w,h).data;for(let j=3;j<data.length;j+=4)if(data[j]){nonempty.add(k);break}}}onProgress((i+1)/count);if(i%5===0)await new Promise(r=>setTimeout(r,0))}
  return {sourceId:this.entry.sourceId,sourceRevision:this.catalog.revision,bodySeparation:PIXEL_BODY_SEPARATION,lightEncoding:CHARACTER_SKILL_LIGHT_ENCODING,variant:this.entry.bodyDependent?'peripheral-only':'original',duration:D,loop:this.entry.loop,w,h,pivot:this.pivot,columns,count,sheets:Object.fromEntries([...nonempty].map(k=>[k,sheets[k].toDataURL('image/png')]))};
 }
}
