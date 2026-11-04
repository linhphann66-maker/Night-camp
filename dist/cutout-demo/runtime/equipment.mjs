const TYPES=new Set(['hat','glasses','weapon','wings']);
// Type is independent of the chosen bone/socket: moving glasses to another
// anchor does not turn them into a hat. Legacy files recover type from source.
export function equipmentType(a,catalog=[]){
 if(a?.wingRig)return 'wings';
 if(TYPES.has(a?.category))return a.category;
 const source=catalog.find(e=>e.id===a?.sourceId);if(TYPES.has(source?.category))return source.category;
 return {head:'hat',face:'glasses',handF:'weapon',handB:'weapon',back:'wings'}[a?.socket]||null;
}
export function normalizeEquipment(items=[],catalog=[]){
 const out=structuredClone(items),last=new Map();
 for(const a of out){const type=equipmentType(a,catalog);if(type){a.category=type;if(a.visible!==false)last.set(type,a.id)}}
 for(const a of out){const type=equipmentType(a,catalog);if(type&&a.visible!==false&&last.get(type)!==a.id)a.visible=false}
 return out;
}
export function activateEquipment(items,id,catalog=[]){
 const out=structuredClone(items),selected=out.find(a=>a.id===id);if(!selected)throw Error('Không tìm thấy phụ kiện đang chọn');
 const type=equipmentType(selected,catalog);
 for(const a of out)if(a.id!==id&&type&&equipmentType(a,catalog)===type)a.visible=false;
 if(type)selected.category=type;selected.visible=true;
 return normalizeEquipment(out,catalog);
}
