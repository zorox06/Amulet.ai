import { GitHubAppService } from './app.js';

export interface PullRequestResult { url: string; number: number; branch: string; live: boolean; }

export class GitHubPrService {
  constructor(private readonly githubApp = new GitHubAppService()) {}

  async openPullRequest(args: { installationId?: number; repo: string; base: string; filePath: string; oldText: string; newText: string; branch: string; title: string; body: string }): Promise<PullRequestResult> {
    if (!args.installationId || !this.githubApp.isConfigured()) return { url: `preview://github/${args.branch}`, number: 0, branch: args.branch, live: false };
    const [owner, repo] = args.repo.split('/');
    if (!owner || !repo) throw new Error('GITHUB_REPO must be in owner/repository format');
    const octokit = await this.githubApp.getInstallationOctokit(args.installationId);
    const ref = await octokit.rest.git.getRef({ owner, repo, ref: `heads/${args.base}` });
    await octokit.rest.git.createRef({ owner, repo, ref: `refs/heads/${args.branch}`, sha: ref.data.object.sha });
    const current = await octokit.rest.repos.getContent({ owner, repo, path: args.filePath, ref: args.base });
    if (Array.isArray(current.data) || !('content' in current.data)) throw new Error(`Unable to read ${args.filePath}`);
    const rawContent = Buffer.from(current.data.content, 'base64').toString('utf8');
    const content = rawContent.replace(/\r\n/g, '\n');
    const oldText = args.oldText.replace(/\r\n/g, '\n');
    const newText = args.newText.replace(/\r\n/g, '\n');

    let updated = '';
    if (content.includes(oldText)) {
      updated = content.replace(oldText, newText);
    } else {
      const trimmedOld = oldText.trim();
      const lines = content.split('\n');
      const idx = lines.findIndex((l) => l.trim() === trimmedOld);
      if (idx === -1) throw new Error(`Patch context not found in ${args.filePath}`);
      lines[idx] = newText;
      updated = lines.join('\n');
    }

    await octokit.rest.repos.createOrUpdateFileContents({ owner, repo, path: args.filePath, message: args.title, content: Buffer.from(updated).toString('base64'), branch: args.branch, sha: current.data.sha, committer: { name: 'Amulet.ai', email: 'sentinel@users.noreply.github.com' } });
    const pr = await octokit.rest.pulls.create({ owner, repo, title: args.title, head: args.branch, base: args.base, body: args.body });
    return { url: pr.data.html_url, number: pr.data.number, branch: args.branch, live: true };
  }
}
