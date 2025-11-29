const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('speakers_final.html', 'utf8');
const $ = cheerio.load(html);

const firstCard = $('[data-cvent-id="speakers-speakerCard"]').first();
fs.writeFileSync('sample_card.html', firstCard.html() || '');

const parent = firstCard.parent();
fs.writeFileSync('sample_card_parent.html', parent.html() || '');

