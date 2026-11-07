// Shared sprite/procedural VFX adapter for character preview, exports and games.
// Does not restore custom target aiming or multi-hit authoring.
import {createSkillProject,validateSkillProject,newVisualSkill,drawSkillEvent,SKILL_MOTIONS,SKILL_EASINGS} from './effects/runtime.mjs';
export {SKILL_MOTIONS,SKILL_EASINGS};
export const isCharacterVfx=t=>t?.kind==='vfx';
export const vfxSourceId=id=>'vfx/'+id;
export function validateCharacterVfxEffect(e,{portable=false}={}){
 if(!e||e.kind!=='vfx'||e.sourceId!==vfxSourceId(e.effect?.id))throw Error('Nguồn VFX nhân vật không hợp lệ');
 const p=createSkillProject();p.effects[e.effect.id]=e.effect;validateSkillProject(p);
 if(portable&&(e.effect.frames||[]).some(f=>!f.src.startsWith('data:image/png;base64,')&&!f.src.startsWith('data:image/webp;base64,')))throw Error('Gói nhân vật phải nhúng ảnh VFX');
 return e;
}
export function characterVfxEvent(t){return {...t,id:t.id,effectId:'source',anchor:'caster',follow:false,layer:'high',motion:t.motion||'still',blend:t.blend||'normal'}}
export function validateCharacterVfxTrack(t){
 if(!/^vfx\/[A-Za-z0-9_-]{1,100}$/.test(t.sourceId)||!['front','back'].includes(t.plane))throw Error('Mốc VFX cần lớp trước hoặc sau nhân vật');
 const p=createSkillProject(),s=newVisualSkill('test');s.duration=Math.max(.1,t.at+t.duration);s.hitAt=0;p.skills.test=s;p.effects.source={id:'source',name:'test',group:'procedural',primitive:'ring',color:'#ffffff'};s.events=[characterVfxEvent(t)];validateSkillProject(p);return t;
}
export function newCharacterVfxTrack(effect,effectId,event={}){
 return {kind:'vfx',id:'track-'+crypto.randomUUID(),name:event.name||effect.name,sourceId:vfxSourceId(effect.id),effectId,at:event.at??0,duration:event.duration??Math.min(30,(effect.frames||[]).reduce((n,f)=>n+f.duration,0)||.8),anchor:event.anchor==='target'?'target':'feet',x:event.x??0,y:event.y??0,scale:event.scale??1,rotation:event.rotation??0,opacity:event.opacity??1,plane:event.layer==='low'?'back':'front',visible:event.visible!==false,seed:2,palette:[],motion:event.motion||'still',blend:event.blend||'normal',...Object.fromEntries(['amplitude','cycles','turns','travelX','travelY','easing','fadeIn','fadeOut','color'].filter(k=>event[k]!==undefined).map(k=>[k,event[k]]))};
}
export function drawCharacterVfxTrack(ctx,t,e,age,images,placement,plane,anchor){
 if(t.visible===false||t.plane!==plane||age<0||age>=t.duration||!anchor)return;
 const face=placement.pose.face||1,scale=placement.scale,origin={x:(anchor[0]-placement.x)/(scale*face),y:(anchor[1]-placement.y)/scale};
 // Same target placeholder as PixelFX; no implicit enemy lookup/lock-on.
 const target={x:85,y:0},event=characterVfxEvent(t);
 ctx.save();try{ctx.translate(placement.x,placement.y);ctx.scale(face*scale,scale);drawSkillEvent(ctx,event,e.effect,{caster:origin,casterRef:origin,target},age,images)}finally{ctx.restore()}
}
