import type { Request, Response } from 'express';
import app from '../server';

export default function handler(req: Request, res: Response) {
  // Normalize incoming URL for Express router on Vercel
  const original = req.url || '';
  const matchedPath = (req.headers['x-matched-path'] as string) || '';

  if (matchedPath && matchedPath.startsWith('/api') && (original === '/api' || original === '/' || original === '')) {
    req.url = matchedPath;
  } else if (original && !original.startsWith('/api')) {
    req.url = '/api' + (original.startsWith('/') ? original : '/' + original);
  }

  return app(req, res);
}
