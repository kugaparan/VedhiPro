/* VedhiPro — extended calculator modules */
(function(){
const VP=window.VP;
const num=VP.num, fmt=VP.fmt;

function pageHead(t,p){return `<div class="page-head"><h1>${t}</h1><p>${p}</p></div>`;}
function card(title,sub,inner){return `<div class="card"><h2>${title}</h2>${sub?`<div class="sub">${sub}</div>`:''}<div>${inner||''}</div></div>`;}

/* tabbed page helper: tabs=[{key,label,title,sub,setup(boxEl)}] */
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

/* =========================================================
   SPLITTER, MIXER NETWORK & ACCUMULATION
========================================================= */
VP.tools.push({id:'splitter',title:'Splitter & Accumulation',icon:'🔀',group:'Process',
 desc:'Stream splitting, mixer→splitter, accumulation',
 render(el){ buildTabs(el,'Splitter & Accumulation','Stream splitting, simple networks, and unsteady-state accumulation.',[
  {key:'split',label:'Splitter',title:'Stream splitter',sub:'Feed = Product1 + Product2',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'F',label:'Feed flow',unit:'kg/h',val:1000},
      {id:'frac',label:'Split fraction to Product 1',unit:'0–1',val:0.3}
    ],compute(v){if(v.frac<0||v.frac>1)throw new Error('Fraction must be 0–1');
      return {results:[
        {label:'Product 1',value:v.F*v.frac,unit:'kg/h',digits:1},
        {label:'Product 2',value:v.F*(1-v.frac),unit:'kg/h',digits:1},
        {label:'Balance check (Σout)',value:v.F,unit:'kg/h',digits:1}
      ],notes:[{text:'A splitter does not change composition — both products have the feed composition.'}]};}});
  }},
  {key:'net',label:'Mixer → Splitter',title:'Mixer–splitter network',sub:'Feed A + Feed B → mix → split',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'A',label:'Feed A',unit:'kg/h',val:600},
      {id:'B',label:'Feed B',unit:'kg/h',val:400},
      {id:'frac',label:'Splitter fraction to Product 1',unit:'0–1',val:0.5}
    ],compute(v){const M=v.A+v.B;return {results:[
        {label:'Mixed stream',value:M,unit:'kg/h',digits:1},
        {label:'Product 1',value:M*v.frac,unit:'kg/h',digits:1},
        {label:'Product 2',value:M*(1-v.frac),unit:'kg/h',digits:1}
      ],notes:[{text:'Overall balance: A + B = P1 + P2 at steady state.'}]};}});
  }},
  {key:'acc',label:'Accumulation',title:'Unsteady-state balance',sub:'Accumulation = In − Out + Generation − Consumption',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'in',label:'In',unit:'kg/h',val:500},
      {id:'out',label:'Out',unit:'kg/h',val:300},
      {id:'gen',label:'Generation',unit:'kg/h',val:0},
      {id:'con',label:'Consumption',unit:'kg/h',val:0}
    ],compute(v){const acc=v.in-v.out+v.gen-v.con;return {results:[
        {label:'Accumulation rate',value:acc,unit:'kg/h',digits:1},
        {label:'State',value:Math.abs(acc)<1e-9?'Steady state':(acc>0?'Filling':'Depleting'),unit:'',digits:0}
      ],notes:[{text:'Mass in a tank changes by the accumulation rate; multiply by time to get mass change.'}]};}});
  }},
  {key:'rt',label:'Residence time',title:'Residence time',sub:'τ = V / Q',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'V',label:'Active volume',unit:'m³',val:10},
      {id:'Q',label:'Volumetric flow',unit:'m³/h',val:5}
    ],compute(v){
      if(v.Q<=0)throw new Error('Flow must be > 0.');
      const tauH=v.V/v.Q;
      return {results:[
        {label:'Residence time',value:tauH,unit:'h',digits:3},
        {label:'Residence time',value:tauH*60,unit:'min',digits:2},
        {label:'Turnovers per day',value:24/tauH,unit:'/day',digits:2}
      ],notes:[{text:'Mean residence time τ = V/Q (well-mixed). For a reactor this is the space time; for a tank it is the average hold-up time.'}]};
    }});
  }},
  {key:'tank',label:'Tank sizing',title:'Tank sizing from residence time',sub:'V = Q·τ / fill; vertical cylinder',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'Q',label:'Volumetric flow',unit:'m³/h',val:30},
      {id:'tau',label:'Required residence time',unit:'min',val:10},
      {id:'fill',label:'Working fill fraction',unit:'%',val:80},
      {id:'LD',label:'Length / diameter ratio',unit:'',val:3}
    ],compute(v){
      if(v.fill<=0||v.LD<=0)throw new Error('Fill and L/D must be > 0.');
      const Vwork=v.Q*(v.tau/60), Vneed=Vwork/(v.fill/100);
      const D=Math.cbrt(4*Vneed/(Math.PI*v.LD)), L=v.LD*D;
      return {results:[
        {label:'Working volume',value:Vwork,unit:'m³',digits:3},
        {label:'Total tank volume',value:Vneed,unit:'m³',digits:3},
        {label:'Diameter',value:D,unit:'m',digits:2},
        {label:'Height',value:L,unit:'m',digits:2}
      ],notes:[{text:'Total volume = Q·τ / fill-fraction. Vertical cylinder V = (π/4)·D²·L with L = (L/D)·D ⇒ D = [4V/(π·(L/D))]^⅓.'}]};
    }});
  }},
  {key:'surge',label:'Surge / dynamics',title:'Tank fill / drain dynamics',sub:'Net = inflow − outflow',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'V',label:'Tank volume',unit:'m³',val:10},
      {id:'qin',label:'Inflow',unit:'m³/h',val:8},
      {id:'qout',label:'Outflow',unit:'m³/h',val:5},
      {id:'lvl',label:'Initial level',unit:'%',val:50}
    ],compute(v){
      const net=v.qin-v.qout, cur=v.V*v.lvl/100;
      let label,time;
      if(Math.abs(net)<1e-9){label='Time to full/empty';time=Infinity;}
      else if(net>0){label='Time to full';time=(v.V-cur)/net;}
      else{label='Time to empty';time=cur/(-net);}
      return {results:[
        {label:'Net accumulation',value:net,unit:'m³/h',digits:3},
        {label:'Current hold-up',value:cur,unit:'m³',digits:2},
        {label:label,value:isFinite(time)?time:0,unit:isFinite(time)?'h':'(steady)',digits:2},
        {label:'Surge over 10 min',value:Math.abs(net)*(10/60),unit:'m³',digits:3}
      ],notes:[{text:'Net rate = inflow − outflow. Time to fill/empty = remaining (or current) volume ÷ |net|. Size surge capacity for the largest expected flow imbalance × its duration.'}]};
    }});
  }},
  {key:'batch',label:'Batch filling',title:'Batch fill cycle',sub:'Fill time, cycle time, daily throughput',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'V',label:'Target fill volume',unit:'m³',val:10},
      {id:'rate',label:'Fill rate',unit:'m³/h',val:20},
      {id:'heel',label:'Initial heel volume',unit:'m³',val:0},
      {id:'change',label:'Changeover / CIP time',unit:'min',val:30}
    ],compute(v){
      if(v.rate<=0)throw new Error('Fill rate must be > 0.');
      if(v.V<=v.heel)throw new Error('Target must exceed the heel.');
      const fill=(v.V-v.heel)/v.rate, cycle=fill+v.change/60, perDay=24/cycle;
      return {results:[
        {label:'Fill time',value:fill,unit:'h',digits:3},
        {label:'Fill time',value:fill*60,unit:'min',digits:1},
        {label:'Cycle time (fill+CIP)',value:cycle,unit:'h',digits:3},
        {label:'Batches per day',value:perDay,unit:'/day',digits:2},
        {label:'Daily throughput',value:perDay*(v.V-v.heel),unit:'m³/day',digits:1}
      ],notes:[{text:'Fill time = (target − heel)/rate. Cycle = fill + changeover/CIP. Daily output = (24/cycle) × batch volume. Add drain/inspection time to changeover for a realistic schedule.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   REACTOR CONVERSION, YIELD & SELECTIVITY
========================================================= */
VP.tools.push({id:'reactor',title:'Reactor Balance',icon:'🧫',group:'Process',
 desc:'Conversion, yield and selectivity',
 render(el){ buildTabs(el,'Reactor Balance','Conversion, yield and selectivity for reacting systems.',[
  {key:'conv',label:'Conversion',title:'Conversion balance',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'FA',label:'Feed of A',unit:'kmol/h',val:100},
      {id:'X',label:'Conversion',unit:'%',val:75},
      {id:'stoich',label:'Product per A reacted (νP/νA)',unit:'',val:1}
    ],compute(v){const r=v.FA*v.X/100;return {results:[
        {label:'A reacted',value:r,unit:'kmol/h',digits:2},
        {label:'A unreacted',value:v.FA-r,unit:'kmol/h',digits:2},
        {label:'Product formed',value:r*v.stoich,unit:'kmol/h',digits:2}
      ],notes:[{text:'Conversion X = (A in − A out)/A in.'}]};}});
  }},
  {key:'ys',label:'Yield & Selectivity',title:'Yield & selectivity',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'FA',label:'A fed',unit:'kmol/h',val:100},
      {id:'Aout',label:'A remaining',unit:'kmol/h',val:25},
      {id:'D',label:'Desired product formed',unit:'kmol/h',val:60},
      {id:'U',label:'Undesired product formed',unit:'kmol/h',val:15}
    ],compute(v){const reacted=v.FA-v.Aout;return {results:[
        {label:'A reacted',value:reacted,unit:'kmol/h',digits:2},
        {label:'Overall yield (D/A fed)',value:v.D/v.FA*100,unit:'%',digits:1},
        {label:'Reaction yield (D/A reacted)',value:v.D/reacted*100,unit:'%',digits:1},
        {label:'Selectivity (D/U)',value:v.D/v.U,unit:'',digits:2}
      ],notes:[{text:'Yield = desired product / reactant basis. Selectivity = desired / undesired product.'}]};}});
  }},
  {key:'stoich',label:'Stoichiometry',title:'Limiting & excess reactant',sub:'Reaction νA·A + νB·B → νP·P',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'nA',label:'Moles of A supplied',unit:'mol',val:2},
      {id:'nB',label:'Moles of B supplied',unit:'mol',val:1},
      {id:'nuA',label:'Coefficient νA',unit:'',val:1},
      {id:'nuB',label:'Coefficient νB',unit:'',val:2},
      {id:'nuP',label:'Coefficient νP (product)',unit:'',val:1}
    ],compute(v){
      if(v.nuA<=0||v.nuB<=0||v.nuP<=0)throw new Error('Stoichiometric coefficients must be > 0.');
      if(v.nA<0||v.nB<0)throw new Error('Moles cannot be negative.');
      const ra=v.nA/v.nuA, rb=v.nB/v.nuB, xi=Math.min(ra,rb);
      let limiting,exLabel,exLeft,exPct;
      if(Math.abs(ra-rb)<1e-12){limiting='Exactly stoichiometric';exLabel='—';exLeft=0;exPct=0;}
      else if(ra<rb){limiting='A';exLabel='B';const reqB=v.nuB*xi;exLeft=v.nB-reqB;exPct=reqB>0?(v.nB-reqB)/reqB*100:0;}
      else{limiting='B';exLabel='A';const reqA=v.nuA*xi;exLeft=v.nA-reqA;exPct=reqA>0?(v.nA-reqA)/reqA*100:0;}
      return {results:[
        {label:'Limiting reactant',value:limiting,unit:'',digits:0},
        {label:'Extent of reaction ξ',value:xi,unit:'mol',digits:4},
        {label:'Product P formed',value:v.nuP*xi,unit:'mol',digits:4},
        {label:'Excess reactant',value:exLabel,unit:'',digits:0},
        {label:'Excess left unreacted',value:exLeft,unit:'mol',digits:4},
        {label:'% excess supplied',value:exPct,unit:'%',digits:1}
      ],notes:[{text:'The limiting reactant has the smallest (moles ÷ coefficient). Extent ξ = that ratio; product = νP·ξ; %excess = (supplied − stoichiometric requirement)/requirement for the other reactant, at complete conversion of the limiting reactant.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   THERMODYNAMICS
========================================================= */
VP.tools.push({id:'thermo',title:'Thermodynamics',icon:'🌡️',group:'Thermo',
 desc:'Heat duty, entropy, Gibbs free energy, J–T',
 render(el){ buildTabs(el,'Thermodynamics','Energy, entropy, spontaneity and throttling.',[
  {key:'q',label:'Heat duty',title:'Sensible heat duty',sub:'Q = ṁ·Cp·ΔT',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'m',label:'Mass flow',unit:'kg/h',val:1000},
      {id:'cp',label:'Specific heat Cp',unit:'kJ/kg·K',val:4.18},
      {id:'Tin',label:'Inlet temperature',unit:'°C',val:25},
      {id:'Tout',label:'Outlet temperature',unit:'°C',val:80}
    ],compute(v){const Q=v.m/3600*v.cp*(v.Tout-v.Tin);return {results:[
        {label:'Heat duty',value:Q,unit:'kW',digits:3},
        {label:'Heat duty',value:Q*3600,unit:'kJ/h',digits:0},
        {label:'Direction',value:Q>=0?'Heating':'Cooling',unit:'',digits:0}
      ],notes:[]};}});
  }},
  {key:'s',label:'Entropy',title:'Entropy change',sub:'ΔS = ṁ·Cp·ln(T₂/T₁)',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'m',label:'Mass flow',unit:'kg/h',val:1000},
      {id:'cp',label:'Cp',unit:'kJ/kg·K',val:4.18},
      {id:'T1',label:'T₁',unit:'°C',val:25},
      {id:'T2',label:'T₂',unit:'°C',val:80}
    ],compute(v){const dS=v.m/3600*v.cp*Math.log((v.T2+273.15)/(v.T1+273.15));return {results:[
        {label:'Entropy change rate',value:dS,unit:'kW/K',digits:4}
      ],notes:[{text:'Temperatures converted to Kelvin. Positive = entropy increase.'}]};}});
  }},
  {key:'g',label:'Gibbs',title:'Gibbs free energy',sub:'ΔG = ΔH − TΔS',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'dH',label:'ΔH',unit:'kJ/mol',val:-50},
      {id:'dS',label:'ΔS',unit:'J/mol·K',val:-100},
      {id:'T',label:'Temperature',unit:'°C',val:25}
    ],compute(v){const T=v.T+273.15;const dG=v.dH-T*v.dS/1000;return {results:[
        {label:'ΔG',value:dG,unit:'kJ/mol',digits:3},
        {label:'Feasibility',value:dG<0?'Spontaneous':(dG>0?'Non-spontaneous':'Equilibrium'),unit:'',digits:0}
      ],notes:[{text:'ΔG < 0 indicates a thermodynamically favourable (spontaneous) reaction at this temperature.'}]};}});
  }},
  {key:'jt',label:'Joule–Thomson',title:'Throttling temperature change',sub:'ΔT = μ_JT · ΔP',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'mu',label:'J–T coefficient μ',unit:'K/bar',val:0.25},
      {id:'dP',label:'Pressure drop (P₁−P₂)',unit:'bar',val:50}
    ],compute(v){const dT=-v.mu*(-v.dP);return {results:[
        {label:'Temperature change',value:-v.mu*v.dP,unit:'K',digits:2},
        {label:'Effect',value:(v.mu>0?'Cools on expansion':'Heats on expansion'),unit:'',digits:0}
      ],notes:[{text:'ΔT = μ·ΔP across the valve (ΔP = P₂−P₁ < 0 for expansion). Most gases cool (μ>0) below their inversion temperature; H₂/He heat.'}]};}});
  }},
  {key:'eos',label:'Cubic EOS',title:'Cubic EOS — compressibility factor Z',sub:'Peng-Robinson / SRK for a pure fluid',setup(b){
    const PRESET={
      custom:{n:'Custom',Tc:304.13,Pc:73.77,w:0.225,MW:44.01},
      co2:{n:'Carbon dioxide',Tc:304.13,Pc:73.77,w:0.225,MW:44.01},
      ch4:{n:'Methane',Tc:190.56,Pc:45.99,w:0.011,MW:16.04},
      n2:{n:'Nitrogen',Tc:126.20,Pc:33.96,w:0.037,MW:28.01},
      o2:{n:'Oxygen',Tc:154.58,Pc:50.43,w:0.022,MW:32.00},
      h2o:{n:'Water/steam',Tc:647.10,Pc:220.64,w:0.345,MW:18.02},
      nh3:{n:'Ammonia',Tc:405.50,Pc:113.50,w:0.250,MW:17.03},
      c2h4:{n:'Ethylene',Tc:282.34,Pc:50.41,w:0.087,MW:28.05},
      c3h8:{n:'Propane',Tc:369.83,Pc:42.48,w:0.152,MW:44.10}
    };
    function cubicRoots(a2,a1,a0){
      const p=a1-a2*a2/3, q=2*a2*a2*a2/27-a2*a1/3+a0, D=q*q/4+p*p*p/27, roots=[];
      if(D>1e-14){const s=Math.sqrt(D);roots.push(Math.cbrt(-q/2+s)+Math.cbrt(-q/2-s)-a2/3);}
      else{const r=Math.sqrt(-p*p*p/27);const ph=Math.acos(Math.max(-1,Math.min(1,-q/2/r)));const m=2*Math.cbrt(r);
        for(let k=0;k<3;k++)roots.push(m*Math.cos((ph+2*Math.PI*k)/3)-a2/3);}
      return roots;
    }
    VP.calcForm(b,{cols:2,inputs:[
      {id:'eos',label:'Equation of state',type:'select',val:'PR',options:opts([['PR','Peng-Robinson'],['SRK','Soave-Redlich-Kwong']])},
      {id:'fluid',label:'Fluid (preset)',type:'select',val:'co2',options:Object.keys(PRESET).map(k=>({v:k,t:PRESET[k].n}))},
      {id:'T',label:'Temperature',unit:'°C',val:50},
      {id:'P',label:'Pressure',unit:'bar',val:50},
      {id:'Tc',label:'Tc (Custom only)',unit:'K',val:304.13},
      {id:'Pc',label:'Pc (Custom only)',unit:'bar',val:73.77},
      {id:'w',label:'Acentric factor ω (Custom)',unit:'',val:0.225},
      {id:'MW',label:'Molar mass (for density)',unit:'g/mol',val:44.01}
    ],compute(v){
      const pr=PRESET[v.fluid]||PRESET.custom;
      const Tc=v.fluid==='custom'?v.Tc:pr.Tc, Pc=(v.fluid==='custom'?v.Pc:pr.Pc)*1e5, w=v.fluid==='custom'?v.w:pr.w;
      const MW=v.fluid==='custom'?v.MW:pr.MW;
      const R=8.314462618, T=v.T+273.15, P=v.P*1e5, Tr=T/Tc;
      if(T<=0||P<=0)throw new Error('T and P must be positive.');
      const isPR=v.eos==='PR';
      const ac=(isPR?0.45724:0.42748)*R*R*Tc*Tc/Pc;
      const bb=(isPR?0.07780:0.08664)*R*Tc/Pc;
      const kap=isPR?(0.37464+1.54226*w-0.26992*w*w):(0.480+1.574*w-0.176*w*w);
      const alpha=Math.pow(1+kap*(1-Math.sqrt(Tr)),2);
      const a=ac*alpha;
      const A=a*P/(R*R*T*T), B=bb*P/(R*T);
      let roots;
      if(isPR)roots=cubicRoots(-(1-B), A-2*B-3*B*B, -(A*B-B*B-B*B*B));
      else roots=cubicRoots(-1, A-B-B*B, -A*B);
      const real=roots.filter(z=>isFinite(z)&&z>B);
      if(!real.length)throw new Error('No valid root — check inputs.');
      const Zv=Math.max(...real), Zl=Math.min(...real);
      const Vv=Zv*R*T/P, rho=MW>0?MW/1000/Vv:NaN;
      const res=[
        {label:'Reduced temperature Tr',value:Tr,unit:'',digits:3},
        {label:'Z (vapour root)',value:Zv,unit:'',digits:4},
        {label:'Molar volume (vapour)',value:Vv*1000,unit:'L/mol',digits:4},
        {label:'Gas density',value:rho,unit:'kg/m³',digits:3},
        {label:'A',value:A,unit:'',digits:4},
        {label:'B',value:B,unit:'',digits:5}
      ];
      if(real.length>1&&Math.abs(Zv-Zl)>1e-4)res.push({label:'Z (liquid root)',value:Zl,unit:'',digits:4});
      return {results:res,notes:[{text:(isPR?'Peng-Robinson':'SRK')+': a='+fmt(a,4)+' Pa·m⁶/mol², b='+fmt(bb*1e6,2)+' cm³/mol. Z from the cubic; the largest real root >B is the vapour phase. Z→1 as P→0 (ideal gas).'}]};
    }});
  }},
  {key:'fug',label:'Fugacity',title:'Fugacity coefficient (Peng-Robinson)',sub:'φ and f for a pure gas',setup(b){
    function cubicRoots(a2,a1,a0){
      const p=a1-a2*a2/3, q=2*a2*a2*a2/27-a2*a1/3+a0, D=q*q/4+p*p*p/27, r=[];
      if(D>1e-14){const s=Math.sqrt(D);r.push(Math.cbrt(-q/2+s)+Math.cbrt(-q/2-s)-a2/3);}
      else{const rr=Math.sqrt(-p*p*p/27);const ph=Math.acos(Math.max(-1,Math.min(1,-q/2/rr)));const m=2*Math.cbrt(rr);
        for(let k=0;k<3;k++)r.push(m*Math.cos((ph+2*Math.PI*k)/3)-a2/3);}
      return r;
    }
    VP.calcForm(b,{cols:2,inputs:[
      {id:'T',label:'Temperature',unit:'°C',val:50},
      {id:'P',label:'Pressure',unit:'bar',val:50},
      {id:'Tc',label:'Critical temperature',unit:'K',val:304.13},
      {id:'Pc',label:'Critical pressure',unit:'bar',val:73.77},
      {id:'w',label:'Acentric factor ω',unit:'',val:0.225}
    ],compute(v){
      const R=8.314462618, T=v.T+273.15, P=v.P*1e5, Pc=v.Pc*1e5, Tr=T/v.Tc;
      const ac=0.45724*R*R*v.Tc*v.Tc/Pc, bb=0.07780*R*v.Tc/Pc;
      const kap=0.37464+1.54226*v.w-0.26992*v.w*v.w, alpha=Math.pow(1+kap*(1-Math.sqrt(Tr)),2), a=ac*alpha;
      const A=a*P/(R*R*T*T), B=bb*P/(R*T);
      const roots=cubicRoots(-(1-B),A-2*B-3*B*B,-(A*B-B*B-B*B*B)).filter(z=>z>B);
      if(!roots.length)throw new Error('No valid root — check inputs.');
      const Z=Math.max(...roots);
      const lnphi=Z-1-Math.log(Z-B)-(A/(2*Math.SQRT2*B))*Math.log((Z+(1+Math.SQRT2)*B)/(Z+(1-Math.SQRT2)*B));
      const phi=Math.exp(lnphi);
      return {results:[
        {label:'Compressibility Z',value:Z,unit:'',digits:4},
        {label:'Fugacity coefficient φ',value:phi,unit:'',digits:4},
        {label:'Fugacity f = φ·P',value:phi*v.P,unit:'bar',digits:3},
        {label:'Departure from ideal',value:(phi-1)*100,unit:'%',digits:1}
      ],notes:[{text:'Peng-Robinson: ln φ = Z − 1 − ln(Z−B) − A/(2√2·B)·ln[(Z+(1+√2)B)/(Z+(1−√2)B)]. φ→1 as P→0; φ<1 means attractive forces dominate (real < ideal pressure).'}]};
    }});
  }},
  {key:'vle',label:'Phase equilibrium',title:'Binary VLE (Raoult)',sub:'K-values, relative volatility, bubble P',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'P',label:'System pressure',unit:'kPa',val:101.325},
      {id:'Psat1',label:'Light comp. vapour pressure',unit:'kPa',val:180},
      {id:'Psat2',label:'Heavy comp. vapour pressure',unit:'kPa',val:75},
      {id:'x1',label:'Liquid mole fraction x₁',unit:'',val:0.5}
    ],compute(v){
      if(v.x1<0||v.x1>1)throw new Error('x₁ must be 0–1.');
      const K1=v.Psat1/v.P, K2=v.Psat2/v.P, alpha=K1/K2;
      const Pbub=v.x1*v.Psat1+(1-v.x1)*v.Psat2, y1=v.x1*v.Psat1/Pbub;
      const state=Pbub>v.P?'Superheated (boils — Pbub>P)':(Pbub<v.P?'Subcooled liquid':'At bubble point');
      return {results:[
        {label:'K₁ (light)',value:K1,unit:'',digits:3},
        {label:'K₂ (heavy)',value:K2,unit:'',digits:3},
        {label:'Relative volatility α',value:alpha,unit:'',digits:3},
        {label:'Bubble pressure',value:Pbub,unit:'kPa',digits:2},
        {label:'Vapour y₁ at bubble',value:y1,unit:'',digits:3},
        {label:'State at system P',value:state,unit:'',digits:0}
      ],notes:[{text:'Raoult: K_i = Psat_i/P, y_i = K_i·x_i, α = K₁/K₂. Bubble pressure = Σx_i·Psat_i. Ideal-solution model — use activity coefficients (NRTL/UNIQUAC) for non-ideal or azeotropic systems.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   CONTROL VALVE Cv
========================================================= */
VP.tools.push({id:'cv',title:'Control Valve Cv',icon:'🚰',group:'Fluids',
 desc:'Valve sizing (Cv / Kv) for liquid & gas',
 render(el){ buildTabs(el,'Control Valve Sizing','Valve flow coefficient (Cv / Kv) for liquid and compressible (gas) service.',[
  {key:'liq',label:'Liquid',title:'Liquid Cv / Kv',sub:'Turbulent, non-flashing liquid',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'Q',label:'Volumetric flow',unit:'m³/h',val:25},
      {id:'dP',label:'Pressure drop across valve',unit:'bar',val:1.5},
      {id:'SG',label:'Specific gravity',unit:'(water=1)',val:1.0}
    ],compute(v){if(v.dP<=0)throw new Error('ΔP must be > 0');
      const Kv=v.Q*Math.sqrt(v.SG/v.dP),Cv=1.156*Kv;
      return {results:[
        {label:'Kv (metric)',value:Kv,unit:'m³/h·bar^½',digits:2},
        {label:'Cv (US)',value:Cv,unit:'gpm·psi^½',digits:2}
      ],notes:[{text:'Kv = Q·√(SG/ΔP), Q in m³/h, ΔP in bar. Cv = 1.156·Kv. Aim for 60–80% open at design flow.'}]};}});
  }},
  {key:'gas',label:'Gas / vapour',title:'Gas sizing with choked-flow check',sub:'ISA simplified gas equation (imperial Cv)',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'Q',label:'Standard gas flow',unit:'scfh',val:10000},
      {id:'P1',label:'Inlet pressure (abs)',unit:'psia',val:100},
      {id:'P2',label:'Outlet pressure (abs)',unit:'psia',val:80},
      {id:'G',label:'Gas specific gravity (air=1)',unit:'',val:0.65},
      {id:'T',label:'Inlet temperature',unit:'°F',val:60}
    ],compute(v){
      if(v.P2>=v.P1)throw new Error('Outlet pressure must be below inlet.');
      const TR=v.T+459.67, dP=v.P1-v.P2, choked=v.P2<=v.P1/2;
      const Cv=choked? v.Q/1360*Math.sqrt(v.G*TR/(0.75*v.P1*v.P1))
                     : v.Q/1360*Math.sqrt(v.G*TR/(dP*(v.P1+v.P2)));
      return {results:[
        {label:'Required Cv',value:Cv,unit:'',digits:3},
        {label:'Kv (metric)',value:Cv/1.156,unit:'',digits:3},
        {label:'Flow regime',value:choked?'Choked (critical)':'Sub-critical',unit:'',digits:0},
        {label:'Choking threshold P₂',value:v.P1/2,unit:'psia (P₂≤P₁/2)',digits:1}
      ],notes:[{text:'ISA simplified gas sizing: Q = 1360·Cv·√(ΔP·(P₁+P₂)/(G·T)). Flow chokes when P₂ ≤ P₁/2 — beyond that, extra ΔP gives no more flow (ΔP held at P₁/2). Units: scfh, psia, °R (T+459.67).',warn:choked}]};}});
  }},
  {key:'char',label:'Characteristic',title:'Inherent flow characteristic',sub:'Relative flow vs % opening',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'open',label:'Valve opening',unit:'%',val:50},
      {id:'R',label:'Rangeability R (equal-%)',unit:'',val:50}
    ],compute(v){
      const x=v.open/100;
      if(x<0||x>1)throw new Error('Opening must be 0–100%.');
      const lin=x, eqp=Math.pow(v.R,x-1), qo=Math.sqrt(x);
      return {results:[
        {label:'Linear (f = x)',value:lin*100,unit:'% of max',digits:1},
        {label:'Equal-% (f = Rˣ⁻¹)',value:eqp*100,unit:'% of max',digits:1},
        {label:'Quick-opening (f = √x)',value:qo*100,unit:'% of max',digits:1}
      ],notes:[{text:'Inherent characteristic (constant ΔP). Equal-% gives equal *percentage* flow change per unit travel — best when valve ΔP varies a lot (low authority). Linear suits constant-ΔP loops; quick-opening suits on/off & relief.'}]};
    }});
  }},
  {key:'auth',label:'Authority & cavitation',title:'Valve authority and cavitation index',sub:'',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'dPv',label:'Valve ΔP (full flow)',unit:'kPa',val:100},
      {id:'dPsys',label:'Rest-of-system ΔP',unit:'kPa',val:150},
      {id:'P1',label:'Inlet pressure (abs)',unit:'kPa',val:500},
      {id:'P2',label:'Outlet pressure (abs)',unit:'kPa',val:300},
      {id:'Pv',label:'Liquid vapour pressure (abs)',unit:'kPa',val:50}
    ],compute(v){
      const N=v.dPv/(v.dPv+v.dPsys);
      const sigma=(v.P1-v.P2)!==0?(v.P1-v.Pv)/(v.P1-v.P2):Infinity;
      const authTag=N<0.25?'low — poor control (use equal-%)':(N>0.6?'high':'good (0.25–0.6)');
      let cavTag;
      if(v.P2<v.Pv)cavTag='⚠ Flashing (P₂ < Pv)';
      else if(sigma<1.5)cavTag='⚠ Cavitation likely (σ < 1.5)';
      else if(sigma<2.5)cavTag='Incipient cavitation possible';
      else cavTag='No cavitation expected';
      return {results:[
        {label:'Valve authority N',value:N,unit:'',digits:3},
        {label:'Authority rating',value:authTag,unit:'',digits:0},
        {label:'Cavitation index σ',value:isFinite(sigma)?sigma:0,unit:'',digits:2},
        {label:'Assessment',value:cavTag,unit:'',digits:0}
      ],notes:[{text:'Authority N = ΔP_valve/(ΔP_valve+ΔP_system) at full flow — aim 0.25–0.6. Cavitation index σ = (P₁−Pv)/(P₁−P₂); low σ ⇒ cavitation, and P₂<Pv ⇒ flashing. Use the manufacturer’s σ/Kc limits for a firm call.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   HEAT TRANSFER TOOLS
========================================================= */
VP.tools.push({id:'httools',title:'Heat Transfer',icon:'🔆',group:'Process',
 desc:'LMTD, Q=UAΔT solver, fouling',
 render(el){ buildTabs(el,'Heat Transfer','Driving force, duty and surface fouling.',[
  {key:'lmtd',label:'LMTD',title:'Log-mean temperature difference',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'Thi',label:'Hot inlet',unit:'°C',val:150},{id:'Tho',label:'Hot outlet',unit:'°C',val:90},
      {id:'Tci',label:'Cold inlet',unit:'°C',val:25},{id:'Tco',label:'Cold outlet',unit:'°C',val:70},
      {id:'arr',label:'Arrangement',type:'select',val:'counter',options:opts([['counter','Counter-current'],['co','Co-current']])}
    ],compute(v){let d1,d2;if(v.arr==='counter'){d1=v.Thi-v.Tco;d2=v.Tho-v.Tci;}else{d1=v.Thi-v.Tci;d2=v.Tho-v.Tco;}
      if(d1<=0||d2<=0)throw new Error('Temperature cross — check inputs/arrangement.');
      const lm=Math.abs(d1-d2)<1e-6?d1:(d1-d2)/Math.log(d1/d2);
      return {results:[{label:'LMTD',value:lm,unit:'°C',digits:2},{label:'ΔT₁',value:d1,unit:'°C',digits:1},{label:'ΔT₂',value:d2,unit:'°C',digits:1}],notes:[]};}});
  }},
  {key:'ua',label:'Q = U·A·ΔT',title:'Duty / area / U solver',sub:'Leave the unknown as 0',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'solve',label:'Solve for',type:'select',val:'A',options:opts([['Q','Heat duty'],['A','Area'],['U','U value']])},
      {id:'Q',label:'Heat duty',unit:'kW',val:600},
      {id:'U',label:'Overall U',unit:'W/m²·K',val:500},
      {id:'A',label:'Area',unit:'m²',val:0},
      {id:'dTlm',label:'LMTD',unit:'°C',val:72.2}
    ],compute(v){let res;
      if(v.solve==='Q'){const Q=v.U*v.A*v.dTlm;res={label:'Heat duty',value:Q/1000,unit:'kW'};}
      else if(v.solve==='A'){const A=v.Q*1000/(v.U*v.dTlm);res={label:'Required area',value:A,unit:'m²'};}
      else{const U=v.Q*1000/(v.A*v.dTlm);res={label:'Overall U',value:U,unit:'W/m²·K'};}
      return {results:[{label:res.label,value:res.value,unit:res.unit,digits:3}],notes:[{text:'Q = U·A·LMTD (Q in W). Enter the two known values plus LMTD.'}]};}});
  }},
  {key:'foul',label:'Fouling / U',title:'Overall U from film coefficients',sub:'Series resistances incl. fouling',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'hi',label:'Inside film coeff hᵢ',unit:'W/m²·K',val:3000},
      {id:'ho',label:'Outside film coeff hₒ',unit:'W/m²·K',val:1500},
      {id:'Rfi',label:'Inside fouling Rfᵢ',unit:'m²·K/W',val:0.0002},
      {id:'Rfo',label:'Outside fouling Rfₒ',unit:'m²·K/W',val:0.0002},
      {id:'Rw',label:'Wall resistance',unit:'m²·K/W',val:0.00005}
    ],compute(v){const Rclean=1/v.hi+1/v.ho+v.Rw;const Rdirty=Rclean+v.Rfi+v.Rfo;
      return {results:[
        {label:'Clean U',value:1/Rclean,unit:'W/m²·K',digits:1},
        {label:'Dirty (service) U',value:1/Rdirty,unit:'W/m²·K',digits:1},
        {label:'Total fouling resistance',value:v.Rfi+v.Rfo,unit:'m²·K/W',digits:5},
        {label:'Cleanliness factor',value:Rclean/Rdirty*100,unit:'%',digits:1}
      ],notes:[{text:'1/U = 1/hᵢ + 1/hₒ + R_wall + Rf,ᵢ + Rf,ₒ (per unit area, thin-wall basis). Design to the dirty U.'}]};}});
  }},
  {key:'wall',label:'Plane wall',title:'Plane-wall conduction',sub:'1-D steady: Q = k·A·ΔT/L',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'k',label:'Thermal conductivity k',unit:'W/m·K',val:0.04},
      {id:'L',label:'Wall thickness',unit:'mm',val:50},
      {id:'A',label:'Area',unit:'m²',val:1},
      {id:'T1',label:'Hot surface T₁',unit:'°C',val:200},
      {id:'T2',label:'Cold surface T₂',unit:'°C',val:30}
    ],compute(v){
      if(v.L<=0)throw new Error('Thickness must be > 0.');
      const Lm=v.L/1000, R=Lm/(v.k*v.A), Q=(v.T1-v.T2)/R;
      return {results:[
        {label:'Heat rate Q',value:Q,unit:'W',digits:2},
        {label:'Heat flux q',value:Q/v.A,unit:'W/m²',digits:2},
        {label:'Thermal resistance',value:R,unit:'K/W',digits:4}
      ],notes:[{text:'Q = k·A·(T₁−T₂)/L ; R = L/(k·A). For a composite wall, add the layer resistances in series.'}]};
    }});
  }},
  {key:'cyl',label:'Cylinder',title:'Radial conduction (pipe / insulation)',sub:'Q = 2πkL·ΔT / ln(r₂/r₁)',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'k',label:'Thermal conductivity k',unit:'W/m·K',val:0.04},
      {id:'r1',label:'Inner radius r₁',unit:'mm',val:25},
      {id:'r2',label:'Outer radius r₂',unit:'mm',val:75},
      {id:'L',label:'Length',unit:'m',val:1},
      {id:'T1',label:'Inner surface T₁',unit:'°C',val:120},
      {id:'T2',label:'Outer surface T₂',unit:'°C',val:30}
    ],compute(v){
      if(v.r2<=v.r1||v.r1<=0)throw new Error('Need r₂ > r₁ > 0.');
      const R=Math.log(v.r2/v.r1)/(2*Math.PI*v.k*v.L), Q=(v.T1-v.T2)/R;
      return {results:[
        {label:'Heat rate Q',value:Q,unit:'W',digits:2},
        {label:'Heat per metre',value:Q/v.L,unit:'W/m',digits:2},
        {label:'Thermal resistance',value:R,unit:'K/W',digits:4}
      ],notes:[{text:'Radial conduction: Q = 2π·k·L·(T₁−T₂)/ln(r₂/r₁). Adding insulation raises r₂ — but watch the critical radius on small pipes.'}]};
    }});
  }},
  {key:'fin',label:'Fin',title:'Straight rectangular fin',sub:'Efficiency η = tanh(mL_c)/(mL_c)',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'h',label:'Convection coefficient h',unit:'W/m²·K',val:40},
      {id:'k',label:'Fin conductivity k',unit:'W/m·K',val:200},
      {id:'t',label:'Fin thickness t',unit:'mm',val:3},
      {id:'L',label:'Fin length L',unit:'mm',val:50},
      {id:'w',label:'Fin width w',unit:'mm',val:100},
      {id:'Tb',label:'Base temperature',unit:'°C',val:100},
      {id:'Tinf',label:'Ambient temperature',unit:'°C',val:25}
    ],compute(v){
      const t=v.t/1000,L=v.L/1000,w=v.w/1000;
      if(t<=0||L<=0||w<=0)throw new Error('Dimensions must be > 0.');
      const P=2*(w+t), Ac=w*t, m=Math.sqrt(v.h*P/(v.k*Ac)), Lc=L+t/2, mLc=m*Lc;
      const eta=Math.tanh(mLc)/mLc, Afin=P*Lc, Qfin=eta*v.h*Afin*(v.Tb-v.Tinf);
      return {results:[
        {label:'Fin parameter m',value:m,unit:'1/m',digits:3},
        {label:'m·L_c',value:mLc,unit:'',digits:3},
        {label:'Fin efficiency η',value:eta*100,unit:'%',digits:1},
        {label:'Fin heat rate Q',value:Qfin,unit:'W',digits:2}
      ],notes:[{text:'m = √(h·P/(k·A_c)); corrected length L_c = L + t/2; η = tanh(mL_c)/(mL_c). Q_fin = η·h·A_fin·(T_b − T∞), A_fin = P·L_c.'}]};
    }});
  }},
  {key:'rad',label:'Radiation',title:'Radiation heat exchange',sub:'Q = ε·σ·F·A·(T₁⁴ − T₂⁴)',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'eps',label:'Emissivity ε',unit:'0–1',val:0.8},
      {id:'A',label:'Surface area',unit:'m²',val:1},
      {id:'T1',label:'Surface temperature',unit:'°C',val:200},
      {id:'T2',label:'Surroundings temperature',unit:'°C',val:25},
      {id:'F',label:'View factor F',unit:'0–1',val:1}
    ],compute(v){
      const sig=5.670374e-8, T1=v.T1+273.15, T2=v.T2+273.15;
      const Q=v.eps*sig*v.F*v.A*(Math.pow(T1,4)-Math.pow(T2,4));
      const Qbb=sig*v.F*v.A*(Math.pow(T1,4)-Math.pow(T2,4));
      const hr=(v.T1!==v.T2)?Q/(v.A*(v.T1-v.T2)):0;
      return {results:[
        {label:'Net radiation Q',value:Q,unit:'W',digits:2},
        {label:'Black-body limit (ε=1)',value:Qbb,unit:'W',digits:2},
        {label:'Radiation coefficient h_r',value:hr,unit:'W/m²·K',digits:3}
      ],notes:[{text:'Q = ε·σ·F·A·(T₁⁴ − T₂⁴), σ = 5.67×10⁻⁸ W/m²·K⁴, temperatures in kelvin. F = 1 for a small body in large surroundings.'}]};
    }});
  }},
  {key:'conv',label:'Nat. convection',title:'Natural convection (vertical plate)',sub:'Ra → Nu → h (air defaults)',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'Ts',label:'Surface temperature',unit:'°C',val:100},
      {id:'Tinf',label:'Fluid temperature',unit:'°C',val:25},
      {id:'L',label:'Characteristic length',unit:'m',val:0.3},
      {id:'A',label:'Surface area',unit:'m²',val:0.3},
      {id:'beta',label:'Expansion coeff. β',unit:'1/K',val:0.00333},
      {id:'nu',label:'Kinematic viscosity ν',unit:'m²/s',val:1.57e-5},
      {id:'alpha',label:'Thermal diffusivity α',unit:'m²/s',val:2.25e-5},
      {id:'k',label:'Fluid conductivity k',unit:'W/m·K',val:0.0263}
    ],compute(v){
      const dT=Math.abs(v.Ts-v.Tinf);
      const Ra=9.81*v.beta*dT*Math.pow(v.L,3)/(v.nu*v.alpha);
      const Nu=Ra<1e9?0.59*Math.pow(Ra,0.25):0.10*Math.pow(Ra,1/3);
      const h=Nu*v.k/v.L, Q=h*v.A*dT;
      return {results:[
        {label:'Rayleigh number Ra',value:Ra,unit:'',digits:0},
        {label:'Nusselt number Nu',value:Nu,unit:'',digits:2},
        {label:'Convection coeff. h',value:h,unit:'W/m²·K',digits:2},
        {label:'Heat rate Q',value:Q,unit:'W',digits:2}
      ],notes:[{text:'Vertical plate: Ra = gβΔT·L³/(ν·α); Nu = 0.59·Ra^¼ (laminar, Ra<10⁹) or 0.10·Ra^⅓ (turbulent). Defaults are air at ~300 K — change ν, α, β, k for other fluids.'}]};
    }});
  }},
  {key:'trans',label:'Transient',title:'Transient cooling (lumped capacitance)',sub:'T(t) = T∞ + (Tᵢ−T∞)·e^(−t/τ)',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'h',label:'Convection coeff. h',unit:'W/m²·K',val:50},
      {id:'Lc',label:'Characteristic length V/A',unit:'m',val:0.01},
      {id:'rho',label:'Density ρ',unit:'kg/m³',val:8000},
      {id:'c',label:'Specific heat c',unit:'J/kg·K',val:450},
      {id:'k',label:'Conductivity k (for Biot)',unit:'W/m·K',val:50},
      {id:'Ti',label:'Initial temperature',unit:'°C',val:200},
      {id:'Tinf',label:'Ambient temperature',unit:'°C',val:25},
      {id:'t',label:'Time',unit:'s',val:300}
    ],compute(v){
      const Bi=v.h*v.Lc/v.k, tau=v.rho*v.c*v.Lc/v.h, T=v.Tinf+(v.Ti-v.Tinf)*Math.exp(-v.t/tau);
      const notes=[{text:'Lumped model: τ = ρ·c·L_c/h, T(t) = T∞ + (Tᵢ−T∞)·e^(−t/τ), L_c = V/A. Valid when Biot = h·L_c/k < 0.1.'}];
      if(Bi>=0.1)notes.unshift({text:'⚠ Biot = '+fmt(Bi,3)+' ≥ 0.1 — internal gradients matter; the lumped model is approximate here.',warn:true});
      return {results:[
        {label:'Biot number',value:Bi,unit:'',digits:4},
        {label:'Time constant τ',value:tau,unit:'s',digits:1},
        {label:'Temperature at t',value:T,unit:'°C',digits:2},
        {label:'Fraction remaining (θ/θ₀)',value:(T-v.Tinf)/(v.Ti-v.Tinf)*100,unit:'%',digits:1}
      ],notes};
    }});
  }}
 ]); }});

/* =========================================================
   DISTILLATION (FUG shortcut)
========================================================= */
VP.tools.push({id:'distill',title:'Distillation (FUG)',icon:'🧯',group:'Separation',
 desc:'Relative volatility, Fenske, Underwood, Gilliland',
 render(el){ buildTabs(el,'Shortcut Distillation','Fenske–Underwood–Gilliland method for binary/key-component columns.',[
  {key:'alpha',label:'Rel. volatility',title:'Relative volatility',sub:'α = K_A / K_B',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'mode',label:'Input basis',type:'select',val:'k',options:opts([['k','K-values'],['yx','y,x of both components']])},
      {id:'KA',label:'K_A (or y_A)',unit:'',val:2.5},
      {id:'KB',label:'K_B (or x_A)',unit:'',val:1.0},
      {id:'yB',label:'y_B (yx mode)',unit:'',val:0},
      {id:'xB',label:'x_B (yx mode)',unit:'',val:0}
    ],compute(v){let a;if(v.mode==='k'){a=v.KA/v.KB;}else{a=(v.KA/v.KB)/(v.yB/v.xB);}
      return {results:[{label:'Relative volatility α',value:a,unit:'',digits:3}],notes:[{text:'α>1 means component A is more volatile. α near 1 ⇒ difficult separation, many stages.'}]};}});
  }},
  {key:'fenske',label:'Fenske',title:'Minimum stages (Fenske)',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'xD',label:'Light key in distillate x_D',unit:'frac',val:0.98},
      {id:'xB',label:'Light key in bottoms x_B',unit:'frac',val:0.02},
      {id:'a',label:'Relative volatility α',unit:'',val:2.5}
    ],compute(v){const Nmin=Math.log((v.xD/(1-v.xD))*((1-v.xB)/v.xB))/Math.log(v.a);
      return {results:[
        {label:'Minimum stages N_min',value:Nmin,unit:'(incl. reboiler)',digits:2},
        {label:'Theoretical trays',value:Nmin-1,unit:'',digits:2}
      ],notes:[{text:'Fenske: N_min = ln[(x_D/(1−x_D))·((1−x_B)/x_B)] / ln α at total reflux.'}]};}});
  }},
  {key:'under',label:'Underwood',title:'Minimum reflux (Underwood)',sub:'Binary, saturated-liquid feed (q=1)',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'xD',label:'Light key in distillate x_D',unit:'frac',val:0.98},
      {id:'xF',label:'Light key in feed x_F',unit:'frac',val:0.5},
      {id:'a',label:'Relative volatility α',unit:'',val:2.5}
    ],compute(v){const Rmin=(1/(v.a-1))*(v.xD/v.xF - v.a*(1-v.xD)/(1-v.xF));
      return {results:[{label:'Minimum reflux R_min',value:Rmin,unit:'',digits:3}],notes:[{text:'Binary Underwood at q=1: R_min = 1/(α−1)·[x_D/x_F − α(1−x_D)/(1−x_F)].'}]};}});
  }},
  {key:'gill',label:'Gilliland',title:'Actual stages (Gilliland)',sub:'Eduljee correlation',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'Nmin',label:'Minimum stages N_min',unit:'',val:7.2},
      {id:'Rmin',label:'Minimum reflux R_min',unit:'',val:1.2},
      {id:'R',label:'Actual reflux R',unit:'',val:1.8}
    ],compute(v){if(v.R<=v.Rmin)throw new Error('Actual reflux must exceed R_min');
      const X=(v.R-v.Rmin)/(v.R+1);
      const Y=1-Math.exp(((1+54.4*X)/(11+117.2*X))*((X-1)/Math.sqrt(X)));
      const N=(Y+v.Nmin)/(1-Y);
      return {results:[
        {label:'Gilliland X',value:X,unit:'',digits:3},
        {label:'Gilliland Y',value:Y,unit:'',digits:3},
        {label:'Theoretical stages N',value:N,unit:'',digits:2}
      ],notes:[{text:'X=(R−R_min)/(R+1); Y=1−exp[(1+54.4X)/(11+117.2X)·(X−1)/√X]; N=(Y+N_min)/(1−Y).'}]};}});
  }},
  {key:'fug',label:'Full FUG',title:'Shortcut column design',sub:'Combines all three methods',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'a',label:'Relative volatility α',unit:'',val:2.5},
      {id:'xD',label:'Light key in distillate',unit:'frac',val:0.98},
      {id:'xB',label:'Light key in bottoms',unit:'frac',val:0.02},
      {id:'xF',label:'Light key in feed',unit:'frac',val:0.5},
      {id:'Rfac',label:'R / R_min factor',unit:'',val:1.5}
    ],compute(v){
      const Nmin=Math.log((v.xD/(1-v.xD))*((1-v.xB)/v.xB))/Math.log(v.a);
      const Rmin=(1/(v.a-1))*(v.xD/v.xF - v.a*(1-v.xD)/(1-v.xF));
      const R=v.Rfac*Rmin;
      const X=(R-Rmin)/(R+1);
      const Y=1-Math.exp(((1+54.4*X)/(11+117.2*X))*((X-1)/Math.sqrt(X)));
      const N=(Y+Nmin)/(1-Y);
      return {results:[
        {label:'N_min (Fenske)',value:Nmin,unit:'',digits:2},
        {label:'R_min (Underwood)',value:Rmin,unit:'',digits:3},
        {label:'Operating reflux R',value:R,unit:'',digits:3},
        {label:'Theoretical stages N',value:N,unit:'',digits:1},
        {label:'Real trays (η≈70%)',value:N/0.7,unit:'',digits:0}
      ],notes:[{text:'Typical design uses R = 1.2–1.5 × R_min. Real trays = theoretical / tray efficiency.'}]};}});
  }}
 ]); }});

/* =========================================================
   REACTION ENGINEERING
========================================================= */
VP.tools.push({id:'reaction',title:'Reaction Engineering',icon:'⚗️',group:'Process',
 desc:'Arrhenius, batch, CSTR, PFR',
 render(el){ buildTabs(el,'Reaction Engineering','Rate constants and reactor sizing (1st-order, constant-density basis).',[
  {key:'arr',label:'Arrhenius',title:'Rate constant',sub:'k = A·exp(−Eₐ/RT)',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'A',label:'Pre-exponential A',unit:'1/s',val:1e10},
      {id:'Ea',label:'Activation energy Eₐ',unit:'kJ/mol',val:75},
      {id:'T',label:'Temperature',unit:'°C',val:80}
    ],compute(v){const R=8.314462;const T=v.T+273.15;const k=v.A*Math.exp(-v.Ea*1000/(R*T));
      return {results:[
        {label:'Rate constant k',value:k,unit:'1/s',digits:4},
        {label:'Eₐ/RT',value:v.Ea*1000/(R*T),unit:'',digits:2}
      ],notes:[{text:'k = A·exp(−Eₐ/RT), R=8.314 J/mol·K, T in Kelvin.'}]};}});
  }},
  {key:'batch',label:'Batch',title:'Batch reactor time',sub:'1st-order: t = ln(1/(1−X)) / k',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'k',label:'Rate constant k',unit:'1/s',val:0.01},
      {id:'X',label:'Conversion',unit:'%',val:90}
    ],compute(v){const x=v.X/100;if(x>=1)throw new Error('Conversion must be < 100%');
      const t=Math.log(1/(1-x))/v.k;
      return {results:[{label:'Reaction time',value:t,unit:'s',digits:1},{label:'Reaction time',value:t/60,unit:'min',digits:2}],
      notes:[{text:'First-order irreversible reaction, constant volume.'}]};}});
  }},
  {key:'cstr',label:'CSTR',title:'CSTR volume',sub:'1st-order liquid: V = v₀·X/(k(1−X))',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'v0',label:'Volumetric feed v₀',unit:'m³/s',val:0.01},
      {id:'k',label:'Rate constant k',unit:'1/s',val:0.05},
      {id:'X',label:'Conversion',unit:'%',val:80}
    ],compute(v){const x=v.X/100;if(x>=1)throw new Error('Conversion must be < 100%');
      const tau=x/(v.k*(1-x));const V=tau*v.v0;
      return {results:[{label:'Space time τ',value:tau,unit:'s',digits:2},{label:'Reactor volume',value:V,unit:'m³',digits:4},{label:'Reactor volume',value:V*1000,unit:'L',digits:1}],
      notes:[{text:'CSTR design eq. for 1st-order: τ = X/[k(1−X)], V = τ·v₀.'}]};}});
  }},
  {key:'pfr',label:'PFR',title:'PFR volume',sub:'1st-order liquid: V = v₀·(−ln(1−X))/k',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'v0',label:'Volumetric feed v₀',unit:'m³/s',val:0.01},
      {id:'k',label:'Rate constant k',unit:'1/s',val:0.05},
      {id:'X',label:'Conversion',unit:'%',val:80}
    ],compute(v){const x=v.X/100;if(x>=1)throw new Error('Conversion must be < 100%');
      const tau=-Math.log(1-x)/v.k;const V=tau*v.v0;
      return {results:[{label:'Space time τ',value:tau,unit:'s',digits:2},{label:'Reactor volume',value:V,unit:'m³',digits:4},{label:'Reactor volume',value:V*1000,unit:'L',digits:1}],
      notes:[{text:'PFR for 1st-order: τ = −ln(1−X)/k. A PFR is always smaller than a CSTR for the same conversion (positive-order).'}]};}});
  }},
  {key:'series',label:'CSTRs in series',title:'Equal CSTRs in series',sub:'1st-order: 1 − X = 1/(1+kτ)ⁿ',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'k',label:'Rate constant k',unit:'1/s',val:0.5},
      {id:'tau',label:'Space-time per reactor τ',unit:'s',val:2},
      {id:'n',label:'Number of CSTRs',unit:'',val:3}
    ],compute(v){
      const n=Math.max(1,Math.round(v.n));
      const Xn=1-Math.pow(1/(1+v.k*v.tau),n);
      const tauTot=n*v.tau;
      const Xcstr=v.k*tauTot/(1+v.k*tauTot);
      const Xpfr=1-Math.exp(-v.k*tauTot);
      return {results:[
        {label:'Reactors',value:n,unit:'',digits:0},
        {label:'Total space-time',value:tauTot,unit:'s',digits:2},
        {label:'Conversion (cascade)',value:Xn*100,unit:'%',digits:2},
        {label:'Single CSTR (same τ)',value:Xcstr*100,unit:'%',digits:2},
        {label:'PFR (same τ)',value:Xpfr*100,unit:'%',digits:2}
      ],notes:[{text:'Equal-volume CSTRs in series (1st-order): 1 − X = 1/(1+kτ)ⁿ. As n→∞ the cascade approaches PFR performance — the CSTR/PFR bracket is shown for the same total τ.'}]};
    }});
  }},
  {key:'par',label:'Parallel reactions',title:'Parallel reactions & selectivity',sub:'A→D (k₁) and A→U (k₂)',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'k1',label:'k₁ (desired A→D)',unit:'',val:1},
      {id:'k2',label:'k₂ (undesired A→U)',unit:'',val:0.5},
      {id:'CA',label:'Concentration C_A',unit:'mol/L',val:2},
      {id:'n1',label:'Order of desired n₁',unit:'',val:2},
      {id:'n2',label:'Order of undesired n₂',unit:'',val:1}
    ],compute(v){
      const rD=v.k1*Math.pow(v.CA,v.n1), rU=v.k2*Math.pow(v.CA,v.n2);
      const S=rU>0?rD/rU:Infinity, fD=(rD+rU)>0?rD/(rD+rU):0;
      const hint=v.n1>v.n2?'n₁ > n₂ → raise C_A (PFR/batch, high pressure) to favour D.':(v.n1<v.n2?'n₁ < n₂ → lower C_A (CSTR, dilution, low conversion) to favour D.':'Equal orders → selectivity is independent of C_A; change temperature to shift k₁/k₂.');
      return {results:[
        {label:'Rate to D',value:rD,unit:'mol/L·s',digits:4},
        {label:'Rate to U',value:rU,unit:'mol/L·s',digits:4},
        {label:'Selectivity S(D/U)',value:S,unit:'',digits:3},
        {label:'Fraction to desired D',value:fD*100,unit:'%',digits:1}
      ],notes:[{text:'Instantaneous selectivity S = r_D/r_U = (k₁/k₂)·C_A^(n₁−n₂). '+hint}]};
    }});
  }},
  {key:'rtd',label:'RTD',title:'Residence-time distribution (tanks-in-series)',sub:'E(t) and variance for N CSTRs',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'tau',label:'Mean residence time τ',unit:'s',val:100},
      {id:'N',label:'Number of tanks N',unit:'',val:3},
      {id:'t',label:'Time t',unit:'s',val:80}
    ],compute(v){
      const N=Math.max(1,Math.round(v.N)), th=v.t/v.tau;
      let fact=1; for(let i=2;i<N;i++)fact*=i;
      const Eth=Math.pow(N,N)/fact*Math.pow(th,N-1)*Math.exp(-N*th), Et=Eth/v.tau, varr=v.tau*v.tau/N;
      return {results:[
        {label:'Dimensionless time θ',value:th,unit:'',digits:3},
        {label:'E(θ)',value:Eth,unit:'',digits:4},
        {label:'E(t)',value:Et,unit:'1/s',digits:6},
        {label:'Variance σ²',value:varr,unit:'s²',digits:1},
        {label:'σ²/τ² (= 1/N)',value:1/N,unit:'',digits:3}
      ],notes:[{text:'Tanks-in-series RTD: E(θ) = Nᴺ/(N−1)!·θ^(N−1)·e^(−Nθ), θ = t/τ. Variance σ²/τ² = 1/N — N=1 is a single well-mixed CSTR (widest spread); N→∞ approaches plug flow.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   PROCESS ECONOMICS
========================================================= */
VP.tools.push({id:'econ',title:'Process Economics',icon:'💵',group:'Economics',
 desc:'NPV, ROI, payback, utility costs',
 render(el){ buildTabs(el,'Process Economics','Investment metrics and operating utility costs.',[
  {key:'npv',label:'NPV',title:'Net present value',sub:'Uniform annual cash flow',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'C0',label:'Initial investment',unit:'$',val:1000000},
      {id:'CF',label:'Annual net cash flow',unit:'$/yr',val:250000},
      {id:'r',label:'Discount rate',unit:'%',val:10},
      {id:'n',label:'Project life',unit:'yr',val:10}
    ],compute(v){const r=v.r/100;const pvf=(1-Math.pow(1+r,-v.n))/r;const pv=v.CF*pvf;const npv=pv-v.C0;
      return {results:[
        {label:'PV of cash flows',value:pv,unit:'$',digits:0},
        {label:'NPV',value:npv,unit:'$',digits:0},
        {label:'Decision',value:npv>=0?'Accept':'Reject',unit:'',digits:0}
      ],notes:[{text:'NPV = −C₀ + CF·[1−(1+r)⁻ⁿ]/r. Positive NPV ⇒ value-adding at the chosen discount rate.'}]};}});
  }},
  {key:'roi',label:'ROI & Payback',title:'Return on investment',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'C0',label:'Investment',unit:'$',val:1000000},
      {id:'profit',label:'Annual net profit',unit:'$/yr',val:250000}
    ],compute(v){return {results:[
        {label:'ROI',value:v.profit/v.C0*100,unit:'%/yr',digits:1},
        {label:'Simple payback',value:v.C0/v.profit,unit:'yr',digits:2}
      ],notes:[{text:'ROI = annual profit / investment. Payback = investment / annual cash flow (ignores time value of money).'}]};}});
  }},
  {key:'util',label:'Utility costs',title:'Annual utility cost',sub:'',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'steam',label:'Steam demand',unit:'kg/h',val:5000},
      {id:'psteam',label:'Steam price',unit:'$/ton',val:15},
      {id:'power',label:'Electrical load',unit:'kW',val:200},
      {id:'pelec',label:'Electricity price',unit:'$/kWh',val:0.12},
      {id:'fuel',label:'Fuel rate',unit:'kg/h',val:0},
      {id:'pfuel',label:'Fuel price',unit:'$/kg',val:0.5},
      {id:'hrs',label:'Operating hours',unit:'h/yr',val:8000}
    ],compute(v){
      const cS=v.steam/1000*v.psteam, cE=v.power*v.pelec, cF=v.fuel*v.pfuel; // $/h
      const tot=cS+cE+cF;
      return {results:[
        {label:'Steam cost',value:cS*v.hrs,unit:'$/yr',digits:0},
        {label:'Electricity cost',value:cE*v.hrs,unit:'$/yr',digits:0},
        {label:'Fuel cost',value:cF*v.hrs,unit:'$/yr',digits:0},
        {label:'Total / hour',value:tot,unit:'$/h',digits:2},
        {label:'Total / day',value:tot*24,unit:'$/day',digits:0},
        {label:'Total / year',value:tot*v.hrs,unit:'$/yr',digits:0}
      ],notes:[]};}});
  }},
  {key:'irr',label:'IRR',title:'Internal rate of return',sub:'Uniform annual cash flow',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'C0',label:'Initial investment',unit:'$',val:1000000},
      {id:'CF',label:'Annual net cash flow',unit:'$/yr',val:250000},
      {id:'n',label:'Project life',unit:'yr',val:10},
      {id:'hurdle',label:'Hurdle / discount rate',unit:'%',val:10}
    ],compute(v){
      if(v.CF<=0)throw new Error('Annual cash flow must be > 0.');
      const npvAt=i=>-v.C0+v.CF*(1-Math.pow(1+i,-v.n))/i;
      let irr=NaN, lo=1e-6, hi=1;
      if(npvAt(lo)>0){
        let guard=0; while(npvAt(hi)>0&&guard++<200)hi*=1.5;
        for(let k=0;k<200;k++){const m=(lo+hi)/2; if(npvAt(m)>0)lo=m; else hi=m;}
        irr=(lo+hi)/2;
      }
      const r=v.hurdle/100, npvH=-v.C0+v.CF*(1-Math.pow(1+r,-v.n))/r;
      return {results:[
        {label:'IRR',value:isNaN(irr)?NaN:irr*100,unit:'%',digits:2},
        {label:'NPV at hurdle rate',value:npvH,unit:'$',digits:0},
        {label:'Decision',value:isNaN(irr)?'—':(irr*100>=v.hurdle?'Accept (IRR ≥ hurdle)':'Reject (IRR < hurdle)'),unit:'',digits:0}
      ],notes:[{text:'IRR solves NPV = 0 for −C₀ + CF·[1−(1+i)⁻ⁿ]/i (bisection). Accept when IRR ≥ the hurdle rate.'}]};
    }});
  }},
  {key:'equip',label:'Equipment cost',title:'Equipment cost scaling',sub:'Six-tenths rule + cost-index update',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'C1',label:'Known cost',unit:'$',val:100000},
      {id:'S1',label:'Known size / capacity',unit:'(any)',val:10},
      {id:'S2',label:'New size / capacity',unit:'(same units)',val:25},
      {id:'nexp',label:'Cost exponent n',unit:'',val:0.6},
      {id:'idx1',label:'Base cost index (e.g. CEPCI)',unit:'',val:500},
      {id:'idx2',label:'Current cost index',unit:'',val:800}
    ],compute(v){
      if(v.S1<=0||v.S2<=0)throw new Error('Sizes must be > 0.');
      const Cscaled=v.C1*Math.pow(v.S2/v.S1,v.nexp), Cnow=Cscaled*(v.idx2/v.idx1);
      return {results:[
        {label:'Scaled cost (size only)',value:Cscaled,unit:'$',digits:0},
        {label:'Cost-index factor',value:v.idx2/v.idx1,unit:'',digits:3},
        {label:'Updated cost',value:Cnow,unit:'$',digits:0}
      ],notes:[{text:'Six-tenths rule: C₂ = C₁·(S₂/S₁)ⁿ (n ≈ 0.6 typical). Escalate with a cost index: C_now = C·(index_now/index_base), e.g. CEPCI.'}]};
    }});
  }},
  {key:'infl',label:'Inflation',title:'Inflation / escalation',sub:'Future & present value',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'PV',label:'Present value / cost',unit:'$',val:1000},
      {id:'rate',label:'Inflation / escalation rate',unit:'%/yr',val:5},
      {id:'n',label:'Years',unit:'yr',val:10}
    ],compute(v){
      const f=Math.pow(1+v.rate/100,v.n);
      return {results:[
        {label:'Future value (escalated)',value:v.PV*f,unit:'$',digits:2},
        {label:'Escalation factor',value:f,unit:'',digits:4},
        {label:'PV of that future amount',value:v.PV/f,unit:'$',digits:2}
      ],notes:[{text:'FV = PV·(1+i)ⁿ. The last row deflates a future amount back to today. Use real (inflation-adjusted) rates in NPV when cash flows are in today’s dollars.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   ENERGY ENGINEERING
========================================================= */
VP.tools.push({id:'energy',title:'Energy Engineering',icon:'⚡',group:'Energy',
 desc:'Boiler, solar PV, CHP, carbon',
 render(el){ buildTabs(el,'Energy Engineering','Boilers, renewables, cogeneration and emissions.',[
  {key:'boiler',label:'Boiler',title:'Boiler efficiency',sub:'η = useful heat / fuel input',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'steam',label:'Steam generated',unit:'kg/h',val:5000},
      {id:'dh',label:'Enthalpy rise (steam − feedwater)',unit:'kJ/kg',val:2400},
      {id:'fuel',label:'Fuel consumption',unit:'kg/h',val:380},
      {id:'lhv',label:'Fuel LHV',unit:'MJ/kg',val:42}
    ],compute(v){const useful=v.steam*v.dh/3600;const input=v.fuel*v.lhv*1000/3600;
      return {results:[
        {label:'Useful heat',value:useful,unit:'kW',digits:0},
        {label:'Fuel energy input',value:input,unit:'kW',digits:0},
        {label:'Boiler efficiency',value:useful/input*100,unit:'%',digits:1}
      ],notes:[{text:'η = ṁ_steam·Δh / (ṁ_fuel·LHV). Typical fired boilers 80–90%.'}]};}});
  }},
  {key:'solar',label:'Solar PV',title:'PV power & energy',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'area',label:'Panel area',unit:'m²',val:50},
      {id:'eff',label:'Module efficiency',unit:'%',val:20},
      {id:'irr',label:'Solar irradiance',unit:'W/m²',val:800},
      {id:'hrs',label:'Peak-sun hours',unit:'h/day',val:5},
      {id:'pr',label:'Performance ratio',unit:'%',val:80}
    ],compute(v){const P=v.area*v.irr*v.eff/100*v.pr/100;const Eday=v.area*1000*v.eff/100*v.hrs*v.pr/100;
      return {results:[
        {label:'Instantaneous power',value:P/1000,unit:'kW',digits:2},
        {label:'Energy per day',value:Eday/1000,unit:'kWh/day',digits:1},
        {label:'Energy per year',value:Eday/1000*365,unit:'kWh/yr',digits:0}
      ],notes:[{text:'Power = A·G·η·PR. Daily energy uses 1 kW/m² peak-sun-hour convention × PR.'}]};}});
  }},
  {key:'chp',label:'CHP',title:'Combined heat & power',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'fuel',label:'Fuel energy input',unit:'kW',val:1000},
      {id:'elec',label:'Electrical output',unit:'kW',val:350},
      {id:'heat',label:'Useful heat output',unit:'kW',val:450}
    ],compute(v){return {results:[
        {label:'Electrical efficiency',value:v.elec/v.fuel*100,unit:'%',digits:1},
        {label:'Thermal efficiency',value:v.heat/v.fuel*100,unit:'%',digits:1},
        {label:'Overall CHP efficiency',value:(v.elec+v.heat)/v.fuel*100,unit:'%',digits:1}
      ],notes:[{text:'Cogeneration overall efficiency (power + useful heat) is typically 75–90%, far above power-only generation.'}]};}});
  }},
  {key:'co2',label:'Carbon',title:'CO₂ emissions',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'fuel',label:'Fuel type',type:'select',val:'2.75',options:opts([['2.75','Natural gas (kg CO₂/kg)'],['3.15','Diesel/gasoil (kg CO₂/kg)'],['3.17','Heavy fuel oil'],['2.42','LPG'],['0.202','Grid electricity (per kWh)'],['2.86','Coal']])},
      {id:'amt',label:'Consumption',unit:'kg or kWh per h',val:380},
      {id:'hrs',label:'Operating hours',unit:'h/yr',val:8000}
    ],compute(v){const ef=parseFloat(v.fuel);const rate=v.amt*ef;
      return {results:[
        {label:'Emission rate',value:rate,unit:'kg CO₂/h',digits:1},
        {label:'Annual emissions',value:rate*v.hrs/1000,unit:'t CO₂/yr',digits:1}
      ],notes:[{text:'Emissions = consumption × emission factor. Factors are indicative; use site-specific factors for reporting.'}]};}});
  }},
  {key:'hp',label:'Heat pump',title:'Heat-pump COP',sub:'Carnot limit × second-law efficiency',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'Th',label:'Sink (hot) temperature',unit:'°C',val:45},
      {id:'Tc',label:'Source (cold) temperature',unit:'°C',val:5},
      {id:'eta2',label:'Second-law efficiency (% of Carnot)',unit:'%',val:50},
      {id:'Qh',label:'Heating duty (optional)',unit:'kW',val:10}
    ],compute(v){
      const Tkh=v.Th+273.15, Tkc=v.Tc+273.15;
      if(Tkh<=Tkc)throw new Error('Sink temperature must exceed source temperature.');
      const dT=Tkh-Tkc, e=v.eta2/100;
      const copHc=Tkh/dT, copCc=Tkc/dT, copH=e*copHc, copC=e*copCc;
      const res=[
        {label:'Carnot COP (heating)',value:copHc,unit:'',digits:2},
        {label:'Actual COP (heating)',value:copH,unit:'',digits:2},
        {label:'Actual COP (cooling)',value:copC,unit:'',digits:2}
      ];
      if(v.Qh>0){const W=v.Qh/copH;res.push({label:'Compressor power',value:W,unit:'kW',digits:2});res.push({label:'Heat from source',value:v.Qh-W,unit:'kW',digits:2});}
      return {results:res,notes:[{text:'Carnot COP_heat = T_hot/(T_hot − T_cold) in kelvin; actual = (2nd-law eff.) × Carnot. Real heat pumps reach COP ≈ 3–5. COP_cool = COP_heat − 1.'}]};
    }});
  }},
  {key:'orc',label:'ORC',title:'Organic Rankine Cycle (estimate)',sub:'Low-grade heat → power',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'Te',label:'Evaporator temperature',unit:'°C',val:120},
      {id:'Tc',label:'Condenser temperature',unit:'°C',val:30},
      {id:'eta2',label:'Cycle efficiency (% of Carnot)',unit:'%',val:55},
      {id:'Qin',label:'Heat input (optional)',unit:'kW',val:100}
    ],compute(v){
      const Tke=v.Te+273.15, Tkc=v.Tc+273.15;
      if(Tke<=Tkc)throw new Error('Evaporator temperature must exceed condenser temperature.');
      const etaC=1-Tkc/Tke, etaORC=v.eta2/100*etaC;
      const res=[
        {label:'Carnot efficiency',value:etaC*100,unit:'%',digits:1},
        {label:'Estimated ORC efficiency',value:etaORC*100,unit:'%',digits:1}
      ];
      if(v.Qin>0){const W=etaORC*v.Qin;res.push({label:'Net power output',value:W,unit:'kW',digits:2});res.push({label:'Heat rejected',value:v.Qin-W,unit:'kW',digits:2});}
      return {results:res,notes:[{text:'Estimate: η_ORC = (cycle eff. % of Carnot) × (1 − T_cond/T_evap), kelvin. Real ORC efficiency (5–20%) depends on the working fluid (R245fa, R1233zd, isobutane…) and architecture — use for first-pass sizing.'}]};
    }});
  }},
  {key:'batt',label:'Battery',title:'Battery bank sizing',sub:'Off-grid storage from daily load',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'load',label:'Daily energy load',unit:'kWh/day',val:10},
      {id:'days',label:'Days of autonomy',unit:'days',val:2},
      {id:'dod',label:'Depth of discharge',unit:'%',val:80},
      {id:'eff',label:'System efficiency',unit:'%',val:90},
      {id:'V',label:'System voltage',unit:'V',val:48}
    ],compute(v){
      if(v.dod<=0||v.eff<=0)throw new Error('DoD and efficiency must be > 0.');
      const cap=v.load*v.days/((v.dod/100)*(v.eff/100)), Ah=cap*1000/v.V;
      return {results:[
        {label:'Required capacity',value:cap,unit:'kWh',digits:2},
        {label:'Capacity at system V',value:Ah,unit:'Ah',digits:0},
        {label:'Usable energy per cycle',value:v.load*v.days,unit:'kWh',digits:2}
      ],notes:[{text:'Capacity = (load × autonomy) / (DoD × efficiency). Ah = kWh×1000/V. Size the inverter and charge controller separately.'}]};
    }});
  }},
  {key:'wind',label:'Wind',title:'Wind turbine power',sub:'P = ½·ρ·A·v³·Cp·η',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'D',label:'Rotor diameter',unit:'m',val:10},
      {id:'v',label:'Wind speed',unit:'m/s',val:8},
      {id:'rho',label:'Air density',unit:'kg/m³',val:1.225},
      {id:'Cp',label:'Power coefficient Cp',unit:'≤0.593',val:0.4},
      {id:'eff',label:'Drivetrain/generator eff.',unit:'%',val:90}
    ],compute(v){
      const A=Math.PI/4*v.D*v.D, avail=0.5*v.rho*A*Math.pow(v.v,3);
      const P=avail*v.Cp*(v.eff/100), betz=avail*0.5926;
      return {results:[
        {label:'Swept area',value:A,unit:'m²',digits:2},
        {label:'Power in wind',value:avail/1000,unit:'kW',digits:2},
        {label:'Electrical power',value:P/1000,unit:'kW',digits:2},
        {label:'Betz limit (Cp=0.593)',value:betz/1000,unit:'kW',digits:2}
      ],notes:[{text:'P = ½·ρ·A·v³·Cp·η, A = πD²/4. The Betz limit caps Cp at 0.593; real turbines reach 0.35–0.45. Power scales with v³ — wind speed dominates.'}]};
    }});
  }},
  {key:'biomass',label:'Biomass',title:'Biomass energy',sub:'Fuel power from feed × calorific value',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'feed',label:'Biomass feed rate',unit:'kg/h',val:500},
      {id:'lhv',label:'Lower heating value',unit:'MJ/kg',val:15},
      {id:'eff',label:'Conversion efficiency',unit:'%',val:80},
      {id:'hrs',label:'Operating hours',unit:'h/yr',val:8000}
    ],compute(v){
      const fuel=v.feed*v.lhv*1000/3600, useful=fuel*(v.eff/100);
      return {results:[
        {label:'Fuel power input',value:fuel,unit:'kW',digits:1},
        {label:'Useful output',value:useful,unit:'kW',digits:1},
        {label:'Annual useful energy',value:useful*v.hrs/1000,unit:'MWh/yr',digits:1}
      ],notes:[{text:'Fuel power = feed × LHV. Useful = fuel × efficiency (≈75–85% heat boiler, ≈20–30% biomass power plant). Dry biomass LHV ≈ 15–18 MJ/kg; moisture lowers it.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   SEPARATION PROCESSES
========================================================= */
VP.tools.push({id:'separation',title:'Separation Processes',icon:'🧴',group:'Separation',
 desc:'Membrane, adsorption, drying, evaporation, crystallization',
 render(el){ buildTabs(el,'Separation Processes','Membranes, adsorption, drying, evaporation and crystallization.',[
  {key:'mem',label:'Membrane flux',title:'Permeate flux',sub:'J = V̇/A',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'V',label:'Permeate flow',unit:'L/h',val:500},
      {id:'A',label:'Membrane area',unit:'m²',val:20}
    ],compute(v){const J=v.V/v.A;return {results:[{label:'Flux',value:J,unit:'L/m²·h (LMH)',digits:2}],notes:[{text:'LMH is the standard membrane flux unit. Divide by TMP (bar) for permeability.'}]};}});
  }},
  {key:'ads',label:'Adsorption',title:'Adsorption capacity',sub:'q = (C₀−Cₑ)·V/m',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'C0',label:'Initial conc. C₀',unit:'mg/L',val:100},
      {id:'Ce',label:'Equilibrium conc. Cₑ',unit:'mg/L',val:10},
      {id:'V',label:'Solution volume',unit:'L',val:1},
      {id:'m',label:'Adsorbent mass',unit:'g',val:2}
    ],compute(v){const q=(v.C0-v.Ce)*v.V/v.m;return {results:[
        {label:'Uptake q',value:q,unit:'mg/g',digits:2},
        {label:'Removal',value:(v.C0-v.Ce)/v.C0*100,unit:'%',digits:1}
      ],notes:[{text:'q = (C₀−Cₑ)·V/m — adsorbed amount per unit adsorbent.'}]};}});
  }},
  {key:'dry',label:'Drying',title:'Drying mass balance',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'F',label:'Wet feed',unit:'kg/h',val:1000},
      {id:'w0',label:'Initial moisture (wet basis)',unit:'%',val:40},
      {id:'w1',label:'Final moisture (wet basis)',unit:'%',val:5}
    ],compute(v){const dry=v.F*(1-v.w0/100);const P=dry/(1-v.w1/100);const water=v.F-P;
      return {results:[
        {label:'Dry solids',value:dry,unit:'kg/h',digits:1},
        {label:'Product',value:P,unit:'kg/h',digits:1},
        {label:'Water removed',value:water,unit:'kg/h',digits:1}
      ],notes:[{text:'Dry-solids balance: bone-dry mass is conserved. Product = dry/(1−w_final).'}]};}});
  }},
  {key:'evap',label:'Evaporator',title:'Evaporator duty',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'evap',label:'Water evaporated',unit:'kg/h',val:2000},
      {id:'lat',label:'Latent heat',unit:'kJ/kg',val:2257},
      {id:'pre',label:'Sensible pre-heat (optional)',unit:'kW',val:0}
    ],compute(v){const Q=v.evap*v.lat/3600+v.pre;return {results:[
        {label:'Evaporation duty',value:Q,unit:'kW',digits:1},
        {label:'Steam needed (≈)',value:Q*3600/2200,unit:'kg/h',digits:0}
      ],notes:[{text:'Q = ṁ_evap·λ + sensible. Steam estimate assumes ~2200 kJ/kg available from heating steam.'}]};}});
  }},
  {key:'cryst',label:'Crystallizer',title:'Crystal yield',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'solvent',label:'Solvent mass',unit:'kg',val:1000},
      {id:'S1',label:'Initial solubility',unit:'kg solute/kg solvent',val:0.5},
      {id:'S2',label:'Final solubility',unit:'kg solute/kg solvent',val:0.2}
    ],compute(v){const y=v.solvent*(v.S1-v.S2);if(y<0)throw new Error('Final solubility exceeds initial — no crystals form.');
      return {results:[
        {label:'Crystal yield',value:y,unit:'kg',digits:1},
        {label:'Solute remaining',value:v.solvent*v.S2,unit:'kg',digits:1}
      ],notes:[{text:'Yield = solvent·(S₁−S₂), assuming constant solvent mass (no evaporation). Account for water of crystallization separately.'}]};}});
  }},
  {key:'break',label:'Breakthrough',title:'Adsorption breakthrough time',sub:'Capacity-based estimate',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'m',label:'Adsorbent mass',unit:'kg',val:100},
      {id:'q',label:'Equilibrium capacity',unit:'kg solute/kg ads',val:0.2},
      {id:'use',label:'Usable fraction (1 − LUB)',unit:'%',val:70},
      {id:'C0',label:'Feed concentration',unit:'kg/m³',val:0.5},
      {id:'Q',label:'Feed flow',unit:'m³/h',val:2}
    ],compute(v){
      if(v.C0<=0||v.Q<=0)throw new Error('Feed conc. and flow must be > 0.');
      const cap=v.m*v.q*v.use/100, tb=cap/(v.C0*v.Q), thru=v.Q*tb;
      return {results:[
        {label:'Total usable capacity',value:cap,unit:'kg solute',digits:2},
        {label:'Breakthrough time',value:tb,unit:'h',digits:2},
        {label:'Throughput to breakthrough',value:thru,unit:'m³',digits:1},
        {label:'Solute loaded',value:v.C0*thru,unit:'kg',digits:2}
      ],notes:[{text:'t_break ≈ usable capacity /(C₀·Q), usable = (1 − length-of-unused-bed). A capacity (mass-balance) estimate — for the S-shaped curve use Thomas/BDST models with mass-transfer data.'}]};
    }});
  }},
  {key:'filt',label:'Filtration',title:'Constant-pressure cake filtration',sub:'t for a filtrate volume V',setup(b){
    VP.calcForm(b,{cols:2,inputs:[
      {id:'A',label:'Filter area',unit:'m²',val:5},
      {id:'dP',label:'Pressure drop',unit:'bar',val:3},
      {id:'mu',label:'Filtrate viscosity',unit:'Pa·s',val:0.001},
      {id:'alpha',label:'Specific cake resistance α',unit:'m/kg',val:1e10},
      {id:'c',label:'Cake mass / filtrate vol',unit:'kg/m³',val:10},
      {id:'Rm',label:'Medium resistance Rm',unit:'1/m',val:1e10},
      {id:'V',label:'Filtrate volume',unit:'m³',val:1}
    ],compute(v){
      const dP=v.dP*1e5;
      if(v.A<=0||dP<=0)throw new Error('Area and ΔP must be > 0.');
      const a=v.mu*v.alpha*v.c/(2*v.A*v.A*dP), bb=v.mu*v.Rm/(v.A*dP);
      const t=a*v.V*v.V+bb*v.V, rate=1/(2*a*v.V+bb);
      return {results:[
        {label:'Filtration time',value:t,unit:'s',digits:1},
        {label:'Filtration time',value:t/60,unit:'min',digits:2},
        {label:'Instantaneous rate dV/dt',value:rate*1000,unit:'L/s',digits:3},
        {label:'Average rate',value:v.V/t*1000,unit:'L/s',digits:3}
      ],notes:[{text:'Constant-ΔP cake filtration: t = [μ·α·c/(2A²·ΔP)]·V² + [μ·Rm/(A·ΔP)]·V. The first (quadratic) term is the cake, the second the medium. α and Rm come from a t/V-vs-V plot.'}]};
    }});
  }}
 ]); }});

/* =========================================================
   ASPEN TOOLKIT (units + error interpreter)
========================================================= */
const aspenErrors=[
 {k:['flash','converg','two liquid','phase'],t:'Flash / block not converged',
  c:'Poor initial estimates, a real two-liquid (LLE) region the method can\'t handle, or temperature/pressure outside property range.',
  f:'Provide better stream estimates; enable rigorous 3-phase / free-water flash; switch to a method that supports LLE (e.g. NRTL with LLE data); widen variable bounds.'},
 {k:['property method','not specified','method'],t:'Property method not specified',
  c:'No global thermodynamic method selected.',
  f:'Methods | Specifications | Global → choose a base method (e.g. PENG-ROB, NRTL, ELECNRTL).'},
 {k:['recycle','tear','loop'],t:'Recycle / tear stream not converged',
  c:'Tight tolerance, oscillating loop, or bad tear-stream guess.',
  f:'Increase max iterations; use Wegstein/Broyden; give a good tear estimate; converge the flowsheet without recycles first, then close loops; relax then tighten tolerance.'},
 {k:['binary','parameter','missing','nrtl','uniquac'],t:'Missing binary interaction parameters',
  c:'Activity-coefficient model lacks data for a component pair.',
  f:'Supply regressed VLE/LLE data; or estimate with UNIFAC; check the Methods | Parameters | Binary Interaction table for gaps.'},
 {k:['range','out of range','temperature','extrapolat'],t:'Property out of range / extrapolation',
  c:'Conditions fall outside the validity range of correlations (e.g. above critical, below freezing).',
  f:'Check operating T/P; supply or refit property data; avoid extrapolating Antoine/DIPPR equations far beyond their limits.'},
 {k:['column','radfrac','reflux','stage'],t:'Column (RadFrac) not converging',
  c:'Infeasible spec, poor stage/feed estimate, or temperature profile collapse.',
  f:'Initialize from a DSTWU shortcut; set realistic reflux/reboiler duty; add Design Specs gradually; check feed stage location and pressure profile.'},
 {k:['singular','degrees of freedom','variable','spec'],t:'Singular / over-specified',
  c:'Conflicting or redundant Design Specs / too many fixed variables.',
  f:'Recount degrees of freedom; remove or relax a spec; ensure manipulated variables are independent.'}
];

VP.tools.push({id:'aspentk',title:'Aspen Toolkit',icon:'🛠️',group:'Reference',
 desc:'Aspen unit converter & error interpreter',
 render(el){ buildTabs(el,'Aspen Toolkit','Quick unit conversions and an offline interpreter for common Aspen Plus errors.',[
  {key:'flow',label:'Flow (mol↔mass)',title:'Molar ↔ mass flow',sub:'Needs molecular weight',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'dir',label:'Direction',type:'select',val:'k2m',options:opts([['k2m','kmol/h → kg/h'],['m2k','kg/h → kmol/h']])},
      {id:'val',label:'Value',unit:'kmol/h or kg/h',val:100},
      {id:'MW',label:'Molecular weight',unit:'g/mol',val:18.02}
    ],compute(v){let out,u;if(v.dir==='k2m'){out=v.val*v.MW;u='kg/h';}else{out=v.val/v.MW;u='kmol/h';}
      return {results:[{label:'Result',value:out,unit:u,digits:3}],notes:[{text:'kg/h = kmol/h × MW.'}]};}});
  }},
  {key:'press',label:'Pressure',title:'Pressure converter',sub:'',setup(b){
    const m={bar:1e5,psi:6894.76,kPa:1000,atm:101325,mmHg:133.322,'kg/cm²':98066.5};
    VP.calcForm(b,{inputs:[
      {id:'val',label:'Value',val:1},
      {id:'from',label:'From',type:'select',val:'bar',options:Object.keys(m).map(k=>({v:k,t:k}))},
      {id:'to',label:'To',type:'select',val:'psi',options:Object.keys(m).map(k=>({v:k,t:k}))}
    ],compute(v){return {results:[{label:`${v.val} ${v.from} =`,value:v.val*m[v.from]/m[v.to],unit:v.to,digits:5}],notes:[]};}});
  }},
  {key:'temp',label:'Temperature',title:'Temperature converter',sub:'',setup(b){
    VP.calcForm(b,{inputs:[
      {id:'val',label:'Value',val:25},
      {id:'from',label:'From',type:'select',val:'C',options:opts([['C','°C'],['K','K'],['F','°F']])},
      {id:'to',label:'To',type:'select',val:'K',options:opts([['C','°C'],['K','K'],['F','°F']])}
    ],compute(v){let K;if(v.from==='C')K=v.val+273.15;else if(v.from==='F')K=(v.val-32)*5/9+273.15;else K=v.val;
      let out;if(v.to==='C')out=K-273.15;else if(v.to==='F')out=(K-273.15)*9/5+32;else out=K;
      return {results:[{label:`${v.val}° →`,value:out,unit:v.to,digits:3}],notes:[]};}});
  }},
  {key:'err',label:'Error interpreter',title:'Aspen error interpreter',sub:'Paste an error message',setup(b){
    b.innerHTML=`<div class="field"><label>Error / warning text</label><textarea id="aerr" placeholder="e.g. FLASH BLOCK B3 NOT CONVERGED">FLASH BLOCK NOT CONVERGED</textarea></div>
      <div class="btn-row"><button class="btn" id="aerrBtn">Interpret</button></div><div class="results" id="aerrRes"></div>`;
    const run=()=>{
      const txt=(b.querySelector('#aerr').value||'').toLowerCase();
      const hits=aspenErrors.map(e=>({e,score:e.k.reduce((s,kw)=>s+(txt.includes(kw)?1:0),0)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score);
      const out=b.querySelector('#aerrRes');
      if(!hits.length){out.innerHTML=`<div class="note warnbox">No match in the offline library. Try the AI Assistant tab for a tailored diagnosis.</div>`;}
      else{out.innerHTML=hits.slice(0,3).map(h=>`<div class="note"><strong>${h.e.t}</strong><br><em>Likely cause:</em> ${h.e.c}<br><em>Fixes:</em> ${h.e.f}</div>`).join('');}
      out.classList.add('show');
    };
    b.querySelector('#aerrBtn').onclick=run; run();
  }},
  {key:'fmt',label:'Stream table',title:'Stream-table formatter',sub:'Paste raw numbers → a clean table',setup(b){
    b.innerHTML=`<div class="field"><label>Paste rows (tab / comma / 2-space separated; first row = headers)</label><textarea id="stin">Stream\tT(C)\tP(bar)\tFlow(kmol/h)
Feed\t25\t10\t100
Vapour\t80\t9.5\t42
Liquid\t78\t9.5\t58</textarea></div>
      <div class="btn-row"><button class="btn" id="stbtn">Format</button></div><div id="stout" style="margin-top:10px"></div>`;
    const run=()=>{
      const raw=(b.querySelector('#stin').value||'').trim();
      if(!raw){b.querySelector('#stout').innerHTML='';return;}
      const rows=raw.split(/\n+/).map(r=>r.split(/\t|,|\s{2,}/).map(c=>c.trim()).filter(c=>c!==''));
      if(!rows.length||!rows[0].length){return;}
      let t='<div class="table-wrap"><table class="data"><thead><tr>'+rows[0].map(h=>`<th>${h}</th>`).join('')+'</tr></thead><tbody>';
      for(let i=1;i<rows.length;i++){t+='<tr>'+rows[i].map(c=>`<td>${c}</td>`).join('')+'</tr>';}
      t+='</tbody></table></div><div class="note">Copy the rendered table into a report, or screenshot it. Separators auto-detected (tab, comma, or 2+ spaces).</div>';
      b.querySelector('#stout').innerHTML=t;
    };
    b.querySelector('#stbtn').onclick=run; run();
  }}
 ]); }});

/* =========================================================
   AI TUTOR / EXAM / TROUBLESHOOTER (uses VP.callLLM)
========================================================= */
VP.tools.push({id:'tutor',title:'AI Tutor & Exam',icon:'🎓',group:'Assistant',
 desc:'Practice problems, troubleshooting, PFD solver',
 render(el){
  el.innerHTML=pageHead('AI Tutor & Exam Mode','Generate practice problems, troubleshoot unit operations, or turn a text PFD into a stream table. Uses the API key set in the AI Assistant tab.')
   +card('Mode','',`
     <div class="field"><label>What do you need?</label><select id="mode">
       <option value="exam">Exam mode — generate practice problems</option>
       <option value="viva">Viva / oral-exam questions</option>
       <option value="formula">Formula sheet for a topic</option>
       <option value="lab">Lab-report helper</option>
       <option value="trouble">Unit-operation troubleshooter</option>
       <option value="pfd">PFD solver — text flowsheet → stream table</option>
     </select></div>
     <div class="field"><label>Details</label><textarea id="tin" placeholder="e.g. topic = mass balances, level = undergraduate, 3 problems with solutions">topic: mass and energy balances; level: undergraduate; give 3 problems with full worked solutions</textarea></div>
     <div class="btn-row"><button class="btn" id="tgo">Generate</button></div>
     <div class="results" id="tres"></div>`);
  const sysmap={
    exam:"You are an examiner for chemical engineering. Generate clear practice problems with numeric data, then provide complete worked solutions with formulas and final answers. Use SI units. Format problems then 'Solutions:' afterwards.",
    viva:"You are conducting an oral (viva) exam for a chemical engineering student. Produce a graded set of viva questions on the requested topic, from basic to advanced, each with a concise model answer and the key concept being tested. Use SI units.",
    formula:"You are preparing a concise formula sheet for the requested chemical-engineering topic. List the key equations with each symbol defined, units, and the assumptions/validity range. Group by sub-topic. Be compact and exam-ready.",
    lab:"You are a lab-report assistant for chemical engineering. Help structure the report (aim, theory, apparatus, procedure, results, sample calculations, error analysis, discussion, conclusion). Where data is given, show worked sample calculations with formulas and propagate uncertainty. Use SI units.",
    trouble:"You are a senior process engineer. Diagnose the described operating problem (pumps, columns, exchangers, reactors, compressors). Give likely root causes ranked by probability and concrete corrective actions. Be practical and concise.",
    pfd:"You are a process simulation assistant. From the user's text description of a flowsheet, identify the units and streams, write the governing mass/energy balance equations, and produce a stream table (stream, flow, key components, T, P) with stated assumptions. Use SI units."
  };
  const res=el.querySelector('#tres');
  el.querySelector('#tgo').onclick=async()=>{
    const mode=el.querySelector('#mode').value;
    const inp=el.querySelector('#tin').value.trim();
    if(!inp){res.innerHTML='<div class="note warnbox">Enter some details first.</div>';res.classList.add('show');return;}
    if(!VP.callLLM){res.innerHTML='<div class="note warnbox">AI not initialised — open the AI Assistant tab first.</div>';res.classList.add('show');return;}
    res.innerHTML='<div class="note">…generating…</div>';res.classList.add('show');
    try{
      const reply=await VP.callLLM([{role:'user',content:inp}],sysmap[mode]);
      res.innerHTML=`<div class="msg bot" style="max-width:100%">${reply.replace(/&/g,'&amp;').replace(/</g,'&lt;')}</div>`;
    }catch(e){res.innerHTML=`<div class="note warnbox">⚠ ${e.message} — set your API key in the AI Assistant tab.</div>`;}
  };
 }});

})();
