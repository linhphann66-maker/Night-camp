import {connectSource} from './source.mjs';
import {detectPieces,guessBackground,removeBorderBackground} from './slice.mjs';
import {fitOutfitPart,drawHeightGuides} from './outfit-fit.mjs';
import {measureOutfitImage} from './outfit-measure.mjs';
import {ensureMiddleJoints} from './rig-edit.mjs';
import {PARTS,validate,gameExport} from './model.mjs';
const $=id=>document.getElementById(id),NC=window.NC;
const names={head:'Đầu',torso:'Thân',armF:'Tay gần',armB:'Tay xa',legF:'Chân gần',legB:'Chân xa'};
let source,reference,variants=[],ready=false,playing=false,time=0,last=0,loadId=0;
const imageCache=new Map();
const image=async src=>{
 if(!imageCache.has(src))imageCache.set(src,new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Không tải được ảnh mẫu; chọn sprite sheet bằng nút tải ảnh bên dưới.'));im.src=src}));
 try{return await imageCache.get(src)}catch(e){imageCache.delete(src);throw e}
};
const safe=fn=>async(...args)=>{try{await fn(...args)}catch(e){$('testStatus').textContent='Lỗi: '+e.message;console.error(e)}};
const context=v=>NC.animCtx(v.equip,{walk:time*Math.PI*2,moving:['walk','run'].includes($('testAnimation').value)});
const attack=()=>Object.keys(NC.Anim.CLIPS).find(id=>/sword/.test(id))||Object.keys(NC.Anim.CLIPS)[0];
const clipId=()=>$('testAnimation').value==='attack'?attack():$('testAnimation').value;
const pose=v=>NC.Anim.sample(clipId(),time,context(v));
async function variant(id,parts){
 const rig='fit_test_'+id+'_'+loadId,equip={top:rig+'_top',weapon:'fit_test_weapon'};
 ensureMiddleJoints(parts);
 for(const part of PARTS){const s=parts[part];NC.SPR[`rig_${rig}_${part}`]={...s,name:`rig_${rig}_${part}`,img:await image(source.assetURL(s.src))}}
 NC.ITEMS[equip.top]={rig};return {id,parts,equip,rig:NC.getRig(rig)};
}
function metric(part,s,m){
 const b=m.bounds;
 return [b.w/m.width*s.w,part==='head'?s.joints.neck[1]-b.y/m.height*s.h:b.h/m.height*s.h];
}
async function loadSheet(src){
 const mine=++loadId;ready=false;playing=false;time=0;$('testPlay').textContent='▶ Phát';
 $('testProject').disabled=$('testBundle').disabled=true;$('testStatus').textContent='Đang tách đúng 6 bộ phận và tự căn theo talon…';
 const img=await image(src),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
 if(canvas.width*canvas.height>4194304)throw Error('Bản test nhận ảnh tối đa 4 triệu pixel; ảnh lớn hơn hãy dùng Studio');
 const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
 const data=ctx.getImageData(0,0,canvas.width,canvas.height),background=guessBackground(data.data,canvas.width,canvas.height);
 const {pixels}=removeBorderBackground(data.data,canvas.width,canvas.height,{background,tolerance:28});ctx.putImageData(new ImageData(pixels,canvas.width,canvas.height),0,0);
 const boxes=detectPieces(pixels,canvas.width,canvas.height,{minArea:12}).sort((a,b)=>a.x-b.x);
 if(boxes.length!==6)throw Error('Ảnh có '+boxes.length+' mảnh. Dùng ảnh tiên tộc 6 mảnh hoặc gán vai trò trong Studio.');
 const fitted={},legacy={},measurements={},refMeasurements={};
 for(let i=0;i<6;i++){
  const part=PARTS[i],b=boxes[i],crop=document.createElement('canvas');crop.width=b.w+4;crop.height=b.h+4;crop.getContext('2d').drawImage(canvas,b.x,b.y,b.w,b.h,2,2,b.w,b.h);
  const resource={src:crop.toDataURL('image/png')},originalImage=await image(source.assetURL(reference[part].src));
  const m=measureOutfitImage(crop,{head:part==='head'}),rm=measureOutfitImage(originalImage,{head:part==='head'});measurements[part]=m;refMeasurements[part]=rm;
  fitted[part]=fitOutfitPart(resource,part,reference[part],m,rm,{mode:'template'});
  legacy[part]=fitOutfitPart(resource,part,reference[part],m,rm,{mode:'aspect'});
 }
 if(mine!==loadId)return;
 NC.GRIPFIX=false;NC.BendCache.on=false;
 const prepared=await Promise.all([variant('fitted',fitted),variant('original',structuredClone(reference)),variant('legacy',legacy)]);
 if(mine!==loadId)return;variants=prepared;
 const rows=PARTS.map(part=>{
  const a=metric(part,fitted[part],measurements[part]),b=metric(part,reference[part],refMeasurements[part]);
  const error=Math.max(...a.map((v,i)=>Math.abs(v/b[i]-1)*100)),tr=document.createElement('tr');tr.dataset.part=part;tr.dataset.error=String(error);
  for(const value of [names[part]+(part==='head'?' · rộng / cổ→đỉnh':''),a.map(x=>x.toFixed(2)).join(' × '),b.map(x=>x.toFixed(2)).join(' × '),error.toFixed(3)+'%']){const td=document.createElement('td');td.textContent=value;tr.append(td)}
  return tr;
 });
 $('fitMetrics').replaceChildren(...rows);
 $('faceReport').textContent=measurements.head.face&&refMeasurements.head.face?'Đã tìm thấy vùng mặt ở cả ảnh tiên tộc và talon: đặt mốc cổ theo mặt, không theo đuôi tóc. Chiều cao toàn ảnh đầu vẫn có thể lớn hơn do tóc xõa xuống dưới cổ.':'Không đủ tin cậy để xác định mặt: dùng khung bao ảnh. Có thể cần chỉnh mốc cổ trong Studio.';
 ready=true;$('testProject').disabled=$('testBundle').disabled=false;$('testStatus').textContent='Sẵn sàng · Đã tự tách 6 mảnh · Khớp chuẩn talon · Không chỉnh tay kích thước/khớp';
}
function render(){
 if(!ready)return;
 for(const [index,id] of ['testFitted','testOriginal','testLegacy'].entries()){
  const canvas=$(id);if(!canvas.offsetWidth)continue;
  const r=canvas.getBoundingClientRect(),dpr=devicePixelRatio||1;
  if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr)}
  const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
  const ground=r.height*.91,scale=Math.min(r.width/135,r.height*.8/150)*+$('testZoom').value,v=variants[index];
  if($('testGuides').checked)drawHeightGuides(ctx,r.width,r.height,ground,scale*.87);
  const P={...pose(v),face:$('testFlip').checked?-1:1};NC.drawRig(ctx,v.rig,v.equip,P,r.width/2,ground,{scale,noWeapon:true});
  if($('testBones').checked){const joints=NC.rigJoints(v.equip,P,r.width/2,ground,scale);ctx.fillStyle='#d3ed92';for(const [id,p] of Object.entries(joints)){if(id==='wHand'||id==='wTip')continue;ctx.beginPath();ctx.arc(...p,2.5,0,Math.PI*2);ctx.fill()}}
 }
}
function frame(now){
 if(playing&&ready){const duration=NC.Anim.CLIPS[clipId()]?.dur||1;time=(time+Math.min(.05,(now-last)/1000))%duration}
 last=now;try{render()}catch(e){ready=false;$('testStatus').textContent='Lỗi render: '+e.message;console.error(e)}requestAnimationFrame(frame);
}
function project(){
 const v=variants[0],id=clipId(),definition=NC.Anim.CLIPS[id],dur=definition?.dur||1,kind=$('testAnimation').value==='attack'?'attack':['walk','run'].includes(id)?'walk':'loop';
 const keys=Array.from({length:31},(_,i)=>{const t=i*dur/30;return {t,curve:'lin',P:NC.Anim.sample(id,t,NC.animCtx(v.equip,{walk:t*Math.PI*2,moving:kind==='walk'}))}});
 if(kind!=='attack')keys.at(-1).P=structuredClone(keys[0].P);
 return validate({format:'nightcamp-cutout-v1',rig:'elf_talon_test',outfitFit:{version:2,reference:'talon',mode:'template'},parts:structuredClone(v.parts),clip:{name:id,kind,dur,hit:Math.min(dur,definition?.ev?.find(e=>e[1]==='hit')?.[0]||0),keys}});
}
function download(name,data){const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
$('testPlay').onclick=()=>{playing=!playing;$('testPlay').textContent=playing?'Ⅱ Dừng':'▶ Phát'};
$('testAnimation').onchange=()=>{time=0};$('testReset').onclick=()=>{time=0;playing=false;$('testPlay').textContent='▶ Phát'};
$('testBefore').onchange=()=>$('beforeCard').hidden=!$('testBefore').checked;
$('testProject').onclick=safe(()=>download('elf_talon_test.cutout.json',project()));
$('testBundle').onclick=safe(()=>{const p=project();download('elf_talon_test.game-bundle.json',{format:'nightcamp-cutout-export-v1',...gameExport(p),project:p})});
$('testReload').onclick=safe(()=>loadSheet(new URL('fit-test-data/elf-sheet.png',location.href).href));
$('testFile').onchange=safe(async()=>{const f=$('testFile').files[0];if(!f)return;if(!['image/png','image/webp','image/jpeg'].includes(f.type)||f.size>8*1024*1024)throw Error('Chọn ảnh PNG/WebP/JPG dưới 8 MB');const src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});await loadSheet(src);$('testFile').value=''});
requestAnimationFrame(frame);
safe(async()=>{
 source=await connectSource();reference=Object.fromEntries(PARTS.map(p=>[p,structuredClone(source.catalog.sprites['rig_talon_'+p])]));
 NC.ITEMS.fit_test_weapon={grip:.12,wtype:'sword',sprite:'test_sword',restAng:1.2,stance:-.7};
 await loadSheet(new URL('fit-test-data/elf-sheet.png',location.href).href);
})();
