import app from '../src/server.js';

export default function handler(req: any, res: any) {
  // If Vercel rewrote the request to /api, restore the original incoming path so Express routes match
  const originalPath = req.headers['x-matched-path'] || req.headers['x-forwarded-url'];
  if (originalPath && typeof originalPath === 'string') {
    req.url = originalPath;
  }
  return app(req, res);
}
