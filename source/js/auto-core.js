/* Pure image-space analysis. No conversion to radar, clubhead or ball speed. */
(function(root){
'use strict';
const finite=Number.isFinite;
const median=a=>{const b=a.filter(finite).sort((a,b)=>a-b);return b.length?b[Math.floor(b.length/2)]:null;};
function wrist(sample){
 const a=sample.lm?.[15],b=sample.lm?.[16];
 if(!a||!b||[a,b].some(p=>!finite(p.x)||!finite(p.y)||(p.visibility??0)<.55||p.x<0||p.x>1||p.y<0||p.y>1))return null;
 return {t:sample.t,x:(a.x+b.x)/2,y:(a.y+b.y)/2};
}
function summarize(samples,width,height,slowRatio=1){
 const aspect=height/width,ratio=finite(slowRatio)&&slowRatio>0?slowRatio:1;
 const dt=median(samples.slice(1).map((s,i)=>s.t-samples[i].t).filter(x=>x>0))||.1;
 const gap=Math.max(.25,dt*1.6),groups=[];let group=[];
 for(const s of samples){const p=wrist(s);if(!p||group.length&&p.t-group.at(-1).t>gap){if(group.length)groups.push(group);group=[];}if(p)group.push(p);}
 if(group.length)groups.push(group);
 const path=[],speeds=[],events=[];
 for(let g=0;g<groups.length;g++){
  const points=groups[g];
  const smoothed=points.map((p,i)=>{const near=points.slice(Math.max(0,i-1),i+2);return {...p,x:median(near.map(n=>n.x)),y:median(near.map(n=>n.y)),group:g};});
  path.push(...smoothed);
  for(let i=1;i<smoothed.length-1;i++){
   const a=smoothed[i-1],b=smoothed[i+1],elapsed=(b.t-a.t)/ratio;
   if(elapsed<=0||Math.hypot(b.x-a.x,(b.y-a.y)*aspect)>.45)continue;
   speeds.push({t:smoothed[i].t,value:Math.hypot(b.x-a.x,(b.y-a.y)*aspect)/elapsed*100,group:g});
  }
 }
 const visible=samples.filter(s=>s.lm?.some(p=>(p.visibility??0)>=.55)).length;
 const peak=speeds.length?speeds.reduce((a,b)=>b.value>a.value?b:a):null;
 if(path.length>=6){const high=path.reduce((a,b)=>b.y<a.y?b:a);events.push({kind:'highest-hands',t:high.t});}
 if(peak)events.push({kind:'fastest-hands',t:peak.t});
 const metrics={};for(const key of ['le','re','lk','rk','trunk','head']){const values=samples.map(s=>s.metrics?.[key]).filter(finite);metrics[key]=values.length?{min:Math.min(...values),max:Math.max(...values),mean:values.reduce((a,b)=>a+b,0)/values.length,count:values.length}:null;}
 return {path,speeds,events,metrics,totalFrames:samples.length,poseFrames:visible,wristFrames:path.length,peak,coverage:samples.length?visible/samples.length:0,slowRatio:ratio,speedUnit:'percent-frame-width-per-actual-second',note:'Image-space wrist-centre speed, not clubhead speed. Highest hands is not necessarily backswing top.'};
}
/* Experimental bright-object tracker. Finds candidates, not golf-ball identities.
   No learned golf detector, no prediction through occlusion and no extrapolation. */
class BrightTracker{
 constructor(options={}){this.speedLimit=options.fast?10000:500;this.predictLimit=options.fast?6000:320;this.previous=null;this.width=0;this.height=0;this.tracks=[];this.frame=0;this.nextID=0;this.unstable=0;}
 feed(image,t){
  const {data,width:w,height:h}=image,n=w*h,gray=new Uint8Array(n),mask=new Uint8Array(n);let changed=0;
  if(this.width!==w||this.height!==h){this.previous=null;this.tracks=[];this.width=w;this.height=h;}
  for(let i=0;i<n;i++){
   const r=data[i*4],g=data[i*4+1],b=data[i*4+2],hi=Math.max(r,g,b),lo=Math.min(r,g,b);
   gray[i]=(r*77+g*150+b*29)>>8;
   mask[i]=gray[i]>=195&&hi-lo<62?1:0;
   if(this.previous&&Math.abs(gray[i]-this.previous[i])>40)changed++;
  }
  this.frame++;
  if(this.previous&&changed/n>.38){this.unstable++;this.previous=gray;return;}
  const queue=new Int32Array(n),objects=[];
  for(let seed=0;seed<n;seed++){
   if(mask[seed]!==1)continue;let head=0,tail=1;queue[0]=seed;mask[seed]=2;
   let area=0,sx=0,sy=0,x0=w,y0=h,x1=0,y1=0,motion=0;
   while(head<tail){
    const q=queue[head++],x=q%w,y=Math.floor(q/w);area++;sx+=x;sy+=y;x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);
    if(this.previous)motion+=Math.abs(gray[q]-this.previous[q]);
    const near=[];if(x)near.push(q-1);if(x<w-1)near.push(q+1);if(y)near.push(q-w);if(y<h-1)near.push(q+w);
    for(const j of near)if(mask[j]===1){mask[j]=2;queue[tail++]=j;}
   }
   const bw=x1-x0+1,bh=y1-y0+1;
   if(area<3||area>400||bw>32||bh>32||bw/bh>2.8||bh/bw>2.8||area/(bw*bh)<.3)continue;
   objects.push({x:sx/area/w,y:sy/area/h,t,area,motion:motion/area,frame:this.frame});
  }
  objects.sort((a,b)=>b.motion-a.motion);objects.splice(100);
  const active=this.tracks.filter(a=>this.frame-a.lastFrame<=2),pairs=[];
  for(const tr of active){
   const last=tr.points.at(-1),before=tr.points.at(-2),elapsed=t-last.t;
   if(elapsed<=0||elapsed>.45)continue;
   let px=last.x,py=last.y;if(before&&last.t>before.t){const mult=elapsed/(last.t-before.t);px+=(last.x-before.x)*mult;py+=(last.y-before.y)*mult;}
   for(let i=0;i<objects.length;i++){const p=objects[i];const dist=Math.hypot((p.x-last.x)*w,(p.y-last.y)*h),err=Math.hypot((p.x-px)*w,(p.y-py)*h),ar=p.area/last.area;
    if(dist>Math.min(w*.23,25+elapsed*this.speedLimit)||ar<.25||ar>4||err>Math.min(w*.2,24+elapsed*this.predictLimit))continue;
    pairs.push({tr,i,cost:err+Math.abs(Math.log(ar))*8});
   }
  }
  pairs.sort((a,b)=>a.cost-b.cost);const usedT=new Set(),usedO=new Set();
  for(const p of pairs)if(!usedT.has(p.tr.id)&&!usedO.has(p.i)){p.tr.points.push(objects[p.i]);p.tr.lastFrame=this.frame;usedT.add(p.tr.id);usedO.add(p.i);}
  for(let i=0;i<objects.length;i++)if(!usedO.has(i))this.tracks.push({id:++this.nextID,lastFrame:this.frame,points:[objects[i]]});
  if(this.tracks.length>700)this.tracks=this.tracks.filter(a=>a.points.length>=4||this.frame-a.lastFrame<=2).slice(-700);
  this.previous=gray;
 }
 results(limit=3){
  const out=[];
  for(const tr of this.tracks){
   const p=tr.points;if(p.length<5)continue;
   let travel=0,maxStep=0,moves=0;
   for(let i=1;i<p.length;i++){const d=Math.hypot((p[i].x-p[i-1].x)*this.width,(p[i].y-p[i-1].y)*this.height);travel+=d;maxStep=Math.max(maxStep,d);if(d>1.8&&p[i].motion>15)moves++;}
   const chord=Math.hypot((p.at(-1).x-p[0].x)*this.width,(p.at(-1).y-p[0].y)*this.height);
   if(travel<20||chord<12||moves<3||travel/Math.max(chord,1)>2.8||maxStep>this.width*.23)continue;
   out.push({id:tr.id,points:p.map(q=>({x:q.x,y:q.y,t:q.t})),observations:p.length,travelPixels:travel,label:'unconfirmed-bright-object',score:Math.min(p.length,40)+Math.min(chord,100)/5});
  }
  return out.sort((a,b)=>b.score-a.score).slice(0,limit).map(({score,...r})=>r);
 }
}
const api={summarize,BrightTracker,wrist};
if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SL.autoCore=api;
})(typeof window!=='undefined'?window:globalThis);
