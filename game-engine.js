/* ===== THE PHONE HEIST — game layer =====
   Wraps the emulator sandbox with the design-spec loop:
   motive card → pick a rung (dislike dial) → do the prank on the
   phone/computer → the engine watches your actions, tracks heat,
   runs the catch-roll, and shows one of 5 ending screens.
   Pure in-game fiction; it only reads/annotates sandbox state.      */
(function(){
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---- catch-roll constants (design-spec §4) ---- */
const BASE=5, PER_RISK=8, CAP=85;

/* ---- the rung ladder (§1, §8.2) ---- */
const RUNGS=[
  {r:1,name:'Mildly annoyed',  move:'Swap something cosmetic',          need:null,              goal:'change their wallpaper / ringtone / theme',   icon:'🎨'},
  {r:2,name:'Properly irked',  move:'Poke settings over the cable',     need:'the computer link',goal:'link the phone + change a setting from the laptop', icon:'🔌'},
  {r:3,name:'Genuine grudge',  move:'Open the gate (bootloader)',       need:'OEM-unlock on',   goal:'run open-gate from the Terminal',             icon:'🚧'},
  {r:4,name:'Real enemy',      move:'Grab the master key (root)',       need:'the gate open',   goal:'run grab-key from the Terminal',              icon:'🗝️'},
  {r:5,name:'Mortal nemesis',  move:'Replace the whole OS',             need:'root held',       goal:'flash a new OS from the Terminal',            icon:'🧱'}
];

/* ---- the 25-cell scenario matrix (§3) ---- */
const SCENARIOS={
  1:{CLEAN_WIN:'Wallpaper → all cats. They\'re baffled, it\'s adorable, fully reversible.',
     OVERKILL:'You went overboard — the phone lags under the chaos and they just reset it in 10 seconds.',
     CAUGHT:'They watched you grab their phone. "…why do you have my phone?"'},
  2:{CLEAN_WIN:'Autocorrect now turns "the" → "moist". Chaos for weeks, undetectable.',
     OVERKILL:'You broke so many settings they factory-reset the same day. Effort wasted.',
     CAUGHT:'The link-approval popup fired on THEIR screen — they saw the prompt and know.'},
  3:{CLEAN_WIN:'Gate opened clean, deep access gained. Subtle havoc, never traced.',
     OVERKILL:'Opening the gate wiped the whole phone — everything gone, instantly obvious.',
     BLOCKED:'Their phone is a locked model — the gate won\'t open, ever. The prank dies at the wall.',
     CAUGHT:'You left the "gate\'s been opened" warning on the boot screen — they see it every power-on.',
     BRICKED:'You interrupted the gate process midway → stuck in recovery.'},
  4:{CLEAN_WIN:'Master key in hand, apps bend to your will, hidden from everything. Pure puppet-master.',
     OVERKILL:'The key works but their banking app now refuses to open — they KNOW something\'s wrong.',
     BLOCKED:'A protection they\'d enabled blocks the key — can\'t get it on this one.',
     CAUGHT:'You tripped a hardware tamper flag — permanent and provable. Warranty void.',
     BRICKED:'Botched the key injection → won\'t boot past the logo.'},
  5:{CLEAN_WIN:'Flashed a whole new OS clean. Maximum chaos, and somehow it still boots.',
     OVERKILL:'The new OS is so alien they factory-reset within the hour — effort wasted.',
     BLOCKED:'Can\'t replace the OS — the gate was never openable on this phone.',
     CAUGHT:'Flashing left loud forensic traces — obvious, and traceable to you.',
     BRICKED:'Wrong-device OS → it doesn\'t boot. A paperweight. The ultimate "too far."'}
};
const ENDINGS={
  CLEAN_WIN:{t:'CLEAN WIN',   i:'😎', c:'#4ade80', s:'all gravy'},
  OVERKILL: {t:'OVERKILL',    i:'🤦', c:'#ffcf4d', s:'worked… then backfired'},
  BLOCKED:  {t:'BLOCKED',     i:'🧱', c:'#8b97a8', s:'this one can\'t be touched'},
  CAUGHT:   {t:'CAUGHT',      i:'🚨', c:'#ff5a6a', s:'you got caught'},
  BRICKED:  {t:'BRICKED',     i:'💀', c:'#ff5a6a', s:'cautionary tale'}
};

/* ---- run state ---- */
let run=null; // {rung, heat, motive, reached:{}, technical}
function fresh(rung){ return {rung, heat:0, maxReached:1, technical:'ok', caughtWatch:false}; }

/* ---- UI shell ---- */
function el(id){return document.getElementById(id)}
function overlay(html){ let o=el('game-ov'); if(!o){o=document.createElement('div');o.id='game-ov';o.className='game-ov';document.body.appendChild(o)} o.innerHTML=html; o.classList.add('show'); return o; }
function closeOverlay(){ const o=el('game-ov'); if(o)o.classList.remove('show'); }

/* ---- HUD (rung + objective live in the TOP BAR; hideable suspicion chip) ---- */
let showHeat=true;
try{showHeat=localStorage.getItem('emu_showheat')!=='0'}catch(e){}
function hud(){
  const hint=el('hint'), chip=el('heat-chip'), hbtn=el('heatbtn');
  if(!run){
    if(hint){hint.classList.remove('rung-hud');hint.innerHTML='';}
    if(chip)chip.style.display='none'; if(hbtn)hbtn.style.display='none';
    if(window.setLink)window.setLink(EMU.connected); // restore link status text
    return;
  }
  // auto-raise the displayed rung to match the deepest deed actually accomplished,
  // so the pill never lags behind what the player has really done (e.g. flashed an OS)
  const P=EMU.phone;
  let deed=1;
  if(P.os!=='Stock OS 14' && P.os!=='💀 bricked') deed=5;
  else if(P.rooted) deed=4;
  else if(P.gateOpen) deed=3;
  else if(EMU.connected && P.usbDebug) deed=2;
  if(deed>run.rung) run.rung=deed;
  const R=RUNGS[run.rung-1];
  if(hint){
    hint.classList.add('rung-hud');
    hint.innerHTML=`<button class="rh-rung" id="rh-pill" title="change rung">Rung ${run.rung} · ${esc(R.name)} ▾</button><button id="gh-end" class="rh-end">finish ›</button>`;
    const p=el('rh-pill'); if(p)p.onclick=ladderScreen;
    const b=el('gh-end'); if(b)b.onclick=resolve;
  }
  // top-bar suspicion chip (hideable)
  if(hbtn){hbtn.style.display='';hbtn.textContent=showHeat?'hide suspicion':'show suspicion';}
  if(chip){
    if(showHeat){
      const pct=Math.min(100,Math.round(catchChance()));
      const sus=pct<15?'low':pct<40?'medium':pct<65?'high':'critical';
      chip.style.display='';
      chip.innerHTML=`suspicion: <b>${sus}</b> <span class="hc-bar"><i style="width:${pct}%"></i></span>`;
    } else { chip.style.display='none'; }
  }
  if(window.teachRefresh)teachRefresh();
}
function catchChance(){ return Math.min(CAP, BASE + run.heat*PER_RISK); }
function wireHeatToggle(){ const b=el('heatbtn'); if(b&&!b._w){b._w=1;b.onclick=()=>{showHeat=!showHeat;try{localStorage.setItem('emu_showheat',showHeat?'1':'0')}catch(e){}hud();};} }

/* ================= public hooks the sandbox calls ================= */
window.GAME={
  active:()=>!!run,
  /* an action happened. rung = which depth it belongs to, heat = risk points, tech = optional technical outcome */
  note(rung, heat, tech){
    if(!run)return;
    if(heat)run.heat+=heat;
    if(rung&&rung>run.maxReached)run.maxReached=rung;
    if(tech)run.technical=tech;
    hud();
  },
  caughtInAct(){ if(run){run.caughtWatch=true;} },
  start(){ startScreen(); }
};

/* ---- start / title ---- */
function startScreen(){
  run=null; hud();
  overlay(`<div class="g-card">
    <div class="g-icon">🎭</div>
    <h2>The Phone Heist</h2>
    <p class="g-sub">Their phone is right there, unlocked. How far will you go — and can you pull it off clean? The smart play isn't the deepest one — it's the lowest rung that gets the job done.</p>
    <div class="g-btns"><button class="g-go" id="g-begin">▸ Start</button><button class="g-skip" id="g-free">just let me mess around (free play)</button></div>
  </div>`);
  el('g-begin').onclick=ladderScreen;
  el('g-free').onclick=()=>{try{sessionStorage.setItem('emu_freeplay','1')}catch(e){}closeOverlay();run=null;hud()};
}

/* ---- pick a rung: just "how evil do you want to be" (§8.2 locked ladder, no narrative) ---- */
function ladderScreen(){
  const ladder=RUNGS.map(R=>{
    const locked=R.r>1 && !prereqMet(R.r);
    return `<div class="g-rung ${locked?'locked':''}" data-r="${R.r}">
      <div class="gr-ico">${R.icon}</div>
      <div class="gr-txt"><b>Rung ${R.r} — ${esc(R.name)}</b><span>${esc(R.move)}</span></div>
      ${locked?`<span class="gr-lock">🔒 needs: ${esc(R.need)}</span>`:`<span class="gr-go">choose ›</span>`}
    </div>`;
  }).join('');
  overlay(`<div class="g-card wide">
    <div class="g-icon">😈</div>
    <h2>How evil are you feeling?</h2>
    <p class="g-sub">Pick your depth — the deeper you go, the bigger the payoff and the bigger the risk. Locked rungs tell you what you'd need first.</p>
    <div class="g-ladder">${ladder}</div>
    <div class="g-btns"><button class="g-skip" id="g-back">‹ back</button></div>
  </div>`);
  el('g-back').onclick=()=>{ if(run)closeOverlay(); else startScreen(); };
  document.querySelectorAll('.g-rung:not(.locked)').forEach(d=>d.onclick=()=>{
    const r=+d.dataset.r;
    if(run){ run.rung=r; closeOverlay(); hud(); if(window.teachRefresh)teachRefresh(); } // switch rung mid-run, keep progress
    else beginRun(r);
  });
}
/* a rung is pickable only if the sandbox is already in the state it needs (§8.3 gating) */
function prereqMet(r){
  const P=EMU.phone;
  if(r===2) return EMU.connected && P.usbDebug;      // the link
  if(r===3) return EMU.connected && P.usbDebug && P.oemUnlock; // consent to open the gate
  if(r===4) return P.gateOpen;                         // gate open
  if(r===5) return P.rooted || P.gateOpen;             // root/gate to flash
  return true;
}

function beginRun(rung){
  run=fresh(rung);
  const R=RUNGS[rung-1];
  closeOverlay(); wireHeatToggle(); hud();
  // the fence nudge (§8.5)
  if(window.toast)toast(`the fence: "${rung<=2?'start small. do it clean.':'bold. don\'t get sloppy — heat gets you caught.'}"`);
}

/* ================= resolution (§5 priority + §4 roll) ================= */
function resolve(){
  if(!run)return;
  const P=EMU.phone;
  // what did they ACTUALLY accomplish? derive the deepest real deed from live state,
  // so the ending reflects what happened — not just the rung they picked at the start.
  let achieved=1;
  if(P.os!=='Stock OS 14' && P.os!=='💀 bricked') achieved=5;      // flashed a new OS
  else if(P.rooted) achieved=4;                                     // grabbed root
  else if(P.gateOpen) achieved=3;                                   // opened the gate
  else if(EMU.connected && P.usbDebug) achieved=Math.max(2,run.maxReached>=2?2:1); // used the link
  achieved=Math.max(achieved, run.maxReached);
  const R=achieved;
  // derive technical outcome from actual sandbox state
  let tech='ok';
  const performed = run.maxReached>=run.rung;
  if(P.os==='💀 bricked') tech='brick';
  else if(run.rung>=3 && !performed && blockedByWall(run.rung)) tech='blocked';
  else if(overdid()) tech='overkill';

  // §5 resolution order
  let ending;
  const rolled = Math.random()*100 < catchChance();
  if(tech==='brick' && R>=3) ending='BRICKED';
  else if(rolled || run.caughtWatch) ending='CAUGHT';
  else if(tech==='blocked' && run.rung>=3) ending='BLOCKED';
  else if(tech==='overkill') ending='OVERKILL';
  else ending='CLEAN_WIN';

  // secret "Professional" (§6)
  const pro = ending==='CLEAN_WIN' && R<=2 && run.heat===0;
  endingScreen(ending, R, pro);
}
function blockedByWall(r){ const P=EMU.phone; if(r>=3) return !P.oemUnlock && !P.gateOpen; return false; }
function overdid(){ return run.heat>=6; } // heavy-handed = self-defeating even if not caught

function endingScreen(id, rung, pro){
  const E=ENDINGS[id];
  const scn=(SCENARIOS[rung]&&SCENARIOS[rung][id])||'The dust settles.';
  const lesson=id==='CLEAN_WIN'
    ? (pro?'🏆 THE PROFESSIONAL — you barely touched it, they\'re losing their mind, and there\'s zero evidence. This is what mastery looks like.'
          :'You matched the depth to the goal and kept it clean. That restraint IS the skill.')
    : id==='OVERKILL' ? 'Lesson: power without subtlety backfires. A smaller, cleaner move would\'ve won.'
    : id==='BLOCKED'  ? 'Lesson: not every phone can be touched. A locked gate is a real wall, by design.'
    : id==='CAUGHT'   ? 'Lesson: every boundary you cross leaves a trace. The more you reached, the more the dice turned on you.'
    :                   'Lesson: the deepest move is the riskiest. Go too far on the wrong device and it\'s a paperweight.';
  overlay(`<div class="g-card" style="border-color:${E.c}">
    <div class="g-icon">${pro?'🏆':E.i}</div>
    <h2 style="color:${E.c}">${pro?'THE PROFESSIONAL':E.t}</h2>
    <p class="g-sub" style="font-weight:700">${esc(E.s)}</p>
    <div class="g-scn">${esc(scn)}</div>
    <div class="g-lesson">💡 ${esc(lesson)}</div>
    <div class="g-stat">rung ${rung} · final suspicion ${Math.round(catchChance())}%</div>
    <div class="g-btns"><button class="g-go" id="g-again">▸ new heist</button><button class="g-skip" id="g-close">close (keep playing)</button></div>
  </div>`);
  run=null; hud();
  el('g-again').onclick=startScreen;
  el('g-close').onclick=closeOverlay;
}

/* ================= instruction / "teach me" mode (right-side to-do panel) ================= */
/* the player picks a target scheme (rung); the green ring walks the prereq chain to it. */

/* reusable step definitions (done check + ring target). referenced by key from RUNG_TODO. */
const STEP_DEFS={
  link:{label:'Connect the cable + Allow the link',
   done:()=>EMU.connected,
   target:()=>{ const o=el('overlay'); if(o&&o.classList.contains('show'))return{sel:'#btn-yes',tip:'click Allow'};
     const pp=el('plug-phone'); if(pp&&!pp.classList.contains('seated'))return{sel:'#plug-phone',tip:'drag to the phone port'};
     const pc=el('plug-pc'); if(pc&&!pc.classList.contains('seated'))return{sel:'#plug-pc',tip:'drag to the computer port'};
     return{sel:'#port-phone',tip:'connect the cable'}; }},
  usb:{label:'Turn on USB debugging',
   done:()=>EMU.phone.usbDebug,
   target:()=>{ if(el('d-usb'))return{sel:'#d-usb',tip:'turn on USB debugging'};
     if(el('s-dev'))return{sel:'#s-dev',tip:'open Developer options'};
     if(el('s-about'))return{sel:'#s-about',tip:'tap About 7× to unlock dev options'};
     const s=document.querySelector('.appi[data-app="settings"]'); return s?{node:s,tip:'open Settings'}:null; }},
  oem:{label:'Allow OEM unlocking',
   done:()=>EMU.phone.oemUnlock,
   target:()=>{ if(el('d-oem'))return{sel:'#d-oem',tip:'allow OEM unlocking'};
     if(el('s-dev'))return{sel:'#s-dev',tip:'open Developer options'};
     const s=document.querySelector('.appi[data-app="settings"]'); return s?{node:s,tip:'Settings → Developer options'}:null; }},
  gate:{label:'Open the gate (Terminal: open-gate)',
   done:()=>EMU.phone.gateOpen,
   target:()=>{ const t=document.querySelector('#pc-view'); return t?{node:t,tip:'open Terminal → run open-gate'}:null; }},
  root:{label:'Grab the master key (Terminal: grab-key)',
   done:()=>EMU.phone.rooted,
   target:()=>{ const t=document.querySelector('#pc-view'); return t?{node:t,tip:'Terminal → run grab-key'}:null; }},
  // per-rung finale actions (unique to each rung)
  cosmetic:{label:'Change the wallpaper / ringtone / theme',
   done:()=>EMU.phone.wallpaper!=='linear-gradient(160deg,#ffe3f1,#e3f0ff)'||EMU.phone.theme!=='dark'||EMU.phone.ringtone!=='Reflection',
   target:()=>{ const s=document.querySelector('.appi[data-app="settings"]'); return s?{node:s,tip:'Settings → Wallpaper / Ringtone / Display'}:null; }},
  setting:{label:'Change a phone setting from the Terminal',
   done:()=>false,
   target:()=>{ const t=document.querySelector('#pc-view'); return t?{node:t,tip:'Terminal → set a value on the phone'}:null; }},
  flash:{label:'Flash a new OS (Terminal: flash)',
   done:()=>EMU.phone.os!=='Stock OS 14',
   target:()=>{ const t=document.querySelector('#pc-view'); return t?{node:t,tip:'Terminal → run flash <os>'}:null; }}
};
/* each rung shows ONLY its own unique task(s) — no inherited lower-rung steps.
   the FIRST entry is the gating prerequisite that unlocks this rung; the rest are the deed. */
const RUNG_TODO={
  1:['cosmetic'],
  2:['link','setting'],
  3:['oem','gate'],
  4:['gate','root'],
  5:['root','flash']
};

let teachOpen=false, teachGoal=null, teachStep=null, teachTimer=null, teachRing=null;
function stepsFor(goal){ return (RUNG_TODO[goal]||[]).map(k=>Object.assign({key:k},STEP_DEFS[k])); }
function nextStep(goal){
  // walk the FULL real prereq chain so the ring never points past an unmet gate,
  // but only among the steps this rung lists (unique, non-stacking display).
  const order=['link','usb','oem','gate','root','cosmetic','setting','flash'];
  const mine=new Set(RUNG_TODO[goal]||[]);
  for(const k of order){ if(mine.has(k) && !STEP_DEFS[k].done()) return Object.assign({key:k},STEP_DEFS[k]); }
  return null;
}

function renderTeachList(){
  const box=el('teach-list'); if(!box) return;
  box.innerHTML=RUNGS.map(R=>{
    const active=teachGoal===R.r;
    const steps=stepsFor(R.r);
    const nxt=nextStep(R.r);
    const items=steps.map(s=>{
      const cls=s.done()?'done':(active&&teachStep===s.key?'picked':(nxt&&s.key===nxt.key?'next':''));
      return `<li class="tstep ${cls}" data-r="${R.r}" data-step="${s.key}">${esc(s.label)}</li>`;
    }).join('');
    return `<div class="tgoal ${active?'active':''}" data-r="${R.r}">
      <div class="tg-top" data-r="${R.r}"><span class="tg-ico">${R.icon}</span>Rung ${R.r} — ${esc(R.name)}</div>
      <div class="tg-sub" data-r="${R.r}">${esc(R.move)}</div>
      <ul class="tsteps">${items}</ul>
    </div>`;
  }).join('');
  // clicking the header/subheader selects the rung (auto-targets its next step)
  box.querySelectorAll('.tg-top,.tg-sub').forEach(d=>d.onclick=()=>{ teachGoal=+d.dataset.r; teachStep=null; renderTeachList(); teachRefresh(); });
  // clicking an individual step selects that rung AND pins that specific step as the ring target
  box.querySelectorAll('.tstep').forEach(d=>d.onclick=e=>{ e.stopPropagation(); teachGoal=+d.dataset.r; teachStep=d.dataset.step; renderTeachList(); teachRefresh(); });
}

/* update step done/next/picked classes in place without rebuilding (keeps click handlers alive) */
function refreshStepStates(){
  const box=el('teach-list'); if(!box) return;
  box.querySelectorAll('.tgoal').forEach(d=>{
    const goal=+d.dataset.r; const active=teachGoal===goal; const steps=stepsFor(goal); const nxt=nextStep(goal);
    const lis=d.querySelectorAll('.tsteps li');
    steps.forEach((s,i)=>{ const li=lis[i]; if(!li)return;
      li.classList.toggle('done',s.done());
      li.classList.toggle('picked',active&&teachStep===s.key&&!s.done());
      li.classList.toggle('next',!(active&&teachStep)&&!!(nxt&&s.key===nxt.key)); });
  });
}

function teachRefresh(){
  if(!teachRing) return;
  if(!teachOpen || !teachGoal){ teachRing.style.display='none'; return; }
  // a pinned step takes priority; otherwise ring the next unmet prereq for the goal
  let s = (teachStep && STEP_DEFS[teachStep]) ? Object.assign({key:teachStep},STEP_DEFS[teachStep]) : nextStep(teachGoal);
  if(s && s.done()) s=nextStep(teachGoal); // a completed pinned step falls back to the next real one
  const t=s&&s.target&&s.target();
  const node = t && (t.node || (t.sel && document.querySelector(t.sel)));
  if(!node || !node.getBoundingClientRect){ teachRing.style.display='none'; return; }
  const r=node.getBoundingClientRect();
  if(r.width===0||r.height===0){ teachRing.style.display='none'; return; }
  const pad=6;
  teachRing.style.display='block';
  teachRing.style.left=(r.left-pad)+'px'; teachRing.style.top=(r.top-pad)+'px';
  teachRing.style.width=(r.width+pad*2)+'px'; teachRing.style.height=(r.height+pad*2)+'px';
  teachRing.setAttribute('data-tip', t.tip||'next step');
}

function toggleTeach(open){
  teachOpen = (open===undefined) ? !teachOpen : open;
  const panel=el('teach-panel'), stage=el('stage'), btn=el('learnbtn');
  if(teachOpen && window.closeHood) window.closeHood(); // mutually exclusive with hood
  if(panel) panel.classList.toggle('show',teachOpen);
  if(stage) stage.classList.toggle('shifted',teachOpen);
  if(btn){ btn.textContent='teach me: '+(teachOpen?'on':'off'); btn.style.background=teachOpen?'var(--green)':'#fff'; }
  if(!teachRing){ teachRing=document.createElement('div'); teachRing.className='teach-ring'; teachRing.style.display='none'; document.body.appendChild(teachRing); }
  if(teachOpen){
    if(!teachGoal) teachGoal = run ? run.rung : null;
    renderTeachList(); teachRefresh();
    if(!teachTimer) teachTimer=setInterval(()=>{ if(teachOpen){ refreshStepStates(); teachRefresh(); } },500);
  } else {
    if(teachTimer){clearInterval(teachTimer);teachTimer=null;}
    teachRing.style.display='none';
  }
  setTimeout(()=>{ if(window.fitScene)window.fitScene(); if(window.initPlugs)window.initPlugs(); },320);
}
window.closeTeach=()=>{ if(teachOpen) toggleTeach(false); };
function wireTeach(){
  const btn=el('learnbtn'); if(btn) btn.onclick=()=>toggleTeach();
  const x=el('teach-x'); if(x) x.onclick=()=>toggleTeach(false);
}
window.teachRefresh=teachRefresh;
window.addEventListener('resize',()=>{ if(teachOpen) teachRefresh(); });

/* ================= boundary "fix cards" (teach how to undo each line you cross) =================
   fired by the sandbox the moment a real security boundary is crossed. each card names the
   boundary, the trace it leaves, and whether/how you can get around it — with a one-click
   "do the fix" that runs the actual reverse action in the sandbox when one exists. */
const FIXES={
  link:{ico:'🔌',ttl:'You opened the debug link',
    trace:'The phone showed an "Allow USB debugging?" prompt on ITS screen — the owner can see that it was approved, and the authorized-computers list remembers your laptop.',
    canFix:true, fixTtl:'How to clean it up',
    fix:'Revoke it from the phone: Settings → Developer options → "Revoke USB debugging authorizations". That drops your laptop from the trusted list so the link can\'t be reused — but it does NOT un-show the prompt they already saw.',
    doLabel:null, doCmd:null},
  usb:{ico:'🛠️',ico2:'🛠️',ttl:'You turned on USB debugging',
    trace:'Developer options are now visibly ON in Settings. A nosy owner can spot the extra menu and the "Developer mode" banner.',
    canFix:true, fixTtl:'How to undo it',
    fix:'Flip USB debugging back off (Developer options → USB debugging), or toggle Developer options off entirely so the menu disappears. Fully reversible, leaves nothing behind.',
    doLabel:null, doCmd:null},
  oem:{ico:'🔓',ttl:'You allowed OEM unlocking',
    trace:'This is just a CONSENT switch — nothing has happened to the phone yet. But it is the gate\'s off-switch: with it on, the bootloader can be opened.',
    canFix:true, fixTtl:'How to undo it',
    fix:'Turn "OEM unlocking" back off in Developer options. If you never ran open-gate, the phone is exactly as you found it — no trace at all.',
    doLabel:null, doCmd:null},
  gate:{ico:'🚧',ttl:'You opened the gate (unlocked the bootloader)',
    trace:'This is the big one. Unlocking the bootloader WIPED the phone, and it burns a permanent "the gate\'s been opened" warning into the boot screen — the owner sees it on every single power-on.',
    canFix:'partial', fixTtl:'Can you get rid of the boot warning?',
    fix:'On this phone: re-locking the gate clears the warning — run <code>flash stock</code> to restore the factory OS, which re-locks the bootloader and removes the warning (but the wipe already happened). On a REAL locked phone you usually CAN\'T hide it: the warning is enforced below the OS so malware can\'t fake a "trusted" boot. The one exception is GrapheneOS, which lets you re-lock with YOUR OWN keys so a custom OS still boots "verified" with no warning.',
    doLabel:'▸ flash stock to re-lock & clear the warning', doCmd:'flash stock'},
  root:{ico:'🗝️',ttl:'You grabbed the master key (root)',
    trace:'You now hold UID 0 — total control below every app sandbox. Apps that check for root (banking, Google Pay) will refuse to run, which is itself a visible tell.',
    canFix:true, fixTtl:'How to give it back / hide it',
    fix:'Reversible: <code>flash stock</code> wipes root entirely. In the real world you don\'t remove it, you HIDE it — Magisk roots "systemlessly" (it patches boot.img, never the read-only /system) so you can toggle root off per-app and pass the banking-app check. Modifying /system directly is the old brittle way that trips dm-verity and breaks updates.',
    doLabel:'▸ flash stock to drop root', doCmd:'flash stock'},
  flash:{ico:'🧱',ttl:'You flashed a whole new OS',
    trace:'The deepest move — kernel, framework and apps all swapped. Loud forensic traces, and the wrong image for the device = a brick that never boots.',
    canFix:true, fixTtl:'How to get back to normal',
    fix:'As long as it still boots, <code>flash stock</code> restores the factory OS and re-locks the gate — back to square one. The one thing you can\'t undo is a BRICK: flash the wrong-device image and no reverse command can save it. That\'s why matching the image to the exact device is the whole game.',
    doLabel:'▸ flash stock to restore factory', doCmd:'flash stock'}
};
let fixSeen={};
try{ fixSeen=JSON.parse(localStorage.getItem('emu_fixseen')||'{}')||{}; }catch(e){ fixSeen={}; }
let infoCardsOn=true;
try{ infoCardsOn=localStorage.getItem('emu_infocards')!=='0'; }catch(e){ infoCardsOn=true; }
let fixEl=null, fixHide=null;
/* key=boundary id. opts.force shows it again even if already seen this session. */
window.fixCard=function(key,opts){
  const F=FIXES[key]; if(!F) return;
  opts=opts||{};
  if(!infoCardsOn && !opts.force) return;             // info-cards mode is off
  if(fixSeen[key] && !opts.force) return; // teach each boundary once (unless forced)
  fixSeen[key]=1; try{localStorage.setItem('emu_fixseen',JSON.stringify(fixSeen))}catch(e){}
  if(!fixEl){ fixEl=document.createElement('div'); fixEl.className='fixcard'; document.body.appendChild(fixEl); }
  const canCls = F.canFix===true?'fc-can':F.canFix==='partial'?'':'fc-cant';
  const canWord = F.canFix===true?'✔ reversible':F.canFix==='partial'?'◐ sometimes':'✖ permanent';
  fixEl.innerHTML=`<div class="fc-head"><span class="fc-ico">${F.ico}</span><span class="fc-ttl">${esc(F.ttl)}</span><button class="fc-x" id="fc-x">×</button></div>
    <div class="fc-body"><div class="fc-trace">${F.trace}</div>
      <div class="fc-fix"><b>${esc(F.fixTtl)} · <span class="${canCls}">${canWord}</span></b>${F.fix}</div></div>
    ${F.doLabel && F.doCmd ? `<div class="fc-foot"><button class="fc-do" id="fc-do">${esc(F.doLabel)}</button></div>`:''}`;
  requestAnimationFrame(()=>fixEl.classList.add('show'));
  const close=()=>{ fixEl.classList.remove('show'); if(fixHide){clearTimeout(fixHide);fixHide=null;} };
  const x=el('fc-x'); if(x)x.onclick=close;
  const dob=el('fc-do'); if(dob)dob.onclick=()=>{ close(); if(window.PcOS&&window.runFixCmd)window.runFixCmd(F.doCmd); };
  if(fixHide)clearTimeout(fixHide);
  fixHide=setTimeout(close, 22000); // auto-dismiss; it's a teaching aid, not a modal
};
window.resetFixCards=function(){ fixSeen={}; try{localStorage.removeItem('emu_fixseen')}catch(e){} };

/* info-cards mode toggle (sits next to "under the hood" / "teach me") */
function syncInfoBtn(){ const b=el('infobtn'); if(!b)return; b.textContent='info cards: '+(infoCardsOn?'on':'off'); b.style.background=infoCardsOn?'var(--gold)':'#fff'; }
function toggleInfo(on){
  infoCardsOn = (on===undefined) ? !infoCardsOn : on;
  try{localStorage.setItem('emu_infocards',infoCardsOn?'1':'0')}catch(e){}
  syncInfoBtn();
  if(!infoCardsOn && fixEl){ fixEl.classList.remove('show'); if(fixHide){clearTimeout(fixHide);fixHide=null;} } // hide any card showing now
  if(window.toast)toast(infoCardsOn?'💡 info cards on — you\'ll get a how-to-undo card at each boundary':'info cards off');
}
window.toggleInfo=toggleInfo;
function wireInfo(){ const b=el('infobtn'); if(b)b.onclick=()=>toggleInfo(); syncInfoBtn(); }

/* auto-open the title once on first load (if not in free play) */
window.addEventListener('load',()=>{ wireTeach(); wireInfo(); setTimeout(()=>{ if(!sessionStorage.getItem('emu_freeplay')) startScreen(); }, 600); });
})();
