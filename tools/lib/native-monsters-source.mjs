import fs from 'node:fs';
import vm from 'node:vm';
import {loadNativeSource} from './native-ground-source.mjs';
export const MONSTER_SOURCE_FILES=['stats','boss','monsters','materials','monsters2','dunbosses','monsters3','monsters5','monsters6','monsters7','monsters8'];
export function loadNativeMonsters(root){
 const {NC,ctx,base}=loadNativeSource(root),provenance={};Object.assign(ctx,{requestAnimationFrame:()=>0,cancelAnimationFrame:()=>{}});Object.assign(NC,{MATERIALS:{},MAT_DROPS:{},HUD:{init:()=>{},update:()=>{}}});
 for(const name of MONSTER_SOURCE_FILES){const before=new Map(Object.entries(NC.MONSTERS).map(([id,s])=>[id,JSON.stringify(s)]));vm.runInContext(fs.readFileSync(base+'/'+name+'.js','utf8'),ctx,{filename:name+'.js',timeout:5000});for(const[id,s]of Object.entries(NC.MONSTERS))if(before.get(id)!==JSON.stringify(s))provenance[id]=name+'.js'}
 return {NC,provenance};
}
