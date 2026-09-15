import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadSource} from './load-source.mjs';
const {BANKAI_VOICE_CUES:cues,BANKAI_AUDIO_DURATION}=loadSource('src/bankaiVoiceCues.ts');
const {BANKAI_FORMATION_START:start,BANKAI_PETAL_RELEASE_TIME:release,bankaiFormationTime}=loadSource('src/scene/bankaiTiming.ts');
const {BANKAI_DISSOLVE_AT:dissolve,BANKAI_RISE_END:rise}=loadSource('src/scene/sakuraLayout.ts');
assert.ok(Math.abs(bankaiFormationTime(release-start)-dissolve)<1e-8);
assert.ok(bankaiFormationTime(cues.name.start-start)>=rise,'Cage must be complete during the name');
assert.ok(bankaiFormationTime(cues.subtitle.end-start)<dissolve,'Breakup follows the completed name');
assert.ok(BANKAI_AUDIO_DURATION>cues.subtitle.end);
let previous=-Infinity;
for(let t=0;t<25;t+=.01){const now=bankaiFormationTime(t-start);assert.ok(now>=previous);previous=now;}
assert.ok(fs.statSync('src/assets/audio/senbonzakura-sequence.m4a').size>100000);
console.log('Bankai: uncut soundtrack asset, name over completed cage, and subsequent breakup checks passed.');
