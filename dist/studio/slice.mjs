// Only flood out background reachable from the image border. Matching colors
// enclosed by a dark outline (white fur/hair/highlights) remain foreground.
export function removeBorderBackground(data,width,height,{background=null,tolerance=28,alpha=16}={}){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>4194304||data.length!==width*height*4)throw Error('Kích thước ảnh phân tích không hợp lệ (tối đa 4 triệu pixel)');
 const pixels=new Uint8ClampedArray(data);if(!background)return {pixels,removed:0};
 const count=width*height,seen=new Uint8Array(count),queue=new Int32Array(count);let head=0,tail=0,removed=0;
 const eligible=i=>{const p=i*4;return data[p+3]<=alpha||Math.max(Math.abs(data[p]-background[0]),Math.abs(data[p+1]-background[1]),Math.abs(data[p+2]-background[2]))<=tolerance};
 const push=i=>{if(!seen[i]){seen[i]=1;if(eligible(i))queue[tail++]=i}};
 for(let x=0;x<width;x++){push(x);push((height-1)*width+x)}for(let y=0;y<height;y++){push(y*width);push(y*width+width-1)}
 while(head<tail){const i=queue[head++],x=i%width;pixels[i*4+3]=0;removed++;if(x>0)push(i-1);if(x<width-1)push(i+1);if(i>=width)push(i-width);if(i<count-width)push(i+width)}
 return {pixels,removed};
}
// Eight-connected foreground islands; no global color-keying inside the artwork.
export function detectPieces(data,width,height,{alpha=16,minArea=12,background=null,tolerance=28,maxPieces=128}={}){
 if(width*height>4194304)throw Error('Ảnh phân tích tối đa 4 triệu pixel');
 if(background)data=removeBorderBackground(data,width,height,{background,tolerance,alpha}).pixels;
 const count=width*height,visited=new Uint8Array(count),queue=new Int32Array(count),pieces=[];
 const solid=i=>data[i*4+3]>alpha;
 for(let seed=0;seed<count;seed++){if(visited[seed]||!solid(seed))continue;let head=0,tail=1,minX=width,minY=height,maxX=0,maxY=0;queue[0]=seed;visited[seed]=1;
  while(head<tail){const i=queue[head++],y=Math.floor(i/width),x=i-y*width;minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);
   for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){if((!dx&&!dy)||x+dx<0||x+dx>=width||y+dy<0||y+dy>=height)continue;const n=i+dy*width+dx;if(!visited[n]&&solid(n)){visited[n]=1;queue[tail++]=n}}
  }
  if(tail>=minArea){pieces.push({x:minX,y:minY,w:maxX-minX+1,h:maxY-minY+1,area:tail});if(pieces.length>maxPieces)throw Error('Quá nhiều mảnh. Tăng ngưỡng lọc bụi hoặc dùng ảnh ít chi tiết hơn.')}
 }
 return pieces.sort((a,b)=>a.y-b.y||a.x-b.x);
}
export function guessBackground(data,width,height){
 const points=[[0,0],[width-1,0],[0,height-1],[width-1,height-1],[Math.floor(width/2),0],[Math.floor(width/2),height-1],[0,Math.floor(height/2)],[width-1,Math.floor(height/2)]];
 const colors=points.map(([x,y])=>Array.from(data.slice((y*width+x)*4,(y*width+x)*4+4)));
 if(colors.some(c=>c[3]<240))return null;const first=colors[0];return colors.every(c=>c.slice(0,3).every((v,i)=>Math.abs(v-first[i])<12))?first.slice(0,3):null;
}
export function mergeBoxes(boxes){if(!boxes.length)throw Error('Chọn ít nhất một vùng');const x=Math.min(...boxes.map(b=>b.x)),y=Math.min(...boxes.map(b=>b.y)),right=Math.max(...boxes.map(b=>b.x+b.w)),bottom=Math.max(...boxes.map(b=>b.y+b.h));return {x,y,w:right-x,h:bottom-y,area:boxes.reduce((s,b)=>s+b.area,0)}}
