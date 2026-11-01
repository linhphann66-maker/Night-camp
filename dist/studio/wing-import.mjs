import {mountSheetImporter} from './sheet-import.mjs';
import {wingResourceRoles,wingResourceRole,wingResources,wingSelection,wingAssignments,applyWingResources,NEW_NEAR,VARIANTS} from './wing-resources.mjs';
export function mountWingImporter(actions){
 const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./sheet.css',import.meta.url).href;document.head.append(style);
 document.getElementById('upload').insertAdjacentHTML('afterend','<label><input id="wingAutoSlice" type="checkbox" checked> Tự tách các mảnh rời khi tải ảnh cánh</label><button id="sliceCurrentWing">✂ Tách ảnh đang gán</button><button id="wingResources">▦ Tài nguyên cánh đã cắt (0)</button><p class="hint">Một tấm nhiều tư thế: tách rồi chọn Ảnh động. Các đoạn riêng để rig: chọn xương gần/xa hoặc tạo xương mới. Không tự chia một hình đang dính liền.</p>');
 const $=id=>document.getElementById(id),safe=fn=>async()=>{try{if(actions.mode()!=='rig')throw Error('Chuyển sang Dựng rig trước khi tách / gán ảnh');await fn()}catch(e){actions.message('Lỗi tách cánh: '+e.message)}};
 let identity=null;
 function bulk(dialog,role){for(const row of dialog.querySelectorAll('.sheet-piece'))if(row.querySelector('.sheet-selected').checked){const s=row.querySelector('.sheet-slot');s.value=role;s.dispatchEvent(new Event('change'))}}
 const importer=mountSheetImporter({
  roles:()=>wingResourceRoles(actions.project()),roleOf:r=>wingResourceRole(r,actions.project()),defaultSelection:wingSelection,assignments:rs=>wingAssignments(rs,actions.project()),emptyAssignments:[],
  onOpen(dialog){
   identity=actions.project();let tools=dialog.querySelector('#wingSheetTools');
   if(!tools){tools=document.createElement('section');tools.id='wingSheetTools';tools.innerHTML='<p><b>Chọn cách dùng các ảnh đã tách:</b> nhiều tư thế của cùng cánh → Ảnh động; các đoạn cánh riêng → gán từng xương. Chỉ Lưu nếu chưa muốn gán.</p><div class="sheet-tools"><button id="wingSheetVariants">Ảnh đã chọn → các frame cùng một cánh</button><label>Bước frame (giây)<input id="wingSheetStep" type="number" min="0.01" max="5" step="0.01" value="0.15"></label><label>Gán hàng loạt<select id="wingSheetRole"></select></label><button id="wingSheetAssignRole">Áp dụng cho ảnh đã chọn</button></div><label><input id="wingReplaceSheet" type="checkbox" checked> Bỏ hiển thị ảnh nguyên tấm trên xương đang chọn khi tạo các xương mới (ảnh gốc vẫn giữ trong thư viện).</label>';dialog.querySelector('#sheetParts').before(tools);
    tools.querySelector('#wingSheetVariants').onclick=()=>bulk(dialog,VARIANTS);tools.querySelector('#wingSheetAssignRole').onclick=()=>bulk(dialog,tools.querySelector('#wingSheetRole').value);
   }
   tools.querySelector('#wingSheetRole').replaceChildren(...wingResourceRoles(actions.project()).map(([id,name])=>new Option(name,id)));tools.querySelector('#wingSheetRole').value=NEW_NEAR;
   if(!tools.querySelector('#wingSheetDirection')){const label=document.createElement('label');label.innerHTML='Ngọn cánh trong ảnh gốc hướng<select id="wingSheetDirection"><option value="left">Sang trái ← (như ảnh tham chiếu)</option><option value="right">Sang phải →</option></select>';tools.querySelector('.sheet-tools').append(label)}
  },
  async store(resources,assignments,updates){
   if(actions.mode()!=='rig'||actions.project()!==identity)throw Error('Project hoặc chế độ đã thay đổi. Mở lại tài nguyên cánh.');
   const p=applyWingResources(identity,resources,assignments,updates,{selectedBone:actions.bone(),step:$('wingSheetStep').valueAsNumber,replaceSheet:$('wingReplaceSheet').checked,sourceDirection:$('wingSheetDirection').value});
   await actions.adopt(p);identity=actions.project();actions.message('Đã lưu '+resources.length+' mảnh và gán '+assignments.length+' ảnh cánh. Kiểm tra điểm neo và hướng ảnh.');
  },
 });
 $('sliceCurrentWing').onclick=safe(async()=>{const p=actions.project(),b=p.bones.find(b=>b.id===actions.bone()),s=p.sprites[b.sprite];if(!s)throw Error('Xương này chưa có ảnh. Tải ảnh PNG/WebP/JPG trước.');await importer.open(await actions.image(s.src))});
 $('wingResources').onclick=safe(()=>importer.gallery(wingResources(actions.project())));
 return {
  async upload(img){if(!$('wingAutoSlice').checked)return false;await importer.open(img);return true},
  refresh(){if(actions.project())$('wingResources').textContent='▦ Tài nguyên cánh đã cắt ('+wingResources(actions.project()).length+')'},
 };
}
