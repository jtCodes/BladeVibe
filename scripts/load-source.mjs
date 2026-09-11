import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import ts from 'typescript';
const require=createRequire(import.meta.url),modules=new Map();
// Execute the project's pure geometry/math helpers in the asset baker without
// maintaining a second copy of their algorithms or shipping a Node loader.
export function loadSource(filename){
 filename=path.resolve(filename);
 if(modules.has(filename))return modules.get(filename).exports;
 const module={exports:{}};modules.set(filename,module);
 const {outputText}=ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}});
 const localRequire=specifier=>specifier.startsWith('.')?loadSource(path.resolve(path.dirname(filename),`${specifier}.ts`)):require(specifier);
 new Function('require','module','exports',outputText)(localRequire,module,module.exports);
 return module.exports;
}
