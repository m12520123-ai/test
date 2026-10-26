/* Canvas rendering: visual reconstructions, never measurements. */
(function(){
"use strict";
const S=window.SL;
function canvasSetup(canvas){
 const rect=canvas.getBoundingClientRect(),w=Math.max(1,rect.width),h=Math.max(1,rect.height),dpr=Math.min(window.devicePixelRatio||1,2);
 if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}
 const ctx=canvas.getContext("2d");ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);return{ctx,w,h};
}
function path(ctx,points,fill,stroke,width=1,closed=true){if(!points.length)return;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));if(closed)ctx.closePath();if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();}}
function text(ctx,t,x,y,color="#a4bbb0",size=10,align="center"){ctx.font=`${size}px -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(String(t),x,y);}
function circle(ctx,x,y,r,fill,stroke){ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.strokeStyle=stroke;ctx.stroke();}}
function noise(i){const f=Math.sin(i*127.1+17.32)*43758.5453;return f-Math.floor(f);}
class RangeScene{
 constructor(canvas,mode="perspective"){this.canvas=canvas;this.mode=mode;this.shot=null;this.progress=1;this.raf=0;}
 set(shot){this.shot=shot;this.draw();}
 view(mode){this.mode=mode;this.draw();}
 animate(){cancelAnimationFrame(this.raf);const start=performance.now();const tick=t=>{this.progress=Math.min(1,(t-start)/2400);this.draw();if(this.progress<1)this.raf=requestAnimationFrame(tick);};this.raf=requestAnimationFrame(tick);}
 stop(){cancelAnimationFrame(this.raf);this.progress=1;}
 draw(){
 const {ctx,w,h}=canvasSetup(this.canvas);if(w<10||h<10)return;
 const shot=this.shot, maxD=Math.max(260,shot?.carry?shot.carry*1.35:260,S.state.settings.target*1.25);
 const base=w/110;
 const project=(x,y,z=0)=>{
   if(this.mode==="top")return{x:w*.5+x*(w*.72/100),y:h*.92-y/maxD*h*.8};
   if(this.mode==="side")return{x:w*.09+y/maxD*w*.83,y:h*.83-z/Math.max(42,shot?.apex?shot.apex*1.4:42)*h*.62};
   const k=1/(1+y/115),deep=(y/(y+115))/(maxD/(maxD+115));
   return{x:w*.29+deep*w*.33+x*base*k,y:h*.94-deep*h*.80-z*base*k*.60};
 };
 const sky=ctx.createLinearGradient(0,0,w,h);sky.addColorStop(0,"#173a31");sky.addColorStop(.45,"#174031");sky.addColorStop(1,"#102d28");ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
 if(this.mode==="side"){
  const g=ctx.createLinearGradient(0,0,0,h);g.addColorStop(0,"#122e2b");g.addColorStop(.82,"#28473a");g.addColorStop(1,"#16392b");ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  ctx.fillStyle="#234e34";ctx.fillRect(0,h*.83,w,h*.17);
 }else{
  const edge=y=>26+4*Math.sin(y*.021)+5*Math.cos(y*.035);
  for(let y=maxD+30;y>=0;y-=10){const y2=y+10,l=edge(y),l2=edge(y2);path(ctx,[project(-l,y),project(l,y),project(l2,y2),project(-l2,y2)],Math.round(y/10)%2?"#2b6442":"#2f6b45");}
  for(let i=0;i<450;i++){const x=(noise(i)-.5)*160,y=noise(i+875)*maxD;const p=project(x,y);ctx.fillStyle=noise(i+40)>.5?"#91b77a13":"#05271a12";ctx.fillRect(p.x,p.y,1+noise(i+21)*2,1);}
  const rough=(x,y,rx,ry,fill)=>{const pts=[];for(let i=0;i<=40;i++){const a=i/40*Math.PI*2,r=1+.09*Math.sin(a*3+.5);pts.push(project(x+Math.cos(a)*rx*r,y+Math.sin(a)*ry*r));}path(ctx,pts,fill);};
  rough(-43,155,10,24,"#103c30");rough(42,215,17,28,"#0c332a");rough(-37,72,7,13,"#a0aa7866");rough(36,118,7,16,"#c4bf8c77");rough(-35,226,5,17,"#c3b78277");
  // Plan view lines show a flat reference field, not a real course map.
  ctx.setLineDash([4,7]);path(ctx,[project(0,0),project(0,maxD)],null,"#b6d8a94d",1,false);ctx.setLineDash([]);
 }
 const unit=S.state.settings.distanceUnit,step=unit==="yd"?45.72:50;
 for(let y=step;y<=maxD;y+=step){
  const a=project(-44,y),b=project(44,y);ctx.setLineDash([3,6]);path(ctx,[a,b],null,"#b8d9b329",1,false);ctx.setLineDash([]);
  if(this.mode==="side"){const p=project(0,y);path(ctx,[{x:p.x,y:h*.83},{x:p.x,y:h*.85}],null,"#86aa85",1,false);text(ctx,Math.round(unit==="yd"?y/.9144:y),p.x,h*.91,"#a3bba3",9);}
  else {const p=project(30,y);text(ctx,Math.round(unit==="yd"?y/.9144:y),p.x+9,p.y-4,"#b4cbaa",10,"left");}
 }
 const target=S.state.settings.target;
 if(this.mode!=="side"){
  for(const r of [4,9,15]){const pts=[];for(let i=0;i<=60;i++){const a=i/60*Math.PI*2;pts.push(project(Math.cos(a)*r,target+Math.sin(a)*r));}path(ctx,pts,r===4?"#c8f56a13":null,"#cee89566",.8);}
  const flag=project(0,target);path(ctx,[flag,{x:flag.x,y:flag.y-27}],null,"#f2f6de",1.5,false);path(ctx,[{x:flag.x,y:flag.y-27},{x:flag.x+13,y:flag.y-24},{x:flag.x,y:flag.y-20}],"#c8f56a");
  text(ctx,`${Math.round(unit==="yd"?target/.9144:target)} ${unit}`,flag.x-5,flag.y+20,"#d7e7bb",9,"right");
 }
 const valid=shot&&S.finite(shot.carry)&&S.finite(shot.offline);
 if(valid){
  const canArc=S.finite(shot.apex),pts=[],shadow=[];
  const maxI=Math.floor(100*this.progress);
  for(let i=0;i<=maxI;i++){
    const t=i/100;
    const side=S.finite(shot.launchDir)?shot.offline*t*t+Math.tan(shot.launchDir*Math.PI/180)*shot.carry*t*(1-t):shot.offline*t;
    const high=canArc?4*shot.apex*t*(1-t):0;
    pts.push(project(side,shot.carry*t,high));shadow.push(project(side,shot.carry*t,0));
  }
  if(canArc&&pts.length>1){
    ctx.setLineDash([3,5]);path(ctx,shadow,null,"#0d231b99",1,false);ctx.setLineDash([]);
    ctx.save();ctx.shadowBlur=12;ctx.shadowColor="#e2ff8566";path(ctx,pts,null,"#ddff91",2.5,false);ctx.restore();
  }
  const land=project(shot.offline,shot.carry);circle(ctx,land.x,land.y,5,"#e2f2a4","#365233");circle(ctx,land.x,land.y,10,null,"#d4ee7d55");
  if(canArc&&pts.length){const p=pts.at(-1);circle(ctx,p.x,p.y,4,"#fffde5");circle(ctx,p.x,p.y,8,null,"#f0ff8f33");}
  if(this.progress===1){const label=`${S.format("carry",shot.carry)} ${unit}`;const x=S.clamp(land.x+13,50,w-60),y=S.clamp(land.y-14,48,h-45);ctx.fillStyle="#0b251cdb";ctx.fillRect(x-7,y-14,68,23);text(ctx,label,x,y+2,"#e6f8b8",11,"left");}
 }
 const tee=project(0,0);circle(ctx,tee.x,tee.y,3,"#edf5c8");text(ctx,"TEE",tee.x+12,tee.y+4,"#a4c0a2",8,"left");
 const vignette=ctx.createRadialGradient(w*.5,h*.5,h*.15,w*.5,h*.5,w*.75);vignette.addColorStop(0,"#00161200");vignette.addColorStop(1,"#00181150");ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 }
}
function scatter(canvas,shots){
 const {ctx,w,h}=canvasSetup(canvas);if(w<10)return;
 const data=shots.filter(s=>S.finite(s.carry)&&S.finite(s.offline));
 const pad={l:40,r:18,t:15,b:29},cw=w-pad.l-pad.r,ch=h-pad.t-pad.b;
 const target=S.state.settings.target,maxY=Math.max(target*1.35,200,...data.map(d=>d.carry*1.18)),maxX=Math.max(30,...data.map(d=>Math.abs(d.offline)*1.25));
 const px=x=>pad.l+cw*(.5+x/(maxX*2)),py=y=>pad.t+ch*(1-y/maxY);
 ctx.lineWidth=1;
 for(let i=0;i<=4;i++){let y=i*maxY/4;path(ctx,[{x:pad.l,y:py(y)},{x:w-pad.r,y:py(y)}],null,"#284240",.7,false);text(ctx,Math.round(S.displayNumber("carry",y)),pad.l-9,py(y)+3,"#668580",9,"right");}
 for(const x of [-maxX,0,maxX]){ctx.setLineDash(x===0?[4,5]:[]);path(ctx,[{x:px(x),y:pad.t},{x:px(x),y:h-pad.b}],null,x===0?"#81a47b70":"#28423d",.7,false);ctx.setLineDash([]);text(ctx,Math.round(S.displayNumber("offline",x)),px(x),h-9,"#688780",9);}
 ctx.setLineDash([3,5]);path(ctx,[{x:pad.l,y:py(target)},{x:w-pad.r,y:py(target)}],null,"#bbd87b88",1,false);ctx.setLineDash([]);text(ctx,"TARGET",w-pad.r,py(target)-6,"#b6cb83",8,"right");
 if(data.length>=3){
 const mx=data.reduce((a,d)=>a+d.offline,0)/data.length,my=data.reduce((a,d)=>a+d.carry,0)/data.length;
 const xs=data.map(d=>px(d.offline)-px(mx)),ys=data.map(d=>py(d.carry)-py(my)),n=data.length-1;
 const vx=xs.reduce((a,x)=>a+x*x,0)/n,vy=ys.reduce((a,y)=>a+y*y,0)/n,cov=xs.reduce((a,x,i)=>a+x*ys[i],0)/n;
 const theta=.5*Math.atan2(2*cov,vx-vy),a=(vx+vy)/2,b=Math.sqrt((vx-vy)**2/4+cov*cov);
 const rx=Math.sqrt(Math.max(0,a+b)),ry=Math.sqrt(Math.max(0,a-b));
 ctx.beginPath();ctx.ellipse(px(mx),py(my),Math.max(.5,rx),Math.max(.5,ry),theta,0,Math.PI*2);ctx.fillStyle="#b9ed7316";ctx.fill();ctx.strokeStyle="#b9ed7377";ctx.stroke();
 }
 data.forEach((s,i)=>{circle(ctx,px(s.offline),py(s.carry),i===data.length-1?5:3,i===data.length-1?"#d4f78a":"#72b597");});
 if(!data.length){text(ctx,"尚無可用落點資料",w/2,h/2,"#85a49a",12);text(ctx,"需要 Carry + 左右偏移",w/2,h/2+20,"#5e8076",9);}
 return data.length;
}
function trend(canvas,shots,key){
 const {ctx,w,h}=canvasSetup(canvas);if(w<10)return;
 const values=shots.map(s=>S.displayNumber(key,S.value(s,key))),good=values.filter(S.finite);
 const l=38,r=15,t=15,b=28,cw=w-l-r,ch=h-t-b;
 if(!good.length){text(ctx,"累積幾球，開始看見趨勢。",w/2,h*.5,"#7e9c96",11);return;}
 let min=Math.min(...good),max=Math.max(...good),gap=Math.max((max-min)*.3,max*.025,1);min-=gap;max+=gap;
 const x=i=>l+(shots.length<=1?.5:i/(shots.length-1))*cw,y=v=>t+(max-v)/(max-min)*ch;
 for(let i=0;i<4;i++){const val=min+(max-min)*i/3;path(ctx,[{x:l,y:y(val)},{x:w-r,y:y(val)}],null,"#263e3d",.7,false);text(ctx,val.toFixed(0),l-8,y(val)+3,"#668680",9,"right");}
 const avg=good.reduce((a,b)=>a+b,0)/good.length;ctx.setLineDash([4,5]);path(ctx,[{x:l,y:y(avg)},{x:w-r,y:y(avg)}],null,"#9daf7177",1,false);ctx.setLineDash([]);
 let seg=[];const flush=()=>{if(seg.length>1){const area=[{x:seg[0].x,y:h-b},...seg,{x:seg.at(-1).x,y:h-b}];const g=ctx.createLinearGradient(0,t,0,h-b);g.addColorStop(0,"#c8f56a28");g.addColorStop(1,"#c8f56a00");path(ctx,area,g);path(ctx,seg,null,"#c8f56a",2,false);}seg=[];};
 values.forEach((v,i)=>{if(S.finite(v))seg.push({x:x(i),y:y(v)});else flush();});flush();
 values.forEach((v,i)=>{if(S.finite(v)){circle(ctx,x(i),y(v),3,"#c8f56a");if(shots.length<=12||i%Math.ceil(shots.length/8)===0)text(ctx,String(i+1).padStart(2,"0"),x(i),h-7,"#6b8980",9);}});
}
function delivery(shot){
 const has=shot&&S.finite(shot.clubPath)&&S.finite(shot.faceAngle),cp=has?shot.clubPath:0,fa=has?shot.faceAngle:0;
 const end=a=>({x:150+Math.sin(a*Math.PI/180)*95,y:175-Math.cos(a*Math.PI/180)*95});
 const p=end(cp),f=end(fa);
 return `<svg viewBox="0 0 300 270" role="img" aria-label="桿面與路徑資料示意"><defs><marker id="arrow-green" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#b7ec76"/></marker><marker id="arrow-blue" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="#80cbd8"/></marker></defs><circle cx="150" cy="147" r="96" fill="#102323" stroke="#2d4842"/><circle cx="150" cy="147" r="61" fill="none" stroke="#263e3a"/><path d="M150 35v200M40 175h220" stroke="#658474" stroke-dasharray="4 6" stroke-width="1"/><text x="150" y="23" text-anchor="middle" fill="#7f9b8c" font-size="10">TARGET LINE</text><circle cx="150" cy="175" r="5" fill="#f2efdf"/>${has?`<path d="M150 218L${p.x} ${p.y}" stroke="#b7ec76" stroke-width="2" marker-end="url(#arrow-green)"/><path d="M150 175L${f.x} ${f.y}" stroke="#80cbd8" stroke-width="2" marker-end="url(#arrow-blue)"/><g transform="translate(150 175) rotate(${fa})"><rect x="-25" y="2" width="50" height="11" rx="4" fill="#8a9c94" stroke="#c1d3bd"/></g>`:`<text x="150" y="128" text-anchor="middle" fill="#92aba0" font-size="13">等待桿面／路徑資料</text><text x="150" y="148" text-anchor="middle" fill="#5e8277" font-size="10">不由人體骨架推算</text>`}<circle cx="62" cy="255" r="3" fill="#b7ec76"/><text x="72" y="259" fill="#9fb59e" font-size="10">球桿路徑</text><circle cx="170" cy="255" r="3" fill="#80cbd8"/><text x="180" y="259" fill="#9bb8bc" font-size="10">桿面方向</text></svg>`;
}
S.visuals={RangeScene,scatter,trend,delivery,canvasSetup};
})();
