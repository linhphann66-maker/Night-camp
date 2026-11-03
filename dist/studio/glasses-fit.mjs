// Two-eye fitting is the baseline. Frames with an authored temple contact also
// fit that contact onto the near ear, balancing lens coverage without inflating
// the complete frame to a percentage of the hair width. All transforms bake.
export function headEyeCenters(head){
 const n=head?.joints?.neck;
 if(!Array.isArray(n)||n.length!==2||!n.every(Number.isFinite))throw Error('Đầu thiếu khớp cổ để xác định vị trí mắt');
 return [[n[0]+4.07,n[1]-11.22],[n[0]+20.08,n[1]-12.23]];
}
export function headEarContact(head){
 const authored=head?.joints?.earNear;if(Array.isArray(authored)&&authored.length===2&&authored.every(Number.isFinite))return [...authored];
 const n=head?.joints?.neck;if(!n||!n.every(Number.isFinite))throw Error('Đầu thiếu mốc cổ / tai');
 // Measured upper ear contact on the standard game head, relative to its neck.
 return [n[0]-16,n[1]-10];
}
export function glassesTemplePoint(entry){
 const point=entry?.sprite?.temple;
 if(point!==undefined){if(!Array.isArray(point)||point.length!==2||!point.every(n=>Number.isFinite(n)&&n>=0&&n<=1))throw Error('Mốc quai kính không hợp lệ');return [...point]}
 // Actual hook on the original 157×81 round-glasses PNG. This is an image
 // landmark, NOT a universal sizing multiplier for other frame designs.
 return entry?.id==='glasses_round'&&entry.sprite.src==='assets/glasses/glasses_round.png'?[6/157,39/81]:null;
}
export function fitLibraryGlasses(attachment,entry,head,eyes=headEyeCenters(head),{mode='ear'}={}){
 if(entry?.category!=='glasses'||attachment?.sourceId!==entry.id)throw Error('Chọn kính có sẵn trong thư viện để căn theo hai mắt');
 const s=entry.sprite,lens=s?.lens,points=ps=>Array.isArray(ps)&&ps.length===2&&ps.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite));
 if(!s||![s.w,s.h].every(n=>Number.isFinite(n)&&n>0)||!points(lens)||!points(eyes))throw Error('Kính cần hai mốc tròng và đầu cần hai mốc mắt hợp lệ');
 const [A,B]=eyes,p=[lens[0][0]*s.w,lens[0][1]*s.h],q=[lens[1][0]*s.w,lens[1][1]*s.h];
 const dH=Math.hypot(B[0]-A[0],B[1]-A[1]),dG=Math.hypot(q[0]-p[0],q[1]-p[1]);
 if(dH<.001||dG<.001)throw Error('Hai mốc mắt / tròng không được trùng nhau');
 const fit=entry.fit??1,dx=entry.dx??0,dy=entry.dy??0;
 if(![fit,dx,dy].every(Number.isFinite)||fit<=0)throw Error('Thông số căn kính không hợp lệ');
 if(!['ear','eyes'].includes(mode))throw Error('Chế độ căn kính không hợp lệ');
 const temple=mode==='ear'?glassesTemplePoint(entry):null,ear=temple?headEarContact(head):null;
 let k=dH/dG*fit,rotation=Math.atan2(B[1]-A[1],B[0]-A[0])-Math.atan2(q[1]-p[1],q[0]-p[0]);
 if(temple){
  const t=[temple[0]*s.w,temple[1]*s.h];let dot=0,cross=0,norm=0;
  // Ear contact is exact; the two lens centres are least-squares balanced
  // around it. Enlarging blindly would make the frame too big again.
  for(const [src,target]of [[p,A],[q,B]]){const x=src[0]-t[0],y=src[1]-t[1],u=target[0]-ear[0],v=target[1]-ear[1];dot+=x*u+y*v;cross+=x*v-y*u;norm+=x*x+y*y}
  if(norm<.001||Math.hypot(dot,cross)<.001)throw Error('Mốc quai kính không xác định được độ ôm tai');
  k=Math.hypot(dot,cross)/norm*fit;rotation=Math.atan2(cross,dot);
 }
 const w=s.w*k,h=s.h*k;
 if(![w,h].every(n=>Number.isFinite(n)&&n>=1&&n<=2000))throw Error('Mốc tròng suy ra kích thước kính không hợp lệ');
 const raw=[(lens[0][0]+lens[1][0])/2,(lens[0][1]+lens[1][1])/2],anchor=raw.map(n=>Math.max(0,Math.min(1,n))),x=(anchor[0]-raw[0])*w,y=(anchor[1]-raw[1])*h,c=Math.cos(rotation),sn=Math.sin(rotation);
 // Clamped pivots (e.g. one-eyed designs with a virtual second lens) keep
 // their exact position by compensating the origin in head coordinates.
 let offsetX=dx*dH+c*x-sn*y,offsetY=dy*dH+sn*x+c*y;
 if(temple){const tx=(temple[0]-anchor[0])*w,ty=(temple[1]-anchor[1])*h;offsetX=ear[0]-(A[0]+B[0])/2-c*tx+sn*ty+dx*dH;offsetY=ear[1]-(A[1]+B[1])/2-sn*tx-c*ty+dy*dH}
 return {...attachment,socket:'face',w,h,scale:1,rotation,anchor,x:offsetX,y:offsetY};
}
