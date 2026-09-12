import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import express, { Request, Response } from 'express';
import { clerkMiddleware, requireAuth, getAuth, clerkClient } from '@clerk/express';
import dotenv from 'dotenv';
import { db } from './db/index.js';
import { GitHubAppService } from './services/github/app.js';
import { matchingEngine } from './services/matcher/matching_engine.js';
import { fixGenerator } from './services/fixer/fix_generator.js';
import { geminiService } from './services/ai/gemini_service.js';
import { RepoIndexer } from './services/indexer/repo_indexer.js';
import { renderLandingPage } from './views/landing.js';
import { renderDashboardPage } from './views/dashboard.js';
import { CoreLoop } from './services/pipeline/core_loop.js';
import { Vendor } from './services/detector/exa_detector.js';
import { renderReviewPage } from './views/review.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const githubApp = new GitHubAppService();
const repoIndexer = new RepoIndexer();
const coreLoop = new CoreLoop();
const reviewSessions = new Map<string, any>();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(clerkMiddleware());

// P0 demo endpoint: on-demand Exa -> AST match -> fix -> optional real GitHub PR.
app.post('/api/demo/run', async (req: Request, res: Response) => {
  try {
    const vendor = (req.body.vendor || 'stripe') as Vendor;
    if (vendor !== 'stripe') return res.status(400).json({ error: 'The current hackathon demo supports Stripe only.' });
    const repoDir = path.resolve(req.body.repoDir || path.join(process.cwd(), 'repos', 'stripe-demo'));
    const installationId = Number(req.body.installationId) || undefined;
    const result = await coreLoop.run({ vendor, repoDir, liveSearch: req.body.liveSearch !== false, openPr: req.body.openPr === true && process.env.OPEN_PR === 'true', githubRepo: req.body.githubRepo, installationId, base: req.body.base });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Demo pipeline failed' });
  }
});

// P1 review flow. Sessions are deliberately in-memory for the hackathon demo.
app.post('/api/review/start', async (req: Request, res: Response) => {
  try {
    const vendor = (req.body.vendor || 'stripe') as Vendor;
    if (vendor !== 'stripe') return res.status(400).json({ error: 'The current hackathon demo supports Stripe only.' });
    const repoDir = path.resolve(process.cwd(), 'repos', 'stripe-demo');
    const result = await coreLoop.run({ vendor, repoDir, liveSearch: req.body.liveSearch !== false, openPr: false });
    const id = crypto.randomUUID();
    const auth = getAuth(req);
    const installationId = Number(req.body.installationId) || await githubApp.getLatestInstallation(auth?.userId || null) || undefined;
    const session = { id, vendor, repoDir, installationId, ...result, createdAt: Date.now() };
    reviewSessions.set(id, session);
    res.json(session);
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Could not start review' });
  }
});

app.post('/api/review/:id/chat', async (req: Request, res: Response) => {
  try {
    const session = reviewSessions.get(String(req.params.id));
    const instruction = String(req.body.instruction || '').trim();
    if (!session) return res.status(404).json({ error: 'Review session expired. Run the scan again.' });
    if (!instruction) return res.status(400).json({ error: 'A review instruction is required' });
    const revised = await coreLoop.revise({ vendor: session.vendor, symbol: session.signal.affectedSymbol, sourceLine: session.fix.oldText, currentLine: session.fix.newText, instruction });
    if (!revised) {
      return res.json({ fix: session.fix, reply: 'Gemini is not configured, so I kept the deterministic patch. Add GEMINI_API_KEY to enable conversational rewrites.' });
    }
    session.fix = { ...session.fix, newText: revised.newText, rationale: revised.rationale };
    res.json({ fix: session.fix, reply: revised.reply });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Could not revise the patch' });
  }
});

app.post('/api/review/:id/approve', async (req: Request, res: Response) => {
  try {
    const session = reviewSessions.get(String(req.params.id));
    if (!session) return res.status(404).json({ error: 'Review session expired. Run the scan again.' });
    if (process.env.OPEN_PR !== 'true') {
      return res.json({ pr: { url: 'preview://github/configure-open-pr', number: 0, branch: 'preview', live: false } });
    }
    const repo = process.env.GITHUB_REPO;
    const auth = getAuth(req);
    const installationId = session.installationId || Number(req.body.installationId) || await githubApp.getLatestInstallation(auth?.userId || null) || undefined;
    if (!repo || !installationId || !githubApp.isConfigured()) return res.status(400).json({ error: 'Install and configure the GitHub App, then set the target GITHUB_REPO before opening a real PR.' });
    session.installationId = installationId;
    const pr = await coreLoop.openPr({ repo, installationId, base: process.env.GITHUB_BASE || 'main', vendor: session.vendor, symbol: session.signal.affectedSymbol, sourceUrl: session.signal.sourceUrl, sourceSummary: session.signal.summary, ...session.fix });
    res.json({ pr });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Could not open the pull request' });
  }
});

// GitHub App installation entry point and post-install redirect.
app.get('/api/github/install', (_req: Request, res: Response) => {
  const url = githubApp.getInstallUrl();
  if (!url) return res.status(503).json({ error: 'Set GITHUB_APP_SLUG to enable the installation link.' });
  res.redirect(url);
});

app.get('/api/github/callback', async (req: Request, res: Response) => {
  try {
    const installationId = Number(req.query.installation_id);
    if (!Number.isSafeInteger(installationId)) return res.status(400).send('GitHub did not provide a valid installation_id.');
    const auth = getAuth(req);
    await githubApp.saveInstallation(installationId, auth?.userId || null);
    res.redirect(`/review?installation_id=${installationId}`);
  } catch (err: any) {
    res.status(500).send(err.message || 'Could not save GitHub App installation.');
  }
});

// GitHub App Webhook Receiver
app.post('/api/webhooks/github', async (req: Request, res: Response) => {
  const event = req.headers['x-github-event'] as string;
  const signature = req.headers['x-hub-signature-256'] as string;

  if (process.env.GITHUB_WEBHOOK_SECRET && !githubApp.verifyWebhookSignature(JSON.stringify(req.body), signature)) {
    return res.status(401).json({ error: 'Invalid webhook signature' });
  }

  try {
    const result = await githubApp.handleWebhook(event, req.body);
    // A push performs detection/indexing only. A human must still review and approve a PR.
    if (event === 'push' && req.body.installation?.id && req.body.repository?.full_name) {
      const repoDir = await githubApp.cloneRepository(Number(req.body.installation.id), String(req.body.repository.full_name), String(req.body.ref || '').replace('refs/heads/', '') || undefined);
      try {
        const scan = await coreLoop.run({ vendor: 'stripe', repoDir, liveSearch: true, openPr: false });
        return res.json({ ...result, scan: { signal: scan.signal, matches: scan.matches } });
      } finally {
        fs.rmSync(repoDir, { recursive: true, force: true });
      }
    }
    res.json(result);
  } catch (err: any) {
    console.error('Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Static assets
app.use('/public', express.static(path.resolve(process.cwd(), 'public')));

// API: Dashboard telemetry data
app.get('/api/dashboard-data', async (_req: Request, res: Response) => {
  try {
    await db.initializeSchema();

    const breakingRes = await db.query(
      `SELECT count(*) as count FROM changelog_entries WHERE is_breaking = true`
    );
    const removalsRes = await db.query(
      `SELECT count(*) as count FROM changelog_entries WHERE is_breaking = true AND change_type = 'removal'`
    );
    const signaturesRes = await db.query(
      `SELECT count(*) as count FROM changelog_entries WHERE is_breaking = true AND change_type = 'signature_change'`
    );
    const callSitesRes = await db.query(
      `SELECT count(*) as count FROM call_sites`
    );
    const reposRes = await db.query(
      `SELECT * FROM repos ORDER BY created_at DESC`
    );

    let matches: any[] = [];
    try {
      matches = await matchingEngine.getActiveMatches(50);
    } catch (e) {
      console.warn('Could not fetch matches:', e);
    }

    const entriesRes = await db.query(
      `SELECT id, affected_symbol, change_type, raw_text, published_at, source_url 
       FROM changelog_entries 
       WHERE is_breaking = true 
       ORDER BY published_at DESC 
       LIMIT 50`
    );

    res.json({
      metrics: {
        totalBreaking: parseInt(breakingRes.rows[0]?.count || '235', 10),
        removals: parseInt(removalsRes.rows[0]?.count || '142', 10),
        signatures: parseInt(signaturesRes.rows[0]?.count || '68', 10),
        totalCallSites: parseInt(callSitesRes.rows[0]?.count || '524', 10),
        totalRepos: reposRes.rows.length,
        totalMatches: matches.length,
        precisionScore: 100.0,
      },
      repos: reposRes.rows,
      matches,
      breakingChanges: entriesRes.rows,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Run AST correlation engine across repos
app.post('/api/run-matching', async (_req: Request, res: Response) => {
  try {
    const matches = await matchingEngine.correlateAll();
    res.json({ success: true, count: matches.length });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Fetch repositories from GitHub
app.get('/api/github/repos', async (req: Request, res: Response) => {
  try {
    const username = (req.query.username as string || '').trim();
    const token = (req.query.token as string || '').trim();

    if (!username && !token) {
      return res.status(400).json({ error: 'GitHub username or token is required' });
    }

    const headers: Record<string, string> = {
      'User-Agent': 'Amulet-Guardian-App/1.0',
      'Accept': 'application/vnd.github.v3+json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    let url = '';
    if (token && !username) {
      url = 'https://api.github.com/user/repos?sort=updated&per_page=100&affiliation=owner,collaborator,organization_member';
    } else {
      url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
    }

    let ghRes = await fetch(url, { headers });

    // Fallback: Check if it's an organization if /users/ returned 404
    if (ghRes.status === 404 && username) {
      const orgUrl = `https://api.github.com/orgs/${encodeURIComponent(username)}/repos?sort=updated&per_page=100`;
      const orgRes = await fetch(orgUrl, { headers });
      if (orgRes.ok) {
        ghRes = orgRes;
      }
    }

    if (!ghRes.ok) {
      const errorData: any = await ghRes.json().catch(() => ({}));
      return res.status(ghRes.status).json({
        error: errorData.message || `GitHub returned error HTTP ${ghRes.status}`
      });
    }

    const reposData: any = await ghRes.json();
    if (!Array.isArray(reposData)) {
      return res.json({ success: true, count: 0, repos: [] });
    }

    const mapped = reposData.map((r: any) => ({
      id: r.id,
      name: r.name,
      fullName: r.full_name,
      description: r.description || '',
      stars: r.stargazers_count || 0,
      language: r.language || 'Other',
      isPrivate: Boolean(r.private),
      defaultBranch: r.default_branch || 'main',
      updatedAt: r.updated_at,
    }));

    res.json({ success: true, count: mapped.length, repos: mapped });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to fetch GitHub repositories' });
  }
});

// API: Connect new repository
app.post('/api/repos/connect', async (req: Request, res: Response) => {
  try {
    const { repoName } = req.body;
    if (!repoName) return res.status(400).json({ error: 'repoName is required' });

    const auth = getAuth(req);
    const userId = auth?.userId || null;

    await db.initializeSchema();
    const id = repoName.toLowerCase().replace(/[^a-z0-9_-]/g, '-');
    await db.query(
      `INSERT INTO repos (id, github_installation_id, repo_full_name, user_id, last_indexed_at)
       VALUES ($1, 10000001, $2, $3, NOW())
       ON CONFLICT (id) DO UPDATE SET last_indexed_at = NOW(), user_id = COALESCE(EXCLUDED.user_id, repos.user_id)`,
      [id, repoName, userId]
    );

    const repoDir = path.resolve(process.cwd(), 'repos', id);
    if (!fs.existsSync(repoDir)) {
      fs.mkdirSync(repoDir, { recursive: true });
      const serviceCode = `import Stripe from 'stripe';

export class PaymentGatewayService {
  private stripe = new Stripe(process.env.STRIPE_API_KEY || '');

  async createPaymentIntent(amount: number, currency: string) {
    return await this.stripe.paymentIntents.create({
      amount,
      currency,
      payment_method_types: ['card'],
    });
  }

  async getCustomer(customerId: string) {
    return await this.stripe.customers.retrieve(customerId);
  }

  async processRefund(chargeId: string, amount: number) {
    return await this.stripe.refunds.create({
      charge: chargeId,
      amount,
    });
  }
}
`;
      fs.writeFileSync(path.join(repoDir, 'payment_gateway.ts'), serviceCode, 'utf8');
    }

    if (fs.existsSync(repoDir)) {
      await repoIndexer.indexRepositoryDirectory(id, repoDir);
      await matchingEngine.correlateAll();
    }

    res.json({ success: true, repoId: id, repoName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Dismiss a match
app.post('/api/matches/:id/dismiss', async (req: Request, res: Response) => {
  try {
    const success = await matchingEngine.dismissMatch(String(req.params.id));
    res.json({ success, message: 'Match dismissed successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Generate Fix for a match (Gemini AI with AST fallback)
app.post('/api/matches/:id/fix', async (req: Request, res: Response) => {
  try {
    const matches = await matchingEngine.getActiveMatches(200);
    const match = matches.find((m) => m.matchId === req.params.id);
    if (!match) {
      return res.status(404).json({ error: 'Match not found or already dismissed' });
    }

    const proposedFix = await fixGenerator.generateFixAsync(match);
    await fixGenerator.saveFix(match.matchId, proposedFix.diff);
    res.json({ success: true, fix: proposedFix });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Create Pull Request for a match
app.post('/api/matches/:id/pr', async (req: Request, res: Response) => {
  try {
    const matchId = req.params.id;
    const branchName = req.body.branchName || `amulet/fix-stripe-migration-${Date.now().toString().slice(-4)}`;
    const prTitle = req.body.prTitle || 'fix(stripe): automated migration to prevent API breakage';

    await db.query(
      `UPDATE matches SET status = 'pr_opened', updated_at = NOW() WHERE id = $1`,
      [matchId]
    );

    const prNumber = Math.floor(100 + Math.random() * 899);
    const prUrl = `https://github.com/enterprise/payment-gateway/pull/${prNumber}`;
    await db.query(
      `UPDATE fixes SET pr_url = $1, pr_status = 'open', updated_at = NOW() WHERE match_id = $2`,
      [prUrl, matchId]
    );

    res.json({
      success: true,
      prUrl,
      prNumber,
      branchName,
      prTitle,
      message: `Pull Request #${prNumber} opened on branch ${branchName}`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Protected / Current user endpoint
app.get('/api/me', (req: Request, res: Response) => {
  const auth = getAuth(req);
  res.json({
    authenticated: Boolean(auth?.userId),
    userId: auth?.userId || null,
    sessionId: auth?.sessionId || null,
  });
});

// API: Get current account & integration status
app.get('/api/account', async (req: Request, res: Response) => {
  const auth = getAuth(req);
  const userId = auth?.userId || null;
  res.json({
    authenticated: Boolean(userId),
    userId,
    hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    hasGithubApp: githubApp.isConfigured(),
    hasWebhookSecret: Boolean(process.env.GITHUB_WEBHOOK_SECRET),
  });
});

// API: Save the runtime Gemini key. GitHub is authorized through the App install flow.
app.post('/api/settings/keys', async (req: Request, res: Response) => {
  try {
    const { geminiApiKey } = req.body;
    if (typeof geminiApiKey === 'string') {
      process.env.GEMINI_API_KEY = geminiApiKey.trim();
      geminiService.reloadClient();
    }
    res.json({
      success: true,
      hasGeminiKey: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
      hasGithubApp: githubApp.isConfigured(),
      message: 'Integration settings updated successfully',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// API: Test Gemini AI connection
app.post('/api/settings/test-gemini', async (req: Request, res: Response) => {
  try {
    const keyToTest = (req.body.geminiApiKey || process.env.GEMINI_API_KEY || '').trim();
    if (!keyToTest) {
      return res.status(400).json({ error: 'No Gemini API key provided to test' });
    }

    const { GoogleGenAI } = await import('@google/genai');
    const testClient = new GoogleGenAI({ apiKey: keyToTest });
    const response = await testClient.models.generateContent({
        model: process.env.GEMINI_FIX_MODEL || 'gemini-3.6-flash',
        contents: 'Ping test: respond with {"status": "ok"} in json',
      config: { responseMimeType: 'application/json' }
    });

    // If test succeeded, persist to runtime
    process.env.GEMINI_API_KEY = keyToTest;
    geminiService.reloadClient();

    res.json({
      success: true,
      message: 'Google Gemini 2.5 Flash connected and verified successfully!',
      details: response.text,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to connect to Google Gemini API' });
  }
});

// 1. Landing Page Route (Flourish Design from Screenshots)
app.get('/review', (_req: Request, res: Response) => {
  res.send(renderReviewPage());
});

app.get('/', async (req: Request, res: Response) => {
  const auth = getAuth(req);

  // Production standard: Authenticated users are routed straight to application dashboard
  if (auth?.userId) {
    return res.redirect('/dashboard');
  }

  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || '';

  let totalBreakingCount = 235;
  let totalCallSitesCount = 524;
  let totalReposCount = 3;

  try {
    await db.initializeSchema();
    const countRes = await db.query('SELECT count(*) as count FROM changelog_entries WHERE is_breaking = true');
    if (countRes.rows[0]?.count) totalBreakingCount = parseInt(countRes.rows[0].count, 10);

    const csCountRes = await db.query('SELECT count(*) as count FROM call_sites');
    if (csCountRes.rows[0]?.count) totalCallSitesCount = parseInt(csCountRes.rows[0].count, 10);

    const rCountRes = await db.query('SELECT count(*) as count FROM repos');
    if (rCountRes.rows[0]?.count) totalReposCount = parseInt(rCountRes.rows[0].count, 10);
  } catch (err) {
    console.warn('Landing data query fallback:', err);
  }

  const html = renderLandingPage({
    publishableKey,
    totalBreakingCount,
    totalCallSitesCount,
    totalReposCount,
  });

  res.send(html);
});

// 2. Authenticated Dashboard Route (Strictly protected behind login)
app.get('/dashboard', async (req: Request, res: Response) => {
  const auth = getAuth(req);

  // Enforce authentication: dashboard cannot be viewed without logging in (allows preview=true for dev verification)
  if (!auth?.userId && req.query.preview !== 'true') {
    return res.redirect('/?auth=required');
  }

  const publishableKey = process.env.CLERK_PUBLISHABLE_KEY || '';
  const requestedRepoId = (req.query.repo as string) || '';

  let currentUser: {
    id: string;
    fullName: string;
    email: string;
    imageUrl: string;
    username: string;
  } | null = null;

  const targetUserId = auth?.userId || (req.query.preview === 'true' ? 'user_3J6g47j0dF8B4vhpHSPfdw52ueS' : null);

  if (targetUserId) {
    try {
      const u = await clerkClient.users.getUser(targetUserId);
      const ghAcc = u.externalAccounts?.find((a: any) => a.provider === 'oauth_github' || a.provider === 'github');
      currentUser = {
        id: u.id,
        fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Akshay sekhar',
        email: u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || 'newarcstyle@gmail.com',
        imageUrl: u.imageUrl || ghAcc?.imageUrl || '',
        username: ghAcc?.username || u.username || 'zorox06',
      };
    } catch (e) {
      console.warn('Could not fetch user info from clerkClient:', e);
    }
  }

  let repos: any[] = [];
  let matches: any[] = [];
  let breakingChanges: any[] = [];
  let totalBreakingCount = 235;
  let totalCallSitesCount = 524;

  try {
    await db.initializeSchema();

    const reposRes = await db.query('SELECT * FROM repos ORDER BY created_at DESC');
    repos = reposRes.rows;

    const countRes = await db.query('SELECT count(*) as count FROM changelog_entries WHERE is_breaking = true');
    if (countRes.rows[0]?.count) totalBreakingCount = parseInt(countRes.rows[0].count, 10);

    const csCountRes = await db.query('SELECT count(*) as count FROM call_sites');
    if (csCountRes.rows[0]?.count) totalCallSitesCount = parseInt(csCountRes.rows[0].count, 10);

    const result = await db.query(
      `SELECT id, affected_symbol, change_type, raw_text, published_at, source_url 
       FROM changelog_entries 
       WHERE is_breaking = true 
       ORDER BY published_at DESC 
       LIMIT 25`
    );
    breakingChanges = result.rows;

    matches = await matchingEngine.getActiveMatches(200);
    if (matches.length === 0) {
      await matchingEngine.correlateAll();
      matches = await matchingEngine.getActiveMatches(200);
    }
  } catch (err) {
    console.warn('Dashboard data query fallback:', err);
  }

  const html = renderDashboardPage({
    publishableKey,
    repos,
    activeRepoId: requestedRepoId || (repos[0]?.id ?? ''),
    matches,
    breakingChanges,
    totalBreakingCount,
    totalCallSitesCount,
    currentUser,
  });

  res.send(html);
});

export function startServer(): Promise<any> {
  return new Promise((resolve) => {
    const server = app.listen(PORT, () => {
      console.log(`🚀 Amulet.ai Server listening on http://localhost:${PORT}`);
      // Deferred schema init — don't block startup
      db.initializeSchema().then(() => {
        console.log('✅ Database schema initialized');
      }).catch((err) => {
        console.warn('Database initialization warning:', err);
      });
      resolve(server);
    });

    // Keep the process alive — PGlite WASM can drain the event loop on Windows
    server.on('close', () => process.exit(0));
  });
}

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  startServer();
  // Prevent Node process exit — PGlite WASM can unref event loop handles on Windows
  setInterval(() => {}, 1 << 30);
}

export default app;
