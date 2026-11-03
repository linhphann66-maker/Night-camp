// Measurements use the opaque artwork, not the dimensions of its padded PNG.
// No pixels are resampled: the exported sprite carries the final world size.
export function fitOutfitPart(resource,part,reference,sourceImage,referenceImage,{mode='aspect'}={}){
 const check=m=>{
  const b=m?.bounds;
  if(!m||![m.width,m.height,b?.x,b?.y,b?.w,b?.h].every(Number.isFinite)||m.width<=0||m.height<=0||b.w<=0||b.h<=0||b.x<0||b.y<0||b.x+b.w>m.width||b.y+b.h>m.height)throw Error('Không đo được vùng ảnh bộ phận');
 };
 check(sourceImage);check(referenceImage);
 const s=structuredClone(reference),arm=/^arm[FB]$/.test(part),leg=/^leg[FB]$/.test(part);
 const chain=arm?['shoulder','elbow','hand']:leg?['hip','knee','foot']:part==='torso'?['pelvis','neck']:null;
 if(arm||leg){
  const [root,mid,end]=chain;
  s.joints[mid]??=s.joints[root].map((v,i)=>v+(s.joints[end][i]-v)*(arm?.45:.47));
  s.overlap??=arm?3:12;
 }
 if(!['aspect','template'].includes(mode))throw Error('Chế độ căn trang phục không hợp lệ');
 // A long hairstyle is not the neck. Face bounds locate the joint only:
 // stretching a face to another face's bbox would squash eyes and hair.
 const useFace=mode==='template'&&part==='head'&&sourceImage.face?.confidence>=.7&&referenceImage.face?.confidence>=.7;
 const a=sourceImage.bounds,b=referenceImage.bounds;
 if(useFace){check({...sourceImage,bounds:sourceImage.face.bounds});check({...referenceImage,bounds:referenceImage.face.bounds})}
 const map=([x,y])=>[
  a.x+(x/reference.w*referenceImage.width-b.x)/b.w*a.w,
  a.y+(y/reference.h*referenceImage.height-b.y)/b.h*a.h
 ];
 const joints=Object.fromEntries(Object.entries(s.joints).map(([id,p])=>[id,map(p)]));
 if(useFace){
  const sf=sourceImage.face.bounds,rf=referenceImage.face.bounds,n=reference.joints.neck;
  joints.neck=[sf.x+(n[0]/reference.w*referenceImage.width-rf.x)/rf.w*sf.w,sf.y+(n[1]/reference.h*referenceImage.height-rf.y)/rf.h*sf.h];
 }
 let scale=(b.h/referenceImage.height*reference.h)/a.h;
 // Match the original joint-chain length as well as preserving image aspect.
 if(mode==='aspect'&&chain){
  const length=j=>chain.slice(1).reduce((n,id,i)=>n+Math.hypot(j[id][0]-j[chain[i]][0],j[id][1]-j[chain[i]][1]),0);
  const original=length(s.joints),mapped=length(joints);
  if(!Number.isFinite(mapped)||mapped<.001)throw Error('Các khớp của bộ phận quá gần nhau');
  scale=original/mapped;
 }
 const scaleX=mode==='template'?(b.w/referenceImage.width*reference.w)/a.w:scale;
 let scaleY=mode==='template'?(b.h/referenceImage.height*reference.h)/a.h:scale;
 if(useFace){
  const sourceHeight=joints.neck[1]-a.y,targetHeight=reference.joints.neck[1]-b.y/referenceImage.height*reference.h;
  if(sourceHeight<=0||targetHeight<=0)throw Error('Không xác định được khoảng từ đỉnh đầu tới cổ');
  scaleY=targetHeight/sourceHeight;
 }
 s.src=resource.src;s.w=sourceImage.width*scaleX;s.h=sourceImage.height*scaleY;
 if(![s.w,s.h].every(v=>Number.isFinite(v)&&v>0&&v<=1000))throw Error('Ảnh có viền trống quá lớn; hãy cắt gọn ảnh trước khi gán');
 s.joints=Object.fromEntries(Object.entries(joints).map(([id,p])=>[id,[p[0]*scaleX,p[1]*scaleY]]));
 if(part==='head'&&reference.head){
  const [x,y,width]=reference.head;
  s.head=useFace?[(s.joints.neck[0]+x*reference.w-reference.joints.neck[0])/s.w,(s.joints.neck[1]+y*reference.h-reference.joints.neck[1])/s.h,width*reference.w/s.w]:[map([x*reference.w,y*reference.h])[0]/sourceImage.width,map([x*reference.w,y*reference.h])[1]/sourceImage.height,width*reference.w/s.w];
 }
 return s;
}

// Coordinates are tied to the same ground origin / scale as the preview rig.
// Display only: never add guides to projects, sprites, animations or exports.
export function heightGuideLines(height,ground,scale){
 if(![height,ground,scale].every(Number.isFinite)||height<=0||scale<=0)return [];
 const step=Math.max(20,Math.ceil(20/scale/20)*20),lines=[];
 for(let units=0;units*scale<=ground&&lines.length<256;units+=step)lines.push({units,y:ground-units*scale});
 return lines;
}
export function drawHeightGuides(ctx,width,height,ground,scale){
 ctx.save();ctx.strokeStyle='#c6d6ed35';ctx.fillStyle='#c6d6ed99';ctx.font='10px monospace';ctx.lineWidth=1;
 for(const {units,y} of heightGuideLines(height,ground,scale)){
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();
  ctx.fillText(units===0?'0 · mặt đất':String(units),7,y-4);
 }
 ctx.restore();
}
