const app = require('../dist/server.cjs').default || require('../dist/server.cjs');

module.exports = function handler(req, res) {
  const original = req.url || '';
  const matchedPath = req.headers['x-matched-path'] || '';

  if (matchedPath && matchedPath.startsWith('/api') && (original === '/api' || original === '/' || original === '')) {
    req.url = matchedPath;
  } else if (original && !original.startsWith('/api')) {
    req.url = '/api' + (original.startsWith('/') ? original : '/' + original);
  }

  return app(req, res);
};
