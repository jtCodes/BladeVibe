import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadSource} from './load-source.mjs';
const {BANKAI_VOICE_CUES:cues,BANKAI_AUDIO_DURATION}=loadSource('src/bankaiVoiceCues.ts');
const {BANKAI_FORMATION_START:start,BANKAI_PETAL_RELEASE_TIME:release,bankaiFormationTime}=loadSource('src/scene/bankaiTiming.ts');
const {BANKAI_DISSOLVE_AT:dissolve,BANKAI_RISE_END:rise}=loadSource('src/scene/sakuraLayout.ts');
assert.ok(Math.abs(bankaiFormationTime(9-start)-rise)<1e-8,'Last blade finishes rising at 9 seconds');
assert.ok(bankaiFormationTime(8.99-start)<rise,'Cage is still rising immediately before 9 seconds');
assert.ok(Math.abs(bankaiFormationTime(release-start)-dissolve)<1e-8);
assert.ok(bankaiFormationTime(cues.name.start-start)>=rise,'Cage must be complete during the name');
assert.ok(bankaiFormationTime(cues.subtitle.end-start)<dissolve,'Breakup follows the completed name');
assert.ok(BANKAI_AUDIO_DURATION>cues.subtitle.end);
let previous=-Infinity;
for(let t=0;t<25;t+=.01){const now=bankaiFormationTime(t-start);assert.ok(now>=previous);previous=now;}
assert.ok(fs.statSync('src/assets/audio/senbonzakura-sequence.m4a').size>100000);
console.log('Bankai: uncut soundtrack asset, name over completed cage, and subsequent breakup checks passed.');
const {bankaiSwordDepth,BANKAI_RELEASE_TIME,BANKAI_SWORD_CONTACT_TIME,BANKAI_SWORD_SUBMERGED_TIME}=loadSource('src/scene/bankaiTiming.ts');
assert.ok(BANKAI_SWORD_CONTACT_TIME<=1,'Sword reaches the floor within the opening drop sound');
for(const distance of [.1,.5,1]){
 const sink=1.7;
 assert.equal(bankaiSwordDepth(BANKAI_RELEASE_TIME,distance,sink),0);
 assert.equal(bankaiSwordDepth(BANKAI_SWORD_CONTACT_TIME,distance,sink),distance);
 assert.ok(Math.abs(bankaiSwordDepth(BANKAI_SWORD_SUBMERGED_TIME,distance,sink)-distance-sink)<1e-10);
 let last=0;
 for(let t=0;t<5;t+=.01){const depth=bankaiSwordDepth(t,distance,sink);assert.ok(depth>=last-1e-10,'Drop and sink never reverse');last=depth;}
}
console.log('Sword sound sync: first-second drop, complete submersion at 3s, monotonic motion passed.');
const {BANKAI_DISSOLVE_END:end}=loadSource('src/scene/sakuraLayout.ts');
assert.ok(Math.abs(bankaiFormationTime(21-start)-end)<1e-8,'All blades dissolve at 21s');
assert.ok(bankaiFormationTime(20-start)<end,'Blades remain at 20s');
assert.ok(bankaiFormationTime(20.9-start)-bankaiFormationTime(20.8-start)>bankaiFormationTime(19.9-start)-bankaiFormationTime(19.8-start),'Breakup accelerates after 20s');
