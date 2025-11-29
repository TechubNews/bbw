const fs = require('fs');

const html = fs.readFileSync('speakers_final.html', 'utf8');
const matches = [...html.matchAll(/"([^"]*speaker[^"]*)"/gi)].map((m) => m[1]);

console.log(matches.slice(0, 40));
console.log('count', matches.length);

