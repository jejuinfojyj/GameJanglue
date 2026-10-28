import { fileURLToPath } from 'node:url';
import { readdir, readFile, writeFile } from 'node:fs/promises';
async function visit(dir) {
 for (const e of await readdir(dir, {withFileTypes:true})) {
  const p=dir+'/'+e.name;
  if(e.isDirectory()) await visit(p);
  else if(p.endsWith('.js')) await writeFile(p,(await readFile(p,'utf8')).replace(/from\s+(["'])(\.[^"']+)\1/g,(all,q,spec)=>/\.[a-z]+$/i.test(spec)?all:`from ${q}${spec}.js${q}`));
 }
}
await visit(fileURLToPath(new URL('../runtime',import.meta.url)));
