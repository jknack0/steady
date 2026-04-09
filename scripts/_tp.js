
const fs = require('fs');
const p = 'c:/Dev/steady/docs/test-plans/gpu-transcription-pipeline.md';
const s = [];
s.push(require('./tp1'));
s.push(require('./tp2'));
s.push(require('./tp3'));
fs.writeFileSync(p, s.join(''));
console.log('Done:', fs.statSync(p).size, 'bytes');
