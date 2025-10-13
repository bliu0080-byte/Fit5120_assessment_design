// Admin page script
(function () {
    // Putting tools and constants first
    const $ = (id) => document.getElementById(id);
    const API = (window.SCAMSAFE_CONFIG?.apiBackend?.baseUrl) || 'http://localhost:3001/api';

    // Uniformly declare els only once and put in all the required elements
    const els = {
        // form (document)
        title: $('title'),
        desc: $('desc'),
        content: $('content'),
        type: $('type'),
        severity: $('severity'),
        image: $('image'),
        url: $('url'),
        time: $('time'),

        // Upload & Preview
        imageFile: $('imageFile'),
        chooseImage: $('chooseImage'),
        uploadImage: $('uploadImage'),
        imgPreview: $('imgPreview'),

        // Lists and buttons
        publish: $('publish'),
        resetBtn: $('resetBtn'),
        list: $('list'),
        empty: $('empty'),
        lastUpdated: $('last-updated'),
    };

    // ---------- UI helpers ----------
    function toast(msg) {
        const t = document.createElement('div');
        t.className = 'toast card-bd card';
        t.textContent = msg;
        t.style.position = 'fixed';
        t.style.top = '20px';
        t.style.right = '20px';
        t.style.zIndex = '9999';
        document.body.appendChild(t);
        setTimeout(() => t.remove(), 2000);
    }

    function setUpdatedNow() {
        const dt = new Date().toLocaleString();
        if (els.lastUpdated) els.lastUpdated.textContent = 'Updated: ' + dt;
    }

    function renderPreview(src) {
        const hasImg = src && src.trim();
        els.imgPreview.innerHTML = hasImg
            ? `<img src="${src}" onerror="this.remove()" alt="preview">`
            : `<div class="noimg">无图片</div>`;
    }

    // ---------- API ----------
    async function getJSON(url, opts = {}) {
        const r = await fetch(url, { cache: 'no-store', ...opts });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
    }

    async function loadList() {
        try {
            const { items = [] } = await getJSON(`${API}/news`);
            els.list.innerHTML = '';
            if (!items.length) {
                els.empty.style.display = '';
                setUpdatedNow();
                return;
            }
            els.empty.style.display = 'none';

            items.forEach(a => {
                const item = document.createElement('div');
                item.className = 'item';

                const hasImg = a.image && String(a.image).trim().length > 0;

                item.innerHTML = `
          ${hasImg ? `
            <img class="thumb"
                 src="${a.image}"
                 loading="lazy"
                 decoding="async"
                 referrerpolicy="no-referrer"
                 onerror="this.remove()"
                 alt="thumb">
          ` : ''}
          <div>
            <div class="title">${a.title}</div>
            <div class="meta">
              <span class="badge type">${a.type}</span>
              <span class="badge sev-${a.severity}">${a.severity}</span>
              <span class="badge">${new Date(a.timestamp).toLocaleString()}</span>
              ${a.url ? `<a class="link" href="${a.url}" target="_blank" rel="noopener">source</a>` : ''}
              <a class="link" href="news.html?id=${encodeURIComponent(a.id)}" target="_blank" rel="noopener">view</a>
            </div>
            <div class="muted" style="margin-top:6px">${a.description || ''}</div>
          </div>
          <div class="item-actions">
            <button class="btn btn-ghost btn-del"><i class="fa-solid fa-trash"></i> Delete</button>
          </div>
        `;

                item.querySelector('.btn-del').onclick = async () => {
                    if (!confirm('Delete this alert?')) return;
                    await fetch(`${API}/news/${a.id}`, { method: 'DELETE' });
                    toast('Deleted');
                    loadList();
                };
                els.list.appendChild(item);
            });

            setUpdatedNow();
        } catch (e) {
            console.error(e);
            toast('Load failed');
        }
    }

    async function publish() {
        const payload = {
            title: els.title.value.trim(),
            description: els.desc.value.trim(),
            content: els.content.value.trim(),
            type: els.type.value,
            severity: els.severity.value,
            image: els.image.value.trim(),
            url: els.url.value.trim(),
            timestamp: els.time.value ? new Date(els.time.value).toISOString() : undefined
        };
        if (!payload.title) { toast('Title required'); return; }

        try {
            const r = await fetch(`${API}/news`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (!r.ok) throw new Error('Publish failed');
            toast('Published');
            resetForm();
            loadList();
        } catch (e) {
            console.error(e);
            toast('Publish failed');
        }
    }

    function resetForm() {
        els.title.value = '';
        els.desc.value = '';
        els.content.value = '';
        els.type.value = 'sms';
        els.severity.value = 'medium';
        els.image.value = '';
        els.url.value = '';
        els.time.value = '';
        renderPreview('');
    }

    // ---------- Image upload (本地选择 + 上传到后端) ----------
    // 点击“选择文件”
    els.chooseImage?.addEventListener('click', () => els.imageFile?.click());

    // 本地预览
    els.imageFile?.addEventListener('change', () => {
        const file = els.imageFile.files?.[0];
        if (!file) return;
        const blobUrl = URL.createObjectURL(file);
        renderPreview(blobUrl);
    });

    // 上传到 /api/upload，回填 URL
    // admin.js 中 上传按钮的点击事件
    els.uploadImage.addEventListener('click', async () => {
        const file = els.imageFile?.files?.[0];
        if (!file) { toast('请先选择图片'); return; }

        const fd = new FormData();
        fd.append('file', file);

        try {
            const r = await fetch(`${API}/upload`, { method: 'POST', body: fd });
            if (!r.ok) {
                const msg = await r.text().catch(()=>'');
                throw new Error(`HTTP ${r.status} ${msg}`);
            }
            const { url } = await r.json();
            els.image.value = url;
            renderPreview(url);
            toast('上传成功');
        } catch (e) {
            console.error(e);
            toast(e.message || '上传失败');
        }
    });

    // ---------- Events ----------
    document.addEventListener('DOMContentLoaded', () => {
        loadList();
        els.publish?.addEventListener('click', publish);
        els.resetBtn?.addEventListener('click', resetForm);
        els.image?.addEventListener('input', () => renderPreview(els.image.value.trim()));
    });
})();