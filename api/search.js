const WIKI = 'https://ru.wikipedia.org';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=120');
  const q = String(req.query?.q || '').trim();

  if (!q) return res.status(400).json({error:'Введите запрос'});

  try {
    const url = WIKI + '/w/rest.php/v1/search/page?q=' + encodeURIComponent(q) + '&limit=10';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'magic-wiki/1.0 (personal demo; https://github.com/ivanes921/magic-wiki)'
      }
    });

    if (!response.ok) return res.status(response.status).json({error:'Поиск недоступен'});

    const data = await response.json();
    const pages = (data.pages || []).map(p => ({
      title: p.title || '',
      excerpt: p.excerpt || '',
      description: p.description || ''
    }));

    return res.status(200).json({pages});
  } catch (error) {
    console.error(error);
    return res.status(500).json({error:'Не удалось выполнить поиск'});
  }
}
