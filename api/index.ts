// Global polyfills for serverless Node execution (Vercel)
if (typeof (globalThis as any).DOMMatrix === 'undefined') {
  (globalThis as any).DOMMatrix = class DOMMatrix {
    a = 1; b = 0; c = 0; d = 1; e = 0; f = 0;
    m11 = 1; m12 = 0; m13 = 0; m14 = 0;
    m21 = 0; m22 = 1; m23 = 0; m24 = 0;
    m31 = 0; m32 = 0; m33 = 1; m34 = 0;
    m41 = 0; m42 = 0; m43 = 0; m44 = 1;
    is2D = true;
    isIdentity = true;
    constructor(_init?: any) {}
  };
}
if (typeof (globalThis as any).ImageData === 'undefined') {
  (globalThis as any).ImageData = class ImageData {
    width = 0;
    height = 0;
    data = new Uint8ClampedArray(0);
    constructor(w: number, h: number) { this.width = w; this.height = h; }
  };
}
if (typeof (globalThis as any).Path2D === 'undefined') {
  (globalThis as any).Path2D = class Path2D {
    constructor() {}
  };
}

import app from '../server.ts';

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

    // Safety timeout to prevent function from hanging indefinitely
    const timeout = setTimeout(finish, 50000);

    res.on('finish', () => {
      clearTimeout(timeout);
      finish();
    });
    res.on('close', () => {
      clearTimeout(timeout);
      finish();
    });
    res.on('error', (err: any) => {
      clearTimeout(timeout);
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
      } else if (req.query && (req.query['0'] || req.query['1'] || req.query['path'])) {
        const wildcard = req.query['0'] || req.query['1'] || req.query['path'];
        req.url = '/api/' + String(wildcard).replace(/^\//, '');
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

