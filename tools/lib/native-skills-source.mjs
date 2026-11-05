import fs from 'node:fs';
import vm from 'node:vm';
import {loadNativeSource} from './native-ground-source.mjs';
export const SKILL_FILES=['stats','priest','class2','jobs3','class3','vfx','skills','skillkit','skilltree','class3_core','skills_t1','class2_skills_a','class2_skills_b','class2_skills_c','jobs3_skills_a','jobs3_skills_b','jobs3_skills_c','class3_skills_a','class3_skills_b','class3_skills_c','skills_v21','samurai_skills'];
export function loadNativeSkills(root){
 const {NC,ctx,base}=loadNativeSource(root),sources={};Object.assign(NC,{FX:new Proxy({def:()=>{},add:()=>{}},{get:(o,k)=>o[k]||(()=>{})}),HUD:{init(){},update(){},log(){}},CLASSES:[],ASSET_MANIFEST:{},ITEMS:{},WEAPONS:{},VFX:{},SKILL_RUN:{},Anim:{CLIPS:{},SETS:{}}});Object.assign(ctx,{requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{},document:{getElementById:()=>null}});
 for(const n of SKILL_FILES){const before=new Map(Object.entries(NC.SKILLS||{}).map(([id,s])=>[id,Object.values(s).map(String).join('|')]));vm.runInContext(fs.readFileSync(base+'/'+n+'.js','utf8'),ctx,{filename:n+'.js',timeout:5000});for(const[id,s]of Object.entries(NC.SKILLS||{}))if(before.get(id)!==Object.values(s).map(String).join('|'))sources[id]=n+'.js'}
 return {NC,sources};
}
