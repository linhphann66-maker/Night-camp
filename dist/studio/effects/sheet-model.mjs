import {validateSkillProject,createSkillProject,skillId} from './runtime.mjs';
export const VFX_RESOURCE_FORMAT='darkin-vfx-resource-v1';
export function sheetGridRects({width,height,columns=1,rows=1,marginX=0,marginY=0,gapX=0,gapY=0}){
 if(![width,height,columns,rows,marginX,marginY,gapX,gapY].every(Number.isInteger)||width<1||height<1||width>8192||height>8192||width*height>16777216||columns<1||rows<1||columns*rows>128||[marginX,marginY,gapX,gapY].some(n=>n<0))throw Error('Lưới cần số nguyên dương, tối đa 128 ô / 16 triệu pixel');
 const w=(width-2*marginX-(columns-1)*gapX)/columns,h=(height-2*marginY-(rows-1)*gapY)/rows;if(w<1||h<1)throw Error('Lề / khoảng cách quá lớn so với ảnh');
 return Array.from({length:columns*rows},(_,index)=>{const col=index%columns,row=Math.floor(index/columns),x=Math.round(marginX+col*(w+gapX)),y=Math.round(marginY+row*(h+gapY));return {index,col,row,x,y,w:Math.round(marginX+col*(w+gapX)+w)-x,h:Math.round(marginY+row*(h+gapY)+h)-y}});
}
export function detectSheetGrid(pixels,width,height,{alpha=16}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>4194304||pixels.length!==width*height*4)throw Error('Ảnh phân tích tối đa 4 triệu pixel');
 const xs=new Uint32Array(width),ys=new Uint32Array(height);for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(pixels[(y*width+x)*4+3]>alpha){xs[x]++;ys[y]++}
 if(!xs.some(Boolean))return {columns:1,rows:1,filled:0,confidence:'single'};
 const stride=width+1,sums=new Uint32Array(stride*(height+1));for(let y=0;y<height;y++){let row=0;for(let x=0;x<width;x++){row+=pixels[(y*width+x)*4+3]>alpha?1:0;sums[(y+1)*stride+x+1]=sums[y*stride+x+1]+row}}
 const candidates=(axis,n)=>{const found=[1],radius=Math.max(1,Math.round(n*.001));for(let count=2;count<=Math.min(32,Math.floor(n/8));count++){let valid=true;for(let k=1;k<count&&valid;k++){const at=Math.round(k*n/count);for(let d=-radius;d<=radius;d++)if(axis[at+d]>0){valid=false;break}}if(valid)found.push(count)}return found};
 let best={columns:1,rows:1,filled:xs.some(Boolean)?1:0,confidence:'single'},score=1;
 for(const columns of candidates(xs,width))for(const rows of candidates(ys,height)){if(columns*rows<2||columns*rows>128)continue;let filled=0;for(const r of sheetGridRects({width,height,columns,rows})){const count=sums[(r.y+r.h)*stride+r.x+r.w]-sums[r.y*stride+r.x+r.w]-sums[(r.y+r.h)*stride+r.x]+sums[r.y*stride+r.x];if(count>0)filled++}const coverage=filled/(columns*rows),next=filled*Math.sqrt(coverage);if(filled>=2&&coverage>=.4&&next>score){score=next;best={columns,rows,filled,confidence:'gaps'}}}
 return best;
}
export function frameOrder(rects,selected,order='row'){
 const rows=rects.filter(r=>selected.has(r.index));if(order==='column')rows.sort((a,b)=>a.col-b.col||a.row-b.row);if(order==='reverse')rows.reverse();return rows;
}
export function validateVfxResource(r){
 if(r?.format!==VFX_RESOURCE_FORMAT||!skillId(r.id)||typeof r.name!=='string'||!r.name.trim()||r.name.length>150||r.effect?.id!==r.id||r.effect?.name!==r.name)throw Error('Không đúng bộ ảnh VFX đã tách');
 const source=r.sourceImage;if(!source||typeof source.src!=='string'||source.src.length>12*1024*1024||!/^data:image\/(png|webp|jpeg);base64,[A-Za-z0-9+/=]+$/.test(source.src)||typeof source.name!=='string'||source.name.length>250)throw Error('Ảnh gốc VFX không hợp lệ');
 const settings=r.slice,rects=sheetGridRects({...settings,width:source.width,height:source.height});if(!settings||!Number.isFinite(settings.fps)||settings.fps<1||settings.fps>60||!['auto','keep'].includes(settings.background)||!['row','column','reverse'].includes(settings.order)||typeof settings.skipEmpty!=='boolean'||!Array.isArray(settings.selected)||settings.selected.length!==r.effect.frames?.length||new Set(settings.selected).size!==settings.selected.length||settings.selected.some(i=>!Number.isInteger(i)||i<0||i>=rects.length))throw Error('Thông số tách VFX không hợp lệ');
 const project=createSkillProject();project.effects[r.id]=r.effect;validateSkillProject(project);if(r.effect.group==='procedural'||r.effect.frames.reduce((n,f)=>n+f.src.length,0)>32*1024*1024||r.effect.frames.some(f=>!/^data:image\/png;base64,/.test(f.src)))throw Error('Bộ frame quá lớn hoặc chưa nhúng đủ ảnh PNG');return r;
}
