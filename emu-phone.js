/* ===== PHONE OS ===== */
(function(){
const V=()=>document.getElementById('ph-view');
const P=EMU.phone;
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---- data ---- */
const CONTACTS=[
  ['Dylan R.','#ff9d9d','555-0142','the homework thief'],['Mom','#ffc487','555-0101','call her back'],['Priya S.','#b4a7f0','555-0177','lab partner'],
  ['Coach Ben','#8fd99f','555-0133','practice 6am ugh'],['Jess','#8fe0d8','555-0188','roommate'],['Marcus T.','#d4a8ea','555-0155','study group'],
  ['Pizza Place','#ffe08a','555-0199','best wings'],['Aunt Carol','#ffa6c2','555-0122','birthday 3/14'],['Sam K.','#7eb6ff','555-0166','band stuff'],
  ['Dr. Patel','#c0c4cc','555-0111','dentist'],['Lena','#8fd0e0','555-0144','chem notes'],['Grandpa','#d2b48c','555-0100','sunday calls']
];
const PHOTOS=['🌅','🐱','🍕','🏔️','🎸','🐶','🌊','🌮','🚲','🎂','🌸','🦊','🏖️','🍩','🎡','🌙','🐢','🎨','🛹','🍓','🏕️','🦋','🎧','🌵'];
const RINGTONES=['Reflection','Radar','Marimba','Chimes','Opening','Cosmic','Silence (prank)','Air Horn 📢'];
const LANGS=['English','Español','Français','Deutsch','日本語','Pirate 🏴‍☠️','Upside-down ɥsıʅƃuƎ'];
const PBG=['#ffd6e2','#e6d6f5','#d6f0e0','#ffe6cc','#d6e6f5','#f5d6e0'];
const REPLIES=['lol what','who is this??','ok??','stop texting me','😂😂😂','new phone who dis','k','wait what do you mean','are you ok','???','i\'m in class rn','bro'];
let msgs=JSON.parse(localStorage.getItem('emu_msgs')||'{}');
let notes=JSON.parse(localStorage.getItem('emu_notes')||'["buy milk","chem test thurs","password is hunter2 (jk)"]');
const saveM=()=>localStorage.setItem('emu_msgs',JSON.stringify(msgs));
const saveN=()=>localStorage.setItem('emu_notes',JSON.stringify(notes));

const APPS=[
  {id:'messages',n:'Messages',i:'💬',c:'#7eb6ff'},{id:'phone',n:'Phone',i:'📞',c:'#8fd99f'},{id:'camera',n:'Camera',i:'📷',c:'#ffc487'},{id:'photos',n:'Photos',i:'🖼️',c:'#ff9d9d'},
  {id:'contacts',n:'Contacts',i:'👤',c:'#d2b48c'},{id:'notes',n:'Notes',i:'📝',c:'#ffe08a'},{id:'clock',n:'Clock',i:'⏰',c:'#c0c4cc'},{id:'settings',n:'Settings',i:'⚙️',c:'#b4a7f0'},
  {id:'maps',n:'Maps',i:'🗺️',c:'#8fe0d8'},{id:'mail',n:'Mail',i:'📧',c:'#d4a8ea'},{id:'music',n:'Music',i:'🎵',c:'#ffa6c2'},{id:'bank',n:'Bank',i:'🏦',c:'#90ca9f'}
];

/* ---- screen helpers ---- */
function screen(title,bodyHtml,back=home){
  V().innerHTML=`<div class="scr"><div class="scr-head"><button class="back">‹ Back</button><span class="scr-title">${esc(title)}</span></div><div class="scr-body">${bodyHtml}</div></div>`;
  V().querySelector('.back').onclick=back;
  return V().querySelector('.scr-body');
}
function stateLabel(){
  const parts=[P.os, P.gateOpen?'gate OPEN':'locked gate']; if(P.rooted)parts.push('ROOTED 🗝️');
  const el=document.getElementById('ph-state'); if(el) el.textContent=parts.join(', ');
}

/* ---- HOME ---- */
function home(){
  if(!P.on){ V().innerHTML=''; document.getElementById('ph-screen').classList.add('off'); return; }
  document.getElementById('ph-screen').classList.remove('off');
  const now=new Date();
  const vis=APPS.filter(a=>!(P.hiddenApps||[]).includes(a.id));
  const dockIds=['messages','phone','contacts'];
  let dock=dockIds.map(id=>vis.find(a=>a.id===id)).filter(Boolean);
  let main=vis.filter(a=>!dockIds.includes(a.id));
  if(P.iconLayout==='dense'){ P.iconLayout='default'; EMU.save(); }
  if(P.iconLayout==='scrambled'){ main=[...main].sort(()=>Math.random()-0.5); }
  const grid=main.map(a=>appIcon(a)).join('');
  const dockH=dock.map(a=>appIcon(a)).join('');
  V().innerHTML=`<div class="home" style="background:${P.wallpaper};background-size:cover">
    <div class="clock"><div class="t" id="home-t">${fmtClock(now)}</div><div class="d">${now.toLocaleDateString([],{weekday:'long',month:'long',day:'numeric'})}</div></div>
    <div class="grid">${grid}</div><div class="dock">${dockH}</div></div>`;
  V().querySelectorAll('.appi').forEach(el=>el.onclick=()=>open(el.dataset.app));
  stateLabel();
}
function fmtClock(d){return d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',hour12:!P.clock24})}
function appIcon(a){const nm=(P.appNames&&P.appNames[a.id])||a.n;return `<div class="appi" data-app="${a.id}"><div class="ic" style="background:${a.c}">${a.i}</div><div class="nm">${esc(nm)}</div></div>`}
function open(id){ window.hood&&window.hood(['apps','fw'],'launched an app — userspace asks the framework to start it'); (SCREENS[id]||generic)(id); }
function generic(id){const a=APPS.find(x=>x.id===id);window.hood&&window.hood(['apps','fw'],`opened ${a.n} — it asks the framework to draw its window (decorative app, stays in userspace)`);screen(a.n,`<div class="empty">${a.i}<br><br>${a.n} is here but there's nothing to steal.<br><small>(decorative app)</small></div>`)}

/* ---- PHOTOS ---- */
function photos(){
  const ups=EMU.uploads||[];
  const upTiles=ups.map((u,i)=>`<div class="pic" data-up="${i}" style="background:#e6d6f5"><img src="${u}" alt=""></div>`).join('');
  const emoTiles=PHOTOS.map((p,i)=>`<div class="pic" data-i="${i}" style="background:${PBG[i%PBG.length]}">${p}</div>`).join('');
  const b=screen('Photos',`<div class="sect">Recents · ${PHOTOS.length+ups.length} photos</div>
    <div class="pgrid"><div class="pic add" id="up">＋<input type="file" accept="image/*" id="upf" hidden multiple></div>${upTiles}${emoTiles}</div>`);
  b.querySelector('#up').onclick=()=>b.querySelector('#upf').click();
  b.querySelector('#upf').onchange=e=>{
    [...e.target.files].forEach(f=>{const r=new FileReader();r.onload=ev=>{EMU.uploads.push(ev.target.result);photos()};r.readAsDataURL(f)});
    window.hood&&window.hood(['apps','fw','kernel','hw'],'importing a photo: the app reads the file through the framework → kernel → storage');
    toast('🖼️ Added (this session only — wiped on reset)');
  };
  b.querySelectorAll('.pic[data-i]').forEach(el=>el.onclick=()=>viewPhoto(+el.dataset.i));
  b.querySelectorAll('.pic[data-up]').forEach(el=>el.onclick=()=>viewUpload(+el.dataset.up));
}
function viewUpload(i){
  const u=EMU.uploads[i];
  V().innerHTML=`<div class="pic-full"><div class="scr-head"><button class="back">‹ Back</button><span class="scr-title">Uploaded ${i+1}</span></div><div class="big"><img src="${u}" alt=""></div><div class="cap">your photo · session-only <button class="btn-p o" style="margin-left:8px" id="setwp">Set as wallpaper</button></div></div>`;
  V().querySelector('.back').onclick=photos;
  V().querySelector('#setwp').onclick=()=>{PhoneOS.setWallpaper(`center/cover url("${u}")`);toast('🖼️ Wallpaper set to your photo')};
}
function viewPhoto(i){
  window.hood&&window.hood(['apps','fw','kernel','hw'],'opening a photo: the gallery app reads the image file from storage via the kernel');
  V().innerHTML=`<div class="pic-full"><div class="scr-head"><button class="back">‹ Back</button><span class="scr-title">Photo ${i+1} of ${PHOTOS.length}</span></div><div class="big" style="background:${PBG[i%PBG.length]}">${PHOTOS[i]}</div><div class="cap">IMG_${1000+i}.jpg · swipe ‹ › <button class="btn-p o" style="margin-left:8px" id="setwp">Set as wallpaper</button></div></div>`;
  V().querySelector('.back').onclick=photos;
  V().querySelector('#setwp').onclick=()=>{P.wallpaper=`linear-gradient(160deg,${PBG[i%PBG.length]},#e3f0ff)`;EMU.save();window.hood&&window.hood(['fw'],'setting wallpaper: a framework display setting — cosmetic');toast('🖼️ Wallpaper changed');};
  let sx=null; const el=V().querySelector('.big');
  el.onmousedown=e=>sx=e.clientX; el.onmouseup=e=>{if(sx==null)return;const dx=e.clientX-sx;sx=null;if(dx<-30&&i<PHOTOS.length-1)viewPhoto(i+1);else if(dx>30&&i>0)viewPhoto(i-1)};
  el.onclick=e=>{ if(e.offsetX>el.clientWidth/2){ if(i<PHOTOS.length-1)viewPhoto(i+1) } else if(i>0)viewPhoto(i-1) };
}

/* ---- CONTACTS ---- */
function contacts(){
  const b=screen('Contacts',`<div class="sect">${CONTACTS.length} contacts</div>`+CONTACTS.map((c,i)=>`<div class="row" data-i="${i}"><div class="av" style="background:${c[1]}">${c[0][0]}</div><div><div class="t1">${c[0]}</div><div class="t2">${c[2]}</div></div><span class="rt">›</span></div>`).join(''));
  b.querySelectorAll('.row').forEach(el=>el.onclick=()=>contact(+el.dataset.i));
}
function contact(i){
  const c=CONTACTS[i];
  const b=screen(c[0],`<div style="text-align:center;padding:14px"><div class="av" style="background:${c[1]};width:64px;height:64px;font-size:1.6rem;margin:0 auto 8px">${c[0][0]}</div><div style="font-weight:700;font-size:1rem">${c[0]}</div><div class="t2">${c[2]}</div><div class="t2" style="margin-top:4px">📝 ${c[3]}</div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:14px"><button class="btn-p" id="c-msg">💬 Message</button><button class="btn-p o" id="c-call">📞 Call</button></div></div>`,contacts);
  b.querySelector('#c-msg').onclick=()=>{window.hood&&window.hood(['apps','fw'],'opening a conversation in the messaging app (userspace)');thread(i)}; b.querySelector('#c-call').onclick=()=>calling(i);
}
function calling(i){const c=CONTACTS[i];window.hood&&window.hood(['apps','fw','hal','kernel','hw'],'phone call: app → framework → HAL → kernel → the cellular radio');screen('Phone',`<div class="empty" style="padding-top:60px"><div class="av" style="background:${c[1]};width:70px;height:70px;font-size:1.8rem;margin:0 auto 10px">${c[0][0]}</div><div style="font-size:1rem;font-weight:700;color:#fff">${c[0]}</div><div id="callt">calling…</div><br><button class="btn-p r" id="hang">📵 End</button></div>`,home);V().querySelector('#hang').onclick=home;setTimeout(()=>{const t=V().querySelector('#callt');if(t)t.textContent='no answer. (they never pick up.)'},2500)}

/* ---- MESSAGES ---- */
function messages(){
  const ids=Object.keys(msgs).map(Number); const list=CONTACTS.map((c,i)=>({c,i,last:(msgs[i]||[]).slice(-1)[0]})).filter(x=>x.last).sort((a,b)=>b.last.t-a.last.t);
  const b=screen('Messages',`<div style="padding:4px 8px"><button class="btn-p" id="newmsg">✏️ Text someone random</button></div>`+(list.length?list.map(x=>`<div class="row" data-i="${x.i}"><div class="av" style="background:${x.c[1]}">${x.c[0][0]}</div><div><div class="t1">${x.c[0]}</div><div class="t2">${esc(x.last.text).slice(0,34)}</div></div></div>`).join(''):`<div class="empty">No conversations yet.<br>Text someone to start chaos.</div>`));
  b.querySelector('#newmsg').onclick=()=>{window.hood&&window.hood(['apps','fw'],'starting a new conversation (userspace)');thread(Math.floor(Math.random()*CONTACTS.length))};
  b.querySelectorAll('.row').forEach(el=>el.onclick=()=>thread(+el.dataset.i));
}
function thread(i){
  const c=CONTACTS[i]; msgs[i]=msgs[i]||[];
  V().innerHTML=`<div class="scr"><div class="scr-head"><span class="back">‹</span><div class="av" style="background:${c[1]};width:24px;height:24px;font-size:.7rem">${c[0][0]}</div>${c[0]}</div><div class="scr-body bubbles" id="bub"></div><div class="compose"><input id="mi" placeholder="iMessage… (enter to send)"><button class="btn-p" id="ms">↑</button></div></div>`;
  V().querySelector('.back').onclick=messages;
  const render=()=>{const bb=V().querySelector('#bub');bb.innerHTML=msgs[i].map(m=>`<div class="bub ${m.me?'me':'them'}">${esc(m.text)}</div>`).join('')||'<div class="empty">Say something.</div>';bb.scrollTop=1e6};
  const send=()=>{const inp=V().querySelector('#mi');const t=inp.value.trim();if(!t)return;msgs[i].push({me:true,text:t,t:Date.now()});inp.value='';saveM();render();window.hood&&window.hood(['apps','fw','hal','kernel','hw'],'send text: app → framework → HAL → kernel → the radio chip');
    setTimeout(()=>{msgs[i].push({me:false,text:REPLIES[Math.floor(Math.random()*REPLIES.length)],t:Date.now()});saveM();if(V().querySelector('#bub'))render();toast(`💬 ${c[0]} replied`)},1200+Math.random()*1500)};
  V().querySelector('#ms').onclick=send; V().querySelector('#mi').onkeydown=e=>{if(e.key==='Enter')send()};
  render(); V().querySelector('#mi').focus();
}

/* ---- NOTES ---- */
function notesApp(){
  const b=screen('Notes',`<div style="padding:4px 8px"><button class="btn-p" id="addn">+ New note</button></div>`+notes.map((n,i)=>`<div class="row"><span>📝</span><div class="t1" style="flex:1">${esc(n)}</div><span class="rt" data-i="${i}" style="color:#e0556f;cursor:pointer">✕</span></div>`).join(''));
  b.querySelector('#addn').onclick=()=>{const t=prompt('Note:');if(t){notes.push(t);saveN();window.hood&&window.hood(['apps','fw','kernel','hw'],'saving a note: the app writes through the framework → kernel → storage');notesApp()}};
  b.querySelectorAll('.rt').forEach(el=>el.onclick=()=>{notes.splice(+el.dataset.i,1);saveN();window.hood&&window.hood(['apps','fw','kernel','hw'],'deleting a note: app → framework → kernel erases it from storage');notesApp()});
}

/* ---- CAMERA ---- */
function camera(){
  const b=screen('Camera',`<div style="height:230px;background:linear-gradient(135deg,#223,#445);border-radius:12px;display:grid;place-items:center;font-size:3rem" id="vf">🫥</div><div style="text-align:center;padding:14px"><button class="btn-p o" id="snap" style="width:56px;height:56px;border-radius:50%;font-size:1.3rem">⚪</button></div>`);
  b.querySelector('#snap').onclick=()=>{const e=['🤳','😬','🙃','🫠','👀'][Math.floor(Math.random()*5)];PHOTOS.unshift(e);b.querySelector('#vf').textContent=e;toast('📷 Saved to Photos');window.hood&&window.hood(['apps','fw','hal','kernel','hw'],'Camera: app → framework → HAL → kernel → the camera chip, and back')};
}

/* ---- CLOCK ---- */
function clockApp(){screen('Clock',`<div class="empty" style="padding-top:40px"><div style="font-size:2.6rem;font-weight:300;color:#fff" id="ck-t"></div><div id="ck-d"></div><br><div class="sect">Alarms</div><div class="row"><div><div class="t1">6:00 AM</div><div class="t2">practice (coach ben)</div></div><div class="sw on"></div></div><div class="row"><div><div class="t1">7:30 AM</div><div class="t2">weekdays</div></div><div class="sw on"></div></div></div>`);V().querySelectorAll('.sw').forEach(s=>s.onclick=()=>{s.classList.toggle('on');window.hood&&window.hood(['apps','fw'],'toggling an alarm: the clock app stores it via the framework')});tickClock()}
function tickClock(){const t=V().querySelector('#ck-t');if(!t)return;const n=new Date();t.textContent=n.toLocaleTimeString();V().querySelector('#ck-d').textContent=n.toDateString()}

/* ---- SETTINGS ---- */
function settings(){
  const b=screen('Settings',`
    <div class="sect">Personalization</div>
    <div class="row" id="s-wp"><span>🖼️</span><div><div class="t1">Wallpaper</div><div class="t2">pick from Photos</div></div><span class="rt">›</span></div>
    <div class="row" id="s-ring"><span>🔔</span><div><div class="t1">Ringtone</div><div class="t2">${esc(P.ringtone)}</div></div><span class="rt">›</span></div>
    <div class="row" id="s-disp"><span>🎨</span><div><div class="t1">Display &amp; theme</div><div class="t2">${P.theme} · ${P.contrast} · ${Math.round(P.fontScale*100)}% text</div></div><span class="rt">›</span></div>
    <div class="row" id="s-lay"><span>📐</span><div><div class="t1">Home layout</div><div class="t2">${P.iconLayout}</div></div><span class="rt">›</span></div>
    <div class="row" id="s-lang"><span>🌐</span><div><div class="t1">Language</div><div class="t2">${esc(P.lang)}</div></div><span class="rt">›</span></div>
    <div class="row"><span>🕐</span><div><div class="t1">24-hour clock</div><div class="t2">${P.clock24?'on':'off'}</div></div><div class="sw ${P.clock24?'on':''}" id="s-24"></div></div>
    <div class="sect">Device</div>
    <div class="row" id="s-about"><span>ℹ️</span><div><div class="t1">About phone</div><div class="t2">${esc(P.os)} · tap for details</div></div><span class="rt">›</span></div>
    <div class="row"><span>🔋</span><div><div class="t1">Battery</div><div class="t2">${P.battery}% · fake drain</div></div></div>
    <div class="sect">System</div>
    <div class="row"><span>📶</span><div><div class="t1">Network</div><div class="t2">Wi-Fi: ${P.wifi?'HomeNet-5G':'off'}${P.airplane?' · ✈️ airplane':''}${P.vpn?' · 🔒 VPN':''}</div></div></div>
    ${P.devOptions?`<div class="row" id="s-dev"><span>🛠️</span><div><div class="t1">Developer options</div><div class="t2">the hidden menu</div></div><span class="rt">›</span></div>`:''}
    <div class="row"><span>🔒</span><div><div class="t1">Security</div><div class="t2">screen lock: none (they're trusting)</div></div></div>`);
  b.querySelector('#s-wp').onclick=photos;
  b.querySelector('#s-ring').onclick=ringtonePick;
  b.querySelector('#s-disp').onclick=displaySettings;
  b.querySelector('#s-lay').onclick=layoutPick;
  b.querySelector('#s-lang').onclick=langPick;
  b.querySelector('#s-24').onclick=e=>{P.clock24=!P.clock24;e.target.classList.toggle('on',P.clock24);EMU.save();window.hood&&window.hood(['fw'],'24-hour clock is a framework time-format setting');settings()};
  b.querySelector('#s-about').onclick=about;
  const d=b.querySelector('#s-dev'); if(d)d.onclick=devOptions;
}
function pickScreen(title,opts,current,onPick,note){
  const b=screen(title,(note?`<div class="t2" style="padding:4px 8px 8px">${note}</div>`:'')+opts.map(o=>`<div class="opt ${o===current?'sel':''}" data-v="${esc(o)}">${esc(o)}<span class="ck">✓</span></div>`).join(''),settings);
  b.querySelectorAll('.opt').forEach(el=>el.onclick=()=>onPick(el.dataset.v));
}
function ringtonePick(){pickScreen('Ringtone',RINGTONES,P.ringtone,v=>{P.ringtone=v;EMU.save();window.hood&&window.hood(['fw'],'ringtone is a framework sound setting — cosmetic, no boundary crossed');toast(v.includes('Silence')?'🔕 muted them':v.includes('Horn')?'📢 good luck to them':'🔔 '+v);ringtonePick()})}
function langPick(){pickScreen('Language',LANGS,P.lang,v=>{P.lang=v;EMU.save();window.hood&&window.hood(['fw','libs'],'language is a framework locale setting — the UI libs re-render in the new language');toast('🌐 Language → '+v+' (classic prank)');langPick()},'Flip it to something they can\'t read. Harmless, maddening.')}
function layoutPick(){pickScreen('Home layout',['default','scrambled'],P.iconLayout,v=>{P.iconLayout=v;EMU.save();window.hood&&window.hood(['apps','fw'],'home layout is the launcher app rearranging icons — pure userspace');toast('📐 Layout → '+v);layoutPick()},'Scrambled rearranges their icons every time they open the home screen.')}
function displaySettings(){
  const b=screen('Display & theme',`
    <div class="sect">Theme</div>
    ${['dark','light'].map(t=>`<div class="opt ${P.theme===t?'sel':''}" data-th="${t}">${t==='dark'?'🌙 Dark':'☀️ Light'}<span class="ck">✓</span></div>`).join('')}
    <div class="sect">Contrast / color</div>
    ${[['normal','Normal'],['grayscale','Grayscale'],['high','High contrast'],['invert','Inverted colors']].map(([v,n])=>`<div class="opt ${P.contrast===v?'sel':''}" data-ct="${v}">${esc(n)}<span class="ck">✓</span></div>`).join('')}
    <div class="sect">Text size — ${Math.round(P.fontScale*100)}%</div>
    <div class="row"><input type="range" min="0.7" max="1.6" step="0.1" value="${P.fontScale}" id="fs" style="flex:1"></div>`,settings);
  b.querySelectorAll('[data-th]').forEach(el=>el.onclick=()=>{P.theme=el.dataset.th;EMU.save();applyPhoneSkin();window.hood&&window.hood(['fw','libs'],'theme/display is a framework setting rendered by the graphics libs — cosmetic');displaySettings()});
  b.querySelectorAll('[data-ct]').forEach(el=>el.onclick=()=>{P.contrast=el.dataset.ct;EMU.save();applyPhoneSkin();window.hood&&window.hood(['fw','libs'],'contrast/color is a framework accessibility setting applied by the graphics libs');displaySettings()});
  b.querySelector('#fs').oninput=e=>{P.fontScale=+e.target.value;EMU.save();applyPhoneSkin();window.hood&&window.hood(['fw','libs'],'text size is a framework display setting rendered by the graphics libs');b.querySelector('.sect:last-of-type')&&(b.querySelectorAll('.sect')[2].textContent='Text size — '+Math.round(P.fontScale*100)+'%')};
}
function about(){
  const b=screen('About phone',`
    <div class="row"><div><div class="t1">Model</div><div class="t2">Heistphone 7</div></div></div>
    <div class="row"><div><div class="t1">OS</div><div class="t2">${esc(P.os)}</div></div></div>
    <div class="row"><div><div class="t1">Gate (bootloader)</div><div class="t2">${P.gateOpen?'UNLOCKED ⚠️':'locked'}</div></div></div>
    <div class="row"><div><div class="t1">Master key (root)</div><div class="t2">${P.rooted?'present 🗝️':'absent'}</div></div></div>
    <div class="row" id="build"><div><div class="t1">Build number</div><div class="t2">HP7.2026.10.12 · <i>tap me</i></div></div></div>`,settings);
  b.querySelector('#build').onclick=()=>{
    if(P.devOptions){toast('You\'re already a developer.');return}
    P.buildTaps++; const left=7-P.buildTaps;
    window.hood&&window.hood(['apps','fw'],'tapping Build number flips a flag the framework stores — pure userspace, no kernel involved');
    if(left>0) toast(`${left} more tap${left>1?'s':''}…`); else {P.devOptions=true;EMU.save();toast('🛠️ You are now a developer!');settings()}
  };
}
function devOptions(){
  const b=screen('Developer options',`
    <div class="sect">Debugging</div>
    <div class="row"><div><div class="t1">USB debugging</div><div class="t2">let a computer command this phone</div></div><div class="sw ${P.usbDebug?'on':''}" id="d-usb"></div></div>
    <div class="sect">Danger zone</div>
    <div class="row"><div><div class="t1">OEM unlocking</div><div class="t2">allow the gate to be opened later</div></div><div class="sw ${P.oemUnlock?'on':''}" id="d-oem"></div></div>
    <div class="sect">Boot</div>
    <div class="row" id="d-fast"><span>🚧</span><div><div class="t1">Reboot to gate mode</div><div class="t2">the low-level mode before the OS loads</div></div></div>`,settings);
  b.querySelector('#d-usb').onclick=e=>{P.usbDebug=!P.usbDebug;e.target.classList.toggle('on',P.usbDebug);EMU.save();toast(P.usbDebug?'🔌 USB debugging on':'USB debugging off');window.hood&&window.hood(['hw','kernel','fw'],'USB debugging opens a kernel-mediated channel so a computer can issue commands over the cable');if(P.usbDebug&&window.fixCard)window.fixCard('usb');if(window.PcOS)PcOS.refresh()};
  b.querySelector('#d-oem').onclick=e=>{P.oemUnlock=!P.oemUnlock;e.target.classList.toggle('on',P.oemUnlock);EMU.save();toast(P.oemUnlock?'⚠️ OEM unlocking allowed':'OEM unlocking off');window.hood&&window.hood(['fw'],'OEM-unlock is just a consent flag — it only lets the GATE (below the OS) be opened later');if(P.oemUnlock&&window.fixCard)window.fixCard('oem')};
  b.querySelector('#d-fast').onclick=fastboot;
}

/* ---- BANK (balks at root — teaches why root is detectable) ---- */
function bankApp(){
  if(P.rooted){
    window.hood&&window.hood(['apps','fw','kernel'],'Bank asked the kernel "is anything running as UID 0?" — yes → refuse to run');
    screen('Bank',`<div class="bank"><div style="font-size:2.4rem">🏦</div><div class="locked">⚠ This device appears to be rooted.</div><div class="t2" style="margin-top:8px">For your security, Bank won't run on a device with the master key present. (Real banking apps do exactly this — root tripping is detectable.)</div></div>`);
    return;
  }
  screen('Bank',`<div class="bank"><div style="font-size:2rem">🏦 HeistBank</div><div class="t2">Checking ••4417</div><div class="bal">$${P.bankBalance.toFixed(2)}</div>
    <div class="acct"><div class="row"><span>Coffee Hut</span><span style="color:#e0556f">-$5.40</span></div><div class="row"><span>Paycheck</span><span style="color:#2fae5f">+$820.00</span></div><div class="row"><span>Streaming</span><span style="color:#e0556f">-$15.99</span></div></div></div>`);
}
/* ---- MAPS ---- */
function mapsApp(){
  screen('Maps',`<div class="map"><div class="pin" style="left:46%;top:52%">📍</div><div class="pin" style="left:70%;top:30%">🏫</div><div class="pin" style="left:28%;top:66%">🍕</div><div class="youare">📍 You are here · <b>Dylan's house</b> · 2 min from school</div></div>`);
}
/* ---- MUSIC ---- */
function musicApp(){
  let playing=false;
  const b=screen('Music',`<div class="music"><div class="cover">🎵</div><div class="t1">Lo-fi beats to prank to</div><div class="t2">various artists</div><div class="prog"><i></i></div><div class="ctl"><span>⏮️</span><span id="pp">▶️</span><span>⏭️</span></div><div class="t2" style="margin-top:10px">ringtone: ${esc(P.ringtone)}</div></div>`);
  b.querySelector('#pp').onclick=e=>{playing=!playing;e.target.textContent=playing?'⏸️':'▶️';window.hood&&window.hood(['apps','fw','hal','kernel','hw'],'play audio: app → framework → HAL → kernel → the speaker');toast(playing?'🎵 playing':'⏸️ paused')};
}
/* ---- PRANK PAYLOAD: pop-up spam engine ---- */
let spamT=null, spamCfg=null;
function spawnPop(){
  const box=document.getElementById('ph-popups'); if(!box||!spamCfg)return;
  const emo=spamCfg.emojis[Math.floor(Math.random()*spamCfg.emojis.length)];
  const el=document.createElement('div');
  el.className='vpop'+(spamCfg.bounce?' bounce':'');
  el.innerHTML=`<span class="big">${emo}</span><span class="msg">${esc(spamCfg.msg)}</span><span class="vx">✕</span>`;
  const w=box.clientWidth||230, h=box.clientHeight||440;
  el.style.left=Math.random()*Math.max(10,w-150)+'px';
  el.style.top=(28+Math.random()*Math.max(10,h-120))+'px';
  el.querySelector('.vx').onclick=()=>{el.remove(); if(spamCfg&&spamCfg.multiply){spawnPop();spawnPop();}};
  box.appendChild(el);
  const live=box.querySelectorAll('.vpop'); if(live.length>spamCfg.max) live[0].remove();
}
function startSpam(cfg){
  stopSpam(); spamCfg=cfg;
  window.hood&&window.hood(['apps','fw'],'the "virus" is just an app drawing overlays via the framework — it never touches the kernel or your data');
  const box=document.getElementById('ph-popups');
  if(box){const b=document.createElement('div');b.className='vbanner';b.textContent=`⚠ ${cfg.name} ⚠`;box.appendChild(b)}
  const burst=Math.max(1, Math.round((cfg.rate||4)/4));
  spamT=setInterval(()=>{ for(let i=0;i<burst;i++) spawnPop(); }, cfg.interval||700);
  for(let i=0;i<3;i++) spawnPop();
}
function stopSpam(){ if(spamT){clearInterval(spamT);spamT=null} spamCfg=null; const box=document.getElementById('ph-popups'); if(box)box.innerHTML=''; }

function powerMenu(){
  if(!P.on){bootUp();return}
  V().innerHTML=`<div class="pwr"><button class="btn-p o" id="p-off">⏻ Power off</button><button class="btn-p o" id="p-re">🔄 Restart</button><button class="btn-p o" id="p-fast">🚧 Gate mode</button><button class="btn-p" id="p-x">Cancel</button></div>`;
  V().querySelector('#p-off').onclick=()=>{P.on=false;EMU.save();window.hood&&window.hood(['apps','fw','libs','hal','kernel','hw'],'power off: the kernel tears down the whole stack and halts the hardware');home();toast('📱 Phone off')};
  V().querySelector('#p-re').onclick=bootUp; V().querySelector('#p-fast').onclick=fastboot; V().querySelector('#p-x').onclick=home;
}
function bootUp(){
  P.on=true;EMU.save();document.getElementById('ph-screen').classList.remove('off');
  window.hood&&window.hood(['hw','kernel','hal','libs','fw','apps'],'BOOT: hardware powers on → kernel loads → HAL → runtime → framework → apps. the whole stack comes up bottom-first');
  V().innerHTML=`<div class="boot"><div class="logo">${P.os.includes('Graphene')?'🛡️':P.os.includes('Lineage')?'🧱':'📱'}</div><div style="font-size:.7rem">${esc(P.os)}</div>${P.gateOpen?'<div style="color:#d99a1a;font-size:.62rem">⚠️ bootloader unlocked — can\'t verify integrity</div>':''}<div class="bar"><i id="bb"></i></div></div>`;
  requestAnimationFrame(()=>{V().querySelector('#bb').style.width='100%'}); setTimeout(home,2400);
}
function fastboot(){
  P.mode='fastboot';
  window.hood&&window.hood(['hw','kernel'],'GATE MODE runs below the OS — the bootloader is talking, the kernel and everything above it are NOT loaded yet');
  V().innerHTML=`<div class="fast">GATE MODE (bootloader)<br>product: heistphone7<br>os: ${esc(P.os)}<br>gate: <span class="${P.gateOpen?'':'warn'}">${P.gateOpen?'UNLOCKED':'LOCKED'}</span><br>oem-unlock allowed: ${P.oemUnlock?'yes':'<span class="warn">no</span>'}<br>usb link: ${EMU.connected?'present':'<span class="warn">none</span>'}<br><br>▸ waiting for commands from a computer…<br><br><span class="warn">[power button] = exit to OS</span></div>`;
  if(window.PcOS)PcOS.refresh();
}
window.PhoneOS={
  home, tick(now){const t=V().querySelector('#home-t');if(t)t.textContent=now.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});tickClock()},
  bootUp, inFastboot:()=>P.mode==='fastboot', leaveFastboot:()=>{P.mode=null},
  /* called by the computer */
  wipe(){stopSpam();window.hood&&window.hood(['kernel','hw'],'factory wipe: the kernel erases the userdata partition on storage');msgs={};saveM();notes=['(wiped)'];saveN();P.wallpaper='linear-gradient(160deg,#ffe3f1,#e3f0ff)';P.devOptions=false;P.usbDebug=false;P.buildTaps=0;P.theme='dark';P.contrast='normal';P.fontScale=1;P.iconLayout='default';P.lang='English';P.appNames={};P.hiddenApps=[];P.ringtone='Reflection';EMU.uploads=[];if(window.applyPhoneSkin)applyPhoneSkin();EMU.save()},
  photosList:()=>PHOTOS.slice(), contactsList:()=>CONTACTS.map(c=>c[0]+' '+c[2]), notesList:()=>notes.slice(),
  setWallpaper(css){P.wallpaper=css;EMU.save();window.hood&&window.hood(['fw'],'wallpaper is a framework display setting — cosmetic, no boundary crossed');if(window.GAME&&GAME.active())GAME.note(1,0);if(V().querySelector('.home'))home()},
  /* rung-2: settings-channel operations driven remotely by the computer */
  refresh(){ if(V().querySelector('.home'))home(); const b=document.querySelector('.phone-body'); if(b){b.classList.add('remote');setTimeout(()=>b.classList.remove('remote'),800)} },
  pushPhoto(dataUri){ EMU.uploads.push(dataUri); window.hood&&window.hood(['hw','kernel','fw','apps'],'computer writes a file onto the phone over the link → kernel → storage'); if(V().querySelector('.pgrid'))photos(); },
  toggle(key){ P[key]=!P[key]; EMU.save(); window.hood&&window.hood(['hw','kernel','fw'],'computer flips a setting over the debug link → kernel → framework applies it'); this.refresh(); return P[key]; },
  set(key,val){ P[key]=val; EMU.save(); window.hood&&window.hood(['hw','kernel','fw'],'computer writes a setting over the link → kernel → framework'); this.refresh(); },
  disableApp(id){ if(!P.hiddenApps.includes(id)){P.hiddenApps.push(id);EMU.save();window.hood&&window.hood(['hw','kernel','fw','apps'],'computer tells the framework over the link to hide an app');this.refresh()} },
  renameApp(id,name){ P.appNames[id]=name; EMU.save(); window.hood&&window.hood(['hw','kernel','fw','apps'],'computer renames an app via the framework over the link'); this.refresh(); },
  startSpam(cfg){ startSpam(cfg); }, stopSpam(){ stopSpam(); }, spamLive:()=>!!spamT,
  state:()=>P
};
const SCREENS={photos,contacts,messages,settings,notes:notesApp,camera,clock:clockApp,phone:contacts,bank:bankApp,maps:mapsApp,music:musicApp};

/* ---- hardware buttons ---- */
document.getElementById('ph-home').onclick=()=>{if(P.mode==='fastboot')return;home()};
document.getElementById('btn-power').onclick=()=>{if(P.mode==='fastboot'){P.mode=null;bootUp();return}powerMenu()};
home();
})();
