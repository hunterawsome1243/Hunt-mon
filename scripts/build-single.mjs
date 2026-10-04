// Bundles the production build into ONE self-contained HTML file (JS, CSS and fonts inlined) - used for the Artifact.
import { build } from 'vite';
import { readFileSync, readdirSync, writeFileSync, mkdirSync } from 'node:fs';
process.env.VITE_SINGLE_FILE = '1';
await build({ logLevel: 'warn', build: { outDir: 'dist-single', assetsInlineLimit: 100_000_000, cssCodeSplit: false, chunkSizeWarningLimit: 5000 } });
const dir = 'dist-single/assets';
const files = readdirSync(dir);
const js = readFileSync(`${dir}/${files.find((f) => f.endsWith('.js'))}`, 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(`${dir}/${files.find((f) => f.endsWith('.css'))}`, 'utf8');
const html = `<title>Hunt-mon</title>
<style>
:root{--bg:#0b0b14}
html,body{margin:0;height:100%;background:var(--bg);overflow:hidden;touch-action:none;-webkit-user-select:none;user-select:none;overscroll-behavior:none}
#game{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
canvas{image-rendering:pixelated;image-rendering:crisp-edges}
${css}
</style>
<div id="game"></div>
<script type="module">${js}</script>
`;
mkdirSync('dist-single', { recursive: true });
writeFileSync('dist-single/hunt-mon.html', html);
console.log('single file', (html.length / 1e6).toFixed(2), 'MB');
