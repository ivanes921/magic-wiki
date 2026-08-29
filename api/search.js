const WIKI = 'https://ru.wikipedia.org';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const q = String(req.query?.q || '').trim();

  if (!q) return res.status(400).json({ error: 'Введите запрос' });

  try {
    // Use the stable MediaWiki Action API for search. The REST search
    // endpoint can vary between Wikimedia deployments and versions.
    const url = WIKI + '/w/api.php?action=query&list=search&srsearch=' +
      encodeURIComponent(q) + '&srnamespace=0&srlimit=10&format=json&origin=*';

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'magic-wiki/1.0 (personal demo; https://github.com/ivanes921/magic-wiki)'
      }
    });

    if (!response.ok) {
      console.error('Wikipedia search HTTP', response.status);
      return res.status(502).json({ error: 'Поиск Википедии временно недоступен' });
    }

    const data = await response.json();
    const results = Array.isArray(data?.query?.search) ? data.query.search : [];

    const pages = results.map(p => ({
      title: p.title || '',
      excerpt: String(p.snippet || '').replace(/<[^>]*>/g, ''),
      description: 'Статья Википедии'
    }));

    return res.status(200).json({ pages });
  } catch (error) {
    console.error('Wikipedia search error:', error);
    return res.status(502).json({ error: 'Не удалось выполнить поиск' });
  }
}
