import {connectSource} from '../source.mjs';
import {mountSavedLibrary} from '../saved-library-ui.mjs';
import {mountVfxSheetImport} from './sheet-import.mjs';
import {SKILL_RUNTIME_VERSION,SKILL_MOTIONS,SKILL_EASINGS,skillId,createSkillProject,validateSkillProject,newVisualSkill,drawSkillEvent,loadSkillImages,SkillPlayer,skillEventActive,skillEventGeometry,skillEventTransform,hitSkillEvent,motionDefaults} from './runtime.mjs';
import {decimalNumber,tidyNumber,editSkillEvent,requiredSkillDuration} from './edit-model.mjs';
const $=id=>document.getElementById(id),cv=$('preview'),ctx=cv.getContext('2d'),DRAFT='darkin.skill.studio.v1',VIEW=DRAFT+'.view',clone=structuredClone;
let p=createSkillProject(),catalog,source,images=new Map(),selected=null,eventId=null,effect=null,page=0,playing=false,t=0,live=null,samplePreview=null,active=true,undo=[],redo=[],selectionRequest=0,busy=false,drag=null,flushing=false;
const caster={x:0,y:0},target={x:180,y:0},pan={x:0,y:0},dirty=new Set();
const skill=()=>p.skills[selected],event=()=>skill()?.events.find(e=>e.id===eventId),instance=()=>({caster,casterRef:caster,target});
const fold=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').toLowerCase();
const msg=s=>$('status').textContent=s;
const safe=fn=>async(...args)=>{try{await fn(...args)}catch(e){notice('Lỗi: '+e.message,true)}};
const on=(id,ev,fn)=>$(id).addEventListener(ev,safe(e=>{if(ev==='click'&&!flush())return;if(ev==='click'&&busy)throw Error('Đang tải ảnh/project');return fn(e)}));
const skillFields={sid:'id',sname:'name',kind:'kind',duration:'duration',hitAt:'hitAt',cooldown:'cooldown',cost:'cost',range:'range',animation:'animation'};
const eventFields={eventName:'name',at:'at',eventDuration:'duration',scale:'scale',opacity:'opacity',x:'x',y:'y',rotation:'rotation',anchor:'anchor',motion:'motion',layer:'layer',blend:'blend',follow:'follow',eventVisible:'visible',eventLocked:'locked',color:'color',amplitude:'amplitude',cycles:'cycles',turns:'turns',travelX:'travelX',travelY:'travelY',easing:'easing',fadeIn:'fadeIn',fadeOut:'fadeOut'};
const motionParams={still:[],expand:['easing'],shrink:['easing'],pulse:['amplitude','cycles','easing'],spin:['turns','easing'],orbit:['amplitude','turns','easing'],spiral:['amplitude','turns','easing'],rise:['travelY','easing'],fall:['travelY','easing'],sway:['amplitude','cycles','easing'],shake:['amplitude','cycles','easing'],move:['travelX','travelY','easing'],projectile:['easing'],arc:['amplitude','easing'],boomerang:['easing']};
const motionHelp=document.createElement('p');motionHelp.id='motionHelp';motionHelp.className='hint';$('motion').parentElement.after(motionHelp);
for(const id of [...Object.keys(skillFields),...Object.keys(eventFields)])if($(id).type==='number'){$(id).type='text';$(id).inputMode='decimal';$(id).dataset.numeric='true'}
$('motion').replaceChildren(...Object.entries(SKILL_MOTIONS).map(([id,name])=>new Option(name,id)));
$('easing').replaceChildren(...Object.entries(SKILL_EASINGS).map(([id,name])=>new Option(name,id)));
function notice(text,error=false){$('editNotice').textContent=text;$('editNotice').classList.toggle('error',error);msg(text)}
function saveView(){try{localStorage.setItem(VIEW,JSON.stringify({project:p.id,selected,eventId,t,target,pan,panel:$('panel').value,tool:$('canvasTool').value,zoom:$('zoom').value}))}catch{}}
function persist(){try{localStorage.setItem(DRAFT,JSON.stringify(p))}catch{msg('Nháp trình duyệt đầy. Bấm Lưu project để tải bản sao.')}saveView()}
function stop(){playing=false;live=null;samplePreview=null;selectionRequest++;$('play').textContent='▶ Phát timeline'}
function snapshot(){return {project:p,selected,eventId,t,target:{...target},pan:{...pan}}}
function remember(before){undo.push(before);if(undo.length>25)undo.shift();redo=[]}
function commit(next,{before=snapshot(),message='Đã lưu thay đổi.'}={}){
 if(busy)throw Error('Đang tải project');if(drag)throw Error('Thả VFX đang kéo trước');validateSkillProject(next);
 if(JSON.stringify(next)!==JSON.stringify(p)){remember(before);p=next}stop();persist();render();notice(message);
}
function mutate(fn){const next=clone(p);fn(next);commit(next)}
function nextId(prefix,ids){let n=1;while(ids.includes(prefix+n))n++;return prefix+n}
function readInput(id){const el=$(id);return el.type==='checkbox'?el.checked:el.dataset.numeric?decimalNumber(el.value):el.value.trim()}
function modelValue(id){
 if(skillFields[id])return skill()?.[skillFields[id]]??'';const e=event();if(!e)return '';
 const key=eventFields[id];return e[key]??({name:'',visible:true,locked:false,color:p.effects[e.effectId].color||'#ffa53a',fadeIn:tidyNumber(e.duration*.08),fadeOut:tidyNumber(e.duration*.18),...motionDefaults(e.motion)}[key]??'');
}
function fill(id,value){const el=$(id);if(dirty.has(id))return;if(el.type==='checkbox')el.checked=!!value;else el.value=typeof value==='number'?tidyNumber(value):value??'';el.removeAttribute('aria-invalid')}
function flush(){
 if(flushing||!dirty.size)return true;flushing=true;const ids=[...dirty];
 try{
  const values=Object.fromEntries(ids.map(id=>[id,readInput(id)]));let next=clone(p),sid=selected,newSid=selected,extended=false;
  if(!skill())throw Error('Chọn một kỹ năng trước');const s=next.skills[sid];
  for(const[id,key]of Object.entries(skillFields))if(Object.hasOwn(values,id)){if(key==='id'){const value=values[id];if(!skillId(value))throw Error('ID skill chỉ dùng chữ Latin, số, _ hoặc -');if(value!==sid&&Object.hasOwn(next.skills,value))throw Error('ID skill đã tồn tại');newSid=value}else s[key]=values[id]}
  const changes=Object.fromEntries(Object.entries(eventFields).filter(([id])=>Object.hasOwn(values,id)).map(([id,key])=>[key,values[id]]));
  if(Object.keys(changes).length){const old=s.events.find(e=>e.id===eventId);if(!old)throw Error('Chọn một mốc VFX trước');
   if(changes.anchor&&changes.anchor!==old.anchor){const u=Math.max(0,Math.min(.5,(t-old.at)/old.duration)),a=skillEventTransform(old,instance(),u),b=skillEventTransform({...old,...changes},instance(),u);changes.x=tidyNumber((changes.x??old.x)+a.x-b.x);changes.y=tidyNumber((changes.y??old.y)+a.y-b.y)}
   const duration=s.duration;next=editSkillEvent(next,sid,eventId,changes);extended=next.skills[sid].duration>duration;
  }
  const current=next.skills[sid],minimum=requiredSkillDuration(current);if(current.duration<minimum){current.duration=minimum;extended=true}
  if(newSid!==sid){delete next.skills[sid];current.id=newSid;next.skills[newSid]=current;sid=newSid}
  validateSkillProject(next);dirty.clear();commit(next,{message:extended?'Đã lưu mốc; skill tự dài đến '+current.duration+' s để chứa đủ VFX.':'Đã lưu mốc và vị trí riêng của VFX.'});selected=sid;render();saveView();return true;
 }catch(e){dirty.clear();for(const id of ids)fill(id,modelValue(id));render();notice('Lỗi: '+e.message+' · đã giữ dữ liệu đã lưu, không đổi mốc khác.',true);return false}finally{flushing=false}
}
for(const id of [...Object.keys(skillFields),...Object.keys(eventFields)]){
 $(id).addEventListener('input',()=>{if($(id).disabled)return;dirty.add(id);$('editNotice').textContent='Đang nhập · sẽ lưu khi rời ô hoặc chuyển mục.'});
 $(id).addEventListener('change',()=>{if($(id).disabled)return;dirty.add(id);flush()});$(id).addEventListener('blur',()=>{if(dirty.has(id))flush()});
}
function show(panel){if(!flush()){$('panel').value=document.querySelector('[data-panel]:not([hidden])')?.dataset.panel||'timeline';return}if(panel!=='effects')stop();$('panel').value=panel;for(const el of document.querySelectorAll('[data-panel]'))el.hidden=el.dataset.panel!==panel;saveView()}
on('panel','change',()=>show($('panel').value));
function renderTracks(){
 const s=skill();$('timelineTracks').replaceChildren(...(s?.events||[]).map(e=>{const b=document.createElement('button');b.className='track'+(e.id===eventId?' selected':'');b.dataset.event=e.id;const span=document.createElement('span');span.style.left=e.at/s.duration*100+'%';span.style.width=e.duration/s.duration*100+'%';const label=document.createElement('em');label.textContent=(e.visible===false?'○ ':'● ')+(e.name||e.id)+' · '+e.at.toFixed(2)+'–'+tidyNumber(e.at+e.duration).toFixed(2)+' s';b.append(span,label);b.onclick=safe(()=>chooseEvent(e.id));return b}));
}
function render(){
 if(!Object.hasOwn(p.skills,selected))selected=Object.keys(p.skills)[0]||null;const s=skill();
 $('skills').replaceChildren(...Object.values(p.skills).map(s=>new Option(s.name+' · '+s.id,s.id)));$('skills').value=selected||'';
 for(const id of Object.keys(skillFields)){fill(id,modelValue(id));$(id).disabled=!s}
 const events=s?.events||[];if(!events.some(e=>e.id===eventId))eventId=events[0]?.id||null;
 $('events').replaceChildren(...events.map(e=>new Option((e.name||e.id)+' · '+e.at.toFixed(2)+'–'+tidyNumber(e.at+e.duration).toFixed(2)+' s · '+e.effectId,e.id)));$('events').value=eventId||'';
 for(const id of Object.keys(eventFields)){fill(id,modelValue(id));$(id).disabled=!event()}
 $('color').disabled=!event()||p.effects[event().effectId].group!=='procedural';
 const used=motionParams[event()?.motion]||[];for(const id of ['amplitude','cycles','turns','travelX','travelY','easing'])$(id).disabled=!event()||!used.includes(id);
 $('motionHelp').textContent=({still:'Tại chỗ chỉ dùng điểm neo, độ lệch, góc và tỷ lệ.',pulse:'Biên độ là phần trăm phồng/co, số nhịp là số lần trong mốc.',spin:'Số vòng có thể âm để đảo chiều quay.',orbit:'Biên độ là bán kính lượn; số vòng âm để đảo chiều.',spiral:'Bay xoắn dần ra ngoài theo bán kính và số vòng.',rise:'Bay lên theo trị tuyệt đối của Đích lệch Y.',fall:'Rơi từ phía trên xuống điểm neo theo Đích lệch Y.',move:'Đích lệch X/Y là đoạn trượt tính từ điểm neo.',arc:'Bay người phát → mục tiêu, biên độ là độ cao cung.',projectile:'Bay người phát → mục tiêu; chỉnh vị trí cam bằng công cụ mục tiêu chung.',boomerang:'Bay đến mục tiêu rồi quay về người phát.'}[event()?.motion]||'Biên độ tính bằng tọa độ thế giới; số nhịp tính trong thời lượng mốc.')+' Các ô không áp dụng cho chuyển động này đã khóa.';
 $('nativeInfo').textContent=s?.native?'Nguồn: '+s.native.source+' · '+s.native.id+' · cấp '+s.native.rank+' · VFX do bạn ghép.':'Thiết kế riêng · tên clip là mã để game gọi hoạt ảnh.';
 $('projectId').value=p.id;$('projectName').value=p.name;$('undo').disabled=!undo.length;$('redo').disabled=!redo.length;
 $('play').disabled=!s;$('cast').disabled=!s||s.kind==='passive';$('addEffect').disabled=!effect||!s||busy;
 for(const id of ['cloneEvent','deleteEvent','goEvent','fitDuration'])$(id).disabled=!event();
 $('scrub').max=s?.duration||1;t=Math.max(0,Math.min(t,s?.duration||0));$('scrub').value=t;renderTracks();
}
function chooseEvent(id){if(!flush())return;stop();eventId=id;render();saveView()}
on('skills','change',()=>{const id=$('skills').value;if(!flush())return;stop();selected=id;eventId=null;t=0;render();saveView()});
on('events','change',()=>chooseEvent($('events').value));
on('newSkill','click',()=>{const id=nextId('skill_',Object.keys(p.skills));mutate(q=>q.skills[id]=newVisualSkill(id));selected=id;eventId=null;t=0;render();show('skill')});
on('cloneSkill','click',()=>{if(!skill())return;const id=nextId('skill_',Object.keys(p.skills)),s=clone(skill());s.id=id;s.name+=' · bản sao';mutate(q=>q.skills[id]=s);selected=id;render()});
on('deleteSkill','click',()=>{if(skill())mutate(q=>delete q.skills[selected])});
on('cloneEvent','click',()=>{if(!event())return;const e=clone(event());e.id=nextId('event_',skill().events.map(e=>e.id));if(e.name)e.name+=' · bản sao';mutate(q=>q.skills[selected].events.push(e));eventId=e.id;render();saveView()});
on('deleteEvent','click',()=>{if(event())mutate(q=>q.skills[selected].events=q.skills[selected].events.filter(e=>e.id!==eventId))});
on('fitDuration','click',()=>{if(skill())mutate(q=>q.skills[selected].duration=requiredSkillDuration(q.skills[selected]))});
on('goEvent','click',()=>{if(!event())return;stop();t=tidyNumber(event().at+event().duration*.5);render();saveView();notice('Đang ở giữa mốc '+(event().name||eventId)+' · kéo khung để chỉnh riêng VFX này.')});
on('returnTimeline','click',()=>{stop();render();saveView()});
function nativeRows(){const query=fold($('skillSearch').value),rows=catalog.skills.filter(s=>fold([s.name,s.id,s.originalName,...s.jobs].join(' ')).includes(query));$('nativeSkills').replaceChildren(...rows.map(s=>new Option(s.name+' · '+s.id+' · '+s.kind,s.id)));nativeInfo()}
function nativeInfo(){const s=catalog?.skills.find(s=>s.id===$('nativeSkills').value);if(!s){$('nativeSkillInfo').textContent='Không có kết quả';return}$('nativeRank').max=s.ranks.length;const rank=Math.max(1,Math.min(s.ranks.length,Number($('nativeRank').value)||1));$('nativeRank').value=rank;const r=s.ranks[rank-1];$('nativeSkillInfo').textContent=`${s.originalName} · ${s.id} · ${s.kind} · cấp ${rank}/${s.ranks.length} · SP ${r.cost??'—'} · hệ số ${r.multiplier??'—'} · CD ${s.native.cd??'—'} s · ${s.source}. ${r.description||''}`}
on('skillSearch','input',nativeRows);on('nativeSkills','change',nativeInfo);on('nativeRank','change',nativeInfo);
on('addNativeSkill','click',()=>{const n=catalog.skills.find(s=>s.id===$('nativeSkills').value);if(!n)return;if(p.skills[n.id])throw Error('Skill này đã có. Chọn trong project hoặc nhân bản để giữ thiết kế cũ.');const rank=Number($('nativeRank').value),r=n.ranks[rank-1];if(!r)throw Error('Cấp skill không hợp lệ');const s={...newVisualSkill(n.id,n.name),kind:n.kind,cooldown:Number.isFinite(n.native.cd)?n.native.cd:0,cost:r.cost??0,native:{...clone(n),rank}};mutate(q=>q.skills[n.id]=s);selected=n.id;eventId=null;t=0;render();show('skill')});
function gallery(){const query=fold($('effectSearch').value),group=$('effectGroup').value,rows=catalog.effects.filter(e=>(group==='all'||e.group===group)&&fold(e.name+' '+e.id).includes(query));page=Math.max(0,Math.min(page,Math.max(0,Math.ceil(rows.length/16)-1)));$('effectList').replaceChildren(...rows.slice(page*16,page*16+16).map(e=>{const b=document.createElement('button');b.dataset.effect=e.id;b.className=effect?.id===e.id?'selected':'';if(e.frames){const im=new Image();im.src=source.assetURL(e.frames[0].src);im.alt=e.name;im.loading='lazy';b.append(im)}const label=document.createElement('span');label.textContent=e.name;b.append(label);b.title=e.id;b.onclick=safe(async()=>{if(!flush())return;effect=e;$('effectInfo').textContent=e.preview+' · '+e.source;$('addEffect').disabled=!skill();gallery();await previewEffect(e)});return b}));$('catalogInfo').textContent=`${catalog.skills.length} skill gốc · ${rows.length}/${catalog.effects.length} VFX · chọn VFX rồi thêm vào timeline.`;$('pageInfo').textContent=(page+1)+' / '+Math.max(1,Math.ceil(rows.length/16));$('prevEffects').disabled=page===0;$('nextEffects').disabled=(page+1)*16>=rows.length}
on('effectSearch','input',()=>{page=0;gallery()});on('effectGroup','change',()=>{page=0;gallery()});on('prevEffects','click',()=>{page--;gallery()});on('nextEffects','click',()=>{page++;gallery()});
async function previewEffect(fx){const token=++selectionRequest,temp=createSkillProject();temp.effects[fx.id]=fx;const loaded=await loadSkillImages(temp,s=>source.assetURL(s));if(token!==selectionRequest)return;stop();samplePreview={fx,images:loaded,started:performance.now(),duration:fx.frames?.reduce((n,f)=>n+f.duration,0)||.7};msg('Đang xem mẫu '+fx.id+' · chưa thêm vào project')}
async function addEffect(fx){if(!skill())throw Error('Tạo hoặc chọn skill trước');if(busy)throw Error('Đang tải ảnh');const identity=p,skillIdentity=selected;busy=true;$('addEffect').disabled=true;try{const temp=createSkillProject();temp.effects[fx.id]=fx;const loaded=await loadSkillImages(temp,s=>source.assetURL(s));if(p!==identity||selected!==skillIdentity)throw Error('Skill đã đổi trong lúc tải; thử lại');busy=false;const id=nextId('event_',skill().events.map(e=>e.id)),duration=Math.max(.1,Math.min(5,fx.frames?.reduce((n,f)=>n+f.duration,0)||.7)),e={id,effectId:fx.id,at:0,duration,scale:1,x:0,y:0,rotation:0,opacity:1,anchor:'target',follow:false,motion:'still',layer:'high',blend:'normal'};mutate(q=>{q.effects[fx.id]||=clone(fx);q.skills[selected].duration=Math.max(q.skills[selected].duration,duration);q.skills[selected].events.push(e)});for(const[src,img]of loaded)images.set(src,img);eventId=id;t=duration*.5;render();show('timeline')}finally{busy=false;render()}}
on('addEffect','click',()=>{if(effect)return addEffect(effect)});

on('play','click',()=>{if(!skill())return;const wasPlaying=playing;stop();playing=!wasPlaying;if(playing&&t>=skill().duration)t=0;$('play').textContent=playing?'Ⅱ Tạm dừng':'▶ Phát timeline';saveView()});
on('stop','click',()=>{stop();t=0;render();saveView()});
on('scrub','input',()=>{const next=Number($('scrub').value);if(!flush())return;stop();t=next;saveView()});
on('cast','click',()=>{if(!skill())return;if(!live){stop();live=new SkillPlayer(p,{onEvent:e=>{if(e.type==='hit-marker')msg('Mốc hit · '+e.skillId+' · chỉ tín hiệu, không gây sát thương')}})}playing=false;$('play').textContent='▶ Phát timeline';const result=live.cast(selected,{caster,target});msg(result?'Đang dùng thử · '+skill().name:'Skill bị động hoặc đang hồi chiêu: '+live.remaining(selected).toFixed(1)+' s')});
on('canvasTool','change',()=>{if(flush()){stop();saveView()}});on('solo','change',()=>{stop();saveView()});on('zoom','input',()=>saveView());
function worldPoint(e){const r=cv.getBoundingClientRect(),z=Number($('zoom').value);return {x:(e.clientX-r.left-r.width/2)/z-pan.x,y:(e.clientY-r.top-r.height*.65)/z-pan.y}}
function pickAt(pt){const s=skill();if(!s)return null;const visible=s.events.filter(e=>(!$('solo').checked||e.id===eventId)&&e.visible!==false),layer={low:0,high:1,glow:2};visible.sort((a,b)=>layer[a.layer]-layer[b.layer]);const order=[event(),...visible.reverse().filter(e=>e.id!==eventId)].filter(Boolean);return order.find(e=>hitSkillEvent(e,p.effects[e.effectId],instance(),t-e.at,pt.x,pt.y,12/Number($('zoom').value)))||null}
cv.addEventListener('pointerdown',safe(e=>{
 if(e.button!==0||busy||drag||!flush())return;e.preventDefault();stop();const pt=worldPoint(e),tool=$('canvasTool').value,before=snapshot();
 if(tool==='move'){const hit=pickAt(pt);if(!hit){notice(event()&&!skillEventActive(event(),t-event().at)?'Mốc đang chọn chưa hiện ở thời điểm này. Bấm Đến mốc chọn để chỉnh.':'Chạm vào khung VFX để chọn/kéo; dùng Đổi mục tiêu chung nếu muốn đổi điểm cam.');return}eventId=hit.id;render();if(hit.locked){notice('Mốc này đang khóa kéo. Bỏ Khóa kéo mốc này để di chuyển.');return}drag={pointer:e.pointerId,kind:tool,before,pt,x:hit.x,y:hit.y,id:hit.id,skill:selected}}
 else{drag={pointer:e.pointerId,kind:tool,before,pt,client:{x:e.clientX,y:e.clientY},target:{...target},pan:{...pan}};if(tool==='target'){target.x=pt.x;target.y=pt.y}}
 cv.setPointerCapture(e.pointerId);
}));
cv.addEventListener('pointermove',safe(e=>{
 if(!drag||drag.pointer!==e.pointerId)return;e.preventDefault();const d=drag,pt=worldPoint(e),z=Number($('zoom').value);
 if(d.kind==='move'){const s=d.before.project.skills[d.skill];p={...d.before.project,skills:{...d.before.project.skills,[d.skill]:{...s,events:s.events.map(v=>v.id===d.id?{...v,x:tidyNumber(d.x+pt.x-d.pt.x),y:tidyNumber(d.y+pt.y-d.pt.y)}:v)}}};fill('x',event().x);fill('y',event().y)}
 else if(d.kind==='target'){target.x=pt.x;target.y=pt.y}else{pan.x=d.pan.x+(e.clientX-d.client.x)/z;pan.y=d.pan.y+(e.clientY-d.client.y)/z}
}));
function restoreView(s){selected=s.selected;eventId=s.eventId;t=s.t;Object.assign(target,s.target);Object.assign(pan,s.pan)}
function finishDrag(e){if(!drag||drag.pointer!==e.pointerId)return;const d=drag;drag=null;try{if(e.type==='pointercancel'){p=d.before.project;restoreView(d.before);render();return}validateSkillProject(p);if(JSON.stringify(p)!==JSON.stringify(d.before.project)||JSON.stringify(target)!==JSON.stringify(d.before.target)||JSON.stringify(pan)!==JSON.stringify(d.before.pan)){remember(d.before);persist();render();notice(d.kind==='move'?'Đã kéo riêng mốc '+eventId+'; mốc khác giữ nguyên.':d.kind==='target'?'Đã đổi mục tiêu chung; các mốc neo mục tiêu cùng đi theo.':'Đã di chuyển khung nhìn.')}}catch(error){p=d.before.project;restoreView(d.before);render();notice('Lỗi: '+error.message+' · đã hoàn lại lần kéo này.',true)}}
for(const ev of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(ev,safe(finishDrag));
function nudge(dx,dy){if(!flush()||!event())return;if(event().locked)throw Error('Mốc đang khóa kéo');const step=decimalNumber($('nudgeStep').value);if(step<=0||step>1000)throw Error('Bước dịch phải lớn hơn 0 và không quá 1000');commit(editSkillEvent(p,selected,eventId,{x:tidyNumber(event().x+dx*step),y:tidyNumber(event().y+dy*step)}),{message:'Đã dịch riêng mốc '+eventId})}
for(const b of document.querySelectorAll('[data-nudge]'))b.onclick=safe(()=>nudge(...b.dataset.nudge.split(',').map(Number)));
cv.addEventListener('keydown',safe(e=>{const delta={ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];if(delta){e.preventDefault();nudge(...delta)}}));
async function historyAction(from,to){if(!flush()||busy||drag)return;const entry=from.at(-1);if(!entry)return;busy=true;try{const loaded=await loadSkillImages(entry.project,s=>source.assetURL(s));to.push(snapshot());from.pop();p=entry.project;images=loaded;restoreView(entry);stop();persist();render();notice('Đã hoàn tác / làm lại, giữ thời gian và mốc đang chọn.')}finally{busy=false;render()}}
on('undo','click',()=>historyAction(undo,redo));on('redo','click',()=>historyAction(redo,undo));
for(const[id,key]of [['projectId','id'],['projectName','name']])on(id,'change',()=>mutate(q=>q[key]=$(id).value.trim()));
function download(name,data,type='application/json'){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000)}
async function portable({all=false}={}){const q=clone(p),used=new Set(Object.values(q.skills).flatMap(s=>s.events.map(e=>e.effectId)));if(!all)q.effects=Object.fromEntries(Object.entries(q.effects).filter(([id])=>used.has(id)));const loaded=await loadSkillImages(q,s=>source.assetURL(s)),embedded=new Map();for(const e of Object.values(q.effects))for(const f of e.frames||[]){if(!embedded.has(f.src)){const im=loaded.get(f.src),c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);embedded.set(f.src,c.toDataURL('image/png'))}f.src=embedded.get(f.src)}return validateSkillProject(q)}
const runtime=async()=>{const r=await fetch(new URL('./runtime.mjs',import.meta.url));if(!r.ok)throw Error('Không tải được bộ phát');return r.text()};
on('save','click',async()=>effectsShelf.saveAndDownload(p=>p.id+'.skill-project.json'));on('export','click',async()=>download(p.id+'.skill-pack.json',JSON.stringify({format:'darkin-skill-pack-v1',project:await portable(),runtime:{version:SKILL_RUNTIME_VERSION,file:'skill-runtime.mjs',source:await runtime()},usage:'Use SkillPlayer and embedded effect frames; cast/update/draw low, high, glow. onEvent cast requests character animation; hit-marker is a visual timing signal, NEVER authoritative damage. Game/server validates skill ownership, mana, cooldown, range, targets, hits and rewards. Imported native skill rank data is metadata, not original RUN functions or shaders. See effects/README.md.'})));on('runtime','click',async()=>download('skill-runtime.mjs',await runtime(),'text/javascript'));
on('open','click',()=>$('projectFile').click());on('projectFile','change',async()=>{if(!flush())return;const f=$('projectFile').files[0];if(!f)return;if(busy)throw Error('Đang tải');busy=true;try{if(f.size>40*1024*1024)throw Error('Gói tối đa 40 MB');const next=clone(validateSkillProject(JSON.parse(await f.text()))),loaded=await loadSkillImages(next,s=>source.assetURL(s));remember(snapshot());p=next;images=loaded;selected=null;eventId=null;t=0;stop();persist();render();msg('Đã mở '+p.name)}finally{busy=false;$('projectFile').value='';render()}});on('reset','click',()=>{mutate(q=>{q.skills={};q.effects={}});selected=null;render()});
on('back','click',()=>{if(drag)finishDrag({pointerId:drag.pointer,type:'pointercancel'});stop();saveView();if(parent!==window)parent.postMessage({type:'darkin.effects.close'},location.origin);else location.href='../index.html'});window.addEventListener('message',e=>{if(e.origin!==location.origin||e.source!==parent)return;if(e.data?.type==='darkin.effects.pause'){if(drag)finishDrag({pointerId:drag.pointer,type:'pointercancel'});flush();active=false;stop();saveView()}if(e.data?.type==='darkin.effects.resume')active=true});

window.addEventListener('pagehide',()=>{if(drag)finishDrag({pointerId:drag.pointer,type:'pointercancel'});flush();saveView()});window.addEventListener('blur',()=>{if(drag)finishDrag({pointerId:drag.pointer,type:'pointercancel'});flush();saveView()});
window.addEventListener('resize',()=>{if(drag)finishDrag({pointerId:drag.pointer,type:'pointercancel'})});
function outline(e){const g=skillEventGeometry(e,p.effects[e.effectId],instance(),t-e.at);if(!g)return;ctx.save();ctx.translate(g.x,g.y);ctx.rotate(g.rotation*Math.PI/180);ctx.scale(g.scale,g.scale);ctx.strokeStyle=e.locked?'#ffbd80':'#d3ed92';ctx.lineWidth=1.5/(Number($('zoom').value)*g.scale);ctx.setLineDash([6/g.scale,4/g.scale]);ctx.strokeRect(g.x0,g.y0,g.x1-g.x0,g.y1-g.y0);ctx.setLineDash([]);ctx.beginPath();ctx.arc(0,0,7/(Number($('zoom').value)*g.scale),0,Math.PI*2);ctx.stroke();ctx.restore()}
let last=0;
function frame(now){
 const dt=Math.min(.1,Math.max(0,(now-last)/1000));last=now;
 if(active){const r=cv.getBoundingClientRect(),d=devicePixelRatio||1,z=Number($('zoom').value),w=Math.round(r.width*d),h=Math.round(r.height*d);if(cv.width!==w||cv.height!==h){cv.width=w;cv.height=h}ctx.setTransform(d,0,0,d,0,0);ctx.fillStyle=$('night').checked?'#101c30':'#36544b';ctx.fillRect(0,0,r.width,r.height);ctx.translate(r.width/2,r.height*.65);ctx.scale(z,z);ctx.translate(pan.x,pan.y);
  if(playing&&skill()){t+=dt;if(t>=skill().duration){if($('loop').checked)t%=skill().duration;else{t=skill().duration;playing=false;$('play').textContent='▶ Phát timeline';saveView()}}}live?.update(dt);
  const mode=samplePreview?'sample':live?'cast':'timeline';cv.dataset.previewMode=mode;
  $('previewMode').textContent=mode==='sample'?'Xem mẫu thư viện · không theo timeline':mode==='cast'?'Dùng thử · đồng hồ riêng':'Timeline kỹ năng · '+(playing?'đang phát':'đang dừng');
  const s=skill(),drawn=[];
  const draw=layer=>{if(mode==='sample'){if(layer==='high'){const sp=samplePreview,f=sp.fx.frames?.[0],scale=f?Math.min(1,300/f.w,200/f.h):1;drawSkillEvent(ctx,{duration:sp.duration,scale,x:0,y:0,rotation:0,opacity:1,anchor:'caster',follow:false,motion:'still',blend:'normal'},sp.fx,instance(),Math.min((now-sp.started)/1000,sp.duration*.8),sp.images)}}else if(live)live.draw(ctx,images,{layer});else for(const e of s?.events||[])if(e.layer===layer&&(!$('solo').checked||e.id===eventId)){drawSkillEvent(ctx,e,p.effects[e.effectId],instance(),t-e.at,images);if(skillEventActive(e,t-e.at))drawn.push(e.id)}};
  draw('low');for(const[pt,color,label]of [[caster,'#d3ed92','Người phát'],[target,'#ffbd80','Mục tiêu']]){ctx.fillStyle='#0005';ctx.beginPath();ctx.ellipse(pt.x,pt.y,18,8,0,0,Math.PI*2);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.arc(pt.x,pt.y-20,12,0,Math.PI*2);ctx.fill();ctx.font='12px system-ui';ctx.textAlign='center';ctx.fillText(label,pt.x,pt.y+22)}draw('high');if($('night').checked){ctx.fillStyle='#101a4b44';ctx.fillRect(-r.width/z-pan.x,-r.height/z-pan.y,r.width*2/z,r.height*2/z)}draw('glow');
  if(mode==='timeline'&&event()&&$('canvasTool').value==='move')outline(event());
  cv.dataset.activeEvents=drawn.join(',');$('scrub').value=t;$('time').textContent=(mode==='cast'?'Thử '+live.time.toFixed(2):t.toFixed(2))+' s';
  const e=event();$('eventStatus').textContent=e?(e.name||e.id)+' · '+e.at.toFixed(2)+' → '+tidyNumber(e.at+e.duration).toFixed(2)+' s · '+(e.visible===false?'đang ẩn':t<e.at?'chưa đến mốc':t>=e.at+e.duration?'đã hết mốc':'đang trong mốc')+(e.locked?' · khóa kéo':''):'Chọn mốc để chỉnh riêng từng VFX.';
 }requestAnimationFrame(frame);
}
const effectsShelf=mountSavedLibrary({kind:'effects',label:'Skill / VFX',anchor:$('save'),getProject:()=>p,portable:()=>portable({all:true}),beforeSave:()=>{if(!flush())throw Error('Sửa giá trị mốc chưa hợp lệ trước khi lưu');if(busy||drag)throw Error('Thả VFX / chờ tải xong trước khi lưu');stop()},load:async next=>{if(!flush())throw Error('Mốc chưa hợp lệ');if(busy||drag)throw Error('Đang tải / kéo VFX');next=clone(validateSkillProject(next));const loaded=await loadSkillImages(next,s=>source.assetURL(s));remember(snapshot());stop();p=next;images=loaded;selected=null;eventId=null;t=0;persist();render();},message:msg,download,afterSave:persist});
const sheetImporter=mountVfxSheetImport({beforeOpen:()=>{if(!flush()||busy||drag)throw Error('Hoàn tất chỉnh mốc / chờ tải trước khi tách ảnh');stop()},onSelect:async(resource,{add,context})=>{effect=clone(resource.effect);$('effectInfo').textContent=effect.preview+' · '+effect.source;gallery();render();if(add&&context){if(p!==context.project||selected!==context.skill||!skill()?.events.some(e=>e.id===context.event))throw Error('Project/mốc đã đổi, bộ frame vẫn còn trong thư viện.');const temp=createSkillProject();temp.effects[effect.id]=effect;const loaded=await loadSkillImages(temp,s=>source.assetURL(s));if(p!==context.project)throw Error('Project vừa đổi');mutate(q=>{q.effects[effect.id]=clone(effect);q.skills[context.skill].events.find(e=>e.id===context.event).effectId=effect.id});for(const [src,im]of loaded)images.set(src,im);eventId=context.event;render();show('timeline');return {added:true,replaced:true}}if(add&&skill()){await addEffect(effect);return {added:true}}await previewEffect(effect);show('effects');return {added:false}},message:msg,download});
const splitExisting=document.createElement('button');splitExisting.id='vfxSplitExisting';splitExisting.textContent='Tách ảnh của mốc đang chọn';$('cloneEvent').parentElement.after(splitExisting);splitExisting.onclick=safe(async()=>{if(!flush()||busy||drag)return;const fx=event()&&p.effects[event().effectId];if(!fx?.frames||fx.frames.length!==1)throw Error('Chọn mốc đang dùng một ảnh nguyên tấm. Với bộ nhiều frame, mở ảnh gốc từ thư viện để tách lại.');const context={project:p,skill:selected,event:eventId},f=fx.frames[0],im=images.get(f.src);if(!im)throw Error('Ảnh chưa tải xong');let src=f.src;if(!src.startsWith('data:image/')){const c=document.createElement('canvas');c.width=im.naturalWidth;c.height=im.naturalHeight;c.getContext('2d').drawImage(im,0,0);src=c.toDataURL('image/png')}await sheetImporter.openSource({src,name:fx.name},{context})});
safe(async()=>{
 source=await connectSource(!!window.STUDIO_GITHUB,new URL('../',import.meta.url));const r=await fetch(new URL('./catalog.json',import.meta.url));if(!r.ok)throw Error('Không tải được thư viện');catalog=await r.json();
 try{const old=localStorage.getItem(DRAFT);if(old){const saved=clone(validateSkillProject(JSON.parse(old))),loaded=await loadSkillImages(saved,s=>source.assetURL(s));p=saved;images=loaded}}catch{notice('Không đọc được nháp, dữ liệu cũ chưa bị ghi đè. Mở file đã lưu nếu cần.',true)}
 render();try{const v=JSON.parse(localStorage.getItem(VIEW));if(v?.project===p.id){if(Object.hasOwn(p.skills,v.selected))selected=v.selected;if(p.skills[selected]?.events.some(e=>e.id===v.eventId))eventId=v.eventId;if(Number.isFinite(v.t))t=v.t;if(v.target&&[v.target.x,v.target.y].every(Number.isFinite))Object.assign(target,v.target);if(v.pan&&[v.pan.x,v.pan.y].every(Number.isFinite))Object.assign(pan,v.pan);if(['move','target','pan'].includes(v.tool))$('canvasTool').value=v.tool;if(Number(v.zoom)>=.3&&Number(v.zoom)<=1.5)$('zoom').value=v.zoom;if([...$('panel').options].some(o=>o.value===v.panel))show(v.panel)}}catch{}
 nativeRows();gallery();render();notice('Sẵn sàng · chỉnh riêng từng VFX · '+Object.keys(SKILL_MOTIONS).length+' chuyển động · tự giữ đủ thời lượng');requestAnimationFrame(frame);
})();
