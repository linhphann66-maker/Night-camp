// A third, optional layer on the LIVE character, never on a baked stock dummy.
export const SKILL_BODY_MODES=['none','tint','glow','outline'];
export function validSkillBody(body){return body===undefined||!!body&&typeof body==='object'&&!Array.isArray(body)&&SKILL_BODY_MODES.includes(body.mode)&&/^#[a-fA-F0-9]{6}$/.test(body.color)&&Number.isFinite(body.opacity)&&body.opacity>=0&&body.opacity<=1}
const surfaces=new WeakMap();
const surface=()=>document.createElement('canvas');
export function drawCharacterSkillBody(ctx,placement,activeTracks){
 const active=activeTracks.filter(({track:t,age})=>t.visible!==false&&age>=0&&age<t.duration&&t.body?.mode&&t.body.mode!=='none'&&t.body.opacity>0&&t.opacity>0);if(!active.length)return;
 const NC=globalThis.NC||globalThis.window?.NC,{equip,pose,character,rig,x,y,scale}=placement;if(!NC?.drawRig||!rig)throw Error('Lớp thân skill cần renderer và rig nhân vật thật');
 const points=Object.entries(NC.rigJoints(equip,pose,0,0,1)).filter(([key,p])=>!['wHand','wTip'].includes(key)&&Array.isArray(p)&&p.every(Number.isFinite)).map(([,p])=>p);points.push([0,0]);
 const pad=Math.min(512,Math.max(24,...Object.values(character.parts||{}).map(s=>Math.max(s.w||0,s.h||0)))),left=Math.floor(Math.min(...points.map(p=>p[0]))-pad),top=Math.floor(Math.min(...points.map(p=>p[1]))-pad),w=Math.ceil(Math.max(...points.map(p=>p[0]))+pad-left),h=Math.ceil(Math.max(...points.map(p=>p[1]))+pad-top),density=Math.min(2,2048/w,2048/h,Math.sqrt(4_000_000/(w*h))),width=Math.max(1,Math.ceil(w*density)),height=Math.max(1,Math.ceil(h*density));
 let pair=surfaces.get(ctx);if(!pair){pair={mask:surface(),paint:surface()};surfaces.set(ctx,pair)}for(const cv of Object.values(pair)){if(cv.width<width)cv.width=Math.min(2048,Math.ceil(width/64)*64);if(cv.height<height)cv.height=Math.min(2048,Math.ceil(height/64)*64)}
 const mask=pair.mask.getContext('2d');mask.setTransform(1,0,0,1,0,0);mask.clearRect(0,0,pair.mask.width,pair.mask.height);mask.setTransform(density,0,0,density,-left*density,-top*density);
 // The base outfit/head define the mask. No held weapon, hat, wing or UI is
 // accidentally tinted; no scene pixels are read back or baked into a pack.
 NC.drawRig(mask,rig,equip,pose,0,0,{scale:1,noWeapon:true,hideAllAttachments:true});mask.setTransform(1,0,0,1,0,0);
 const paint=pair.paint.getContext('2d');
 for(const {track:t,age}of active){paint.globalCompositeOperation='source-over';paint.clearRect(0,0,pair.paint.width,pair.paint.height);
  if(t.body.mode==='outline'){const radius=Math.max(1,Math.round(density));for(const [dx,dy]of [[-1,-1],[0,-1],[1,-1],[-1,0],[1,0],[-1,1],[0,1],[1,1]])paint.drawImage(pair.mask,dx*radius,dy*radius);paint.globalCompositeOperation='destination-out';paint.drawImage(pair.mask,0,0)}else paint.drawImage(pair.mask,0,0);
  paint.globalCompositeOperation='source-in';paint.fillStyle=t.body.color;paint.fillRect(0,0,width,height);paint.globalCompositeOperation='source-over';
  const fade=Math.max(0,Math.min(1,age/.1,(t.duration-age)/.1));ctx.save();try{ctx.globalAlpha*=t.opacity*t.body.opacity*fade;ctx.globalCompositeOperation=t.body.mode==='tint'?'source-over':'lighter';ctx.imageSmoothingEnabled=false;ctx.drawImage(pair.paint,0,0,width,height,x+left*scale,y+top*scale,width/density*scale,height/density*scale)}finally{ctx.restore()}
 }
}
