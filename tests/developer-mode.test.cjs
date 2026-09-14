const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => { module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText, filename); };
const { isDeveloperModeEnabled } = require('../lib/developer-mode.ts');
test('developer mode requires an explicit developer=1 query parameter', () => {
  assert.equal(isDeveloperModeEnabled(''), false);
  assert.equal(isDeveloperModeEnabled('?developer=1'), true);
  assert.equal(isDeveloperModeEnabled('?developer=0'), false);
  assert.equal(isDeveloperModeEnabled('?developer=true'), false);
  assert.equal(isDeveloperModeEnabled('?foo=1&developer=1'), true);
});
