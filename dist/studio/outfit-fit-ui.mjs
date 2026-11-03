import {alphaBounds} from './accessory-image.mjs';
import {fitOutfitPart} from './outfit-fit.mjs';

export function mountOutfitFit({catalog,project,image}){
 let enabled=true,reference='',panels=[];
 const measurements=new WeakMap();
 async function measure(src){
  const img=await image(src);
  if(measurements.has(img))return measurements.get(img);
  const width=img.naturalWidth,height=img.naturalHeight;
  if(!width||!height||width*height>16_000_000)throw Error('Ảnh quá lớn để tự căn; dùng ảnh dưới 16 triệu pixel');
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
  const m={width,height,bounds:alphaBounds(ctx.getImageData(0,0,width,height).data,width,height)};
  measurements.set(img,m);return m;
 }
 function sync(){
  const rigs=catalog()?.rigs||[];
  if(!rigs.includes(reference))reference=rigs.includes(project()?.rig)?project().rig:rigs.includes('traveler')?'traveler':rigs[0]||'';
  for(const panel of panels){
   const select=panel.querySelector('select');
   select.replaceChildren(...rigs.map(id=>new Option(id,id)));select.value=reference;select.disabled=!enabled;
   panel.querySelector('input').checked=enabled;
  }
 }
 function panel(id){
  const node=document.createElement('fieldset');node.className='outfit-fit';node.id=id;
  node.innerHTML='<legend>Tự căn trang phục</legend><label><input type="checkbox" checked> Khớp kích thước theo bộ có sẵn</label><label>Bộ chuẩn<select aria-label="Bộ trang phục chuẩn để căn kích thước"></select></label><p class="hint">Giữ tỷ lệ ảnh, bỏ qua viền trong suốt; căn chiều cao và chiều dài xương theo bộ chuẩn. Không sửa ảnh gốc. Khớp chi tiết vẫn có thể chỉnh tay.</p>';
  node.querySelector('input').onchange=e=>{enabled=e.target.checked;sync()};
  node.querySelector('select').onchange=e=>{reference=e.target.value;sync()};
  panels.push(node);sync();return node;
 }
 document.getElementById('resources').before(panel('outfitFit'));
 return {
  refresh(preferred){if(catalog()?.rigs.includes(preferred))reference=preferred;sync()},
  open(dialog){
   if(!dialog.querySelector('#sheetOutfitFit'))dialog.querySelector('#sheetParts').before(panel('sheetOutfitFit'));
   sync();
  },
  async apply(candidate,assignments){
   if(!enabled||!Object.keys(assignments).length)return {project:candidate,fitted:0};
   const before=project(),rig=reference;
   const fitted=await Promise.all(Object.entries(assignments).map(async([part,resource])=>{
    const ref=catalog().sprites[`rig_${rig}_${part}`];if(!ref)throw Error('Không tìm thấy bộ trang phục chuẩn: '+rig);
    const [sourceMeasure,refMeasure]=await Promise.all([measure(resource.src),measure(ref.src)]);
    return [part,fitOutfitPart(resource,part,ref,sourceMeasure,refMeasure)];
   }));
   if(project()!==before)throw Error('Project đã thay đổi, hãy gán lại tài nguyên');
   for(const [part,sprite] of fitted)candidate.parts[part]=sprite;
   return {project:candidate,fitted:fitted.length,reference:rig};
  }
 };
}
