import {makeWingAttachment} from './wings.mjs';
import {activateEquipment} from './equipment.mjs';
import {saveMountProfile} from './mount-profiles.mjs';
export function mountWingEditor(actions){
 const button=document.createElement('button');button.id='wingStudioButton';button.textContent='✧ Cánh & rig';
 const dialog=document.createElement('dialog');dialog.id='wingStudioDialog';dialog.className='pet-mode-dialog';dialog.setAttribute('aria-label','Thiết kế và rig cánh');
 const frame=document.createElement('iframe');frame.title='Cánh · dựng rig và animation';dialog.append(frame);document.body.append(dialog);document.querySelector('header nav').prepend(button);
 let hero=null,attachmentId=null,request=0;
 async function initialize(){const version=++request,p=actions.project();if(!p)return;const portable=await actions.portable();if(version!==request||!dialog.open)return;hero=p;const selected=actions.current(),a=selected?.wingRig?selected:(p.attachments||[]).find(a=>a.wingRig&&a.visible!==false)||(p.attachments||[]).find(a=>a.wingRig);attachmentId=a?.id||null;frame.contentWindow.postMessage({type:'nightcamp.wing.init',hero:portable,attachment:a||null},location.origin)}
 button.onclick=()=>{actions.pause();dialog.showModal();if(!frame.src)frame.src=new URL('pets/index.html?mode=wings',location.href).href;else initialize().catch(e=>actions.message('Lỗi cánh: '+e.message))};
 window.addEventListener('message',async e=>{
  if(e.origin!==location.origin||e.source!==frame.contentWindow)return;
  try{
   if(e.data?.type==='nightcamp.wing.ready'){if(dialog.open)await initialize()}
   if(e.data?.type==='nightcamp.wing.apply'){
    if(!dialog.open||!hero||hero!==actions.project())throw Error('Project nhân vật đã đổi. Mở lại mục Cánh & rig.');
    const items=structuredClone(hero.attachments||[]),index=items.findIndex(a=>a.id===attachmentId),a=makeWingAttachment(e.data.project,index<0?undefined:items[index]);
    saveMountProfile(a,hero);if(index<0)items.push(a);else items[index]=a;await actions.set(activateEquipment(items,a.id));attachmentId=a.id;
    frame.contentWindow.postMessage({type:'nightcamp.wing.applied'},location.origin);actions.message('Đã gắn cánh và lưu cấu hình cho thân '+hero.bodyId+'. Có thể xuất riêng cánh ở mục Phụ kiện & vũ khí.');
   }
   if(e.data?.type==='nightcamp.wing.close')dialog.close();
  }catch(error){actions.message('Lỗi cánh: '+error.message);frame.contentWindow.postMessage({type:'nightcamp.wing.error',message:error.message},location.origin)}
 });
 dialog.addEventListener('close',()=>{request++;frame.contentWindow?.postMessage({type:'nightcamp.pet.pause'},location.origin)});
}
