import appModule from '../dist/server.cjs';
const app = appModule.default || appModule;

export default function handler(req, res) {
  const original = req.headers['x-now-route-matches'] || req.url;
  const matchedPath = req.headers['x-matched-path'];
  
  if (matchedPath && matchedPath.startsWith('/api') && (req.url === '/api' || req.url === '/' || req.url === '')) {
    req.url = matchedPath;
  } else if (req.url && !req.url.startsWith('/api')) {
    req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  
  return app(req, res);
}
