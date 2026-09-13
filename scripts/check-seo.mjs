import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {loadSource} from './load-source.mjs';
const {publicPages,pageMetadata}=loadSource('src/pageMetadata.ts');
const output=fs.mkdtempSync(path.join(os.tmpdir(),'bladevibe-seo-'));
try{
 fs.copyFileSync('index.html',path.join(output,'index.html'));
 const generate=env=>execFileSync(process.execPath,['scripts/build-seo.mjs',output],{env:{...process.env,SITE_URL:'https://bladevibe.example',SOCIAL_IMAGE_URL:'https://bladevibe.example/social/cover.png',...env},stdio:'pipe'});
 generate();generate(); // Re-running must not duplicate metadata.
 const sitemap=fs.readFileSync(path.join(output,'sitemap.xml'),'utf8');
 for(const page of publicPages){
  const html=fs.readFileSync(path.join(output,page.path==='/'?'index.html':`${page.path.slice(1)}.html`),'utf8');
  assert.equal((html.match(/<title>/g)||[]).length,1);
  assert.equal((html.match(/name="description"/g)||[]).length,1);
  assert.ok(html.includes(`href="https://bladevibe.example${page.path}"`));
  assert.ok(html.includes(`property="og:url" content="https://bladevibe.example${page.path}"`));
  assert.ok(html.includes('property="og:image"'));
  assert.ok(html.includes('content="index, follow"'));
  assert.ok(sitemap.includes(`<loc>https://bladevibe.example${page.path}</loc>`));
 }
 assert.match(fs.readFileSync(path.join(output,'swords/senbonzakura/bankai.html'),'utf8'),/Senbonzakura Bankai/);
 assert.match(fs.readFileSync(path.join(output,'swords/zangetsu/bankai.html'),'utf8'),/Tensa Zangetsu/);
 assert.doesNotMatch(sitemap,/\/edit|#state|studies\/sharingan/);
 assert.match(fs.readFileSync(path.join(output,'swords/senbonzakura/edit.html'),'utf8'),/content="noindex, follow"/);
 assert.match(fs.readFileSync(path.join(output,'404.html'),'utf8'),/content="noindex, follow"/);
 assert.equal(pageMetadata('/swords/senbonzakura/bankai#state=test').path,'/swords/senbonzakura/bankai');
 assert.equal(pageMetadata('/studies/sharingan').path,'/sharingan');
 assert.equal(pageMetadata('/swords/missing').index,false);
 generate({SITE_URL:'',VERCEL_PROJECT_PRODUCTION_URL:'bladevibe-production.vercel.app',SOCIAL_IMAGE_URL:''});
 assert.match(fs.readFileSync(path.join(output,'index.html'),'utf8'),/https:\/\/bladevibe-production.vercel.app\//);
 assert.doesNotMatch(fs.readFileSync(path.join(output,'index.html'),'utf8'),/property="og:image"/);
 generate({SITE_URL:'',VERCEL_PROJECT_PRODUCTION_URL:'',SOCIAL_IMAGE_URL:''});
 assert.equal(fs.existsSync(path.join(output,'sitemap.xml')),false);
 assert.doesNotMatch(fs.readFileSync(path.join(output,'index.html'),'utf8'),/rel="canonical"/);
 assert.throws(()=>generate({SITE_URL:'https://bladevibe.example/not-an-origin'}));
 console.log(`SEO checks passed for ${publicPages.length} public pages, editor exclusions, canonical URLs, social metadata, and 404 output.`);
}finally{fs.rmSync(output,{recursive:true,force:true});}
