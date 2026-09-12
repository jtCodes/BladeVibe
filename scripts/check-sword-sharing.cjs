// Run with: node scripts/check-sword-sharing.cjs (no browser or renderer required).
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const ts=require('typescript'),root=path.resolve(__dirname,'..'),cache=new Map();
function load(relative){
 const file=path.resolve(root,'src',relative);if(cache.has(file))return cache.get(file);
 const module={exports:{}};
 const code=ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
 new Function('require','module','exports',code)(name=>load(path.relative(path.join(root,'src'),path.resolve(path.dirname(file),name+'.ts'))),module,module.exports);
 cache.set(file,module.exports);return module.exports;
}
const {swords}=load('swordLibrary.ts');
const {defaultSwordState,normalizeSwordState,readSwordShare,swordSharePath,readSwordPageState}=load('swordShare.ts');
const encode=raw=>'#state='+Buffer.from(JSON.stringify(raw)).toString('base64url');
for(const sword of swords){
 const state={...defaultSwordState(sword),effect:sword.model==='longsword'?'flame':'bankai',time:32.75,paused:true,
  draw:37,backgroundColor:'#abc123',floorColor:'#123abc',swordRotation:47,glowStrength:1.1,petalGlow:5,
  lighting:{brightness:1.4,key:2,fill:3,rim:.3,ambient:.6},view:{camera:[2,5,22],target:[0,1,0],rotation:[0,.6,0,.8]}};
 for(const editing of [false,true]){
  const url=swordSharePath(sword,state,editing),hash=url.slice(url.indexOf('#'));
  assert(url.startsWith('/swords/'+sword.id+(editing?'/edit#':sword.model==='longsword'?'#':'/bankai#')));
  const decoded=readSwordShare(sword,hash);
  assert.equal(decoded.invalid,false);assert.deepEqual(decoded.state,normalizeSwordState(sword,state));
  assert(hash.length<2500,'bounded ordinary URL size');
 }
 const wrong=sword.model==='longsword'?'bankai':'flame';
 assert.equal(normalizeSwordState(sword,{effect:wrong}).effect,sword.effect);
 for(const hash of ['#state=','#state=bad!','#state='+ 'a'.repeat(10001),encode({version:2,sword:sword.id}),encode({version:1,sword:'unknown'}),encode([])]){
  assert.deepEqual(readSwordShare(sword,hash),{state:defaultSwordState(sword),invalid:true});
 }
 assert.equal(readSwordShare(sword,'').invalid,false);
}
const senbo=swords.find(s=>s.model==='senbonzakura');
const hostile=normalizeSwordState(senbo,{effect:'bankai',time:Infinity,effectIntensity:99,effectSpeed:-3,draw:0,paused:'true',showSheath:0,
 backgroundColor:'url(javascript:alert(1))',lighting:{key:NaN,fill:Infinity,ambient:-3},view:{camera:[0,0,0],target:[0,0,0],rotation:[0,0,0,0]}});
assert.equal(hostile.effectIntensity,2);assert.equal(hostile.effectSpeed,0);assert.equal(hostile.time,0);
assert.equal(hostile.draw,100);assert.equal(hostile.paused,false);assert.equal(hostile.showSheath,true);
assert.equal(hostile.backgroundColor,'#03050d');assert.deepEqual(hostile.lighting,{brightness:1,key:1,fill:1,rim:1,ambient:0});assert.equal(hostile.view,undefined);
assert.equal(normalizeSwordState(senbo,{effect:'bankai',time:1000}).time,120);
const optional=readSwordShare(senbo,encode({version:1,sword:senbo.id,effect:'shikai',time:9,unexpected:'ignored'}));
assert.equal(optional.invalid,false);assert.equal(optional.state.view,undefined);assert.equal(optional.state.time,9);assert(!('unexpected' in optional.state));
const normalized=normalizeSwordState(senbo,{view:{camera:[2,3,4],target:[0,0,0],rotation:[0,0,.5,.5]}});
assert(Math.abs(Math.hypot(...normalized.view.rotation)-1)<1e-12);
console.log('PASS: all sword URL round-trips, model-specific effects, late timeline snapshots, optional views, invalid/oversized links, finite bounds, colors, booleans and quaternion normalization.');

for(const sword of swords){
 for(const form of ['bankai','shikai']){
  const state=readSwordPageState(sword,'',form).state;
  const expected=sword.model==='senbonzakura'?form:sword.model==='zangetsu'?(form==='bankai'?'bankai':'off'):sword.effect;
  assert.equal(state.effect,expected);assert.equal(state.time,0);assert.equal(state.paused,false);
 }
}
const bankaiState={...defaultSwordState(senbo),effect:'bankai',time:7.2,paused:true};
assert.equal(readSwordPageState(senbo,encode(bankaiState),'bankai').state.time,7.2);
const shikaiState=readSwordPageState(senbo,encode(bankaiState),'shikai').state;
assert.equal(shikaiState.effect,'shikai');assert.equal(shikaiState.time,0);assert.equal(shikaiState.paused,false);
console.log('PASS: form defaults, unsupported forms, matching shared moments and route precedence.');
