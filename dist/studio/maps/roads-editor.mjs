import {validateMap,traceRoad,nearestRoadPoint,pickRoad} from './runtime.mjs';

// Editor-only tools. No UI dependency is included in the portable map runtime.
export function mountRoadEditor(h){
 const $=id=>document.getElementById(id),cv=$('stage'),section=document.createElement('section');section.dataset.panel='roads';
 section.innerHTML=`<h2>Đường cong · không theo ô</h2><p class="hint">Chạm từng điểm để vẽ tuyến, đường tự uốn qua các điểm. Hoàn tất rồi kéo điểm để sửa. Đường nằm dưới cây/vật thể, không tự tạo cầu qua nước.</p>
<button id="newRoad" class="primary">＋ Vẽ đường mới</button><label>Đường đang chọn<select id="roadList"></select></label>
<label>Chất liệu<select id="roadMaterial"><option value="dirt">Đất / đường</option><option value="sand">Cát</option><option value="stone">Đá lát</option></select></label>
<label>Độ rộng (đơn vị thế giới)<input id="roadWidth" type="number" min="8" max="512" step="4" value="100"></label>
<label>Mềm mép <output id="roadSoftnessLabel"></output><input id="roadSoftness" type="range" min="0" max="0.9" step="0.05" value="0.25"></label>
<label>Độ uốn <output id="roadSmoothnessLabel"></output><input id="roadSmoothness" type="range" min="0" max="1" step="0.05" value="0.8"></label>
<p id="roadInfo" class="hint"></p><div id="roadEditFields" hidden><button id="editRoad">◇ Kéo điểm trên map</button><label>Điểm đang chọn<select id="roadPoint"></select></label><div class="pair"><label>X<input id="roadX" type="number" step="1"></label><label>Y<input id="roadY" type="number" step="1"></label></div><button id="insertRoadPoint">＋ Chạm map để chèn điểm</button><button id="deleteRoadPoint">Xóa điểm đang chọn</button><div class="row"><button id="duplicateRoad">Nhân bản đường</button><button id="deleteRoad">Xóa đường</button></div></div>
<p class="hint">Độ rộng không đổi khi zoom. Mềm mép 0 = mép rõ; Độ uốn 0 = tuyến thẳng gấp khúc, các góc vẫn bo tròn. Có Hoàn tác/Làm lại. Khi xuất, tải lại map-runtime.mjs mới (version 2) cho game.</p>`;
 document.querySelector('aside.left').append(section);
 const menu=document.createElement('button');menu.dataset.tab='roads';menu.textContent='⌁ Đường cong';$('mapMenu').querySelector('nav').append(menu);
 for(const [id,name]of [['roadDraw','⌁ Vẽ đường cong'],['roadEdit','◇ Sửa đường cong'],['roadInsert','＋ Chèn điểm đường']])$('tool').add(new Option(name,id));
 const actions=document.createElement('div');actions.id='roadActions';actions.className='road-actions';actions.hidden=true;actions.innerHTML='<span id="roadDraftInfo"></span><button id="undoRoadPoint">↶ Bỏ điểm cuối</button><button id="finishRoad" class="primary">✓ Hoàn tất</button><button id="cancelRoad">Hủy</button>';document.querySelector('.stage').append(actions);
 let chosen=null,point=0,draft=null,drag=null,style={material:'dirt',width:100,softness:.25,smoothness:.8},serial=0;
 const current=()=>draft||h.state.project?.roads?.find(r=>r.id===chosen),bound=(v,max)=>Math.max(0,Math.min(max,v)),id=()=>`road_${Date.now().toString(36)}_${++serial}`;
 const on=(name,event,fn)=>$(name).addEventListener(event,h.safe(fn));
 function assertIdle(){if(draft)throw Error('Hoàn tất hoặc Hủy đường đang vẽ trước khi sửa/lưu map.');if(drag)throw Error('Thả điểm đang kéo trước khi đổi map.')}
 function hint(){const text=draft?'Đang vẽ '+draft.points.length+' điểm · chạm để thêm · Hoàn tất để lưu.':'Kéo các chấm để uốn đường · chọn Đường cong trong menu để chỉnh độ rộng / chất liệu.';$('stageHint').textContent=text;h.message(text)}
 function refresh(){
  if(!h.state.project)return;const roads=h.state.project.roads||[];if(chosen&&!roads.some(r=>r.id===chosen))chosen=null;const r=current();if(r)style={material:r.material,width:r.width,softness:r.softness,smoothness:r.smoothness};
  $('roadList').replaceChildren(new Option(draft?'— Đang vẽ đường mới —':'— Chọn đường —',''),...roads.map((r,i)=>new Option(`${i+1}. ${r.id} · ${r.points.length} điểm`,r.id)));$('roadList').value=draft?'':chosen||'';
  $('roadMaterial').value=style.material;$('roadWidth').value=style.width;$('roadSoftness').value=style.softness;$('roadSmoothness').value=style.smoothness;$('roadSoftnessLabel').textContent=Math.round(style.softness*100)+'%';$('roadSmoothnessLabel').textContent=Math.round(style.smoothness*100)+'%';
  $('roadInfo').textContent=draft?`Đang vẽ: ${draft.points.length}/256 điểm; chưa lưu vào map.`:`${roads.length}/128 đường · ${roads.reduce((n,r)=>n+r.points.length,0)}/4096 điểm. Chọn đường trong danh sách hoặc chạm đường bằng công cụ Sửa.`;
  $('roadEditFields').hidden=!r||!!draft;point=Math.max(0,Math.min(point,(r?.points.length||1)-1));$('roadPoint').replaceChildren(...(r?.points||[]).map((v,i)=>new Option(`${i+1} · ${Math.round(v.x)}, ${Math.round(v.y)}`,i)));$('roadPoint').value=point;$('roadX').value=r?.points[point]?.x??0;$('roadY').value=r?.points[point]?.y??0;
  actions.hidden=!draft;$('roadDraftInfo').textContent=`${draft?.points.length||0} điểm`;$('finishRoad').disabled=!draft||draft.points.length<2||h.state.busy;$('undoRoadPoint').disabled=!draft?.points.length||h.state.busy;
  const renderer=h.state.renderer;if(renderer){renderer.previewRoad=draft;renderer.overlay=overlay}
 }
 function overlay(ctx,{zoom}){
  if(h.state.playing||!['roadDraw','roadEdit','roadInsert'].includes($('tool').value))return;const r=current();if(!r)return;ctx.save();ctx.lineWidth=1.5/zoom;ctx.strokeStyle='#e5f6ab';ctx.setLineDash([5/zoom,5/zoom]);traceRoad(ctx,r);ctx.stroke();ctx.setLineDash([]);ctx.font=`${11/zoom}px system-ui`;
  r.points.forEach((p,i)=>{ctx.beginPath();ctx.arc(p.x,p.y,(i===point?8:6)/zoom,0,Math.PI*2);ctx.fillStyle=i===point?'#ffbe7d':'#def391';ctx.fill();ctx.strokeStyle='#23302e';ctx.stroke();ctx.fillStyle='#f5ffe5';ctx.fillText(String(i+1),p.x+10/zoom,p.y-10/zoom)});ctx.restore();
 }
 function begin(){assertIdle();h.stop();if((h.state.project.roads?.length||0)>=128)throw Error('Tối đa 128 đường');draft={id:id(),...style,points:[]};point=0;$('tool').value='roadDraw';h.selectTab('preview');refresh();hint()}
 function finish(){if(!draft||draft.points.length<2)throw Error('Đặt ít nhất 2 điểm trước khi Hoàn tất');const r=structuredClone(draft);draft=null;try{h.update(p=>(p.roads||=[]).push(r))}catch(e){draft=r;refresh();throw e}chosen=r.id;point=r.points.length-1;$('tool').value='roadEdit';refresh();hint()}
 on('newRoad','click',begin);on('finishRoad','click',finish);on('cancelRoad','click',()=>{draft=null;$('tool').value='roadEdit';refresh();hint();h.message('Đã hủy nét đường chưa lưu; các đường cũ giữ nguyên.')});on('undoRoadPoint','click',()=>{draft?.points.pop();refresh();hint()});
 $('play').addEventListener('click',h.safe(e=>{if(draft||drag){e.stopImmediatePropagation();assertIdle()}}),true);
 on('roadList','change',()=>{assertIdle();chosen=$('roadList').value||null;point=0;$('tool').value='roadEdit';refresh()});on('roadPoint','change',()=>{point=Number($('roadPoint').value);refresh()});on('editRoad','click',()=>{$('tool').value='roadEdit';h.selectTab('preview');hint()});on('insertRoadPoint','click',()=>{$('tool').value='roadInsert';h.selectTab('preview');h.message('Chạm gần đường đang chọn để chèn điểm; tuyến sẽ đi qua vị trí bạn chạm.')});
 for(const [name,key]of [['roadMaterial','material'],['roadWidth','width'],['roadSoftness','softness'],['roadSmoothness','smoothness']]){on(name,'change',()=>{const value=key==='material'?$(name).value:$(name).valueAsNumber,next={...style,[key]:value};validateMap({...h.state.project,roads:[{id:'check',...next,points:[{x:0,y:0},{x:1,y:1}]}]});style=next;if(draft){Object.assign(draft,next);refresh()}else if(chosen)h.update(p=>Object.assign(p.roads.find(r=>r.id===chosen),next));else refresh()});if(name.includes('Softness')||name.includes('Smoothness'))on(name,'input',()=>$(name+'Label').textContent=Math.round($(name).valueAsNumber*100)+'%')}
 for(const [name,key]of [['roadX','x'],['roadY','y']])on(name,'change',()=>h.update(p=>p.roads.find(r=>r.id===chosen).points[point][key]=$(name).valueAsNumber));
 on('deleteRoadPoint','click',()=>{if(current().points.length<=2)throw Error('Đường cần ít nhất 2 điểm. Muốn bỏ cả đường, bấm Xóa đường.');h.update(p=>p.roads.find(r=>r.id===chosen).points.splice(point,1))});
 on('deleteRoad','click',()=>{h.update(p=>p.roads=p.roads.filter(r=>r.id!==chosen));chosen=null;refresh()});
 on('duplicateRoad','click',()=>{const r=structuredClone(current()),p=h.state.project;r.id=id();r.points=r.points.map(v=>({x:bound(v.x+24,p.cols*p.cell),y:bound(v.y+24,p.rows*p.cell)}));h.update(p=>(p.roads||=[]).push(r));chosen=r.id;refresh()});
 $('tool').addEventListener('change',h.safe(e=>{if(draft&&!['roadDraw','pan'].includes($('tool').value)){$('tool').value='roadDraw';e.stopImmediatePropagation();throw Error('Hoàn tất hoặc Hủy đường đang vẽ trước khi đổi công cụ.')}if($('tool').value==='roadDraw'&&!draft)begin();if(['roadDraw','roadEdit','roadInsert'].includes($('tool').value))hint()}));
 cv.addEventListener('pointerdown',h.safe(e=>{
  const tool=$('tool').value;if(h.state.playing||h.state.busy||!['roadDraw','roadEdit','roadInsert'].includes(tool)||e.button===1)return;e.preventDefault();e.stopImmediatePropagation();const p=h.state.project,[x,y]=h.world(e);if(x<0||y<0||x>p.cols*p.cell||y>p.rows*p.cell)return;
  if(tool==='roadDraw'){if(!draft)begin();if(draft.points.length>=256)throw Error('Tối đa 256 điểm / đường');draft.points.push({x:Math.round(x),y:Math.round(y)});point=draft.points.length-1;refresh();hint();return}
  if(tool==='roadInsert'){const r=current();if(!r)throw Error('Chọn một đường trước');const near=nearestRoadPoint(r,x,y);if(near.distance>r.width/2+24/h.camera.zoom)throw Error('Chạm gần đường đang chọn để chèn điểm');const index=near.segment+1;h.update(p=>p.roads.find(r=>r.id===chosen).points.splice(index,0,{x:Math.round(x),y:Math.round(y)}));point=index;$('tool').value='roadEdit';refresh();return}
  let r=current(),handle=r?.points.findIndex(v=>Math.hypot(v.x-x,v.y-y)<=14/h.camera.zoom)??-1;
  if(handle<0){r=pickRoad(p,x,y,10/h.camera.zoom);chosen=r?.id||null;point=0;refresh();if(!r)return;handle=r.points.findIndex(v=>Math.hypot(v.x-x,v.y-y)<=14/h.camera.zoom)}
  if(handle<0){hint();return}point=handle;cv.setPointerCapture(e.pointerId);drag={pointer:e.pointerId,id:r.id,index:handle,before:h.snapshot(),dx:r.points[handle].x-x,dy:r.points[handle].y-y};refresh();
 }),true);
 cv.addEventListener('pointermove',h.safe(e=>{if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();e.stopImmediatePropagation();const p=h.state.project,[x,y]=h.world(e),r=p.roads.find(r=>r.id===drag.id);r.points[drag.index]={x:Math.round(bound(x+drag.dx,p.cols*p.cell)),y:Math.round(bound(y+drag.dy,p.rows*p.cell))};refresh()}),true);
 for(const event of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(event,h.safe(e=>{if(!drag||drag.pointer!==e.pointerId)return;e.stopImmediatePropagation();const before=drag.before;drag=null;if(event==='pointercancel'){h.state.project=h.restoreSnapshot(before);h.state.renderer.project=h.state.project}else{validateMap(h.state.project);h.remember(before);h.persist()}refresh()}),true);
 return {refresh,assertIdle};
}
