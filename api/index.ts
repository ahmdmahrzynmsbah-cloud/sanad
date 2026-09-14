import app from '../server';

// Process-level shields against unhandled rejections and stream exceptions on Vercel
if (typeof process !== 'undefined') {
  process.on('unhandledRejection', (reason) => {
    console.error('[Vercel Global unhandledRejection]:', reason);
  });
  process.on('uncaughtException', (err) => {
    console.error('[Vercel Global uncaughtException]:', err);
  });
}

export default async function handler(req: any, res: any) {
  return new Promise((resolve) => {
    let resolved = false;
    const finish = () => {
      if (!resolved) {
        resolved = true;
        resolve(undefined);
      }
    };

    res.on('finish', finish);
    res.on('close', finish);
    res.on('error', (err: any) => {
      console.error('[Vercel Response Error]:', err);
      finish();
    });

    try {
      // Body parsing fallback: ensure string or buffer bodies are converted to objects
      if (typeof req.body === 'string' && req.body.trim()) {
        try {
          req.body = JSON.parse(req.body);
          (req as any)._body = true;
        } catch {
          // Keep raw if not valid JSON
        }
      } else if (Buffer.isBuffer(req.body)) {
        try {
          req.body = JSON.parse(req.body.toString('utf-8'));
          (req as any)._body = true;
        } catch {
          // Keep raw
        }
      }

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

      app(req, res);
    } catch (err: any) {
      console.error('[Vercel Handler Crash Caught]:', err);
      if (!res.headersSent) {
        res.status(500).json({
          error: 'خطأ داخلي في الخادم: ' + (err?.message || 'خطأ غير معروف'),
        });
      }
      finish();
    }
  });
}

