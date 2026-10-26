/* Calibrated, side-on short-window experiment. Results are not a launch monitor measurement. */
(function(){
'use strict';
const S=window.SL,$=S.$,M=S.motion;
let calibration=[],zone=[],pending=[],pick=null,canvas,scene,busy=false,runID=0,candidates=[],chosen=0,estimate=null,model=null,settingsSnapshot=null;
const reasons={
 CONFIRM_BALL:'\u8acb\u5148\u56de\u770b\u7d2b\u8272\u8ecc\u8de1\uff0c\u78ba\u8a8d\u8ffd\u8e64\u7684\u662f\u7403\u3002',
 CHECK_GEOMETRY_TIME:'\u8acb\u78ba\u8a8d\u5074\u62cd\u5e7e\u4f55\u8207\u5f71\u7247\u6642\u9593\u500d\u7387\u3002',
 CALIBRATION:'\u8acb\u6a19\u51fa\u540c\u4e00\u6df1\u5ea6\u7684\u6c34\u5e73\u53c3\u8003\u7269\u5169\u7aef\uff0c\u4e26\u586b\u5165\u5be6\u969b\u9577\u5ea6\u3002',
 REFERENCE_DIRECTION:'\u53c3\u8003\u7dda\u9700\u7531\u5de6\u5230\u53f3\u3001\u63a5\u8fd1\u6c34\u5e73\uff0c\u4e14\u81f3\u5c11 30 \u50cf\u7d20\u9577\u3002',
 TIME_RATIO:'\u6162\u52d5\u4f5c\u500d\u7387\u7121\u6548\u3002',TOO_FEW_POINTS:'\u8ffd\u8e64\u9ede\u4e0d\u8db3\uff0c\u81f3\u5c11\u8981\u6709 4 \u500b\u4e0d\u540c\u6642\u9593\u7684\u7403\u4f4d\u3002',
 NOT_HIGH_SPEED:'\u96e2\u687f\u521d\u6bb5 0.12 \u79d2\u5167\u7403\u5f71\u4e0d\u8db3\u3002\u8acb\u4f7f\u7528\u6e05\u695a\u7684\u9ad8\u901f\u5f71\u7247\u3002',
 TIME_SPAN:'\u6642\u9593\u8cc7\u6599\u4e0d\u8db3\u4ee5\u7a69\u5b9a\u4f30\u7b97\u901f\u5ea6\u3002',UNSTABLE_TRACK:'\u8ecc\u8de1\u4e0d\u5920\u7a69\u5b9a\u6216\u79fb\u52d5\u592a\u77ed\uff0c\u4e0d\u8f38\u51fa\u8ddd\u96e2\u3002',
 IMPLAUSIBLE_MOTION:'\u4f30\u7b97\u8d85\u51fa\u6b64\u5be6\u9a57\u6a21\u7d44\u7684\u53ef\u7528\u7bc4\u570d\uff0c\u8acb\u6aa2\u67e5\u8ffd\u8e64\u3001\u5c3a\u5ea6\u8207\u6642\u9593\u8a2d\u5b9a\u3002'
};
function msg(text,error=false){$('launchStatus').textContent=text;$('launchStatus').classList.toggle('error',error);}
function setup(){
 const panel=document.createElement('section');panel.id='launchPanel';panel.className='panel launch-panel';panel.innerHTML=`
 <div class="panel-top"><div><span class="eyebrow">IMAGE TO FLIGHT / EXPERIMENTAL</span><h2>\u5f71\u50cf\u521d\u901f\u8207 3D \u8ddd\u96e2\u6a21\u578b</h2></div><span class="chip accent">V2.4</span></div>
 <p class="launch-intro">\u5148\u6821\u6b63\u4e00\u6b21\uff0c\u518d\u8b93\u7a0b\u5f0f\u641c\u5c0b\u51fa\u7403\u8ecc\u8de1\u3002\u4e0d\u7528\u9010\u5e40\u9ede\u7403\uff1b\u4f46\u9700\u78ba\u8a8d\u5019\u9078\u78ba\u5be6\u662f\u7403\u3002</p>
 <div class="launch-banner">\u53ea\u9069\u7528\u56fa\u5b9a\u5074\u62cd\u3001\u7403\u6cbf\u756b\u9762\u6a6b\u5411\u98db\u884c\u7684\u8fd1\u666f\u3002\u5f8c\u65b9\u671d\u9060\u65b9\u62cd\u7684 DTL \u5f71\u7247\u4e0d\u80fd\u7528\u6b64\u55ae\u5c3a\u5ea6\u6cd5\u7b97\u8ddd\u96e2\u3002</div>
 <div class="launch-setup"><div class="control-row"><button id="launchScale" class="btn secondary">1 \u6a19\u793a\u6c34\u5e73\u53c3\u8003\u9577\u5ea6</button><button id="launchZone" class="btn secondary">2 \u6846\u9078\u64ca\u7403\u524d\u7403\u4f4d</button><button id="launchCancelPick" class="btn secondary small">\u7d50\u675f\u6a19\u793a</button></div>
 <div class="launch-fields">
 <label>\u53c3\u8003\u7269\u5be6\u969b\u9577\u5ea6 (cm)<input id="launchLength" type="number" min="10" max="1000" placeholder="100"></label>
 <label>\u6a94\u6848\u6642\u9593\u8ef8 FPS<select id="launchFPS"><option>30</option><option selected>60</option><option>120</option><option>240</option></select></label>
 <label>\u5168\u6bb5\u6162\u52d5\u4f5c\u500d\u7387<select id="launchRatio"><option value="1">1x</option><option value="2">2x</option><option value="4">4x</option><option value="8">8x</option></select></label>
 <label>\u6383\u63cf\u8d77\u9ede (\u5f71\u7247\u79d2)<input id="launchStart" type="number" min="0" step="0.01" value="0"></label>
 <label>\u6383\u63cf\u9577\u5ea6 (\u5f71\u7247\u79d2)<select id="launchWindow"><option value="0.5">0.5</option><option value="1" selected>1.0</option><option value="2">2.0</option><option value="4">4.0</option></select></label>
 <label>\u98a8\u963b\u4fc2\u6578 Cd (\u5047\u8a2d)<input id="launchCD" type="number" min="0.05" max="0.8" step="0.01" value="0.25"></label></div>
 <div class="control-row"><button id="launchUseTime" class="btn secondary small">\u7528\u76ee\u524d\u756b\u9762\u4f5c\u8d77\u9ede</button><span class="hint" id="launchCalibration">\u5c1a\u672a\u6821\u6b63</span></div>
 <label class="check-row"><input id="launchGeometry" type="checkbox">\u5df2\u56fa\u5b9a\u5074\u62cd\uff0c\u53c3\u8003\u7269\u8207\u521d\u6bb5\u7403\u8def\u5728\u540c\u4e00\u6df1\u5ea6\uff0c\u93e1\u982d\u672a\u79fb\u52d5</label>
 <label class="check-row"><input id="launchTimeCheck" type="checkbox">\u5df2\u78ba\u8a8d\u6a94\u6848 FPS \u8207\u6162\u52d5\u4f5c\u500d\u7387\uff1b\u9019\u6bb5\u6c92\u6709\u8b8a\u901f</label>
 <p class="hint">\u4f8b\uff1a240 FPS \u62cd\u651d\u300130 FPS \u7b49\u901f\u6162\u653e\u532f\u51fa\uff0c\u8acb\u9078\u6a94\u6848 30 FPS + 8x\u3002\u5207\u63db\u64ad\u653e\u901f\u5ea6\u4e0d\u662f\u6642\u9593\u6821\u6b63\u3002\u6162\u52d5\u4f5c\u8b8a\u901f\u6bb5\u8acb\u5148\u88c1\u5207\u3002</p></div>
 <div class="control-row"><button class="btn primary" id="launchScan">\u81ea\u52d5\u641c\u5c0b\u51fa\u7403\u8ecc\u8de1</button><button class="btn secondary" id="launchStop" disabled>\u505c\u6b62</button></div>
 <p class="status-line" id="launchStatus" role="status">\u8acb\u5148\u9078\u64c7\u5f71\u7247\uff0c\u5b9a\u4f4d\u5230\u64ca\u7403\u524d\u7684\u756b\u9762\u3002</p>
 <div id="launchCandidates" hidden><label>\u7403\u8def\u5019\u9078<select id="launchCandidate"></select></label><label class="check-row"><input id="launchConfirmed" type="checkbox">\u6211\u5df2\u56de\u770b\u78ba\u8a8d\uff0c\u7d2b\u8272\u8ecc\u8de1\u662f\u7403\uff0c\u4e0d\u662f\u767d\u978b\u6216\u53cd\u5149</label><button id="launchCalculate" class="btn primary">\u4f30\u7b97\u521d\u901f\uff0f\u91cd\u7b97 3D \u6a21\u578b</button></div>
 <div class="launch-kpis" id="launchKPIs"><div><span>\u5f71\u50cf\u6295\u5f71\u521d\u901f</span><b id="launchV">\u2014</b><small>km/h\uff0c\u975e\u687f\u982d\u901f\u5ea6</small></div><div><span>\u5074\u62cd\u8d77\u98db\u89d2</span><b id="launchAngle">\u2014</b><small>2D \u4f30\u7b97</small></div><div><span>\u7121\u65cb\u8f49\u6a21\u578b\u8ddd\u96e2</span><b id="launchRange">\u2014</b><small>\u6a21\u64ec\u843d\u5730\uff0c\u975e\u5be6\u6e2c Carry</small></div></div>
 <div class="panel-top"><span class="eyebrow">SIMULATED FLIGHT / NO SPIN</span><div class="segmented" id="launchViews"><button class="active" data-view="perspective">3D</button><button data-view="side">\u5074\u8996</button><button data-view="top">\u4fef\u8996</button></div></div>
 <div class="range-stage launch-range"><canvas id="launchCanvas"></canvas><span class="chip glass launch-watermark">\u5e73\u9762\u6a21\u578b\u7684 3D \u5448\u73fe\uff0c\u672a\u91cf\u6e2c\u5074\u65cb</span></div>
 <p id="launchModelInfo" class="hint">\u6c92\u6709\u8cc7\u6599\u5c31\u4e0d\u756b\u5f48\u9053\u3002\u6b64\u6a21\u578b\u50c5\u8003\u616e\u91cd\u529b\u8207\u56fa\u5b9a Cd \u98a8\u963b\uff0c\u672a\u7d0d\u5165\u65cb\u8f49\u5347\u529b\u3001\u98a8\u5411\u8207\u6efe\u52d5\u3002</p>
 <div class="control-row"><button class="btn secondary" id="launchAnimate" disabled>\u91cd\u64ad\u6a21\u64ec</button><button class="btn primary" id="launchSave" disabled>\u5132\u5b58\u5f71\u7247\u8207\u4f30\u7b97</button><button class="btn secondary" id="launchExport" disabled>\u532f\u51fa\u4f30\u7b97 JSON</button></div>
 <details class="launch-method"><summary>\u4f30\u7b97\u7bc4\u570d\u8207\u4e0d\u652f\u63f4\u9805\u76ee</summary><p>\u59ff\u614b\u7d00\u9304\u9700\u5168\u8eab\u5165\u93e1\uff1b\u7403\u901f\u4f30\u7b97\u9700\u8fd1\u666f\u7403\u5f71\uff0c\u9019\u5169\u7a2e\u53d6\u666f\u4e0d\u4fdd\u8b49\u80fd\u540c\u6642\u6eff\u8db3\u3002\u76f8\u6a5f\u9304\u5b8c\u53ef\u4f7f\u7528\u540c\u4e00\u5de5\u5177\u5206\u6790\uff0c\u4f46\u7db2\u9801\u93e1\u982d\u5e40\u7387\u53ef\u80fd\u4e0d\u8db3\u3002\u539f\u59cb\u5f71\u7247\u4e0d\u6703\u88ab\u8f49\u6210\u771f\u5be6\u4e09\u7dad\u5ea7\u6a19\uff0c\u6c92\u6709\u91cf\u5230\u7684\u65cb\u8f49\u3001\u687f\u9762\u3001\u687f\u901f\u4fdd\u6301\u7a7a\u767d\u3002</p></details>`;
 $('autoResults').after(panel);
 canvas=document.createElement('canvas');canvas.id='launchOverlay';canvas.className='launch-overlay';$('reviewStage').append(canvas);
 scene=new S.visuals.RangeScene($('launchCanvas'));scene.set(null);
}
function paint(){
 const v=S.review.getVideo();if(!canvas||!v)return;
 const ctx=S.pose.setupOverlay(canvas),b=S.pose.fit(v,canvas),point=p=>({x:b.x+p.x*b.w,y:b.y+p.y*b.h});
 function line(p,col){if(!p.length)return;ctx.strokeStyle=col;ctx.fillStyle=col;ctx.lineWidth=2.5;ctx.beginPath();p.forEach((q,i)=>{const r=point(q);i?ctx.lineTo(r.x,r.y):ctx.moveTo(r.x,r.y);});ctx.stroke();for(const q of p){const r=point(q);ctx.beginPath();ctx.arc(r.x,r.y,4,0,Math.PI*2);ctx.fill();}}
 line(calibration,'#80cbd8');if(zone.length===2){const a=point(zone[0]),z=point(zone[1]);ctx.strokeStyle='#c8f56a';ctx.strokeRect(a.x,a.y,z.x-a.x,z.y-a.y);}
 line(pending,'#fff');line(candidates[chosen]?.points||[],'#edb1ec');
 $('launchCalibration').textContent=(calibration.length===2?'\u53c3\u8003\u7dda\u5df2\u8a2d\u5b9a':'\u53c3\u8003\u7dda\u672a\u8a2d\u5b9a')+' \u00b7 '+(zone.length===2?'\u7403\u4f4d\u5340\u5df2\u8a2d\u5b9a':'\u7403\u4f4d\u5340\u672a\u8a2d\u5b9a');
}
function setPick(type){
 if(!S.review.getMeta().loaded){msg('\u8acb\u5148\u4e0a\u50b3\u6216\u9304\u88fd\u5f71\u7247\u3002',true);return;}
 if(busy)return;if(type&&S.review.getVideo().readyState<2){msg('\u8acb\u5148\u9ede\u64ad\u653e\u518d\u66ab\u505c\uff0c\u7b49\u5f85\u756b\u9762\u986f\u793a\u3002',true);return;}S.review.pause();S.review.chooseTool('none');pick=type;pending=[];
 canvas.style.pointerEvents=type?'auto':'none';canvas.style.touchAction=type?'none':'auto';
 if(type){msg(type==='scale'?'\u5728\u4e0a\u65b9\u5f71\u7247\u4f9d\u5de6\u81f3\u53f3\u9ede\u9078\u6c34\u5e73\u53c3\u8003\u7269\u5169\u7aef\u3002':'\u5728\u4e0a\u65b9\u5f71\u7247\u9ede\u9078\u5169\u500b\u5c0d\u89d2\uff0c\u6846\u4f4f\u64ca\u7403\u524d\u7684\u7403\uff1b\u4e0d\u8981\u6846\u767d\u978b\u3002');$('reviewStage').scrollIntoView({behavior:'auto',block:'center'});}
 paint();
}
function invalidate(){estimate=null;model=null;S.review.setLaunchAnalysis(null);for(const id of ['launchV','launchAngle','launchRange'])$(id).textContent='\u2014';for(const id of ['launchSave','launchExport','launchAnimate'])$(id).disabled=true;scene.set(null);}
function candidateUI(){
 $('launchCandidates').hidden=!candidates.length;$('launchConfirmed').checked=false;
 $('launchCandidate').innerHTML=candidates.map((c,i)=>`<option value="${i}">\u5019\u9078 ${i+1} \u00b7 ${c.points.length} \u500b\u6642\u9593\u9ede</option>`).join('');chosen=0;paint();
}
function initialPoints(points,ratio,w,h){
 const sorted=points.slice().sort((a,b)=>a.t-b.t);let begin=-1;
 for(let i=1;i<sorted.length;i++){
  const a=sorted[i-1],b=sorted[i],dt=(b.t-a.t)/ratio,d=Math.hypot((b.x-a.x)*w,(b.y-a.y)*h);
  if(dt>0&&d>2.5&&d/dt>50){begin=i-1;break;}
 }
 return begin<0?[]:sorted.slice(begin).filter(p=>(p.t-sorted[begin].t)/ratio<=.12);
}
async function scan(){
 if(busy||!S.review.getMeta().loaded)return;
 if(calibration.length!==2||zone.length!==2||!(Number($('launchLength').value)>=10)||!$('launchGeometry').checked||!$('launchTimeCheck').checked){msg('\u8acb\u5148\u5b8c\u6210\u53c3\u8003\u9577\u5ea6\u3001\u7403\u4f4d\u5340\u8207\u5169\u500b\u689d\u4ef6\u78ba\u8a8d\u3002',true);return;}
 S.review.pause();setPick(null);const v=S.review.getVideo(),meta=S.review.getMeta(),fps=Number($('launchFPS').value),start=Number($('launchStart').value),end=Math.min(meta.duration,start+Number($('launchWindow').value)),ratio=Number($('launchRatio').value);
 if(!finite(start)||start<0||!(end>start)){msg('\u6383\u63cf\u6642\u9593\u7bc4\u570d\u7121\u6548\u3002',true);return;}
 const count=Math.ceil((end-start)*fps);if(count>960){msg('\u8acb\u7e2e\u77ed\u6383\u63cf\u7bc4\u570d\u3002',true);return;}
 busy=true;const my=++runID,original=v.currentTime;invalidate();candidates=[];candidateUI();$('launchScan').disabled=true;$('launchStop').disabled=false;$('videoFile').disabled=true;
 const tracker=new S.autoCore.BrightTracker({fast:true}),image=document.createElement('canvas'),q=Math.min(1,1280/meta.width);image.width=Math.round(meta.width*q);image.height=Math.round(meta.height*q);const ctx=image.getContext('2d',{willReadFrequently:true});
 let canceled=false;
 try{
  for(let i=0;i<count;i++){
   if(my!==runID){canceled=true;break;}
   await S.seek(v,Math.min(end-.0001,start+(i+.5)/fps));if(my!==runID){canceled=true;break;}
   ctx.drawImage(v,0,0,image.width,image.height);tracker.feed(ctx.getImageData(0,0,image.width,image.height),v.currentTime);
   msg('\u81ea\u52d5\u641c\u5c0b '+(i+1)+' / '+count+' \u00b7 \u672a\u91cf\u6e2c\u6846\u5916\u7403\u8def');await S.delay(0);
  }
  if(!canceled){
   const x0=Math.min(zone[0].x,zone[1].x),x1=Math.max(zone[0].x,zone[1].x),y0=Math.min(zone[0].y,zone[1].y),y1=Math.max(zone[0].y,zone[1].y);
   candidates=tracker.results(40).map(c=>({...c,points:initialPoints(c.points,ratio,meta.width,meta.height)})).filter(c=>c.points.length>=4&&c.points[0].x>=x0&&c.points[0].x<=x1&&c.points[0].y>=y0&&c.points[0].y<=y1).slice(0,5);
   candidateUI();settingsSnapshot={width:meta.width,height:meta.height,slowRatio:ratio,reference:calibration.map(p=>({...p})),lengthCm:Number($('launchLength').value),sideOn:true,timeChecked:true,samplingFPS:fps,start,end};
   msg(candidates.length?'\u5df2\u627e\u5230\u5019\u9078\u3002\u8acb\u56de\u770b\u7d2b\u8272\u8ecc\u8de1\u662f\u5426\u70ba\u7403\uff0c\u78ba\u8a8d\u5f8c\u518d\u8a08\u7b97\u3002':'\u672a\u53d6\u5f97\u8db3\u5920\u7403\u5f71\u3002\u4e0d\u7522\u751f\u8ddd\u96e2\uff1b\u8acb\u6aa2\u67e5\u7403\u4f4d\u6846\u3001\u64ca\u7403\u6642\u9ede\u8207\u9ad8\u901f\u5f71\u7247\u3002',!candidates.length);
  }
 }catch(e){msg('\u6383\u63cf\u5931\u6557\uff1a'+e.message,true);}
 finally{busy=false;$('launchScan').disabled=false;$('launchStop').disabled=true;$('videoFile').disabled=false;if(my===runID){try{await S.seek(v,original);}catch(_){}paint();}if(canceled)msg('\u5df2\u53d6\u6d88\uff0c\u672a\u7522\u751f\u8ddd\u96e2\u3002');}
}
const finite=Number.isFinite;
function calculate(){
 if(!candidates[chosen])return;
 const cfg={...settingsSnapshot,reference:calibration.map(p=>({...p})),lengthCm:Number($('launchLength').value),slowRatio:Number($('launchRatio').value),sideOn:$('launchGeometry').checked,timeChecked:$('launchTimeCheck').checked,confirmed:$('launchConfirmed').checked};
 if(!settingsSnapshot||cfg.slowRatio!==settingsSnapshot.slowRatio){msg('\u6642\u9593\u500d\u7387\u5df2\u8b8a\u66f4\uff0c\u8acb\u91cd\u65b0\u6383\u63cf\u3002',true);return;}
 const r=M.estimateLaunch(candidates[chosen].points,cfg);invalidate();
 if(!r.ok){msg(reasons[r.code]||r.code,true);return;}
 const cd=Number($('launchCD').value);if(!(cd>=.05&&cd<=.8)){msg('Cd \u9700\u4ecb\u65bc 0.05 \u8207 0.8\u3002',true);return;}
 estimate=r;model=M.simulate(r.speedMps,r.launchDeg,{cd});if(!model){msg('\u4e0d\u9069\u7528\u98db\u884c\u6a21\u578b\u3002',true);return;}
 const vacuum=M.simulate(r.speedMps,r.launchDeg,{cd:0});
 const record={schema:'swinglab.launch.v2.4',calibration:cfg,zone,candidatePoints:candidates[chosen].points,estimate:r,model,comparison:{noDragRangeM:vacuum?.rangeM},verifiedByUser:true,notice:'Experimental projection estimate + assumed no-spin flight model; not measured Carry, spin, club speed or face angle.'};
 S.review.setLaunchAnalysis(record);show(record);msg('\u4f30\u7b97\u5b8c\u6210\u3002\u8ddd\u96e2\u662f\u6307\u5b9a\u5047\u8a2d\u4e0b\u7684\u6a21\u64ec\uff0c\u4e0d\u662f\u5be6\u6e2c Carry\u3002');
}
function show(r){
 if(!r?.estimate?.ok||!r.model)return;estimate=r.estimate;model=r.model;
 $('launchV').textContent=(estimate.speedMps*3.6).toFixed(1);$('launchAngle').textContent=estimate.launchDeg.toFixed(1)+'\u00b0';$('launchRange').textContent=model.rangeM.toFixed(1)+' m';
 scene.set({carry:model.rangeM,apex:model.apexM,offline:0,modelPath:model.path});
 $('launchModelInfo').textContent=`${estimate.pointsUsed} \u9ede\uff0c\u521d\u6bb5 ${estimate.spanSeconds.toFixed(3)} s\uff1b\u64ec\u5408\u6b98\u5dee ${estimate.residualPixels.toFixed(1)} px\u3002Cd=${model.assumptions.cd}\uff08\u5047\u8a2d\uff09\u3001\u7a7a\u6c23\u5bc6\u5ea6 1.225 kg/m\u00b3\u3001\u8cea\u91cf 45.93 g\u3001\u76f4\u5f91 42.67 mm\uff1b\u672a\u8a08\u5347\u529b\u8207\u98a8\u3002\u7121\u7a7a\u963b\u5c0d\u7167\u6a21\u578b ${r.comparison?.noDragRangeM?.toFixed(1)||'?'} m\uff0c\u4e0d\u662f\u8aa4\u5dee\u7bc4\u570d\u3002\u771f\u5be6 Carry\uff1a\u672a\u91cf\u6e2c\u3002`;
 for(const id of ['launchSave','launchExport','launchAnimate'])$(id).disabled=false;
}
function reset(){
 ++runID;busy=false;calibration=[];zone=[];pending=[];pick=null;candidates=[];settingsSnapshot=null;estimate=null;model=null;
 $('launchLength').value='';$('launchGeometry').checked=$('launchTimeCheck').checked=false;$('launchConfirmed').checked=false;canvas.style.pointerEvents='none';
 $('launchStart').value='0';candidateUI();for(const id of ['launchV','launchAngle','launchRange'])$(id).textContent='\u2014';for(const id of ['launchSave','launchExport','launchAnimate'])$(id).disabled=true;
 scene.set(null);msg('\u65b0\u5f71\u7247\uff1a\u8acb\u91cd\u65b0\u78ba\u8a8d\u62cd\u651d\u5e7e\u4f55\u8207\u6821\u6b63\uff0c\u907f\u514d\u5957\u7528\u932f\u8aa4\u5c3a\u5ea6\u3002');
}
function splitResult(){
 const info=S.review.getInfo(),ratio=info.slowRatio||1;
 const swings=M.splitSwings(info.samples||[],info.width,info.height,ratio),host=$('uploadedSwings');host.replaceChildren();
 const title=document.createElement('p');title.className='hint';title.textContent=swings.length?'\u5f71\u7247\u4e2d\u7684\u63ee\u687f\u5019\u9078\uff08\u975e\u64ca\u7403\u78ba\u8a8d\uff09':'\u5c1a\u672a\u627e\u5230\u5b8c\u6574\u7684\u9810\u5099\u2192\u63ee\u687f\u2192\u6536\u687f\u7247\u6bb5\u3002';host.append(title);
 for(const [i,s] of swings.entries()){const b=document.createElement('button');b.className='btn secondary small';b.textContent='Swing '+(i+1)+' \u00b7 '+s.start.toFixed(1)+'\u2013'+s.end.toFixed(1)+' s';b.onclick=()=>S.review.gotoTime(Math.max(0,s.start-.5*ratio));host.append(b);}
}
function init(){
 setup();const swings=document.createElement('div');swings.id='uploadedSwings';$('autoEvents').after(swings);
 $('launchScale').onclick=()=>setPick('scale');$('launchZone').onclick=()=>setPick('zone');$('launchCancelPick').onclick=()=>setPick(null);
 canvas.addEventListener('pointerdown',e=>{
  if(!pick||busy)return;e.preventDefault();const v=S.review.getVideo(),r=canvas.getBoundingClientRect(),b=S.pose.fit(v,canvas),x=(e.clientX-r.left-b.x)/b.w,y=(e.clientY-r.top-b.y)/b.h;
  if(x<0||x>1||y<0||y>1)return;pending.push({x,y});if(pending.length===2){if(pick==='scale')calibration=pending.slice();else zone=pending.slice();setPick(null);invalidate();msg('\u6a19\u793a\u5b8c\u6210\u3002\u8acb\u56de\u5230\u4e0b\u65b9\u5b8c\u6210\u6821\u6b63\u8a2d\u5b9a\u3002');}paint();
 });
 $('launchUseTime').onclick=()=>{$('launchStart').value=S.review.getVideo().currentTime.toFixed(3);};
 $('launchScan').onclick=scan;$('launchStop').onclick=()=>{runID++;};
 $('launchCandidate').onchange=()=>{chosen=Number($('launchCandidate').value);$('launchConfirmed').checked=false;invalidate();paint();};$('launchCalculate').onclick=calculate;
 $('launchViews').onclick=e=>{const b=e.target.closest('[data-view]');if(!b)return;scene.view(b.dataset.view);$('launchViews').querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));};
 $('launchAnimate').onclick=()=>scene.animate();$('launchSave').onclick=()=>S.review.save();$('launchExport').onclick=()=>S.download(new Blob([JSON.stringify(S.review.getInfo().launchAnalysis,null,2)],{type:'application/json'}),'SwingLab-launch-estimate.json');
 for(const id of ['launchLength','launchGeometry','launchTimeCheck','launchConfirmed','launchCD'])$(id).addEventListener('change',()=>{if(estimate)invalidate();});
 for(const id of ['launchRatio','launchFPS'])$(id).addEventListener('change',()=>{candidates=[];candidateUI();invalidate();msg('\u6642\u9593\u8a2d\u5b9a\u5df2\u8b8a\u66f4\uff0c\u8acb\u91cd\u65b0\u6383\u63cf\u3002');});
 window.addEventListener('sl:review-ready',()=>{reset();const r=S.review.getInfo().launchAnalysis;if(r){calibration=r.calibration?.reference||[];zone=r.zone||[];$('launchLength').value=r.calibration?.lengthCm||'';$('launchRatio').value=String(r.calibration?.slowRatio||1);show(r);paint();msg('\u5df2\u9084\u539f\u4e4b\u524d\u4fdd\u5b58\u7684\u5f71\u50cf\u4f30\u7b97\u3002');}});
 window.addEventListener('sl:review-loaded',()=>{if(!S.review.getMeta().loaded){runID++;busy=false;}});
 window.addEventListener('sl:auto-complete',splitResult);window.addEventListener('sl:review-changed',paint);
 new ResizeObserver(()=>{paint();scene.draw();}).observe($('reviewStage'));new ResizeObserver(()=>scene.draw()).observe($('launchCanvas'));
}
S.launch={init,isBusy:()=>busy,cancel:()=>{runID++;},paint};
})();
