import {PARTS} from './model.mjs';
import {mergeBoxes} from './slice.mjs';
import {RESOURCE_PART_NAMES as names,resourcePart as heroPart,resourceAssignments as heroAssignments,defaultResourceSelection as heroSelection} from './resource-tools.mjs';
const el=(tag,text)=>{const n=document.createElement(tag);if(text)n.textContent=text;return n};
let serial=0;
export function mountSheetImporter(actions){
 const roles=()=>actions.roles?.()||PARTS.map(p=>[p,names[p]]),roleName=role=>roles().find(([id])=>id===role)?.[1]||role;
 const resourcePart=actions.roleOf||heroPart,resourceAssignments=actions.assignments||heroAssignments,defaultResourceSelection=actions.defaultSelection||heroSelection;
 const dialog=el('dialog');dialog.id='sheetDialog';dialog.className='sheet-dialog';
 dialog.innerHTML='<div class="sheet-header"><h2 id="sheetTitle">TỰ CẮT ẢNH THÀNH TÀI NGUYÊN</h2><button id="sheetClose">Đóng ✕</button></div><p>Chỉ xóa nền cùng màu nối ra mép ảnh; giữ tóc, lông và chi tiết trắng bên trong đường viền. Không tự tách các bộ phận đang dính liền nhau.</p><div class="sheet-tools" id="sheetTools"><label>Nền<select id="sheetMode"><option value="auto">Tự nhận diện</option><option value="transparent">Trong suốt</option><option value="white">Trắng</option></select></label><label>Độ lệch màu nền<input id="sheetTolerance" type="number" min="0" max="100" value="28"></label><label>Lọc bụi (pixel)<input id="sheetArea" type="number" min="1" max="10000" value="12"></label><button id="sheetScan">Phân tích lại</button><button id="sheetMerge">Gộp vùng đã chọn</button></div><p id="sheetStatus" role="status"></p><canvas id="sheetPreview"></canvas><div class="sheet-batch"><button id="sheetAll">Chọn tất cả</button><button id="sheetNone">Bỏ chọn</button><span id="sheetCount"></span></div><div id="sheetParts"></div><div class="sheet-footer"><button id="sheetStore">Lưu các mảnh vào tài nguyên</button><button id="sheetApply" class="primary">Lưu & gán các mảnh đã chọn</button></div>';
 document.body.append(dialog);const $=id=>dialog.querySelector('#'+id),ctx=$('sheetPreview').getContext('2d');
 let canvas=null,original=null,boxes=[],resources=[],generation=0,worker=null,cancel=null,closed=false,mode='scan',loading=false,scaleNote='';
 const report=e=>$('sheetStatus').textContent='Lỗi: '+e.message;
 const safe=fn=>async()=>{try{await fn()}catch(e){report(e)}};
 function stopWorker(){worker?.terminate();worker=null;cancel?.();cancel=null}
 $('sheetClose').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{closed=true;generation++;stopWorker()});
 const chosen=()=>[...dialog.querySelectorAll('.sheet-selected:checked')].map(c=>+c.dataset.index);
 function count(){const n=chosen().length;$('sheetCount').textContent=n+' / '+resources.length+' mảnh được chọn';$('sheetApply').disabled=loading||!n;$('sheetStore').disabled=loading||!resources.length;$('sheetMerge').disabled=loading||n<2||mode!=='scan'}
 function busy(flag){loading=flag;for(const n of dialog.querySelectorAll('input,select,button:not(#sheetClose)'))n.disabled=flag;count()}
 function draw(){if(!canvas||mode!=='scan')return;const view=$('sheetPreview');view.width=canvas.width;view.height=canvas.height;ctx.clearRect(0,0,view.width,view.height);ctx.drawImage(canvas,0,0);ctx.lineWidth=Math.max(2,canvas.width/350);ctx.font=`${Math.max(12,canvas.width/50)}px sans-serif`;boxes.forEach((b,i)=>{ctx.strokeStyle='#d3ed92';ctx.strokeRect(b.x,b.y,b.w,b.h);ctx.fillStyle='#edffb8';ctx.fillText(String(i+1),b.x+3,b.y+18)})}
 function crop(b){const c=document.createElement('canvas');c.width=b.w+4;c.height=b.h+4;c.getContext('2d').drawImage(canvas,b.x,b.y,b.w,b.h,2,2,b.w,b.h);return c.toDataURL('image/png')}
 function overlap(a,b){const intersection=Math.max(0,Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y));return intersection/(a.w*a.h+b.w*b.h-intersection||1)}
 function materialize(){const previous=resources,used=new Set();resources=boxes.map((b,i)=>{const old=previous.filter(r=>r.rect&&!used.has(r.id)).sort((a,c)=>overlap(c.rect,b)-overlap(a.rect,b))[0],same=old&&overlap(old.rect,b)>=.65;if(same)used.add(old.id);return {id:same?old.id:'piece_'+Date.now()+'_'+ ++serial,name:same?old.name:'Mảnh '+(i+1),part:same?resourcePart(old):'',src:crop(b),rect:{...b},w:b.w+4,h:b.h+4}})}
 function renderRows(){
  const defaults=defaultResourceSelection(resources);
  $('sheetParts').replaceChildren(...resources.map((r,i)=>{
   const row=el('div');row.className='sheet-piece';row.dataset.resourceId=r.id;
   const check=el('input');check.type='checkbox';check.className='sheet-selected';check.checked=mode==='scan'||defaults.has(r.id);check.dataset.index=i;check.setAttribute('aria-label','Chọn '+r.name);check.onchange=count;
   const img=el('img');img.src=r.src;img.alt=r.name;
   const name=el('input');name.value=r.name;name.maxLength=80;name.setAttribute('aria-label','Tên mảnh '+(i+1));name.oninput=()=>{r.name=name.value;img.alt=r.name};
   const select=el('select');select.className='sheet-slot';select.dataset.index=i;select.setAttribute('aria-label','Vai trò mảnh '+(i+1));select.append(new Option('Chưa gán / chỉ lưu',''),...roles().map(([id,label])=>new Option(label,id)));select.value=resourcePart(r);select.onchange=()=>{r.part=select.value;if(select.value)check.checked=true;count()};
   row.append(check,img,name,select);
   if(mode==='gallery'){const assign=el('button','Gán');assign.className='sheet-assign-one';assign.onclick=safe(async()=>{const assignments=resourceAssignments([r]);busy(true);try{await actions.store([],assignments,resources);if(!closed)$('sheetStatus').textContent='Đã gán '+r.name+' → '+roleName(resourcePart(r))+'. Có thể gán tiếp hoặc chọn nhiều mảnh rồi Gán một lần.'}finally{busy(false)}});row.append(assign)}
   return row;
  }));actions.onRows?.(dialog,mode);count();
 }
 async function scan(){
  if(mode!=='scan'||!canvas||!original)return;const mine=++generation;stopWorker();busy(true);$('sheetStatus').textContent='Đang tách nền từ mép ảnh và tìm các mảnh rời…';
  try{
   const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.drawImage(original,0,0);const image=c.getImageData(0,0,canvas.width,canvas.height),minArea=Math.max(1,Math.min(10000,+$('sheetArea').value||12)),tolerance=Math.max(0,Math.min(100,+$('sheetTolerance').value||0));
   const result=await new Promise((resolve,reject)=>{cancel=()=>resolve({cancelled:true});const activeWorker=new Worker(new URL('./slice-worker.mjs',import.meta.url),{type:'module'});worker=activeWorker;const finish=()=>{activeWorker.terminate();if(worker===activeWorker){worker=null;cancel=null}};activeWorker.onmessage=e=>{finish();e.data.error?reject(Error(e.data.error)):resolve(e.data)};activeWorker.onerror=e=>{finish();reject(Error(e.message))};activeWorker.postMessage({pixels:image.data.buffer,width:canvas.width,height:canvas.height,mode:$('sheetMode').value,minArea,tolerance},[image.data.buffer])});
   if(mine!==generation||closed||result.cancelled)return;
   c.putImageData(new ImageData(new Uint8ClampedArray(result.pixels),canvas.width,canvas.height),0,0);boxes=result.boxes;materialize();draw();renderRows();$('sheetStatus').textContent=boxes.length?`Tìm được ${boxes.length} mảnh. Chọn vai trò cho từng mảnh; tên và vai trò được lưu cùng tài nguyên.${scaleNote}`:'Không tìm thấy mảnh. Thử nền Trong suốt hoặc giảm ngưỡng lọc bụi.';
  }finally{if(mine===generation)busy(false)}
 }
 $('sheetScan').onclick=safe(scan);
 $('sheetAll').onclick=()=>{dialog.querySelectorAll('.sheet-selected').forEach(n=>n.checked=true);count()};$('sheetNone').onclick=()=>{dialog.querySelectorAll('.sheet-selected').forEach(n=>n.checked=false);count()};
 $('sheetMerge').onclick=safe(()=>{const indexes=chosen();if(indexes.length<2)throw Error('Chọn ít nhất hai vùng để gộp');const merged=mergeBoxes(indexes.map(i=>boxes[i]));boxes=boxes.filter((_,i)=>!indexes.includes(i));boxes.push(merged);boxes.sort((a,b)=>a.y-b.y||a.x-b.x);materialize();draw();renderRows()});
 async function store(apply){
  const selected=chosen().map(i=>resources[i]);if((apply||mode==='scan')&&!selected.length)throw Error('Chọn ít nhất một mảnh');
  const assignments=apply?resourceAssignments(selected):actions.emptyAssignments??{};busy(true);
  try{await actions.store(mode==='scan'?selected:[],assignments,mode==='gallery'?resources:[]);if(closed)return;if(mode==='gallery'&&!apply){$('sheetStatus').textContent='Đã lưu tên và vai trò của tài nguyên. Có thể chọn nhiều mảnh để gán.'}else dialog.close()}finally{busy(false)}
 }
 $('sheetStore').onclick=safe(()=>store(false));$('sheetApply').onclick=safe(()=>store(true));
 function openMode(next){closed=false;mode=next;loading=false;$('sheetTools').hidden=next!=='scan';$('sheetPreview').hidden=next!=='scan';$('sheetTitle').textContent=next==='scan'?'TỰ CẮT ẢNH THÀNH TÀI NGUYÊN':'TÀI NGUYÊN ĐÃ CẮT · GÁN HÀNG LOẠT';$('sheetStore').textContent=next==='scan'?'Lưu các mảnh vào tài nguyên':'Lưu tên & vai trò';$('sheetApply').textContent=next==='scan'?'Lưu & gán các mảnh đã chọn':'Gán các mảnh đã chọn';actions.onOpen?.(dialog,next);dialog.showModal()}
 return {
  async open(img){generation++;stopWorker();canvas=document.createElement('canvas');const scale=Math.min(1,Math.sqrt(4194304/(img.naturalWidth*img.naturalHeight)),8192/Math.max(img.naturalWidth,img.naturalHeight));canvas.width=Math.max(1,Math.floor(img.naturalWidth*scale));canvas.height=Math.max(1,Math.floor(img.naturalHeight*scale));canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);original=document.createElement('canvas');original.width=canvas.width;original.height=canvas.height;original.getContext('2d').drawImage(canvas,0,0);scaleNote=scale<1?' Ảnh lớn đã thu nhỏ còn '+canvas.width+'×'+canvas.height+' để phân tích.':'';boxes=[];resources=[];openMode('scan');await scan()},
  async gallery(items){if(!items?.length)throw Error('Chưa có tài nguyên đã cắt');generation++;stopWorker();resources=items.map(r=>({...structuredClone(r),part:resourcePart(r)}));boxes=[];canvas=null;original=null;openMode('gallery');renderRows();busy(false);$('sheetStatus').textContent=items.length+' tài nguyên. Giữ vai trò đã lưu; chọn sẵn mảnh mới nhất cho mỗi bộ phận. Có thể đổi lựa chọn và gán nhiều mảnh một lần.'}
 };
}
