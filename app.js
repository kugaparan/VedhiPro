/* VedhiPro — app shell, navigation, AI assistant */
(function(){
const VP=window.VP;
const content=document.getElementById('content');
const navList=document.getElementById('navList');
const sidebar=document.getElementById('sidebar');
const scrim=document.getElementById('scrim');

/* ---------- AI assistant ---------- */
const store={
  get k(){try{return localStorage.getItem('vp_key')||'';}catch(e){return '';}},
  set k(v){try{localStorage.setItem('vp_key',v);}catch(e){}},
  get prov(){try{return localStorage.getItem('vp_prov')||'anthropic';}catch(e){return 'anthropic';}},
  set prov(v){try{localStorage.setItem('vp_prov',v);}catch(e){}}
};
const SYS="You are VedhiPro Assistant, an expert chemical engineering helper. Answer concisely and practically. Cover unit operations, thermodynamics, fluid mechanics, heat/mass transfer, process control, safety and Aspen Plus. Show formulas and worked steps when useful, and state assumptions. Use SI units unless asked otherwise.";

const aiTool={id:'ai',title:'AI Assistant',icon:'🤖',group:'Assistant',desc:'Ask chemical-engineering questions (your API key)',
 render(el){
  el.innerHTML = '<div class="page-head"><h1>AI Assistant</h1><p>Chemical-engineering Q&A. Uses your own Anthropic or OpenAI API key — stored only on this device.</p></div>'
   + '<div class="card" id="setupCard">'
   +   '<h2>Connect a model</h2>'
   +   '<div class="sub">Your key is saved in this app\'s local storage and sent directly to the provider. Nothing is routed through VedhiPro.</div>'
   +   '<div class="grid2">'
   +     '<div class="field"><label>Provider</label><select id="prov"><option value="anthropic">Anthropic (Claude)</option><option value="openai">OpenAI (GPT)</option></select></div>'
   +     '<div class="field"><label>API key</label><input id="key" type="password" placeholder="sk-..."></div>'
   +   '</div>'
   +   '<div class="btn-row"><button class="btn" id="saveKey">Save key</button><button class="btn ghost" id="clearKey">Clear</button></div>'
   +   '<div class="small" id="keyStatus"></div>'
   + '</div>'
   + '<div class="card"><div class="chat">'
   +   '<div class="chat-log" id="log"><div class="msg sys">Ask anything — e.g. "Size a reflux drum", "Explain NPSH margin", "What property method for an amine unit?"</div></div>'
   +   '<div>'
   +     '<span class="pill" data-q="Explain the difference between NRTL and Peng-Robinson and when to use each.">NRTL vs PR?</span>'
   +     '<span class="pill" data-q="How do I size a horizontal knockout drum for vapor-liquid separation?">KO drum sizing</span>'
   +     '<span class="pill" data-q="Walk me through a pinch analysis for energy targeting.">Pinch basics</span>'
   +     '<span class="pill" data-q="What causes pump cavitation and how do I prevent it?">Cavitation</span>'
   +   '</div>'
   +   '<div class="chat-input"><textarea id="msg" placeholder="Type your question…"></textarea><button class="btn" id="send">Send</button></div>'
   + '</div></div>';
  const prov=el.querySelector('#prov'), key=el.querySelector('#key'), status=el.querySelector('#keyStatus');
  prov.value=store.prov; if(store.k) key.placeholder='•••••• saved';
  status.textContent=store.k?'A key is saved on this device.':'No key saved yet.';
  el.querySelector('#saveKey').onclick=()=>{store.prov=prov.value; if(key.value.trim()){store.k=key.value.trim();key.value='';key.placeholder='•••••• saved';} status.textContent='Saved. Provider: '+prov.value;};
  el.querySelector('#clearKey').onclick=()=>{store.k='';key.placeholder='sk-...';status.textContent='Key cleared.';};

  const log=el.querySelector('#log'); const msg=el.querySelector('#msg');
  const history=[];
  function add(role,text){const d=document.createElement('div');d.className='msg '+(role==='user'?'user':'bot');d.textContent=text;log.appendChild(d);log.scrollTop=log.scrollHeight;return d;}
  el.querySelectorAll('.pill').forEach(p=>p.onclick=()=>{msg.value=p.dataset.q;msg.focus();});

  async function send(){
    const q=msg.value.trim(); if(!q) return;
    if(!store.k){add('bot','⚠ Add your API key above first (Anthropic or OpenAI).');return;}
    add('user',q); msg.value=''; history.push({role:'user',content:q});
    const pending=add('bot','…thinking');
    try{
      const reply=await callLLM(history);
      pending.textContent=reply; history.push({role:'assistant',content:reply});
    }catch(e){ pending.textContent='⚠ '+e.message; }
    log.scrollTop=log.scrollHeight;
  }
  el.querySelector('#send').onclick=send;
  msg.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();send();}});
 }
};

async function callLLM(history, systemOverride){
  const prov=store.prov, k=store.k;
  const sys=systemOverride||SYS;
  if(prov==='anthropic'){
    const r=await fetch('https://api.anthropic.com/v1/messages',{
      method:'POST',
      headers:{'Content-Type':'application/json','x-api-key':k,'anthropic-version':'2023-06-01','anthropic-dangerous-direct-browser-access':'true'},
      body:JSON.stringify({model:'claude-3-5-sonnet-20241022',max_tokens:1536,system:sys,messages:history})
    });
    if(!r.ok){throw new Error('Anthropic API '+r.status+': '+(await r.text()).slice(0,200));}
    const j=await r.json(); return j.content.map(c=>c.text).join('');
  } else {
    const r=await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+k},
      body:JSON.stringify({model:'gpt-4o-mini',messages:[{role:'system',content:sys},...history]})
    });
    if(!r.ok){throw new Error('OpenAI API '+r.status+': '+(await r.text()).slice(0,200));}
    const j=await r.json(); return j.choices[0].message.content;
  }
}
VP.callLLM=callLLM;

/* ---------- assemble tool registry ---------- */
const tools=[...VP.tools, aiTool];

const home={id:'home',title:'Home',icon:'🏠',group:'',desc:'',
 render(el){
  let h='<div class="page-head"><h1>VedhiPro</h1><p>Your pocket chemical-engineering toolkit — calculators, references and an AI assistant. Pick a tool.</p></div><div class="tiles">';
  tools.forEach(t=>{ if(t.id==='home')return;
    h+='<div class="tile" data-go="'+t.id+'"><span class="ic">'+t.icon+'</span><h3>'+t.title+'</h3><p>'+(t.desc||'')+'</p></div>';});
  h+='</div>';
  el.innerHTML=h;
  el.querySelectorAll('.tile').forEach(t=>t.onclick=()=>go(t.dataset.go));
 }};
const all=[home,...tools];

function buildNav(){
  navList.innerHTML='';
  all.forEach(t=>{
    const li=document.createElement('li');
    li.dataset.id=t.id;
    li.innerHTML='<span class="nico">'+t.icon+'</span><span>'+t.title+'</span>';
    li.onclick=()=>go(t.id);
    navList.appendChild(li);
  });
}

let current=null;
function go(id){
  const t=all.find(x=>x.id===id)||home;
  current=t.id;
  content.scrollTop=0;
  t.render(content);
  navList.querySelectorAll('li').forEach(li=>li.classList.toggle('active',li.dataset.id===t.id));
  closeMenu();
  try{location.hash=t.id;}catch(e){}
}
function openMenu(){sidebar.classList.add('open');scrim.classList.add('show');}
function closeMenu(){sidebar.classList.remove('open');scrim.classList.remove('show');}

document.getElementById('menuBtn').onclick=()=>sidebar.classList.contains('open')?closeMenu():openMenu();
scrim.onclick=closeMenu;
document.getElementById('aiQuick').onclick=()=>go('ai');

buildNav();
const startId=(location.hash||'').replace('#','');
go(all.find(x=>x.id===startId)?startId:'home');
})();
