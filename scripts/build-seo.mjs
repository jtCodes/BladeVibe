import fs from 'node:fs';
import path from 'node:path';
import {loadEnv} from 'vite';
import {loadSource} from './load-source.mjs';
const {publicPages,pageMetadata}=loadSource('src/pageMetadata.ts');
const env={...loadEnv('production',process.cwd(),''),...process.env};
const configured=env.SITE_URL||(env.VERCEL_PROJECT_PRODUCTION_URL?`https://${env.VERCEL_PROJECT_PRODUCTION_URL}`:'');
let origin='';
if(configured){
 const url=new URL(configured);
 if(!['http:','https:'].includes(url.protocol)||url.pathname!=='/'||url.search||url.hash||url.username||url.password)throw new Error('SITE_URL must be a site origin, such as https://bladevibe.example.com');
 origin=url.origin;
}
const image=env.SOCIAL_IMAGE_URL||'';
if(image&&!/^https:\/\//.test(image))throw new Error('SOCIAL_IMAGE_URL must be an absolute HTTPS image URL');
const escape=value=>value.replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const output=process.argv[2]||'dist';
const template=fs.readFileSync(path.join(output,'index.html'),'utf8');
function render(page){
 const url=origin?new URL(page.path,origin).href:'';
 const meta=(name,value,property=false)=>`<meta ${property?'property':'name'}="${name}" content="${escape(value)}">`;
 const head=[`<title>${escape(page.title)}</title>`,meta('description',page.description),meta('robots',page.index?'index, follow':'noindex, follow'),meta('og:type','website',true),meta('og:site_name','BladeVibe',true),meta('og:title',page.title,true),meta('og:description',page.description,true),meta('twitter:card',image?'summary_large_image':'summary'),meta('twitter:title',page.title),meta('twitter:description',page.description)];
 if(url)head.push(meta('bladevibe-site-url',origin),`<link rel="canonical" href="${escape(url)}">`,meta('og:url',url,true));
 if(image)head.push(meta('og:image',image,true),meta('og:image:alt','BladeVibe — interactive 3D sword collection',true),meta('twitter:image',image));
 return template.replace(/<!-- page-metadata:start -->[\s\S]*?<!-- page-metadata:end -->/,`<!-- page-metadata:start -->${head.join('\n')}<!-- page-metadata:end -->`);
}
const routes=[...publicPages.map(page=>page.path),...publicPages.filter(page=>/^\/swords\/[^/]+$/.test(page.path)).map(page=>`${page.path}/edit`)];
for(const route of routes){
 const file=path.join(output,route==='/'?'index.html':`${route.slice(1)}.html`);
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,render(pageMetadata(route)));
}
fs.writeFileSync(path.join(output,'404.html'),render(pageMetadata('/404')));
fs.writeFileSync(path.join(output,'robots.txt'),`User-agent: *\nAllow: /\n${origin?`\nSitemap: ${origin}/sitemap.xml\n`:''}`);
if(origin)fs.writeFileSync(path.join(output,'sitemap.xml'),`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${publicPages.map(page=>`\n  <url><loc>${escape(new URL(page.path,origin).href)}</loc></url>`).join('')}\n</urlset>\n`);
else {
 fs.rmSync(path.join(output,'sitemap.xml'),{force:true});
 console.warn('SEO: Set SITE_URL (or build on Vercel) to emit canonical URLs and sitemap.xml.');
}
console.log(`Generated metadata for ${routes.length} routes and a noindex 404 page.`);
