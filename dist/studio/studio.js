import {PARTS,sample,validate,gameExport} from './model.mjs';
import {connectSource} from './source.mjs';
import {mountLibrary} from './library.mjs';
import {LIMBS,wrap,ensureMiddleJoints,resizeSprite,validLimb,solveEndpoint,bendFromDrag} from './rig-edit.mjs';
import {mountSheetImporter} from './sheet-import.mjs';
import {applyResourceChanges} from './resource-tools.mjs';
import {mountOutfitFit} from './outfit-fit-ui.mjs';
import {drawHeightGuides} from './outfit-fit.mjs';
import {blankClip,appendInheritedFrame,copyPoseToFrames} from './timeline.mjs';
import {mountTimelineTools} from './timeline-ui.mjs';
import {mountAccessories} from './accessory-ui.mjs';
import {normalizeEquipment} from './equipment.mjs';
import {outfitName,spriteName,attachmentName} from './names-vi.mjs';
import {screenDelta} from './attachments.mjs';
import {mountMobileNavigation} from './mobile-ui.mjs';
import {importPoseClip,poseClipDescription} from './pose-library.mjs';
import {mountPetEditor} from './pet-entry.mjs';
import {mountWingEditor} from './wing-entry.mjs';
import {loadAttachmentSprites,attachmentImages} from './wings.mjs';
import {mountMapEditor} from './map-entry.mjs';
import {mountEffectsEditor} from './effects-entry.mjs';
import {reconcileMounts,rebasePortableMounts} from './mount-profiles.mjs';
import {mountProfileUI} from './mount-profile-ui.mjs';
import {ensureAnimationId,builtinAnimationId,animationPack,readAnimationPack} from './animation-identity.mjs';
import {switchAnimationMounts,captureAnimationEdits} from './animation-mounts.mjs';
import {mountSavedLibrary} from './saved-library-ui.mjs';
import {saveLibrary,getLibrary,listLibrary,watchLibrary} from './studio-library.mjs';
import {exportAccessoryPack,importAccessoryPack} from './mount-profiles.mjs';
const $=id=>document.getElementById(id), NC=window.NC;
let source, libraryUI, mountUI;
const status=msg=>$('status').textContent=msg;
const labels={head:'Đầu',torso:'Thân',armF:'Tay gần',armB:'Tay xa',legF:'Chân gần',legB:'Chân xa'};
const channels={lean:'Nghiêng thân',head:'Góc đầu',aF:'Tay gần',eF:'Khuỷu gần',aB:'Tay xa',eB:'Khuỷu xa',legF:'Đùi gần',kF:'Gối gần',legB:'Đùi xa',kB:'Gối xa',wAng:'Góc vũ khí',x:'Dịch X',y:'Dịch Y',headY:'Dịch đầu Y'};
const angular=k=>!['x','y','headY'].includes(k);
const state={project:null,pose:null,time:0,attachmentTime:0,key:0,playing:false,undo:[],redo:[],images:new Map(),zoom:3,face:1,part:'torso'};
let catalog, drawError=false, jointPositions={},anchorRect;
const ctx=$('stage').getContext('2d'), ac=$('anchor').getContext('2d');
$('upload').insertAdjacentHTML('afterend','<label><input id="autoSlice" type="checkbox" checked> Tự cắt các mảnh rời khi tải ảnh</label><button id="resources">▦ Tài nguyên đã cắt (0)</button>');
const outfitFit=mountOutfitFit({catalog:()=>catalog,project:()=>state.project,image:src=>image(src)});
document.querySelector('.viewbar>div').insertAdjacentHTML('afterbegin','<label title="Thước ngang theo đơn vị rig, mốc 0 tại mặt đất. Chỉ hiển thị, không xuất vào game."><input id="heightGuides" type="checkbox" autocomplete="off"> Thước ngang</label>');
$('heightGuides').checked=false;
$('anchor').insertAdjacentHTML('afterend','<label>Lấn vào thân (vai / hông)<input id="overlap" type="number" min="0" max="40" step="0.5" value="0"></label><p class="joint-info">Kéo vòng khuỷu/gối để gập. Trong ảnh bên dưới, có thể chỉnh cả elbow/knee. Đổi kích thước sẽ giữ tỷ lệ các khớp.</p>');
$('anchor').insertAdjacentHTML('beforebegin','<label id="anchorPartPicker">Bộ phận cần chỉnh neo<select id="anchorPart"></select></label>');
$('existing').closest('label').insertAdjacentHTML('afterend','<p class="hint" id="existingClipInfo" role="status"></p><label><input id="playLoadedClip" type="checkbox" checked> Phát ngay sau khi nạp clip</label>');
$('curve').append(new Option('Bật nhanh (snap)','snap'),new Option('Vượt rồi về (back)','back'));
document.querySelector('.stageNote').textContent='Kéo bàn tay/chân để đặt vị trí · Vòng khuỷu/gối để gập · Vai/hông để quay · Ghi pose để lưu';
const safe=fn=>(...args)=>{try{return Promise.resolve(fn(...args)).catch(e=>status('Lỗi: '+e.message))}catch(e){status('Lỗi: '+e.message);return Promise.resolve()}};
function options(el,rows){el.replaceChildren(...rows.map(([value,text])=>{const o=document.createElement('option');o.value=value;o.textContent=text;return o}))}
function rememberAnimation(){if(state.project){const id=ensureAnimationId(state.project.clip);state.project.animationClips||={};state.project.animationClips[id]=structuredClone(state.project.clip)}}
function checkpoint(){rememberAnimation();state.undo.push(JSON.stringify(state.project));if(state.undo.length>60)state.undo.shift();state.redo=[]}
function persist(){rememberAnimation();try{localStorage.setItem('nightcamp.cutout.v1',JSON.stringify(state.project));status('Đã lưu nháp trong trình duyệt')}catch{status('Bộ nhớ nháp đầy. Bấm Lưu vào thư viện hoặc tải bản sao project.')}}
async function image(src){if(state.images.has(src))return state.images.get(src);const promise=new Promise((resolve,reject)=>{const im=new Image();im.crossOrigin='anonymous';im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Không tải được ảnh '+src.slice(0,100)));im.src=source.assetURL(src)});state.images.set(src,promise);try{return await promise}catch(e){state.images.delete(src);throw e}}
async function portableImage(src){if(src.startsWith('data:'))return src;const img=await image(src),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);return canvas.toDataURL('image/png')}
async function portableProject(){const p=reconcileMounts(structuredClone(state.project),catalog);await Promise.all(attachmentImages(p).map(async s=>{s.src=await portableImage(s.src)}));return rebasePortableMounts(p)}
async function syncRig(){
  const p=state.project;
  ensureMiddleJoints(p.parts);
  reconcileMounts(p,catalog);mountUI?.refresh();
  await Promise.all(PARTS.map(async part=>{const s=p.parts[part];NC.SPR['rig_studio_'+part]={...s,name:'rig_studio_'+part,img:await image(s.src)}}));
  // Use a fresh rig name to avoid the original renderer's rig cache after anchor edits.
  const name='studio'+(++syncRig.seq);for(const part of PARTS)NC.SPR[`rig_${name}_${part}`]=NC.SPR['rig_studio_'+part];
  state.equip={top:'studio_top',weapon:'studio_weapon'};NC.ITEMS.studio_top={rig:name};NC.ITEMS.studio_weapon={grip:.12,wtype:'sword',sprite:'studio_sword',restAng:1.2,stance:-.7};
  NC.ITEMS.studio_top.attachments=await loadAttachmentSprites(p.attachments,image,(id,img)=>{NC.SPR[id]={name:id,img}},name);
  state.rig=NC.getRig(name);drawError=false;
  NC.GRIPFIX=false;
  NC.BendCache.on=false;
}
syncRig.seq=0;
function animationContext(t){return NC.animCtx(state.equip,{walk:t*Math.PI*2,moving:true})}
function setPose(){state.pose=sample(state.project.clip,state.time);if(!state.playing)state.attachmentTime=state.time;renderChannels()}
function renderChannels(){for(const k of Object.keys(channels)){const n=$('ch_'+k);n.value=Number(((state.pose[k]||0)*(angular(k)?180/Math.PI:1)).toFixed(2))}}
function renderKeys(){const c=state.project.clip;$('keys').replaceChildren(...c.keys.map((k,i)=>{const b=document.createElement('button');b.textContent=(i+1)+' · '+k.t.toFixed(2)+'s';b.classList.toggle('selected',i===state.key);b.setAttribute('aria-pressed',String(i===state.key));b.title='Frame '+(i+1);b.onclick=()=>selectKey(i);return b}));$('scrub').max=c.dur;$('scrub').value=state.time;$('keyTime').value=c.keys[state.key]?.t??0;$('curve').value=c.keys[state.key]?.curve||'inout';$('clock').textContent=state.time.toFixed(2)+' s'}
function pausePlayback(){state.playing=false;$('play').textContent='▶ Phát'}
function selectKey(i){pausePlayback();state.key=i;state.time=state.project.clip.keys[i].t;setPose();renderKeys()}
function renderMeta(){const c=state.project.clip;if($('stableAnimationId'))$('stableAnimationId').textContent='ID hoạt ảnh cố định: '+ensureAnimationId(c);$('clipName').value=c.name;$('kind').value=c.kind;$('duration').value=c.dur;$('hit').value=c.hit;renderKeys();renderPart();renderChannels();accessoryUI.refresh().catch(e=>status('Lỗi phụ kiện: '+e.message))}
function renderPart(){const s=state.project.parts[state.part];$('part').value=state.part;$('anchorPart').value=state.part;$('sw').value=s.w;$('sh').value=s.h;$('overlap').value=s.overlap??0;$('overlap').disabled=!/^(arm|leg)/.test(state.part);options($('joint'),Object.keys(s.joints).map(k=>[k,k]));jointInputs();const re=new RegExp('_'+state.part+'(?:_v[0-9]+)?$');const candidates=Object.entries(catalog.sprites).filter(([n])=>re.test(n)).map(([n])=>[n,spriteName(n)||'Ảnh bộ phận']);options($('sprite'),[['','— Chọn ảnh thay thế —'],...candidates]);$('resources').textContent='▦ Tài nguyên đã cắt ('+(state.project.resources?.length||0)+')';}
function jointInputs(){const j=state.project.parts[state.part].joints[$('joint').value];if(j){$('jx').value=j[0];$('jy').value=j[1]}}
function prepareEquipment(items){return normalizeEquipment(items,source?.accessories||[]).map((a,i)=>({...a,name:attachmentName(a,source?.accessories||[],i)}))}
async function adopt(p){validate(p);state.project=switchAnimationMounts(structuredClone(p));if(state.project.attachments)state.project.attachments=prepareEquipment(state.project.attachments);outfitFit.refresh(p.rig);state.playing=false;state.key=0;state.time=0;await syncRig();const defaults=NC.Anim.setup(animationContext(0));for(const key of state.project.clip.keys)key.P={...defaults,...key.P};setPose();renderMeta();persist()}
async function loadRig(name){checkpoint();const p=structuredClone(state.project);p.rig=name;delete p.outfitFit;delete p.studioLibraryId;p.parts=Object.fromEntries(PARTS.map(part=>[part,structuredClone(catalog.sprites[`rig_${name}_${part}`])]));await adopt(p)}
function record(){checkpoint();const c=state.project.clip;const t=Math.round(state.time*1000)/1000;const key={t,curve:$('curve').value,P:structuredClone(state.pose)};const i=c.keys.findIndex(k=>Math.abs(k.t-t)<.001);if(i>=0)c.keys[i]=key;else c.keys.push(key);c.keys.sort((a,b)=>a.t-b.t);state.key=c.keys.indexOf(key);renderKeys();persist()}
function download(name,content,type='application/json'){const a=document.createElement('a');const url=URL.createObjectURL(new Blob([content],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000)}
async function preset(){checkpoint();const c=state.project.clip,name=$('preset').value,definition=NC.Anim.CLIPS[name];c.id=builtinAnimationId(name);c.name=name;if(definition){c.dur=definition.dur;c.kind='attack';c.hit=definition.ev?.find(e=>e[1]==='hit')?.[0]??c.dur*.4}else{c.kind=/walk|run/i.test(name)?'walk':'loop';c.hit=Math.min(c.hit,c.dur)}const dur=c.dur,count=Math.max(9,Math.ceil(dur*30)+1);c.keys=Array.from({length:count},(_,i)=>{const t=i*dur/(count-1);return {t,curve:'lin',P:NC.Anim.sample(name,t,animationContext(t/dur))}});if(c.kind==='walk'||c.kind==='loop')c.keys.at(-1).P=structuredClone(c.keys[0].P);switchAnimationMounts(state.project);await syncRig();selectKey(0);renderMeta();persist()}
function event(id,type,fn){$(id).addEventListener(type,safe(fn))}
const accessoryUI=mountAccessories({project:()=>state.project,head:()=>state.project.parts.head,eyes:()=>NC.eyesOf?.(state.rig.P.head),image,headWidth:()=>{const s=state.rig.P.head;return s.w*(s.head?.[2]||.8)},message:status,refreshProfiles:()=>mountUI?.refresh(),previewAnchor:(id,anchor)=>{const a=NC.ITEMS.studio_top?.attachments?.find(a=>a.id===id);if(a)a.anchor=[...anchor]},set:async items=>{checkpoint();state.project.attachments=captureAnimationEdits(state.project.attachments,prepareEquipment(items),state.project.clip,state.project);await syncRig();persist()}});
async function setMountProject(p){p.attachments=prepareEquipment(p.attachments);validate(p);checkpoint();state.project=p;await syncRig();renderPart();await accessoryUI.refresh();persist()}
mountUI=mountProfileUI({project:()=>state.project,current:()=>accessoryUI.selected(),portableImage,download,message:status,set:setMountProject,useOriginalHead:async()=>{const p=structuredClone(state.project);p.parts.head=structuredClone(catalog.sprites.rig_traveler_head);p.headId='nightcamp-head-original-v1';await setMountProject(p)}});
mountTimelineTools({
 ready:()=>!!state.project&&!!state.pose,
 error:message=>status('Lỗi: '+message),
 create:({name,kind,dur,seed})=>{
  const pose=seed==='rest'?NC.Anim.setup(animationContext(0)):state.pose;
  const clip=blankClip({name,kind,dur,pose});checkpoint();state.project.clip=clip;switchAnimationMounts(state.project);syncRig().catch(e=>status(e.message));selectKey(0);renderMeta();persist();status('Đã tạo animation mới với đúng 1 frame và ID riêng cố định. Chỉnh pose rồi bấm Thêm frame kế tiếp.');
 },
 add:step=>{
  const result=appendInheritedFrame(state.project.clip,state.key,state.pose,step);checkpoint();state.project.clip=result.clip;selectKey(result.index);renderMeta();persist();status('Đã thêm frame '+(result.index+1)+' giống tư thế vừa chỉnh; pose frame trước cũng đã lưu.');
 },
 capture:()=>{pausePlayback();return {index:state.key,clip:structuredClone(state.project.clip),pose:structuredClone(state.pose),identity:state.project.clip}},
 copy:(captured,targets)=>{
  if(state.project.clip!==captured.identity)throw Error('Clip đã thay đổi. Mở lại hộp sao chép.');
  const result=copyPoseToFrames(state.project.clip,captured.index,targets,captured.pose);checkpoint();state.project.clip=result.clip;selectKey(captured.index);renderMeta();persist();status('Đã sao chép tư thế frame '+(captured.index+1)+' sang '+result.count+' frame; giữ nguyên thời điểm và đường cong.');
 },
});
mountPetEditor(pausePlayback);
mountMapEditor(pausePlayback);
mountEffectsEditor(pausePlayback);
mountWingEditor({pause:pausePlayback,project:()=>state.project,portable:portableProject,current:()=>accessoryUI.selected(),set:async items=>{const next=prepareEquipment(items);validate({...state.project,attachments:next});checkpoint();state.project.attachments=next;await syncRig();await accessoryUI.refresh();persist()},message:status});
mountMobileNavigation();
for(const [k,label] of Object.entries(channels)){const row=document.createElement('div');row.className='channel';const l=document.createElement('label');l.htmlFor='ch_'+k;l.textContent=label;const n=document.createElement('input');n.type='number';n.step=angular(k)?1:.5;n.id='ch_'+k;row.append(l,n);$('channels').append(row);n.onchange=()=>{if(!Number.isFinite(n.valueAsNumber))return;state.playing=false;state.pose[k]=n.valueAsNumber*(angular(k)?Math.PI/180:1);status('Pose chưa ghi — bấm Ghi pose để lưu vào clip')}}
options($('part'),PARTS.map(p=>[p,labels[p]]));
options($('anchorPart'),PARTS.map(p=>[p,labels[p]]));
$('partList').replaceChildren(...PARTS.map(part=>{const b=document.createElement('button');b.textContent=labels[part];b.onclick=()=>{state.part=part;renderPart()};return b}));
event('part','change',()=>{state.part=$('part').value;renderPart()});event('joint','change',jointInputs);
event('anchorPart','change',()=>{state.part=$('anchorPart').value;renderPart()});
event('rig','change',()=>loadRig($('rig').value));
event('newRig','click',()=>{const name=prompt('Tên rig mới (chữ Latin, số, dấu _):','custom_hero');if(!name)return;if(!/^[a-zA-Z0-9_-]{1,60}$/.test(name))throw Error('Tên rig chỉ dùng chữ Latin, số, _ và -');checkpoint();state.project.rig=name;delete state.project.studioLibraryId;persist();status('Rig mới: '+name+' — thay ảnh từng bộ phận rồi lưu project')});
event('sprite','change',async()=>{if(!$('sprite').value)return;checkpoint();state.project.parts[state.part]=structuredClone(catalog.sprites[$('sprite').value]);await syncRig();renderPart();persist()});
for(const id of ['jx','jy','sw','sh','overlap'])event(id,'change',async()=>{const value=$(id).valueAsNumber;if(!Number.isFinite(value))throw Error('Giá trị không hợp lệ');const s=structuredClone(state.project.parts[state.part]);if(id==='overlap'){if(value<0||value>40)throw Error('Độ chồng mép từ 0 đến 40');s.overlap=value}else if(id==='jx'||id==='jy')s.joints[$('joint').value][id==='jx'?0:1]=value;else resizeSprite(s,id==='sw'?'w':'h',value);if(!validLimb(s,state.part))throw Error('Các khớp phải cách nhau ít nhất 1 đơn vị');checkpoint();state.project.parts[state.part]=s;await syncRig();jointInputs();persist()});
event('sample','click',preset);event('record','click',record);
event('deleteKey','click',()=>{if(state.project.clip.keys.length===1)throw Error('Phải giữ ít nhất một keyframe');checkpoint();state.project.clip.keys.splice(state.key,1);selectKey(0);persist()});
event('keyTime','change',()=>{const t=$('keyTime').valueAsNumber,c=state.project.clip;if(!Number.isFinite(t)||t<0||t>c.dur||c.keys.some((k,i)=>i!==state.key&&Math.abs(k.t-t)<.001))throw Error('Thời điểm không hợp lệ hoặc trùng key');checkpoint();const key=c.keys[state.key];key.t=t;c.keys.sort((a,b)=>a.t-b.t);selectKey(c.keys.indexOf(key));persist()});
event('curve','change',()=>{checkpoint();state.project.clip.keys[state.key].curve=$('curve').value;persist()});
event('scrub','input',()=>{state.playing=false;state.time=+$('scrub').value;state.key=state.project.clip.keys.reduce((best,k,i)=>Math.abs(k.t-state.time)<Math.abs(state.project.clip.keys[best].t-state.time)?i:best,0);setPose();renderKeys()});
event('play','click',()=>{state.playing=!state.playing;if(state.time>=state.project.clip.dur)state.time=0;$('play').textContent=state.playing?'Ⅱ Dừng':'▶ Phát'});
for(const id of ['clipName','kind','duration','hit'])event(id,'change',()=>{const c=structuredClone(state.project.clip);c.name=$('clipName').value.trim();c.kind=$('kind').value;const dur=$('duration').valueAsNumber;if(!Number.isFinite(dur)||dur<.1||dur>30)throw Error('Thời lượng từ 0.1 đến 30 giây');const scale=dur/c.dur;c.keys.forEach(k=>k.t*=scale);c.dur=dur;c.hit=Math.min(dur,$('hit').valueAsNumber);validate({...state.project,clip:c});checkpoint();state.project.clip=c;state.time=Math.min(state.time,dur);renderMeta();persist()});
function describeExistingClip(){const clip=NC.POSE_LIB?.[$('existing').value];$('existingClipInfo').textContent=clip?poseClipDescription(clip)+'. Nạp clip sẽ thay animation đang mở; có thể hoàn tác.':''}
event('existing','change',describeExistingClip);
event('loadClip','click',async()=>{
 if($('existing').value.startsWith('saved:')){await openSavedAnimation($('existing').value.slice(6));return}
 const data=NC.POSE_LIB?.[$('existing').value];if(!data)throw Error('Hãy chọn clip có sẵn');
 const {clip,notes,description}=importPoseClip(data,NC.Anim.setup(animationContext(0)));
 ensureAnimationId(clip,{sourceKey:$('existing').value});validate({...state.project,clip});checkpoint();state.project.clip=clip;switchAnimationMounts(state.project);await syncRig();drawError=false;selectKey(0);renderMeta();persist();
 if($('playLoadedClip').checked&&clip.keys.length>1){state.playing=true;$('play').textContent='Ⅱ Dừng'}
 $('existingClipInfo').textContent=description+(notes.length?'. '+notes.join('. '):'')+'.';
 status('Đã nạp '+clip.name+' · '+clip.keys.length+' key'+(notes.length?' · '+notes.join('. '):''));
});
event('save','click',async()=>{validate(state.project);await rigShelf.saveAndDownload(p=>p.rig+'.cutout.json')});
event('open','click',()=>$('projectFile').click());event('projectFile','change',async()=>{const f=$('projectFile').files[0];if(!f)return;if(f.size>30*1024*1024)throw Error('Project tối đa 30 MB');const p=validate(JSON.parse(await f.text()));checkpoint();await adopt(p);$('projectFile').value=''});
const fitDescription=result=>result.mode==='template'?'khớp rộng/cao và khớp nối':'giữ tỷ lệ ảnh';
const sheetImporter=mountSheetImporter({onOpen:dialog=>outfitFit.open(dialog),store:async(resources,assignments,updates=[])=>{const result=await outfitFit.apply(applyResourceChanges(state.project,resources,assignments,updates),assignments),p=result.project;validate(p);checkpoint();state.project=p;await syncRig();renderPart();persist();status('Đã lưu vai trò tài nguyên và gán '+Object.keys(assignments).length+' bộ phận.'+(result.fitted?' Tự căn '+result.fitted+' bộ phận theo '+outfitName(result.reference)+'; '+fitDescription(result)+'.':' Giữ kích thước hiện tại.'))}});
event('refitOutfit','click',async()=>{
 if(!state.project)throw Error('Chờ tải xong project');
 const result=await outfitFit.apply(structuredClone(state.project),state.project.parts);
 if(!result.fitted)throw Error('Bật Khớp kích thước trước khi căn lại');
 validate(result.project);checkpoint();state.project=result.project;await syncRig();renderPart();persist();
 status('Đã căn lại 6 bộ phận theo '+outfitName(result.reference)+'; '+fitDescription(result)+'. Có thể Hoàn tác.');
});
event('resources','click',()=>sheetImporter.gallery(state.project.resources));
$('imageFile').accept='image/png,image/webp,image/jpeg';$('upload').textContent='＋ Thêm ảnh PNG / WebP / JPG';
event('upload','click',()=>$('imageFile').click());event('imageFile','change',async()=>{
 const f=$('imageFile').files[0];if(!f)return;
 try{
  if(!['image/png','image/webp','image/jpeg'].includes(f.type)||f.size>8*1024*1024)throw Error('Chọn ảnh PNG/WebP/JPG tối đa 8 MB');
  let src=await new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsDataURL(f)});
  const img=await image(src);
  if($('autoSlice').checked)await sheetImporter.open(img);
  else{
   if(f.type==='image/jpeg'){const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;c.getContext('2d').drawImage(img,0,0);src=c.toDataURL('image/png')}
   const assignments={[state.part]:{src}},candidate=applyResourceChanges(state.project,[],assignments);
   const result=await outfitFit.apply(candidate,assignments);validate(result.project);
   checkpoint();state.project=result.project;await syncRig();renderPart();persist();
   status('Đã thay ảnh bộ phận đang chọn.'+(result.fitted?' Tự căn theo '+outfitName(result.reference)+'; '+fitDescription(result)+'.':''));
  }
 }finally{$('imageFile').value=''}
});
event('export','click',async()=>{const p=await portableProject();const e=gameExport(p);const bundle={format:'nightcamp-cutout-export-v1',...e,project:p};download(e.rig+'.game-bundle.json',JSON.stringify(bundle,null,2));status('Đã xuất bundle kèm đủ ảnh. Có thể thử trực tiếp trong Cutout Playground.')});
for(const [id,from,to] of [['undo','undo','redo'],['redo','redo','undo']])event(id,'click',async()=>{if(!state[from].length)return;state[to].push(JSON.stringify(state.project));await adopt(JSON.parse(state[from].pop()))});
event('zoom','input',()=>state.zoom=+$('zoom').value);event('flip','change',()=>state.face=$('flip').checked?-1:1);
function drawAnchor(){if(!state.project)return;const s=NC.SPR['rig_studio_'+state.part];if(!s?.img)return;const scale=Math.min(220/s.w,185/s.h);anchorRect={x:(270-s.w*scale)/2,y:(230-s.h*scale)/2,scale};ac.clearRect(0,0,270,230);ac.drawImage(s.img,anchorRect.x,anchorRect.y,s.w*scale,s.h*scale);for(const [j,p] of Object.entries(s.joints)){const x=anchorRect.x+p[0]*scale,y=anchorRect.y+p[1]*scale;ac.fillStyle=j===$('joint').value?'#d3ed92':'#efb17a';ac.beginPath();ac.arc(x,y,4,0,7);ac.fill();ac.font='10px sans-serif';ac.fillText(j,x+6,y)}}
let anchorDrag=false;
event('anchor','pointerdown',e=>{e.preventDefault();if(!anchorRect||!state.project)return;const rect=$('anchor').getBoundingClientRect(),x=(e.clientX-rect.left)*270/rect.width,y=(e.clientY-rect.top)*230/rect.height;let closest=null,distance=18;for(const [name,p]of Object.entries(state.project.parts[state.part].joints)){const d=Math.hypot(x-anchorRect.x-p[0]*anchorRect.scale,y-anchorRect.y-p[1]*anchorRect.scale);if(d<distance){closest=name;distance=d}}if(!closest)return;$('joint').value=closest;jointInputs();checkpoint();anchorDrag=true;$('anchor').setPointerCapture(e.pointerId)});
function updateAnchor(e){const box=$('anchor').getBoundingClientRect(),candidate=structuredClone(state.project.parts[state.part]),j=candidate.joints[$('joint').value];j[0]=+(((e.clientX-box.left)*270/box.width-anchorRect.x)/anchorRect.scale).toFixed(2);j[1]=+(((e.clientY-box.top)*230/box.height-anchorRect.y)/anchorRect.scale).toFixed(2);if(!validLimb(candidate,state.part))return;state.project.parts[state.part].joints=candidate.joints;NC.SPR['rig_studio_'+state.part].joints=candidate.joints;state.rig.P[state.part].joints=candidate.joints;jointInputs();}
event('anchor','pointermove',e=>{if(anchorDrag)updateAnchor(e)});for(const name of ['pointerup','pointercancel'])event('anchor',name,async()=>{if(anchorDrag){anchorDrag=false;await syncRig();persist()}});
const chains=[['pel','neck','headTop'],['shN','elN','haN'],['shF','elF','haF'],['hipN','knN','ftN'],['hipF','knF','ftF']];
let drag=null,accessoryDrag=null;
function previewScale(rect){return state.zoom*(document.body.classList.contains('studio-mobile')?Math.min(1,rect.height/480):1)}
function measure(pose){const r=$('stage').getBoundingClientRect();return NC.rigJoints(state.equip,{...pose,face:state.face},r.width/2,r.height*.78,previewScale(r))}
event('stage','pointerdown',e=>{e.preventDefault();if(!state.pose)return;const r=$('stage').getBoundingClientRect();if(accessoryUI.dragEnabled()){const a=accessoryUI.selected();checkpoint();pausePlayback();const matrix=NC.attachmentMatrix(state.equip,{...state.pose,face:state.face},{...a,x:0,y:0,rotation:0,scale:1},r.width/2,r.height*.78,previewScale(r));accessoryDrag={id:a.id,x:a.x,y:a.y,pointer:[e.clientX,e.clientY],matrix};$('stage').setPointerCapture(e.pointerId);document.body.classList.add('rig-dragging');return}if(!$('bones').checked)return;const point=[e.clientX-r.left,e.clientY-r.top],joints=measure(state.pose);let nearest=null,dist=24;const handles=Object.values(LIMBS).flatMap(l=>[l.end,l.middle,l.root]).concat('headTop');for(const name of handles){const p=joints[name],d=Math.hypot(point[0]-p[0],point[1]-p[1]);if(d<dist){dist=d;nearest=name}}if(!nearest)return;state.playing=false;$('play').textContent='▶ Phát';drag={name:nearest,point,joints,pose:structuredClone(state.pose)};$('stage').setPointerCapture(e.pointerId);document.body.classList.add('rig-dragging');window.getSelection()?.removeAllRanges()});
event('stage','pointermove',e=>{if(accessoryDrag){e.preventDefault();const a=state.project.attachments.find(a=>a.id===accessoryDrag.id),delta=screenDelta(accessoryDrag.matrix,e.clientX-accessoryDrag.pointer[0],e.clientY-accessoryDrag.pointer[1]);a.x=Math.max(-2000,Math.min(2000,accessoryDrag.x+delta[0]));a.y=Math.max(-2000,Math.min(2000,accessoryDrag.y+delta[1]));const live=NC.ITEMS.studio_top.attachments.find(item=>item.id===a.id);live.x=a.x;live.y=a.y;accessoryUI.updatePosition();return}if(!drag)return;e.preventDefault();const r=$('stage').getBoundingClientRect(),delta=[e.clientX-r.left-drag.point[0],e.clientY-r.top-drag.point[1]],limb=Object.values(LIMBS).find(l=>[l.end,l.middle,l.root].includes(drag.name));
 if(limb){state.part=limb.part;if(drag.name===limb.end&&!e.shiftKey)state.pose=solveEndpoint(drag.pose,limb,[drag.joints[limb.end][0]+delta[0],drag.joints[limb.end][1]+delta[1]],measure);else if(drag.name===limb.middle||e.shiftKey)state.pose=bendFromDrag(drag.pose,limb,drag.joints,delta,measure);else{const pivot=drag.joints[limb.root],end=drag.joints[limb.end],a=Math.atan2(end[1]-pivot[1],end[0]-pivot[0]),b=Math.atan2(end[1]+delta[1]-pivot[1],end[0]+delta[0]-pivot[0]);state.pose={...drag.pose,hk:0,bk:0,ik:0,plant:0};const joint=measure({...state.pose,[limb.angle]:state.pose[limb.angle]+.01}),next=Math.atan2(joint[limb.end][1]-joint[limb.root][1],joint[limb.end][0]-joint[limb.root][0]);state.pose[limb.angle]+=(Math.sign(wrap(next-a))||1)*wrap(b-a)}}else{const pivot=drag.joints.neck,end=drag.joints.headTop;state.pose={...drag.pose,head:drag.pose.head+state.face*wrap(Math.atan2(end[1]+delta[1]-pivot[1],end[0]+delta[0]-pivot[0])-Math.atan2(end[1]-pivot[1],end[0]-pivot[0]))}}
 renderChannels();status('Đang chỉnh '+(limb?labels[limb.part]:'đầu')+'. Kéo vòng khuỷu/gối để gập; bấm Ghi pose khi xong.');});
for(const name of ['pointerup','pointercancel','lostpointercapture'])event('stage',name,async()=>{if(accessoryDrag){const a=state.project.attachments.find(a=>a.id===accessoryDrag.id);if(a){const original={...structuredClone(a),x:accessoryDrag.x,y:accessoryDrag.y};captureAnimationEdits([original],[a],state.project.clip,state.project)}accessoryDrag=null;await syncRig();persist();await accessoryUI.refresh()}if(drag){drag=null;renderPart()}document.body.classList.remove('rig-dragging')});
for(const id of ['stage','anchor'])for(const name of ['contextmenu','selectstart','dragstart'])$(id).addEventListener(name,e=>e.preventDefault());
function render(){
 const canvas=$('stage'),r=canvas.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
 if(canvas.width!==Math.round(r.width*dpr)||canvas.height!==Math.round(r.height*dpr)){canvas.width=Math.round(r.width*dpr);canvas.height=Math.round(r.height*dpr)}
 ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);const x=r.width/2,y=r.height*.78;
 ctx.strokeStyle='#344253';ctx.lineWidth=1;for(let gx=x%40;gx<r.width;gx+=40){ctx.beginPath();ctx.moveTo(gx,0);ctx.lineTo(gx,r.height);ctx.stroke()}
 ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(r.width,y);ctx.stroke();
 if($('heightGuides').checked)drawHeightGuides(ctx,r.width,r.height,y,previewScale(r)*.87);
 if(!state.rig||drawError)return;
 try{const P={...state.pose,face:state.face,attachmentTime:state.attachmentTime,animationId:state.project.clip.id,animationEditing:true},scale=previewScale(r);NC.drawRig(ctx,state.rig,state.equip,P,x,y,{scale,noWeapon:true});jointPositions=NC.rigJoints(state.equip,P,x,y,scale);
  if($('bones').checked){ctx.strokeStyle='#d3ed9299';ctx.lineWidth=1.5;for(const chain of chains){ctx.beginPath();chain.forEach((key,i)=>ctx[i?'lineTo':'moveTo'](...jointPositions[key]));ctx.stroke()}
   for(const [name,p] of Object.entries(jointPositions)){if(name==='wHand'||name==='wTip')continue;ctx.fillStyle='#d3ed92';ctx.beginPath();ctx.arc(...p,3.5,0,7);ctx.fill()}
  }drawAnchor();
 }catch(e){drawError=true;status('Lỗi render: '+e.message);console.error(e)}
}
function drawJointHints(){if(!$('bones').checked||!state.rig||drawError)return;ctx.save();ctx.lineWidth=2;ctx.strokeStyle='#ffbe84';for(const limb of Object.values(LIMBS)){const p=jointPositions[limb.middle];if(p){ctx.beginPath();ctx.arc(...p,7,0,Math.PI*2);ctx.stroke()}}ctx.restore()}
let last=0;function frame(now){const dt=Math.min(.1,(now-last)/1000);last=now;if(state.playing&&state.project){const c=state.project.clip;state.time+=dt*+$('speed').value;state.attachmentTime+=dt*+$('speed').value;if(state.time>c.dur){if(c.kind==='loop'||c.kind==='walk')state.time%=c.dur;else{state.time=c.dur;state.playing=false;$('play').textContent='▶ Phát'}}setPose();$('scrub').value=state.time;$('clock').textContent=state.time.toFixed(2)+' s'}if(!$('petStudioDialog')?.open&&!$('wingStudioDialog')?.open&&!$('mapStudioDialog')?.open){render();drawJointHints()}requestAnimationFrame(frame)}
async function reloadSource(){
  status('Đang đọc thư viện…');
  const next=await connectSource();source=next;catalog=next.catalog;NC.POSE_LIB=next.poses;state.images.clear();
  outfitFit.refresh();
  accessoryUI.setCatalog(next.accessories,next.catalog.build);
  options($('rig'),catalog.rigs.map(n=>[n,outfitName(n)]));await rigShelf.refresh();
  options($('existing'),Object.entries(NC.POSE_LIB||{}).map(([id,c])=>[id,c.name+' · '+poseClipDescription(c)]));await refreshSavedAnimations();describeExistingClip();
  const current=$('preset').value;
  options($('preset'),Object.keys({...NC.Anim.BASE,...NC.Anim.CLIPS}).map(id=>[id,id]));$('preset').value=current||'idle';
  if(libraryUI)libraryUI.update(source);else libraryUI=mountLibrary(source,{
    refresh:()=>safe(async()=>{persist();await reloadSource();await syncRig();status(source.warning||'Đã cập nhật thư viện tại commit '+source.ref.slice(0,7))})(),
    apply:async file=>{const img=await image(file.path),canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;canvas.getContext('2d').drawImage(img,0,0);checkpoint();state.project.parts[state.part].src=canvas.toDataURL('image/png');await syncRig();renderPart();persist();status('Đã gắn ảnh vào '+labels[state.part]+'. Chỉnh kích thước/khớp nếu cần.')},
    rig:async name=>{await loadRig(name);$('rig').value=name},
  });
}
const rigShelf=mountSavedLibrary({kind:'rigs',label:'Nhân vật / rig',anchor:$('rig').closest('label'),picker:$('rig'),getName:p=>outfitName(p.rig),getProject:()=>state.project,portable:portableProject,load:async p=>{checkpoint();await adopt(p)},message:status,download,afterSave:async p=>{persist();for(const clip of Object.values(p.animationClips||{[p.clip.id]:p.clip}))await saveLibrary('animations',ensureAnimationId(clip),clip.name,clip);for(const a of p.attachments||[]){const pack=await exportAccessoryPack(p,[a.id],portableImage);await saveLibrary('accessories',a.studioLibraryId||a.accessoryId,a.name,pack)}}});
async function refreshSavedAnimations(){const sel=$('existing'),old=sel.value;sel.querySelector('optgroup[data-animations]')?.remove();const g=document.createElement('optgroup');g.label='Hoạt ảnh đã lưu của bạn';g.dataset.animations='true';for(const r of await listLibrary('animations'))g.append(new Option(r.name+' · '+r.id,'saved:'+r.id));sel.append(g);sel.value=old;}
async function openSavedAnimation(id){const r=await getLibrary('animations',id);if(!r)throw Error('Hoạt ảnh không còn trong thư viện');const clip=structuredClone(r.data);ensureAnimationId(clip);validate({...state.project,clip});checkpoint();state.project.clip=clip;switchAnimationMounts(state.project);await syncRig();selectKey(0);renderMeta();persist();status('Đã nạp '+clip.name+' · ID giữ nguyên: '+clip.id)}
$('existing').closest('label').insertAdjacentHTML('beforebegin','<p id="stableAnimationId"></p><button id="saveAnimationLibrary">Lưu hoạt ảnh vào thư viện</button><button id="exportAnimationOnly">Xuất riêng hoạt ảnh + ID</button><button id="importAnimationOnly">Nhập hoạt ảnh + ID</button><input id="animationOnlyFile" type="file" accept=".json" hidden>');
event('saveAnimationLibrary','click',async()=>{rememberAnimation();const clip=state.project.clip;await saveLibrary('animations',ensureAnimationId(clip),clip.name,clip);await refreshSavedAnimations();status('Đã lưu hoạt ảnh; chọn trong Clip có sẵn để nạp lại cùng ID.')});
event('exportAnimationOnly','click',()=>{const pack=animationPack(state.project.clip);download(pack.animationId+'.animation-pack.json',JSON.stringify(pack));status('Đã xuất riêng hoạt ảnh + ID, không chứa ảnh nhân vật.')});
event('importAnimationOnly','click',()=>$('animationOnlyFile').click());event('animationOnlyFile','change',async()=>{try{const f=$('animationOnlyFile').files[0];if(!f)return;if(f.size>10*1024*1024)throw Error('Hoạt ảnh tối đa 10 MB');const clip=readAnimationPack(JSON.parse(await f.text()));validate({...state.project,clip});await saveLibrary('animations',clip.id,clip.name,clip);await openSavedAnimation(clip.id)}finally{$('animationOnlyFile').value=''}});
watchLibrary(safe(refreshSavedAnimations));
const accessoryShelf=mountSavedLibrary({kind:'accessories',label:'Phụ kiện / vũ khí / điểm neo',anchor:$('mountProfilePanel'),getProject:()=>accessoryUI.selected(),portable:async()=>{const a=accessoryUI.selected();if(!a)throw Error('Chọn phụ kiện muốn lưu');return exportAccessoryPack(state.project,[a.id],portableImage)},load:async pack=>setMountProject(importAccessoryPack(state.project,pack)),message:status,download,afterSave:persist});
safe(async()=>{
  await reloadSource();$('rig').value='traveler';
  const parts=Object.fromEntries(PARTS.map(p=>[p,structuredClone(catalog.sprites['rig_traveler_'+p])]));
  const p={format:'nightcamp-cutout-v1',rig:'traveler',parts,clip:{name:'my_walk',kind:'walk',dur:1,hit:.4,keys:[{t:0,curve:'inout',P:{}}]}};
  state.project=p;await syncRig();p.clip.keys[0].P=NC.Anim.sample('idle',0,animationContext(0));
  const saved=localStorage.getItem('nightcamp.cutout.v1');if(saved){try{await adopt(validate(JSON.parse(saved)))}catch{await adopt(p)}}else await adopt(p);
  requestAnimationFrame(frame);status(source.warning||`Sẵn sàng · ${catalog.rigs.length} rig cutout · ${source.library.files.length.toLocaleString('vi-VN')} file · ${source.remote?'GitHub '+source.ref.slice(0,7):'local'}`);
})();
