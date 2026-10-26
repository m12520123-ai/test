/* Same-page flight workflow. Reuses the existing live/review controllers, not iframes. */
(function(){
"use strict";
const S=window.SL,$=S.$;
let mode="video",captureBlock,reviewBlock,captureHome,reviewHome,suppressed=false,switching=false,accepting=false,revision=0;
function context(text,error=false){$("flightContext").textContent=text;$("flightContext").classList.toggle("error",error);}
function paintMode(){
 for(const [id,value] of [["flightModeVideo","video"],["flightModeCamera","camera"]]){
  const button=$(id),active=mode===value;button.classList.toggle("active",active);button.setAttribute("aria-selected",String(active));button.tabIndex=active?0:-1;
 }
 $("flightReviewHost").hidden=mode!=="video";$("flightCaptureHost").hidden=mode!=="camera";
 refresh();
}
function mount(route){
 revision++;
 if(route==="flight"){
  $("flightCaptureHost").append(captureBlock);$("flightReviewHost").append(reviewBlock);paintMode();
 }else{
  captureHome.append(captureBlock);reviewHome.append(reviewBlock);
 }
}
async function selectMode(next,{force=false}={}){
 if(!["video","camera"].includes(next)||switching)return false;
 if(next===mode){paintMode();return true;}
 const my=revision;switching=true;
 try{
  if(S.live.isRecording()&&!force&&!confirm("\u5207\u63db\u4f86\u6e90\u6703\u7d50\u675f\u9304\u5f71\u4e26\u95dc\u9589\u76f8\u6a5f\u3002\u7e7c\u7e8c\uff1f"))return false;
  if(S.live.isActive()){
   const before=suppressed;suppressed=true;
   try{await S.live.close();}finally{suppressed=before;}
  }
  S.review.pause();
  if(my!==revision||S.state.route!=="flight")return false;
  mode=next;paintMode();S.review.draw();
  context(next==="camera"?"\u6309\u300c\u958b\u555f\u76f8\u6a5f\uff0b\u5206\u6790\u300d\u958b\u59cb\u3002\u9304\u5f71\u505c\u6b62\u5f8c\uff0c\u6703\u81ea\u52d5\u5207\u56de\u540c\u9801\u56de\u653e\u3002\u672c\u6a5f\u59ff\u614b\u5206\u6790\u4e0d\u662f\u96f7\u9054\u6e2c\u91cf\u3002":S.review.getMeta().loaded?"\u5f71\u7247\u5df2\u4fdd\u7559\u3002\u7528\u6a19\u8a18\u5de5\u5177\u7e7c\u7e8c\u5206\u6790\uff0c\u4e0d\u9700\u91cd\u65b0\u4e0a\u50b3\u3002":"\u8acb\u9078\u64c7\u5f71\u7247\uff0c\u6216\u5207\u63db\u624b\u6a5f\u76f8\u6a5f\u9304\u88fd\u3002");
  return true;
 }finally{switching=false;}
}
function refresh(){
 const meta=S.review.getMeta();
 $("flightSummary").hidden=!(meta.loaded&&mode==="video");
 $("flightOpenSaved").disabled=!S.selected()?.mediaId||S.state.demo;
 if(!meta.loaded)return;
 const info=S.review.getInfo();
 $("flightClipLength").textContent=S.finite(meta.duration)?meta.duration.toFixed(1)+" s":"\u9577\u5ea6\u672a\u63d0\u4f9b";
 $("flightClipSource").textContent=(meta.source==="camera"?"\u624b\u6a5f\u9304\u5f71":"\u4e0a\u50b3\u5f71\u7247")+(meta.shotId?" \u00b7 \u5df2\u5132\u5b58":" \u00b7 \u672a\u5132\u5b58");
 $("flightBallCount").innerHTML=`${info.marks.ball.length}<small>\u9ede</small>`;
 $("flightProjectedSpeed").innerHTML=info.projected?`${(info.projected.maxMps*3.6).toFixed(1)}<small>km/h</small>`:"\u2014<small>km/h</small>";
 $("flightFaceAngle").innerHTML=info.projectedDelivery?`${info.projectedDelivery.degrees.toFixed(1)}<small>\u00b0</small>`:"\u2014<small>\u00b0</small>";
}
async function acceptRecording(record){
 if(!record||accepting||S.state.route!=="flight")return;
 accepting=true;
 try{
  const changed=await selectMode("video",{force:true});if(!changed||S.state.route!=="flight")return;
  context("\u9304\u5f71\u5df2\u5b8c\u6210\uff0c\u6b63\u5728\u8f09\u5165\u672c\u9801\u56de\u653e\u2026");
  await S.review.load(record.blob,{analysis:record.analysis,shotId:record.shotId,source:"camera",club:record.info.club,duration:record.info.duration});
  if(S.state.route!=="flight")return;
  if(!S.review.getMeta().loaded){context("\u5f71\u7247\u7121\u6cd5\u5728\u6b64\u700f\u89bd\u5668\u56de\u653e\u3002\u53ef\u5207\u56de\u76f8\u6a5f\u5206\u9801\u53e6\u5b58\u539f\u59cb\u5f71\u7247\u3002",true);return;}
  context("\u9304\u5f71\u5df2\u63a5\u5230\u540c\u9801\u3002\u5148\u5b9a\u4f4d\u64ca\u7403\u756b\u9762\uff0c\u518d\u6a19\u8a18\u7403\u8def\u3001\u687f\u982d\u6216\u687f\u9762\u65b9\u5411\u3002");
  refresh();$("flightReviewHost").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){context("\u7121\u6cd5\u8f09\u5165\u9304\u5f71\uff1a"+e.message,true);}finally{accepting=false;}
}
async function openSaved(){
 const shot=S.selected();if(!shot?.mediaId||S.state.demo)return;
 try{
  const item=await S.media.get(shot.mediaId);if(!item?.blob)throw new Error("\u9019\u4e00\u7403\u6c92\u6709\u4fdd\u5b58\u5728\u6b64\u700f\u89bd\u5668\u7684\u5f71\u7247\u3002");
  if(!await selectMode("video"))return;
  await S.review.load(item.blob,{analysis:item.analysis,shotId:shot.id,source:shot.source,club:shot.club});
  $("flightExternalDetails").open=false;refresh();$("flightReviewHost").scrollIntoView({behavior:"smooth",block:"start"});
 }catch(e){S.toast(e.message);}
}
function init(){
 captureHome=$("page-capture");reviewHome=$("page-video");
 captureBlock=captureHome.querySelector(".capture-layout");reviewBlock=reviewHome.querySelector(".video-layout");
 for(const [id,value] of [["flightModeVideo","video"],["flightModeCamera","camera"]]){
  $(id).onclick=()=>selectMode(value);
  $(id).onkeydown=e=>{if(["ArrowLeft","ArrowRight","Home","End"].includes(e.key)){e.preventDefault();const next=e.key==="Home"?"video":e.key==="End"?"camera":mode==="video"?"camera":"video";selectMode(next).then(ok=>{if(ok)$(next==="video"?"flightModeVideo":"flightModeCamera").focus();});}};
 }
 $("flightOpenSaved").onclick=openSaved;
 $("flightShot").addEventListener("change",refresh);
 $("flightExternalDetails").addEventListener("toggle",()=>S.app?.refresh());
 window.addEventListener("sl:recorded",e=>{if(!suppressed&&mode==="camera"&&S.state.route==="flight")acceptRecording(e.detail);});
 window.addEventListener("sl:review-loaded",e=>{
  refresh();if(S.state.route!=="flight"||mode!=="video")return;
  if(e.detail.loaded){
   $("flightExternalDetails").open=false;
   S.state.demo=false;S.emit("data");
   context((e.detail.name?e.detail.name+" \u00b7 ":"")+"\u5df2\u8f09\u5165\u3002\u6a19\u8a18\u7403\u8def\uff1b\u9700\u8981\u901f\u5ea6\u6642\uff0c\u5148\u6821\u6b63\u6bd4\u4f8b\u518d\u6a19\u8a18\u687f\u982d\u3002");
  }
 });
 window.addEventListener("sl:review-changed",refresh);window.addEventListener("sl:data",refresh);
 paintMode();
}
S.flight={init,mount,mode:()=>mode,selectMode,refresh,acceptRecording,suppress:value=>{suppressed=Boolean(value);}};
})();
