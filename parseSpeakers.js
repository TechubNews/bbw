const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('speakers_final.html', 'utf8');
const $ = cheerio.load(html);

const speakers = [];

$('[data-cvent-id="speakers-speakerCard"]').each((_, element) => {
  const card = $(element);
  const name = card.find('h3').first().text().trim();
  const infoSection = card.find('[class*="SpeakersStyles__speakerInfo"]');
  const spans = infoSection.find('div.css-87ndg2 span').map((__, spanEl) => $(spanEl).text().trim()).get().filter(Boolean);
  const title = spans[0] || '';
  const company = spans[1] || '';
  const imageUrl = card.find('img').attr('src') || '';

  if (name) {
    speakers.push({ name, title, company, imageUrl });
  }
});

fs.writeFileSync('speakers.json', JSON.stringify(speakers, null, 2), 'utf8');
console.log(`Extracted ${speakers.length} speakers`);

