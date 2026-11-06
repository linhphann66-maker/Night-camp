// Audited empty-body safety fixes. No gallery/font code; original MIT headers
// remain intact. Run after a pinned source import, never by loading user JSON.
import fs from 'node:fs';
import path from 'node:path';
export function patchExternalPixelActors(root){
 const patches=[
  ['lightning/electrified.js','edges.set(A.mask, e);',"if (!e.length) e.push([A.x,A.y+A.h*.4],[A.x+A.w,A.y+A.h*.4],[A.x+A.w*.2,-2],[A.x+A.w*.8,-2]);\n  edges.set(A.mask, e);"],
  ['scifi/warp-in.js','const b = body[Math.floor(R.next() * body.length)];','const b = body[Math.floor(R.next() * body.length)]; if (!b) continue;'],
  ['spawn/respawn-beam.js','const c = R.pick(rim);','const c = R.pick(rim); if (!c) continue;'],
  ['spawn/soul-rise.js','const c = R.pick(rim);','const c = R.pick(rim); if (!c) continue;'],
  ['spawn/soul-rise.js','const c = R.pick(rim), row = c.my;','const c = R.pick(rim); if (!c) continue; const row = c.my;'],
  ['status/petrified.js','if (t < CREEP) {','if (S.body.length && t < CREEP) {'],
  ['status/petrified.js','if (t > CREEP + 0.2 && t < SHATTER && R.chance(1.6 * dt)) {','if (S.body.length && t > CREEP + 0.2 && t < SHATTER && R.chance(1.6 * dt)) {'],
  ['status/petrified.js','for (let i = 0; i < 18; i++) {','for (let i = 0; i < 18 && stone.length; i++) {'],
  ['status/poisoned.js','const [l, r] = S.rows[Math.round(H * 0.6)], wx = r - 1, wy = Math.round(H * 0.6);',"if (!S.body.length) return {veins: [], wound: [W/2,H*.6], blisters: [[],[]], sweat: [[W*.3,H*.2],[W*.7,H*.2]]};\n  const [l, r] = S.rows[Math.round(H * 0.6)], wx = r - 1, wy = Math.round(H * 0.6);"],
  ['status/burning.js','const S = shape(a), H = S.h, W = S.w, R = new Rng(seed * 13 + 5);',"const S = shape(a), H = S.h, W = S.w, R = new Rng(seed * 13 + 5);\n  if (!S.body.length) return {list: [[.3,.12],[.75,.5],[.25,.62],[.75,.65]].map(([x,y],i)=>({x:a.x+W*x,y:a.y+H*y,tongues:[{dx:0,h:4.5,n:i*17+seed}]})),scorch:[[],[]]};"],
 ];
 for(const [file,before,after]of patches){const at=path.join(root,file),src=fs.readFileSync(at,'utf8');if(src.includes(after))continue;if(!src.includes(before))throw Error('Pinned PixelFX compatibility patch no longer matches '+file);fs.writeFileSync(at,src.replace(before,after))}
}
