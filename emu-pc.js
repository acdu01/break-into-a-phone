/* ===== COMPUTER OS (control station) =====
   Pure in-game simulation. Every "command" just flips shared EMU.phone
   state and re-renders — nothing here does anything outside this page.
   The heist verbs are the design-spec's tool-agnostic rungs:
     wallpaper (rung1) · settings-channel (rung2) · open-gate (rung3)
     · grab-key (rung4) · flash <os> (rung5).                              */
(function(){
const V   = () => document.getElementById('pc-view');
const TTL = () => document.getElementById('pc-app-title');
const P   = EMU.phone;
const esc = s => String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------- fake local .txt filesystem on the computer ---------- */
const FILES = {
  'readme.txt':
`control station — field notes
------------------------------
1. plug both cable ends in (phone + this box).
2. the phone has to SAY YES to the link.
3. open Terminal. type  help .
4. nothing here touches a real phone. it's all pretend.`,
  'targets.txt':
`known phones on the street
--------------------------
Heistphone 7   ·  the classmate's   ·  no screen lock (trusting)
Heistphone 7   ·  your own spare    ·  for practice`,
  'plan.txt':
`the escalation dial (how much you dislike them)
-----------------------------------------------
rung 1  mildly annoyed   -> swap their wallpaper. harmless.
rung 2  properly irked   -> poke settings over the cable.
rung 3  genuine grudge   -> open the "gate" (bootloader).
rung 4  real enemy       -> grab the "master key" (root).
rung 5  mortal nemesis   -> flash a whole new OS.

the deeper you go, the more HEAT you build, and the more
likely the catch-roll bites you. match depth to the goal.`,
  'glossary.txt':
`what the words mean (tool-agnostic)
-----------------------------------
gate        the bootloader. locked phones refuse to open it.
master key  superuser / root. owning the system, not just using it.
flash       replace the OS above the kernel with a different one.
link        the computer<->phone channel. needs USB debugging ON.
heat        how noisy/detectable your run was. feeds the catch-roll.`,
  'spare-os.txt':
`OS images you have lying around (pretend .img files)
----------------------------------------------------
GrapheneOS      hardened, no clutter        flash grapheneos
LineageOS       the community classic       flash lineageos
PotatoOS 9000   a cursed meme build         flash potatoos
Stock OS 14     factory default (restore)   flash stock`
};
const FILE_ICON = f => f.endsWith('.txt') ? '📄' : '📦';

/* ---------- window frame ---------- */
function win(title, bodyHtml, onClose){
  TTL().textContent = title;
  V().innerHTML =
    `<div class="win"><div class="win-head">${esc(title)}<span class="x" id="win-x">✕</span></div>`+
    `<div class="win-body" id="win-body">${bodyHtml}</div></div>`;
  V().querySelector('#win-x').onclick = ()=>{ onClose&&onClose(); home(); };
  return V().querySelector('#win-body');
}

/* ---------- desktop ---------- */
const DESK = [
  {id:'files',    n:'Files',    i:'📁'},
  {id:'terminal', n:'Terminal', i:'⌨️'},
  {id:'virusbuilder', n:'Build-a-Virus', i:'🧪'},
  {id:'photos',   n:'Pulled Photos', i:'🖼️'},
  {id:'trash',    n:'Trash',    i:'🗑️'}
];
function home(){
  if(!EMU.pcOn) return;
  TTL().textContent='Desktop';
  V().innerHTML = `<div class="desk">`+DESK.map(d=>
    `<div class="dico" data-app="${d.id}"><span class="gi">${d.i}</span>${d.n}</div>`).join('')+`</div>`;
  V().querySelectorAll('.dico').forEach(el=>el.ondblclick=el.onclick=()=>openApp(el.dataset.app));
}
function openApp(id){ ({files:filesApp,terminal:terminal,virusbuilder:virusBuilder,photos:pulledPhotos,trash:trashApp}[id]||home)(); }

/* ---------- Files (.txt viewer) ---------- */
function filesApp(){
  const names = Object.keys(FILES);
  const b = win('Files — This Computer',
    `<div style="color:#8b97a8;font-size:.66rem;margin-bottom:6px">${names.length} items · double-click to open</div>`+
    names.map(f=>`<div class="file" data-f="${f}">${FILE_ICON(f)} <span>${esc(f)}</span><span class="fsz">${FILES[f].length} B</span></div>`).join(''));
  b.querySelectorAll('.file').forEach(el=>el.ondblclick=el.onclick=()=>viewTxt(el.dataset.f));
}
function viewTxt(f){
  const b = win(f, `<pre class="txt">${esc(FILES[f])}</pre>`+
    `<div style="margin-top:10px"><button class="btn-p o" id="bk">‹ back to Files</button></div>`);
  b.querySelector('#bk').onclick = filesApp;
}

/* ---------- pulled photos (populated by the terminal 'pull' cmd) ---------- */
let pulled = JSON.parse(localStorage.getItem('emu_pulled')||'[]');
const savePulled = ()=>localStorage.setItem('emu_pulled',JSON.stringify(pulled));
function pulledPhotos(){
  win('Pulled Photos',
    pulled.length
      ? `<div class="pgrid">${pulled.map(p=>`<div class="pic" style="background:#e6d6f5">${p}</div>`).join('')}</div>`
      : `<div class="empty">Nothing pulled yet.<br>Link the phone, then run <b>pull photos</b> in the Terminal.</div>`);
}
function trashApp(){ win('Trash', `<div class="empty">🗑️ Empty.<br><small>(nothing you do here is permanent anyway.)</small></div>`); }

/* ---------- PRANK PAYLOAD BUILDER ---------- */
const PAYLOAD_PRESETS = {
  kitty:   {name:'KittyVirus',    emojis:['🐱','😻','🐈','🙀','😺'], msg:'meow :3',           rate:6, bounce:true,  multiply:true },
  rickroll:{name:'NeverGonna',    emojis:['🎵','🕺','💃','📀'],      msg:'never gonna give you up', rate:5, bounce:true,  multiply:false},
  bugs:    {name:'BugSwarm',      emojis:['🐛','🦗','🪲','🕷️'],      msg:'is that a bug?',    rate:8, bounce:false, multiply:true },
  love:    {name:'LoveBomb',      emojis:['❤️','😍','💌','🥰'],      msg:'u up?',             rate:5, bounce:true,  multiply:false}
};
let payload = {...PAYLOAD_PRESETS.kitty};
const EMOJI_CHOICES = ['🐱','😻','🐶','🍕','😂','❤️','👻','🤡','🐛','🎉','💩','👽','🦖','🌮','🕺'];

function virusBuilder(){
  const sel = new Set(payload.emojis);
  const b = win('🧪 Payload Builder — build-a-virus',
    `<div style="font-size:.68rem;color:#6b5d52;margin-bottom:8px">Design a harmless pop-up prank, then deploy it to the linked phone. Fully reversible — <b>virus stop</b> (or the Stop button) cleans it.</div>
     <div class="sect" style="padding-left:0">Pick emojis to spam</div>
     <div id="emgrid" style="display:flex;flex-wrap:wrap;gap:6px;margin-bottom:10px">${
        EMOJI_CHOICES.map(e=>`<div class="emch" data-e="${e}" style="cursor:pointer;font-size:1.3rem;padding:4px 7px;border-radius:10px;border:2px solid #2b2320;background:${sel.has(e)?'#ffd23f':'#fff'}">${e}</div>`).join('')}</div>
     <div class="sect" style="padding-left:0">Pop-up message</div>
     <input id="vmsg" value="${esc(payload.msg)}" maxlength="40" style="width:100%;background:#fff;border:2px solid #2b2320;border-radius:10px;color:#2b2320;padding:7px 10px;font-size:.74rem;outline:none">
     <div class="sect" style="padding-left:0;margin-top:10px">Intensity — <span id="rlab">${payload.rate}</span> pop-ups/sec</div>
     <input type="range" id="vrate" min="1" max="12" step="1" value="${payload.rate}" style="width:100%;accent-color:#ff6b9d">
     <div style="display:flex;gap:16px;margin-top:10px">
       <label style="font-size:.72rem;cursor:pointer;font-weight:700"><input type="checkbox" id="vbounce" ${payload.bounce?'checked':''}> bounce</label>
       <label style="font-size:.72rem;cursor:pointer;font-weight:700"><input type="checkbox" id="vmult" ${payload.multiply?'checked':''}> closing one spawns two 😈</label>
     </div>
     <div class="sect" style="padding-left:0;margin-top:10px">Quick presets</div>
     <div style="display:flex;gap:6px;flex-wrap:wrap">${Object.keys(PAYLOAD_PRESETS).map(k=>`<button class="btn-p o" data-preset="${k}" style="padding:5px 10px;font-size:.68rem">${PAYLOAD_PRESETS[k].name}</button>`).join('')}</div>
     <div style="display:flex;gap:8px;margin-top:14px">
       <button class="btn-p r" id="vdeploy">🚀 Deploy to phone</button>
       <button class="btn-p o" id="vstop">🧹 Stop &amp; clean</button>
     </div>
     <div id="vstatus" style="font-size:.68rem;color:#6b5d52;margin-top:8px"></div>`);
  const grid=b.querySelector('#emgrid');
  grid.querySelectorAll('.emch').forEach(el=>el.onclick=()=>{
    const e=el.dataset.e;
    if(sel.has(e)){ if(sel.size>1){sel.delete(e)} } else sel.add(e);
    el.style.background=sel.has(e)?'#ffd23f':'#fff';
  });
  b.querySelector('#vrate').oninput=e=>b.querySelector('#rlab').textContent=e.target.value;
  b.querySelectorAll('[data-preset]').forEach(btn=>btn.onclick=()=>{payload={...PAYLOAD_PRESETS[btn.dataset.preset]};virusBuilder()});
  b.querySelector('#vdeploy').onclick=()=>{
    payload={ name:payload.name||'CustomVirus', emojis:[...sel], msg:b.querySelector('#vmsg').value||'...',
      rate:+b.querySelector('#vrate').value, bounce:b.querySelector('#vbounce').checked,
      multiply:b.querySelector('#vmult').checked, interval:Math.max(120, Math.round(1000/(+b.querySelector('#vrate').value))), max:14 };
    deployVirus(b.querySelector('#vstatus'));
  };
  b.querySelector('#vstop').onclick=()=>{ stopVirus(); const s=b.querySelector('#vstatus'); if(s)s.textContent='🧹 stopped. phone is clean.'; };
}
function deployVirus(statusEl){
  if(!EMU.connected){ if(statusEl)statusEl.innerHTML='<span style="color:#ff5a6a">✖ no phone linked — plug the cable and click Allow here.</span>'; return; }
  if(!P.usbDebug){ if(statusEl)statusEl.innerHTML='<span style="color:#ff5a6a">✖ USB debugging is OFF on the phone.</span>'; return; }
  PhoneOS.startSpam(payload); heat+=2; if(window.GAME&&GAME.active())GAME.note(2,2);
  window.hood&&window.hood(['hw','kernel','fw','apps'],'computer pushes the pop-up payload over the link → it runs as an app drawing overlays (never touches their data)');
  if(statusEl)statusEl.innerHTML=`🚀 <b>${esc(payload.name)}</b> deployed — ${payload.emojis.join('')} spamming at ${payload.rate}/s. (+2 heat, total ${heat})`;
  toast&&toast(`🧪 ${payload.name} unleashed on the phone`);
}
function stopVirus(){ if(window.PhoneOS&&PhoneOS.stopSpam)PhoneOS.stopSpam(); window.hood&&window.hood(['apps','fw'],'the payload app is killed and its overlays cleared — nothing persisted'); }


/* ================= TERMINAL ================= */
let heat = 0;                       // design-spec: feeds the catch-roll
const history = [];
function terminal(){
  TTL().textContent='Terminal';
  V().innerHTML =
    `<div class="win"><div class="win-head">⌨️ Terminal<span class="x" id="win-x">✕</span></div>`+
    `<div class="term"><div class="out" id="t-out"></div>`+
    `<div class="in"><span>heist$</span><input id="t-in" autocomplete="off" spellcheck="false" placeholder="type: help"></div></div></div>`;
  V().querySelector('#win-x').onclick = home;
  const inp = V().querySelector('#t-in');
  print('inf', linkBanner());
  print('', "type 'help' for the command list.");
  inp.focus();
  let hpos = history.length;
  inp.onkeydown = e=>{
    if(e.key==='Enter'){ const c=inp.value; inp.value=''; if(c.trim()){history.push(c);hpos=history.length;} run(c); }
    else if(e.key==='ArrowUp'){ if(hpos>0){hpos--;inp.value=history[hpos]||'';} e.preventDefault(); }
    else if(e.key==='ArrowDown'){ if(hpos<history.length){hpos++;inp.value=history[hpos]||'';} e.preventDefault(); }
  };
}
function out(){ return document.getElementById('t-out'); }
function print(cls, txt){ const o=out(); if(!o)return; const d=document.createElement('div'); if(cls)d.className=cls; d.textContent=Array.isArray(txt)?txt.join('\n'):txt; o.appendChild(d); o.scrollTop=1e9; const i=document.getElementById('t-in'); if(i)setTimeout(()=>i.focus(),0); }
function linkBanner(){
  if(!EMU.connected) return '○ phone: NOT LINKED (plug the cable, then Allow on this computer)';
  if(!P.usbDebug)    return '◐ phone: linked, but USB debugging is OFF — enable it on the phone';
  return '● phone: LINKED · USB debugging ON · ready';
}

/* ---- helpers that enforce the in-game prerequisites ---- */
function needLink(){ if(!EMU.connected){print('err','✖ no phone linked. plug the cable and click Allow here.');return false;} if(!P.usbDebug){print('err','✖ link is up but USB debugging is OFF. turn it on in the phone\'s developer options.');return false;} return true; }
function addHeat(n,why,rung){ heat+=n; print('wrn',`   +${n} heat (${why}) · total heat ${heat}`); if(window.GAME&&GAME.active())GAME.note(rung||0,n); }
function rollCaught(){ /* design-spec catch-roll, flavor only */ const chance=Math.min(0.9, heat*0.12); return Math.random()<chance; }

function run(raw){
  const line = raw.trim();
  print('cmd','heist$ '+line);
  if(!line) return;
  const [cmd,...args] = line.split(/\s+/);
  const a0 = (args[0]||'').toLowerCase();
  switch(cmd.toLowerCase()){

    case 'help': return print('', [
      'FILES / INFO',
      '  status                 show the link + phone state',
      '  scan                   describe the linked phone',
      '  ls                     list files on THIS computer',
      '  cat <file.txt>         read a computer file',
      '',
      'PULL (read off the phone — needs link + USB debugging)',
      '  pull photos            copy photos to "Pulled Photos"',
      '  pull contacts          dump the contact list',
      '  pull notes             dump their notes',
      '',
      'RUNG 2 — poke settings over the cable (reversible, but crossing the channel)',
      '  toggle wifi|bt|airplane|vpn    flip a network setting',
      '  slow-anim              crank animations to 10x (maddening)',
      '  screenreader           turn on the screen reader',
      '  rename <app> <name>    rename an app icon (e.g. rename bank Loans)',
      '  disable <app>          hide an app from the home screen',
      '  push-photo             drop a photo FROM the computer onto the phone',
      '',
      'PRANK PAYLOAD — build a pop-up "virus" and deploy it (rung 2, reversible)',
      '  virus                  open the payload builder (pick emoji/message/intensity)',
      '  virus kitty            quick-deploy the classic kitty-spam payload 🐱',
      '  virus stop             kill the spam and clean the phone',
      '',
      'PRANK — the escalation dial (deeper = more heat)',
      '  wallpaper <emoji>      rung1: swap their wallpaper (harmless)',
      '  open-gate              rung3: open the bootloader "gate"',
      '  grab-key               rung4: take the "master key" (root)',
      '  flash <os>             rung5: replace the OS (grapheneos/lineageos/potatoos/stock)',
      '  wipe                   factory-wipe the phone',
      '',
      '  clear                  clear this screen',
      '  reset-heat             reset the heat counter'
    ].join('\n'));

    case 'clear': return out().innerHTML='';
    case 'reset-heat': heat=0; return print('inf','heat reset to 0.');
    case 'ls': return print('', Object.keys(FILES).map(f=>'  '+f).join('\n'));
    case 'cat': {
      if(!a0) return print('err','usage: cat <file.txt>');
      const key=Object.keys(FILES).find(f=>f.toLowerCase()===a0);
      return key?print('',FILES[key]):print('err','no such file: '+a0);
    }

    case 'status': {
      print(EMU.connected?'inf':'wrn', linkBanner());
      return print('', `   OS: ${P.os}\n   gate: ${P.gateOpen?'OPEN':'locked'}\n   master key: ${P.rooted?'held 🗝️':'none'}\n   USB debugging: ${P.usbDebug?'on':'off'}\n   OEM unlock allowed: ${P.oemUnlock?'yes':'no'}\n   heat: ${heat}`);
    }

    case 'scan': {
      if(!needLink()) return;
      return print('inf', `Heistphone 7 · ${P.os}\n   gate ${P.gateOpen?'UNLOCKED ⚠️':'locked'} · key ${P.rooted?'present':'absent'}\n   ${PhoneOS.photosList().length} photos · ${PhoneOS.contactsList().length} contacts · ${PhoneOS.notesList().length} notes`);
    }

    /* ---- PULL ---- */
    case 'pull': {
      if(!needLink()) return;
      window.hood&&window.hood(['hw','kernel','fw','apps'],'the computer reaches in over the USB-debug link — the kernel hands over files it normally walls off');
      if(a0==='photos'){ pulled=PhoneOS.photosList(); savePulled(); addHeat(0,'read-only'); print('inf',`✔ pulled ${pulled.length} photos → open "Pulled Photos" on the desktop.`); return; }
      if(a0==='contacts'){ addHeat(1,'copied personal data',2); return print('', PhoneOS.contactsList().map(c=>'  '+c).join('\n')); }
      if(a0==='notes'){ addHeat(1,'copied personal data',2); return print('', PhoneOS.notesList().map(n=>'  • '+n).join('\n')); }
      return print('err','usage: pull photos|contacts|notes');
    }

    /* ---- PRANK PAYLOAD ---- */
    case 'virus': {
      if(a0==='stop'){ stopVirus(); return print('inf','🧹 payload stopped. the phone is clean again.'); }
      if(!needLink()) return;
      if(a0 && PAYLOAD_PRESETS[a0]){ payload={...PAYLOAD_PRESETS[a0], interval:Math.max(120,Math.round(1000/PAYLOAD_PRESETS[a0].rate)), max:14}; deployVirus(null); return print('inf',`🚀 ${payload.name} deployed — ${payload.emojis.join('')} now spamming the phone. (type 'virus stop' to clean)`); }
      if(a0 && !PAYLOAD_PRESETS[a0]) return print('err',`unknown preset '${a0}'. try: ${Object.keys(PAYLOAD_PRESETS).join(', ')} — or just 'virus' to open the builder.`);
      openApp('virusbuilder'); // no arg → open the GUI builder
      return print('inf','opened the Payload Builder window. pick emojis + message, then Deploy.');
    }

    /* ---- RUNG 2: settings over the channel ---- */
    case 'toggle': {
      if(!needLink()) return;
      const m={wifi:'wifi',bt:'bluetooth',bluetooth:'bluetooth',airplane:'airplane',vpn:'vpn'}[a0];
      if(!m) return print('err','usage: toggle wifi|bt|airplane|vpn');
      const now=PhoneOS.toggle(m); addHeat(1,'changed a setting over the link',2);
      return print('inf',`✔ ${m} is now ${now?'ON':'OFF'} on the phone.`);
    }
    case 'slow-anim': {
      if(!needLink()) return;
      PhoneOS.set('animScale',10); if(window.applyPhoneSkin)applyPhoneSkin(); addHeat(1,'accessibility sabotage',2);
      return print('inf','✔ animations cranked to 10x. everything crawls now.');
    }
    case 'screenreader': {
      if(!needLink()) return;
      const now=PhoneOS.toggle('screenReader'); addHeat(1,'toggled accessibility',2);
      return print('inf',`✔ screen reader ${now?'ON — the phone now narrates every tap':'off'}.`);
    }
    case 'rename': {
      if(!needLink()) return;
      const app=a0, name=args.slice(1).join(' ');
      if(!app||!name) return print('err','usage: rename <app> <new name>   (e.g. rename bank Loans)');
      PhoneOS.renameApp(app,name); addHeat(1,'renamed an app',2);
      return print('inf',`✔ app "${app}" now reads "${name}" on their home screen.`);
    }
    case 'disable': {
      if(!needLink()) return;
      if(!a0) return print('err','usage: disable <app>   (e.g. disable messages)');
      PhoneOS.disableApp(a0); addHeat(1,'hid an app',2);
      return print('inf',`✔ "${a0}" hidden from the home screen.`);
    }
    case 'push-photo': {
      if(!needLink()) return;
      // drop a drawn SVG "photo" from the computer onto the phone (session-only)
      const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200'><rect width='200' height='200' fill='#ffd6e2'/><text x='100' y='120' font-size='90' text-anchor='middle'>😈</text></svg>`;
      PhoneOS.pushPhoto('data:image/svg+xml,'+encodeURIComponent(svg)); addHeat(1,'wrote data onto the phone',2);
      return print('inf','✔ pushed a photo onto the phone. check their Photos app.');
    }

    /* ---- RUNG 1: wallpaper ---- */
    case 'wallpaper': {
      if(!needLink()) return;
      const em=args[0]||'🐱';
      // tile the emoji as an SVG data-URI, over the heist gradient — rung1, fully reversible
      const svg=`<svg xmlns='http://www.w3.org/2000/svg' width='56' height='56'><text x='28' y='40' font-size='34' text-anchor='middle'>${em}</text></svg>`;
      const uri=`url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
      PhoneOS.setWallpaper(`${uri}, linear-gradient(160deg,#ffe3f1,#e3f0ff)`);
      print('inf',`✔ wallpaper swapped to a wall of ${em} on the phone. fully reversible.`);
      print('wrn','   rung 1 — no security boundary crossed. this is the "all gravy" lane.');
      if(window.GAME&&GAME.active())GAME.note(1,0);
      toast&&toast(`🖼️ their wallpaper is now ${em}`);
      return;
    }

    /* ---- RUNG 3: open the gate ---- */
    case 'open-gate': {
      if(!needLink()) return;
      if(P.gateOpen) return print('inf','gate is already open.');
      if(!P.oemUnlock) return print('err','✖ the phone forbids it: "OEM unlocking" is OFF in developer options.\n   locked phones refuse this — that\'s a BLOCKED ending.');
      P.gateOpen=true; EMU.save(); if(window.PhoneOS&&PhoneOS.inFastboot&&PhoneOS.inFastboot())PhoneOS.bootUp&&PhoneOS.bootUp();
      print('wrn','⚠ opening the gate WIPES the phone (that\'s the price of unlocking the bootloader).');
      PhoneOS.wipe();
      addHeat(3,'bootloader unlock is loud & leaves a warning on boot',3);
      window.hood&&window.hood(['hw','kernel'],'the GATE (bootloader) runs BELOW the OS, before the kernel even loads — it stops checking that the kernel is trusted');
      print('inf','✔ gate OPEN. the phone will now warn on every boot. rung 3.');
      window.fixCard&&window.fixCard('gate');
      return;
    }

    /* ---- RUNG 4: grab the master key ---- */
    case 'grab-key': {
      if(!needLink()) return;
      if(!P.gateOpen) return print('err','✖ open the gate first (open-gate). you can\'t own a locked system.');
      if(P.rooted) return print('inf','you already hold the master key 🗝️.');
      P.rooted=true; EMU.save();
      addHeat(2,'root is maximum access = maximum trace',4);
      window.hood&&window.hood(['kernel'],'MASTER KEY = UID 0 in the kernel. you are now the user the kernel\'s walls do not apply to');
      print('inf','✔ master key acquired 🗝️ — you now own the system, not just use it. rung 4.');
      window.fixCard&&window.fixCard('root');
      return;
    }

    /* ---- RUNG 5: flash a new OS ---- */
    case 'flash': {
      if(!needLink()) return;
      if(!P.gateOpen) return print('err','✖ the gate is locked. you can\'t replace a locked phone\'s OS. (BLOCKED)');
      const map={grapheneos:'GrapheneOS',lineageos:'LineageOS',potatoos:'PotatoOS 9000',stock:'Stock OS 14'};
      const os=map[a0];
      if(!os) return print('err','usage: flash grapheneos|lineageos|potatoos|stock');
      print('wrn',`flashing ${os}… ▓▓▓▓▓▓▓▓▓▓ (don\'t unplug)`);
      addHeat(4,'replacing the OS is the deepest, riskiest move',5);
      window.hood&&window.hood(['apps','fw','libs','hal','kernel'],'FLASH replaces the whole OS image — kernel, HAL, framework and apps all swapped for a different build');
      // design-spec: a critical flash can BRICK
      if(a0==='potatoos' && rollCaught()){
        P.os='💀 bricked'; EMU.save();
        return print('err','✖ FLASH FAILED. the phone is a paperweight now. 💀 BRICKED — cautionary tale.');
      }
      P.os=os; P.rooted=(a0!=='stock')?P.rooted:false; if(a0==='stock'){P.gateOpen=false;} EMU.save();
      PhoneOS.bootUp&&PhoneOS.bootUp();
      print('inf',`✔ flashed ${os}. the phone is rebooting into a whole new OS. rung 5.`);
      if(a0!=='stock') window.fixCard&&window.fixCard('flash'); // flashing stock IS the undo — no card for it
      if(rollCaught()) print('err','…but you were noisy. heat caught up with you — CAUGHT. 🚨');
      return;
    }

    /* ---- wipe ---- */
    case 'wipe': {
      if(!needLink()) return;
      PhoneOS.wipe(); addHeat(2,'a wipe is obvious');
      print('inf','✔ phone factory-wiped. messages, notes and tweaks gone.');
      return;
    }

    default:
      return print('err',`unknown command: ${cmd}  (type 'help')`);
  }
}

/* ---------- public API used by index.html ---------- */
window.PcOS = {
  home,
  refresh(){ // link/USB state changed on the phone — reflect it if a view is open
    const t=document.getElementById('t-out'); if(t) print(EMU.connected?'inf':'wrn', linkBanner());
  }
};
/* let the boundary fix-card run a real reverse command (e.g. "flash stock") in the Terminal */
window.runFixCmd = function(raw){
  if(!raw) return;
  terminal();                       // open the Terminal view on the computer so output is visible
  setTimeout(()=>run(raw), 60);     // run after the view mounts
};
})();
