/* VedhiPro — Binary Distillation Column Designer */
(function(){
const VP=window.VP;
const num=VP.num, fmt=VP.fmt;

function pageHead(t,p){return `<div class="page-head"><h1>${t}</h1><p>${p}</p></div>`;}
function card(title,sub,inner){return `<div class="card"><h2>${title}</h2>${sub?`<div class="sub">${sub}</div>`:''}<div>${inner||''}</div></div>`;}
function buildTabs(el,headT,headP,tabs){
  let h=pageHead(headT,headP)+'<div class="tabs">';
  tabs.forEach((t,i)=>h+=`<div class="tab ${i===0?'active':''}" data-k="${t.key}">${t.label}</div>`);
  h+='</div>';
  tabs.forEach((t,i)=>h+=`<div class="tabcard" data-k="${t.key}" style="${i===0?'':'display:none'}">${card(t.title,t.sub,`<div id="box_${t.key}"></div>`)}</div>`);
  el.innerHTML=h;
  const bars=el.querySelectorAll('.tab');
  bars.forEach(b=>b.onclick=()=>{bars.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    el.querySelectorAll('.tabcard').forEach(c=>c.style.display=c.dataset.k===b.dataset.k?'':'none');});
  tabs.forEach(t=>t.setup(el.querySelector('#box_'+t.key)));
}
const opts=arr=>arr.map(o=>({v:o[0],t:o[1]}));

/* ---------- VLE helpers ---------- */
const COL={grid:'#1b2638',axis:'#9aa7bd',text:'#c7d3e6',eq:'#2de2c0',op:'#4f8dff',op2:'#ffc24b',q:'#ff6b81',diag:'#56657d',stair:'#eef2f8'};
function eqY(x,a){return a*x/(1+(a-1)*x);}              // equilibrium y from x (const α)
function eqX(y,a){return y/(a-(a-1)*y);}                // inverse

/* Antoine: log10(P mmHg) = A - B/(C+T°C) */
const ANT={
  benzene:[6.90565,1211.033,220.790], toluene:[6.95464,1344.800,219.482],
  methanol:[8.08097,1582.271,239.726], water:[8.07131,1730.630,233.426],
  ethanol:[8.20417,1642.89,230.300]
};
function psat(c,T){const a=ANT[c];return Math.pow(10,a[0]-a[1]/(a[2]+T));} // mmHg
const SYSTEMS={
  'btol':{n:'Benzene–Toluene (ideal)',a:'benzene',b:'toluene',ideal:true},
  'mw':{n:'Methanol–Water (approx)',a:'methanol',b:'water',ideal:true},
  'ew':{n:'Ethanol–Water (approx, azeotrope!)',a:'ethanol',b:'water',ideal:true}
};
function bubbleT(c1,c2,x1,P){ // solve T so x1*P1+x2*P2=P (mmHg); returns {T,y1}
  let lo=-20,hi=250;
  for(let i=0;i<80;i++){const T=(lo+hi)/2;const Pt=x1*psat(c1,T)+(1-x1)*psat(c2,T);if(Pt<P)lo=T;else hi=T;}
  const T=(lo+hi)/2;const y1=x1*psat(c1,T)/P;return {T,y1};
}

/* ---------- canvas plot ---------- */
function mkCanvas(w,h){const c=document.createElement('canvas');c.width=w*2;c.height=h*2;c.style.width=w+'px';c.style.height=h+'px';c.style.maxWidth='100%';c.style.background='#0b1120';c.style.border='1px solid rgba(255,255,255,.10)';c.style.borderRadius='10px';return c;}
function axes(ctx,W,H,pad,xr,yr,xl,yl){
  ctx.clearRect(0,0,W,H);
  ctx.strokeStyle=COL.grid;ctx.fillStyle=COL.axis;ctx.lineWidth=2;ctx.font='22px sans-serif';
  const sx=x=>pad+ (x-xr[0])/(xr[1]-xr[0])*(W-pad-26);
  const sy=y=>H-pad-(y-yr[0])/(yr[1]-yr[0])*(H-pad-26);
  ctx.beginPath();
  for(let i=0;i<=10;i++){const gx=sx(xr[0]+(xr[1]-xr[0])*i/10);ctx.moveTo(gx,sy(yr[0]));ctx.lineTo(gx,sy(yr[1]));
    const gy=sy(yr[0]+(yr[1]-yr[0])*i/10);ctx.moveTo(sx(xr[0]),gy);ctx.lineTo(sx(xr[1]),gy);}
  ctx.stroke();
  ctx.strokeStyle=COL.axis;ctx.lineWidth=3;ctx.beginPath();
  ctx.moveTo(sx(xr[0]),sy(yr[0]));ctx.lineTo(sx(xr[1]),sy(yr[0]));
  ctx.moveTo(sx(xr[0]),sy(yr[0]));ctx.lineTo(sx(xr[0]),sy(yr[1]));ctx.stroke();
  ctx.fillStyle=COL.text;ctx.font='24px sans-serif';
  ctx.fillText(xl,W/2-40,H-8); ctx.save();ctx.translate(16,H/2+40);ctx.rotate(-Math.PI/2);ctx.fillText(yl,0,0);ctx.restore();
  return {sx,sy};
}
function line(ctx,m,pts,color,width,dash){ctx.strokeStyle=color;ctx.lineWidth=width||2;ctx.setLineDash(dash||[]);ctx.beginPath();
  pts.forEach((p,i)=>{const X=m.sx(p[0]),Y=m.sy(p[1]);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.stroke();ctx.setLineDash([]);}

/* ---------- McCabe-Thiele core ---------- */
function mccabe(p){
  const {a,R,xD,xB,zF,q}=p;
  const rect=x=>R/(R+1)*x + xD/(R+1);
  // intersection rect & q-line
  let xi,yi;
  if(Math.abs(q-1)<1e-6){xi=zF;yi=rect(zF);}
  else{const m=q/(q-1),b=-zF/(q-1);
    xi=(xD/(R+1)-b)/(m-R/(R+1)); yi=rect(xi);}
  const sslope=(yi-xB)/(xi-xB);
  const strip=x=>xB+sslope*(x-xB);
  // stepping
  const stair=[]; let x=xD,y=xD; stair.push([x,y]);
  let stages=0,feed=null,guard=0;
  while(guard++<300){
    const xe=eqX(y,a); stair.push([xe,y]); stages++;
    if(xe<=xB+1e-9 || xe<xB){ if(feed===null)feed=stages; break; }
    if(xe<xi && feed===null) feed=stages;
    const yo = xe>xi ? rect(xe) : strip(xe);
    stair.push([xe,yo]); x=xe; y=yo;
    if(y<=xB) break;
  }
  // Rmin via pinch (q-line ∩ equilibrium)
  let xp,yp;
  if(Math.abs(q-1)<1e-6){xp=zF;yp=eqY(zF,a);}
  else{const m=q/(q-1),b=-zF/(q-1);
    const A=m*(a-1), Bq=(m+b*(a-1)-a), C=b;
    const disc=Math.sqrt(Math.max(0,Bq*Bq-4*A*C));
    const r1=(-Bq+disc)/(2*A),r2=(-Bq-disc)/(2*A);
    xp=[r1,r2].filter(r=>r>0&&r<1).sort((u,v)=>Math.abs(u-zF)-Math.abs(v-zF))[0];
    yp=eqY(xp,a);}
  const Rmin=(xD-yp)/(yp-xp);
  return {stair,stages,feed,xi,yi,Rmin,strip,rect};
}

/* shared design state (used across tabs) */
const D0={a:2.4,R:1.8,xD:0.95,xB:0.05,zF:0.5,q:1.0,F:100};
VP._mccabe=mccabe; VP._eqY=eqY; VP._bubbleT=bubbleT; VP._psat=psat;

/* =========================================================
   DISTILLATION DESIGNER
========================================================= */
VP.tools.push({id:'distcol',title:'Distillation Designer',icon:'🏛️',group:'Separation',
 desc:'VLE, McCabe-Thiele, sizing, duties, economics + AI',
 render(el){ buildTabs(el,'Binary Distillation Column Designer','End-to-end shortcut design: VLE → balance → McCabe-Thiele → sizing → duties → economics, with an AI advisor.',[

  /* ---- VLE ---- */
  {key:'vle',label:'VLE & T-x-y',title:'Vapour–liquid equilibrium',sub:'',setup(b){
    b.innerHTML=`<div class="grid2">
      <div class="field"><label>System</label><select id="sys">
        <option value="alpha">Constant relative volatility α</option>
        ${Object.keys(SYSTEMS).map(k=>`<option value="${k}">${SYSTEMS[k].n}</option>`).join('')}
      </select></div>
      <div class="field"><label>α (constant-α mode)</label><input id="al" type="number" step="any" value="2.4"></div>
      <div class="field"><label>Pressure (T-x-y mode)</label><input id="pr" type="number" step="any" value="760"></div>
    </div>
    <div style="display:flex;gap:14px;flex-wrap:wrap;margin-top:8px"><div><div class="small">x–y diagram</div><div id="xyc"></div></div>
      <div id="txywrap"><div class="small">T–x–y diagram</div><div id="txyc"></div></div></div>
    <div class="results show" id="vleRes"></div>`;
    const draw=()=>{
      const sys=b.querySelector('#sys').value, a=num(b.querySelector('#al').value)||2.4, P=num(b.querySelector('#pr').value)||760;
      const xyc=b.querySelector('#xyc'); xyc.innerHTML=''; const cv=mkCanvas(380,360); xyc.appendChild(cv);
      const ctx=cv.getContext('2d'),W=cv.width,H=cv.height; const m=axes(ctx,W,H,80,[0,1],[0,1],'x (liquid)','y (vapour)');
      line(ctx,m,[[0,0],[1,1]],COL.diag,2,[8,8]);
      const eqpts=[]; for(let i=0;i<=100;i++){const x=i/100; let y; if(sys==='alpha')y=eqY(x,a); else {const s=SYSTEMS[sys];y=bubbleT(s.a,s.b,x,P).y1;} eqpts.push([x,y]);}
      line(ctx,m,eqpts,COL.eq,3);
      ctx.fillStyle=COL.eq;ctx.font='22px sans-serif';ctx.fillText('equilibrium',m.sx(0.45),m.sy(0.62));
      // T-x-y
      const tw=b.querySelector('#txywrap'); const txyc=b.querySelector('#txyc'); txyc.innerHTML='';
      let info='';
      if(sys==='alpha'){ tw.style.display='none'; info=`Constant α = ${a}. y = αx/(1+(α−1)x).`; }
      else{
        tw.style.display='';
        const s=SYSTEMS[sys];
        const Tb=[],Td=[]; let Tmin=1e9,Tmax=-1e9;
        for(let i=0;i<=60;i++){const x=i/60;const r=bubbleT(s.a,s.b,x,P);Tb.push([x,r.T]);Td.push([r.y1,r.T]);Tmin=Math.min(Tmin,r.T);Tmax=Math.max(Tmax,r.T);}
        const pad2=(Tmax-Tmin)*0.08; const yr=[Tmin-pad2,Tmax+pad2];
        const cv2=mkCanvas(380,360);txyc.appendChild(cv2);const c2=cv2.getContext('2d');
        const m2=axes(c2,cv2.width,cv2.height,80,[0,1],yr,'x, y (light)','T (°C)');
        line(c2,m2,Tb,COL.op,3); line(c2,m2,Td,COL.eq,3);
        c2.fillStyle=COL.op;c2.font='20px sans-serif';c2.fillText('bubble (x)',m2.sx(0.05),m2.sy(yr[0]+(yr[1]-yr[0])*0.25));
        c2.fillStyle=COL.eq;c2.fillText('dew (y)',m2.sx(0.55),m2.sy(yr[0]+(yr[1]-yr[0])*0.75));
        const aTop=psat(s.a,Tmin)/psat(s.b,Tmin), aBot=psat(s.a,Tmax)/psat(s.b,Tmax);
        info=`Raoult's law at P=${P} mmHg. Boiling range ${fmt(Tmin,1)}–${fmt(Tmax,1)} °C. α ≈ ${fmt(aBot,2)}–${fmt(aTop,2)}.`;
        if(sys==='ew') info+=' ⚠ Ethanol–water forms an azeotrope (~89 mol%); Raoult\'s law does NOT capture it — use NRTL/Wilson for real design.';
      }
      b.querySelector('#vleRes').innerHTML=`<div class="note">${info}</div>`;
    };
    b.querySelectorAll('select,input').forEach(i=>i.oninput=draw); draw();
  }},

  /* ---- Material balance ---- */
  {key:'mb',label:'Material balance',title:'Overall & component balance',sub:'',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'F',label:'Feed flow',unit:'kmol/h',val:100},
      {id:'zF',label:'Feed light-key fraction z_F',unit:'',val:0.5},
      {id:'xD',label:'Distillate purity x_D',unit:'',val:0.95},
      {id:'xB',label:'Bottoms x_B',unit:'',val:0.05}
    ],compute(v){
      if(v.xB>=v.zF||v.zF>=v.xD)throw new Error('Require x_B < z_F < x_D.');
      const D=v.F*(v.zF-v.xB)/(v.xD-v.xB), B=v.F-D;
      D0.zF=v.zF;D0.xD=v.xD;D0.xB=v.xB;D0.F=v.F;
      return {results:[
        {label:'Distillate D',value:D,unit:'kmol/h',digits:2},
        {label:'Bottoms B',value:B,unit:'kmol/h',digits:2},
        {label:'Light key in D',value:D*v.xD,unit:'kmol/h',digits:2},
        {label:'Light key in B',value:B*v.xB,unit:'kmol/h',digits:2},
        {label:'Recovery of light key',value:D*v.xD/(v.F*v.zF)*100,unit:'%',digits:1}
      ],notes:[{text:'Lever rule: D = F·(z_F−x_B)/(x_D−x_B). Values feed into the other tabs.'}]};}});
  }},

  /* ---- McCabe-Thiele (interactive) ---- */
  {key:'mt',label:'McCabe-Thiele',title:'Interactive McCabe-Thiele',sub:'Drag the sliders — stages step live.',setup(b){
    b.innerHTML=`<div class="grid3" id="mtctrl">
      ${slider('mt_R','Reflux ratio R',0.1,10,0.05,D0.R)}
      ${slider('mt_a','Relative volatility α',1.1,10,0.05,D0.a)}
      ${slider('mt_q','Feed quality q',-0.5,2,0.05,D0.q)}
      ${nf('mt_xD','Distillate x_D',D0.xD)}
      ${nf('mt_xB','Bottoms x_B',D0.xB)}
      ${nf('mt_zF','Feed z_F',D0.zF)}
    </div>
    <div id="mtcanvas" style="margin-top:8px"></div>
    <div class="res-grid" id="mtres" style="margin-top:12px"></div>
    <div class="note" id="mtnote"></div>`;
    const cw=b.querySelector('#mtcanvas');
    const get=()=>({a:gv('mt_a'),R:gv('mt_R'),xD:gv('mt_xD'),xB:gv('mt_xB'),zF:gv('mt_zF'),q:gv('mt_q')});
    function gv(id){return num(b.querySelector('#'+id).value);}
    function redraw(){
      const p=get();
      const lbl=id=>{const e=b.querySelector('#'+id+'_v'); if(e)e.textContent=fmt(gv(id),2);};
      ['mt_R','mt_a','mt_q'].forEach(lbl);
      let r; try{ if(!(p.xB<p.zF&&p.zF<p.xD&&p.xB<p.xD&&p.xB>=0&&p.xD<=1)) throw 0; r=mccabe(p); }
      catch(e){ b.querySelector('#mtres').innerHTML=''; b.querySelector('#mtnote').innerHTML='<span style="color:#ef6461">Require 0 ≤ x_B < z_F < x_D ≤ 1.</span>'; return; }
      cw.innerHTML=''; const cv=mkCanvas(440,420); cw.appendChild(cv);
      const ctx=cv.getContext('2d'),W=cv.width,H=cv.height; const m=axes(ctx,W,H,80,[0,1],[0,1],'x (liquid)','y (vapour)');
      line(ctx,m,[[0,0],[1,1]],COL.diag,2,[8,8]);
      const eqpts=[];for(let i=0;i<=100;i++){const x=i/100;eqpts.push([x,eqY(x,p.a)]);} line(ctx,m,eqpts,COL.eq,3);
      // operating lines
      line(ctx,m,[[p.xD,p.xD],[r.xi,r.yi]],COL.op,3);          // rectifying
      line(ctx,m,[[r.xi,r.yi],[p.xB,p.xB]],COL.op2,3);         // stripping
      line(ctx,m,[[p.zF,p.zF],[r.xi,r.yi]],COL.q,2,[6,6]);     // q-line
      line(ctx,m,r.stair,COL.stair,2);                         // staircase
      // markers
      ctx.fillStyle=COL.text;ctx.font='20px sans-serif';
      [['xD',p.xD],['xB',p.xB],['zF',p.zF]].forEach(([t,x])=>{ctx.fillText(t,m.sx(x)-10,m.sy(x)-8);});
      const RR=r.Rmin>0?p.R/r.Rmin:NaN;
      b.querySelector('#mtres').innerHTML=`
        <div class="res"><div class="rl">Theoretical stages</div><div class="rv">${r.stages}<span class="ru">incl. reboiler</span></div></div>
        <div class="res"><div class="rl">Feed stage (from top)</div><div class="rv">${r.feed||'—'}</div></div>
        <div class="res"><div class="rl">Minimum reflux R_min</div><div class="rv">${fmt(r.Rmin,3)}</div></div>
        <div class="res"><div class="rl">R / R_min</div><div class="rv">${fmt(RR,2)}</div></div>`;
      D0.a=p.a;D0.R=p.R;D0.xD=p.xD;D0.xB=p.xB;D0.zF=p.zF;D0.q=p.q;
      let warn = p.R<=r.Rmin? ' ⚠ R ≤ R_min: infeasible (infinite stages). Increase reflux.':'';
      b.querySelector('#mtnote').innerHTML=`Green = equilibrium, blue = rectifying, amber = stripping, red dashed = q-line, white = stages.${warn}`;
    }
    b.querySelectorAll('#mtctrl input').forEach(i=>i.oninput=redraw); redraw();
  }},

  /* ---- Shortcut FUG + Kirkbride ---- */
  {key:'fug',label:'Shortcut (FUG)',title:'Fenske–Underwood–Gilliland–Kirkbride',sub:'',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'a',label:'Relative volatility α',unit:'',val:D0.a},
      {id:'xD',label:'Light key in distillate',unit:'',val:0.95},
      {id:'xB',label:'Light key in bottoms',unit:'',val:0.05},
      {id:'zF',label:'Light key in feed',unit:'',val:0.5},
      {id:'q',label:'Feed quality q',unit:'',val:1.0},
      {id:'Rfac',label:'R / R_min',unit:'',val:1.5},
      {id:'D',label:'Distillate D',unit:'kmol/h',val:50},
      {id:'B',label:'Bottoms B',unit:'kmol/h',val:50}
    ],compute(v){
      const Nmin=Math.log((v.xD/(1-v.xD))*((1-v.xB)/v.xB))/Math.log(v.a);
      // Underwood with q
      let Rmin;
      if(Math.abs(v.q-1)<1e-6){const yp=eqY(v.zF,v.a);Rmin=(v.xD-yp)/(yp-v.zF);}
      else{const m=v.q/(v.q-1),bb=-v.zF/(v.q-1);const A=m*(v.a-1),Bq=(m+bb*(v.a-1)-v.a),C=bb;
        const disc=Math.sqrt(Math.max(0,Bq*Bq-4*A*C));const r1=(-Bq+disc)/(2*A),r2=(-Bq-disc)/(2*A);
        const xp=[r1,r2].filter(r=>r>0&&r<1).sort((u,w)=>Math.abs(u-v.zF)-Math.abs(w-v.zF))[0];Rmin=(v.xD-eqY(xp,v.a))/(eqY(xp,v.a)-xp);}
      const R=v.Rfac*Rmin, X=(R-Rmin)/(R+1);
      const Y=1-Math.exp(((1+54.4*X)/(11+117.2*X))*((X-1)/Math.sqrt(X)));
      const N=(Y+Nmin)/(1-Y);
      // Kirkbride feed-stage ratio
      const ratio=Math.pow(((1-v.zF)/v.zF)*Math.pow(v.xB/(1-v.xD),2)*(v.B/v.D),0.206);
      const Ns_over_Nr=ratio; const Nr=N/(1+Ns_over_Nr), feedStage=Nr; // from top
      return {results:[
        {label:'N_min (Fenske)',value:Nmin,unit:'',digits:2},
        {label:'R_min (Underwood)',value:Rmin,unit:'',digits:3},
        {label:'Operating R',value:R,unit:'',digits:3},
        {label:'Theoretical stages N',value:N,unit:'',digits:1},
        {label:'Real trays (η≈70%)',value:N/0.7,unit:'',digits:0},
        {label:'Feed stage (Kirkbride)',value:feedStage,unit:'from top',digits:0},
        {label:'N_strip / N_rect',value:ratio,unit:'',digits:3}
      ],notes:[{text:'Kirkbride: (N_s/N_r) = [ (z_F/x_D)·((1−x_D)/(1−x_B))²·(B/D) ]^0.206.'}]};}});
  }},

  /* ---- Reboiler / Condenser ---- */
  {key:'duty',label:'Reboiler/Condenser',title:'Condenser & reboiler duties',sub:'',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'D',label:'Distillate D',unit:'kmol/h',val:50},
      {id:'R',label:'Reflux ratio R',unit:'',val:1.8},
      {id:'lat',label:'Molar latent heat λ',unit:'kJ/mol',val:32},
      {id:'cwdT',label:'Cooling-water ΔT',unit:'°C',val:10},
      {id:'steamLat',label:'Heating-steam λ',unit:'kJ/kg',val:2100}
    ],compute(v){
      const V=(v.R+1)*v.D;                    // kmol/h overhead vapour
      const Qc=V*v.lat*1000/3600/1000;        // kW (kmol/h*kJ/mol = MJ/h)
      const Qr=Qc;                            // ≈ for saturated-liquid feed
      const cw=Qc*3600/(4.18*v.cwdT)/1000;    // t/h cooling water
      const steam=Qr*3600/v.steamLat/1000;    // t/h steam
      return {results:[
        {label:'Overhead vapour V',value:V,unit:'kmol/h',digits:1},
        {label:'Condenser duty',value:Qc,unit:'kW',digits:1},
        {label:'Reboiler duty (≈)',value:Qr,unit:'kW',digits:1},
        {label:'Cooling water',value:cw,unit:'t/h',digits:2},
        {label:'Heating steam',value:steam,unit:'t/h',digits:3}
      ],notes:[{text:'V=(R+1)·D; Q_cond=V·λ. Reboiler ≈ condenser for q=1 (saturated-liquid feed); adjust for feed enthalpy and subcooling.'}]};}});
  }},

  /* ---- Column sizing ---- */
  {key:'size',label:'Column sizing',title:'Diameter & height (tray / packed)',sub:'',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'V',label:'Vapour flow V',unit:'kmol/h',val:140},
      {id:'MW',label:'Vapour mol. weight',unit:'g/mol',val:80},
      {id:'T',label:'Top temperature',unit:'°C',val:82},
      {id:'P',label:'Pressure',unit:'kPa',val:101.3},
      {id:'rhoL',label:'Liquid density',unit:'kg/m³',val:820},
      {id:'Ksb',label:'Souders-Brown C',unit:'m/s',val:0.07},
      {id:'flood',label:'% of flooding',unit:'%',val:80},
      {id:'Nact',label:'Actual trays',unit:'',val:20},
      {id:'spacing',label:'Tray spacing',unit:'m',val:0.5}
    ],compute(v){
      const rhoV=v.P*1000*v.MW/1000/(8.314*(v.T+273.15)); // kg/m3
      const Vm3s=v.V*1000/3600*8.314*(v.T+273.15)/(v.P*1000)/1000*1000; // mol/s*RT/P
      const Vvol=(v.V*1000/3600)/1000 * 8.314*(v.T+273.15)/(v.P*1000); // m3/s (kmol/h→mol/s)
      const uf=v.Ksb*Math.sqrt((v.rhoL-rhoV)/rhoV);
      const uop=uf*v.flood/100;
      const A=Vvol/uop, Dia=Math.sqrt(4*A/Math.PI);
      const Hcol=v.Nact*v.spacing + 2.0; // + disengagement/sump allowance
      return {results:[
        {label:'Vapour density',value:rhoV,unit:'kg/m³',digits:3},
        {label:'Vapour volumetric',value:Vvol,unit:'m³/s',digits:3},
        {label:'Flooding velocity',value:uf,unit:'m/s',digits:3},
        {label:'Operating velocity',value:uop,unit:'m/s',digits:3},
        {label:'Column diameter',value:Dia,unit:'m',digits:2},
        {label:'Tower height',value:Hcol,unit:'m',digits:1}
      ],notes:[{text:'Souders-Brown: u_flood = C·√((ρL−ρV)/ρV). Design at 70–85% flood. Height = trays·spacing + ~2 m for sump & disengagement.'}]};}});
  }},

  /* ---- Economics ---- */
  {key:'econ',label:'Economics',title:'CAPEX / OPEX / NPV / IRR',sub:'',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'capex',label:'Installed CAPEX',unit:'$',val:2000000},
      {id:'opex',label:'Annual OPEX (utilities etc.)',unit:'$/yr',val:400000},
      {id:'benefit',label:'Annual revenue / savings',unit:'$/yr',val:900000},
      {id:'r',label:'Discount rate',unit:'%',val:10},
      {id:'n',label:'Project life',unit:'yr',val:15}
    ],compute(v){
      const cf=v.benefit-v.opex, r=v.r/100;
      const npv=-v.capex + cf*(1-Math.pow(1+r,-v.n))/r;
      // IRR by bisection
      const f=i=>-v.capex+cf*(1-Math.pow(1+i,-v.n))/i;
      let lo=1e-4,hi=2,irr=NaN;
      if(f(lo)>0&&f(hi)<0){for(let k=0;k<100;k++){const mid=(lo+hi)/2;if(f(mid)>0)lo=mid;else hi=mid;}irr=(lo+hi)/2;}
      return {results:[
        {label:'Net annual cash flow',value:cf,unit:'$/yr',digits:0},
        {label:'NPV',value:npv,unit:'$',digits:0},
        {label:'IRR',value:isNaN(irr)?NaN:irr*100,unit:'%',digits:1},
        {label:'Simple payback',value:v.capex/cf,unit:'yr',digits:2}
      ],notes:[{text:'IRR is the discount rate where NPV=0 (bisection). NPV>0 and IRR>hurdle ⇒ economically attractive.'}]};}});
  }},

  /* ---- AI advisor ---- */
  {key:'ai',label:'AI advisor',title:'Distillation AI advisor',sub:'Uses the key set in the AI Assistant tab.',setup(b){
    b.innerHTML=`<div class="field"><label>Ask about your column (design, troubleshooting, validation)</label>
      <textarea id="dq" placeholder="e.g. My column floods at high reflux — what should I check? Or: validate a benzene-toluene design with α=2.4, R=1.8, xD=0.95.">Suggest checks if my McCabe-Thiele design needs an unusually high number of stages.</textarea></div>
      <div class="btn-row"><button class="btn" id="dgo">Ask</button></div><div class="results" id="dres"></div>`;
    const res=b.querySelector('#dres');
    b.querySelector('#dgo').onclick=async()=>{
      const q=b.querySelector('#dq').value.trim(); if(!q)return;
      if(!VP.callLLM){res.innerHTML='<div class="note warnbox">Open the AI Assistant tab and save your API key first.</div>';res.classList.add('show');return;}
      res.innerHTML='<div class="note">…thinking…</div>';res.classList.add('show');
      try{const reply=await VP.callLLM([{role:'user',content:q}],"You are a distillation design expert. Help with binary column design, McCabe-Thiele, VLE, reflux, tray/packed sizing, reboiler/condenser, and troubleshooting flooding/weeping/foaming. Show formulas, give practical numeric guidance, and state assumptions. SI units.");
        res.innerHTML=`<div class="msg bot" style="max-width:100%">${reply.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
      }catch(e){res.innerHTML=`<div class="note warnbox">⚠ ${e.message}</div>`;}
    };
  }},

  {key:'pack',label:'Packed column',title:'Packed-column sizing (HETP)',sub:'Height = N·HETP, diameter from flooding',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'N',label:'Theoretical stages',unit:'',val:12},
      {id:'HETP',label:'HETP',unit:'m',val:0.5},
      {id:'V',label:'Vapour flow',unit:'kmol/h',val:140},
      {id:'MW',label:'Vapour mol. weight',unit:'g/mol',val:80},
      {id:'T',label:'Temperature',unit:'°C',val:82},
      {id:'P',label:'Pressure',unit:'kPa',val:101.3},
      {id:'rhoL',label:'Liquid density',unit:'kg/m³',val:820},
      {id:'C',label:'Packing capacity C',unit:'m/s',val:0.05},
      {id:'flood',label:'% of flooding',unit:'%',val:70}
    ],compute(v){
      const rhoV=v.P*1000*v.MW/1000/(8.314*(v.T+273.15));
      const uf=v.C*Math.sqrt((v.rhoL-rhoV)/rhoV), uop=uf*v.flood/100;
      const Vvol=(v.V*1000/3600)*8.314*(v.T+273.15)/(v.P*1000);
      const A=Vvol/uop, D=Math.sqrt(4*A/Math.PI), Hpack=v.N*v.HETP;
      return {results:[
        {label:'Packed height',value:Hpack,unit:'m',digits:2},
        {label:'Total height (+ends)',value:Hpack+1.5,unit:'m',digits:2},
        {label:'Vapour density',value:rhoV,unit:'kg/m³',digits:3},
        {label:'Flooding velocity',value:uf,unit:'m/s',digits:3},
        {label:'Column diameter',value:D,unit:'m',digits:2}
      ],notes:[{text:'Packed height = N × HETP (≈0.3–0.6 m random packing, less for structured). Diameter from u_flood = C·√((ρL−ρV)/ρV); design at 65–80% flood. Add ~1.5 m for distributor, sump and disengagement.'}]};
    }});
  }},
  {key:'opt',label:'Reflux optimum',title:'Economic reflux optimization',sub:'Minimum total cost vs R/R_min',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'a',label:'Relative volatility α',unit:'',val:2.4},
      {id:'xD',label:'Light key in distillate',unit:'',val:0.95},
      {id:'xB',label:'Light key in bottoms',unit:'',val:0.05},
      {id:'zF',label:'Light key in feed',unit:'',val:0.5},
      {id:'D',label:'Distillate flow',unit:'kmol/h',val:50},
      {id:'lat',label:'Molar latent heat λ',unit:'kJ/mol',val:32},
      {id:'cap',label:'Installed cost per real tray',unit:'$',val:15000},
      {id:'steam',label:'Steam cost',unit:'$/GJ',val:8},
      {id:'hrs',label:'Operating hours',unit:'h/yr',val:8000},
      {id:'crf',label:'Capital recovery factor',unit:'/yr',val:0.2}
    ],compute(v){
      const Nmin=Math.log((v.xD/(1-v.xD))*((1-v.xB)/v.xB))/Math.log(v.a);
      const yp=eqY(v.zF,v.a), Rmin=(v.xD-yp)/(yp-v.zF);
      if(!(Rmin>0))throw new Error('Check inputs — R_min not positive.');
      let best=null;
      for(let r=1.05;r<=3.0001;r+=0.05){
        const R=r*Rmin, X=(R-Rmin)/(R+1);
        const Y=1-Math.exp(((1+54.4*X)/(11+117.2*X))*((X-1)/Math.sqrt(X)));
        const N=(Y+Nmin)/(1-Y), real=N/0.7;
        const V=(R+1)*v.D, Qreb=V*v.lat*1000/3600;
        const opex=Qreb*v.hrs*3600/1e6*v.steam, capex=v.cap*real, total=capex*v.crf+opex;
        if(!best||total<best.total)best={r,R,N,real,capex,opex,total};
      }
      return {results:[
        {label:'R_min',value:Rmin,unit:'',digits:3},
        {label:'Optimum R/R_min',value:best.r,unit:'',digits:2},
        {label:'Optimum reflux R',value:best.R,unit:'',digits:3},
        {label:'Stages at optimum',value:best.N,unit:'',digits:1},
        {label:'Annual capital',value:best.capex*v.crf,unit:'$/yr',digits:0},
        {label:'Annual energy',value:best.opex,unit:'$/yr',digits:0},
        {label:'Minimum total cost',value:best.total,unit:'$/yr',digits:0}
      ],notes:[{text:'Sweeps R = 1.05–3×R_min: more reflux → fewer stages (less capital) but more reboiler duty (more energy). The economic optimum is typically R ≈ 1.05–1.3×R_min; the exact point shifts with the energy-to-capital cost ratio.'}]};
    }});
  }}
 ]); }});

/* slider/number-field html helpers */
function slider(id,label,min,max,step,val){
  return `<div class="field"><label>${label}: <span id="${id}_v" class="unit">${val}</span></label>
    <input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${val}"></div>`;
}
function nf(id,label,val){return `<div class="field"><label>${label}</label><input id="${id}" type="number" step="any" value="${val}"></div>`;}

})();
