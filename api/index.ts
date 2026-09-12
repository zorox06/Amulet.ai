import app from '../src/server.js';

export default function handler(req: any, res: any) {
  try {
    // Handle Vercel rewrite headers to ensure Express routes match the requested URL
    const originalUrl =
      req.headers['x-matched-path'] ||
      req.headers['x-forwarded-url'] ||
      req.headers['x-vercel-rewrite-target'] ||
      req.headers['x-original-url'];

    if (originalUrl && typeof originalUrl === 'string' && originalUrl !== '/api' && originalUrl !== '/api/') {
      req.url = originalUrl;
    } else if (req.url === '/api' || req.url === '/api/') {
      // If root path was rewritten to /api without subpath, route to landing page '/'
      req.url = '/';
    }

    return app(req, res);
  } catch (err: any) {
    console.error('Serverless function error caught in handler:', err);
    if (!res.headersSent) {
      res.status(500).json({
        error: 'Serverless invocation error',
        message: err?.message || String(err),
      });
    }
  }
}
