import {PARTS} from './model.mjs';
import {inversePoint} from './pets/runtime.mjs';
// The authoring coordinates are centered on the actual back socket, not an
// approximation of the face/torso image. Preview and exported player agree.
export async function mountWingPreview(image){
 window.NC={SPR:{},ITEMS:{},clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),lerp:(a,b,t)=>a+(b-a)*t};
 for(const file of ['anim.js','avatar.js'])await new Promise((ok,no)=>{const s=document.createElement('script');s.src=new URL('runtime/'+file,import.meta.url).href;s.onload=ok;s.onerror=()=>no(Error('Không tải được bộ phát preview cánh'));document.head.append(s)});
 const NC=window.NC;let hero=null,serial=0;
 const label=document.createElement('label');label.innerHTML='<input id="wingHeroPreview" type="checkbox" checked> Nhân vật';document.querySelector('.viewbar').append(label);
 return {
  async load(project,attachment){
   const id='wingpreview'+ ++serial;
   await Promise.all(PARTS.map(async part=>{const s=project.parts[part];NC.SPR['rig_'+id+'_'+part]={...s,img:await image(s.src)}}));
   const equip={top:id+'_top',weapon:id+'_weapon'};NC.ITEMS[equip.top]={rig:id};NC.ITEMS[equip.weapon]={restAng:1.2,stance:-.7,grip:.12,wtype:'sword'};const rig=NC.getRig(id);
   const P={...NC.Anim.setup(NC.animCtx(equip,{})),...project.clip.keys[0].P,face:1};
   NC.GRIPFIX=false;NC.BendCache.on=false;
   const m=NC.attachmentMatrix(equip,P,attachment||{socket:'back',x:0,y:0,rotation:0,scale:1},0,0,1),M=[m.a,m.b,m.c,m.d,m.e,m.f],o=inversePoint(M,0,0),u=inversePoint(M,1,0),v=inversePoint(M,0,1),inv=[u[0]-o[0],u[1]-o[1],v[0]-o[0],v[1]-o[1],...o];
   const js=Object.values(NC.rigJoints(equip,P,0,0,1)).map(p=>inversePoint(M,...p));
   hero={equip,rig,P,inv,bounds:{x0:Math.min(...js.map(p=>p[0]))-35,y0:Math.min(...js.map(p=>p[1]))-35,x1:Math.max(...js.map(p=>p[0]))+35,y1:Math.max(...js.map(p=>p[1]))+20}};
  },
  bounds:()=>hero?.bounds,
  draw(ctx,base){if(!hero||!document.getElementById('wingHeroPreview').checked)return;ctx.save();ctx.transform(...base);ctx.transform(...hero.inv);NC.drawRig(ctx,hero.rig,hero.equip,hero.P,0,0,{scale:1,noWeapon:true});ctx.restore()},
 };
}
