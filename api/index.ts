import app from '../server';

export default function handler(req: any, res: any) {
  try {
    // Detect if Vercel rewrote the URL or stripped /api prefix
    const matchedPath =
      req.headers['x-matched-path'] ||
      req.headers['x-vercel-matched-path'] ||
      req.headers['x-forwarded-uri'] ||
      req.headers['x-original-url'];

    if (typeof matchedPath === 'string' && matchedPath.startsWith('/api/')) {
      req.url = matchedPath;
    } else if (typeof req.headers['x-now-route-matches'] === 'string') {
      const match = req.headers['x-now-route-matches'].match(/1=([^&]+)/);
      if (match && match[1]) {
        const subPath = decodeURIComponent(match[1]);
        req.url = '/api/' + subPath.replace(/^\//, '');
      }
    } else if (req.url && !req.url.startsWith('/api')) {
      req.url = '/api' + (req.url.startsWith('/') ? req.url : '/' + req.url);
    }
  } catch (e) {
    console.warn('[Vercel API Wrapper] Path resolution:', e);
  }

  return app(req, res);
}

