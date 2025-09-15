// Inbox Clean-Up – drag-drop with success/fail effects
(function(){
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  const list = $('.mail-list');
  const bin = $('.bin');
  const overlay = $('.result-overlay');
  const confettiCanvas = $('#confetti');
  const submitBtn = $('#submitBtn');
  const returnBtn = $('#returnBtn');

  const mails = $$('.mail').map(el => ({ id: el.id, type: el.dataset.type, el, inBin:false }));

  $$('.mail').forEach(el => {
    el.setAttribute('draggable', 'true');
    el.addEventListener('dragstart', (e)=>{
      e.dataTransfer.setData('text/plain', el.id);
      el.classList.add('dragging');
    });
    el.addEventListener('dragend', ()=> el.classList.remove('dragging'));
  });

  function allow(e){ e.preventDefault(); }
  ['dragenter','dragover'].forEach(evt => bin.addEventListener(evt, (e)=>{ allow(e); bin.classList.add('highlight'); }));
  ;['dragleave','drop'].forEach(evt => bin.addEventListener(evt, ()=> bin.classList.remove('highlight')));

  bin.addEventListener('drop', (e)=>{
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    const item = mails.find(m => m.id === id);
    if(!item) return;

    const rect = bin.getBoundingClientRect();
    spawnPoofs(rect.left + rect.width/2, rect.top + rect.height/2, 12);

    if(item.type === 'scam'){
      item.inBin = true;
      item.el.style.transition = 'transform .25s ease, opacity .25s ease';
      item.el.style.transform = 'scale(.96)';
      item.el.style.opacity = '0';
      setTimeout(()=>{ item.el.style.display='none'; }, 220);
    } else {
      item.el.classList.add('shake');
      setTimeout(()=> item.el.classList.remove('shake'), 400);
    }
  });

  submitBtn?.addEventListener('click', ()=>{
    const allScamTrashed = mails.filter(m=>m.type==='scam').every(m=>m.inBin);
    const anySafeTrashed = mails.filter(m=>m.type==='safe').some(m=>m.inBin);
    if(allScamTrashed && !anySafeTrashed){
      showResult(true);
    }else{
      showResult(false);
      mails.forEach(m=>{ if(m.type==='scam' && !m.inBin){ m.el.classList.add('shake'); setTimeout(()=>m.el.classList.remove('shake'),450);} });
    }
  });

  returnBtn?.addEventListener('click', ()=>{ window.location.href = 'play.html'; });

  function showResult(success){
    const card = $('.result-card');
    card.classList.toggle('success', success);
    card.classList.toggle('fail', !success);
    $('.result-title').textContent = success ? 'Congrats! 🎉' : 'You lost';
    $('.result-sub').textContent = success ? 'All suspicious emails were binned.' : 'Some choices were incorrect. Try again!';
    overlay.classList.add('show');
    if(success) runConfetti();
  }

  overlay?.addEventListener('click', ()=>{
    overlay.classList.remove('show');
    stopConfetti();
  });

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

  let confettiId; let ctx; let pieces=[];
  function runConfetti(){
    const c = confettiCanvas; if(!c) return; c.width = innerWidth; c.height = innerHeight; ctx = c.getContext('2d');
    pieces = Array.from({length:120},()=>({
      x: Math.random()*c.width, y: -20- Math.random()*c.height,
      r: 4+Math.random()*4, c: ['#3b82f6','#60a5fa','#f59e0b','#10b981','#ef4444'][Math.floor(Math.random()*5)],
      vy: 2+Math.random()*3, vx: -1+Math.random()*2, rot: Math.random()*Math.PI, vr: -.1+Math.random()*.2
    }));
    cancelAnimationFrame(confettiId);
    const step = ()=>{
      ctx.clearRect(0,0,c.width,c.height);
      pieces.forEach(p=>{
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        if(p.y>c.height+20) p.y=-20; if(p.x<0) p.x=c.width; if(p.x>c.width) p.x=0;
        ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        ctx.fillStyle=p.c; ctx.fillRect(-p.r, -p.r, p.r*2, p.r*2); ctx.restore();
      });
      confettiId = requestAnimationFrame(step);
    };
    step();
  }
  function stopConfetti(){ cancelAnimationFrame(confettiId); const c=confettiCanvas; if(c) { const ctx=c.getContext('2d'); ctx && ctx.clearRect(0,0,c.width,c.height); } }
})();

