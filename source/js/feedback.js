/* V2.2: video-local results and guided tools. Never populates radar fields. */
(function(){
"use strict";
const S=window.SL,$=S.$;
let tab="ball",raf=0,initialized=false;
const names={none:"\u700f\u89bd",ball:"\u7403\u8def",club:"\u687f\u982d",scale:"\u6bd4\u4f8b",line:"\u53c3\u8003\u7dda",angle:"\u4e09\u9ede\u91cf\u89d2",target:"\u76ee\u6a19\u65b9\u5411",face:"\u687f\u9762\u65b9\u5411"};
function hint(text,error=false){$("reviewReadyHint").textContent=text;$("reviewReadyHint").classList.toggle("error",error);}
function selectTab(value){tab=value;document.querySelectorAll("[data-result-tab]").forEach(b=>{const yes=b.dataset.resultTab===tab;b.classList.toggle("active",yes);b.setAttribute("aria-selected",yes?"true":"false");});refresh();}
function focusVideo(){ $("reviewStage").scrollIntoView({behavior:"smooth",block:"center"}); }
function choose(which){
 const meta=S.review.getMeta(),state=S.review.getState();
 if(!meta.loaded){hint("\u8acb\u5148\u9078\u64c7\u5f71\u7247\uff0c\u4e0d\u9700\u8981\u5148\u8f09\u5165 AI\u3002",true);S.toast("\u5148\u9078\u64c7\u5f71\u7247\uff0c\u518d\u4f7f\u7528\u5206\u6790\u5de5\u5177\u3002");return;}
 if(state.scanning){hint("\u8acb\u5148\u53d6\u6d88 AI \u5340\u6bb5\u6383\u63cf\uff0c\u518d\u6a19\u8a18\u756b\u9762\u3002",true);return;}
 S.review.chooseTool(which);focusVideo();refresh();
}
function startTask(task){
 const info=S.review.getInfo(),state=S.review.getState();
 if(!S.review.getMeta().loaded){choose("ball");return;}
 if(task==="ball"){selectTab("ball");choose("ball");}
 if(task==="speed"){
  selectTab("speed");
  if(state.scaleCount!==2){choose("scale");}
  else if(!(info.scaleCm>0)){
   choose("scale");hint("\u8acb\u5148\u586b\u5165\u53c3\u8003\u9577\u5ea6\uff08cm\uff09\uff0c\u4e0d\u6703\u81ea\u52d5\u5047\u8a2d\u9577\u5ea6\u3002",true);
   $("quickScaleWrap").hidden=false;$("quickScale").focus({preventScroll:true});
  }else{choose("club");}
 }
 if(task==="face"){selectTab("face");choose(state.targetCount===2?"face":"target");}
 if(task==="pose"){
  S.review.chooseTool("none");hint("\u9019\u662f\u4eba\u9ad4\u59ff\u614b\u5206\u6790\uff0c\u4e0d\u662f\u81ea\u52d5\u8ffd\u7403\u3002\u6a21\u578b\u8f09\u5165\u4e2d\u4ecd\u53ef\u4f7f\u7528\u624b\u52d5\u6a19\u8a18\u3002");
  S.review.analyzeFrame();$("analyzeVideo").scrollIntoView({behavior:"smooth",block:"center"});
 }
}
function drawBackground(ctx,w,h){
 ctx.fillStyle="#0b171b";ctx.fillRect(0,0,w,h);ctx.strokeStyle="#25383c";ctx.lineWidth=1;
 for(let x=36;x<w-14;x+=(w-50)/5){ctx.beginPath();ctx.moveTo(x,26);ctx.lineTo(x,h-36);ctx.stroke();}
 for(let y=26;y<h-35;y+=(h-62)/4){ctx.beginPath();ctx.moveTo(36,y);ctx.lineTo(w-14,y);ctx.stroke();}
 ctx.fillStyle="#829c97";ctx.font="10px sans-serif";
}
function canvasContext(){const c=$("reviewResultCanvas"),r=c.getBoundingClientRect();if(r.width<3||r.height<3)return null;const d=Math.min(devicePixelRatio||1,2);c.width=Math.round(r.width*d);c.height=Math.round(r.height*d);const ctx=c.getContext("2d");ctx.setTransform(d,0,0,d,0,0);drawBackground(ctx,r.width,r.height);return {ctx,w:r.width,h:r.height};}
function plot(info,meta){
 const box=canvasContext();if(!box)return;const {ctx,w,h}=box,has=(tab==="ball"||tab==="club")?info.marks[tab].length>0:tab==="speed"?!!info.projected:!!info.projectedDelivery;
 $("reviewResultEmpty").hidden=has;
 if(!has)return;
 if(tab==="ball"||tab==="club"){
  // Preserve image aspect ratio. No false yard/metre axes.
  const mw=meta.width||640,mh=meta.height||360,scale=Math.min((w-60)/mw,(h-80)/mh),pw=mw*scale,ph=mh*scale,x0=(w-pw)/2,y0=(h-ph)/2;
  ctx.fillStyle="#101f22";ctx.fillRect(x0,y0,pw,ph);ctx.strokeStyle="#51685b";ctx.strokeRect(x0,y0,pw,ph);
  ctx.fillStyle="#99afa9";ctx.fillText("IMAGE PLANE / NOT 3D",x0,y0-10);
  const pts=info.marks[tab];ctx.strokeStyle=tab==="ball"?"#f4d47b":"#c8f56a";ctx.lineWidth=2.5;ctx.beginPath();pts.forEach((p,i)=>{const x=x0+p.x*pw,y=y0+p.y*ph;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.stroke();
  pts.forEach((p,i)=>{const x=x0+p.x*pw,y=y0+p.y*ph;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fillStyle=tab==="ball"?"#f4d47b":"#c8f56a";ctx.fill();if(pts.length<=35){ctx.font="10px sans-serif";ctx.fillText(String(i+1),x+6,y-6);}});
  ctx.fillStyle="#99afa9";ctx.fillText("x / y: % of original image",20,h-13);
 }else if(tab==="speed"){
  const segs=info.projected.segments,max=Math.max(...segs.map(s=>s.mps*3.6),1),first=segs[0].start,last=segs.at(-1).end,span=last-first||1;
  const xx=t=>40+(t-first)/span*(w-60),yy=s=>h-38-(s/max)*(h-80);
  ctx.strokeStyle="#c8f56a";ctx.lineWidth=3;
  segs.forEach(s=>{ctx.beginPath();ctx.moveTo(xx(s.start),yy(s.mps*3.6));ctx.lineTo(xx(s.end),yy(s.mps*3.6));ctx.stroke();ctx.beginPath();ctx.arc(xx((s.start+s.end)/2),yy(s.mps*3.6),3,0,Math.PI*2);ctx.fillStyle="#c8f56a";ctx.fill();});
  ctx.fillStyle="#abc3b7";ctx.fillText("km/h (2D interval average)",40,16);ctx.fillText(max.toFixed(1),5,43);ctx.fillText("0",17,h-33);ctx.fillText(first.toFixed(3)+" s",40,h-15);ctx.textAlign="right";ctx.fillText(last.toFixed(3)+" s",w-14,h-15);ctx.textAlign="left";
 }else{
  const cx=w/2,cy=h/2+6,r=Math.min(w,h)*.30;
  ctx.strokeStyle="#435a53";ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();
  function arrow(pair,color,label){const dx=(pair[1].x-pair[0].x)*meta.width,dy=(pair[1].y-pair[0].y)*meta.height,a=Math.atan2(dy,dx),x=cx+r*Math.cos(a),y=cy+r*Math.sin(a);ctx.strokeStyle=color;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(x,y);ctx.lineTo(x-10*Math.cos(a-.4),y-10*Math.sin(a-.4));ctx.moveTo(x,y);ctx.lineTo(x-10*Math.cos(a+.4),y-10*Math.sin(a+.4));ctx.stroke();ctx.fillStyle=color;ctx.font="11px sans-serif";ctx.textAlign="center";ctx.fillText(label,x,y+(y<cy?-13:18));ctx.textAlign="left";}
  arrow(info.marks.target,"#8bd7db","TARGET");arrow(info.marks.face,"#e7b4eb","MANUAL FACE");ctx.fillStyle="#e7b4eb";ctx.font="bold 22px sans-serif";ctx.fillText(info.projectedDelivery.degrees.toFixed(1)+"\u00b0",17,34);
  ctx.font="10px sans-serif";ctx.fillStyle="#a5bdb1";ctx.fillText("Manual image directions / NOT radar Face Angle",16,h-14);
 }
}
function refresh(){
 if(!initialized)return;
 const meta=S.review.getMeta(),info=S.review.getInfo(),st=S.review.getState();
 const scaleOK=st.scaleCount===2&&info.scaleCm>0;
 $("taskBallState").textContent=st.ballCount?st.ballCount+" \u9ede\u5df2\u6a19\u8a18":"\u9010\u9ede\u6a19\u8a18\uff0c\u5373\u6642\u9023\u7dda";
 $("taskSpeedState").textContent=info.projected?"\u5df2\u8a08\u7b97 2D \u901f\u5ea6":!scaleOK?"\u5148\u6821\u6b63\u9577\u5ea6":"\u9700\u4e0d\u540c\u6642\u9593\u7684\u687f\u982d\u9ede";
 $("taskFaceState").textContent=info.projectedDelivery?info.projectedDelivery.degrees.toFixed(1)+"\u00b0 \u5df2\u8a08\u7b97":"\u76ee\u6a19 "+st.targetCount+"/2 \u00b7 \u687f\u9762 "+st.faceCount+"/2";
 const n=info.samples.filter(s=>s.lm).length;
 $("taskPoseState").textContent=st.frameBusy||st.scanning||st.aiPending?"\u6a21\u578b\u8655\u7406\u4e2d\u2026":n?"\u5df2\u53d6\u5f97 "+n+" \u500b\u756b\u9762":"\u7368\u7acb AI\uff0c\u4e0d\u5f71\u97ff\u6a19\u8a18";
 $("scaleState").textContent="\u6bd4\u4f8b\u9ede "+st.scaleCount+"/2 \u00b7 "+(info.scaleCm>0?info.scaleCm+" cm":"\u5c1a\u672a\u8f38\u5165\u771f\u5be6\u9577\u5ea6");
 $("quickScaleWrap").hidden=!["scale","club"].includes(st.tool);
 if(document.activeElement!==$("quickScale"))$("quickScale").value=$("scaleCm").value;
 const marking=meta.loaded&&st.tool!=="none";
 $("markingHUD").hidden=!marking;
 $("markingTitle").textContent=(names[st.tool]||"")+" / "+st.time.toFixed(3)+"s";
 const needed=st.tool==="angle"?3:2;
 $("markingInstruction").textContent=["ball","club"].includes(st.tool)?"\u9ede\u756b\u9762\u4e2d\u7684"+(st.tool==="ball"?"\u7403":"\u687f\u982d")+"\uff0c\u518d\u6309\u4e0b\u4e00\u500b\u6642\u9593\u9ede":"\u8acb\u9ede\u7b2c "+(st.pending+1)+" / "+needed+" \u9ede";
 $("reviewStage").setAttribute("data-tool",st.tool);
 $("markNext").disabled=!meta.loaded||st.scanning;
 $("resultOrigin").textContent=meta.loaded?(meta.shotId?"\u5df2\u5132\u5b58\u5f71\u7247":"\u76ee\u524d\u5f71\u7247\uff0c\u672a\u5132\u5b58"):"\u5c1a\u672a\u8f09\u5165";
 $("resultSave").disabled=!meta.loaded||st.scanning;
 $("exportMarksCSV").disabled=!meta.loaded||st.scanning;
 let msg="",action="",emptyTitle="",emptyText="";
 if(tab==="ball"||tab==="club"){
  const count=info.marks[tab].length,word=tab==="ball"?"\u7403\u8def":"\u687f\u982d";
  msg=count?word+"\u5df2\u6a19\u8a18 "+count+" \u500b\u6642\u9ede\u3002"+(count===1?"\u79fb\u5230\u4e0b\u4e00\u500b\u6642\u9593\u9ede\u518d\u9ede\u4e00\u6b21\uff0c\u5c31\u6703\u9023\u6210\u8ecc\u8de1\u3002":"\u5716\u4e0a\u662f\u539f\u5f71\u7247\u756b\u9762\u8ecc\u8de1\uff0c\u4e0d\u662f\u771f\u5be6\u98db\u884c\u8ddd\u96e2\u3002"):
  "\u9078\u300c\u6a19\u8a18"+word+"\u300d\u2192 \u9ede\u756b\u9762\u4e2d\u7684\u4f4d\u7f6e \u2192 \u4e0b\u4e00\u500b\u6642\u9593\u9ede \u2192 \u518d\u9ede\u4e00\u6b21\u3002";
  action="\u6a19\u8a18"+word;emptyTitle="\u5c1a\u7121"+word+"\u6a19\u8a18";emptyText="\u6b64\u529f\u80fd\u4e0d\u9700 AI \u6a21\u578b\uff0c\u4f9d\u624b\u52d5\u9ede\u9078\u7684\u771f\u5be6\u756b\u9762\u4f4d\u7f6e\u756b\u7dda\u3002";
 }else if(tab==="speed"){
  msg=info.projected?"\u6700\u5927\u5340\u9593\u5e73\u5747 "+(info.projected.maxMps*3.6).toFixed(1)+" km/h \u00b7 \u5168\u6bb5\u5e73\u5747 "+(info.projected.meanMps*3.6).toFixed(1)+" km/h \u00b7 "+info.projected.segments.length+" \u6bb5\u3002\u50c5\u70ba\u6821\u6b63\u5f8c\u7684 2D \u6295\u5f71\u901f\u5ea6\uff0c\u975e\u64ca\u7403\u77ac\u9593\u771f\u5be6\u687f\u901f\u3002":
  "\u9700\u8981\uff1a\u6bd4\u4f8b\u5169\u9ede\uff08"+st.scaleCount+"/2\uff09\u3001\u5be6\u969b\u9577\u5ea6\uff08"+(info.scaleCm>0?info.scaleCm+"cm":"\u672a\u8f38\u5165")+"\uff09\u3001\u4e0d\u540c\u6642\u9593\u7684\u687f\u982d\u9ede\uff08"+st.clubCount+" \u9ede\uff09\u3002";
  action=!scaleOK?"\u8a2d\u5b9a\u6bd4\u4f8b\u8207\u9577\u5ea6":"\u6a19\u8a18\u687f\u982d";emptyTitle="\u901f\u5ea6\u6821\u6b63\u9084\u6c92\u5b8c\u6210";emptyText=msg;
 }else{
  msg=info.projectedDelivery?"\u76f8\u5c0d\u76ee\u6a19\u65b9\u5411 "+info.projectedDelivery.degrees.toFixed(1)+"\u00b0\uff1b\u756b\u9762\u9006\u6642\u91dd\u70ba\u6b63\u3002\u662f\u624b\u756b\u65b9\u5411\u7dda\u593e\u89d2\uff0c\u4e0d\u7b49\u65bc\u4e09\u7dad\u687f\u9762\u958b\u95dc\u89d2\u3002":
  "\u5148\u9ede\u5169\u9ede\u8a2d\u76ee\u6a19\u65b9\u5411\uff08"+st.targetCount+"/2\uff09\uff0c\u518d\u9ede\u5169\u9ede\u756b\u51fa\u687f\u9762\u671d\u5411\uff08"+st.faceCount+"/2\uff09\u3002\u7dda\u6bb5\u592a\u77ed\u4e0d\u8a08\u7b97\u3002";
  action=st.targetCount===2?"\u6a19\u8a18\u687f\u9762\u671d\u5411":"\u6a19\u8a18\u76ee\u6a19\u65b9\u5411";emptyTitle="\u9700\u8981\u5169\u689d\u65b9\u5411\u7dda";emptyText=msg;
 }
 $("reviewResultText").textContent=msg;$("resultNextAction").textContent=action;
 $("reviewResultEmpty").querySelector("b").textContent=emptyTitle;$("reviewResultEmpty").querySelector("p").textContent=emptyText;
 const rows=[];for(const kind of ["ball","club"]){info.marks[kind].forEach((p,index)=>rows.push({kind,index,...p}));}
 rows.sort((a,b)=>a.t-b.t);
 $("markRows").innerHTML=rows.length?rows.slice(-100).map(p=>`<tr><td>${names[p.kind]}</td><td><button class="text-btn" data-mark-time="${p.t}">${p.t.toFixed(3)}s</button></td><td>${(p.x*100).toFixed(1)} / ${(p.y*100).toFixed(1)}</td><td><button class="text-btn" data-remove-kind="${p.kind}" data-remove-index="${p.index}">\u522a\u9664</button></td></tr>`).join(""):"<tr><td colspan='4'>\u5c1a\u7121\u7403\u8def\u6216\u687f\u982d\u6a19\u8a18\u3002</td></tr>";
 cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>plot(info,meta));
}
function exportCSV(){
 if(!S.review.getMeta().loaded){hint("\u8acb\u5148\u8f09\u5165\u5f71\u7247\u3002",true);return;}
 const i=S.review.getInfo();const rows=[["type","video_time_s","x_normalized","y_normalized","width_px","height_px","reference_cm","slow_motion_ratio"]];
 for(const k of ["ball","club","scale","target","face"]){for(const p of i.marks[k])rows.push([k,p.t,p.x,p.y,i.width,i.height,i.scaleCm??"",i.slowRatio]);}
 S.download(new Blob(["\uFEFF"+rows.map(r=>r.map(S.csvCell).join(",")).join("\r\n")],{type:"text/csv;charset=utf-8"}),"swinglab-video-marks.csv");
}
function init(){
 initialized=true;
 const wrap=document.createElement("label");wrap.id="quickScaleWrap";wrap.className="quick-scale";wrap.hidden=true;
 wrap.innerHTML='<span>\u53c3\u8003\u9577\u5ea6\uff08cm\uff09</span><input id="quickScale" inputmode="decimal" type="number" min="0.1" step="any" placeholder="\u4f8b\uff1a100\uff08\u9700\u5be6\u969b\u78ba\u8a8d\uff09"><small>\u4f7f\u7528\u8207\u687f\u982d\u76f8\u8fd1\u6df1\u5ea6\u7684\u53c3\u8003\u7269</small>';
 $("annotationTools").after(wrap);
 $("quickScale").oninput=()=>{$("scaleCm").value=$("quickScale").value;$("scaleCm").dispatchEvent(new Event("input",{bubbles:true}));};
 document.querySelectorAll("[data-go-task]").forEach(b=>b.onclick=()=>startTask(b.dataset.goTask));
 document.querySelectorAll("[data-result-tab]").forEach(b=>b.onclick=()=>selectTab(b.dataset.resultTab));
 $("resultNextAction").onclick=()=>tab==="club"?choose("club"):startTask(tab);
 $("markNext").onclick=()=>S.review.step(1);$("finishMarks").onclick=()=>{S.review.chooseTool("none");refresh();};
 $("resultSave").onclick=()=>S.review.save();$("exportMarksCSV").onclick=exportCSV;
 $("markRows").onclick=e=>{const del=e.target.closest("[data-remove-kind]"),jump=e.target.closest("[data-mark-time]");if(del)S.review.removeMark(del.dataset.removeKind,Number(del.dataset.removeIndex));if(jump)S.review.gotoTime(Number(jump.dataset.markTime));};
 window.addEventListener("sl:review-changed",refresh);
 window.addEventListener("sl:review-loaded",e=>{if(e.detail.loaded){hint("\u5f71\u7247\u5df2\u8f09\u5165\u3002\u9078\u4e00\u500b\u5206\u6790\u9805\u76ee\uff1b\u6a19\u8a18\u5f8c\u4e0b\u65b9\u5716\u8868\u7acb\u5373\u9023\u52d5\u3002");}else hint("\u6b63\u5728\u8b80\u53d6\u5f71\u7247\u2026");refresh();});
 $("reviewVideo").addEventListener("timeupdate",()=>{if($("markingHUD").hidden)return;$("markingTitle").textContent=(names[S.review.getState().tool]||"")+" / "+$("reviewVideo").currentTime.toFixed(3)+"s";});
 new ResizeObserver(refresh).observe($("reviewResultCanvas"));
 refresh();
}
S.feedback={init,refresh,startTask,selectTab};
})();
