    // ================= API base =================
    const API_BASE =
        (window.SCAMSAFE_CONFIG?.apiBackend?.baseUrl) ||
        ((location.hostname.includes('localhost') || location.hostname === '127.0.0.1')
            ? 'http://localhost:3000/api'
            : 'https://scamsafe.onrender.com/api');

    // ================= State =================
    let stories = [];
    let currentDetailId = null; // always a string
    // state
    let currentPage = 1;
    let totalPages = 1;
    let currentSearch = '';

    // API


    // Normalize any id to string for stable comparisons
    const toId = (v) => String(v || '');
    // Always read story id safely (supports id or _id)
    const getId = (s) => toId(s?.id ?? s?._id);

    // ================= Element refs =================
    // Grid / filters
    const grid     = document.getElementById('storiesGrid');
    const filterEl = document.getElementById('filterType');
    const sortEl   = document.getElementById('sortBy');

    // Share modal
    const openBtn  = document.getElementById('openShare');
    const modal    = document.getElementById('shareModal');
    const form     = document.getElementById('shareForm');
    const textEl   = document.getElementById('storyText');
    const typeEl   = document.getElementById('storyType');
    const stateEl  = document.getElementById('storyState');

    // Detail modal
    const detailModal = document.getElementById('storyDetailModal');
    const detailType  = detailModal?.querySelector('[data-detail-type]');
    const detailState = detailModal?.querySelector('[data-detail-state]');
    const detailTime  = detailModal?.querySelector('[data-detail-time]');
    const detailTitle = detailModal?.querySelector('#storyDetailTitle');
    const detailText  = detailModal?.querySelector('[data-detail-text]');
    const detailLike  = detailModal?.querySelector('[data-detail-like]');

    // Comments (global refs to elements inside detail modal)
    const cCount = document.getElementById('commentCount');
    const cEmpty = document.getElementById('commentsEmpty');
    const cList  = document.getElementById('commentsList');
    const cForm  = document.getElementById('commentForm');
    const cName  = document.getElementById('cname');
    const cText  = document.getElementById('ctext');

    // ================= Hero bg (data-bg) =================
    document.querySelectorAll('.ss-hero-img[data-bg]').forEach(sec => {
        const url = sec.getAttribute('data-bg');
        if (url) sec.style.backgroundImage = `url("${url}")`;
    });

    // ================= Utils =================
    // ================= Error reason mapping (short, single-line) =================
    const REASON_MESSAGES = {
        not_sentence: "Please write a full sentence describing your story.",
        toxic_content: "Your story contains offensive or inappropriate language.",
    };

    // Choose ONE most specific reason to show (highest priority first)
    const REASON_PRIORITY = [
        'profanity',
        'too_short',
        'no_spaces',
        'repetitive_pattern',
        'low_diversity',
        'links_detected',
        'phone_detected'
    ];

    function pickTopReason(reasons = []) {
        if (!Array.isArray(reasons) || reasons.length === 0) return null;
        for (const key of REASON_PRIORITY) {
            if (reasons.includes(key)) return key;
        }
        return reasons[0]; // fallback
    }
    const likeIcon = (filled = false) =>
        filled
            ? '<i class="fa-solid fa-thumbs-up" aria-hidden="true"></i>'
            : '<i class="fa-regular fa-thumbs-up" aria-hidden="true"></i>';

    function escapeHtml(str='') {
        return String(str).replace(/[&<>"']/g, m => ({
            '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
        }[m]));
    }

    // ================= API =================
    async function apiGetStories(page=1, limit=9, search='', sort='recent') {
        const params = new URLSearchParams({ page, limit, sort });
        if (search) params.append('search', search);

        const res = await fetch(`${API_BASE}/stories?${params.toString()}`);
        if (!res.ok) throw new Error(`GET /stories ${res.status}`);
        return await res.json(); // {page,limit,total,totalPages,items}
    }
    async function loadStories(page=1, search='') {
        try {
            const sort = sortEl?.value === 'popular' ? 'popular' : 'recent';
            const data = await apiGetStories(page, 9, search, sort);
            stories = data.items || [];
            currentPage = data.page;
            totalPages = data.totalPages;
            renderCards();
            renderPagination();
        } catch (e) {
            console.error('load stories failed:', e);
            stories = [];
            renderCards();
        }
    }
    function renderPagination() {
        const pager = document.getElementById('pagination');
        if (!pager) return;

        if (!totalPages || totalPages <= 1) {
            pager.innerHTML = '';
            return;
        }

        let html = '';
        for (let i = 1; i <= totalPages; i++) {
            html += `<button type="button"
                     class="pg-btn ${i===currentPage ? 'active' : ''}"
                     data-page="${i}">${i}</button>`;
        }
        pager.innerHTML = html;


        if (!pager.__bound) {
            pager.addEventListener('click', (e) => {
                const btn = e.target.closest('.pg-btn[data-page]');
                if (!btn) return;
                const page = parseInt(btn.getAttribute('data-page'), 10);
                if (!Number.isFinite(page) || page === currentPage) return;
                loadStories(page, currentSearch);
            });
            pager.__bound = true;
        }
    }
    document.getElementById('searchBtn')?.addEventListener('click', ()=>{
        const val = document.getElementById('searchBox').value.trim();
        currentSearch = val;
        loadStories(1, currentSearch);
    });

    async function apiCreateStory(payload) {
        const res = await fetch(`${API_BASE}/stories`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        let data = {};
        try { data = await res.json(); } catch { /* ignore */ }

        if (!res.ok) {
            const reasons = data?.details?.reasons || [];
            const top = pickTopReason(reasons);
            const short = top ? (REASON_MESSAGES[top] || top) : (data?.error || `POST /stories ${res.status}`);
            throw new Error(short); // <-- single short sentence
        }

        return data;
    }
    async function apiLikeStory(id) {
        const res = await fetch(`${API_BASE}/stories/${id}/like`, { method:'POST' });
        if (!res.ok) throw new Error(`POST /stories/${id}/like ${res.status}`);
        return await res.json(); // { id, likes }
    }
    async function apiUnlikeStory(id) {
        const res = await fetch(`${API_BASE}/stories/${id}/unlike`, { method:'POST' });
        if (!res.ok) throw new Error(`POST /stories/${id}/unlike ${res.status}`);
        return await res.json(); // { id, likes }
    }
    async function apiGetComments(storyId) {
        const res = await fetch(`${API_BASE}/stories/${storyId}/comments`);
        if (!res.ok) throw new Error(`GET /stories/${storyId}/comments ${res.status}`);
        return await res.json(); // array
    }
    async function apiAddComment(storyId, payload) {
        const res = await fetch(`${API_BASE}/stories/${storyId}/comments`, {
            method:'POST',
            headers:{'Content-Type':'application/json'},
            body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error(`POST /stories/${storyId}/comments ${res.status}`);
        return await res.json(); // new comment object
    }

    // ================= Rendering =================
    function renderCards() {
        if (!grid) return;
        const type = filterEl?.value || 'all';

        let list = [...stories];
        if (type !== 'all') list = list.filter(s => s.type === type);



        const typeImages = {
            sms: './assets/images/sms-scam.png',
            phone: './assets/images/phone-scam.png',
            email: './assets/images/email-scam.png',
            web: './assets/images/web-scam.png',
            other: './assets/images/other-scam.png'
        };

        grid.innerHTML = list.map(s => {
            const imgSrc = typeImages[s.type] || typeImages.other;
            const sId = getId(s);
            const liked = likedStories.includes(sId)
            return `
          <article class="ss-card" data-id="${sId}">
            <img src="${imgSrc}" alt="${s.type} scam" class="ss-card-img">
            <div class="ss-tag">[${(s.type||'other').toUpperCase()}] ${s.state ? ' · ' + s.state : ''}</div>
            <p class="ss-text">${escapeHtml(s.text || '')}</p>
            <div class="ss-card-actions">
              <button class="ss-like ${liked ? 'liked' : ''}" data-like type="button" aria-label="Like this story">
                ${likeIcon(liked)} <span class="count">${s.likes ?? 0}</span>
              </button>
            </div>
          </article>
        `;
        }).join('');
    }

    function renderCommentsUI(comments = []) {
        if (!Array.isArray(comments)) comments = [];
        if (cCount) cCount.textContent = String(comments.length);

        if (comments.length === 0) {
            if (cEmpty) cEmpty.hidden = false;
            if (cList)  { cList.hidden = true; cList.innerHTML = ''; }
            return;
        }
        if (cEmpty) cEmpty.hidden = true;
        if (cList)  {
            cList.hidden = false;
            cList.innerHTML = comments.map(c => `
          <div class="ss-comment">
            <div class="avatar">${(c.author || 'A').charAt(0).toUpperCase()}</div>
            <div class="ss-comment-body">
              <div class="ss-comment-meta">${escapeHtml(c.author || 'Anonymous')} · ${new Date(c.createdAt).toLocaleString()}</div>
              <div class="ss-comment-text">${escapeHtml(c.text || '')}</div>
            </div>
          </div>
        `).join('');
        }
    }

    // ================= Likes (delegated) =================
    const likedStories = (JSON.parse(localStorage.getItem('likedStories') || '[]')).map(toId);

    function saveLiked(id) {
        id = toId(id);
        if (!likedStories.includes(id)) {
            likedStories.push(id);
            localStorage.setItem('likedStories', JSON.stringify(likedStories));
        }
    }

    grid?.addEventListener('click', async (e) => {
        const likeBtn = e.target.closest('[data-like]');
        if (!likeBtn) return;
        const card = likeBtn.closest('.ss-card');
        if (!card) return;

        const id = toId(card.dataset.id);
        const s = stories.find(x => getId(x) === id);
        if (!s) return;

        const idx = likedStories.indexOf(id);

        if (idx >= 0) {
            // Unlike optimistic
            likedStories.splice(idx, 1);
            localStorage.setItem('likedStories', JSON.stringify(likedStories));
            try {
                const data = await apiUnlikeStory(id);
                s.likes = data?.likes ?? Math.max(0, (s.likes||0)-1);
            } catch (err) {
                console.error('unlike failed', err);
                alert('Unlike failed. Please try again later.');
            }
        } else {
            // Like optimistic
            const optimistic = (s.likes || 0) + 1;
            likeBtn.classList.add('liked');
            likeBtn.innerHTML = `${likeIcon(true)} <span class="count">${optimistic}</span>`;
            saveLiked(id);
            try {
                const data = await apiLikeStory(id);
                s.likes = data?.likes ?? optimistic;
            } catch (err) {
                console.error('like failed', err);
                // rollback local
                const backIdx = likedStories.indexOf(id);
                if (backIdx >= 0) likedStories.splice(backIdx, 1);
                localStorage.setItem('likedStories', JSON.stringify(likedStories));
                s.likes = Math.max(0, optimistic - 1);
                alert('Like failed. Please try again later.');
            }
        }

        const nowLiked = likedStories.includes(getId(s));
        likeBtn.classList.toggle('liked', nowLiked);
        likeBtn.innerHTML = `${likeIcon(nowLiked)} <span class="count">${s.likes ?? 0}</span>`;

        // sync detail like if the same story is open
        if (toId(currentDetailId) === getId(s) && detailLike) {
            detailLike.classList.toggle('liked', nowLiked);
            detailLike.innerHTML = `${likeIcon(nowLiked)} <span class="count">${s.likes ?? 0}</span>`;
        }
    });

    // ================= Read more → open detail =================
    grid?.addEventListener('click', (e) => {
        const btn = e.target.closest('[data-readmore]');
        if (!btn) return;
        const card = btn.closest('.ss-card');
        if (!card) return;
        openStoryDetail(card.dataset.id);
    });

    // Click card background (not the buttons) to open detail
    grid?.addEventListener('click', (e) => {
        const card = e.target.closest('.ss-card');
        if (!card) return;
        if (e.target.closest('[data-like],[data-readmore],[data-open-comments]')) return;
        openStoryDetail(card.dataset.id);
    });

    // ================= Detail modal open/close =================
    function openDetail() {
        if (!detailModal) return;
        detailModal.setAttribute('aria-hidden','false');
        // move focus to close button (accessibility)
        detailModal.querySelector('.ss-modal__close')?.focus({ preventScroll: true });
    }

    function closeDetail() {
        const modalEl = detailModal;
        if (!modalEl) return;

        // Move focus off descendants before hiding (avoid aria-hidden warning)
        if (modalEl.contains(document.activeElement)) {
            (document.querySelector('main, body') || document.body).focus({ preventScroll: true });
        }
        modalEl.setAttribute('aria-hidden', 'true');

        // Reset comments UI safely
        if (cList)  { cList.innerHTML = ''; cList.hidden = true; }
        if (cEmpty) cEmpty.hidden = false;
        if (cCount) cCount.textContent = '0';
        if (cForm)  cForm.reset();

        currentDetailId = null;
    }
    function setupDetailClose() {
        if (!detailModal) return;

        // Click on the element with data-close → Close
        detailModal.addEventListener('click', (e) => {
            if (e.target.closest('[data-close]')) {
                closeDetail();
            }
            // Click backdrop → Close
            if (e.target.classList.contains('ss-modal__backdrop')) {
                closeDetail();
            }
        });

        // Keyboard ESC can also be turned off
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && detailModal.getAttribute('aria-hidden') === 'false') {
                closeDetail();
            }
        });
    }

    // Initialisation call
    setupDetailClose();

    // ================= Open story detail (load full card + comments) =================
    async function openStoryDetail(storyId) {
        detailModal?.setAttribute('data-current-id', currentDetailId);
        const s = stories.find(x => getId(x) === toId(storyId));
        currentDetailId = getId(s); // ensure we store the normalized actual id
        detailModal?.setAttribute('data-current-id', currentDetailId);
        if (!s) {
            console.warn('[openStoryDetail] story not found for id', storyId);
            return;
        }
        currentDetailId = toId(storyId);

        // Fill meta
        const typeKey = (s.type || 'other').toLowerCase();
        if (detailType)  { detailType.textContent = typeKey.toUpperCase(); detailType.className = 'ss-tag tag--' + typeKey; }
        const stateKey = (s.state || 'N/A').toUpperCase();
        if (detailState) { detailState.textContent = stateKey; detailState.className = s.state ? ('state--' + stateKey) : ''; }
        if (detailTime)  detailTime.textContent = (s.createdAt || s.created_at || '').toString().slice(0,16).replace('T',' ');
        if (detailTitle) detailTitle.textContent = 'Story';
        if (detailText)  detailText.textContent  = s.text || '';

        // We already have like on cards; optionally hide detail like
        if (detailLike) detailLike.style.display = 'none';

        // Reset comments UI
        if (cEmpty) cEmpty.hidden = false;
        if (cList)  { cList.hidden = true; cList.innerHTML = ''; }
        if (cCount) cCount.textContent = '0';

        openDetail();

        // Fetch & render comments
        try {
            const comments = await apiGetComments(currentDetailId);
            renderCommentsUI(comments);
        } catch (err) {
            console.error('load comments failed', err);
            renderCommentsUI([]);
        }
    }

    // ================= Comment form (single binding) =================
    function bindCommentForm() {
        if (!cForm) {
            document.addEventListener('DOMContentLoaded', bindCommentForm, { once: true });
            return;
        }
        cForm.removeEventListener('submit', onCommentSubmit);
        cForm.addEventListener('submit', onCommentSubmit);
    }

    async function onCommentSubmit(e) {
        e.preventDefault();

        if (!currentDetailId) {
            console.warn('[comments] currentDetailId is empty');
            return;
        }

        const fd = new FormData(cForm);
        const payload = {
            author: (fd.get('author') || '').trim() || null,
            text:   (fd.get('text')   || '').trim(),
        };
        if (!payload.text) return;

        const submitBtn = cForm.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const saved = await apiAddComment(currentDetailId, payload);

            const name = saved?.author ? escapeHtml(saved.author) : 'Anonymous';
            const ts   = (saved?.createdAt || new Date()).toString().slice(0,16).replace('T',' ');


            const isAnonymous = !saved?.author;

            const avatarHtml = isAnonymous
                    ? `
            <svg xmlns="http://www.w3.org/2000/svg" 
                 viewBox="0 0 24 24" 
                 width="28" height="28" 
                 fill="#64748b" 
                 class="avatar-icon">
              <circle cx="12" cy="8" r="4"/>
              <path d="M4 20c0-4 4-6 8-6s8 2 8 6"/>
            </svg>
          `
                    : name.charAt(0).toUpperCase();

                const html = `
              <div class="ss-comment">
                <div class="avatar">${avatarHtml}</div>
                <div class="ss-comment-body">
                  <div class="ss-comment-meta">${name} · <span class="ts">${ts}</span></div>
                  <div class="ss-comment-text">${escapeHtml(saved?.text || '')}</div>
                </div>
              </div>
        `;

            if (cEmpty) cEmpty.hidden = true;
            if (cList)  { cList.hidden = false; cList.insertAdjacentHTML('beforeend', html); }
            if (cCount) cCount.textContent = String((+cCount.textContent || 0) + 1);

            if (cText) cText.value = '';
            if (cName) cName.value = '';

            // Sync comment count on the card list if you display it there
            const s = stories.find(x => toId(x.id) === toId(currentDetailId));
            if (s) { s.commentCount = (s.commentCount || 0) + 1; renderCards && renderCards(); }

        } catch (err) {
            console.error('add comment failed', err);
            alert('Failed to post comment.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }
    bindCommentForm();

    // ================= Filters =================
    filterEl?.addEventListener('change', renderCards);
    sortEl  ?.addEventListener('change', () => loadStories(1, currentSearch));

    // ================= Share modal =================
    function openModal() { if (!modal) return; modal.setAttribute('aria-hidden','false'); textEl?.focus(); }
    function closeModal(){ if (!modal) return; modal.setAttribute('aria-hidden','true'); form?.reset(); }
    openBtn?.addEventListener('click', openModal);
    modal?.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeModal));
    modal?.addEventListener('click', (e) => { if (e.target.matches('.ss-modal__backdrop')) closeModal(); });


    // ================= Share form submit =================
    // ================= Share form submit (safe, single-binding) =================
    (function bindShareFormOnce(){
        if (!form) return;
        // Prevent double-binding if this file is accidentally included twice
        if (window.__shareSubmitBound) return;
        window.__shareSubmitBound = true;

        form.addEventListener('submit', onShareSubmit);
    })();

    async function onShareSubmit(e) {
        e.preventDefault();

        const payload = {
            text:  (textEl?.value || '').trim(),
            type:  typeEl?.value,
            state: stateEl?.value || null
        };

        if (!payload.text || !payload.type) {
            alert('Please fill in story and type.');
            return;
        }

        // Disable button to avoid double submit
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) submitBtn.disabled = true;

        try {
            const saved = await apiCreateStory(payload);

            // Backend may return only { id, moderationStatus, moderation }
            // We DO NOT push into UI from this response to avoid "blank card".
            if (saved?.moderationStatus === 'approved') {
                closeModal();
                const sort = sortEl?.value === 'popular' ? 'popular' : 'recent';
                const data = await apiGetStories(1, 9, currentSearch, sort);
                stories = data.items || [];
                renderCards();
                renderPagination();
                alert('Thanks for sharing your story!');
            } else if (saved?.moderationStatus === 'pending') {
                closeModal();
                alert('Your story has been submitted for review. It will appear once approved.');
                // No UI insert for pending
            } else {
                closeModal();
                alert('Your story could not be published immediately.');
            }
        } catch (err) {
            console.error('submit failed', err);
            alert(err?.message || 'Submit failed. Please try again later.');
        } finally {
            if (submitBtn) submitBtn.disabled = false;
        }
    }


    // ================= Init =================
    (async function init(){
        try {
            const data = await apiGetStories(1);
            stories = data.items || [];
            currentPage = data.page;
            totalPages = data.totalPages;
            renderCards();
            renderPagination();
        } catch (e) {
            console.error('load stories failed:', e);
            stories = [];
            renderCards();
        }
    })();


    // ================= Admin Tool: Delete Current Story =================
    async function adminDeleteCurrent() {
        // Prefer global, fallback to modal data attribute
        const raw = (typeof window.currentDetailId !== 'undefined' ? window.currentDetailId : null)
            ?? detailModal?.getAttribute('data-current-id');

        const activeId = String(raw ?? '').trim();

        // Guard against '', 'null', 'undefined'
        if (!activeId || activeId === 'null' || activeId === 'undefined') {
            console.warn('[adminDeleteCurrent] invalid activeId:', { raw, activeId });
            alert('No story is currently opened.');
            return;
        }

        if (!confirm('Are you sure you want to delete this story? This action cannot be undone.')) {
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/stories/${activeId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error(`DELETE failed with ${res.status}`);

            // Remove from local list and refresh UI
            const idx = stories.findIndex(x => getId(x) === activeId);
            if (idx >= 0) stories.splice(idx, 1);

            // Close modal & rerender cards
            closeDetail?.();
            renderCards?.();

            alert('Story has been deleted.');
        } catch (err) {
            console.error('Delete failed:', err);
            alert('Failed to delete story. Check console for details.');
        }
    }

    // ================= Admin Shortcut: Ctrl/⌘ + Alt + Backspace =================
    // Works only when the detail modal is open (aria-hidden="false").
    window.addEventListener('keydown', (e) => {
        const isDetailOpen = detailModal && detailModal.getAttribute('aria-hidden') === 'false';
        if (!isDetailOpen) return;

        const meta = e.ctrlKey || e.metaKey; // Ctrl on Windows/Linux, ⌘ on Mac
        if (meta && e.altKey && e.key === 'Backspace') {
            e.preventDefault();
            adminDeleteCurrent();
        }
    });
