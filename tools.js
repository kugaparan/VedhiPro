/* VedhiPro — calculator modules */
(function(){
const VP = window.VP;
VP.tools = [];

/* ---------- tiny helpers ---------- */
function num(x){const n=parseFloat(x);return isNaN(n)?null:n;}
function fmt(x,d){
  if(x===null||x===undefined||isNaN(x))return "—";
  if(x!==0 && (Math.abs(x)>=1e6 || Math.abs(x)<1e-4)) return x.toExponential(d??3);
  return Number(x.toFixed(d??3)).toString();
}
VP.fmt=fmt; VP.num=num;

/* Generic form builder. config:
   {inputs:[{id,label,unit,val,type,options}], compute:(v)=>({results:[{label,value,unit,digits}],notes:[...]}), formula} */
VP.calcForm = function(container, config){
  const cols = config.cols || 2;
  let html = `<div class="grid${cols}">`;
  config.inputs.forEach(inp=>{
    html += `<div class="field"><label>${inp.label}${inp.unit?` <span class="unit">(${inp.unit})</span>`:''}</label>`;
    if(inp.type==='select'){
      html += `<select id="${inp.id}">`+inp.options.map(o=>`<option value="${o.v??o}" ${ (inp.val===(o.v??o))?'selected':''}>${o.t??o}</option>`).join('')+`</select>`;
    } else {
      html += `<input id="${inp.id}" type="${inp.type||'number'}" value="${inp.val??''}" step="any">`;
    }
    html += `</div>`;
  });
  html += `</div>`;
  if(config.formula) html += `<div class="note">${config.formula}</div>`;
  html += `<div class="btn-row"><button class="btn" id="calcBtn">Calculate</button></div>`;
  html += `<div class="results" id="results"></div>`;
  container.innerHTML = html;

  const run = ()=>{
    const v = {};
    config.inputs.forEach(inp=>{
      const elx=container.querySelector('#'+inp.id);
      v[inp.id] = (inp.type==='select')?elx.value:num(elx.value);
    });
    const out = container.querySelector('#results');
    try{
      const r = config.compute(v);
      let h = `<div class="res-grid">`;
      r.results.forEach(rr=>{
        h += `<div class="res"><div class="rl">${rr.label}</div><div class="rv">${fmt(rr.value,rr.digits)}<span class="ru">${rr.unit||''}</span></div></div>`;
      });
      h += `</div>`;
      (r.notes||[]).forEach(n=> h += `<div class="note ${n.warn?'warnbox':''}">${n.text||n}</div>`);
      out.innerHTML = h; out.classList.add('show');
    }catch(e){
      out.innerHTML = `<div class="note warnbox">⚠ ${e.message}</div>`; out.classList.add('show');
    }
  };
  container.querySelector('#calcBtn').addEventListener('click',run);
  run();
};

function pageHead(t,p){return `<div class="page-head"><h1>${t}</h1><p>${p}</p></div>`;}
function card(title,sub,inner){return `<div class="card"><h2>${title}</h2>${sub?`<div class="sub">${sub}</div>`:''}<div class="cardbody">${inner||''}</div></div>`;}

/* =========================================================
   1. STEAM TABLES
========================================================= */
VP.tools.push({id:'steam',title:'Steam Tables',icon:'♨️',group:'Thermo',
 desc:'Saturation, quality, superheated, compressed liquid, state ID',
 render(el){
  const TABS=[
    {k:'sat',label:'Saturation'},
    {k:'x',label:'Quality (x)'},
    {k:'sup',label:'Superheated'},
    {k:'comp',label:'Compressed liquid'},
    {k:'turbine',label:'Turbine'},
    {k:'throttle',label:'Throttling'},
    {k:'duty',label:'Boiler/Condenser'},
    {k:'mollier',label:'Mollier h–s'},
    {k:'state',label:'State ID'},
    {k:'units',label:'Unit converter'},
    {k:'table',label:'Full table'}
  ];
  el.innerHTML = pageHead('Steam Tables','Water/steam properties (IAPWS-IF97 based): saturation, two-phase quality, superheated, compressed-liquid approximation, state identification and unit conversion.')
    + '<div class="tabs">'+TABS.map((t,i)=>`<div class="tab ${i===0?'active':''}" data-t="${t.k}">${t.label}</div>`).join('')+'</div>'
    + TABS.map((t,i)=>`<div class="tabcard" data-c="${t.k}" style="${i?'display:none':''}"></div>`).join('');
  const tabs=el.querySelectorAll('.tab'), cards=el.querySelectorAll('.tabcard');
  tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    cards.forEach(c=>c.style.display=c.dataset.c===t.dataset.t?'':'none');});
  const box=k=>el.querySelector('.tabcard[data-c="'+k+'"]');
  function calcCard(k,title,sub,cfg){const id='sb_'+k;box(k).innerHTML=card(title,sub,'<div id="'+id+'"></div>');VP.calcForm(el.querySelector('#'+id),cfg);}

  /* --- Saturation lookup (adds internal energy u) --- */
  calcCard('sat','Saturation properties','Enter saturation temperature OR pressure.',{
    inputs:[
      {id:'mode',label:'Known variable',type:'select',val:'T',options:[{v:'T',t:'Saturation temperature (°C)'},{v:'P',t:'Saturation pressure (kPa)'}]},
      {id:'val',label:'Value',unit:'°C or kPa',val:150}
    ],
    compute(v){
      const r=v.mode==='T'?VP.satByTemp(v.val):VP.satByPress(v.val);
      const T=r[0],P=r[1],vf=r[2],vg=r[3],hf=r[4],hfg=r[5],hg=r[6],sf=r[7],sg=r[8];
      const uf=hf-P*vf, ug=hg-P*vg;
      return {results:[
        {label:'Sat. temperature',value:T,unit:'°C',digits:2},
        {label:'Sat. pressure',value:P,unit:'kPa',digits:3},
        {label:'hf (liquid)',value:hf,unit:'kJ/kg',digits:1},
        {label:'hfg (latent)',value:hfg,unit:'kJ/kg',digits:1},
        {label:'hg (vapour)',value:hg,unit:'kJ/kg',digits:1},
        {label:'uf',value:uf,unit:'kJ/kg',digits:1},
        {label:'ug',value:ug,unit:'kJ/kg',digits:1},
        {label:'vf',value:vf,unit:'m³/kg',digits:6},
        {label:'vg',value:vg,unit:'m³/kg',digits:4},
        {label:'sf',value:sf,unit:'kJ/kg·K',digits:4},
        {label:'sg',value:sg,unit:'kJ/kg·K',digits:4}
      ],notes:[{text:'Linearly interpolated between table rows. u = h − P·v.'}]};
    }
  });

  /* --- Quality (x) calculator: two-phase mixture --- */
  calcCard('x','Quality (x) calculator','Wet steam: give saturation T or P and the dryness fraction x.',{
    inputs:[
      {id:'mode',label:'Known variable',type:'select',val:'P',options:[{v:'T',t:'Saturation temperature (°C)'},{v:'P',t:'Saturation pressure (kPa)'}]},
      {id:'val',label:'Value',unit:'°C or kPa',val:200},
      {id:'x',label:'Quality x (0 = sat. liquid, 1 = sat. vapour)',unit:'',val:0.9}
    ],
    compute(v){
      if(v.x<0||v.x>1)throw new Error('Quality x must be between 0 and 1.');
      const r=v.mode==='T'?VP.satByTemp(v.val):VP.satByPress(v.val);
      const T=r[0],P=r[1],vf=r[2],vg=r[3],hf=r[4],hfg=r[5],hg=r[6],sf=r[7],sg=r[8];
      const v_=vf+v.x*(vg-vf);
      const h_=hf+v.x*hfg;
      const s_=sf+v.x*(sg-sf);
      const u_=(hf-P*vf)+v.x*((hg-P*vg)-(hf-P*vf));
      return {results:[
        {label:'Saturation T',value:T,unit:'°C',digits:2},
        {label:'Saturation P',value:P,unit:'kPa',digits:3},
        {label:'Enthalpy h',value:h_,unit:'kJ/kg',digits:1},
        {label:'Entropy s',value:s_,unit:'kJ/kg·K',digits:4},
        {label:'Spec. volume v',value:v_,unit:'m³/kg',digits:5},
        {label:'Internal energy u',value:u_,unit:'kJ/kg',digits:1}
      ],notes:[{text:'Mixture rules: h = hf + x·hfg ; s = sf + x·sfg ; v = vf + x·(vg−vf) ; u = uf + x·(ug−uf).'}]};
    }
  });

  /* --- Superheated steam (IAPWS-IF97 Region 2) --- */
  calcCard('sup','Superheated steam','Enter pressure and temperature (above saturation).',{
    inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:1000},
      {id:'T',label:'Temperature',unit:'°C',val:400}
    ],
    compute(v){
      if(!VP.iapws)throw new Error('Steam engine still loading — reopen this tab.');
      const Tsat=VP.satByPress(v.P)[0];
      const pr=VP.iapws.region2(v.P/1000, v.T+273.15);
      const u=pr.h - v.P*pr.v;
      const notes=[{text:'IAPWS-IF97 Region 2. u = h − P·v. Degree of superheat = T − T_sat.'}];
      if(v.T<=Tsat+0.1) notes.unshift({text:'⚠ T is at/below the saturation temperature for this pressure ('+fmt(Tsat,1)+' °C) — the state is not truly superheated; use the Quality or Compressed-liquid tab.',warn:true});
      return {results:[
        {label:'Enthalpy h',value:pr.h,unit:'kJ/kg',digits:1},
        {label:'Entropy s',value:pr.s,unit:'kJ/kg·K',digits:4},
        {label:'Spec. volume v',value:pr.v,unit:'m³/kg',digits:5},
        {label:'Internal energy u',value:u,unit:'kJ/kg',digits:1},
        {label:'Saturation T at P',value:Tsat,unit:'°C',digits:1},
        {label:'Degree of superheat',value:v.T-Tsat,unit:'°C',digits:1}
      ],notes};
    }
  });

  /* --- Compressed (subcooled) liquid approximation --- */
  calcCard('comp','Compressed-liquid approximation','Subcooled liquid: properties ≈ saturated liquid at the same temperature.',{
    inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:5000},
      {id:'T',label:'Temperature',unit:'°C',val:80}
    ],
    compute(v){
      const r=VP.satByTemp(v.T);
      const Psat=r[1],vf=r[2],hf=r[4],sf=r[7];
      const h=hf+vf*(v.P-Psat);   // P, Psat in kPa; vf m³/kg → kJ/kg
      const u=hf-Psat*vf;
      const notes=[{text:'Approximation: v ≈ vf(T), s ≈ sf(T), u ≈ uf(T), and h ≈ hf(T) + vf·(P − Psat). Valid when P > Psat(T).'}];
      if(v.P<Psat) notes.unshift({text:'⚠ P ('+fmt(v.P,1)+' kPa) is below Psat at this temperature ('+fmt(Psat,1)+' kPa) — the water is not a compressed liquid here (it would flash to vapour).',warn:true});
      return {results:[
        {label:'h ≈ hf(T) + vf·ΔP',value:h,unit:'kJ/kg',digits:1},
        {label:'hf at T',value:hf,unit:'kJ/kg',digits:1},
        {label:'s ≈ sf(T)',value:sf,unit:'kJ/kg·K',digits:4},
        {label:'v ≈ vf(T)',value:vf,unit:'m³/kg',digits:6},
        {label:'u ≈ uf(T)',value:u,unit:'kJ/kg',digits:1},
        {label:'Psat at T',value:Psat,unit:'kPa',digits:2}
      ],notes};
    }
  });

  /* --- Steam expansion / turbine work --- */
  calcCard('turbine','Steam expansion & turbine work','Isentropic expansion from inlet (P₁,T₁) to exhaust pressure P₂, then actual shaft work via isentropic efficiency.',{
    inputs:[
      {id:'P1',label:'Inlet pressure',unit:'kPa',val:4000},
      {id:'T1',label:'Inlet temperature',unit:'°C',val:400},
      {id:'P2',label:'Exhaust pressure',unit:'kPa',val:50},
      {id:'eta',label:'Isentropic efficiency',unit:'%',val:85},
      {id:'mdot',label:'Steam mass flow (optional)',unit:'kg/s',val:0}
    ],
    compute(v){
      if(!VP.iapws)throw new Error('Steam engine still loading — reopen this tab.');
      if(v.P2>=v.P1)throw new Error('Exhaust pressure must be below inlet pressure.');
      const P1=v.P1/1000, P2=v.P2/1000, T1=v.T1+273.15;
      const Tsat1=VP.satByPress(v.P1)[0];
      if(v.T1<=Tsat1+0.1)throw new Error('Inlet must be superheated (T₁ > '+fmt(Tsat1,1)+' °C at this pressure).');
      const in1=VP.iapws.region2(P1,T1);
      const liq=VP.iapws.satLiq(P2), vap=VP.iapws.satVap(P2);
      let h2s,outState,x2s=null;
      if(in1.s>=vap.s){
        let lo=VP.iapws.satT(P2),hi=1273.15;
        for(let i=0;i<90;i++){const m=(lo+hi)/2;if(VP.iapws.region2(P2,m).s<in1.s)lo=m;else hi=m;}
        const Tt=(lo+hi)/2; h2s=VP.iapws.region2(P2,Tt).h; outState='Superheated ('+fmt(Tt-273.15,1)+' °C)';
      }else{
        x2s=(in1.s-liq.s)/(vap.s-liq.s); h2s=liq.h+x2s*(vap.h-liq.h); outState='Wet, x = '+fmt(x2s,4);
      }
      const wIdeal=in1.h-h2s, eta=v.eta/100, wAct=eta*wIdeal, h2=in1.h-wAct;
      let outAct;
      if(h2<vap.h){const x2a=(h2-liq.h)/(vap.h-liq.h); outAct='Wet, x = '+fmt(x2a,4);}
      else outAct='Superheated';
      const res=[
        {label:'Inlet enthalpy h₁',value:in1.h,unit:'kJ/kg',digits:1},
        {label:'Inlet entropy s₁',value:in1.s,unit:'kJ/kg·K',digits:4},
        {label:'Ideal outlet h₂s',value:h2s,unit:'kJ/kg',digits:1},
        {label:'Isentropic (ideal) work',value:wIdeal,unit:'kJ/kg',digits:1},
        {label:'Actual work',value:wAct,unit:'kJ/kg',digits:1},
        {label:'Ideal outlet state',value:outState,unit:'',digits:0},
        {label:'Actual outlet state',value:outAct,unit:'',digits:0}
      ];
      if(v.mdot>0)res.push({label:'Power output',value:wAct*v.mdot,unit:'kW',digits:1});
      return {results:res,notes:[{text:'Isentropic expansion keeps s₂ = s₁; ideal work = h₁ − h₂s. Actual work = η·ideal (turbine). Outlet is wet if s₁ < s_g(P₂). IAPWS-IF97 Region 2 for inlet & any superheated outlet.'}]};
    }
  });

  /* --- Throttling (isenthalpic / Joule–Thomson) --- */
  calcCard('throttle','Throttling (isenthalpic)','Adiabatic valve or orifice — enthalpy is conserved (h₂ = h₁).',{
    inputs:[
      {id:'P1',label:'Upstream pressure',unit:'kPa',val:4000},
      {id:'T1',label:'Upstream temperature',unit:'°C',val:400},
      {id:'P2',label:'Downstream pressure',unit:'kPa',val:500}
    ],
    compute(v){
      if(!VP.iapws)throw new Error('Steam engine still loading — reopen this tab.');
      if(v.P2>=v.P1)throw new Error('Downstream pressure must be below upstream.');
      const Tsat1=VP.satByPress(v.P1)[0];
      if(v.T1<=Tsat1+0.1)throw new Error('Upstream must be superheated (T > '+fmt(Tsat1,1)+' °C at this pressure).');
      const h1=VP.iapws.region2(v.P1/1000,v.T1+273.15).h;
      const liq=VP.iapws.satLiq(v.P2/1000), vap=VP.iapws.satVap(v.P2/1000);
      let state,T2,x2=null;
      if(h1>=vap.h){let lo=VP.satByPress(v.P2)[0]+273.15,hi=1273.15;
        for(let i=0;i<80;i++){const m=(lo+hi)/2;if(VP.iapws.region2(v.P2/1000,m).h<h1)lo=m;else hi=m;}
        T2=(lo+hi)/2-273.15; state='Superheated';}
      else { x2=(h1-liq.h)/(vap.h-liq.h); T2=VP.satByPress(v.P2)[0]; state='Wet, x = '+fmt(x2,4); }
      return {results:[
        {label:'Enthalpy (constant)',value:h1,unit:'kJ/kg',digits:1},
        {label:'Downstream temperature',value:T2,unit:'°C',digits:2},
        {label:'Temperature drop',value:v.T1-T2,unit:'°C',digits:2},
        {label:'Downstream state',value:state,unit:'',digits:0}
      ],notes:[{text:'Throttling is isenthalpic (h₂ = h₁). Steam cools as it expands (positive Joule–Thomson) and a wet inlet can flash to superheated.'}]};
    }
  });

  /* --- Boiler & condenser duty --- */
  box('duty').innerHTML = card('Boiler duty','Heat to turn feedwater into steam: Q = ṁ·(h_steam − h_feedwater).','<div id="sb_boiler"></div>')
    + card('Condenser duty','Heat removed to condense the turbine exhaust to saturated liquid.','<div id="sb_cond"></div>');
  VP.calcForm(el.querySelector('#sb_boiler'),{cols:2,inputs:[
    {id:'mdot',label:'Steam mass flow',unit:'kg/h',val:5000},
    {id:'Pb',label:'Boiler pressure',unit:'kPa',val:4000},
    {id:'Ts',label:'Steam temperature',unit:'°C',val:400},
    {id:'Tfw',label:'Feedwater temperature',unit:'°C',val:105}
  ],compute(v){
    if(!VP.iapws)throw new Error('Steam engine still loading.');
    const hsteam=VP.iapws.region2(v.Pb/1000,v.Ts+273.15).h, hfw=VP.satByTemp(v.Tfw)[4];
    const Q=v.mdot/3600*(hsteam-hfw);
    return {results:[
      {label:'Steam enthalpy',value:hsteam,unit:'kJ/kg',digits:1},
      {label:'Feedwater enthalpy',value:hfw,unit:'kJ/kg',digits:1},
      {label:'Boiler duty',value:Q,unit:'kW',digits:1},
      {label:'Boiler duty',value:Q*3600/1e6,unit:'GJ/h',digits:3}
    ],notes:[{text:'Q = ṁ·(h_steam − h_fw). Feedwater approximated as saturated liquid at its temperature. Divide by fuel LHV×efficiency for fuel rate (see Energy → Boiler).'}]};
  }});
  VP.calcForm(el.querySelector('#sb_cond'),{cols:2,inputs:[
    {id:'mdot',label:'Steam mass flow',unit:'kg/h',val:5000},
    {id:'Pc',label:'Condenser pressure',unit:'kPa',val:10},
    {id:'x',label:'Inlet quality x',unit:'0–1',val:0.9},
    {id:'cwdT',label:'Cooling-water ΔT',unit:'°C',val:10}
  ],compute(v){
    if(v.x<0||v.x>1)throw new Error('Quality must be 0–1.');
    const r=VP.satByPress(v.Pc), hf=r[4], hg=r[6];
    const hin=hf+v.x*(hg-hf), Q=v.mdot/3600*(hin-hf);
    const cw=Q*3600/(4.18*v.cwdT)/1000;
    return {results:[
      {label:'Inlet enthalpy',value:hin,unit:'kJ/kg',digits:1},
      {label:'Outlet (sat. liquid)',value:hf,unit:'kJ/kg',digits:1},
      {label:'Condenser duty',value:Q,unit:'kW',digits:1},
      {label:'Cooling water',value:cw,unit:'t/h',digits:2}
    ],notes:[{text:'Q = ṁ·(h_in − h_f). Cooling water = Q/(cp·ΔT). Latent load dominates — most heat is rejected condensing the vapour fraction.'}]};
  }});

  /* --- Mollier (h–s) chart --- */
  (function(){
    const host=box('mollier');
    host.innerHTML=card('Mollier (h–s) diagram','Enthalpy–entropy chart with the saturation dome and constant-pressure lines. Your point is marked.',
      `<div class="grid3">
        <div class="field"><label>Pressure <span class="unit">(kPa)</span></label><input id="mo_P" type="number" step="any" value="4000"></div>
        <div class="field"><label>Temperature <span class="unit">(°C)</span></label><input id="mo_T" type="number" step="any" value="400"></div>
        <div class="field" style="align-self:end"><button class="btn" id="mo_go">Plot point</button></div>
      </div><div id="mo_chart" style="margin-top:10px"></div>`);
    function draw(){
      const P=num(el.querySelector('#mo_P').value)||4000, T=num(el.querySelector('#mo_T').value)||400;
      const cv=document.createElement('canvas');cv.width=760;cv.height=520;
      cv.style.width='100%';cv.style.maxWidth='620px';cv.style.background='#0b1120';
      cv.style.border='1px solid rgba(255,255,255,.10)';cv.style.borderRadius='10px';
      const wrap=el.querySelector('#mo_chart');wrap.innerHTML='';wrap.appendChild(cv);
      const ctx=cv.getContext('2d'),W=cv.width,H=cv.height,pl=58,pr=20,pb=44,pt=18;
      const smin=0,smax=9,hmin=200,hmax=4200;
      const sx=s=>pl+(s-smin)/(smax-smin)*(W-pl-pr), sy=h=>H-pb-(h-hmin)/(hmax-hmin)*(H-pb-pt);
      ctx.clearRect(0,0,W,H);ctx.strokeStyle='#1b2638';ctx.lineWidth=1;ctx.fillStyle='#9aa7bd';ctx.font='11px sans-serif';
      for(let s=smin;s<=smax;s++){ctx.beginPath();ctx.moveTo(sx(s),pt);ctx.lineTo(sx(s),H-pb);ctx.stroke();ctx.fillText(s,sx(s)-4,H-pb+14);}
      for(let h=hmin;h<=hmax;h+=500){ctx.beginPath();ctx.moveTo(pl,sy(h));ctx.lineTo(W-pr,sy(h));ctx.stroke();ctx.fillText(h,6,sy(h)+4);}
      ctx.strokeStyle='#3a4a63';ctx.lineWidth=2;ctx.beginPath();let st=false;
      for(let Tc=5;Tc<=370;Tc+=5){const r=VP.satByTemp(Tc);const X=sx(r[7]),Y=sy(r[4]);st?ctx.lineTo(X,Y):ctx.moveTo(X,Y);st=true;}
      for(let Tc=370;Tc>=5;Tc-=5){const r=VP.satByTemp(Tc);ctx.lineTo(sx(r[8]),sy(r[6]));}
      ctx.stroke();
      if(VP.iapws){[100,500,1000,4000,10000].forEach(Pk=>{
        ctx.strokeStyle='rgba(79,141,255,.55)';ctx.lineWidth=1.4;ctx.beginPath();let started=false;
        const Tsat=VP.satByPress(Pk)[0];
        for(let Tc=Math.ceil(Tsat);Tc<=700;Tc+=10){const pr=VP.iapws.region2(Pk/1000,Tc+273.15);const X=sx(pr.s),Y=sy(pr.h);
          if(pr.s<smin||pr.s>smax){started=false;continue;}started?ctx.lineTo(X,Y):ctx.moveTo(X,Y);started=true;}
        ctx.stroke();
        const lab=VP.iapws.region2(Pk/1000,(Math.ceil(Tsat)+120)+273.15);
        if(lab.s<smax&&lab.s>smin){ctx.fillStyle='#6f8bb5';ctx.fillText((Pk/100)+' bar',sx(lab.s)-10,sy(lab.h)-4);}
      });}
      if(VP.iapws){const Tsat=VP.satByPress(P)[0];let pt2;
        if(T>Tsat){pt2=VP.iapws.region2(P/1000,T+273.15);}
        else{const r=VP.satByPress(P);pt2={s:r[8],h:r[6]};}
        ctx.fillStyle='#ffc24b';ctx.beginPath();ctx.arc(sx(pt2.s),sy(pt2.h),6,0,7);ctx.fill();
        ctx.strokeStyle='#0b1120';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='#eef2f8';ctx.font='12px sans-serif';ctx.fillText(fmt(P/100,0)+' bar / '+fmt(T,0)+'°C',sx(pt2.s)+9,sy(pt2.h)-6);}
      ctx.fillStyle='#c7d3e6';ctx.font='12px sans-serif';ctx.fillText('Entropy s (kJ/kg·K)',W/2-60,H-6);
      ctx.save();ctx.translate(14,H/2+44);ctx.rotate(-Math.PI/2);ctx.fillText('Enthalpy h (kJ/kg)',0,0);ctx.restore();
    }
    el.querySelector('#mo_go').onclick=draw; draw();
  })();

  /* --- Steam state identifier --- */
  calcCard('state','Steam state identifier','Given P and T, is the water subcooled, saturated, or superheated?',{
    inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:1000},
      {id:'T',label:'Temperature',unit:'°C',val:250}
    ],
    compute(v){
      const Tsat=VP.satByPress(v.P)[0];
      const Psat=VP.satByTemp(v.T)[1];
      const d=v.T-Tsat;
      let state,tag;
      if(d<-0.1){state='Subcooled / compressed liquid';tag='💧';}
      else if(d>0.1){state='Superheated vapour';tag='♨️';}
      else{state='Saturated (two-phase, on the dome)';tag='🌫️';}
      return {results:[
        {label:'Saturation T at P',value:Tsat,unit:'°C',digits:1},
        {label:'Saturation P at T',value:Psat,unit:'kPa',digits:2},
        {label:'T − T_sat',value:d,unit:'°C',digits:1}
      ],notes:[{text:'<strong>'+tag+' State: '+state+'</strong><br>Rule: compare your T to the saturation temperature at the given P. T &lt; T_sat → subcooled; T ≈ T_sat → saturated; T &gt; T_sat → superheated.'}]};
    }
  });

  /* --- Unit converter (pressure + temperature) --- */
  box('units').innerHTML =
     card('Pressure converter','kPa ↔ bar ↔ MPa ↔ atm ↔ psi ↔ mmHg','<div id="su_p"></div>')
   + card('Temperature converter','°C ↔ K ↔ °F','<div id="su_t"></div>');
  const PF={kPa:1,bar:100,MPa:1000,atm:101.325,psi:6.894757,mmHg:0.1333224};
  VP.calcForm(el.querySelector('#su_p'),{
    inputs:[
      {id:'val',label:'Value',val:1},
      {id:'from',label:'From',type:'select',val:'bar',options:Object.keys(PF).map(k=>({v:k,t:k}))},
      {id:'to',label:'To',type:'select',val:'kPa',options:Object.keys(PF).map(k=>({v:k,t:k}))}
    ],
    compute(v){return {results:[{label:v.val+' '+v.from+' =',value:v.val*PF[v.from]/PF[v.to],unit:v.to,digits:6}],notes:[]};}
  });
  VP.calcForm(el.querySelector('#su_t'),{
    inputs:[
      {id:'val',label:'Value',val:100},
      {id:'from',label:'From',type:'select',val:'C',options:[{v:'C',t:'°C'},{v:'K',t:'K'},{v:'F',t:'°F'}]},
      {id:'to',label:'To',type:'select',val:'K',options:[{v:'C',t:'°C'},{v:'K',t:'K'},{v:'F',t:'°F'}]}
    ],
    compute(v){
      let K; if(v.from==='C')K=v.val+273.15; else if(v.from==='F')K=(v.val-32)*5/9+273.15; else K=v.val;
      let o; if(v.to==='C')o=K-273.15; else if(v.to==='F')o=(K-273.15)*9/5+32; else o=K;
      return {results:[{label:v.val+'° →',value:o,unit:v.to,digits:3}],notes:[]};
    }
  });

  /* --- Full saturated table --- */
  let t = `<div class="table-wrap"><table class="data"><thead><tr><th>T °C</th><th>P kPa</th><th>vf</th><th>vg</th><th>hf</th><th>hfg</th><th>hg</th><th>sf</th><th>sg</th></tr></thead><tbody>`;
  VP.steamSat.forEach(r=>{t+=`<tr><td>${r[0]}</td><td>${fmt(r[1],3)}</td><td>${fmt(r[2],6)}</td><td>${fmt(r[3],4)}</td><td>${fmt(r[4],1)}</td><td>${fmt(r[5],1)}</td><td>${fmt(r[6],1)}</td><td>${fmt(r[7],4)}</td><td>${fmt(r[8],4)}</td></tr>`;});
  t+=`</tbody></table></div>`;
  box('table').innerHTML = card('Saturated steam table','By temperature (0.01–374 °C).',t);
 }});

/* =========================================================
   2. PSYCHROMETRICS  (full moist-air / HVAC suite)
========================================================= */
const PSY=(function(){
  const Ra=0.287055, RRv=0.62198;
  const psat=T=>VP.pSatWater(T);
  function invPsat(Pv){let lo=-70,hi=220;for(let i=0;i<90;i++){const m=(lo+hi)/2;if(psat(m)<Pv)lo=m;else hi=m;}return (lo+hi)/2;}
  function fromW(P,Tdb,W){
    W=Math.max(0,W);
    const Pv=P*W/(RRv+W), Ps=psat(Tdb), RH=Ps>0?Math.min(100,Pv/Ps*100):0, Tdp=Pv>1e-9?invPsat(Pv):-100;
    const h=1.006*Tdb+W*(2501+1.86*Tdb);
    const v=Ra*(Tdb+273.15)*(1+1.6078*W)/P;
    const rho=(1+W)/v;
    let lo=Tdp,hi=Tdb;
    for(let i=0;i<70;i++){const m=(lo+hi)/2;const Pm=psat(m);const Ws=RRv*Pm/(P-Pm);
      const Wc=((2501-2.326*m)*Ws-1.006*(Tdb-m))/(2501+1.86*Tdb-4.186*m);if(Wc>W)hi=m;else lo=m;}
    return {P,Tdb,W,Pv,Psat:Ps,RH,Tdp,Twb:(lo+hi)/2,h,v,rho};
  }
  function fromRH(P,Tdb,rh){const Pv=rh/100*psat(Tdb);return fromW(P,Tdb,RRv*Pv/(P-Pv));}
  function fromTdp(P,Tdb,Tdp){const Pv=psat(Tdp);return fromW(P,Tdb,RRv*Pv/(P-Pv));}
  function fromTwb(P,Tdb,Twb){const Ps=psat(Twb),Ws=RRv*Ps/(P-Ps);
    const W=((2501-2.326*Twb)*Ws-1.006*(Tdb-Twb))/(2501+1.86*Tdb-4.186*Twb);return fromW(P,Tdb,W);}
  function fromH(P,Tdb,h){return fromW(P,Tdb,(h-1.006*Tdb)/(2501+1.86*Tdb));}
  function altP(z){return 101.325*Math.pow(1-2.25577e-5*z,5.25588);}
  function second(P,Tdb,mode,val){return mode==='rh'?fromRH(P,Tdb,val):mode==='twb'?fromTwb(P,Tdb,val):fromTdp(P,Tdb,val);}
  return {psat,invPsat,fromW,fromRH,fromTdp,fromTwb,fromH,altP,second,RR:RRv};
})();
VP.psy=PSY;

function psyChart(host,P,pts){
  host.innerHTML='';const c=document.createElement('canvas');c.width=760;c.height=480;
  c.style.width='100%';c.style.maxWidth='600px';c.style.background='#0b1120';
  c.style.border='1px solid rgba(255,255,255,.10)';c.style.borderRadius='10px';host.appendChild(c);
  const ctx=c.getContext('2d'),Wd=c.width,H=c.height,pad=58,Tmin=0,Tmax=50,Wmax=0.030;
  const sx=t=>pad+(t-Tmin)/(Tmax-Tmin)*(Wd-pad-40);
  const sy=w=>H-pad-w/Wmax*(H-pad-22);
  ctx.clearRect(0,0,Wd,H);ctx.font='13px sans-serif';ctx.strokeStyle='#1b2638';ctx.fillStyle='#9aa7bd';ctx.lineWidth=1;
  for(let t=Tmin;t<=Tmax;t+=5){ctx.beginPath();ctx.moveTo(sx(t),sy(0));ctx.lineTo(sx(t),sy(Wmax));ctx.stroke();ctx.fillText(t,sx(t)-6,H-pad+18);}
  for(let g=0;g<=30;g+=5){ctx.beginPath();ctx.moveTo(sx(Tmin),sy(g/1000));ctx.lineTo(sx(Tmax),sy(g/1000));ctx.stroke();ctx.fillText(g,sx(Tmax)+10,sy(g/1000)+4);}
  [10,20,40,60,80,100].forEach(rh=>{
    ctx.strokeStyle=rh===100?'#2de2c0':'rgba(79,141,255,.45)';ctx.lineWidth=rh===100?2.5:1;ctx.beginPath();let st=false;
    for(let t=Tmin;t<=Tmax;t+=0.5){const Pv=rh/100*PSY.psat(t);const w=PSY.RR*Pv/(P-Pv);if(w>Wmax){st=false;continue;}
      const X=sx(t),Y=sy(w);st?ctx.lineTo(X,Y):ctx.moveTo(X,Y);st=true;}
    ctx.stroke();
    const Pv=rh/100*PSY.psat(Tmax);const w=PSY.RR*Pv/(P-Pv);
    if(w<=Wmax){ctx.fillStyle=rh===100?'#2de2c0':'#6f8bb5';ctx.fillText(rh+'%',sx(Tmax)-34,sy(w)-4);}
  });
  ctx.fillStyle='#c7d3e6';ctx.fillText('Dry-bulb temperature (°C)',Wd/2-78,H-12);
  ctx.save();ctx.translate(16,H/2+74);ctx.rotate(-Math.PI/2);ctx.fillText('Humidity ratio W (g/kg dry air)',0,0);ctx.restore();
  (pts||[]).forEach(p=>{if(p.W>Wmax||p.Tdb>Tmax)return;const X=sx(p.Tdb),Y=sy(p.W);
    ctx.fillStyle=p.color||'#ffc24b';ctx.beginPath();ctx.arc(X,Y,6,0,7);ctx.fill();
    ctx.strokeStyle='#0b1120';ctx.lineWidth=2;ctx.stroke();
    if(p.label){ctx.fillStyle='#eef2f8';ctx.fillText(p.label,X+10,Y+4);}});
}

function ptabs(el,head,desc,tabs){
  let h=pageHead(head,desc)+'<div class="tabs">';
  tabs.forEach((t,i)=>h+=`<div class="tab ${i===0?'active':''}" data-k="${t.k}">${t.label}</div>`);
  h+='</div>';
  tabs.forEach((t,i)=>h+=`<div class="tabcard" data-c="${t.k}" style="${i?'display:none':''}"></div>`);
  el.innerHTML=h;
  const bars=el.querySelectorAll('.tab'),cs=el.querySelectorAll('.tabcard');
  bars.forEach(b=>b.onclick=()=>{bars.forEach(x=>x.classList.remove('active'));b.classList.add('active');
    cs.forEach(c=>c.style.display=c.dataset.c===b.dataset.k?'':'none');});
  tabs.forEach(t=>t.setup(el.querySelector('.tabcard[data-c="'+t.k+'"]')));
}

VP.tools.push({id:'psychro',title:'Psychrometrics',icon:'💧',group:'Thermo',
 desc:'Moist-air state, chart, HVAC loads, mixing, drying',
 render(el){ ptabs(el,'Psychrometrics & HVAC','Moist-air properties, an interactive psychrometric chart, and air-process calculations.',[

  {k:'state',label:'Air state',setup(box){
    box.innerHTML=card('Moist-air state','Dry-bulb + one second variable at a given pressure.','<div id="psySt"></div>');
    VP.calcForm(el.querySelector('#psySt'),{inputs:[
      {id:'P',label:'Total pressure',unit:'kPa',val:101.325},
      {id:'Tdb',label:'Dry-bulb temperature',unit:'°C',val:30},
      {id:'mode',label:'Second variable',type:'select',val:'rh',options:[{v:'rh',t:'Relative humidity %'},{v:'twb',t:'Wet-bulb °C'},{v:'tdp',t:'Dew point °C'}]},
      {id:'sv',label:'Value of second variable',val:50}
    ],compute(v){
      if(v.mode==='rh'&&(v.sv<0||v.sv>100))throw new Error('RH must be 0–100%');
      const s=PSY.second(v.P,v.Tdb,v.mode,v.sv);
      return {results:[
        {label:'Relative humidity',value:s.RH,unit:'%',digits:1},
        {label:'Humidity ratio W',value:s.W*1000,unit:'g/kg dry',digits:2},
        {label:'Wet-bulb temp',value:s.Twb,unit:'°C',digits:2},
        {label:'Dew point',value:s.Tdp,unit:'°C',digits:2},
        {label:'Enthalpy',value:s.h,unit:'kJ/kg dry',digits:2},
        {label:'Vapour pressure',value:s.Pv,unit:'kPa',digits:4},
        {label:'Specific volume',value:s.v,unit:'m³/kg dry',digits:4},
        {label:'Density',value:s.rho,unit:'kg/m³',digits:4}
      ],notes:[{text:'Per kg of dry air (ASHRAE convention). Open the Chart tab to plot this point.'}]};
    }});
  }},

  {k:'chart',label:'Chart',setup(box){
    box.innerHTML=card('Psychrometric chart','Plots your air state on the RH curves.',
      `<div class="grid3">
        <div class="field"><label>Pressure <span class="unit">(kPa)</span></label><input id="pcP" type="number" step="any" value="101.325"></div>
        <div class="field"><label>Dry-bulb <span class="unit">(°C)</span></label><input id="pcT" type="number" step="any" value="30"></div>
        <div class="field"><label>Relative humidity <span class="unit">(%)</span></label><input id="pcR" type="number" step="any" value="50"></div>
      </div><div class="btn-row"><button class="btn" id="pcGo">Plot</button></div>
      <div id="pcChart" style="margin-top:12px"></div><div class="res-grid" id="pcRes" style="margin-top:12px"></div>`);
    const draw=()=>{
      const P=num(el.querySelector('#pcP').value)||101.325,T=num(el.querySelector('#pcT').value)||30,R=num(el.querySelector('#pcR').value)||50;
      const s=PSY.fromRH(P,T,R);
      psyChart(el.querySelector('#pcChart'),P,[{Tdb:T,W:s.W,label:T+'°C / '+R+'%',color:'#ffc24b'}]);
      el.querySelector('#pcRes').innerHTML=
        [['W',fmt(s.W*1000,2)+' g/kg'],['Wet-bulb',fmt(s.Twb,1)+' °C'],['Dew point',fmt(s.Tdp,1)+' °C'],['Enthalpy',fmt(s.h,1)+' kJ/kg']]
        .map(t=>'<div class="res"><div class="rl">'+t[0]+'</div><div class="rv" style="font-size:16px">'+t[1]+'</div></div>').join('');
    };
    el.querySelector('#pcGo').onclick=draw; draw();
  }},

  {k:'alt',label:'Altitude → P',setup(box){
    box.innerHTML=card('Altitude to pressure','Barometric pressure vs elevation (ISA model).','<div id="psAlt"></div>');
    VP.calcForm(el.querySelector('#psAlt'),{inputs:[{id:'z',label:'Altitude / elevation',unit:'m',val:1000}],
      compute(v){const P=PSY.altP(v.z);return {results:[
        {label:'Atmospheric pressure',value:P,unit:'kPa',digits:3},
        {label:'Pressure',value:P/101.325,unit:'atm',digits:4},
        {label:'Pressure',value:P*10,unit:'mbar',digits:1}
      ],notes:[{text:'P = 101.325·(1 − 2.25577e−5·z)^5.2559. Use this P in the other tabs when working at altitude.'}]};}});
  }},

  {k:'hc',label:'Heat / Cool',setup(box){
    box.innerHTML=card('Sensible heating / cooling','Heating or cooling at constant humidity ratio (no moisture added/removed).','<div id="psHC"></div>');
    VP.calcForm(el.querySelector('#psHC'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'V',label:'Air flow',unit:'m³/s',val:1},
      {id:'T1',label:'Inlet dry-bulb',unit:'°C',val:15},
      {id:'R1',label:'Inlet RH',unit:'%',val:60},
      {id:'T2',label:'Outlet dry-bulb',unit:'°C',val:35}
    ],compute(v){
      const s1=PSY.fromRH(v.P,v.T1,v.R1),mda=v.V/s1.v,s2=PSY.fromW(v.P,v.T2,s1.W),Q=mda*(s2.h-s1.h);
      return {results:[
        {label:'Dry-air mass flow',value:mda,unit:'kg/s',digits:3},
        {label:Q>=0?'Heating duty':'Cooling duty',value:Math.abs(Q),unit:'kW',digits:2},
        {label:'Outlet RH',value:s2.RH,unit:'%',digits:1},
        {label:'Outlet W',value:s2.W*1000,unit:'g/kg',digits:2}
      ],notes:[{text:'Sensible process: W constant, Q = ṁ_da·(h₂−h₁). RH falls on heating, rises on cooling.'}]};
    }});
  }},

  {k:'mix',label:'Mix streams',setup(box){
    box.innerHTML=card('Adiabatic mixing of two air streams','','<div id="psMix"></div>');
    VP.calcForm(el.querySelector('#psMix'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'V1',label:'Stream 1 flow',unit:'m³/s',val:1},
      {id:'T1',label:'Stream 1 Tdb',unit:'°C',val:30},
      {id:'R1',label:'Stream 1 RH',unit:'%',val:40},
      {id:'V2',label:'Stream 2 flow',unit:'m³/s',val:2},
      {id:'T2',label:'Stream 2 Tdb',unit:'°C',val:15},
      {id:'R2',label:'Stream 2 RH',unit:'%',val:80}
    ],compute(v){
      const a=PSY.fromRH(v.P,v.T1,v.R1),b=PSY.fromRH(v.P,v.T2,v.R2);
      const m1=v.V1/a.v,m2=v.V2/b.v,m=m1+m2;
      const W3=(m1*a.W+m2*b.W)/m,h3=(m1*a.h+m2*b.h)/m,T3=(h3-W3*2501)/(1.006+1.86*W3),s3=PSY.fromW(v.P,T3,W3);
      return {results:[
        {label:'Mixed dry-bulb',value:T3,unit:'°C',digits:2},
        {label:'Mixed RH',value:s3.RH,unit:'%',digits:1},
        {label:'Mixed W',value:W3*1000,unit:'g/kg',digits:2},
        {label:'Mixed enthalpy',value:h3,unit:'kJ/kg',digits:2},
        {label:'Total dry-air flow',value:m,unit:'kg/s',digits:3}
      ],notes:[{text:'Mass-weighted on dry air: W₃,h₃ = Σ(ṁ·W or h)/Σṁ; outlet T from h₃,W₃.'}]};
    }});
  }},

  {k:'hum',label:'Humidify',setup(box){
    box.innerHTML=card('Adiabatic (evaporative) humidification','Spray water at constant enthalpy → air cools & humidifies toward the target RH.','<div id="psHum"></div>');
    VP.calcForm(el.querySelector('#psHum'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'T1',label:'Inlet dry-bulb',unit:'°C',val:35},
      {id:'R1',label:'Inlet RH',unit:'%',val:20},
      {id:'R2',label:'Target outlet RH',unit:'%',val:80}
    ],compute(v){
      if(v.R2<=v.R1)throw new Error('Target RH must exceed inlet RH.');
      const s1=PSY.fromRH(v.P,v.T1,v.R1);let lo=s1.Twb,hi=v.T1;
      for(let i=0;i<70;i++){const m=(lo+hi)/2;if(PSY.fromH(v.P,m,s1.h).RH>v.R2)lo=m;else hi=m;}
      const T2=(lo+hi)/2,s2=PSY.fromH(v.P,T2,s1.h);
      return {results:[
        {label:'Outlet dry-bulb',value:T2,unit:'°C',digits:2},
        {label:'Air cooled by',value:v.T1-T2,unit:'°C',digits:2},
        {label:'Outlet W',value:s2.W*1000,unit:'g/kg',digits:2},
        {label:'Water added',value:(s2.W-s1.W)*1000,unit:'g/kg dry',digits:2},
        {label:'Wet-bulb (≈const)',value:s1.Twb,unit:'°C',digits:2}
      ],notes:[{text:'Evaporative cooling follows a constant wet-bulb / enthalpy line; the limit is saturation at the wet-bulb temperature.'}]};
    }});
  }},

  {k:'dry',label:'Drying',setup(box){
    box.innerHTML=card('Air drying duty','Heated air picks up moisture from a wet product.','<div id="psDry"></div>');
    VP.calcForm(el.querySelector('#psDry'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'V',label:'Air flow',unit:'m³/s',val:2},
      {id:'T1',label:'Inlet Tdb (hot air)',unit:'°C',val:80},
      {id:'R1',label:'Inlet RH',unit:'%',val:5},
      {id:'T2',label:'Outlet Tdb',unit:'°C',val:45},
      {id:'R2',label:'Outlet RH',unit:'%',val:60}
    ],compute(v){
      const s1=PSY.fromRH(v.P,v.T1,v.R1),s2=PSY.fromRH(v.P,v.T2,v.R2),mda=v.V/s1.v,water=mda*(s2.W-s1.W);
      return {results:[
        {label:'Dry-air flow',value:mda,unit:'kg/s',digits:3},
        {label:'Water evaporated',value:water*3600,unit:'kg/h',digits:1},
        {label:'Inlet W',value:s1.W*1000,unit:'g/kg',digits:2},
        {label:'Outlet W',value:s2.W*1000,unit:'g/kg',digits:2}
      ],notes:[{text:'Moisture removed from product = dry-air flow × gain in humidity ratio (W_out − W_in).'}]};
    }});
  }},

  {k:'hvac',label:'HVAC load',setup(box){
    box.innerHTML=
      card('Sensible & latent cooling load','From supply-air flow and the room vs supply-air conditions.','<div id="psLoad"></div>')
     +card('Cooling coil / dehumidification','Cooling below the dew point condenses water on the coil.','<div id="psCoil"></div>');
    VP.calcForm(el.querySelector('#psLoad'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'V',label:'Supply air flow',unit:'m³/s',val:1},
      {id:'Tr',label:'Room Tdb',unit:'°C',val:24},
      {id:'Rr',label:'Room RH',unit:'%',val:50},
      {id:'Ts',label:'Supply Tdb',unit:'°C',val:14},
      {id:'Rs',label:'Supply RH',unit:'%',val:90}
    ],compute(v){
      const room=PSY.fromRH(v.P,v.Tr,v.Rr),sup=PSY.fromRH(v.P,v.Ts,v.Rs),mda=v.V/sup.v;
      const Qs=mda*(1.006+1.86*sup.W)*(v.Tr-v.Ts),Ql=mda*2501*(room.W-sup.W),Qt=mda*(room.h-sup.h);
      return {results:[
        {label:'Dry-air flow',value:mda,unit:'kg/s',digits:3},
        {label:'Sensible load',value:Qs,unit:'kW',digits:2},
        {label:'Latent load',value:Ql,unit:'kW',digits:2},
        {label:'Total load',value:Qt,unit:'kW',digits:2},
        {label:'Sensible heat ratio',value:Qt!==0?Qs/Qt:0,unit:'',digits:3}
      ],notes:[{text:'Qs = ṁ_da·cp·ΔT ; Ql = ṁ_da·hfg·ΔW ; SHR = Qs/Q_total.'}]};
    }});
    VP.calcForm(el.querySelector('#psCoil'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'V',label:'Air flow',unit:'m³/s',val:1},
      {id:'T1',label:'Inlet Tdb',unit:'°C',val:30},
      {id:'R1',label:'Inlet RH',unit:'%',val:60},
      {id:'T2',label:'Coil outlet Tdb',unit:'°C',val:12},
      {id:'R2',label:'Outlet RH',unit:'%',val:95}
    ],compute(v){
      const s1=PSY.fromRH(v.P,v.T1,v.R1),s2=PSY.fromRH(v.P,v.T2,v.R2),mda=v.V/s1.v;
      const Qt=mda*(s1.h-s2.h),dW=Math.max(0,s1.W-s2.W),cond=mda*dW;
      const Qs=mda*(1.006+1.86*(s1.W+s2.W)/2)*(v.T1-v.T2),Ql=Math.max(0,Qt-Qs);
      return {results:[
        {label:'Total cooling',value:Qt,unit:'kW',digits:2},
        {label:'Sensible',value:Qs,unit:'kW',digits:2},
        {label:'Latent',value:Ql,unit:'kW',digits:2},
        {label:'Condensate',value:cond*3600,unit:'kg/h',digits:2},
        {label:'Dehumidifying?',value:dW>1e-6?'Yes':'No (sensible only)',unit:'',digits:0}
      ],notes:[{text:'If the coil surface is below the inlet dew point, moisture condenses: condensate = ṁ_da·(W_in − W_out).'}]};
    }});
  }},

  {k:'ctower',label:'Cooling tower',setup(box){
    box.innerHTML=card('Cooling tower','Evaporative cooling of water by ambient air.','<div id="psCT"></div>');
    VP.calcForm(el.querySelector('#psCT'),{cols:2,inputs:[
      {id:'Twin',label:'Water inlet temp',unit:'°C',val:40},
      {id:'Twout',label:'Water outlet temp',unit:'°C',val:30},
      {id:'Twb',label:'Ambient wet-bulb',unit:'°C',val:24},
      {id:'flow',label:'Water flow',unit:'m³/h',val:100}
    ],compute(v){
      if(v.Twout<=v.Twb)throw new Error('Outlet water must be above the ambient wet-bulb (approach > 0).');
      const range=v.Twin-v.Twout, approach=v.Twout-v.Twb, eff=range/(range+approach);
      const mw=v.flow*1000/3600, Q=mw*4.18*range, evap=Q/2450;
      return {results:[
        {label:'Range',value:range,unit:'°C',digits:2},
        {label:'Approach',value:approach,unit:'°C',digits:2},
        {label:'Tower effectiveness',value:eff*100,unit:'%',digits:1},
        {label:'Heat rejected',value:Q,unit:'kW',digits:1},
        {label:'Evaporation loss',value:evap*3.6,unit:'m³/h',digits:3},
        {label:'Evaporation',value:evap*3.6/v.flow*100,unit:'% of flow',digits:2}
      ],notes:[{text:'Range = T_in − T_out; Approach = T_out − T_wb (limited by the wet-bulb). Effectiveness = Range/(Range+Approach). Evaporation ≈ heat rejected / latent heat (~2450 kJ/kg); add drift & blowdown for total make-up.'}]};
    }});
  }},

  {k:'fresh',label:'Fresh air',setup(box){
    box.innerHTML=card('Outdoor-air (fresh-air) mixing','Blend outdoor and return air; ventilation load.','<div id="psFA"></div>');
    VP.calcForm(el.querySelector('#psFA'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'V',label:'Total supply flow',unit:'m³/s',val:1},
      {id:'oa',label:'Outdoor-air fraction',unit:'%',val:30},
      {id:'To',label:'Outdoor Tdb',unit:'°C',val:33},
      {id:'RHo',label:'Outdoor RH',unit:'%',val:55},
      {id:'Tr',label:'Return Tdb',unit:'°C',val:24},
      {id:'RHr',label:'Return RH',unit:'%',val:50}
    ],compute(v){
      const so=PSY.fromRH(v.P,v.To,v.RHo), sr=PSY.fromRH(v.P,v.Tr,v.RHr);
      const Vo=v.V*v.oa/100, Vr=v.V-Vo, mo=Vo/so.v, mr=Vr/sr.v, m=mo+mr;
      const W=(mo*so.W+mr*sr.W)/m, h=(mo*so.h+mr*sr.h)/m, T=(h-W*2501)/(1.006+1.86*W), s=PSY.fromW(v.P,T,W);
      const oaLoad=mo*(so.h-sr.h);
      return {results:[
        {label:'Mixed dry-bulb',value:T,unit:'°C',digits:2},
        {label:'Mixed RH',value:s.RH,unit:'%',digits:1},
        {label:'Mixed humidity W',value:W*1000,unit:'g/kg',digits:2},
        {label:'Total dry-air flow',value:m,unit:'kg/s',digits:3},
        {label:'Outdoor-air ventilation load',value:oaLoad,unit:'kW',digits:2}
      ],notes:[{text:'Mass-weighted mix of outdoor and return air at the chosen OA fraction. The ventilation load is the extra enthalpy the coil must handle because outdoor air differs from return air.'}]};
    }});
  }},

  {k:'rshf',label:'RSHF',setup(box){
    box.innerHTML=card('Room sensible heat factor','RSHF and the required supply-air condition.','<div id="psRSHF"></div>');
    VP.calcForm(el.querySelector('#psRSHF'),{cols:2,inputs:[
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'Qs',label:'Room sensible load',unit:'kW',val:10},
      {id:'Ql',label:'Room latent load',unit:'kW',val:3},
      {id:'Tr',label:'Room Tdb',unit:'°C',val:24},
      {id:'RHr',label:'Room RH',unit:'%',val:50},
      {id:'Ts',label:'Supply Tdb',unit:'°C',val:14}
    ],compute(v){
      if(v.Ts>=v.Tr)throw new Error('Supply air must be cooler than the room.');
      const rshf=v.Qs/(v.Qs+v.Ql), room=PSY.fromRH(v.P,v.Tr,v.RHr);
      const mda=v.Qs/((1.006+1.86*room.W)*(v.Tr-v.Ts));
      const Ws=room.W-v.Ql/(mda*2501), sup=PSY.fromW(v.P,v.Ts,Math.max(0,Ws));
      return {results:[
        {label:'RSHF',value:rshf,unit:'',digits:3},
        {label:'Supply dry-air flow',value:mda,unit:'kg/s',digits:3},
        {label:'Supply volume flow',value:mda*sup.v,unit:'m³/s',digits:3},
        {label:'Supply humidity W',value:Ws*1000,unit:'g/kg',digits:2},
        {label:'Supply RH',value:sup.RH,unit:'%',digits:1}
      ],notes:[{text:'RSHF = Q_sensible/(Q_sensible+Q_latent). Supply flow from the sensible balance ṁ = Q_s/(cp·ΔT); supply humidity from the latent balance. The room line on the psychrometric chart has slope set by RSHF.'}]};
    }});
  }}

 ]); }});

/* =========================================================
   3. PIPE SIZING & PRESSURE DROP
========================================================= */
VP.tools.push({id:'pipe',title:'Pipe Sizing & ΔP',icon:'🛢️',group:'Fluids',
 desc:'Diameter from velocity, Darcy–Weisbach pressure drop',
 render(el){
  el.innerHTML = pageHead('Pipe Sizing & Pressure Drop','Size a line from target velocity, or compute pressure drop with the Darcy–Weisbach equation.')
   +`<div class="tabs"><div class="tab active" data-t="size">Size from velocity</div><div class="tab" data-t="dp">Pressure drop</div><div class="tab" data-t="minor">Minor losses</div><div class="tab" data-t="vel">Velocity table</div><div class="tab" data-t="gas">Compressible gas</div></div>`
   + card('Diameter sizing','Find required inside diameter for a target fluid velocity.','<div id="sizer"></div>')
   + `<div id="dpcard" style="display:none">`+card('Pressure drop','Darcy–Weisbach with Colebrook friction factor.','<div id="dp"></div>')+`</div>`
   + `<div id="minorcard" style="display:none">`+card('Minor (fitting) losses','Add up fitting K-values → head loss and ΔP.','<div id="minor"></div>')+`</div>`
   + `<div id="velcard" style="display:none">`+card('Velocity vs pipe size (Sch-40)','Velocity in each standard pipe at your flow, vs recommended ranges.',`<div class="field" style="max-width:240px"><label>Volumetric flow <span class="unit">(m³/h)</span></label><input id="vt_Q" type="number" step="any" value="50"></div><div id="vt_out" style="margin-top:10px"></div>`)+`</div>`
   + `<div id="gascard" style="display:none">`+card('Compressible gas ΔP','Isothermal compressible flow in a pipe.','<div id="gaspd"></div>')+`</div>`;
  const tabs=el.querySelectorAll('.tab');
  tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    el.querySelector('.card').style.display=t.dataset.t==='size'?'':'none';
    el.querySelector('#dpcard').style.display=t.dataset.t==='dp'?'':'none';
    el.querySelector('#minorcard').style.display=t.dataset.t==='minor'?'':'none';
    el.querySelector('#velcard').style.display=t.dataset.t==='vel'?'':'none';
    el.querySelector('#gascard').style.display=t.dataset.t==='gas'?'':'none';});

  VP.calcForm(el.querySelector('#sizer'),{
    inputs:[
      {id:'Q',label:'Volumetric flow',unit:'m³/h',val:50},
      {id:'vel',label:'Target velocity',unit:'m/s',val:2.0}
    ],
    formula:'Recommended velocities — liquid pump lines 1–3 m/s, pump suction 0.5–1.5 m/s, gas 10–30 m/s.',
    compute(v){
      const Qs=v.Q/3600;
      const A=Qs/v.vel;
      const D=Math.sqrt(4*A/Math.PI);
      // next schedule 40
      let pick=null;
      for(const k in VP.sch40){ if(VP.sch40[k]/1000>=D){pick=k+' (ID '+VP.sch40[k]+' mm)';break;} }
      const Dpick = pick? VP.sch40[Object.keys(VP.sch40).find(k=>k+' (ID '+VP.sch40[k]+' mm)'===pick)]/1000 : D;
      const vAct = Qs/(Math.PI/4*Dpick*Dpick);
      return {results:[
        {label:'Required area',value:A*1e4,unit:'cm²',digits:2},
        {label:'Required ID',value:D*1000,unit:'mm',digits:1},
        {label:'Next Sch-40 size',value:pick?parseFloat(VP.sch40[Object.keys(VP.sch40).find(k=>(k+' (ID '+VP.sch40[k]+' mm)')===pick)]):D*1000,unit:'mm ID',digits:1},
        {label:'Actual velocity in that pipe',value:vAct,unit:'m/s',digits:2}
      ],notes:[{text: pick? 'Suggested standard pipe: '+pick : 'Flow exceeds 12" Sch-40 — use a larger/parallel line.'}]};
    }
  });

  VP.calcForm(el.querySelector('#dp'),{
    inputs:[
      {id:'Q',label:'Volumetric flow',unit:'m³/h',val:50},
      {id:'D',label:'Inside diameter',unit:'mm',val:52.5},
      {id:'L',label:'Pipe length (incl. equivalent)',unit:'m',val:100},
      {id:'fluid',label:'Fluid',type:'select',val:'Water (20°C)',options:Object.keys(VP.fluids).map(k=>({v:k,t:k}))},
      {id:'rho',label:'Density (if Custom)',unit:'kg/m³',val:998},
      {id:'mu',label:'Viscosity (if Custom)',unit:'Pa·s',val:0.001},
      {id:'rough',label:'Pipe material',type:'select',val:'Commercial steel',options:Object.keys(VP.roughness).map(k=>({v:k,t:k}))}
    ],
    compute(v){
      const fl=VP.fluids[v.fluid];
      const rho = v.fluid==='Custom'?v.rho:fl.rho;
      const mu = v.fluid==='Custom'?v.mu:fl.mu;
      const D=v.D/1000, Qs=v.Q/3600;
      const A=Math.PI/4*D*D, vel=Qs/A;
      const Re=rho*vel*D/mu;
      const eD=VP.roughness[v.rough]/D;
      const f=VP.frictionFactor(Re,eD);
      const dP=f*(v.L/D)*(rho*vel*vel/2);  // Pa
      const hL=dP/(rho*VP.g);
      return {results:[
        {label:'Velocity',value:vel,unit:'m/s',digits:2},
        {label:'Reynolds number',value:Re,unit:'',digits:0},
        {label:'Flow regime',value:Re<2300?'Laminar':(Re<4000?'Transition':'Turbulent'),unit:'',digits:0},
        {label:'Friction factor f',value:f,unit:'',digits:4},
        {label:'Pressure drop',value:dP/1000,unit:'kPa',digits:2},
        {label:'Pressure drop',value:dP/1e5,unit:'bar',digits:4},
        {label:'Head loss',value:hL,unit:'m fluid',digits:2}
      ],notes:[{text:'Darcy friction factor from Colebrook–White (turbulent) or 64/Re (laminar). Include fittings as equivalent length in L.'}]};
    }
  });

  const KVAL={elbow90:0.75,elbow45:0.4,teeRun:0.4,teeBranch:1.0,gate:0.17,globe:10,ball:0.05,check:2.0,entry:0.5,exit:1.0};
  VP.calcForm(el.querySelector('#minor'),{cols:2,inputs:[
    {id:'v',label:'Velocity',unit:'m/s',val:2},
    {id:'rho',label:'Density',unit:'kg/m³',val:998},
    {id:'elbow90',label:'90° elbows (K=0.75)',unit:'qty',val:2},
    {id:'elbow45',label:'45° elbows (K=0.4)',unit:'qty',val:0},
    {id:'teeRun',label:'Tee, run (K=0.4)',unit:'qty',val:0},
    {id:'teeBranch',label:'Tee, branch (K=1.0)',unit:'qty',val:0},
    {id:'gate',label:'Gate valves (K=0.17)',unit:'qty',val:1},
    {id:'globe',label:'Globe valves (K=10)',unit:'qty',val:0},
    {id:'ball',label:'Ball valves (K=0.05)',unit:'qty',val:0},
    {id:'check',label:'Check valves (K=2.0)',unit:'qty',val:1},
    {id:'entry',label:'Pipe entrance (K=0.5)',unit:'qty',val:1},
    {id:'exit',label:'Pipe exit (K=1.0)',unit:'qty',val:1}
  ],compute(v){
    const K=v.elbow90*KVAL.elbow90+v.elbow45*KVAL.elbow45+v.teeRun*KVAL.teeRun+v.teeBranch*KVAL.teeBranch
      +v.gate*KVAL.gate+v.globe*KVAL.globe+v.ball*KVAL.ball+v.check*KVAL.check+v.entry*KVAL.entry+v.exit*KVAL.exit;
    const hL=K*v.v*v.v/(2*VP.g), dP=v.rho*K*v.v*v.v/2;
    return {results:[
      {label:'Total resistance ΣK',value:K,unit:'',digits:2},
      {label:'Head loss',value:hL,unit:'m fluid',digits:3},
      {label:'Pressure drop',value:dP/1000,unit:'kPa',digits:3},
      {label:'Pressure drop',value:dP/1e5,unit:'bar',digits:5}
    ],notes:[{text:'Minor loss: h_L = ΣK·v²/(2g) ; ΔP = ρ·ΣK·v²/2. K-values shown are typical — use the manufacturer’s K (or Cv) for valves. Add this to the straight-pipe Darcy loss.'}]};
  }});

  function velTable(){
    const Q=num(el.querySelector('#vt_Q').value)||0, Qs=Q/3600;
    let t='<div class="table-wrap"><table class="data"><thead><tr><th>Nominal</th><th>ID (mm)</th><th>Velocity (m/s)</th><th>Suitability</th></tr></thead><tbody>';
    Object.keys(VP.sch40).forEach(k=>{const ID=VP.sch40[k]/1000, vv=Qs/(Math.PI/4*ID*ID);
      const tag=vv<0.9?'⬇ low (<0.9)':(vv>3?'⬆ high (>3)':'✓ ok 0.9–3');
      t+=`<tr><td>${k}</td><td>${VP.sch40[k]}</td><td>${fmt(vv,2)}</td><td>${tag}</td></tr>`;});
    t+='</tbody></table></div><div class="note">Recommended liquid velocities: pump discharge 1–3 m/s, pump suction 0.5–1.5 m/s, gravity/drain 0.5–1 m/s, gas 10–30 m/s. Pick the smallest pipe that stays in range.</div>';
    el.querySelector('#vt_out').innerHTML=t;
  }
  el.querySelector('#vt_Q').oninput=velTable; velTable();

  VP.calcForm(el.querySelector('#gaspd'),{cols:2,inputs:[
    {id:'W',label:'Gas mass flow',unit:'kg/h',val:1000},
    {id:'D',label:'Inside diameter',unit:'mm',val:100},
    {id:'L',label:'Pipe length',unit:'m',val:100},
    {id:'P1',label:'Inlet pressure (abs)',unit:'kPa',val:500},
    {id:'T',label:'Temperature',unit:'°C',val:25},
    {id:'M',label:'Molar mass',unit:'g/mol',val:29},
    {id:'f',label:'Darcy friction factor',unit:'',val:0.02}
  ],compute(v){
    const D=v.D/1000, A=Math.PI/4*D*D, G=v.W/3600/A, RM=8314/v.M, T=v.T+273.15, P1=v.P1*1000;
    const term=v.f*(v.L/D)*G*G*RM*T;
    if(term>=P1*P1)throw new Error('Choked / too much loss — increase diameter or inlet pressure.');
    const P2=Math.sqrt(P1*P1-term), rho1=P1*v.M/1000/(8.314*T), vel=G/rho1;
    return {results:[
      {label:'Mass flux G',value:G,unit:'kg/m²·s',digits:2},
      {label:'Inlet velocity',value:vel,unit:'m/s',digits:2},
      {label:'Outlet pressure',value:P2/1000,unit:'kPa',digits:2},
      {label:'Pressure drop',value:(P1-P2)/1000,unit:'kPa',digits:2},
      {label:'ΔP / P₁',value:(P1-P2)/P1*100,unit:'%',digits:1}
    ],notes:[{text:'Isothermal compressible flow: P₁² − P₂² = f·(L/D)·G²·(R/M)·T (acceleration term neglected). Valid for ΔP/P₁ up to ~30–40%; above that use a rigorous compressible method.'}]};
  }});
 }});

/* =========================================================
   4. PUMP HEAD & POWER
========================================================= */
const STD_MOTORS=[0.37,0.55,0.75,1.1,1.5,2.2,3,4,5.5,7.5,11,15,18.5,22,30,37,45,55,75,90,110,132,160,200,250,315,355,400];
function pickMotor(shaftkW){const target=shaftkW*1.15;let m=STD_MOTORS.find(x=>x>=target);if(!m)m=Math.ceil(shaftkW*1.2);return m;}
function pumpPlot(host,d){
  host.innerHTML='';const c=document.createElement('canvas');c.width=760;c.height=440;
  c.style.width='100%';c.style.maxWidth='600px';c.style.background='#0b1120';
  c.style.border='1px solid rgba(255,255,255,.10)';c.style.borderRadius='10px';host.appendChild(c);
  const ctx=c.getContext('2d'),W=c.width,H=c.height,pL=64,pR=64,pB=56,pT=24;
  const Qmax=d.Qmax,Hmax=d.Hmax;
  const sx=q=>pL+q/Qmax*(W-pL-pR);
  const syH=h=>H-pB-h/Hmax*(H-pB-pT);
  const syE=e=>H-pB-e/100*(H-pB-pT);
  ctx.clearRect(0,0,W,H);ctx.font='13px sans-serif';ctx.strokeStyle='#1b2638';ctx.lineWidth=1;
  for(let i=0;i<=10;i++){const gx=pL+(W-pL-pR)*i/10;ctx.beginPath();ctx.moveTo(gx,pT);ctx.lineTo(gx,H-pB);ctx.stroke();}
  for(let i=0;i<=5;i++){const gy=pT+(H-pB-pT)*i/5;ctx.beginPath();ctx.moveTo(pL,gy);ctx.lineTo(W-pR,gy);ctx.stroke();
    ctx.fillStyle='#4f8dff';ctx.fillText((Hmax*(1-i/5)).toFixed(0),6,gy+4);
    ctx.fillStyle='#2de2c0';ctx.fillText((100*(1-i/5)).toFixed(0),W-pR+8,gy+4);}
  ctx.fillStyle='#9aa7bd';for(let i=0;i<=5;i++){const q=Qmax*i/5;ctx.fillText(q.toFixed(0),sx(q)-10,H-pB+18);}
  ctx.strokeStyle='#4f8dff';ctx.lineWidth=3;ctx.beginPath();
  for(let i=0;i<=100;i++){const q=Qmax*i/100,h=d.head(q),X=sx(q),Y=syH(Math.max(0,h));i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}ctx.stroke();
  ctx.strokeStyle='#ff6b81';ctx.lineWidth=2;ctx.setLineDash([7,6]);ctx.beginPath();
  for(let i=0;i<=100;i++){const q=Qmax*i/100,h=d.sys(q),X=sx(q),Y=syH(Math.max(0,h));i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);}ctx.stroke();ctx.setLineDash([]);
  ctx.strokeStyle='#2de2c0';ctx.lineWidth=2;ctx.beginPath();let started=false;
  for(let i=0;i<=100;i++){const q=Qmax*i/100,e=d.eff(q);if(e<0){started=false;continue;}const X=sx(q),Y=syE(e);started?ctx.lineTo(X,Y):ctx.moveTo(X,Y);started=true;}ctx.stroke();
  if(d.Qop>0&&d.Qop<Qmax){const X=sx(d.Qop),Y=syH(d.Hop);ctx.fillStyle='#ffc24b';ctx.beginPath();ctx.arc(X,Y,7,0,7);ctx.fill();
    ctx.strokeStyle='#0b1120';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle='#eef2f8';ctx.fillText('Operating point',X+10,Y-6);}
  ctx.fillStyle='#c7d3e6';ctx.fillText('Flow Q (m³/h)',W/2-40,H-12);
  ctx.fillStyle='#4f8dff';ctx.save();ctx.translate(16,H/2+30);ctx.rotate(-Math.PI/2);ctx.fillText('Head (m)',0,0);ctx.restore();
  ctx.fillStyle='#2de2c0';ctx.save();ctx.translate(W-16,H/2+40);ctx.rotate(-Math.PI/2);ctx.fillText('Efficiency (%)',0,0);ctx.restore();
}

VP.tools.push({id:'pump',title:'Pump Head & Power',icon:'⚙️',group:'Fluids',
 desc:'TDH, power, motor sizing, NPSH, pump curve',
 render(el){ ptabs(el,'Pump Head & Power','Total dynamic head, power with motor sizing, NPSH margin, and a pump/system curve plot.',[

  {k:'duty',label:'Duty & motor',setup(box){
    box.innerHTML=card('Pump duty','Head, power, and a recommended standard motor.','<div id="pumpD"></div>');
    VP.calcForm(el.querySelector('#pumpD'),{cols:2,inputs:[
      {id:'Q',label:'Flow rate',unit:'m³/h',val:50},
      {id:'Hs',label:'Static head (lift)',unit:'m',val:20},
      {id:'hL',label:'Friction losses',unit:'m',val:8},
      {id:'dPp',label:'Extra process ΔP',unit:'bar',val:0},
      {id:'rho',label:'Fluid density',unit:'kg/m³',val:998},
      {id:'eff',label:'Pump efficiency',unit:'%',val:70},
      {id:'meff',label:'Motor efficiency',unit:'%',val:92}
    ],compute(v){
      const Qs=v.Q/3600, headDP=v.dPp*1e5/(v.rho*VP.g), H=v.Hs+v.hL+headDP;
      const Phyd=v.rho*VP.g*Qs*H, Pshaft=Phyd/(v.eff/100), Pmotor=Pshaft/(v.meff/100);
      const motor=pickMotor(Pshaft/1000), margin=(motor/(Pshaft/1000)-1)*100;
      return {results:[
        {label:'Total dynamic head',value:H,unit:'m',digits:2},
        {label:'Hydraulic power',value:Phyd/1000,unit:'kW',digits:3},
        {label:'Shaft (brake) power',value:Pshaft/1000,unit:'kW',digits:3},
        {label:'Motor input power',value:Pmotor/1000,unit:'kW',digits:3},
        {label:'Suggested motor',value:motor,unit:'kW',digits:2},
        {label:'Motor margin',value:margin,unit:'%',digits:0}
      ],notes:[{text:'Suggested motor = next standard IEC size ≥ shaft power × 1.15 (15–25% design margin). Hydraulic power = ρ·g·Q·H. Check NPSH in the next tab.'}]};
    }});
  }},

  {k:'npsh',label:'NPSH',setup(box){
    box.innerHTML=card('NPSH available','Suction-side check against cavitation.','<div id="pumpN"></div>');
    VP.calcForm(el.querySelector('#pumpN'),{cols:2,inputs:[
      {id:'Patm',label:'Pressure at liquid surface (abs)',unit:'kPa',val:101.325},
      {id:'Hs',label:'Static suction head (+ flooded, − lift)',unit:'m',val:2},
      {id:'hf',label:'Suction friction loss',unit:'m',val:0.8},
      {id:'rho',label:'Liquid density',unit:'kg/m³',val:998},
      {id:'Tw',label:'Water temperature (optional)',unit:'°C',val:0},
      {id:'Pvap',label:'Vapour pressure (if T blank)',unit:'kPa',val:2.34},
      {id:'NPSHr',label:'Pump NPSH required',unit:'m',val:3}
    ],compute(v){
      const Pvap=v.Tw>0?VP.pSatWater(v.Tw):v.Pvap;
      const NPSHa=(v.Patm-Pvap)*1000/(v.rho*VP.g)+v.Hs-v.hf;
      const margin=NPSHa-v.NPSHr;
      const notes=[{text:'NPSHa = (Patm − Pvap)/(ρg) + Hs − hf. Keep NPSHa > NPSHr (margin ≥ 0.5–1 m) to avoid cavitation.'}];
      if(margin<0.5)notes.unshift({text:'⚠ Low NPSH margin ('+fmt(margin,2)+' m) — cavitation risk. Lower the pump, raise the liquid level, cut suction losses, or cool the liquid.',warn:true});
      return {results:[
        {label:'Vapour pressure used',value:Pvap,unit:'kPa',digits:3},
        {label:'NPSH available',value:NPSHa,unit:'m',digits:2},
        {label:'NPSH required',value:v.NPSHr,unit:'m',digits:2},
        {label:'NPSH margin',value:margin,unit:'m',digits:2}
      ],notes};
    }});
  }},

  {k:'curve',label:'Pump curve',setup(box){
    box.innerHTML=card('Pump & system curves','Head vs flow, efficiency vs flow, and the operating point.',
      `<div class="grid3">
        <div class="field"><label>Shut-off head H₀ <span class="unit">(m)</span></label><input id="puH0" type="number" step="any" value="55"></div>
        <div class="field"><label>BEP flow <span class="unit">(m³/h)</span></label><input id="puQb" type="number" step="any" value="50"></div>
        <div class="field"><label>BEP head <span class="unit">(m)</span></label><input id="puHb" type="number" step="any" value="40"></div>
        <div class="field"><label>Max efficiency <span class="unit">(%)</span></label><input id="puE" type="number" step="any" value="78"></div>
        <div class="field"><label>Static head <span class="unit">(m)</span></label><input id="puHst" type="number" step="any" value="18"></div>
        <div class="field"><label>Design flow <span class="unit">(m³/h)</span></label><input id="puQd" type="number" step="any" value="50"></div>
        <div class="field"><label>Design head <span class="unit">(m)</span></label><input id="puHd" type="number" step="any" value="40"></div>
        <div class="field"><label>Fluid density <span class="unit">(kg/m³)</span></label><input id="puRho" type="number" step="any" value="998"></div>
      </div><div class="btn-row"><button class="btn" id="puGo">Plot</button></div>
      <div id="puChart" style="margin-top:12px"></div><div class="res-grid" id="puRes" style="margin-top:12px"></div>`);
    const g=id=>num(el.querySelector('#'+id).value);
    const draw=()=>{
      const H0=g('puH0'),Qb=g('puQb'),Hb=g('puHb'),Emax=g('puE'),Hst=g('puHst'),Qd=g('puQd'),Hd=g('puHd'),rho=g('puRho')||998;
      if(!(Qb>0&&Qd>0&&H0>Hb&&Hd>Hst)){el.querySelector('#puRes').innerHTML='<div class="note warnbox">Need H₀ &gt; BEP head, Design head &gt; Static head, and positive flows.</div>';el.querySelector('#puChart').innerHTML='';return;}
      const a=(H0-Hb)/(Qb*Qb), k=(Hd-Hst)/(Qd*Qd);
      const head=q=>H0-a*q*q, sys=q=>Hst+k*q*q, eff=q=>Math.max(0,Emax*(1-Math.pow((q-Qb)/Qb,2)));
      const Qop=Math.sqrt(Math.max(0,(H0-Hst)/(a+k))), Hop=Hst+k*Qop*Qop, Eop=eff(Qop);
      const Qmax=Math.max(Qb*1.4,Qop*1.2,Qd*1.2), Hmax=H0*1.1;
      pumpPlot(el.querySelector('#puChart'),{Qmax,Hmax,head,sys,eff,Qop,Hop});
      const Phyd=rho*VP.g*(Qop/3600)*Hop/1000, Psh=Eop>0?Phyd/(Eop/100):NaN;
      el.querySelector('#puRes').innerHTML=
        [['Operating flow',fmt(Qop,1)+' m³/h'],['Operating head',fmt(Hop,1)+' m'],['Efficiency at point',fmt(Eop,1)+' %'],
         ['Hydraulic power',fmt(Phyd,2)+' kW'],['Shaft power',fmt(Psh,2)+' kW']]
        .map(t=>'<div class="res"><div class="rl">'+t[0]+'</div><div class="rv" style="font-size:16px">'+t[1]+'</div></div>').join('');
    };
    el.querySelector('#puGo').onclick=draw; draw();
  }},

  {k:'affinity',label:'Affinity laws',setup(box){
    box.innerHTML=card('Pump affinity laws','Scale flow, head and power for a change in speed (or impeller trim).','<div id="pumpAff"></div>');
    VP.calcForm(el.querySelector('#pumpAff'),{cols:2,inputs:[
      {id:'basis',label:'Change basis',type:'select',val:'speed',options:[{v:'speed',t:'Pump speed (rpm)'},{v:'dia',t:'Impeller diameter'}]},
      {id:'v1',label:'Original speed / diameter',unit:'',val:1450},
      {id:'v2',label:'New speed / diameter',unit:'',val:1750},
      {id:'Q1',label:'Original flow Q₁',unit:'m³/h',val:50},
      {id:'H1',label:'Original head H₁',unit:'m',val:40},
      {id:'P1',label:'Original power P₁',unit:'kW',val:8}
    ],compute(v){
      if(v.v1<=0)throw new Error('Original value must be > 0.');
      const r=v.v2/v.v1;
      return {results:[
        {label:'Ratio (new ÷ old)',value:r,unit:'',digits:4},
        {label:'New flow Q₂',value:v.Q1*r,unit:'m³/h',digits:2},
        {label:'New head H₂',value:v.H1*r*r,unit:'m',digits:2},
        {label:'New power P₂',value:v.P1*r*r*r,unit:'kW',digits:3}
      ],notes:[{text:'Affinity laws: Q ∝ N, H ∝ N², P ∝ N³ (same ratios apply to small impeller-diameter trims). Valid for dynamically similar operation at roughly constant efficiency.'}]};
    }});
  }},

  {k:'multi',label:'Series / Parallel',setup(box){
    box.innerHTML=card('Pumps in series / parallel','Identical pumps — series adds head, parallel adds flow.','<div id="pumpMulti"></div>');
    VP.calcForm(el.querySelector('#pumpMulti'),{cols:2,inputs:[
      {id:'arr',label:'Arrangement',type:'select',val:'series',options:[{v:'series',t:'Series (head adds)'},{v:'parallel',t:'Parallel (flow adds)'}]},
      {id:'n',label:'Number of pumps',unit:'',val:2},
      {id:'Qp',label:'Single-pump flow',unit:'m³/h',val:50},
      {id:'Hp',label:'Single-pump head',unit:'m',val:40},
      {id:'rho',label:'Fluid density',unit:'kg/m³',val:998}
    ],compute(v){
      const n=Math.max(1,Math.round(v.n));
      const Qt=v.arr==='parallel'?v.Qp*n:v.Qp, Ht=v.arr==='series'?v.Hp*n:v.Hp;
      const Phyd=v.rho*VP.g*(Qt/3600)*Ht/1000;
      return {results:[
        {label:'Number of pumps',value:n,unit:'',digits:0},
        {label:'Combined flow',value:Qt,unit:'m³/h',digits:2},
        {label:'Combined head',value:Ht,unit:'m',digits:2},
        {label:'Total hydraulic power',value:Phyd,unit:'kW',digits:3}
      ],notes:[{text:'Identical pumps: series → same flow, head ×n (high head); parallel → same head, flow ×n (high flow). The real operating point is where the combined curve meets the system curve — see the Pump curve tab.'}]};
    }});
  }},

  {k:'effref',label:'Efficiency guide',setup(box){
    box.innerHTML=card('Typical pump efficiencies','Indicative best-efficiency-point (BEP) values — always use the manufacturer curve for design.',
      `<div class="table-wrap"><table class="data"><thead><tr><th>Pump type / size</th><th>Typical η at BEP</th></tr></thead><tbody>
        <tr><td>Centrifugal, &lt; 5 kW</td><td>40–60%</td></tr>
        <tr><td>Centrifugal, 5–50 kW</td><td>60–75%</td></tr>
        <tr><td>Centrifugal, 50–500 kW</td><td>75–85%</td></tr>
        <tr><td>Centrifugal, &gt; 500 kW</td><td>85–90%</td></tr>
        <tr><td>Multistage / high-head</td><td>70–80%</td></tr>
        <tr><td>Positive displacement (gear, screw)</td><td>70–90%</td></tr>
        <tr><td>Diaphragm / metering</td><td>20–40%</td></tr>
      </tbody></table></div>
      <div class="note">Efficiency rises with size and flow. Run pumps near BEP (≈70–110% of BEP flow); operating far off BEP wastes power and causes recirculation, vibration and wear. Motor efficiency (separate) is typically 88–96%.</div>`);
  }}

 ]); }});

/* =========================================================
   5. COMPRESSED AIR
========================================================= */
VP.tools.push({id:'air',title:'Compressed Air',icon:'🌬️',group:'Utilities',
 desc:'Compression power, discharge temp, receiver sizing',
 render(el){
  el.innerHTML = pageHead('Compressed Air','Compressor power demand and air-receiver sizing.')
   +`<div class="tabs"><div class="tab active" data-t="comp">Compressor power</div><div class="tab" data-t="rec">Receiver sizing</div><div class="tab" data-t="leak">Leakage & cost</div></div>`
   + card('Compression power','Single or multistage with equal pressure ratio.','<div id="comp"></div>')
   + `<div id="reccard" style="display:none">`+card('Air receiver volume','Buffer volume for a given demand and pressure swing.','<div id="rec"></div>')+`</div>`
   + `<div id="leakcard" style="display:none">`+card('Leakage estimator','Load/unload test — with no air used, run time reveals leaks.','<div id="leak"></div>')+card('Operating cost','Annual electricity cost of compressed air (or of the leaks).','<div id="acost"></div>')+`</div>`;
  const tabs=el.querySelectorAll('.tab');
  tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    el.querySelector('.card').style.display=t.dataset.t==='comp'?'':'none';
    el.querySelector('#reccard').style.display=t.dataset.t==='rec'?'':'none';
    el.querySelector('#leakcard').style.display=t.dataset.t==='leak'?'':'none';});

  VP.calcForm(el.querySelector('#comp'),{
    inputs:[
      {id:'FAD',label:'Free air delivery',unit:'m³/min',val:10},
      {id:'P1',label:'Suction pressure (abs)',unit:'kPa',val:101.325},
      {id:'P2',label:'Discharge pressure (abs)',unit:'kPa',val:800},
      {id:'T1',label:'Inlet temperature',unit:'°C',val:25},
      {id:'n',label:'Polytropic index n',unit:'',val:1.4},
      {id:'stages',label:'Number of stages',unit:'',val:1},
      {id:'eff',label:'Isentropic efficiency',unit:'%',val:75}
    ],
    compute(v){
      const Q1=v.FAD/60; // m3/s at suction
      const P1=v.P1*1000, P2=v.P2*1000;
      const ratioTotal=P2/P1;
      const rs=Math.pow(ratioTotal,1/v.stages); // per stage ratio
      const n=v.n;
      // isothermal
      const Wiso=P1*Q1*Math.log(ratioTotal);
      // polytropic multistage (intercooled to T1)
      const Wpoly_stage=(n/(n-1))*P1*Q1*(Math.pow(rs,(n-1)/n)-1);
      const Wpoly=Wpoly_stage*v.stages;
      const Wshaft=Wpoly/(v.eff/100);
      const T2=(v.T1+273.15)*Math.pow(rs,(n-1)/n)-273.15;
      return {results:[
        {label:'Overall pressure ratio',value:ratioTotal,unit:'',digits:2},
        {label:'Ratio per stage',value:rs,unit:'',digits:2},
        {label:'Isothermal power',value:Wiso/1000,unit:'kW',digits:2},
        {label:'Polytropic power (gas)',value:Wpoly/1000,unit:'kW',digits:2},
        {label:'Shaft power',value:Wshaft/1000,unit:'kW',digits:2},
        {label:'Stage discharge temp',value:T2,unit:'°C',digits:1}
      ],notes:[{text: (rs>3.5?'⚠ Per-stage ratio > 3.5 — add a stage to limit discharge temperature. ':'')+'Multistage assumes perfect intercooling back to inlet temperature.',warn:rs>3.5}]};
    }
  });

  VP.calcForm(el.querySelector('#rec'),{
    inputs:[
      {id:'Qd',label:'Air demand (FAD)',unit:'m³/min',val:10},
      {id:'t',label:'Hold-up time',unit:'s',val:30},
      {id:'Pmax',label:'Receiver max pressure (abs)',unit:'kPa',val:800},
      {id:'Pmin',label:'Receiver min pressure (abs)',unit:'kPa',val:650},
      {id:'Patm',label:'Atmospheric pressure',unit:'kPa',val:101.325}
    ],
    compute(v){
      const V=(v.Qd/60*v.t*v.Patm)/(v.Pmax-v.Pmin); // m3
      return {results:[
        {label:'Required receiver volume',value:V*1000,unit:'L',digits:0},
        {label:'Required receiver volume',value:V,unit:'m³',digits:3}
      ],notes:[{text:'V = (Q·t·Patm)/(Pmax−Pmin). Round up to the next standard vessel size.'}]};
    }
  });

  VP.calcForm(el.querySelector('#leak'),{cols:2,inputs:[
    {id:'FAD',label:'Compressor free air delivery',unit:'m³/min',val:10},
    {id:'tload',label:'Loaded time in test',unit:'s',val:20},
    {id:'tunload',label:'Unloaded time in test',unit:'s',val:80}
  ],compute(v){
    const cyc=v.tload+v.tunload;
    if(cyc<=0)throw new Error('Times must be positive.');
    const Qleak=v.FAD*v.tload/cyc, pct=v.tload/cyc*100;
    return {results:[
      {label:'Leakage flow',value:Qleak,unit:'m³/min',digits:3},
      {label:'Leakage flow',value:Qleak*60,unit:'m³/h',digits:1},
      {label:'Leakage as % of capacity',value:pct,unit:'%',digits:1}
    ],notes:[{text:'Load/unload test with no air consumed: leakage = FAD × t_load/(t_load + t_unload). Well-maintained systems are <10%; >20% signals significant leaks.'}]};
  }});
  VP.calcForm(el.querySelector('#acost'),{cols:2,inputs:[
    {id:'Q',label:'Air flow (or leak flow)',unit:'m³/min',val:2},
    {id:'sp',label:'Specific power',unit:'kW per m³/min',val:7},
    {id:'hrs',label:'Operating hours',unit:'h/yr',val:8000},
    {id:'price',label:'Electricity price',unit:'$/kWh',val:0.12}
  ],compute(v){
    const kW=v.Q*v.sp, cost=kW*v.hrs*v.price;
    return {results:[
      {label:'Power demand',value:kW,unit:'kW',digits:2},
      {label:'Annual energy',value:kW*v.hrs/1000,unit:'MWh/yr',digits:2},
      {label:'Annual cost',value:cost,unit:'$/yr',digits:0}
    ],notes:[{text:'Cost = flow × specific-power × hours × price. Specific power ≈ 6–8 kW per m³/min FAD at 7 barg. Apply this to the leak flow to value a leak-repair programme.'}]};
  }});
 }});

/* =========================================================
   6. MASS & ENERGY BALANCE
========================================================= */
VP.tools.push({id:'massbal',title:'Mass & Energy Balance',icon:'⚖️',group:'Process',
 desc:'Stream mixing, energy balance & unknown-stream solver',
 render(el){
  el.innerHTML = pageHead('Mass & Energy Balance','Adiabatic mixing of streams, plus a reactor recycle/purge loop solver.')
   +`<div class="tabs"><div class="tab active" data-t="mix">Stream mixing</div><div class="tab" data-t="rec">Recycle / Purge</div><div class="tab" data-t="sep">Separator</div><div class="tab" data-t="comb">Combustion</div></div>`
   + card('Stream mixing (energy balance)','Add inlet streams; outlet flow & temperature from mass + enthalpy balance.','<div id="mixbox"></div>')
   + `<div id="reccard" style="display:none">`+card('Reactor recycle with purge','Single reactant + inert loop at steady state.','<div id="recbox"></div>')+`</div>`
   + `<div id="sepcard" style="display:none">`+card('Component separator','Split a two-component feed by key recoveries.','<div id="sepbox"></div>')+`</div>`
   + `<div id="combcard" style="display:none">`+card('Combustion (air & flue gas)','Stoichiometric/excess air and flue-gas products from an ultimate analysis.','<div id="combbox"></div>')+`</div>`;
  const rtabs=el.querySelectorAll('.tab');
  rtabs.forEach(t=>t.onclick=()=>{rtabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    el.querySelector('.card').style.display=t.dataset.t==='mix'?'':'none';
    el.querySelector('#reccard').style.display=t.dataset.t==='rec'?'':'none';
    el.querySelector('#sepcard').style.display=t.dataset.t==='sep'?'':'none';
    el.querySelector('#combcard').style.display=t.dataset.t==='comb'?'':'none';});
  const box=el.querySelector('#mixbox');
  let streams=[{m:1000,T:80,cp:4.18},{m:500,T:25,cp:4.18}];
  function render(){
    let h=`<div class="small" style="margin-bottom:8px">Mass flow · Temperature · Specific heat</div>`;
    streams.forEach((s,i)=>{
      h+=`<div class="stream-row">
        <div class="field"><label>Stream ${i+1} ṁ (kg/h)</label><input data-i="${i}" data-k="m" type="number" value="${s.m}"></div>
        <div class="field"><label>T (°C)</label><input data-i="${i}" data-k="T" type="number" value="${s.T}"></div>
        <div class="field"><label>cp (kJ/kg·K)</label><input data-i="${i}" data-k="cp" type="number" value="${s.cp}"></div>
        <button class="btn ghost" data-del="${i}" style="margin:0">✕</button></div>`;
    });
    h+=`<div class="btn-row"><button class="btn ghost" id="addS">+ Add stream</button><button class="btn" id="calcMix">Calculate</button></div><div class="results" id="mixRes"></div>`;
    box.innerHTML=h;
    box.querySelectorAll('input').forEach(inp=>inp.oninput=()=>{streams[inp.dataset.i][inp.dataset.k]=num(inp.value)||0;});
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(streams.length>1){streams.splice(+b.dataset.del,1);render();}});
    box.querySelector('#addS').onclick=()=>{streams.push({m:100,T:25,cp:4.18});render();};
    box.querySelector('#calcMix').onclick=calc;
    calc();
  }
  function calc(){
    const M=streams.reduce((a,s)=>a+s.m,0);
    const Hin=streams.reduce((a,s)=>a+s.m*s.cp*s.T,0);
    const cpMix=streams.reduce((a,s)=>a+s.m*s.cp,0)/M;
    const Tout=Hin/(M*cpMix);
    const duty=streams.reduce((a,s)=>a+s.m*s.cp*(Tout-s.T),0)/3600; // kW net (≈0)
    box.querySelector('#mixRes').innerHTML=`<div class="res-grid">
      <div class="res"><div class="rl">Total mass flow</div><div class="rv">${fmt(M,1)}<span class="ru">kg/h</span></div></div>
      <div class="res"><div class="rl">Mixed outlet T</div><div class="rv">${fmt(Tout,2)}<span class="ru">°C</span></div></div>
      <div class="res"><div class="rl">Mixed cp</div><div class="rv">${fmt(cpMix,3)}<span class="ru">kJ/kg·K</span></div></div>
      <div class="res"><div class="rl">Enthalpy flow</div><div class="rv">${fmt(Hin/3600,2)}<span class="ru">kW·°C ref</span></div></div>
      </div><div class="note">Adiabatic mixing: Σṁ·cp·T conserved. Outlet T = Σ(ṁ·cp·T)/Σ(ṁ·cp). Mass is conserved (Σ in = out).</div>`;
    box.querySelector('#mixRes').classList.add('show');
  }
  render();

  VP.calcForm(el.querySelector('#recbox'),{cols:2,inputs:[
    {id:'F0',label:'Fresh feed (reactant + inert)',unit:'mol/h',val:100},
    {id:'zI',label:'Inert mole fraction in fresh feed',unit:'0–1',val:0.02},
    {id:'Xsp',label:'Single-pass conversion of reactant',unit:'%',val:20},
    {id:'beta',label:'Purge fraction of recycle gas',unit:'%',val:10}
  ],compute(v){
    if(v.zI<0||v.zI>=1)throw new Error('Inert fraction must be 0–1.');
    if(v.beta<=0||v.beta>100)throw new Error('Purge fraction must be 0–100%.');
    const xsp=v.Xsp/100, beta=v.beta/100;
    const A0=v.F0*(1-v.zI), I0=v.F0*v.zI;             // fresh reactant & inert
    const Itot=I0/beta;                               // inert circulating (purge inert = fresh inert)
    const Irec=Itot-I0;
    const Af=A0/(1-(1-beta)*(1-xsp));                 // reactor-feed reactant (steady state)
    const Aun=Af*(1-xsp), Arec=(1-beta)*Aun, Apurge=beta*Aun;
    const Areacted=Af*xsp;                            // product formed = fresh reactant consumed
    const overallX=Areacted/A0;
    const R=Arec+Irec, Pg=Apurge+I0;
    const yIloop=Itot/(Aun+Itot);
    return {results:[
      {label:'Reactor-feed reactant',value:Af,unit:'mol/h',digits:2},
      {label:'Recycle stream',value:R,unit:'mol/h',digits:2},
      {label:'Purge stream',value:Pg,unit:'mol/h',digits:2},
      {label:'Overall conversion',value:overallX*100,unit:'%',digits:1},
      {label:'Product formed',value:Areacted,unit:'mol/h',digits:2},
      {label:'Reactant lost in purge',value:Apurge,unit:'mol/h',digits:2},
      {label:'Inert fraction in loop',value:yIloop*100,unit:'%',digits:1}
    ],notes:[{text:'Steady-state inert balance: inert leaves only in the purge, so purge inert = fresh-feed inert ⇒ loop inert = I₀/β. A smaller purge raises overall conversion but lets inert build up. Product reactant = fresh reactant − reactant lost in purge.'}]};
  }});

  VP.calcForm(el.querySelector('#sepbox'),{cols:2,inputs:[
    {id:'F',label:'Feed flow',unit:'kmol/h',val:100},
    {id:'zF',label:'Light-key feed fraction',unit:'',val:0.5},
    {id:'recL',label:'Light-key recovery to top',unit:'%',val:95},
    {id:'recH',label:'Heavy-key recovery to top',unit:'%',val:5}
  ],compute(v){
    if(v.zF<0||v.zF>1)throw new Error('Feed fraction must be 0–1.');
    const Lf=v.F*v.zF, Hf=v.F*(1-v.zF);
    const Lt=Lf*v.recL/100, Ht=Hf*v.recH/100, top=Lt+Ht, bot=v.F-top;
    const xD=top>0?Lt/top:0, xB=bot>0?(Lf-Lt)/bot:0;
    return {results:[
      {label:'Top product',value:top,unit:'kmol/h',digits:2},
      {label:'Bottom product',value:bot,unit:'kmol/h',digits:2},
      {label:'Top light-key purity',value:xD*100,unit:'%',digits:2},
      {label:'Bottom heavy-key purity',value:(1-xB)*100,unit:'%',digits:2},
      {label:'Light-key recovery',value:v.recL,unit:'%',digits:1}
    ],notes:[{text:'A separator splits each component to the top by its recovery: top = Σ(feed_i × recovery_i). Compositions follow from the component balance; the rest leaves in the bottoms.'}]};
  }});
  VP.calcForm(el.querySelector('#combbox'),{cols:2,inputs:[
    {id:'C',label:'Carbon mass fraction',unit:'',val:0.749},
    {id:'H',label:'Hydrogen mass fraction',unit:'',val:0.251},
    {id:'S',label:'Sulphur mass fraction',unit:'',val:0},
    {id:'O',label:'Oxygen mass fraction',unit:'',val:0},
    {id:'exc',label:'Excess air',unit:'%',val:20}
  ],compute(v){
    const o2=2.667*v.C+8*v.H+1*v.S-v.O;
    if(o2<=0)throw new Error('Check the ultimate analysis (needs C/H/S).');
    const stoichAir=o2/0.233, actAir=stoichAir*(1+v.exc/100);
    const co2=3.667*v.C, h2o=9*v.H, so2=2*v.S, excO2=o2*v.exc/100, n2=actAir*0.767;
    const flue=co2+h2o+so2+excO2+n2;
    return {results:[
      {label:'Stoichiometric air',value:stoichAir,unit:'kg/kg fuel',digits:3},
      {label:'Actual air (AFR)',value:actAir,unit:'kg/kg fuel',digits:3},
      {label:'CO₂ produced',value:co2,unit:'kg/kg fuel',digits:3},
      {label:'H₂O produced',value:h2o,unit:'kg/kg fuel',digits:3},
      {label:'Excess O₂ in flue',value:excO2,unit:'kg/kg fuel',digits:3},
      {label:'Total flue gas',value:flue,unit:'kg/kg fuel',digits:3}
    ],notes:[{text:'Stoichiometric O₂ = 2.667·C + 8·H + S − O (mass basis); air = O₂/0.233. CO₂ = 3.667·C, H₂O = 9·H, SO₂ = 2·S. N₂ ≈ 0.767·air. Defaults are methane (C 0.749, H 0.251).'}]};
  }});
 }});

/* =========================================================
   7. HEAT EXCHANGER DESIGN
========================================================= */
VP.tools.push({id:'hx',title:'Heat Exchanger',icon:'🔥',group:'Process',
 desc:'LMTD area sizing and ε-NTU rating',
 render(el){
  el.innerHTML = pageHead('Heat Exchanger Design','LMTD method for area sizing and effectiveness-NTU for rating.')
   +`<div class="tabs"><div class="tab active" data-t="lmtd">LMTD sizing</div><div class="tab" data-t="ntu">ε-NTU rating</div><div class="tab" data-t="st">Shell &amp; tube</div><div class="tab" data-t="plate">Plate HX</div></div>`
   + `<div id="lmtdcard">`+card('LMTD area sizing','Provide the four terminal temperatures and overall U.','<div id="lmtd"></div>')+`</div>`
   + `<div id="ntucard" style="display:none">`+card('Effectiveness-NTU','Rate an exchanger of known area.','<div id="ntu"></div>')+`</div>`
   + `<div id="stcard" style="display:none">`+card('Shell-&-tube sizing','Tube count, bundle & shell diameter with the LMTD F-correction factor.','<div id="st"></div>')+`</div>`
   + `<div id="platecard" style="display:none">`+card('Plate heat-exchanger sizing','Area and plate count for a gasketed plate HX.','<div id="plate"></div>')+`</div>`;
  const tabs=el.querySelectorAll('.tab');
  tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    el.querySelector('#lmtdcard').style.display=t.dataset.t==='lmtd'?'':'none';
    el.querySelector('#ntucard').style.display=t.dataset.t==='ntu'?'':'none';
    el.querySelector('#stcard').style.display=t.dataset.t==='st'?'':'none';
    el.querySelector('#platecard').style.display=t.dataset.t==='plate'?'':'none';});

  VP.calcForm(el.querySelector('#lmtd'),{
    inputs:[
      {id:'Thi',label:'Hot inlet',unit:'°C',val:150},
      {id:'Tho',label:'Hot outlet',unit:'°C',val:90},
      {id:'Tci',label:'Cold inlet',unit:'°C',val:25},
      {id:'Tco',label:'Cold outlet',unit:'°C',val:70},
      {id:'arr',label:'Arrangement',type:'select',val:'counter',options:[{v:'counter',t:'Counter-current'},{v:'co',t:'Co-current'}]},
      {id:'U',label:'Overall U',unit:'W/m²·K',val:500},
      {id:'Q',label:'Duty (optional)',unit:'kW',val:0},
      {id:'mcp',label:'Hot ṁ·cp (if Q blank)',unit:'kW/K',val:10}
    ],
    compute(v){
      let dT1,dT2;
      if(v.arr==='counter'){dT1=v.Thi-v.Tco;dT2=v.Tho-v.Tci;}
      else{dT1=v.Thi-v.Tci;dT2=v.Tho-v.Tco;}
      if(dT1<=0||dT2<=0) throw new Error('Temperature cross — check terminal temperatures / arrangement.');
      const LMTD = Math.abs(dT1-dT2)<1e-6? dT1 : (dT1-dT2)/Math.log(dT1/dT2);
      let Q = v.Q>0? v.Q*1000 : v.mcp*1000*(v.Thi-v.Tho); // W
      const A = Q/(v.U*LMTD);
      return {results:[
        {label:'LMTD',value:LMTD,unit:'°C',digits:2},
        {label:'Heat duty',value:Q/1000,unit:'kW',digits:2},
        {label:'Required area',value:A,unit:'m²',digits:2},
        {label:'ΔT hot end',value:dT1,unit:'°C',digits:1},
        {label:'ΔT cold end',value:dT2,unit:'°C',digits:1}
      ],notes:[{text:'A = Q/(U·LMTD). For multi-pass shell-and-tube apply an F correction factor (typically 0.8–1.0).'}]};
    }
  });

  VP.calcForm(el.querySelector('#ntu'),{
    inputs:[
      {id:'mch',label:'Hot ṁ·cp',unit:'kW/K',val:10},
      {id:'mcc',label:'Cold ṁ·cp',unit:'kW/K',val:12},
      {id:'Thi',label:'Hot inlet',unit:'°C',val:150},
      {id:'Tci',label:'Cold inlet',unit:'°C',val:25},
      {id:'U',label:'Overall U',unit:'W/m²·K',val:500},
      {id:'A',label:'Area',unit:'m²',val:15},
      {id:'arr',label:'Arrangement',type:'select',val:'counter',options:[{v:'counter',t:'Counter-current'},{v:'co',t:'Co-current'}]}
    ],
    compute(v){
      const Cmin=Math.min(v.mch,v.mcc)*1000, Cmax=Math.max(v.mch,v.mcc)*1000;
      const Cr=Cmin/Cmax;
      const NTU=v.U*v.A/Cmin;
      let eps;
      if(v.arr==='counter'){
        eps = Math.abs(Cr-1)<1e-6 ? NTU/(1+NTU) : (1-Math.exp(-NTU*(1-Cr)))/(1-Cr*Math.exp(-NTU*(1-Cr)));
      } else {
        eps = (1-Math.exp(-NTU*(1+Cr)))/(1+Cr);
      }
      const Qmax=Cmin*(v.Thi-v.Tci);
      const Q=eps*Qmax;
      const Tho=v.Thi-Q/(v.mch*1000);
      const Tco=v.Tci+Q/(v.mcc*1000);
      return {results:[
        {label:'NTU',value:NTU,unit:'',digits:3},
        {label:'Capacity ratio Cr',value:Cr,unit:'',digits:3},
        {label:'Effectiveness ε',value:eps*100,unit:'%',digits:1},
        {label:'Heat duty',value:Q/1000,unit:'kW',digits:2},
        {label:'Hot outlet',value:Tho,unit:'°C',digits:1},
        {label:'Cold outlet',value:Tco,unit:'°C',digits:1}
      ],notes:[{text:'ε-NTU relations for pure counter/co-current flow. Qmax = Cmin·(Thi−Tci).'}]};
    }
  });

  /* Kern bundle-count constants: [K1, n1] by layout & tube passes */
  const KERN={tri:{1:[0.319,2.142],2:[0.249,2.207],4:[0.175,2.285],6:[0.0743,2.499],8:[0.0365,2.675]},
              sq:{1:[0.215,2.207],2:[0.156,2.291],4:[0.158,2.263],6:[0.0402,2.617],8:[0.0331,2.643]}};
  VP.calcForm(el.querySelector('#st'),{cols:2,inputs:[
    {id:'Q',label:'Heat duty Q',unit:'kW',val:600},
    {id:'U',label:'Overall U',unit:'W/m²·K',val:500},
    {id:'Thi',label:'Hot inlet',unit:'°C',val:150},
    {id:'Tho',label:'Hot outlet',unit:'°C',val:90},
    {id:'Tci',label:'Cold inlet',unit:'°C',val:25},
    {id:'Tco',label:'Cold outlet',unit:'°C',val:70},
    {id:'do',label:'Tube outside diameter',unit:'mm',val:20},
    {id:'L',label:'Tube length',unit:'m',val:4.88},
    {id:'passes',label:'Tube passes',type:'select',val:'2',options:[{v:'1',t:'1'},{v:'2',t:'2'},{v:'4',t:'4'},{v:'6',t:'6'},{v:'8',t:'8'}]},
    {id:'layout',label:'Tube layout',type:'select',val:'tri',options:[{v:'tri',t:'Triangular (30°)'},{v:'sq',t:'Square (90°)'}]}
  ],compute(v){
    const d1=v.Thi-v.Tco, d2=v.Tho-v.Tci;
    if(d1<=0||d2<=0)throw new Error('Temperature cross — check terminal temperatures.');
    const LMTD=Math.abs(d1-d2)<1e-6?d1:(d1-d2)/Math.log(d1/d2);
    const R=(v.Thi-v.Tho)/(v.Tco-v.Tci), P=(v.Tco-v.Tci)/(v.Thi-v.Tci);
    let F;
    const rt=Math.sqrt(R*R+1);
    if(Math.abs(R-1)<1e-6){
      F=(P*rt)/((1-P)*Math.log((2-P*(2-rt))/(2-P*(2+rt))+1e-12));
    }else{
      const num=rt*Math.log((1-P)/(1-P*R));
      const den=(R-1)*Math.log((2-P*(R+1-rt))/(2-P*(R+1+rt)));
      F=num/den;
    }
    if(!isFinite(F)||F<=0||F>1)F=NaN;
    const dTeff=(isFinite(F)?F:1)*LMTD;
    const A=v.Q*1000/(v.U*dTeff);
    const doM=v.do/1000, aTube=Math.PI*doM*v.L, Nt=Math.ceil(A/aTube);
    const kc=KERN[v.layout][v.passes], Db=doM*Math.pow(Nt/kc[0],1/kc[1]);
    const clr=0.011*Db+0.010, Ds=Db+clr;
    return {results:[
      {label:'LMTD (counter-current)',value:LMTD,unit:'°C',digits:2},
      {label:'F correction factor',value:F,unit:'',digits:3},
      {label:'Corrected ΔT (F·LMTD)',value:dTeff,unit:'°C',digits:2},
      {label:'Required area',value:A,unit:'m²',digits:2},
      {label:'Number of tubes',value:Nt,unit:'',digits:0},
      {label:'Tubes per pass',value:Nt/parseInt(v.passes,10),unit:'',digits:0},
      {label:'Bundle diameter',value:Db*1000,unit:'mm',digits:0},
      {label:'Shell diameter (est.)',value:Ds*1000,unit:'mm',digits:0}
    ],notes:[{text:(isFinite(F)?'':'⚠ F undefined/too low for a 1-shell pass — use more shell passes or a different temperature approach. ')+'A = Q/(U·F·LMTD). Tube count from area/(π·d₀·L); bundle by Kern Db = d₀·(Nt/K₁)^(1/n₁) for '+(v.layout==='tri'?'triangular':'square')+' pitch, '+v.passes+'-pass. Shell ≈ bundle + clearance.',warn:!isFinite(F)}]};
  }});

  VP.calcForm(el.querySelector('#plate'),{cols:2,inputs:[
    {id:'Q',label:'Heat duty',unit:'kW',val:500},
    {id:'U',label:'Overall U',unit:'W/m²·K',val:3500},
    {id:'dTlm',label:'LMTD',unit:'°C',val:10},
    {id:'F',label:'Correction factor F',unit:'',val:0.95},
    {id:'Aplate',label:'Area per plate',unit:'m²',val:0.5}
  ],compute(v){
    if(v.U<=0||v.dTlm<=0||v.Aplate<=0)throw new Error('U, LMTD and plate area must be > 0.');
    const A=v.Q*1000/(v.U*v.F*v.dTlm), nThermal=A/v.Aplate, plates=Math.ceil(nThermal)+1;
    return {results:[
      {label:'Required area',value:A,unit:'m²',digits:2},
      {label:'Thermal plates',value:nThermal,unit:'',digits:1},
      {label:'Total plates (+1 end)',value:plates,unit:'',digits:0},
      {label:'Channels per side',value:Math.ceil((plates-1)/2),unit:'',digits:0}
    ],notes:[{text:'Plate HX: A = Q/(U·F·LMTD). Gasketed-plate U is high (2000–6000 W/m²·K) — compact, ideal for liquid–liquid duties with a close temperature approach. Plate count = area/plate-area, plus an end plate.'}]};
  }});
 }});

/* =========================================================
   8. PINCH ANALYSIS / HEN
========================================================= */
VP.tools.push({id:'pinch',title:'Pinch / HEN',icon:'📈',group:'Process',
 desc:'Problem-table targets: utilities & pinch temperature',
 render(el){
  el.innerHTML = pageHead('Pinch Analysis (HEN)','Problem Table Algorithm — minimum hot/cold utility targets and the pinch temperature.')
   + card('Stream data','Enter each stream with supply/target temperatures and heat-capacity flowrate CP = ṁ·cp.','<div id="pinchbox"></div>');
  const box=el.querySelector('#pinchbox');
  let streams=[
    {type:'hot',Ts:180,Tt:40,CP:2.0},
    {type:'hot',Ts:150,Tt:60,CP:4.0},
    {type:'cold',Ts:20,Tt:180,CP:3.0},
    {type:'cold',Ts:80,Tt:160,CP:4.5}
  ];
  let dTmin=10;
  function composite(type){
    const list=streams.filter(s=>s.type===type);
    if(!list.length)return [];
    const T=[...new Set(list.flatMap(s=>[s.Ts,s.Tt]))].sort((a,b)=>a-b);
    const pts=[[0,T[0]]]; let H=0;
    for(let i=0;i<T.length-1;i++){const lo=T[i],hi=T[i+1],mid=(lo+hi)/2;let cp=0;
      list.forEach(s=>{const a=Math.min(s.Ts,s.Tt),b=Math.max(s.Ts,s.Tt);if(mid>a&&mid<b)cp+=s.CP;});
      H+=cp*(hi-lo);pts.push([H,hi]);}
    return pts;
  }
  function xyPlot(host,opts){
    host.innerHTML='';const c=document.createElement('canvas');c.width=420;c.height=320;
    c.style.width='100%';c.style.maxWidth='380px';c.style.background='#0b1120';
    c.style.border='1px solid rgba(255,255,255,.10)';c.style.borderRadius='10px';host.appendChild(c);
    const ctx=c.getContext('2d'),W=c.width,H=c.height,pl=54,pr=16,pb=40,pt=14;
    let xmn=Infinity,xmx=-Infinity,ymn=Infinity,ymx=-Infinity;
    opts.series.forEach(s=>s.pts.forEach(p=>{xmn=Math.min(xmn,p[0]);xmx=Math.max(xmx,p[0]);ymn=Math.min(ymn,p[1]);ymx=Math.max(ymx,p[1]);}));
    if(!isFinite(xmn)){host.innerHTML='<div class="small">No data</div>';return;}
    if(xmn===xmx)xmx=xmn+1; if(ymn===ymx)ymx=ymn+1;
    const dx=(xmx-xmn)*0.05,dy=(ymx-ymn)*0.06; xmn-=dx;xmx+=dx;ymn-=dy;ymx+=dy;
    const sx=x=>pl+(x-xmn)/(xmx-xmn)*(W-pl-pr), sy=y=>H-pb-(y-ymn)/(ymx-ymn)*(H-pb-pt);
    ctx.strokeStyle='#1b2638';ctx.lineWidth=1;ctx.fillStyle='#9aa7bd';ctx.font='11px sans-serif';
    for(let i=0;i<=5;i++){const gx=pl+(W-pl-pr)*i/5;ctx.beginPath();ctx.moveTo(gx,pt);ctx.lineTo(gx,H-pb);ctx.stroke();ctx.fillText((xmn+(xmx-xmn)*i/5).toFixed(0),gx-10,H-pb+14);
      const gy=pt+(H-pb-pt)*i/5;ctx.beginPath();ctx.moveTo(pl,gy);ctx.lineTo(W-pr,gy);ctx.stroke();ctx.fillText((ymx-(ymx-ymn)*i/5).toFixed(0),6,gy+4);}
    opts.series.forEach(s=>{ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.lineWidth=2.5;ctx.beginPath();
      s.pts.forEach((p,i)=>{const X=sx(p[0]),Y=sy(p[1]);i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});ctx.stroke();
      s.pts.forEach(p=>{ctx.beginPath();ctx.arc(sx(p[0]),sy(p[1]),3,0,7);ctx.fill();});});
    ctx.fillStyle='#c7d3e6';ctx.font='12px sans-serif';ctx.fillText(opts.xlabel,W/2-34,H-6);
    ctx.save();ctx.translate(13,H/2+30);ctx.rotate(-Math.PI/2);ctx.fillText(opts.ylabel,0,0);ctx.restore();
  }
  function render(){
    let h=`<div class="field" style="max-width:220px"><label>ΔT min (°C)</label><input id="dtmin" type="number" value="${dTmin}"></div>`;
    streams.forEach((s,i)=>{
      h+=`<div class="stream-row">
        <div class="field"><label>Type</label><select data-i="${i}" data-k="type"><option value="hot" ${s.type==='hot'?'selected':''}>Hot</option><option value="cold" ${s.type==='cold'?'selected':''}>Cold</option></select></div>
        <div class="field"><label>Tsupply °C</label><input data-i="${i}" data-k="Ts" type="number" value="${s.Ts}"></div>
        <div class="field"><label>Ttarget °C</label><input data-i="${i}" data-k="Tt" type="number" value="${s.Tt}"></div>
        <div class="field"><label>CP kW/°C</label><input data-i="${i}" data-k="CP" type="number" value="${s.CP}"></div>
        <button class="btn ghost" data-del="${i}" style="margin:0">✕</button></div>`;
    });
    h+=`<div class="btn-row"><button class="btn ghost" id="addS">+ Add stream</button><button class="btn" id="calcP">Compute targets</button></div><div class="results" id="pRes"></div>`;
    box.innerHTML=h;
    box.querySelector('#dtmin').oninput=e=>dTmin=num(e.target.value)||0;
    box.querySelectorAll('input[data-i],select[data-i]').forEach(inp=>inp.oninput=()=>{
      const k=inp.dataset.k; streams[inp.dataset.i][k]= k==='type'?inp.value:(num(inp.value)||0);});
    box.querySelectorAll('[data-del]').forEach(b=>b.onclick=()=>{if(streams.length>1){streams.splice(+b.dataset.del,1);render();}});
    box.querySelector('#addS').onclick=()=>{streams.push({type:'cold',Ts:25,Tt:100,CP:1});render();};
    box.querySelector('#calcP').onclick=calc;
    calc();
  }
  function calc(){
    const d=dTmin/2;
    // shifted temps
    const sh=streams.map(s=>{
      if(s.type==='hot') return {Ts:s.Ts-d,Tt:s.Tt-d,CP:s.CP,type:'hot'};
      return {Ts:s.Ts+d,Tt:s.Tt+d,CP:s.CP,type:'cold'};
    });
    let temps=[];
    sh.forEach(s=>{temps.push(s.Ts,s.Tt);});
    temps=[...new Set(temps)].sort((a,b)=>b-a);
    let intervals=[];
    for(let i=0;i<temps.length-1;i++){
      const Th=temps[i],Tl=temps[i+1],mid=(Th+Tl)/2,dT=Th-Tl;
      let sumHot=0,sumCold=0;
      sh.forEach(s=>{const lo=Math.min(s.Ts,s.Tt),hi=Math.max(s.Ts,s.Tt);
        if(mid>lo&&mid<hi){ if(s.type==='hot')sumHot+=s.CP; else sumCold+=s.CP; }});
      const surplus=(sumHot-sumCold)*dT;
      intervals.push({Th,Tl,dT,surplus});
    }
    // cascade
    let c=[0]; intervals.forEach(it=>c.push(c[c.length-1]+it.surplus));
    const minC=Math.min(...c);
    const Qh=Math.max(0,-minC);
    const C=c.map(x=>x+Qh);
    const Qc=C[C.length-1];
    // pinch: shifted temp where C==0
    let pinchShift=null;
    C.forEach((x,i)=>{if(Math.abs(x)<1e-6) pinchShift=(i===0?temps[0]:temps[i]);});
    if(pinchShift===null){let idx=C.indexOf(Math.min(...C));pinchShift=temps[idx];}
    const pinchHot=pinchShift+d, pinchCold=pinchShift-d;
    let tbl=`<div class="table-wrap"><table class="data"><thead><tr><th>Shifted T °C</th><th>Cascade kW</th></tr></thead><tbody>`;
    temps.forEach((t,i)=>{tbl+=`<tr><td>${fmt(t,1)}</td><td>${fmt(C[i],2)}</td></tr>`;});
    tbl+=`</tbody></table></div>`;
    box.querySelector('#pRes').innerHTML=`<div class="res-grid">
      <div class="res"><div class="rl">Min hot utility</div><div class="rv">${fmt(Qh,2)}<span class="ru">kW</span></div></div>
      <div class="res"><div class="rl">Min cold utility</div><div class="rv">${fmt(Qc,2)}<span class="ru">kW</span></div></div>
      <div class="res"><div class="rl">Pinch (hot side)</div><div class="rv">${fmt(pinchHot,1)}<span class="ru">°C</span></div></div>
      <div class="res"><div class="rl">Pinch (cold side)</div><div class="rv">${fmt(pinchCold,1)}<span class="ru">°C</span></div></div>
      </div>${tbl}
      <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px">
        <div><div class="small">Composite curves — hot (red) vs cold (blue)</div><div id="ccPlot"></div></div>
        <div><div class="small">Grand composite curve</div><div id="gccPlot"></div></div>
      </div>
      <div class="note">Problem Table Algorithm with shifted temperatures (±ΔTmin/2). Pinch is where the feasible cascade heat flow = 0 — do not transfer heat across it. Composite curves use actual temperatures, with the cold curve shifted right by the minimum cold utility; the grand composite plots the cascade vs shifted temperature.</div>`;
    const hotC=composite('hot'), coldC=composite('cold').map(p=>[p[0]+Qc,p[1]]);
    const gccPts=temps.map((t,i)=>[C[i],t]);
    if(hotC.length&&coldC.length) xyPlot(box.querySelector('#ccPlot'),{series:[{pts:hotC,color:'#ff6b81'},{pts:coldC,color:'#4f8dff'}],xlabel:'Enthalpy (kW)',ylabel:'Temperature (°C)'});
    else box.querySelector('#ccPlot').innerHTML='<div class="small">Need both hot and cold streams.</div>';
    xyPlot(box.querySelector('#gccPlot'),{series:[{pts:gccPts,color:'#2de2c0'}],xlabel:'Net heat flow (kW)',ylabel:'Shifted T (°C)'});
    box.querySelector('#pRes').classList.add('show');
  }
  render();
 }});

/* =========================================================
   9. UTILITIES (converter, Reynolds, ideal gas)
========================================================= */
VP.tools.push({id:'utils',title:'Utility Calculators',icon:'🧰',group:'Utilities',
 desc:'Unit converter, Reynolds number, ideal gas',
 render(el){
  el.innerHTML = pageHead('Utility Calculators','Everyday conversions and quick engineering checks.')
   +`<div class="tabs"><div class="tab active" data-t="conv">Unit converter</div><div class="tab" data-t="re">Reynolds</div><div class="tab" data-t="dim">Dimensionless</div><div class="tab" data-t="props">Fluid props</div><div class="tab" data-t="gas">Ideal gas</div></div>`
   + card('Unit converter','','<div id="conv"></div>')
   + `<div id="recard" style="display:none">`+card('Reynolds number','','<div id="reb"></div>')+`</div>`
   + `<div id="dimcard" style="display:none">`+card('Prandtl number','Pr = cp·μ / k — ratio of momentum to thermal diffusivity','<div id="prb"></div>')+card('Schmidt number','Sc = μ / (ρ·D) — ratio of momentum to mass diffusivity','<div id="scb"></div>')+`</div>`
   + `<div id="propscard" style="display:none">`+card('Vapour pressure (Antoine)','log₁₀(P mmHg) = A − B/(C + T°C)','<div id="vpb"></div>')+card('Density','Ideal-gas (P,T,M) or mass ÷ volume','<div id="denb"></div>')+card('Viscosity of water','Dynamic & kinematic viscosity vs temperature','<div id="visb"></div>')+`</div>`
   + `<div id="gascard" style="display:none">`+card('Ideal gas law','PV = nRT','<div id="gasb"></div>')+`</div>`;
  const tabs=el.querySelectorAll('.tab');
  tabs.forEach(t=>t.onclick=()=>{tabs.forEach(x=>x.classList.remove('active'));t.classList.add('active');
    el.querySelectorAll('.card')[0].style.display=t.dataset.t==='conv'?'':'none';
    el.querySelector('#recard').style.display=t.dataset.t==='re'?'':'none';
    el.querySelector('#dimcard').style.display=t.dataset.t==='dim'?'':'none';
    el.querySelector('#propscard').style.display=t.dataset.t==='props'?'':'none';
    el.querySelector('#gascard').style.display=t.dataset.t==='gas'?'':'none';});

  const units={
    Pressure:{Pa:1,kPa:1000,bar:1e5,'atm':101325,psi:6894.76,mmHg:133.322,'kg/cm²':98066.5},
    Flow:{'m³/s':1,'m³/h':1/3600,'L/s':1e-3,'L/min':1e-3/60,'gpm(US)':6.309e-5,'ft³/min':4.719e-4},
    Power:{W:1,kW:1000,MW:1e6,hp:745.7,'kcal/h':1.163,'BTU/h':0.293071},
    Energy:{J:1,kJ:1000,kWh:3.6e6,kcal:4184,BTU:1055.06},
    Length:{m:1,mm:1e-3,cm:1e-2,km:1000,inch:0.0254,ft:0.3048},
    'Mass flow':{'kg/s':1,'kg/h':1/3600,'t/h':1000/3600,'lb/h':1.2599e-4}
  };
  const convInputs=[
    {id:'cat',label:'Category',type:'select',val:'Pressure',options:Object.keys(units).map(k=>({v:k,t:k}))},
    {id:'val',label:'Value',val:1},
    {id:'from',label:'From',type:'select',val:'bar',options:Object.keys(units.Pressure).map(k=>({v:k,t:k}))},
    {id:'to',label:'To',type:'select',val:'kPa',options:Object.keys(units.Pressure).map(k=>({v:k,t:k}))}
  ];
  function buildConv(){
    VP.calcForm(el.querySelector('#conv'),{
      inputs:convInputs,
      compute(v){
        const map=units[v.cat];
        if(!map[v.from]||!map[v.to]) throw new Error('Pick units in the chosen category, then Calculate.');
        const si=v.val*map[v.from]; const out=si/map[v.to];
        return {results:[{label:`${v.val} ${v.from} =`,value:out,unit:v.to,digits:6}],notes:[{text:'Switch category then press Calculate to refresh the unit lists.'}]};
      }
    });
    // refresh from/to options when category changes
    const catSel=el.querySelector('#cat');
    catSel.addEventListener('change',()=>{
      const keys=Object.keys(units[catSel.value]);
      ['from','to'].forEach((id,idx)=>{const s=el.querySelector('#'+id);s.innerHTML=keys.map(k=>`<option value="${k}">${k}</option>`).join('');s.value=keys[idx]||keys[0];});
    });
  }
  buildConv();

  VP.calcForm(el.querySelector('#reb'),{
    inputs:[
      {id:'rho',label:'Density',unit:'kg/m³',val:998},
      {id:'v',label:'Velocity',unit:'m/s',val:2},
      {id:'D',label:'Characteristic length',unit:'mm',val:50},
      {id:'mu',label:'Viscosity',unit:'Pa·s',val:0.001}
    ],
    compute(v){
      const Re=v.rho*v.v*(v.D/1000)/v.mu;
      return {results:[{label:'Reynolds number',value:Re,unit:'',digits:0},
        {label:'Regime',value:Re<2300?'Laminar':(Re<4000?'Transition':'Turbulent'),unit:'',digits:0}],notes:[]};
    }
  });

  VP.calcForm(el.querySelector('#gasb'),{
    inputs:[
      {id:'solve',label:'Solve for',type:'select',val:'V',options:[{v:'P',t:'Pressure'},{v:'V',t:'Volume'},{v:'n',t:'Moles'},{v:'T',t:'Temperature'}]},
      {id:'P',label:'Pressure',unit:'kPa',val:101.325},
      {id:'V',label:'Volume',unit:'m³',val:1},
      {id:'n',label:'Moles',unit:'mol',val:0},
      {id:'T',label:'Temperature',unit:'°C',val:25}
    ],
    compute(v){
      const R=8.314462; const T=v.T+273.15; const P=v.P*1000;
      let res;
      if(v.solve==='P'){const x=v.n*R*T/v.V;res={label:'Pressure',value:x/1000,unit:'kPa'};}
      else if(v.solve==='V'){const x=v.n*R*T/P;res={label:'Volume',value:x,unit:'m³'};}
      else if(v.solve==='n'){const x=P*v.V/(R*T);res={label:'Moles',value:x,unit:'mol'};}
      else {const x=P*v.V/(v.n*R)-273.15;res={label:'Temperature',value:x,unit:'°C'};}
      return {results:[res],notes:[{text:'R = 8.314 J/mol·K. Enter the three known variables; the selected one is computed.'}]};
    }
  });

  VP.calcForm(el.querySelector('#prb'),{cols:2,inputs:[
    {id:'cp',label:'Specific heat cp',unit:'J/kg·K',val:4180},
    {id:'mu',label:'Dynamic viscosity μ',unit:'Pa·s',val:0.001},
    {id:'k',label:'Thermal conductivity k',unit:'W/m·K',val:0.6}
  ],compute(v){
    if(v.k<=0)throw new Error('Thermal conductivity must be > 0.');
    const Pr=v.cp*v.mu/v.k;
    return {results:[
      {label:'Prandtl number Pr',value:Pr,unit:'',digits:3}
    ],notes:[{text:'Pr = cp·μ/k. Typical: liquid metals ≪1, gases ≈0.7, water ≈7, oils 50–100,000. High Pr ⇒ momentum diffuses faster than heat (thin thermal boundary layer).'}]};
  }});

  VP.calcForm(el.querySelector('#scb'),{cols:2,inputs:[
    {id:'mu',label:'Dynamic viscosity μ',unit:'Pa·s',val:0.001},
    {id:'rho',label:'Density ρ',unit:'kg/m³',val:998},
    {id:'D',label:'Mass diffusivity D',unit:'m²/s',val:1e-9}
  ],compute(v){
    if(v.rho<=0||v.D<=0)throw new Error('Density and diffusivity must be > 0.');
    const Sc=v.mu/(v.rho*v.D);
    return {results:[
      {label:'Schmidt number Sc',value:Sc,unit:'',digits:1},
      {label:'Kinematic viscosity ν',value:v.mu/v.rho,unit:'m²/s',digits:8}
    ],notes:[{text:'Sc = μ/(ρ·D) = ν/D. Typical: gases ≈0.2–3, liquids ≈100–10,000. The mass-transfer analogue of Pr.'}]};
  }});

  const ANTO={
    water:{n:'Water',A:8.07131,B:1730.63,C:233.426,rng:'1–100 °C'},
    benzene:{n:'Benzene',A:6.90565,B:1211.033,C:220.790,rng:'8–103 °C'},
    toluene:{n:'Toluene',A:6.95464,B:1344.80,C:219.482,rng:'6–137 °C'},
    methanol:{n:'Methanol',A:8.08097,B:1582.271,C:239.726,rng:'15–84 °C'},
    ethanol:{n:'Ethanol',A:8.20417,B:1642.89,C:230.300,rng:'−2–100 °C'},
    acetone:{n:'Acetone',A:7.02447,B:1161.0,C:224.0,rng:'−13–55 °C'}
  };
  VP.calcForm(el.querySelector('#vpb'),{cols:2,inputs:[
    {id:'fluid',label:'Fluid',type:'select',val:'water',options:Object.keys(ANTO).map(k=>({v:k,t:ANTO[k].n})).concat([{v:'custom',t:'Custom A/B/C'}])},
    {id:'T',label:'Temperature',unit:'°C',val:25},
    {id:'A',label:'A (Custom)',unit:'',val:8.07131},
    {id:'B',label:'B (Custom)',unit:'',val:1730.63},
    {id:'C',label:'C (Custom)',unit:'',val:233.426}
  ],compute(v){
    const a=v.fluid==='custom'?{A:v.A,B:v.B,C:v.C}:ANTO[v.fluid];
    const Pmm=Math.pow(10,a.A-a.B/(a.C+v.T)), kPa=Pmm*0.1333224;
    return {results:[
      {label:'Vapour pressure',value:kPa,unit:'kPa',digits:3},
      {label:'Vapour pressure',value:kPa/100,unit:'bar',digits:5},
      {label:'Vapour pressure',value:Pmm,unit:'mmHg',digits:2},
      {label:'Vapour pressure',value:kPa/101.325,unit:'atm',digits:5}
    ],notes:[{text:'Antoine: log₁₀(P[mmHg]) = A − B/(C + T[°C]).'+(v.fluid!=='custom'?' Constants valid '+ANTO[v.fluid].rng+'.':'')}]};
  }});

  VP.calcForm(el.querySelector('#denb'),{cols:2,inputs:[
    {id:'mode',label:'Method',type:'select',val:'gas',options:[{v:'gas',t:'Ideal gas (P, T, M)'},{v:'mv',t:'Mass ÷ volume'}]},
    {id:'P',label:'Pressure',unit:'kPa',val:101.325},
    {id:'T',label:'Temperature',unit:'°C',val:25},
    {id:'M',label:'Molar mass',unit:'g/mol',val:28.97},
    {id:'mass',label:'Mass (mass/vol mode)',unit:'kg',val:1},
    {id:'vol',label:'Volume (mass/vol mode)',unit:'m³',val:1}
  ],compute(v){
    let rho,note;
    if(v.mode==='gas'){const Tk=v.T+273.15;if(Tk<=0)throw new Error('Temperature below absolute zero.');rho=v.P*v.M/(8.314462*Tk);note='Ideal gas: ρ = P·M/(R·T).';}
    else{if(v.vol<=0)throw new Error('Volume must be > 0.');rho=v.mass/v.vol;note='ρ = mass / volume.';}
    return {results:[
      {label:'Density',value:rho,unit:'kg/m³',digits:4},
      {label:'Density',value:rho/1000,unit:'g/cm³',digits:6}
    ],notes:[{text:note}]};
  }});

  VP.calcForm(el.querySelector('#visb'),{cols:2,inputs:[
    {id:'T',label:'Water temperature',unit:'°C',val:20},
    {id:'rho',label:'Density (for kinematic)',unit:'kg/m³',val:998}
  ],compute(v){
    const Tk=v.T+273.15;
    if(Tk<=140)throw new Error('Temperature out of correlation range.');
    const mu=2.414e-5*Math.pow(10,247.8/(Tk-140));
    const nu=v.rho>0?mu/v.rho:NaN;
    return {results:[
      {label:'Dynamic viscosity μ',value:mu,unit:'Pa·s',digits:6},
      {label:'Dynamic viscosity μ',value:mu*1000,unit:'cP (mPa·s)',digits:4},
      {label:'Kinematic viscosity ν',value:nu*1e6,unit:'cSt (mm²/s)',digits:4},
      {label:'Kinematic viscosity ν',value:nu,unit:'m²/s',digits:9}
    ],notes:[{text:'Water: μ = 2.414×10⁻⁵·10^(247.8/(T−140)) Pa·s (T in K), accurate 0–100 °C. ν = μ/ρ. 1 cP = 10⁻³ Pa·s; 1 cSt = 10⁻⁶ m²/s. At 20 °C μ ≈ 1.0 cP.'}]};
  }});
 }});

/* =========================================================
   10. ASPEN PLUS HELPER
========================================================= */
VP.tools.push({id:'aspen',title:'Aspen Plus Helper',icon:'🧪',group:'Reference',
 desc:'Property-method picker, tips & error fixes',
 render(el){
  el.innerHTML = pageHead('Aspen Plus Helper','Pick a thermodynamic method, plus a reference cheat-sheet and common-error fixes.')
   + card('Property method recommender','Describe your system to get a starting property method.','<div id="aspen"></div>')
   + card('Quick reference','',`
     <p><strong>Property method families</strong></p>
     <div class="table-wrap"><table class="data"><thead><tr><th>System</th><th>Recommended</th><th>Notes</th></tr></thead><tbody>
     <tr><td>Hydrocarbons, refinery, gas processing</td><td>Peng-Robinson / SRK</td><td>Non-polar, high P; PR for most.</td></tr>
     <tr><td>Polar / non-ideal liquids (alcohols, water-organics)</td><td>NRTL / UNIQUAC + Henry</td><td>Activity-coefficient model for VLE/LLE.</td></tr>
     <tr><td>Polar + high pressure (e.g. CO₂ + methanol)</td><td>PSRK / PC-SAFT</td><td>EOS with mixing rules.</td></tr>
     <tr><td>Electrolytes / acid gas / amine</td><td>ELECNRTL</td><td>Use Electrolyte Wizard.</td></tr>
     <tr><td>Water + steam utilities</td><td>STEAM-TA / IAPWS-95</td><td>Pure-water steam tables.</td></tr>
     <tr><td>Light gases, ideal low-P</td><td>IDEAL</td><td>Only for near-ideal, low P.</td></tr>
     </tbody></table></div>
     <hr class="soft">
     <p><strong>Convergence tips</strong></p>
     <div class="note">• Provide good initial estimates for recycle tear streams. • Use Broyden/Wegstein for tough recycles. • Sequence: get flowsheet running without recycles, then close loops. • For columns, start with shortcut (DSTWU) → initialize RadFrac. • Watch for temperature/composition that fall outside property data range.</div>
     <hr class="soft">
     <p><strong>Common errors</strong></p>
     <div class="note">• <em>"Property method not specified"</em> → set Methods | Global. • <em>Flash failure / 2 liquid phases</em> → enable Free-water or rigorous 3-phase flash; check method supports LLE. • <em>Recycle not converged</em> → raise iterations, scale tear-stream tolerance, add a Design Spec slowly. • <em>Missing binary parameters</em> → estimate with UNIFAC or supply data.</div>
     <hr class="soft">
     <p><strong>Block selection guide</strong></p>
     <div class="table-wrap"><table class="data"><thead><tr><th>Need</th><th>Aspen block</th></tr></thead><tbody>
     <tr><td>Mix streams / split by ratio</td><td>Mixer / FSplit</td></tr>
     <tr><td>Component separation (spec recovery)</td><td>Sep / Sep2</td></tr>
     <tr><td>Single/2-phase flash</td><td>Flash2; Flash3 for 3-phase</td></tr>
     <tr><td>Heat / cool a stream</td><td>Heater</td></tr>
     <tr><td>Two-stream exchanger</td><td>HeatX (shortcut or rigorous)</td></tr>
     <tr><td>Distillation — shortcut</td><td>DSTWU (then initialize RadFrac)</td></tr>
     <tr><td>Distillation — rigorous</td><td>RadFrac</td></tr>
     <tr><td>Reactor — known conversion</td><td>RStoic / RYield</td></tr>
     <tr><td>Reactor — equilibrium</td><td>REquil / RGibbs</td></tr>
     <tr><td>Reactor — kinetics (PFR/CSTR)</td><td>RPlug / RCSTR</td></tr>
     <tr><td>Raise pressure (liquid / gas)</td><td>Pump / Compr (MCompr multistage)</td></tr>
     <tr><td>Throttle / pressure letdown</td><td>Valve</td></tr>
     </tbody></table></div>
     <div class="note"><strong>Column wizard:</strong> start with DSTWU (light/heavy key, R/R_min, recoveries) → read N_min, R_min, feed stage → transfer to RadFrac, set stages & feed, add Design Specs one at a time. <strong>HeatX:</strong> begin in shortcut mode with a target ΔT or duty, then switch to rigorous once converged.</div>
   `);
  VP.calcForm(el.querySelector('#aspen'),{
    cols:2,
    inputs:[
      {id:'polar',label:'Polarity',type:'select',val:'nonpolar',options:[{v:'nonpolar',t:'Non-polar (HC, gases)'},{v:'polar',t:'Polar / hydrogen-bonding'}]},
      {id:'elec',label:'Electrolytes / acid gas?',type:'select',val:'no',options:[{v:'no',t:'No'},{v:'yes',t:'Yes'}]},
      {id:'press',label:'Pressure level',type:'select',val:'low',options:[{v:'low',t:'Low / moderate (<10 bar)'},{v:'high',t:'High (>10 bar)'}]},
      {id:'water',label:'Mainly water/steam?',type:'select',val:'no',options:[{v:'no',t:'No'},{v:'yes',t:'Yes'}]}
    ],
    compute(v){
      let m,why;
      if(v.water==='yes'){m='STEAM-TA (IAPWS-95)';why='Pure water/steam utility system.';}
      else if(v.elec==='yes'){m='ELECNRTL';why='Electrolytes / acid-gas / amine system — use the Electrolyte Wizard.';}
      else if(v.polar==='polar'){ m=(v.press==='high')?'PC-SAFT or PSRK':'NRTL (or UNIQUAC) + Henry for light gases'; why='Polar, hydrogen-bonding liquids need an activity-coefficient model'+(v.press==='high'?', but high pressure favours an SAFT/EOS approach.':'.'); }
      else { m=(v.press==='high')?'Peng-Robinson':'SRK or Peng-Robinson'; why='Non-polar hydrocarbons/gases are well described by a cubic EOS.'; }
      return {results:[],notes:[{text:`Suggested method: <strong>${m}</strong><br>${why}`}]};
    }
  });
 }});

})();
