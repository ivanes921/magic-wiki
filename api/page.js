const WIKI = 'https://ru.wikipedia.org';

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
  const title = String(req.query?.title || '').trim();

  if (!title) return res.status(400).json({error:'Не указано название статьи'});

  try {
    const url = WIKI + '/w/rest.php/v1/page/' + encodeURIComponent(title) + '/html';
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'magic-wiki/1.0 (personal demo; https://github.com/ivanes921/magic-wiki)'
      }
    });

    if (!response.ok) {
      return res.status(response.status).json({error:'Статья не найдена'});
    }

    const html = await response.text();
    return res.status(200).json({html, title});
  } catch (error) {
    console.error(error);
    return res.status(500).json({error:'Не удалось связаться с Википедией'});
  }
}
