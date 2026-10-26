const assert=require('node:assert/strict');
const M=require('../source/js/motion-core.js');
let tests=[];
function test(name,fn){try{fn();tests.push({name,passed:true});console.log('PASS',name)}catch(e){tests.push({name,passed:false,error:e.message});console.error('FAIL',name,e.message)}}
function frame(t,x=.5,y=.68){const lm=Array.from({length:33},()=>({x:.5,y:.5,visibility:.95}));lm[11]={x:.4,y:.30,visibility:.99};lm[12]={x:.6,y:.3,visibility:.99};lm[23]={x:.45,y:.55,visibility:.99};lm[24]={x:.55,y:.55,visibility:.99};lm[15]={x:x-.01,y,visibility:.99};lm[16]={x:x+.01,y,visibility:.99};return {t,lm,width:1000,height:1000};}
function sequence(start=0){let a=[];for(let i=0;i<90;i++){const t=i/15;let x=.5,y=.68;if(t>=1.2&&t<2){const k=(t-1.2)/.8;x=.5-.25*k;y=.68-.4*k;}else if(t>=2&&t<2.4){const k=(t-2)/.4;x=.25+.3*k;y=.28+.4*k;}else if(t>=2.4&&t<3){const k=(t-2.4)/.6;x=.55+.2*k;y=.68-.5*k;}else if(t>=3){x=.75;y=.18;}a.push(frame(start+t,x,y));}return a;}
test('quiet address does not produce a shot',()=>{const d=new M.SwingDetector();for(let i=0;i<70;i++)assert.notEqual(d.feed(frame(i/15)).event?.type,'swing');});
test('setup backswing downswing and finish produce one candidate',()=>{const d=new M.SwingDetector();const events=sequence().map(s=>d.feed(s).event).filter(e=>e?.type==='swing');assert.equal(events.length,1);assert.equal(events[0].verification,'unconfirmed-swing');});
test('two separated swings produce two segments',()=>{const out=M.splitSwings([...sequence(),...sequence(7)],1000,1000);assert.equal(out.length,2);});
test('tracking loss never invents a shot',()=>{const d=new M.SwingDetector();const a=sequence().filter(s=>s.t<2);for(const s of a)d.feed(s);const e=d.feed({t:3,lm:null,width:1000,height:1000});assert.notEqual(e.event?.type,'swing');assert.equal(e.state,'waiting');});
test('slow motion time converted back to source timeline',()=>{const a=sequence().map(s=>({...s,t:s.t*4}));const r=M.splitSwings(a,1000,1000,4);assert.equal(r.length,1);assert.ok(r[0].end>12);});
const cfg={width:1000,height:500,reference:[{x:.1,y:.8},{x:.6,y:.8}],lengthCm:100,slowRatio:1,confirmed:true,sideOn:true,timeChecked:true};
const v=35,ang=15*Math.PI/180;
const points=Array.from({length:6},(_,i)=>{const t=i*.004;return {t,x:.2+v*Math.cos(ang)*t/.002/1000,y:.6-(v*Math.sin(ang)*t-.5*9.80665*t*t)/.002/500};});
test('pixel calibration and aspect ratio recover synthetic launch',()=>{const e=M.estimateLaunch(points,cfg);assert.equal(e.ok,true);assert.ok(Math.abs(e.speedMps-35)<1e-7);assert.ok(Math.abs(e.launchDeg-15)<1e-7);});
test('requires user verification of the tracked object',()=>assert.equal(M.estimateLaunch(points,{...cfg,confirmed:false}).code,'CONFIRM_BALL'));
test('rejects unverified side-on geometry',()=>assert.equal(M.estimateLaunch(points,{...cfg,sideOn:false}).code,'CHECK_GEOMETRY_TIME'));
test('rejects missing calibration',()=>assert.equal(M.estimateLaunch(points,{...cfg,reference:[]}).code,'CALIBRATION'));
test('rejects short or reversed reference',()=>assert.equal(M.estimateLaunch(points,{...cfg,reference:cfg.reference.slice().reverse()}).code,'REFERENCE_DIRECTION'));
test('requires four independent timestamps',()=>assert.equal(M.estimateLaunch(points.slice(0,3),cfg).code,'TOO_FEW_POINTS'));
test('duplicate timestamps do not multiply evidence',()=>assert.equal(M.estimateLaunch(points.map(p=>({...p,t:0})),cfg).code,'TOO_FEW_POINTS'));
test('slow playback ratio recovers true initial velocity',()=>{const e=M.estimateLaunch(points.map(p=>({...p,t:p.t*8})),{...cfg,slowRatio:8});assert.equal(e.ok,true);assert.ok(Math.abs(e.speedMps-35)<1e-7);});
test('unstable trajectory is rejected',()=>{const a=points.map((p,i)=>({...p,x:p.x+(i%2?.07:-.07)}));assert.equal(M.estimateLaunch(a,cfg).ok,false)});
test('no drag matches analytic projectile range',()=>{const r=M.simulate(40,30,{cd:0});assert.ok(Math.abs(r.rangeM-1600*Math.sin(Math.PI/3)/9.80665)<.001);});
test('drag scenario has no fabricated lateral curvature',()=>{const r=M.simulate(40,30);assert.ok(r.rangeM<M.simulate(40,30,{cd:0}).rangeM);assert.ok(r.path.every(p=>p.y===0));assert.ok(r.path.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.z)));assert.equal(r.path.at(-1).z,0);});
test('simulation leaves actual spin unmeasured',()=>{assert.equal(M.simulate(30,20).assumptions.spin,'not-measured; lift omitted');assert.equal(M.simulate(NaN,20),null)});
require('node:fs').writeFileSync(__dirname+'/core-results.json',JSON.stringify(tests,null,2));if(tests.some(x=>!x.passed))process.exitCode=1;
