import {validateSkillProject} from './runtime.mjs';
export const decimalNumber=value=>{const s=String(value).trim();if(!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)$/.test(s))throw Error('Nhập một số hợp lệ (ví dụ 0,5 hoặc 0.5)');const n=Number(s.replace(',','.'));if(!Number.isFinite(n))throw Error('Số không hợp lệ');return n};
export const tidyNumber=n=>Math.round(n*1e9)/1e9;
export function requiredSkillDuration(s){return Math.max(.1,s.hitAt,...s.events.map(e=>tidyNumber(e.at+e.duration)))}
export function editSkillEvent(project,skillId,eventId,changes){
 const next=structuredClone(project),s=next.skills[skillId],e=s?.events.find(e=>e.id===eventId);if(!e)throw Error('Mốc VFX không còn tồn tại');Object.assign(e,changes);const need=requiredSkillDuration(s);if(need>30)throw Error('Mốc kết thúc vượt giới hạn 30 giây; chưa lưu thay đổi này');s.duration=Math.max(s.duration,need);validateSkillProject(next);return next;
}
