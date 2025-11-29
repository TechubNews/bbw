const fs = require('fs');

const html = fs.readFileSync('speakers_final.html', 'utf8');
const regex = /data-cvent-id="([^"]+)"/g;
const ids = new Set();
let match;

while ((match = regex.exec(html))) {
  ids.add(match[1]);
}

console.log(`Found ${ids.size} unique data-cvent-id values`);
console.log(Array.from(ids).slice(0, 50));

