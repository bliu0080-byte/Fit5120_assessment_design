// Inbox Clean-Up – drag-drop with success/fail effects (data-driven capable)
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const list = $('.mail-list');
  const bin = $('.bin');
  const binList = $('.bin-list');
  const overlay = $('.result-overlay');
  const confettiCanvas = $('#confetti');
  const submitBtn = $('#submitBtn');
  const returnBtn = $('#returnBtn');

  // State (updated after rendering)
  let mails = [];
  let allData = [];
  const ROUND_SIZE = 6;

  // Helpers
  const normalizeType = (t) => (t === 'normal' || t === 'safe') ? 'safe' : 'scam';

  function initMailItems(){
    // Rebuild state from DOM and attach drag events
    mails = $$('.mail').map(el => ({ id: el.id, type: el.dataset.type, el, inBin: el.parentElement === binList }));
    $$('.mail').forEach(el => {
      el.setAttribute('draggable', 'true');
      el.addEventListener('dragstart', (e)=>{
        e.dataTransfer.setData('text/plain', el.id);
        el.classList.add('dragging');
      });
      el.addEventListener('dragend', ()=> el.classList.remove('dragging'));
    });
  }

  function renderFromData(items){
    if(!Array.isArray(items) || !list) return;
    list.innerHTML = '';
    if (binList) binList.innerHTML = '';
    items.forEach((it, idx)=>{
      const id = it.id || `m${idx+1}`;
      const type = normalizeType(it.type);
      const emoji = it.emoji || '';
      const text = it.text || '';
      const aria = it.aria || `${type==='scam'?'Suspicious':'Normal'} email`;
      const wrapper = document.createElement('div');
      wrapper.className = 'mail';
      wrapper.id = id;
      wrapper.dataset.type = type;
      wrapper.setAttribute('role','listitem');
      wrapper.setAttribute('aria-label', aria);
      wrapper.innerHTML = `
        <div class="mail-label"><span>${emoji}</span><span class="mail-text">${text}</span></div>
        <div class="drag-tag">Drag</div>
      `;
      list.appendChild(wrapper);
    });
    initMailItems();
  }

  function clearResultMarks(){
    $$('.mail .result-icon').forEach(el=> el.remove());
    $$('.mail').forEach(el=>{ el.classList.remove('correct','incorrect'); });
  }

  function randomSample(arr, n){
    const a = arr.slice();
    for(let i=a.length-1;i>0;i--){
      const j = Math.floor(Math.random()*(i+1));
      [a[i],a[j]] = [a[j],a[i]];
    }
    return a.slice(0, Math.min(n, a.length));
  }

  function startRound(){
    clearResultMarks();
    if (binList) binList.innerHTML = '';
    if(Array.isArray(allData) && allData.length){
      const sample = randomSample(allData, ROUND_SIZE);
      renderFromData(sample);
    } else {
      // Fallback: use existing DOM, just re-init
      initMailItems();
    }
  }

  // Drag target highlighting and handlers for both containers (bin and list)
  function allow(e){ e.preventDefault(); }
  // Bin hover
  ['dragenter','dragover'].forEach(evt => bin?.addEventListener(evt, (e)=>{ allow(e); bin.classList.add('highlight'); }));
  ;['dragleave','drop'].forEach(evt => bin?.addEventListener(evt, ()=> bin.classList.remove('highlight')));
  // List hover
  ['dragenter','dragover'].forEach(evt => list?.addEventListener(evt, (e)=>{ allow(e); list.classList.add('highlight'); }));
  ;['dragleave','drop'].forEach(evt => list?.addEventListener(evt, ()=> list.classList.remove('highlight')));

  // Drop into bin: move element into bin-list
  bin?.addEventListener('drop', (e)=>{
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = mails.find(m => m.id === id);
    if(!item) return;
    const rect = bin.getBoundingClientRect();
    spawnPoofs(rect.left + rect.width/2, rect.top + rect.height/2, 10);
    if(item.el.parentElement !== binList){
      binList?.appendChild(item.el);
      item.inBin = true;
    }
  });

  // Drop back to list (take out from bin)
  list?.addEventListener('drop', (e)=>{
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = mails.find(m => m.id === id);
    if(!item) return;
    if(item.el.parentElement !== list){
      list.appendChild(item.el);
      item.inBin = false;
    }
  });

  // Submit evaluation: reveal per-item correctness and show result
  submitBtn?.addEventListener('click', ()=>{
    clearResultMarks();
    let allCorrect = true;
    mails.forEach(m => {
      const shouldBeInBin = (m.type === 'scam');
      const correct = (m.inBin === shouldBeInBin);
      allCorrect = allCorrect && correct;
      const icon = document.createElement('span');
      icon.className = 'result-icon';
      icon.textContent = correct ? '✔' : '✖';
      icon.setAttribute('aria-hidden','true');
      icon.style.marginLeft = '8px';
      icon.style.fontWeight = '700';
      icon.style.color = correct ? '#16a34a' : '#ef4444';
      m.el.querySelector('.mail-label')?.appendChild(icon);
      m.el.classList.add(correct ? 'correct' : 'incorrect');
      if(!correct){ m.el.classList.add('shake'); setTimeout(()=> m.el.classList.remove('shake'), 450); }
    });
    showResult(allCorrect);
  });

  returnBtn?.addEventListener('click', ()=>{ window.location.href = 'play.html'; });

  // Play again: reshuffle a new round
  document.getElementById('playAgainBtn')?.addEventListener('click', (e)=>{
    e.stopPropagation();
    overlay?.classList.remove('show');
    startRound();
  });

  // Try to load JSON data, fallback to inline HTML
  (async function bootstrap(){
    // Preferred then fallbacks to support current placement
    const candidates = [
      './assets/data/games/inbox.json',
      './assets/data/games/scam_quiz_30.json',
      './js/games/scam_quiz_30.json'
    ];
    let loaded = false;
    for(const url of candidates){
      try{
        const res = await fetch(url, { cache: 'no-store' });
        if(!res.ok) continue;
        const data = await res.json();
        if(Array.isArray(data) && data.length){
          // Normalize and keep for rounds
          allData = data.map(d=>({
            id: d.id,
            text: d.text,
            type: normalizeType(d.type),
            emoji: d.emoji,
            aria: d.aria
          }));
          startRound();
          loaded = true;
          break;
        }
      }catch(err){ /* ignore and try next */ }
    }
    if(!loaded){
      // Use existing markup
      initMailItems();
    }
  })();

  // Result overlay
  function showResult(success){
    const card = $('.result-card');
    card.classList.toggle('success', success);
    card.classList.toggle('fail', !success);
    $('.result-title').textContent = success ? 'Congrats! 🎉' : 'Boom! Scammer wins 💥';
    $('.result-sub').textContent = success ? 'All suspicious emails were correctly trashed.' : 'Some emails were misfiled. Red ✖ show mistakes.';
    overlay.classList.add('show');
    if(success) runConfetti(); else runBoom();
  }

  // Click overlay to retry or close
  overlay?.addEventListener('click', ()=>{
    overlay.classList.remove('show');
    stopConfetti();
  });

  // Fancy effects
  function spawnPoofs(x,y,count){
    const root = document.body;
    for(let i=0;i<count;i++){
      const p = document.createElement('div');
      p.className='poof';
      p.style.left = (x + (Math.random()*30-15))+'px';
      p.style.top = (y + (Math.random()*30-15))+'px';
      p.style.setProperty('--dx', (Math.random()*140-70)+'px');
      p.style.setProperty('--dy', (Math.random()*-100)+'px');
      p.style.background = ['#f97316','#fb923c','#f59e0b','#60a5fa'][i%4];
      root.appendChild(p);
      setTimeout(()=>p.remove(),600);
    }
  }

  // Minimal confetti / boom FX (shared canvas)
  let confettiId; let ctx; let pieces=[];

  function prepareCanvas(){
    const c = confettiCanvas; if(!c) return null;
    const rect = c.getBoundingClientRect();
    const dpr = Math.max(1, window.devicePixelRatio || 1);
    c.width = Math.floor(rect.width * dpr);
    c.height = Math.floor(rect.height * dpr);
    const context = c.getContext('2d');
    context.setTransform(dpr, 0, 0, dpr, 0, 0); // draw in CSS pixels
    return { c, ctx: context, w: rect.width, h: rect.height };
  }
  function runConfetti(){
    const prep = prepareCanvas(); if(!prep) return; const { c, ctx:context, w, h } = prep; ctx = context;
    pieces = Array.from({length:120},()=>({
      x: Math.random()*w, y: -20- Math.random()*h,
      r: 4+Math.random()*4, c: ['#3b82f6','#60a5fa','#f59e0b','#10b981','#ef4444'][Math.floor(Math.random()*5)],
      vy: 2+Math.random()*3, vx: -1+Math.random()*2, rot: Math.random()*Math.PI, vr: -.1+Math.random()*.2
    }));
    cancelAnimationFrame(confettiId);
    const step = ()=>{
      ctx.clearRect(0,0,w,h);
      pieces.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if(p.y>h+20) p.y=-20; if(p.x<0) p.x=w; if(p.x>w) p.x=0;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.fillStyle=p.c; ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2); ctx.restore();
      });
      confettiId = requestAnimationFrame(step);
    };
    step();
  }
  function runBoom(){
    const prep = prepareCanvas(); if(!prep) return; const { c, ctx:context, w, h } = prep; ctx = context;
    const cx = w/2, cy = h/2;
    const palette = ['#ef4444','#f97316','#fb7185','#f59e0b'];
    pieces = Array.from({length:80},()=>{
      const angle = Math.random()*Math.PI*2;
      const speed = 2.5 + Math.random()*4.5;
      return {
        x: cx, y: cy, vx: Math.cos(angle)*speed, vy: Math.sin(angle)*speed,
        r: 6+Math.random()*8, rot: Math.random()*Math.PI, vr: -.2+Math.random()*.4,
        c: palette[Math.floor(Math.random()*palette.length)], life: 60+Math.random()*30, alpha: 1
      };
    });
    cancelAnimationFrame(confettiId);
    const step = ()=>{
      ctx.clearRect(0,0,w,h);
      pieces.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.vy += 0.04; // gravity
        p.rot += p.vr; p.life -= 1; p.alpha = Math.max(0, p.life/90);
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot); ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.c;
        ctx.beginPath();
        ctx.moveTo(0, -p.r);
        ctx.lineTo(p.r*0.8, p.r);
        ctx.lineTo(-p.r*0.8, p.r);
        ctx.closePath(); ctx.fill();
        ctx.restore();
      });
      confettiId = requestAnimationFrame(step);
    };
    step();
  }
  function stopConfetti(){ cancelAnimationFrame(confettiId); const c=confettiCanvas; if(c) { const ctx=c.getContext('2d'); ctx && ctx.clearRect(0,0,c.width,c.height); } }
})();
