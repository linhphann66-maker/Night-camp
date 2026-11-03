import {alphaBounds} from './accessory-image.mjs';

// Conservative local color-component heuristic, NOT a semantic face/rig model.
// Only opt in when there is a substantial warm-colored lower face with dark
// detail. Blue/animal heads, gold hair connected to the face and ambiguous
// images deliberately fall back to silhouette fitting.
export function detectOutfitFace(data,width,height,bounds=alphaBounds(data,width,height)){
 const k=Math.min(1,256/Math.max(width,height)),w=Math.max(1,Math.round(width*k)),h=Math.max(1,Math.round(height*k));
 const mask=new Uint8Array(w*h),seen=new Uint8Array(w*h),queue=new Int32Array(w*h),regions=[],components=[];
 const rgba=i=>{const x=Math.min(width-1,Math.floor((i%w+.5)*width/w)),y=Math.min(height-1,Math.floor((Math.floor(i/w)+.5)*height/h));return (y*width+x)*4};
 for(let i=0;i<mask.length;i++){
  const j=rgba(i),r=data[j],g=data[j+1],b=data[j+2];
  mask[i]=data[j+3]>64&&r>65&&g>40&&r>g*1.055&&g>b*1.055&&r-b>20&&r/g<1.8&&g/Math.max(1,b)<2.15?1:0;
 }
 for(let seed=0;seed<mask.length;seed++){
  if(!mask[seed]||seen[seed])continue;
  let tail=1,x0=w,y0=h,x1=0,y1=0;queue[0]=seed;seen[seed]=1;
  for(let q=0;q<tail;q++){
   const i=queue[q],x=i%w,y=Math.floor(i/w);x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
   for(const [nx,ny] of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){const n=ny*w+nx;if(nx>=0&&ny>=0&&nx<w&&ny<h&&mask[n]&&!seen[n]){seen[n]=1;queue[tail++]=n}}
  }
  const b={x:x0*width/w,y:y0*height/h,w:(x1-x0+1)*width/w,h:(y1-y0+1)*height/h};
  if(tail>=8)components.push({bounds:b,area:tail});
  const rx=(b.x-bounds.x)/bounds.w,ry=(b.y-bounds.y)/bounds.h,rw=b.w/bounds.w,rh=b.h/bounds.h;
  if(tail<30||rw<.22||rw>.87||rh<.16||rh>.62||ry<.22||ry+rh>.99||rx+rw/2<.3||rx+rw/2>.86)continue;
  let dark=0;
  for(let y=y0;y<=y1;y++)for(let x=x0;x<=x1;x++){const j=rgba(y*w+x);if(data[j+3]>64&&Math.max(data[j],data[j+1],data[j+2])<105)dark++}
  if(dark<Math.max(6,tail*.015))continue;
  regions.push({bounds:b,area:tail,method:'warm-face-component',confidence:.75});
 }
 regions.sort((a,b)=>b.area-a.area);
 if(!regions.length||regions[1]?.area>regions[0].area*.65)return null;
 const face=regions[0],core=face.bounds,near=components.filter(c=>{
  const b=c.bounds,cy=b.y+b.h/2,gap=Math.max(core.x-(b.x+b.w),b.x-(core.x+core.w),0);
  return c.area<face.area*.5&&c.area>face.area*.025&&b.w<core.w*.55&&b.h>core.h*.2&&b.h<core.h*.85&&cy>core.y+core.h*.2&&cy<core.y+core.h*.9&&gap<core.w*.35;
 });
 const boxes=[core,...near.map(c=>c.bounds)],x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y));
 return {...face,core,bounds:{x,y,w:Math.max(...boxes.map(b=>b.x+b.w))-x,h:Math.max(...boxes.map(b=>b.y+b.h))-y}};
}

export function measureOutfitPixels(data,width,height,{head=false}={}){
 const bounds=alphaBounds(data,width,height);
 return {width,height,bounds,face:head?detectOutfitFace(data,width,height,bounds):null};
}
export function measureOutfitImage(img,{head=false}={}){
 const width=img.naturalWidth||img.width,height=img.naturalHeight||img.height;
 if(!width||!height||width*height>16_000_000)throw Error('Ảnh quá lớn để tự căn; dùng ảnh dưới 16 triệu pixel');
 const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
 return measureOutfitPixels(ctx.getImageData(0,0,width,height).data,width,height,{head});
}
