from pathlib import Path
from playwright.sync_api import sync_playwright
import json
root=Path(__file__).resolve().parents[1];out=root/'tests';results=[]
with sync_playwright() as p:
 b=p.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 page=b.new_page(viewport={'width':1280,'height':960});errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
 page.set_content((root/'index.html').read_text(),wait_until='domcontentloaded');page.wait_for_timeout(200)
 page.evaluate("location.hash='capture'");page.wait_for_timeout(200)
 page.evaluate('''async()=>{
 window.__store=new Map();SL.media.put=async x=>__store.set(x.id,x);SL.media.get=async id=>__store.get(id);SL.media.remove=async id=>__store.delete(id);SL.persist=()=>true;
 SL.saveShot=s=>{const i=SL.state.shots.findIndex(x=>x.id===s.id);if(i<0)SL.state.shots.push(s);else SL.state.shots[i]=s;SL.emit('data');return true};
 const c=document.createElement('canvas');c.width=320;c.height=180;const ctx=c.getContext('2d');ctx.fillStyle='#304e43';ctx.fillRect(0,0,320,180);
 window.__stream=c.captureStream(30);window.__paint=setInterval(()=>{ctx.fillStyle='#304e43';ctx.fillRect(0,0,320,180);ctx.fillStyle='#fff';ctx.fillRect((performance.now()/10)%300,90,10,10);},33);
 const v=document.getElementById('liveVideo');v.srcObject=__stream;v.muted=true;await v.play();
 SL.live.getStream=()=>__stream;SL.live.getVideo=()=>v;SL.live.manualRecording=()=>false;
 SL.emit('camera-ready',{settings:{width:320,height:180,frameRate:30}});
 }''')
 page.wait_for_function('SL.session.active()');results.append({'name':'camera ready automatically starts continuous practice','passed':True})
 page.evaluate('''async()=>{
 const delay=ms=>new Promise(r=>setTimeout(r,ms));
 function lm(x,y){const l=Array.from({length:33},()=>({x:.5,y:.5,visibility:.99}));l[11]={x:.4,y:.3,visibility:.99};l[12]={x:.6,y:.3,visibility:.99};l[23]={x:.45,y:.55,visibility:.99};l[24]={x:.55,y:.55,visibility:.99};l[15]={x:x-.01,y,visibility:.99};l[16]={x:x+.01,y,visibility:.99};return l;}
 for(let j=0;j<2;j++){
  for(let i=0;i<90;i++){
   const t=i/15;let x=.5,y=.68;
   if(t>=1.2&&t<2){const k=(t-1.2)/.8;x=.5-.25*k;y=.68-.4*k;}
   else if(t>=2&&t<2.4){const k=(t-2)/.4;x=.25+.3*k;y=.28+.4*k;}
   else if(t>=2.4&&t<3){const k=(t-2.4)/.6;x=.55+.2*k;y=.68-.5*k;}
   else if(t>=3){x=.75;y=.18;}
   SL.emit('live-pose',{t:performance.now()/1000,lm:lm(x,y),metrics:{le:150,re:100},width:1000,height:1000});await delay(67);
  }
  await delay(300);
 }
 await SL.session.stop();clearInterval(__paint);
 }''')
 data=page.evaluate('''()=>({shots:SL.state.shots,media:[...__store.values()].map(x=>({id:x.id,size:x.blob.size,clip:x.analysis.clipWindow,duration:x.analysis.duration,samples:x.analysis.samples.length})),status:document.getElementById('practiceStatus').textContent})''')
 print(json.dumps(data,indent=2)[:2500])
 results.append({'name':'two synthetic swings are saved as two independent records','passed':len(data['shots'])==2 and len(data['media'])==2})
 results.append({'name':'recorded blobs have bytes and valid clip windows','passed':all(m['size']>1000 and m['clip']['end']>m['clip']['start']>=0 and m['clip']['end']<=m['duration'] for m in data['media'])})
 results.append({'name':'live page accumulates a card for each swing','passed':page.locator('.practice-shot').count()==2})
 results.append({'name':'trial swings are not claimed as verified impact','passed':all(s['autoSegment']['verification']=='unconfirmed-swing' for s in data['shots'])})
 if data['shots']:
  page.evaluate('''async()=>{const item=[...__store.values()][0];window.__clip=item.analysis.clipWindow;location.hash='video';await new Promise(r=>setTimeout(r,200));document.getElementById('autoOnLoad').checked=false;await SL.review.load(item.blob,{analysis:item.analysis,source:'camera',duration:item.analysis.duration});}''')
  page.wait_for_timeout(200)
  results.append({'name':'complete recording blob can be decoded on replay','passed':page.evaluate('SL.review.getMeta().loaded && SL.review.getMeta().width>0')})
  results.append({'name':'replay restores the automatic segment bounds','passed':page.evaluate('Math.abs(SL.review.getInfo().clipWindow.start-__clip.start)<0.001')})
  page.evaluate("location.hash='capture'");page.wait_for_timeout(200);page.set_viewport_size({'width':390,'height':844});page.locator('.practice-panel').scroll_into_view_if_needed();page.screenshot(path=str(out/'session-synthetic-mobile.png'))
 results.append({'name':'continuous workflow no runtime errors','passed':not errors,'details':errors})
 page.evaluate('__stream.getTracks().forEach(t=>t.stop())');b.close()
(out/'session-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2))
