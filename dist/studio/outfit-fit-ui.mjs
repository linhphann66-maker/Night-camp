import {measureOutfitImage} from './outfit-measure.mjs';
import {fitOutfitPart} from './outfit-fit.mjs';
import {outfitName} from './names-vi.mjs';

export function mountOutfitFit({catalog,project,image}){
 let enabled=true,reference='',mode='template',panels=[];
 const measurements=new WeakMap();
 async function measure(src,part){
  const img=await image(src);
  if(measurements.has(img)&&(!part||part!=='head'||measurements.get(img).headMeasured))return measurements.get(img);
  const m=measureOutfitImage(img,{head:part==='head'});m.headMeasured=part==='head';
  measurements.set(img,m);return m;
 }
 function sync(){
  const rigs=catalog()?.rigs||[];
  if(!rigs.includes(reference))reference=rigs.includes(project()?.rig)?project().rig:rigs.includes('traveler')?'traveler':rigs[0]||'';
  for(const panel of panels){
   const select=panel.querySelector('.outfit-reference');
   select.replaceChildren(...rigs.map(id=>new Option(outfitName(id),id)));select.value=reference;select.disabled=!enabled;
   panel.querySelector('input').checked=enabled;
   panel.querySelector('.outfit-mode').value=mode;panel.querySelector('.outfit-mode').disabled=!enabled;
  }
 }
 function panel(id){
  const node=document.createElement('fieldset');node.className='outfit-fit';node.id=id;
  node.innerHTML='<legend>Tự căn trang phục</legend><label><input type="checkbox" checked> Khớp kích thước theo bộ có sẵn</label><label>Bộ chuẩn<select class="outfit-reference" aria-label="Bộ trang phục chuẩn để căn kích thước"></select></label><label>Cách căn<select class="outfit-mode" aria-label="Cách căn tỷ lệ trang phục"><option value="template">Khớp tỷ lệ bộ gốc · cả rộng và cao</option><option value="aspect">Giữ tỷ lệ ảnh · chỉ khớp chiều dài (cũ)</option></select></label><p class="hint">Mặc định khớp cả rộng/cao từng bộ phận và các khớp, không chỉ chiều dài xương. Đầu dùng vùng mặt nếu nhận diện đủ tin cậy, tránh đặt cổ ở đuôi tóc. Không sửa pixel ảnh gốc. Có thể chỉnh neo cho ảnh khác dáng.</p>';
  node.querySelector('input').onchange=e=>{enabled=e.target.checked;sync()};
  node.querySelector('.outfit-reference').onchange=e=>{reference=e.target.value;sync()};
  node.querySelector('.outfit-mode').onchange=e=>{mode=e.target.value;sync()};
  panels.push(node);sync();return node;
 }
 const main=panel('outfitFit');document.getElementById('resources').before(main);
 main.insertAdjacentHTML('beforeend','<button id="refitOutfit" type="button">Căn lại 6 bộ phận đang mở</button><a href="fit-test.html" target="_blank" rel="noopener">Mở bản test so với Chiến binh vuốt nhọn ↗</a>');
 return {
  refresh(preferred){
   if(preferred!==undefined){
    const saved=project()?.outfitFit;
    if(catalog()?.rigs.includes(saved?.reference))reference=saved.reference;
    else if(catalog()?.rigs.includes(preferred))reference=preferred;
    if(saved?.version===2&&['aspect','template'].includes(saved.mode))mode=saved.mode;
   }
   sync();
  },
  open(dialog){
   if(!dialog.querySelector('#sheetOutfitFit'))dialog.querySelector('#sheetParts').before(panel('sheetOutfitFit'));
   sync();
  },
  async apply(candidate,assignments){
   if(!enabled||!Object.keys(assignments).length)return {project:candidate,fitted:0};
   const before=project(),rig=reference,fitMode=mode;
   const fitted=await Promise.all(Object.entries(assignments).map(async([part,resource])=>{
    const ref=catalog().sprites[`rig_${rig}_${part}`];if(!ref)throw Error('Không tìm thấy bộ trang phục chuẩn: '+rig);
    const [sourceMeasure,refMeasure]=await Promise.all([measure(resource.src,part),measure(ref.src,part)]);
    return [part,fitOutfitPart(resource,part,ref,sourceMeasure,refMeasure,{mode:fitMode})];
   }));
   if(project()!==before)throw Error('Project đã thay đổi, hãy gán lại tài nguyên');
   for(const [part,sprite] of fitted)candidate.parts[part]=sprite;
   candidate.outfitFit={version:2,reference:rig,mode:fitMode};
   return {project:candidate,fitted:fitted.length,reference:rig,mode:fitMode};
  }
 };
}
