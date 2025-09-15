const API_BASE =
    (window.SCAMSAFE_CONFIG?.apiBackend?.baseUrl) ||
    (location.hostname.endsWith('onrender.com') ? '/api' : 'https://scamsafe.onrender.com/api');

/* Demo 数据：卡片全文直接显示 */
let stories = [
    { id: 's1', type: 'sms',  text: 'I got a message pretending to be from Australia Post asking me to pay $2.99 for redelivery. The link looked odd (bit.ly/..). I checked my AusPost app—no pending parcel. Deleted it and reported to ScamWatch.', likes: 12, createdAt: '2025-08-30', state:'VIC' },
    { id: 's2', type: 'phone',text: 'A caller claimed to be my grandson in trouble and needed money urgently. Background noise like a “police station”. I called my daughter on another phone to verify—grandson was at school. Obvious scam.', likes: 20, createdAt: '2025-09-02', state:'NSW' },
    { id: 's3', type: 'email',text: '“ATO tax refund” email with a countdown timer and an attachment. The sender domain was not ato.gov.au. Marked as phishing in Gmail and removed.', likes: 7,  createdAt: '2025-08-22', state:'QLD' },
    { id: 's4', type: 'web',  text: 'A shopping site with unbelievable discounts. No ABN or contact page; checkout forced bank transfer. Searched reviews—many said never received items. Avoided.', likes: 15, createdAt: '2025-09-05', state:'WA' }
];

const grid     = document.getElementById('storiesGrid');
const filterEl = document.getElementById('filterType');
const sortEl   = document.getElementById('sortBy');
const openBtn  = document.getElementById('openShare');

const modal    = document.getElementById('shareModal');
const closers  = modal.querySelectorAll('[data-close]');
const form     = document.getElementById('shareForm');
const textEl   = document.getElementById('storyText');
const typeEl   = document.getElementById('storyType');
const stateEl  = document.getElementById('storyState');

/* ====== 设置 hero 背景图（支持 data-bg）====== */
document.querySelectorAll('.ss-hero-img[data-bg]').forEach(sec=>{
    const url = sec.getAttribute('data-bg');
    if (url) sec.style.backgroundImage = `url("${url}")`;
});

const likeIcon = () => `
<svg viewBox="0 0 24 24" aria-hidden="true">
  <path d="M9 22h-3a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3v11zm10.77-9.38l-1.43 6.29A2 2 0 0 1 16.41 21H11V8.31A4 4 0 0 1 13.67 5l.66-.66A1 1 0 0 1 16 4a2 2 0 0 1 2 2v3h2a2 2 0 0 1 1.94 2.45z"/>
</svg>`;

function renderCards() {
    const type = filterEl.value;
    const sort = sortEl.value;

    let list = [...stories];
    if (type !== 'all') list = list.filter(s => s.type === type);

    if (sort === 'newest') list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
    if (sort === 'popular') list.sort((a,b) => b.likes - a.likes);

    grid.innerHTML = list.map(s => `
    <article class="ss-card" data-id="${s.id}">
      <div class="ss-tag">[${s.type.toUpperCase()}] ${s.state ? ' · ' + s.state : ''}</div>
      <p class="ss-text">${escapeHtml(s.text)}</p>
      <button class="ss-like" data-like aria-label="Like this story">${likeIcon()} <span class="count">${s.likes}</span></button>
    </article>
  `).join('');
}
function escapeHtml(str){return str.replace(/[&<>"']/g,m=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[m]));}

/* like */
grid.addEventListener('click', (e) => {
    const likeBtn = e.target.closest('[data-like]');
    const card = e.target.closest('.ss-card');
    if (!card) return;
    const id = card.dataset.id;

    if (likeBtn) {
        const s = stories.find(x => x.id === id);
        if (!s) return;
        s.likes++;
        likeBtn.querySelector('.count').textContent = s.likes;
        // fetch(`${API_BASE}/stories/${id}/like`, { method:'POST' }).catch(()=>{});
    }
});

/* filters */
filterEl.addEventListener('change', renderCards);
sortEl.addEventListener('change', renderCards);

/* modal */
function openModal(){ modal.setAttribute('aria-hidden','false'); textEl.focus(); }
function closeModal(){ modal.setAttribute('aria-hidden','true'); form.reset(); }
openBtn.addEventListener('click', openModal);
modal.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
modal.addEventListener('click', (e) => { if (e.target.matches('.ss-modal__backdrop')) closeModal(); });
document.addEventListener('keydown', (e)=>{ if(e.key==='Escape' && modal.getAttribute('aria-hidden')==='false') closeModal(); });

/* submit */
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const payload = {
        text: textEl.value.trim(),
        type: typeEl.value,
        state: stateEl.value || null
    };
    if (!payload.text || !payload.type){
        alert('Please fill in story and type.');
        return;
    }
    try{
        // const res = await fetch(`${API_BASE}/stories`, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
        // const saved = await res.json();
        const saved = { id:'s'+(Math.random()*1e6|0), type:payload.type, text:payload.text, likes:0, createdAt:new Date().toISOString().slice(0,10), state: payload.state || undefined };
        stories.unshift(saved);
        renderCards();
        closeModal();
        alert('Thanks for sharing your story!');
    }catch(err){
        console.error(err);
        alert('Submit failed. Please try again later.');
    }
});

/* init */
renderCards();