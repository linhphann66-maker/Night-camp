export function mountMapEditor(pause){
 const button=document.createElement('button');button.id='mapStudioButton';button.textContent='▦ Vẽ map';
 const dialog=document.createElement('dialog');dialog.id='mapStudioDialog';dialog.className='pet-mode-dialog';dialog.setAttribute('aria-label','Map Studio · vẽ và tạo map');
 const frame=document.createElement('iframe');frame.title='Vẽ map, đặt tài nguyên và chạy thử';dialog.append(frame);document.body.append(dialog);document.querySelector('header nav').prepend(button);
 button.onclick=()=>{pause();dialog.showModal();if(!frame.src)frame.src=new URL('maps/index.html',location.href).href;else frame.contentWindow?.postMessage({type:'darkin.map.resume'},location.origin)};
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame.contentWindow&&e.data?.type==='darkin.map.close')dialog.close()});
 dialog.addEventListener('close',()=>frame.contentWindow?.postMessage({type:'darkin.map.pause'},location.origin));
}
