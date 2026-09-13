import {readFile,writeFile} from 'node:fs/promises';
import {gzipSync,gunzipSync} from 'node:zlib';
import {loadSource} from './load-source.mjs';
const {createMetalWearPixels}=loadSource('src/scene/metalWearPattern.ts');
const bytes=Buffer.from(createMetalWearPixels()),file=new URL('../src/assets/surfaces/metal-wear.bin',import.meta.url);
if(process.argv.includes('--check')){
 if(!gunzipSync(await readFile(file)).equals(bytes))throw new Error('Metal wear asset is stale; run npm run assets:bake');
 console.log('Metal wear: deterministic baked masks match.');
}else{
 const compressed=gzipSync(bytes,{level:9});await writeFile(file,compressed);
 console.log(`Metal wear: ${bytes.length} bytes -> ${compressed.length} compressed bytes.`);
}
