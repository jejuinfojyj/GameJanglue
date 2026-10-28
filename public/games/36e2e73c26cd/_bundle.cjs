'use strict';
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;

function strip(src) {
  return src
    .replace(/^\s*import\s+[\s\S]*?from\s*['"][^'"]+['"];?\s*$/gm, '')
    .replace(/\bexport\s+function\b/g, 'function')
    .replace(/\bexport\s+const\b/g, 'const')
    .replace(/\bexport\s+\{[^}]+\};?/g, '');
}

const parts = ['game-shell.js', 'config.mjs', 'camera2d.mjs', 'game.mjs', 'main.js'].map((name) =>
  strip(fs.readFileSync(path.join(root, name), 'utf8'))
);

const out = `(function(){
'use strict';
try{
${parts.join('\n')}
}catch(err){
  console.error(err);
  const el=document.createElement('pre');
  el.style.cssText='position:fixed;inset:12px;background:#200;color:#fff;padding:16px;z-index:9999;white-space:pre-wrap;font:14px monospace';
  el.textContent='게임 실행 오류:\\n'+(err&&err.stack?err.stack:err);
  document.body.appendChild(el);
}
})();
`;

fs.writeFileSync(path.join(root, 'app.js'), out);
console.log(JSON.stringify({ ok: true, bytes: out.length }));
