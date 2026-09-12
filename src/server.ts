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
import { GitHubPrService } from './services/github/pr_service.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const githubApp = new GitHubAppService();
const prService = new GitHubPrService(githubApp);
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
    if (vendor !== 'stripe') return res.status(400).json({ error: 'Amulet currently supports Stripe breaking changes.' });

    const auth = getAuth(req);
    const installationId = Number(req.body.installationId) || (await githubApp.getLatestInstallation(auth?.userId || null)) || undefined;
    const githubRepo = req.body.githubRepo || process.env.GITHUB_REPO;

    let repoDir = req.body.repoDir;
    let tempDir = false;

    if (!repoDir && githubRepo && installationId && githubApp.isConfigured()) {
      repoDir = await githubApp.cloneRepository(installationId, githubRepo);
      tempDir = true;
    }

    if (!repoDir) {
      return res.status(400).json({ error: 'No repository provided. Please connect a GitHub repository first.' });
    }

    try {
      const result = await coreLoop.run({
        vendor,
        repoDir,
        liveSearch: req.body.liveSearch !== false,
        openPr: req.body.openPr === true && process.env.OPEN_PR === 'true',
        githubRepo,
        installationId,
        base: req.body.base,
      });
      res.json({ success: true, ...result });
    } finally {
      if (tempDir && repoDir && fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true, force: true });
      }
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Pipeline run failed' });
  }
});

// P1 review flow. Sessions are in-memory for active reviews.
app.post('/api/review/start', async (req: Request, res: Response) => {
  try {
    const vendor = (req.body.vendor || 'stripe') as Vendor;
    if (vendor !== 'stripe') return res.status(400).json({ error: 'Amulet currently supports Stripe breaking changes.' });

    const auth = getAuth(req);
    const installationId = Number(req.body.installationId) || (await githubApp.getLatestInstallation(auth?.userId || null)) || undefined;

    let targetRepo = req.body.repoFullName || req.body.repo;
    if (!targetRepo) {
      await db.initializeSchema();
      const dbRepo = await db.query('SELECT repo_full_name, github_installation_id FROM repos ORDER BY last_indexed_at DESC LIMIT 1');
      if (dbRepo.rows[0]) {
        targetRepo = dbRepo.rows[0].repo_full_name;
      }
    }

    let repoDir = '';
    let tempDir = false;

    if (targetRepo && installationId && githubApp.isConfigured()) {
      repoDir = await githubApp.cloneRepository(installationId, targetRepo);
      tempDir = true;
    } else {
      return res.status(400).json({
        error: 'No connected repository found. Please connect your GitHub repository on the dashboard to run a live scan.',
      });
    }

    try {
      const result = await coreLoop.run({
        vendor,
        repoDir,
        liveSearch: req.body.liveSearch !== false,
        openPr: false,
        githubRepo: targetRepo,
        installationId,
      });
      const id = crypto.randomUUID();
      const session = { id, vendor, repoDir: tempDir ? targetRepo : repoDir, targetRepo, installationId, ...result, createdAt: Date.now() };
      reviewSessions.set(id, session);
      res.json(session);
    } finally {
      if (tempDir && repoDir && fs.existsSync(repoDir)) {
        fs.rmSync(repoDir, { recursive: true, force: true });
      }
    }
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
        totalBreaking: parseInt(breakingRes.rows[0]?.count || '0', 10),
        removals: parseInt(removalsRes.rows[0]?.count || '0', 10),
        signatures: parseInt(signaturesRes.rows[0]?.count || '0', 10),
        totalCallSites: parseInt(callSitesRes.rows[0]?.count || '0', 10),
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
    const id = repoName.toLowerCase().replace(/[^a-z0-9_.-]/g, '-');
    const installationId = (await githubApp.getLatestInstallation(userId)) || 0;

    await db.query(
      `INSERT INTO repos (id, github_installation_id, repo_full_name, user_id, last_indexed_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (id) DO UPDATE SET last_indexed_at = NOW(), user_id = COALESCE(EXCLUDED.user_id, repos.user_id)`,
      [id, installationId, repoName, userId]
    );

    // Live indexing directly from GitHub via the Contents API
    const parts = repoName.split('/');
    if (parts.length === 2) {
      const [owner, repo] = parts;
      try {
        await githubApp.indexRemoteRepositoryViaAPI(installationId, owner, repo, '', id);
        await matchingEngine.correlateAll();
      } catch (scanErr: any) {
        console.warn(`Could not index remote GitHub repository ${repoName}:`, scanErr?.message || scanErr);
      }
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

// API: Create Pull Request for a match (Live GitHub PR)
app.post('/api/matches/:id/pr', async (req: Request, res: Response) => {
  try {
    const matchId = req.params.id;
    const branchName = req.body.branchName || `amulet/migration-${Date.now().toString().slice(-4)}`;
    const prTitle = req.body.prTitle || 'fix: automated migration to prevent API breakage';

    const matchRes = await db.query(
      `SELECT m.id, m.changelog_entry_id, m.call_site_id, cs.file_path, cs.line_number, cs.snippet, cs.stripe_symbol, cs.repo_id, r.repo_full_name, r.github_installation_id, ce.affected_symbol, ce.source_url, ce.raw_text, ce.change_type, f.generated_diff
       FROM matches m
       JOIN call_sites cs ON cs.id = m.call_site_id
       JOIN repos r ON r.id = cs.repo_id
       JOIN changelog_entries ce ON ce.id = m.changelog_entry_id
       LEFT JOIN fixes f ON f.match_id = m.id
       WHERE m.id = $1`,
      [matchId]
    );

    if (matchRes.rows.length === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    const row = matchRes.rows[0];
    const targetRepo = row.repo_full_name;
    const auth = getAuth(req);
    const installationId = Number(row.github_installation_id) || (await githubApp.getLatestInstallation(auth?.userId || null)) || undefined;

    if (!installationId || !githubApp.isConfigured()) {
      return res.status(400).json({
        error: `Live GitHub App installation is required to open pull requests on ${targetRepo}. Please install the GitHub App first.`
      });
    }

    const proposedFix = await fixGenerator.generateFixAsync({
      matchId: row.id,
      changelogEntryId: row.changelog_entry_id,
      callSiteId: row.call_site_id,
      repoName: row.repo_full_name,
      filePath: row.file_path,
      lineNumber: row.line_number,
      stripeSymbol: row.stripe_symbol,
      snippet: row.snippet,
      changeType: row.change_type,
      affectedSymbol: row.affected_symbol,
      rawText: row.raw_text || '',
      sourceUrl: row.source_url,
      publishedAt: new Date(),
      status: 'pending',
    });

    const diffLines = proposedFix.diff.split('\n');
    const oldLines = diffLines.filter((l) => l.startsWith('-') && !l.startsWith('---')).map((l) => l.slice(1));
    const newLines = diffLines.filter((l) => l.startsWith('+') && !l.startsWith('+++')).map((l) => l.slice(1));
    const oldText = oldLines.join('\n') || row.snippet;
    const newText = newLines.join('\n') || row.snippet;

    const prResult = await prService.openPullRequest({
      installationId,
      repo: targetRepo,
      base: process.env.GITHUB_BASE || 'main',
      filePath: row.file_path,
      oldText,
      newText,
      branch: branchName,
      title: prTitle,
      body: `Automated migration generated by Amulet.ai.\n\n${proposedFix.rationale || ''}\n\nAffected Symbol: ${row.affected_symbol}\nSource: ${row.source_url}`,
    });

    if (!prResult.live) {
      return res.status(400).json({
        error: 'Unable to open live PR on GitHub. Ensure the repository exists and the GitHub App has write permissions.'
      });
    }

    await db.query(
      `UPDATE matches SET status = 'pr_opened', updated_at = NOW() WHERE id = $1`,
      [matchId]
    );

    const fixId = crypto.randomUUID();
    await db.query(
      `INSERT INTO fixes (id, match_id, generated_diff, pr_url, pr_status, updated_at)
       VALUES ($1, $2, $3, $4, 'open', NOW())
       ON CONFLICT (match_id) DO UPDATE SET pr_url = EXCLUDED.pr_url, pr_status = 'open', updated_at = NOW()`,
      [fixId, matchId, proposedFix.diff, prResult.url]
    );

    res.json({
      success: true,
      prUrl: prResult.url,
      prNumber: prResult.number,
      branchName: prResult.branch,
      prTitle,
      message: `Pull Request #${prResult.number} opened on branch ${prResult.branch}`,
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

  let totalBreakingCount = 0;
  let totalCallSitesCount = 0;
  let totalReposCount = 0;

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

  const targetUserId = auth?.userId || null;

  if (targetUserId) {
    try {
      const u = await clerkClient.users.getUser(targetUserId);
      const ghAcc = u.externalAccounts?.find((a: any) => a.provider === 'oauth_github' || a.provider === 'github');
      currentUser = {
        id: u.id,
        fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Developer',
        email: u.primaryEmailAddress?.emailAddress || u.emailAddresses?.[0]?.emailAddress || '',
        imageUrl: u.imageUrl || ghAcc?.imageUrl || '',
        username: ghAcc?.username || u.username || 'developer',
      };
    } catch (e) {
      console.warn('Could not fetch user info from clerkClient:', e);
    }
  }

  let repos: any[] = [];
  let matches: any[] = [];
  let breakingChanges: any[] = [];
  let totalBreakingCount = 0;
  let totalCallSitesCount = 0;

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
