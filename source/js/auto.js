/* V2.3 auto-first workflow. Manual controls are optional, never prerequisites for pose. */
(function(){
'use strict';const S=window.SL,$=S.$;let busy=false,index=0,readyTimer=0;
const words={le:'\u5de6\u624b\u8098',re:'\u53f3\u624b\u8098',lk:'\u5de6\u819d',rk:'\u53f3\u819d',trunk:'\u8ec0\u5e79\u50be\u89d2',head:'\u982d\u90e8\u504f\u79fb'};
function note(t,error=false){$('autoStatus').textContent=t;$('autoStatus').classList.toggle('error',error);}
function controls(){const loaded=S.review.getMeta().loaded,st=S.review.getState();$('autoRun').disabled=!loaded||busy||st.aiPending||st.scanning;$('autoStop').hidden=!busy;$('autoSave').disabled=!loaded||busy;$('autoExport').disabled=!S.review.getAutomatic()||busy;}
function details(id,title,parent){const el=document.createElement('details');el.id=id;el.className='auto-advanced';el.innerHTML=`<summary>${title}<small>OPTIONAL</small></summary>`;parent.append(el);return el;}
function installUI(){
 const panel=$('reviewMainPanel'),stage=$('reviewStage');
 const control=document.createElement('div');control.id='autoWorkbench';control.className='auto-workbench';
 control.innerHTML=`<div class="auto-intro"><div><span class="eyebrow">AUTO ANALYSIS / V2.3</span><h2>\u4e0d\u7528\u9010\u683c\u9ede\u9078\uff0c\u5148\u8b93\u7a0b\u5f0f\u5206\u6790\u3002</h2></div><span class="chip accent">AUTO</span></div>
 <p>\u81ea\u52d5\u8fa8\u8b58\u4eba\u9ad4\u3001\u7e6a\u88fd\u624b\u90e8\u8def\u5f91\u8207\u79fb\u52d5\u66f2\u7dda\u3002\u7403\u8def\u641c\u5c0b\u70ba\u5be6\u9a57\u529f\u80fd\uff0c\u4e0d\u662f\u96f7\u9054\u5f48\u9053\u3002</p>
 <div class="auto-options"><label><input type="checkbox" id="autoOnLoad" checked>\u9078\u5b8c\u5f71\u7247\u5c31\u81ea\u52d5\u958b\u59cb</label><label><input type="checkbox" id="autoTrackBall" checked>\u8a66\u9a57\uff1a\u641c\u5c0b\u767d\u8272\u79fb\u52d5\u7269\u5019\u9078</label></div>
 <div class="auto-actions"><button class="btn primary" id="autoRun" disabled>\u4e00\u9375\u81ea\u52d5\u5206\u6790</button><button class="btn secondary" id="autoStop" hidden>\u505c\u6b62\u5206\u6790</button><span id="autoPercent">\u7b49\u5f85\u5f71\u7247</span></div><p class="status-line" role="status" id="autoStatus">\u4e0a\u65b9\u9078\u64c7\u5f71\u7247\uff0c\u6216\u5207\u63db\u624b\u6a5f\u76f8\u6a5f\u3002\u9996\u6b21\u4eba\u9ad4\u8fa8\u8b58\u9700\u4e0b\u8f09\u6a21\u578b\u3002</p>`;
 panel.insertBefore(control,stage);
 const manual=details('manualReview','\u9032\u968e\u624b\u52d5\u6821\u6b63\uff08\u9078\u7528\uff0c\u4e0d\u5f71\u97ff\u81ea\u52d5\u5206\u6790\uff09',panel);
 const scanActions=$('analyzeClip').parentElement,clipControls=$('clipStart').closest('.control-row');
 for(const el of [$('reviewWorkflow'),$('inlineToolbox'),scanActions,clipControls])manual.append(el);
 // Progress stays visible even when advanced tools are collapsed.
 const mainColumn=panel.parentElement;
 const out=document.createElement('section');out.id='autoResults';out.className='panel auto-results';out.innerHTML=`
 <div class="panel-top"><div><span class="eyebrow">YOUR VIDEO / AUTOMATIC RESULTS</span><h2>\u81ea\u52d5\u5206\u6790\u7d50\u679c</h2></div><span class="chip" id="autoResultTag">\u5c1a\u672a\u5206\u6790</span></div>
 <div class="auto-kpis" id="autoKPIs"></div><p class="hint" id="autoExplanation">\u9019\u88e1\u6703\u986f\u793a\u81ea\u52d5\u53d6\u5f97\u7684\u7d50\u679c\uff0c\u4e0d\u6703\u8981\u4f60\u5148\u9010\u9ede\u6a19\u8a18\u3002</p>
 <div class="auto-chart-grid"><div><h3>\u624b\u90e8\u8def\u5f91 <small>\u81ea\u52d5\u4eba\u9ad4\u95dc\u7bc0</small></h3><div id="autoPathChart" class="auto-chart"></div></div><div><h3>\u624b\u90e8\u79fb\u52d5\u66f2\u7dda <small>\u975e\u687f\u982d\u901f\u5ea6</small></h3><div id="autoSpeedChart" class="auto-chart"></div></div></div>
 <div class="auto-events" id="autoEvents"></div><div id="autoAngleSummary" class="auto-angle-summary"></div>
 <div class="auto-candidates"><h3>\u5be6\u9a57\u6027\u7403\u8def\u641c\u5c0b</h3><p id="candidateStatus">\u5c1a\u672a\u641c\u5c0b\u3002</p><div id="candidateControls" hidden><label>\u672a\u78ba\u8a8d\u5019\u9078<select id="candidateSelect"></select></label><button class="btn secondary small" id="confirmCandidate">\u78ba\u8a8d\u9019\u689d\u662f\u7403\uff0c\u4fdd\u7559\u8ecc\u8de1</button></div><div id="autoBallChart" class="auto-chart" hidden></div><small>\u7d2b\u8272\u865b\u7dda\u53ea\u662f\u767d\u8272\u79fb\u52d5\u7269\u5019\u9078\uff1b\u53ef\u80fd\u662f\u767d\u978b\u3001\u53cd\u5149\u6216\u80cc\u666f\uff0c\u4e0d\u6703\u81ea\u52d5\u586b\u5165\u7403\u901f\u3001Carry\u6216\u65cb\u8f49\u91cf\u3002</small></div>
 <div class="auto-boundary"><b>\u687f\u982d\u901f\u5ea6\uff0f\u687f\u9762\u958b\u9589\u89d2\uff1a\u672c\u7248\u5c1a\u672a\u81ea\u52d5\u91cf\u6e2c</b><span>\u624b\u90e8\u79fb\u52d5\u4e0d\u662f\u687f\u982d\u901f\u5ea6\u3002\u96e3\u4ee5\u8fa8\u8b58\u7684\u7403\u3001\u687f\u9762\u4e0d\u6703\u7528\u731c\u6e2c\u503c\u88dc\u9f4a\u3002</span></div>
 <div class="auto-actions"><button class="btn primary" id="autoSave" disabled>\u5132\u5b58\u5f71\u7247\u8207\u5206\u6790</button><button class="btn secondary" id="autoExport" disabled>\u532f\u51fa\u5206\u6790 JSON</button></div>`;
 panel.after(out);
 const manualResults=details('manualResults','\u624b\u52d5\u6a19\u8a18\u7d50\u679c\u8207\u7bc0\u594f\uff08\u9078\u7528\uff09',mainColumn);
 const results=$('reviewResults'),rhythm=results.nextElementSibling;
 manualResults.append(results);if(rhythm&&rhythm!==manualResults&&rhythm!==out)manualResults.append(rhythm);
 const calibration=$('calibrationPanel'),aside=calibration.parentElement;
 const calibrationDetails=details('autoCalibration','\u687f\u901f\u8207\u687f\u9762\u624b\u52d5\u6821\u6b63\uff08\u9078\u7528\uff09',aside);calibrationDetails.append(calibration);
 const timing=document.createElement('label');timing.className='auto-timing';timing.innerHTML='\u5f71\u7247\u6162\u52d5\u4f5c\u500d\u7387 <select id="autoSlowRatio"><option value="1">1\u00d7\uff08\u6b63\u5e38\u6642\u9593\uff09</option><option value="2">2\u00d7</option><option value="4">4\u00d7</option><option value="8">8\u00d7</option></select><small>\u8b8a\u901f\u7247\u6bb5\u9700\u5148\u88c1\u5207\uff1b\u4e0d\u6703\u81ea\u52d5\u731c\u6e2c FPS\u3002</small>';control.append(timing);
}
function emptyChart(id,text){$(id).innerHTML=`<div class="auto-empty">${S.esc(text)}</div>`;}
function pathSVG(points,width,height,color='#b9ef79'){
 const W=600,H=260,fit=Math.min((W-40)/width,(H-30)/height),bw=width*fit,bh=height*fit,ox=(W-bw)/2,oy=(H-bh)/2;
 const groups=new Map();points.forEach(p=>{const g=p.group??0;if(!groups.has(g))groups.set(g,[]);groups.get(g).push(p);});
 const lines=[...groups.values()].map(g=>`<polyline points="${g.map(p=>(ox+p.x*bw).toFixed(2)+','+(oy+p.y*bh).toFixed(2)).join(' ')}" fill="none" stroke="${color}" stroke-width="2.5"/>`).join('');
 return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="2D image path"><rect x="${ox}" y="${oy}" width="${bw}" height="${bh}" fill="#0d1b20" stroke="#36504d"/>${lines}</svg>`;
}
function render(){
 const r=S.review.getAutomatic(),meta=S.review.getMeta();controls();$('autoResults').hidden=!meta.loaded;
 const kpi=(label,value,unit)=>`<div><span>${label}</span><b>${value}<small>${unit}</small></b></div>`;
 $('autoKPIs').innerHTML=kpi('\u6709\u6548\u4eba\u9ad4\u756b\u9762',r?`${r.poseFrames} / ${r.totalFrames}`:'\u2014','')+kpi('\u624b\u90e8\u5cf0\u503c\u79fb\u52d5',r?.peak?r.peak.value.toFixed(1):'\u2014','%\u756b\u5bec/s')+kpi('\u767d\u8272\u7269\u5019\u9078',r?r.candidates.length:'\u2014','\u689d');
 $('autoResultTag').textContent=!r?'\u5c1a\u672a\u5206\u6790':r.canceled?'\u90e8\u5206\u7d50\u679c':r.poseIssue||r.problem?'\u6709\u9805\u76ee\u672a\u6210\u529f':'\u6383\u63cf\u5b8c\u6210';
 $('autoEvents').replaceChildren();$('autoAngleSummary').replaceChildren();
 if(!r){$('autoExplanation').textContent='\u9078\u64c7\u5f71\u7247\u5f8c\u81ea\u52d5\u6383\u63cf\uff0c\u4e0d\u9700\u5148\u9010\u9ede\u6a19\u8a18\u3002';emptyChart('autoPathChart','\u7b49\u5f85\u81ea\u52d5\u5206\u6790');emptyChart('autoSpeedChart','\u672a\u53d6\u5f97\u8cc7\u6599\uff0c\u4e0d\u586b\u5165\u793a\u7bc4\u6578\u5b57');$('candidateControls').hidden=true;$('autoBallChart').hidden=true;$('candidateStatus').textContent='\u5c1a\u672a\u641c\u5c0b\u3002';return;}
 $('autoExplanation').textContent=r.poseIssue||r.problem?'\u4eba\u9ad4\u5206\u6790\u7570\u5e38\uff1a'+(r.poseIssue||r.problem):r.poseFrames?`\u4eba\u9ad4\u8cc7\u6599\u8986\u84cb ${(r.coverage*100).toFixed(0)}%\uff1b\u624b\u90e8\u8def\u5f91\u53ea\u63a1\u4fe1\u5fc3\u8db3\u5920\u7684\u96d9\u624b\u8155\u3002\u901f\u7387\u4ee5\u756b\u5bec\u6bd4\u4f8b\u8a08\u7b97\uff0c\u4e0d\u662f km/h\u3002`:'\u672a\u53d6\u5f97\u53ef\u7528\u4eba\u9ad4\u8cc7\u6599\u3002\u8acb\u78ba\u8a8d\u5168\u8eab\u8207\u96d9\u624b\u6e05\u695a\u5165\u93e1\u3002';
 if(r.path.length>1)$('autoPathChart').innerHTML=pathSVG(r.path,meta.width,meta.height);else emptyChart('autoPathChart','\u96d9\u624b\u8155\u8cc7\u6599\u4e0d\u8db3');
 if(r.speeds.length>1){
  const max=Math.max(...r.speeds.map(s=>s.value),1),tmax=Math.max(meta.duration||0,r.speeds.at(-1).t,1);const groups=new Map();r.speeds.forEach(p=>{if(!groups.has(p.group))groups.set(p.group,[]);groups.get(p.group).push(p);});
  const lines=[...groups.values()].map(g=>`<polyline points="${g.map(s=>`${45+s.t/tmax*525},${218-s.value/max*170}`).join(' ')}" stroke="#80d9cd" stroke-width="2.5" fill="none"/>`).join('');
  $('autoSpeedChart').innerHTML=`<svg viewBox="0 0 600 260" role="img" aria-label="hand image speed"><path d="M45 35V218H575" stroke="#3b5556" fill="none"/>${lines}<text x="45" y="24" fill="#a8bbb8" font-size="12">${max.toFixed(1)} % / s</text><text x="45" y="243" fill="#a8bbb8" font-size="12">0</text><text x="485" y="243" fill="#a8bbb8" font-size="12">${tmax.toFixed(2)} s (video)</text></svg>`;
 }else emptyChart('autoSpeedChart','\u9023\u7e8c\u624b\u90e8\u8cc7\u6599\u4e0d\u8db3');
 r.events.forEach(e=>{const b=document.createElement('button');b.className='btn secondary small';b.textContent=(e.kind==='highest-hands'?'\u624b\u90e8\u6700\u9ad8\u4f4d\u7f6e':'\u624b\u90e8\u79fb\u52d5\u6700\u5feb')+' '+e.t.toFixed(2)+'s';b.onclick=()=>S.review.gotoTime(e.t);$('autoEvents').append(b);});
 for(const [key,stat] of Object.entries(r.metrics))if(stat){const el=document.createElement('div');el.innerHTML=`<span>${words[key]}</span><b>${stat.min.toFixed(1)}\u2013${stat.max.toFixed(1)}<small>${key==='head'?'%':'\u00b0'}</small></b>`;$('autoAngleSummary').append(el);}
 const candidates=r.candidates||[];index=Math.min(index,Math.max(0,candidates.length-1));
 $('candidateStatus').textContent=!r.ballAttempted?'\u672c\u6b21\u6c92\u6709\u555f\u7528\u5be6\u9a57\u6027\u641c\u5c0b\u3002':candidates.length?`\u627e\u5230 ${candidates.length} \u689d\u767d\u8272\u79fb\u52d5\u7269\u5019\u9078\u3002\u5c1a\u672a\u78ba\u8a8d\u662f\u9ad8\u723e\u592b\u7403\u3002`:'\u672a\u627e\u5230\u7b26\u5408\u898f\u5247\u7684\u9023\u7e8c\u5019\u9078\u3002\u4e0d\u88dc\u756b\u770b\u4e0d\u898b\u7684\u7403\u8def\u3002';
 $('candidateControls').hidden=!candidates.length;$('autoBallChart').hidden=!candidates.length;
 $('candidateSelect').innerHTML=candidates.map((c,i)=>`<option value="${i}">\u5019\u9078 ${i+1} \u00b7 ${c.observations} \u500b\u89c0\u6e2c\u9ede\uff08\u672a\u78ba\u8a8d\uff09</option>`).join('');$('candidateSelect').value=String(index);
 if(candidates.length)$('autoBallChart').innerHTML=pathSVG(candidates[index].points,meta.width,meta.height,'#dcb3e5');
}
async function run(){
 if(busy||!S.review.getMeta().loaded)return;
 busy=true;index=0;controls();note('\u6b63\u5728\u81ea\u52d5\u6383\u63cf\uff1b\u4e0d\u9700\u9010\u9ede\u6a19\u8a18\u3002');
 try{await S.review.scan({automatic:true,ballCandidates:$('autoTrackBall').checked});}
 catch(e){note('\u5206\u6790\u672a\u5b8c\u6210\uff1a'+e.message,true);}
 finally{busy=false;controls();render();}
}
function init(){
 installUI();
 $('autoRun').onclick=run;$('autoStop').onclick=()=>{S.review.cancelScan();note('\u5df2\u8981\u6c42\u505c\u6b62\uff0c\u5df2\u5b8c\u6210\u7684\u8cc7\u6599\u6703\u4fdd\u7559\u3002');};
 $('autoSave').onclick=()=>S.review.save();$('autoExport').onclick=()=>S.download(new Blob([JSON.stringify(S.review.getInfo(),null,2)],{type:'application/json'}),'SwingLab-auto-analysis.json');
 $('candidateSelect').onchange=()=>{index=Number($('candidateSelect').value)||0;render();S.review.draw();};
 $('confirmCandidate').onclick=()=>{if(!confirm('\u8acb\u78ba\u8a8d\u9019\u689d\u7d2b\u8272\u5019\u9078\u78ba\u5be6\u662f\u7403\uff0c\u800c\u4e0d\u662f\u53cd\u5149\u6216\u5176\u4ed6\u7269\u9ad4\u3002\u9019\u6703\u66ff\u63db\u672c\u5f71\u7247\u73fe\u6709\u7684\u7403\u8def\u6a19\u8a18\u3002'))return;S.review.confirmCandidate(index);$('manualResults').open=true;S.feedback.selectTab('ball');S.toast('\u5df2\u4fdd\u7559\u4f60\u78ba\u8a8d\u7684\u8ecc\u8de1\uff1b\u4ecd\u975e\u4e09\u7dad\u5f48\u9053\u3002');};
 $('autoSlowRatio').onchange=()=>{$('slowRatio').value=$('autoSlowRatio').value;$('slowRatio').dispatchEvent(new Event('change'));const r=S.review.getAutomatic();if(r){Object.assign(r,S.autoCore.summarize(S.review.getInfo().samples,S.review.getMeta().width,S.review.getMeta().height,Number($('autoSlowRatio').value)));render();}};
 window.addEventListener('sl:review-ready',e=>{
  clearTimeout(readyTimer);index=0;$('autoSlowRatio').value=$('slowRatio').value;render();
  if(e.detail.restored&&S.review.getAutomatic()){note('\u5df2\u958b\u555f\u5132\u5b58\u7684\u81ea\u52d5\u5206\u6790\u3002');return;}
  note('\u5f71\u7247\u5df2\u5c31\u7dd2\u3002');
  if($('autoOnLoad').checked)readyTimer=setTimeout(()=>{if(S.state.route==='video'||S.state.route==='flight'&&S.flight.mode()==='video')run();},180);
 });
 window.addEventListener('sl:review-loaded',()=>{if(!S.review.getMeta().loaded){clearTimeout(readyTimer);busy=false;index=0;$('autoPercent').textContent='\u8f09\u5165\u5f71\u7247\u4e2d';render();}});
 window.addEventListener('sl:auto-progress',e=>{$('autoPercent').textContent=Math.round(e.detail.completed/e.detail.total*100)+'%';note(`\u5df2\u6383\u63cf ${e.detail.completed}/${e.detail.total}\uff1b${e.detail.poseFrames} \u500b\u756b\u9762\u6709\u4eba\u9ad4\u3002`);});
 window.addEventListener('sl:auto-status',e=>note(e.detail.text));
 window.addEventListener('sl:auto-complete',e=>{if(!e.detail.automatic){render();return;}busy=false;render();const r=e.detail.result;$('autoPercent').textContent=r?.canceled?'\u5df2\u505c\u6b62':r?.problem||r?.poseIssue?'\u90e8\u5206\u672a\u6210\u529f':'\u5df2\u5b8c\u6210';note(r?.poseIssue?'\u4eba\u9ad4\u6a21\u578b\u672a\u6210\u529f\uff1a'+r.poseIssue:r?.problem?r.problem:r?.canceled?'\u5df2\u505c\u6b62\uff0c\u4fdd\u7559\u90e8\u5206\u7d50\u679c\u3002':'\u81ea\u52d5\u6383\u63cf\u5b8c\u6210\uff0c\u7d50\u679c\u5728\u5f71\u7247\u4e0b\u65b9\u3002',!!(r?.problem||r?.poseIssue));});
 window.addEventListener('sl:review-changed',controls);
 render();
}
S.automation={init,run,render,candidateIndex:()=>index,isBusy:()=>busy};
})();
