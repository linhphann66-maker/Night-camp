// Local, origin-scoped durable shelf. Image data is stored in IndexedDB, not localStorage.
export const LIBRARY_FORMAT='darkin-studio-library-v1';
export const LIBRARY_KINDS=['rigs','animations','accessories','pets','wings','maps','map-assets','effects','character-skills','vfx-assets'];
const DB='darkin.studio.library.v1',STORE='records';
const valid=id=>typeof id==='string'&&/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,159}$/.test(id)&&!['constructor','prototype','__proto__'].includes(id);
let opening;
function database(){return opening||=(new Promise((ok,no)=>{if(!globalThis.indexedDB){no(Error('Trình duyệt không hỗ trợ thư viện IndexedDB'));return}const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore(STORE,{keyPath:'key'});r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();opening=null};ok(r.result)};r.onerror=()=>{opening=null;no(r.error)};r.onblocked=()=>{opening=null;no(Error('Đóng tab Studio cũ để mở thư viện'))}}))}
function record(kind,id,name,data){if(!LIBRARY_KINDS.includes(kind)||!valid(id)||typeof name!=='string'||!name.trim()||name.length>200||!data||typeof data!=='object')throw Error('Bản lưu không hợp lệ');return {key:kind+':'+id,kind,id,name:name.trim(),updatedAt:Date.now(),data:structuredClone(data)}}
async function transaction(mode,fn){const db=await database();return new Promise((ok,no)=>{const tx=db.transaction(STORE,mode);let result;try{result=fn(tx.objectStore(STORE))}catch(e){tx.abort();no(e);return}tx.oncomplete=()=>ok(result?.result);tx.onabort=tx.onerror=()=>no(tx.error||Error('Không thể lưu thư viện. Hãy tải bản sao.'))})}
function changed(){globalThis.dispatchEvent?.(new Event('darkin-library-change'));try{const c=new BroadcastChannel(DB);c.postMessage('changed');c.close()}catch{}}
export async function saveLibrary(kind,id,name,data){const r=record(kind,id,name,data);await transaction('readwrite',s=>s.put(r));changed();return r}
export async function listLibrary(kind){const all=await transaction('readonly',s=>s.getAll());return all.filter(r=>!kind||r.kind===kind).sort((a,b)=>b.updatedAt-a.updatedAt)}
export async function getLibrary(kind,id){return transaction('readonly',s=>s.get(kind+':'+id))}
export async function removeLibrary(kind,id){await transaction('readwrite',s=>s.delete(kind+':'+id));changed()}
export function libraryId(project,{copy=false}={}){if(copy||!valid(project.studioLibraryId))project.studioLibraryId='saved-'+crypto.randomUUID();return project.studioLibraryId}
export async function exportLibrary(){return {format:LIBRARY_FORMAT,version:1,records:await listLibrary()}}
export async function importLibrary(pack){
 if(pack?.format!==LIBRARY_FORMAT||pack.version!==1||!Array.isArray(pack.records)||pack.records.length>5000)throw Error('Không đúng bản sao thư viện (tối đa 5000 mục)');
 const seen=new Set(),rows=pack.records.map(r=>{const next=record(r.kind,r.id,r.name,r.data);if(seen.has(next.key))throw Error('Trùng ID trong bản sao');seen.add(next.key);return next});
 // Atomic: invalid input or quota errors never leave a half-imported shelf.
 await transaction('readwrite',s=>{for(const r of rows)s.put(r)});changed();return rows.length;
}
export function watchLibrary(fn){globalThis.addEventListener?.('darkin-library-change',fn);let channel;try{channel=new BroadcastChannel(DB);channel.onmessage=fn}catch{}return ()=>{globalThis.removeEventListener?.('darkin-library-change',fn);channel?.close()}}
