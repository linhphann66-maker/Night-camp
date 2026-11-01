import {PARTS} from './model.mjs';
export const RESOURCE_PART_NAMES={head:'Đầu',torso:'Thân',armF:'Tay gần',armB:'Tay xa',legF:'Chân gần',legB:'Chân xa'};
export function resourcePart(resource){
 if(Object.hasOwn(resource,'part'))return PARTS.includes(resource.part)?resource.part:'';
 const normalize=name=>name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase(),name=normalize(typeof resource.name==='string'?resource.name:'');
 return Object.entries(RESOURCE_PART_NAMES).find(([part,label])=>part.toLowerCase()===name||normalize(label)===name)?.[0]||'';
}
export function defaultResourceSelection(resources){const latest=new Map();for(const r of resources){const part=resourcePart(r);if(part)latest.set(part,r.id)}return new Set(latest.values())}
export function resourceAssignments(resources){
 const result={};for(const r of resources){const part=resourcePart(r);if(!part)throw Error('Chưa chọn bộ phận cho '+r.name);if(result[part])throw Error('Có nhiều mảnh cùng gán vào '+RESOURCE_PART_NAMES[part]+'. Chọn một mảnh hoặc gộp chúng trước.');result[part]=r}return result;
}
export function applyResourceChanges(project,resources,assignments,updates=[]){
 const p=structuredClone(project),list=p.resources||=[];
 for(const r of resources){if(list.some(x=>x.id===r.id))throw Error('Trùng ID tài nguyên');list.push({...structuredClone(r),part:resourcePart(r)})}
 for(const update of updates){const r=list.find(r=>r.id===update.id);if(!r)throw Error('Tài nguyên không còn trong project');r.name=update.name;r.part=resourcePart(update)}
 for(const [part,r]of Object.entries(assignments)){if(!PARTS.includes(part)||!p.parts[part]||typeof r.src!=='string')throw Error('Bộ phận / tài nguyên không hợp lệ');p.parts[part].src=r.src}
 return p;
}
