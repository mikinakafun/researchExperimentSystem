// Offline browser fixture: proxy the real local UI, replace only API calls,
// and keep synthetic results in memory. Never contact OpenAI or write study data.
// Usage: npm run build && npm start -- --port 3200
// Then: node tests/ui-fixture-server.cjs (fixture on 3100).
const http = require('node:http');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText, filename);
};
const { fallbackQuestion } = require('../app/api/fallback-questions.ts');
const { PROMPT_CONFIG } = require('../app/api/prompt-config.ts');
const { isLanguage, joinNarrative } = require('../lib/language.ts');
const { parseResultData } = require('../lib/result-validation.ts');
const requests = [];
const results = [];

function json(res, status, data) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(data));
}

http.createServer(async (req, res) => {
  if (req.url === '/__test__/status') return json(res, 200, { requests, results });
  if (req.url.startsWith('/api/')) {
    try {
      let raw = '';
      for await (const chunk of req) raw += chunk;
      const body = JSON.parse(raw);
      if (!isLanguage(body.language)) return json(res, 400, { error: 'Explicit language is required in this fixture.' });
      requests.push({ path: req.url, language: body.language, turn: body.turn });
      if (req.url === '/api/follow-up') {
        // Deterministic error path, with no provider call.
        if (body.fragment === 'offline-error') return json(res, 503, { error: 'OPENAI_API_KEY is not configured on the server.' });
        return json(res, 200, { ...fallbackQuestion(body), language: body.language, promptVersion: PROMPT_CONFIG.version, source: 'fallback', model: 'fallback', requestId: null, attempts: 3, diagnostics: { rejections: [1, 2, 3].map((attempt) => ({ attempt, flags: ['offline_fixture'] })) } });
      }
      if (req.url === '/api/narrative') {
        const sentences = (body.language === 'en'
          ? ['I walked through the park with a friend.', 'We said goodbye and went home.']
          : ['友人と公園を歩いた。', '別れを告げて家に帰った。']
        ).map((text) => ({ text, sourceIds: ['fragment'], containsCreativeAddition: true }));
        return json(res, 200, { language: body.language, narrative: joinNarrative(sentences, body.language), sentences, promptVersion: PROMPT_CONFIG.version, source: 'generated', model: 'offline-fixture', requestId: 'offline-narrative', attempts: 1, diagnostics: { rejections: [] } });
      }
      if (req.url === '/api/save-result') {
        if (!parseResultData(body)) return json(res, 400, { error: 'Invalid result payload.' });
        results.push(body);
        return json(res, 200, { saved: true, language: body.language });
      }
      return json(res, 404, { error: 'Unknown fixture route.' });
    } catch (error) { return json(res, 500, { error: String(error) }); }
  }
  const upstream = http.request({
    hostname: 'localhost', port: 3200, path: req.url, method: req.method,
    headers: { ...req.headers, host: 'localhost:3200' },
  }, (response) => { res.writeHead(response.statusCode, response.headers); response.pipe(res); });
  upstream.on('error', () => json(res, 502, { error: 'Start the real app on port 3200 first.' }));
  req.pipe(upstream);
}).listen(3100, '127.0.0.1', () => console.log('Offline UI fixture: http://127.0.0.1:3100 (no external API calls or CSV writes)'));
