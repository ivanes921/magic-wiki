const article = document.getElementById('article');
const breadcrumbs = document.getElementById('breadcrumbs');
const searchPanel = document.getElementById('searchPanel');
const searchBtn = document.getElementById('searchBtn');
const menuBtn = document.getElementById('menuBtn');
const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

const params = new URLSearchParams(location.search);
const title = params.get('title') || 'Заглавная страница';

function navigate(nextTitle) {
  const clean = String(nextTitle || '').trim();
  if (!clean) return;
  history.pushState({}, '', '/?title=' + encodeURIComponent(clean));
  loadPage(clean);
  window.scrollTo({top:0, behavior:'smooth'});
}

function rewriteLinks(root) {
  root.querySelectorAll('a[href]').forEach(a => {
    const href = a.getAttribute('href');
    if (!href) return;

    // Internal Russian Wikipedia article links.
    try {
      const u = new URL(href, 'https://ru.wikipedia.org');
      if (u.hostname === 'ru.wikipedia.org' && u.pathname.startsWith('/wiki/')) {
        const name = decodeURIComponent(u.pathname.slice('/wiki/'.length)).replace(/_/g, ' ');
        if (name && !name.includes(':')) {
          a.href = '/?title=' + encodeURIComponent(name);
          a.addEventListener('click', e => {
            e.preventDefault();
            navigate(name);
          });
        }
      }
    } catch {}
  });
}

function sanitizeArticle(root) {
  // Remove controls that do not make sense in the spectator copy.
  root.querySelectorAll('.mw-editsection, .mw-cite-backlink, .reference-accessdate').forEach(el => el.remove());
  rewriteLinks(root);
}

async function loadPage(pageTitle) {
  article.innerHTML = '<div class="loading">Загрузка статьи…</div>';
  breadcrumbs.textContent = pageTitle;
  document.title = pageTitle + ' — Википедия';

  try {
    const res = await fetch('/api/page?title=' + encodeURIComponent(pageTitle), {cache:'no-store'});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Статья не найдена');

    article.innerHTML = data.html;
    sanitizeArticle(article);
  } catch (err) {
    article.innerHTML = '<div class="error"><strong>Не удалось загрузить статью.</strong><br>' + escapeHtml(err.message) + '</div>';
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}

searchBtn.addEventListener('click', () => {
  searchPanel.hidden = !searchPanel.hidden;
  if (!searchPanel.hidden) {
    searchInput.focus();
  }
});

menuBtn.addEventListener('click', () => {
  const sidebar = document.getElementById('sidebar');
  if (window.innerWidth <= 760) {
    sidebar.style.display = sidebar.style.display === 'block' ? 'none' : 'block';
    sidebar.style.padding = sidebar.style.display === 'block' ? '0 0 20px' : '';
  }
});

searchForm.addEventListener('submit', async e => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;

  searchResults.innerHTML = '<div class="searching">Поиск…</div>';

  try {
    const res = await fetch('/api/search?q=' + encodeURIComponent(q), {cache:'no-store'});
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Ошибка поиска');

    if (!data.pages.length) {
      searchResults.innerHTML = '<div class="searching">Ничего не найдено.</div>';
      return;
    }

    searchResults.innerHTML = data.pages.map(p => `
      <div class="result">
        <a href="/?title=${encodeURIComponent(p.title)}" data-title="${escapeHtml(p.title)}" class="result-title">${escapeHtml(p.title)}</a>
        <div class="result-path">${escapeHtml(p.description || 'Статья Википедии')}</div>
        <p>${escapeHtml(p.excerpt || '')}</p>
      </div>
    `).join('');

    searchResults.querySelectorAll('[data-title]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        const t = a.dataset.title;
        searchPanel.hidden = true;
        navigate(t);
      });
    });
  } catch (err) {
    searchResults.innerHTML = '<div class="error">' + escapeHtml(err.message) + '</div>';
  }
});

window.addEventListener('popstate', () => {
  const current = new URLSearchParams(location.search).get('title') || 'Заглавная страница';
  loadPage(current);
});

loadPage(title);
