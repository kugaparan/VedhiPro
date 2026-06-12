/* VedhiPro — Regenerative Rankine Cycle Analyzer (IAPWS-IF97)
   Ported from the regen-power-plotter thermodynamics module.
   Units: P in MPa, T in K, h kJ/kg, s kJ/kg·K, v m³/kg. */
(function(){
const VP=window.VP;
const num=VP.num, fmt=VP.fmt;
const R=0.461526;

const REGION1=[
 [0,-2,0.14632971213167],[0,-1,-0.84548187169114],[0,0,-3.756360367204],
 [0,1,3.3855169168385],[0,2,-0.95791963387872],[0,3,0.15772038513228],
 [0,4,-0.016616417199501],[0,5,0.00081214629983568],[1,-9,0.00028319080123804],
 [1,-7,-0.00060706301565874],[1,-1,-0.018990068218419],[1,0,-0.032529748770505],
 [1,1,-0.021841717175414],[1,3,-0.00005283835796993],[2,-3,-0.00047184321073267],
 [2,0,-0.00030001780793026],[2,1,0.000047661393906987],[2,3,-0.0000044141845330846],
 [2,17,-7.2694996297594e-16],[3,-4,-0.000031679644845054],[3,0,-0.0000028270797985312],
 [3,6,-8.5205128120103e-10],[4,-5,-0.0000022425281908],[4,-2,-6.5171222895601e-7],
 [4,10,-1.4341729937924e-13],[5,-8,-0.00000040516996860117],[8,-11,-0.0000000012734301741641],
 [8,-6,-1.7424871230634e-10],[21,-29,-6.8762131295531e-19],[23,-31,1.4478307828521e-20],
 [29,-38,2.6335781662795e-23],[30,-39,-1.1947622640071e-23],[31,-40,1.8228094581404e-24],
 [32,-41,-9.3537087292458e-26]];
function region1(P,T){
  const pi=P/16.53, tau=1386/T; let g=0,gp=0,gt=0;
  for(const [I,J,n] of REGION1){
    g+=n*Math.pow(7.1-pi,I)*Math.pow(tau-1.222,J);
    gp+=-n*I*Math.pow(7.1-pi,I-1)*Math.pow(tau-1.222,J);
    gt+=n*Math.pow(7.1-pi,I)*J*Math.pow(tau-1.222,J-1);
  }
  return {v:(R*T*pi*gp)/(P*1000), h:R*T*tau*gt, s:R*(tau*gt-g)};
}
const REGION2_IDEAL=[
 [0,-9.6927686500217],[1,10.086655968018],[-5,-0.005608791128302],
 [-4,0.071452738081455],[-3,-0.40710498223928],[-2,1.4240819171444],
 [-1,-4.383951131945],[2,-0.28408632460772],[3,0.021268463753307]];
const REGION2_RES=[
 [1,0,-0.0017731742473213],[1,1,-0.017834862292358],[1,2,-0.045996013696365],
 [1,3,-0.057581259083432],[1,6,-0.05032527872793],[2,1,-0.000033032641670203],
 [2,2,-0.00018948987516315],[2,4,-0.0039392777243355],[2,7,-0.043797295650573],
 [2,36,-0.000026674547914087],[3,0,0.000000020481737692309],[3,1,0.00000043870667284435],
 [3,3,-0.00003227767723857],[3,6,-0.0015033924542148],[3,35,-0.040668253562649],
 [4,1,-7.8847309559367e-10],[4,2,0.000000012790717852285],[4,3,0.00000048225372718507],
 [5,7,0.0000022922076337661],[6,3,-1.6714766451061e-11],[6,16,-0.0021171472321355],
 [6,35,-23.895741934104],[7,0,-5.905956432427e-18],[7,11,-0.0000012621808899101],
 [7,25,-0.038946842435739],[8,8,0.000000000011256211360459],[8,36,-8.2311340897998],
 [9,13,0.000000019809712802088],[10,4,1.0406965210174e-19],[10,10,-1.0234747095929e-13],
 [10,14,-0.0000000010018179379511],[16,29,-8.0882908646985e-11],[16,50,0.10693031879409],
 [18,57,-0.33662250574171],[20,20,8.9185845355421e-25],[20,35,0.00000000000030629316876232],
 [20,48,-0.0000042002467698208],[21,21,-5.9056029685639e-26],[22,53,0.0000037826947613457],
 [23,39,-1.2768608934681e-15],[24,26,7.3087610595061e-29],[24,40,5.5414715350778e-17],
 [24,58,-0.0000009436970724121]];
function region2(P,T){
  const pi=P, tau=540/T;
  let go=Math.log(pi), got=0;
  for(const [J,n] of REGION2_IDEAL){ go+=n*Math.pow(tau,J); got+=n*J*Math.pow(tau,J-1); }
  const gop=1/pi;
  let gr=0,grp=0,grt=0;
  for(const [I,J,n] of REGION2_RES){
    gr+=n*Math.pow(pi,I)*Math.pow(tau-0.5,J);
    grp+=n*I*Math.pow(pi,I-1)*Math.pow(tau-0.5,J);
    grt+=n*Math.pow(pi,I)*J*Math.pow(tau-0.5,J-1);
  }
  return {v:(R*T*pi*(gop+grp))/(P*1000), h:R*T*tau*(got+grt), s:R*(tau*(got+grt)-(go+gr))};
}
const SAT=[1167.0521452767,-724213.16703206,-17.073846940092,12020.82470247,
 -3232555.0322333,14.91510861353,-4823.2657361591,405113.40542057,-0.23855557567849,650.17534844798];
function satT(P){
  const [n1,n2,n3,n4,n5,n6,n7,n8,n9,n10]=SAT;
  const beta=Math.pow(P,0.25);
  const E=beta*beta+n3*beta+n6, F=n1*beta*beta+n4*beta+n7, G=n2*beta*beta+n5*beta+n8;
  const D=(2*G)/(-F-Math.sqrt(F*F-4*E*G));
  return (n10+D-Math.sqrt((n10+D)*(n10+D)-4*(n9+n10*D)))/2;
}
function satLiq(P){return region1(P,satT(P));}
function satVap(P){return region2(P,satT(P));}
function isenExp(Pin,Tin,Pout){
  const sIn=region2(Pin,Tin).s, liq=satLiq(Pout), vap=satVap(Pout);
  if(sIn>=vap.s){
    let lo=satT(Pout), hi=1073.15;
    for(let i=0;i<80;i++){const mid=(lo+hi)/2; if(region2(Pout,mid).s<sIn)lo=mid; else hi=mid;}
    return region2(Pout,(lo+hi)/2).h;
  }
  const x=(sIn-liq.s)/(vap.s-liq.s);
  return liq.h+x*(vap.h-liq.h);
}
function regenCycle(Pb,Tb,Pc,Pe){
  const inlet=region2(Pb,Tb);
  const hExtract=isenExp(Pb,Tb,Pe);
  const hExhaust=isenExp(Pb,Tb,Pc);
  const cond=satLiq(Pc);
  const h2=cond.h+cond.v*(Pe-Pc)*1000;
  const fw=satLiq(Pe);
  const h4=fw.h+fw.v*(Pb-Pe)*1000;
  const y=(fw.h-h2)/(hExtract-h2);
  const wT=(inlet.h-hExtract)+(1-y)*(hExtract-hExhaust);
  const wP=(1-y)*(h2-cond.h)+(h4-fw.h);
  const qIn=inlet.h-h4;
  const qOut=(1-y)*(hExhaust-cond.h);
  return {y, eta:(wT-wP)/qIn, wT, wP, qIn, qOut, wNet:wT-wP, hInlet:inlet.h, hExtract, hExhaust};
}
VP._regenCycle=regenCycle;
VP.iapws={region1:region1,region2:region2,satT:satT,satLiq:satLiq,satVap:satVap};

/* ---- small canvas plot with dual y-axis ---- */
const C={grid:'#1b2638',axis:'#9aa7bd',text:'#c7d3e6',L:'#4f8dff',Rr:'#2de2c0'};
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w*2;c.height=h*2;c.style.width=w+'px';c.style.height=h+'px';c.style.maxWidth='100%';c.style.background='#0b1120';c.style.border='1px solid rgba(255,255,255,.10)';c.style.borderRadius='10px';return c;}
function plot(host,cfg){
  host.innerHTML=''; const cv=mkCanvas(560,330); host.appendChild(cv);
  const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,padL=110,padR=110,padB=84,padT=30;
  ctx.clearRect(0,0,W,H);
  let xr=[Math.min(...cfg.x),Math.max(...cfg.x)]; if(xr[0]===xr[1])xr[1]=xr[0]+1;
  const Ls=cfg.series.filter(s=>s.axis!=='R'), Rs=cfg.series.filter(s=>s.axis==='R');
  const rng=ss=>{let lo=Infinity,hi=-Infinity;ss.forEach(s=>s.y.forEach(v=>{lo=Math.min(lo,v);hi=Math.max(hi,v);}));if(lo===hi){lo-=Math.abs(lo)*0.1+1e-6;hi+=Math.abs(hi)*0.1+1e-6;}const p=(hi-lo)*0.1;return [lo-p,hi+p];};
  const Lr=rng(Ls), Rr=Rs.length?rng(Rs):[0,1];
  const sx=x=>padL+(x-xr[0])/(xr[1]-xr[0])*(W-padL-padR);
  const syL=y=>H-padB-(y-Lr[0])/(Lr[1]-Lr[0])*(H-padB-padT);
  const syR=y=>H-padB-(y-Rr[0])/(Rr[1]-Rr[0])*(H-padB-padT);
  ctx.strokeStyle=C.grid;ctx.lineWidth=2;ctx.beginPath();
  for(let i=0;i<=8;i++){const gx=padL+(W-padL-padR)*i/8;ctx.moveTo(gx,padT);ctx.lineTo(gx,H-padB);
    const gy=padT+(H-padB-padT)*i/8;ctx.moveTo(padL,gy);ctx.lineTo(W-padR,gy);}
  ctx.stroke();
  ctx.strokeStyle=C.axis;ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(padL,padT);ctx.lineTo(padL,H-padB);ctx.lineTo(W-padR,H-padB);ctx.moveTo(W-padR,padT);ctx.lineTo(W-padR,H-padB);ctx.stroke();
  ctx.fillStyle=C.text;ctx.font='22px sans-serif';
  // ticks
  for(let i=0;i<=4;i++){
    const xv=xr[0]+(xr[1]-xr[0])*i/4; ctx.fillStyle=C.text;ctx.fillText(xv.toFixed(2),sx(xv)-22,H-padB+30);
    const lv=Lr[0]+(Lr[1]-Lr[0])*i/4; ctx.fillStyle=C.L;ctx.fillText((cfg.Lfmt?cfg.Lfmt(lv):lv.toFixed(2)),8,syL(lv)+8);
    const rv=Rr[0]+(Rr[1]-Rr[0])*i/4; ctx.fillStyle=C.Rr;ctx.fillText((cfg.Rfmt?cfg.Rfmt(rv):rv.toFixed(3)),W-padR+12,syR(rv)+8);
  }
  ctx.fillStyle=C.text;ctx.font='24px sans-serif';ctx.fillText(cfg.xlabel,W/2-90,H-18);
  ctx.fillStyle=C.L;ctx.save();ctx.translate(28,H/2+70);ctx.rotate(-Math.PI/2);ctx.fillText(cfg.Llabel,0,0);ctx.restore();
  ctx.fillStyle=C.Rr;ctx.save();ctx.translate(W-26,H/2+60);ctx.rotate(-Math.PI/2);ctx.fillText(cfg.Rlabel,0,0);ctx.restore();
  cfg.series.forEach(s=>{
    const sy=s.axis==='R'?syR:syL; ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=3;ctx.beginPath();
    cfg.x.forEach((xx,i)=>{const X=sx(xx),Y=sy(s.y[i]);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.stroke();
    cfg.x.forEach((xx,i)=>{ctx.beginPath();ctx.arc(sx(xx),sy(s.y[i]),5,0,7);ctx.fill();});
  });
}

function pageHead(t,p){return `<div class="page-head"><h1>${t}</h1><p>${p}</p></div>`;}

/* ---- Reheat cycle + T–s helpers ---- */
function tAtPs(P,s){ // temperature (K) at pressure P (MPa) and entropy s
  const vap=satVap(P);
  if(s>=vap.s){let lo=satT(P),hi=1273.15;for(let i=0;i<80;i++){const m=(lo+hi)/2;if(region2(P,m).s<s)lo=m;else hi=m;}return (lo+hi)/2;}
  return satT(P);
}
function reheatCycle(Pb,Tb,Prh,Trh,Pc,etaT){
  const s1=region2(Pb,Tb);
  const h2s=isenExp(Pb,Tb,Prh), h2=s1.h-etaT*(s1.h-h2s);
  const s3=region2(Prh,Trh);
  const h4s=isenExp(Prh,Trh,Pc), h4=s3.h-etaT*(s3.h-h4s);
  const cond=satLiq(Pc), h5=cond.h, h6=h5+cond.v*(Pb-Pc)*1000;
  const wT=(s1.h-h2)+(s3.h-h4), wP=h6-h5, qIn=(s1.h-h6)+(s3.h-h2), qOut=h4-h5;
  const lq=satLiq(Pc), vp=satVap(Pc), x4=(h4-lq.h)/(vp.h-lq.h);
  return {s1,h2,h2s,s3,h4,h4s,h5,h6,wT,wP,qIn,qOut,eta:(wT-wP)/qIn,x4,cond};
}
function tsPlot(host,cycle,dome){
  host.innerHTML='';const c=document.createElement('canvas');c.width=720;c.height=460;
  c.style.width='100%';c.style.maxWidth='580px';c.style.background='#0b1120';
  c.style.border='1px solid rgba(255,255,255,.10)';c.style.borderRadius='10px';host.appendChild(c);
  const ctx=c.getContext('2d'),W=c.width,H=c.height,pl=58,pr=20,pb=44,pt=18;
  const aS=cycle.map(p=>p[0]).concat(dome.map(p=>p[0])), aT=cycle.map(p=>p[1]).concat(dome.map(p=>p[1]));
  let smn=Math.min(...aS),smx=Math.max(...aS),tmn=Math.min(...aT),tmx=Math.max(...aT);
  smn-=0.2;smx+=0.3;tmn=Math.max(0,tmn-20);tmx+=25;
  const sx=s=>pl+(s-smn)/(smx-smn)*(W-pl-pr), sy=t=>H-pb-(t-tmn)/(tmx-tmn)*(H-pb-pt);
  ctx.strokeStyle='#1b2638';ctx.lineWidth=1;ctx.fillStyle='#9aa7bd';ctx.font='11px sans-serif';
  for(let i=0;i<=6;i++){const gx=pl+(W-pl-pr)*i/6;ctx.beginPath();ctx.moveTo(gx,pt);ctx.lineTo(gx,H-pb);ctx.stroke();ctx.fillText((smn+(smx-smn)*i/6).toFixed(1),gx-12,H-pb+14);}
  for(let i=0;i<=5;i++){const gy=pt+(H-pb-pt)*i/5;ctx.beginPath();ctx.moveTo(pl,gy);ctx.lineTo(W-pr,gy);ctx.stroke();ctx.fillText((tmx-(tmx-tmn)*i/5).toFixed(0),6,gy+4);}
  ctx.strokeStyle='#3a4a63';ctx.lineWidth=2;ctx.beginPath();dome.forEach((p,i)=>{const X=sx(p[0]),Y=sy(p[1]);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.stroke();
  ctx.strokeStyle='#2de2c0';ctx.lineWidth=2.5;ctx.beginPath();cycle.forEach((p,i)=>{const X=sx(p[0]),Y=sy(p[1]);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.closePath();ctx.stroke();
  ctx.fillStyle='#ffc24b';cycle.forEach(p=>{ctx.beginPath();ctx.arc(sx(p[0]),sy(p[1]),4,0,7);ctx.fill();});
  ctx.fillStyle='#eef2f8';ctx.font='12px sans-serif';cycle.forEach(p=>{if(p[2])ctx.fillText(p[2],sx(p[0])+6,sy(p[1])-5);});
  ctx.fillStyle='#c7d3e6';ctx.fillText('Entropy s (kJ/kg·K)',W/2-60,H-6);
  ctx.save();ctx.translate(14,H/2+40);ctx.rotate(-Math.PI/2);ctx.fillText('Temperature (°C)',0,0);ctx.restore();
}

/* =========================================================
   REGENERATIVE RANKINE CYCLE ANALYZER
========================================================= */
VP.tools.push({id:'rankine',title:'Rankine Regen Plant',icon:'🏭',group:'Energy',
 desc:'Regenerative Rankine cycle: power, efficiency & sweep plot',
 render(el){
  el.innerHTML = pageHead('Rankine Cycle Analyzer','Regenerative cycle with an extraction-pressure sweep, plus a reheat cycle with a T–s diagram. Properties from IAPWS-IF97.')
   + `<div class="tabs"><div class="tab active" data-t="regen">Regenerative + sweep</div><div class="tab" data-t="reheat">Reheat + T–s</div></div>`
   + `<div id="rkRegenWrap"><div class="card"><h2>Cycle parameters</h2>
       <div class="grid3">
         <div class="field"><label>Boiler pressure <span class="unit">(MPa)</span></label><input id="rk_Pb" type="number" step="any" value="3.0"></div>
         <div class="field"><label>Turbine-inlet temp <span class="unit">(°C)</span></label><input id="rk_Tb" type="number" step="any" value="350"></div>
         <div class="field"><label>Condenser pressure <span class="unit">(MPa)</span></label><input id="rk_Pc" type="number" step="any" value="0.02"></div>
         <div class="field"><label>Extraction P min <span class="unit">(MPa)</span></label><input id="rk_Pmin" type="number" step="any" value="0.5"></div>
         <div class="field"><label>Extraction P max <span class="unit">(MPa)</span></label><input id="rk_Pmax" type="number" step="any" value="1.0"></div>
         <div class="field"><label>Number of points</label><input id="rk_N" type="number" step="1" value="10"></div>
       </div>
       <div class="btn-row"><button class="btn" id="rk_go">Analyze cycle</button></div>
     </div>
     <div id="rk_out"></div></div>
     <div id="rkReheatWrap" style="display:none"><div class="card"><h2>Reheat cycle parameters</h2>
       <div class="grid3">
         <div class="field"><label>Boiler pressure <span class="unit">(MPa)</span></label><input id="rh_Pb" type="number" step="any" value="8.0"></div>
         <div class="field"><label>HP inlet temp <span class="unit">(°C)</span></label><input id="rh_Tb" type="number" step="any" value="480"></div>
         <div class="field"><label>Reheat pressure <span class="unit">(MPa)</span></label><input id="rh_Prh" type="number" step="any" value="1.0"></div>
         <div class="field"><label>Reheat temp <span class="unit">(°C)</span></label><input id="rh_Trh" type="number" step="any" value="480"></div>
         <div class="field"><label>Condenser pressure <span class="unit">(MPa)</span></label><input id="rh_Pc" type="number" step="any" value="0.01"></div>
         <div class="field"><label>Turbine efficiency <span class="unit">(%)</span></label><input id="rh_eta" type="number" step="any" value="100"></div>
       </div>
       <div class="btn-row"><button class="btn" id="rh_go">Analyze reheat cycle</button></div>
     </div><div id="rh_out"></div></div>`;
  const tabsR=el.querySelectorAll('.tab');
  tabsR.forEach(t=>t.onclick=()=>{tabsR.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    el.querySelector('#rkRegenWrap').style.display=t.dataset.t==='regen'?'':'none';
    el.querySelector('#rkReheatWrap').style.display=t.dataset.t==='reheat'?'':'none';});
  const out=el.querySelector('#rk_out');
  function run(){
    const Pb=num(el.querySelector('#rk_Pb').value), TbC=num(el.querySelector('#rk_Tb').value),
          Pc=num(el.querySelector('#rk_Pc').value), Pmin=num(el.querySelector('#rk_Pmin').value),
          Pmax=num(el.querySelector('#rk_Pmax').value); let N=Math.round(num(el.querySelector('#rk_N').value));
    if(!(Pb>Pc&&Pmax>=Pmin&&Pmin>Pc&&Pb>Pmax&&N>=2)){out.innerHTML='<div class="note warnbox">Require condenser P &lt; extraction P-range &lt; boiler P, and ≥ 2 points.</div>';return;}
    if(N>200)N=200;
    const Tb=TbC+273.15;
    const xs=[],ys=[],etas=[],rows=[]; let best=null;
    const step=(Pmax-Pmin)/(N-1);
    for(let i=0;i<N;i++){
      const Pe=Pmin+i*step;
      let r; try{r=regenCycle(Pb,Tb,Pc,Pe);}catch(e){continue;}
      xs.push(Pe);ys.push(r.y);etas.push(r.eta*100);
      rows.push({Pe,y:r.y,eta:r.eta,wNet:r.wNet});
      if(!best||r.eta>best.eta)best={Pe,...r};
    }
    if(!xs.length){out.innerHTML='<div class="note warnbox">No valid points — check inputs.</div>';return;}
    const s0=rows[0];
    let h=`<div class="card"><h2>Sample point — extraction at ${fmt(s0.Pe,3)} MPa</h2>
      <div class="res-grid">
        <div class="res"><div class="rl">Extraction fraction y</div><div class="rv">${fmt(s0.y,4)}</div></div>
        <div class="res"><div class="rl">Thermal efficiency</div><div class="rv">${fmt(s0.eta*100,2)}<span class="ru">%</span></div></div>
        <div class="res"><div class="rl">Turbine work</div><div class="rv">${fmt(regenCycle(Pb,Tb,Pc,s0.Pe).wT,1)}<span class="ru">kJ/kg</span></div></div>
        <div class="res"><div class="rl">Pump work</div><div class="rv">${fmt(regenCycle(Pb,Tb,Pc,s0.Pe).wP,2)}<span class="ru">kJ/kg</span></div></div>
        <div class="res"><div class="rl">Net work</div><div class="rv">${fmt(s0.wNet,1)}<span class="ru">kJ/kg</span></div></div>
        <div class="res"><div class="rl">Heat input</div><div class="rv">${fmt(regenCycle(Pb,Tb,Pc,s0.Pe).qIn,1)}<span class="ru">kJ/kg</span></div></div>
      </div></div>`;
    h+=`<div class="card"><h2>All-in-one sweep</h2><div class="sub">Steam-extraction fraction (green, right axis) &amp; thermal efficiency (blue, left axis) vs extraction pressure.</div><div id="rk_chart"></div>
      <div class="note">Optimum in range: <strong>${fmt(best.Pe,3)} MPa</strong> → max efficiency <strong>${fmt(best.eta*100,2)}%</strong> (y = ${fmt(best.y,4)}, net work ${fmt(best.wNet,1)} kJ/kg).</div></div>`;
    h+=`<div class="card"><h2>Results table</h2><div class="table-wrap"><table class="data"><thead><tr><th>P_extr (MPa)</th><th>Extraction y</th><th>Efficiency (%)</th><th>Net work (kJ/kg)</th></tr></thead><tbody>`;
    rows.forEach(r=>{h+=`<tr><td>${fmt(r.Pe,3)}</td><td>${fmt(r.y,4)}</td><td>${fmt(r.eta*100,2)}</td><td>${fmt(r.wNet,1)}</td></tr>`;});
    h+=`</tbody></table></div></div>`;
    out.innerHTML=h;
    plot(out.querySelector('#rk_chart'),{
      x:xs, xlabel:'Extraction pressure (MPa)',
      Llabel:'Thermal efficiency (%)', Rlabel:'Extraction fraction',
      Lfmt:v=>v.toFixed(1), Rfmt:v=>v.toFixed(3),
      series:[{y:etas,color:C.L,axis:'L'},{y:ys,color:C.Rr,axis:'R'}]
    });
  }
  el.querySelector('#rk_go').onclick=run; run();

  const rout=el.querySelector('#rh_out');
  function runReheat(){
    const Pb=num(el.querySelector('#rh_Pb').value), Tb=num(el.querySelector('#rh_Tb').value)+273.15,
          Prh=num(el.querySelector('#rh_Prh').value), Trh=num(el.querySelector('#rh_Trh').value)+273.15,
          Pc=num(el.querySelector('#rh_Pc').value), etaT=num(el.querySelector('#rh_eta').value)/100;
    if(!(Pb>Prh&&Prh>Pc&&Pc>0)){rout.innerHTML='<div class="note warnbox">Require boiler P &gt; reheat P &gt; condenser P &gt; 0.</div>';return;}
    let r; try{r=reheatCycle(Pb,Tb,Prh,Trh,Pc,etaT);}catch(e){rout.innerHTML='<div class="note warnbox">Could not evaluate — check inputs are within the IAPWS range (inlets superheated).</div>';return;}
    const T2=tAtPs(Prh,r.s1.s)-273.15, T4=tAtPs(Pc,r.s3.s)-273.15, Tcd=satT(Pc)-273.15;
    rout.innerHTML=`<div class="card"><h2>Reheat cycle results</h2><div class="res-grid">
      <div class="res"><div class="rl">Thermal efficiency</div><div class="rv">${fmt(r.eta*100,2)}<span class="ru">%</span></div></div>
      <div class="res"><div class="rl">Net work</div><div class="rv">${fmt(r.wT-r.wP,1)}<span class="ru">kJ/kg</span></div></div>
      <div class="res"><div class="rl">Turbine work</div><div class="rv">${fmt(r.wT,1)}<span class="ru">kJ/kg</span></div></div>
      <div class="res"><div class="rl">Pump work</div><div class="rv">${fmt(r.wP,2)}<span class="ru">kJ/kg</span></div></div>
      <div class="res"><div class="rl">Heat input</div><div class="rv">${fmt(r.qIn,1)}<span class="ru">kJ/kg</span></div></div>
      <div class="res"><div class="rl">LP exhaust quality x₄</div><div class="rv">${fmt(Math.min(1,r.x4),4)}</div></div>
      </div>
      <div class="note">Reheat raises the mean heat-addition temperature and keeps the turbine exhaust drier (higher x₄) than a simple cycle. States: 1 HP inlet · 2 HP exit · 3 reheat exit · 4 LP exit · 5 condensate · 6 pump exit.</div>
      <div style="margin-top:12px"><div class="small">T–s diagram (green = cycle, grey = saturation dome)</div><div id="rh_ts"></div></div></div>`;
    const dome=[],Ts=[]; for(let T=5;T<=370;T+=10)Ts.push(T);
    Ts.forEach(T=>{const z=VP.satByTemp(T);dome.push([z[7],T]);});
    for(let i=Ts.length-1;i>=0;i--){const z=VP.satByTemp(Ts[i]);dome.push([z[8],Ts[i]]);}
    const cyc=[[r.s1.s,Tb-273.15,'1'],[r.s1.s,T2,'2'],[r.s3.s,Trh-273.15,'3'],[r.s3.s,T4,'4'],[r.cond.s,Tcd,'5'],[r.cond.s,Tcd,'6']];
    tsPlot(el.querySelector('#rh_ts'),cyc,dome);
  }
  el.querySelector('#rh_go').onclick=runReheat; runReheat();
 }});

})();
