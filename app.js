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

// Convert a Wikipedia article URL into a title. We deliberately accept
// absolute, protocol-relative and relative Wikipedia links because the HTML
// returned by MediaWiki can contain all three forms.
function getWikiTitleFromHref(href) {
  if (!href) return null;
  try {
    const raw = href.trim();
    if (!raw || raw.startsWith('#') || raw.startsWith('javascript:')) return null;
    const u = new URL(raw, 'https://ru.wikipedia.org');
    const isWikiHost = u.hostname === 'ru.wikipedia.org' || u.hostname.endsWith('.wikipedia.org');
    if (!isWikiHost || !u.pathname.startsWith('/wiki/')) return null;
    const rawName = u.pathname.slice('/wiki/'.length);
    if (!rawName) return null;
    const name = decodeURIComponent(rawName).replace(/_/g, ' ');
    if (!name || name.includes(':')) return null;
    return name;
  } catch {
    return null;
  }
}

function rewriteLinks(root) {
  root.querySelectorAll('a[href]').forEach(a => {
    const name = getWikiTitleFromHref(a.getAttribute('href'));
    if (!name) return;
    a.setAttribute('href', '/?title=' + encodeURIComponent(name));
    a.dataset.wikiTitle = name;
  });
}

function rewriteAssets(root) {
  root.querySelectorAll('[src]').forEach(el => {
    const src = el.getAttribute('src');
    if (src && src.startsWith('//')) el.setAttribute('src', 'https:' + src);
  });
  root.querySelectorAll('[srcset]').forEach(el => {
    const srcset = el.getAttribute('srcset');
    if (srcset) el.setAttribute('srcset', srcset.replace(/(^|,\s*)\/\//g, '$1https://'));
  });
}

function sanitizeArticle(root) {
  root.querySelectorAll('.mw-editsection, .mw-cite-backlink, .reference-accessdate').forEach(el => el.remove());
  rewriteLinks(root);
  rewriteAssets(root);
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

// Event delegation is used instead of individual listeners. This guarantees
// that dynamically inserted article links can never escape to real Wikipedia.
article.addEventListener('click', e => {
  const link = e.target.closest('a[href]');
  if (!link || !article.contains(link)) return;
  const name = link.dataset.wikiTitle || getWikiTitleFromHref(link.getAttribute('href'));
  if (!name) return;
  e.preventDefault();
  e.stopPropagation();
  navigate(name);
});

searchBtn.addEventListener('click', () => {
  searchPanel.hidden = !searchPanel.hidden;
  if (!searchPanel.hidden) searchInput.focus();
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
    const url = 'https://ru.wikipedia.org/w/api.php?action=query&list=search&srsearch=' +
      encodeURIComponent(q) + '&srnamespace=0&srlimit=10&format=json&origin=*';
    const res = await fetch(url, {cache:'no-store'});
    if (!res.ok) throw new Error('Поиск Википедии временно недоступен');
    const data = await res.json();
    const pages = Array.isArray(data?.query?.search) ? data.query.search : [];
    if (!pages.length) {
      searchResults.innerHTML = '<div class="searching">Ничего не найдено.</div>';
      return;
    }
    searchResults.innerHTML = pages.map(p => `
      <div class="result">
        <a href="/?title=${encodeURIComponent(p.title)}" data-title="${escapeHtml(p.title)}" class="result-title">${escapeHtml(p.title)}</a>
        <div class="result-path">Статья Википедии</div>
        <p>${escapeHtml(String(p.snippet || '').replace(/<[^>]*>/g, ''))}</p>
      </div>
    `).join('');

    searchResults.querySelectorAll('[data-title]').forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        e.stopPropagation();
        const t = a.dataset.title;
        searchPanel.hidden = true;
        searchInput.value = '';
        navigate(t);
      });
    });
  } catch (err) {
    searchResults.innerHTML = '<div class="error">' + escapeHtml(err.message || 'Load failed') + '</div>';
  }
});

window.addEventListener('popstate', () => {
  const current = new URLSearchParams(location.search).get('title') || 'Заглавная страница';
  loadPage(current);
});

loadPage(title);
