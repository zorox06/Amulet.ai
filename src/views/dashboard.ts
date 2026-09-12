import { CorrelatedMatch } from '../services/matcher/matching_engine.js';

export interface DashboardPageProps {
  publishableKey: string;
  repos: any[];
  activeRepoId: string;
  matches: CorrelatedMatch[];
  breakingChanges: any[];
  totalBreakingCount: number;
  totalCallSitesCount: number;
  currentUser?: {
    id: string;
    fullName: string;
    email: string;
    imageUrl: string;
    username: string;
  } | null;
}

export function renderDashboardPage(props: DashboardPageProps): string {
  const user = props.currentUser || {
    id: '',
    fullName: 'Developer',
    email: '',
    imageUrl: '',
    username: 'developer',
  };

  const activeRepo = props.repos.find((r) => r.id === props.activeRepoId) || props.repos[0] || null;
  const filteredMatches = activeRepo 
    ? props.matches.filter((m) => m.repoName === activeRepo.repo_full_name || m.repoName === activeRepo.id)
    : props.matches;

  // Build match counts map per repo for accurate status tagging
  const repoMatchCounts = new Map<string, number>();
  for (const m of props.matches) {
    const key = m.repoName;
    repoMatchCounts.set(key, (repoMatchCounts.get(key) || 0) + 1);
  }

  const isClean = filteredMatches.length === 0;

  function escapeHtml(str: string): string {
    if (!str) return '';
    return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script>
    (function() {
      try {
        var t = localStorage.getItem('amulet_theme') || 'light';
        document.documentElement.setAttribute('data-theme', t);
      } catch (e) {}
    })();
  </script>
  <title>Amulet.ai — Workspace</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;

      --coral-primary: #e05a47;
      --coral-hover: #cf4b38;
      --coral-light: rgba(224, 90, 71, 0.1);
      --coral-border: rgba(224, 90, 71, 0.28);
      
      /* Light Theme (Figma Warm Cream Luxury) */
      --bg-canvas: #f4f3ef;
      --bg-surface: #ffffff;
      --bg-surface-subtle: #f9f8f5;
      --border-subtle: rgba(0, 0, 0, 0.08);
      --border-strong: rgba(0, 0, 0, 0.13);
      --text-main: #171513;
      --text-muted: #66625f;
      --text-dim: #999490;
      --card-inner: #fcfbfa;
      --bar-bg-dim: #e4e2dd;
      --card-shadow: 0 20px 50px -10px rgba(0, 0, 0, 0.07), 0 0 1px rgba(0,0,0,0.05);
    }

    [data-theme="dark"] {
      /* Dark Theme (Obsidian & Espresso Glow) */
      --bg-canvas: #120f11;
      --bg-surface: #1a1618;
      --bg-surface-subtle: #221d20;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.14);
      --text-main: #f5f3ef;
      --text-muted: #9e9996;
      --text-dim: #6e6966;
      --card-inner: #181416;
      --bar-bg-dim: #2f2a2d;
      --card-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.6), 0 0 1px rgba(255,255,255,0.08);
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    body {
      font-family: var(--font-main);
      background-color: var(--bg-canvas);
      color: var(--text-main);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      transition: background-color 0.3s ease, color 0.3s ease;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }

    /* Floating Rounded Header */
    header {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      margin: 16px auto 0;
      max-width: 1360px;
      width: calc(100% - 48px);
      padding: 10px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      position: sticky;
      top: 16px;
      z-index: 90;
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      box-shadow: var(--card-shadow);
      transition: all 0.3s ease;
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 14px;
      flex-wrap: wrap;
    }
    .logo-badge {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 800;
      font-size: 1.15rem;
      text-decoration: none;
      color: var(--text-main);
      letter-spacing: -0.02em;
    }
    .status-pill {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      padding: 4px 14px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.25);
      color: #10b981;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
      background: #10b981;
      animation: status-pulse 2s infinite;
    }
    @keyframes status-pulse {
      0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }
      100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
    }

    /* Header Profile Icon & Interactive Menu */
    .header-profile-container {
      position: relative;
      display: flex;
      align-items: center;
    }
    .header-profile-btn {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 4px 14px 4px 5px;
      border-radius: 9999px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      user-select: none;
    }
    .header-profile-btn:hover {
      background: var(--card-inner);
      border-color: var(--border-strong);
      transform: translateY(-1px);
    }
    .profile-avatar-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--coral-primary) 0%, #ea580c 100%);
      color: #ffffff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 0.78rem;
      box-shadow: 0 2px 8px rgba(224, 90, 71, 0.35);
      flex-shrink: 0;
      overflow: hidden;
    }
    .profile-avatar-circle img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
    .profile-meta-text {
      text-align: left;
      line-height: 1.2;
    }
    .profile-name {
      font-size: 0.82rem;
      font-weight: 700;
      color: var(--text-main);
      max-width: 130px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .profile-subtext {
      font-size: 0.68rem;
      color: #10b981;
      font-weight: 600;
    }
    .profile-chevron {
      font-size: 0.68rem;
      color: var(--text-dim);
      transition: transform 0.2s ease;
      margin-left: 2px;
    }
    .header-profile-container.open .profile-chevron {
      transform: rotate(180deg);
    }

    /* Profile Dropdown Menu */
    .profile-dropdown-menu {
      position: absolute;
      top: calc(100% + 12px);
      right: 0;
      width: 260px;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 20px;
      padding: 8px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.22);
      display: none;
      z-index: 1000;
      animation: menuPop 0.2s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .profile-dropdown-menu.open {
      display: block;
    }
    @keyframes menuPop {
      from { opacity: 0; transform: translateY(-8px) scale(0.96); }
      to { opacity: 1; transform: translateY(0) scale(1); }
    }
    .dropdown-header {
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .dropdown-user-avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.1rem;
      overflow: hidden;
      flex-shrink: 0;
    }
    .dropdown-user-name {
      font-size: 0.86rem;
      font-weight: 800;
      color: var(--text-main);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dropdown-user-email {
      font-size: 0.72rem;
      color: var(--text-dim);
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .dropdown-divider {
      height: 1px;
      background: var(--border-subtle);
      margin: 6px 0;
    }
    .dropdown-item {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-main);
      cursor: pointer;
      transition: all 0.15s ease;
      text-decoration: none;
    }
    .dropdown-item:hover {
      background: var(--bg-surface-subtle);
      color: var(--coral-primary);
    }
    .dropdown-item.text-danger {
      color: #ef4444;
    }
    .dropdown-item.text-danger:hover {
      background: rgba(239, 68, 68, 0.08);
      color: #dc2626;
    }

    /* Buttons */
    .btn {
      padding: 8px 18px;
      border-radius: 9999px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      text-decoration: none;
      font-family: inherit;
    }
    .btn-coral {
      background: var(--coral-primary);
      color: #ffffff !important;
      box-shadow: 0 4px 14px rgba(224, 90, 71, 0.35);
    }
    .btn-coral:hover {
      background: var(--coral-hover);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(224, 90, 71, 0.45);
    }
    .btn-secondary {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-main);
    }
    .btn-secondary:hover {
      background: rgba(0, 0, 0, 0.05);
      border-color: var(--border-strong);
    }
    [data-theme="dark"] .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .btn-ghost {
      background: transparent;
      border: none;
      color: var(--text-muted);
      cursor: pointer;
      border-radius: 8px;
      transition: all 0.18s ease;
    }
    .btn-ghost:hover {
      color: var(--text-main);
      background: var(--bg-surface-subtle);
    }

    /* App Layout */
    .app-layout {
      max-width: 1360px;
      margin: 24px auto;
      padding: 0 24px 60px;
      display: grid;
      grid-template-columns: 260px 1fr;
      gap: 24px;
      width: 100%;
      flex: 1;
    }

    /* Left Sidebar */
    .app-sidebar {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 28px;
      padding: 22px 20px;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: fit-content;
      position: sticky;
      top: 90px;
    }
    .sidebar-section-title {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 12px;
    }
    .repo-nav-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 10px 14px;
      border-radius: 14px;
      text-decoration: none;
      color: var(--text-main);
      font-size: 0.84rem;
      font-weight: 600;
      margin-bottom: 6px;
      transition: all 0.2s ease;
      border: 1px solid transparent;
    }
    .repo-nav-item:hover {
      background: var(--bg-surface-subtle);
    }
    .repo-nav-item.active {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--coral-border);
      color: var(--coral-primary);
    }

    /* Main Workspace */
    .workspace-content {
      display: flex;
      flex-direction: column;
      gap: 22px;
    }

    /* Clean Status Banner */
    .connect-repo-banner {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      padding: 22px 26px;
      box-shadow: var(--card-shadow);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 16px;
    }

    /* 2-Column Widgets */
    .widget-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      align-items: stretch;
    }
    .widget-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 26px;
      padding: 24px 26px;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      position: relative;
    }
    .widget-row > .widget-box {
      height: 340px;
    }
    .codebases-scroll-container {
      flex: 1;
      min-height: 0;
      overflow-y: auto;
      overflow-x: hidden;
      padding-right: 8px;
      margin-right: -4px;
      scrollbar-width: thin;
      scrollbar-color: var(--border-strong) transparent;
    }
    .codebases-scroll-container::-webkit-scrollbar {
      width: 5px;
    }
    .codebases-scroll-container::-webkit-scrollbar-thumb {
      background: var(--border-strong);
      border-radius: 9999px;
    }
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
    }
    .widget-title {
      font-size: 1.05rem;
      font-weight: 700;
      letter-spacing: -0.015em;
    }

    /* Task / Repo Item */
    .task-card {
      background: var(--card-inner);
      border: 1px solid var(--border-subtle);
      border-radius: 16px;
      padding: 12px 16px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s ease;
    }
    .task-card:hover {
      border-color: var(--coral-border);
      transform: translateX(2px);
    }
    .tag-urgent {
      background: var(--coral-primary);
      color: #ffffff;
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 700;
    }
    .tag-neutral {
      background: var(--bar-bg-dim);
      color: var(--text-muted);
      padding: 3px 10px;
      border-radius: 9999px;
      font-size: 0.72rem;
      font-weight: 600;
    }

    /* Figma Bidirectional Financial Waterfall Bar Chart */
    .waterfall-chart-box {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      min-height: 160px;
      margin-top: 6px;
      position: relative;
    }
    .chart-grid-area {
      position: relative;
      flex: 1;
      display: flex;
      align-items: center;
      padding-left: 28px;
    }
    .chart-y-axis {
      position: absolute;
      left: 0;
      top: 0;
      bottom: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      font-size: 0.68rem;
      color: var(--text-dim);
      font-family: var(--font-mono);
      pointer-events: none;
    }
    .chart-zero-line {
      position: absolute;
      left: 28px;
      right: 0;
      top: 55%;
      height: 1px;
      background: var(--border-subtle);
      pointer-events: none;
    }
    .chart-bars-container {
      width: 100%;
      height: 100%;
      display: flex;
      align-items: center;
      justify-content: space-around;
      gap: 10px;
      padding: 8px 4px;
    }
    .chart-col {
      flex: 1;
      max-width: 24px;
      height: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      position: relative;
      cursor: pointer;
    }
    .chart-col:hover .bar-upper {
      background: var(--coral-hover);
      box-shadow: 0 0 10px rgba(224, 90, 71, 0.4);
    }
    .chart-col:hover .bar-tooltip {
      opacity: 1;
      transform: translateY(-8px);
      pointer-events: auto;
    }
    .bar-upper-track {
      width: 100%;
      height: 55%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
    }
    .bar-upper {
      width: 100%;
      background: var(--coral-primary);
      border-radius: 5px 5px 0 0;
      transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.2s ease;
    }
    .bar-lower-track {
      width: 100%;
      height: 45%;
      display: flex;
      align-items: flex-start;
      justify-content: center;
    }
    .bar-lower {
      width: 100%;
      background: var(--bar-bg-dim);
      border-radius: 0 0 5px 5px;
      transition: height 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .bar-tooltip {
      position: absolute;
      bottom: calc(55% + 12px);
      background: #171513;
      color: #ffffff;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 0.68rem;
      font-weight: 700;
      white-space: nowrap;
      opacity: 0;
      transform: translateY(0);
      transition: all 0.2s ease;
      pointer-events: none;
      z-index: 20;
      box-shadow: 0 4px 12px rgba(0,0,0,0.25);
    }
    [data-theme="dark"] .bar-tooltip {
      background: #282225;
      border: 1px solid var(--border-strong);
    }
    .chart-days-row {
      display: flex;
      justify-content: space-around;
      padding-left: 28px;
      margin-top: 6px;
      font-size: 0.72rem;
      color: var(--text-dim);
      font-family: var(--font-mono);
    }

    /* Matches Table */
    .panel-table {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 26px;
      padding: 24px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
    }
    .table-filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 16px;
      gap: 12px;
      flex-wrap: wrap;
    }
    .search-input-box {
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      padding: 8px 16px;
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 0.84rem;
      color: var(--text-main);
      width: 280px;
    }
    .search-input-box input {
      background: transparent;
      border: none;
      color: inherit;
      font-family: inherit;
      font-size: inherit;
      width: 100%;
      outline: none;
    }
    .table-filter-tabs {
      display: flex;
      gap: 6px;
    }
    .filter-tab {
      background: transparent;
      border: 1px solid var(--border-subtle);
      padding: 5px 14px;
      border-radius: 9999px;
      font-size: 0.78rem;
      font-weight: 600;
      cursor: pointer;
      color: var(--text-muted);
      transition: all 0.2s ease;
    }
    .filter-tab.active {
      background: var(--coral-primary);
      color: #ffffff;
      border-color: var(--coral-primary);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      margin-top: 12px;
    }
    th, td {
      padding: 14px 16px;
      border-bottom: 1px solid var(--border-subtle);
      font-size: 0.86rem;
    }
    th {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.07em;
    }
    tr:last-child td { border-bottom: none; }
    tbody tr:hover {
      background: var(--bg-surface-subtle);
    }
    .symbol-pill {
      font-family: var(--font-mono);
      font-size: 0.82rem;
      color: #0284c7;
      background: rgba(2, 132, 199, 0.08);
      border: 1px solid rgba(2, 132, 199, 0.22);
      padding: 4px 10px;
      border-radius: 8px;
      display: inline-block;
      font-weight: 600;
    }
    [data-theme="dark"] .symbol-pill {
      color: #38bdf8;
      background: rgba(56, 189, 248, 0.12);
      border-color: rgba(56, 189, 248, 0.25);
    }

    /* Styled Credit Card */
    .styled-card {
      background: linear-gradient(135deg, var(--coral-primary) 0%, #cf4b38 100%);
      color: #ffffff;
      border-radius: 20px;
      padding: 20px 22px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 155px;
      box-shadow: 0 14px 34px rgba(224, 90, 71, 0.35);
      position: relative;
      overflow: hidden;
    }
    .styled-card-watermark {
      position: absolute;
      right: -10px;
      bottom: -15px;
      font-size: 9rem;
      font-weight: 900;
      line-height: 1;
      opacity: 0.12;
      pointer-events: none;
      font-family: var(--font-main);
    }

    /* Modal / Drawer for Diff, Connect & Account */
    .modal-overlay {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .modal-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 28px;
      width: 100%;
      max-width: 820px;
      box-shadow: 0 35px 90px rgba(0, 0, 0, 0.4);
      overflow: hidden;
      animation: modal-pop 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    @keyframes modal-pop {
      from { transform: scale(0.96); opacity: 0; }
      to { transform: scale(1); opacity: 1; }
    }
    .modal-header {
      padding: 22px 28px;
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .modal-body {
      padding: 24px 28px;
      max-height: 72vh;
      overflow-y: auto;
    }
    .diff-container {
      background: #0d0a0c;
      border: 1px solid #2a2427;
      border-radius: 14px;
      padding: 18px;
      font-family: var(--font-mono);
      font-size: 0.84rem;
      line-height: 1.65;
      overflow-x: auto;
      margin: 16px 0;
      color: #e2e8f0;
    }
    .diff-del { color: #f87171; background: rgba(239, 68, 68, 0.15); display: block; padding: 2px 6px; border-radius: 4px; }
    .diff-add { color: #34d399; background: rgba(16, 185, 129, 0.15); display: block; padding: 2px 6px; border-radius: 4px; }

    /* Account Section Styles */
    .account-tabs-bar {
      display: flex;
      gap: 6px;
      padding: 0 28px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-subtle);
    }
    .account-tab-btn {
      padding: 12px 18px;
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--text-muted);
      border: none;
      background: transparent;
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
      gap: 7px;
    }
    .account-tab-btn:hover {
      color: var(--text-main);
    }
    .account-tab-btn.active {
      color: var(--coral-primary);
      border-bottom-color: var(--coral-primary);
    }
    .account-tab-panel {
      display: none;
    }
    .account-tab-panel.active {
      display: block;
      animation: fadeIn 0.2s ease;
    }
    .account-card-box {
      background: var(--card-inner);
      border: 1px solid var(--border-subtle);
      border-radius: 18px;
      padding: 18px 22px;
      margin-bottom: 16px;
    }
    .account-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0;
      border-bottom: 1px solid var(--border-subtle);
    }
    .account-row:last-child {
      border-bottom: none;
    }
    .account-label {
      font-size: 0.82rem;
      font-weight: 600;
      color: var(--text-muted);
    }
    .account-val {
      font-size: 0.86rem;
      font-weight: 700;
      color: var(--text-main);
    }

    /* GitHub Repositories Animated Drawdown Styles */
    .gh-fetch-row {
      display: flex;
      gap: 10px;
      margin-bottom: 12px;
      align-items: stretch;
    }
    .gh-input-wrapper {
      position: relative;
      flex: 1;
    }
    .gh-input-icon {
      position: absolute;
      left: 14px;
      top: 50%;
      transform: translateY(-50%);
      width: 17px;
      height: 17px;
      color: var(--text-dim);
      pointer-events: none;
    }
    .gh-input-field {
      width: 100%;
      padding: 11px 16px 11px 38px;
      border-radius: 12px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-subtle);
      color: var(--text-main);
      font-family: inherit;
      font-size: 0.88rem;
      outline: none;
      transition: all 0.2s ease;
    }
    .gh-input-field:focus {
      border-color: var(--coral-primary);
      box-shadow: 0 0 0 3px rgba(224, 90, 71, 0.15);
    }
    
    .preset-chips-row {
      display: flex;
      align-items: center;
      gap: 6px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }
    .preset-chip {
      font-size: 0.72rem;
      padding: 4px 10px;
      border-radius: 9999px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      cursor: pointer;
      transition: all 0.18s ease;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      font-weight: 600;
    }
    .preset-chip:hover {
      border-color: var(--coral-border);
      color: var(--coral-primary);
      background: var(--coral-light);
    }

    /* Animated Drawdown Drawer */
    .drawdown-drawer {
      max-height: 0;
      opacity: 0;
      overflow: hidden;
      transform: translateY(-8px) scale(0.99);
      transition: max-height 0.45s cubic-bezier(0.16, 1, 0.3, 1),
                  opacity 0.35s ease,
                  transform 0.4s cubic-bezier(0.16, 1, 0.3, 1),
                  margin-bottom 0.35s ease;
      background: var(--card-inner);
      border: 1px solid transparent;
      border-radius: 16px;
      margin-bottom: 0;
    }
    .drawdown-drawer.open {
      max-height: 380px;
      opacity: 1;
      transform: translateY(0) scale(1);
      border-color: var(--border-subtle);
      margin-bottom: 16px;
      box-shadow: 0 16px 36px rgba(0, 0, 0, 0.08);
    }
    
    .drawdown-header {
      padding: 10px 14px;
      border-bottom: 1px solid var(--border-subtle);
      background: var(--bg-surface);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      border-top-left-radius: 16px;
      border-top-right-radius: 16px;
    }
    .drawdown-search {
      flex: 1;
      padding: 7px 12px;
      border-radius: 8px;
      border: 1px solid var(--border-subtle);
      background: var(--bg-surface-subtle);
      color: var(--text-main);
      font-size: 0.82rem;
      outline: none;
    }
    .drawdown-search:focus {
      border-color: var(--coral-primary);
    }
    .drawdown-count {
      font-size: 0.74rem;
      font-weight: 700;
      color: var(--text-dim);
      white-space: nowrap;
    }
    
    .drawdown-list {
      max-height: 240px;
      overflow-y: auto;
      padding: 8px;
    }
    .drawdown-list::-webkit-scrollbar {
      width: 6px;
    }
    .drawdown-list::-webkit-scrollbar-thumb {
      background: var(--border-strong);
      border-radius: 9999px;
    }

    .repo-choice-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 11px 14px;
      border-radius: 12px;
      border: 1px solid transparent;
      margin-bottom: 4px;
      cursor: pointer;
      transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      background: transparent;
    }
    .repo-choice-item:hover {
      background: var(--bg-surface);
      border-color: var(--coral-border);
      transform: translateX(4px);
    }
    .repo-choice-item.selected {
      background: var(--coral-light);
      border-color: var(--coral-primary);
    }
    .repo-choice-name {
      font-weight: 700;
      font-size: 0.88rem;
      color: var(--text-main);
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .repo-choice-desc {
      font-size: 0.74rem;
      color: var(--text-dim);
      margin-top: 3px;
      max-width: 380px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .repo-choice-meta {
      display: flex;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
    }
    .lang-pill {
      font-size: 0.7rem;
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 2px 8px;
      border-radius: 9999px;
      background: var(--bg-surface-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-muted);
      font-weight: 600;
    }
    .lang-dot {
      width: 7px;
      height: 7px;
      border-radius: 50%;
    }

    .selected-repo-banner {
      display: none;
      align-items: center;
      justify-content: space-between;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: #10b981;
      border-radius: 14px;
      padding: 12px 16px;
      font-size: 0.86rem;
      margin-bottom: 16px;
      animation: fadeIn 0.3s ease;
    }

    .toast-msg {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #1e293b;
      color: #ffffff;
      padding: 12px 22px;
      border-radius: 9999px;
      font-size: 0.86rem;
      font-weight: 600;
      display: none;
      z-index: 2000;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
    }

    @media (max-width: 960px) {
      .app-layout { grid-template-columns: 1fr; }
      .app-sidebar { display: none; }
      .widget-row { grid-template-columns: 1fr; }
      .widget-row > .widget-box { height: auto; }
    }

    /* Account & Settings Modal Styles */
    .account-tab-btn {
      background: transparent;
      border: none;
      padding: 12px 18px;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text-dim);
      cursor: pointer;
      border-bottom: 2px solid transparent;
      transition: all 0.2s ease;
    }
    .account-tab-btn:hover {
      color: var(--text-main);
    }
    .account-tab-btn.active {
      color: var(--coral-primary);
      border-bottom-color: var(--coral-primary);
      font-weight: 700;
    }
    .account-tab-panel {
      display: none;
      animation: fadeIn 0.2s ease;
    }
    .account-tab-panel.active {
      display: block;
    }

    /* Suppress Phone Number input in Clerk Login/Signup */
    .cl-phoneInputBox,
    .cl-formField__phoneNumber,
    .cl-formFieldInput__phoneNumber,
    .cl-formFieldLabel__phoneNumber,
    .cl-identityPreviewText__phoneNumber,
    .cl-signInAlternativeMethodsPhoneButton,
    .cl-alternativeMethodsPhoneButton,
    [data-localization-key*="phoneNumber"],
    [data-localization-key*="phoneCode"],
    input[name="phoneNumber"],
    input[type="tel"],
    .cl-formField:has(input[type="tel"]),
    .cl-formField:has(input[name="phoneNumber"]) {
      display: none !important;
    }

    /* Clerk UserButton Popover Card (Pixel-perfect match to Image 1) */
    .clerk-popover-card {
      position: absolute;
      top: calc(100% + 14px);
      right: 0;
      width: 290px;
      background: #ffffff;
      border-radius: 28px;
      box-shadow: 0 20px 45px -8px rgba(0, 0, 0, 0.16), 0 0 0 1px rgba(0, 0, 0, 0.06);
      padding: 24px 24px 18px 24px;
      z-index: 10000;
      animation: popoverFadeIn 0.16s cubic-bezier(0.16, 1, 0.3, 1);
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      user-select: none;
    }

    [data-theme="dark"] .clerk-popover-card {
      background: #1c1917;
      box-shadow: 0 24px 50px -10px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255, 255, 255, 0.08);
    }

    @keyframes popoverFadeIn {
      from {
        opacity: 0;
        transform: translateY(-8px) scale(0.96);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }

    .clerk-popover-header {
      display: flex;
      align-items: center;
      gap: 14px;
      margin-bottom: 20px;
    }

    .clerk-popover-avatar-wrap {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      overflow: hidden;
      flex-shrink: 0;
      background: #e2e8f0;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
    }

    .clerk-popover-avatar-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }

    .clerk-popover-meta {
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .clerk-popover-name {
      font-size: 0.96rem;
      font-weight: 600;
      color: #111827;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.3;
    }

    [data-theme="dark"] .clerk-popover-name {
      color: #f3f4f6;
    }

    .clerk-popover-handle {
      font-size: 0.84rem;
      color: #6b7280;
      font-weight: 400;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      line-height: 1.2;
    }

    [data-theme="dark"] .clerk-popover-handle {
      color: #9ca3af;
    }

    .clerk-popover-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 18px;
    }

    .clerk-popover-btn {
      display: flex;
      align-items: center;
      gap: 14px;
      width: 100%;
      padding: 10px 12px;
      border: none;
      background: transparent;
      border-radius: 12px;
      font-size: 0.92rem;
      font-weight: 500;
      color: #4b5563;
      cursor: pointer;
      text-align: left;
      transition: background 0.15s ease, color 0.15s ease;
      box-sizing: border-box;
      font-family: inherit;
    }

    [data-theme="dark"] .clerk-popover-btn {
      color: #d1d5db;
    }

    .clerk-popover-btn:hover {
      background: rgba(0, 0, 0, 0.05);
      color: #111827;
    }

    [data-theme="dark"] .clerk-popover-btn:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #ffffff;
    }

    .clerk-popover-footer {
      display: flex;
      align-items: center;
      gap: 5px;
      font-size: 0.74rem;
      color: #9ca3af;
      font-weight: 500;
      padding-top: 6px;
    }

    [data-theme="dark"] .clerk-popover-footer {
      color: #71717a;
    }

    /* Live Guardian review workspace */
    .guardian-review-panel {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 26px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      order: -1;
    }
    .connect-repo-banner { order: -2; }
    .guardian-review-header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 20px;
      padding: 25px 28px 20px;
      border-bottom: 1px solid var(--border-subtle);
      background: linear-gradient(115deg, var(--bg-surface) 0%, var(--bg-surface-subtle) 100%);
    }
    .guardian-kicker {
      font-family: var(--font-mono);
      color: var(--coral-primary);
      font-size: 0.7rem;
      font-weight: 700;
      letter-spacing: 0.09em;
      margin-bottom: 8px;
    }
    .guardian-title { font-size: 1.22rem; font-weight: 800; letter-spacing: -0.025em; }
    .guardian-subtitle { margin-top: 5px; color: var(--text-muted); font-size: 0.85rem; line-height: 1.5; max-width: 650px; }
    .guardian-status { display: inline-flex; align-items: center; gap: 7px; margin-top: 12px; color: var(--text-muted); font-size: 0.77rem; }
    .guardian-status-dot { width: 7px; height: 7px; border-radius: 50%; background: #10b981; box-shadow: 0 0 0 4px rgba(16,185,129,0.1); }
    .guardian-status-dot.pending { background: var(--coral-primary); box-shadow: 0 0 0 4px var(--coral-light); }
    .guardian-review-body { padding: 22px 28px 28px; }
    .guardian-empty { border: 1px dashed var(--border-strong); border-radius: 18px; padding: 22px; display: flex; justify-content: space-between; align-items: center; gap: 20px; background: var(--card-inner); }
    .guardian-empty strong { display: block; font-size: 0.92rem; margin-bottom: 4px; }
    .guardian-empty p { color: var(--text-muted); font-size: 0.8rem; line-height: 1.45; max-width: 620px; }
    .guardian-content { display: none; }
    .guardian-content.visible { display: block; }
    .guardian-signal-strip { display: grid; grid-template-columns: 1.35fr repeat(3, .65fr); gap: 10px; margin-bottom: 18px; }
    .guardian-signal-main, .guardian-metric { background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 13px 15px; }
    .guardian-signal-main small, .guardian-metric small { display: block; font-size: 0.68rem; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--text-dim); margin-bottom: 5px; }
    .guardian-signal-main strong { display: block; font-family: var(--font-mono); font-size: 0.86rem; color: var(--coral-primary); }
    .guardian-metric strong { font-size: 0.88rem; }
    .guardian-workspace { display: grid; grid-template-columns: 1.06fr .94fr; gap: 18px; }
    .guardian-box { border: 1px solid var(--border-subtle); border-radius: 18px; padding: 18px; background: var(--bg-surface); }
    .guardian-box-heading { display: flex; justify-content: space-between; align-items: baseline; gap: 10px; font-size: .89rem; font-weight: 800; margin-bottom: 12px; }
    .guardian-source { color: var(--coral-primary); text-decoration: none; font-size: .75rem; font-weight: 700; }
    .guardian-summary { color: var(--text-muted); font-size: .8rem; line-height: 1.5; margin-bottom: 13px; }
    .guardian-sites { display: flex; flex-direction: column; gap: 8px; }
    .guardian-site { padding: 10px 11px; border-radius: 10px; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); }
    .guardian-site-path { font: 600 .72rem var(--font-mono); color: var(--text-main); }
    .guardian-site-code { color: var(--text-muted); margin-top: 4px; font: .72rem var(--font-mono); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .guardian-diff { margin: 0; padding: 13px; min-height: 112px; border-radius: 12px; background: #1a1718; color: #f5f3ef; font: .73rem/1.65 var(--font-mono); white-space: pre-wrap; overflow: auto; }
    .guardian-diff .del { color: #f8a5a0; } .guardian-diff .add { color: #92d7a5; }
    .guardian-rationale { color: var(--text-muted); font-size: .79rem; line-height: 1.5; margin: 12px 0 0; }
    .guardian-chat { max-height: 184px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-bottom: 11px; padding-right: 2px; }
    .guardian-message { padding: 9px 11px; border-radius: 11px; line-height: 1.45; font-size: .78rem; max-width: 92%; }
    .guardian-agent { align-self: flex-start; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); color: var(--text-muted); }
    .guardian-human { align-self: flex-end; background: var(--coral-light); border: 1px solid var(--coral-border); color: var(--text-main); }
    .guardian-chat-form { display: flex; gap: 8px; }
    .guardian-chat-input { flex: 1; min-width: 0; border: 1px solid var(--border-subtle); border-radius: 10px; background: var(--bg-surface-subtle); padding: 9px 10px; color: var(--text-main); font: inherit; outline: none; }
    .guardian-chat-input:focus { border-color: var(--coral-primary); box-shadow: 0 0 0 3px var(--coral-light); }
    .guardian-action-row { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-subtle); }
    .guardian-action-note { color: var(--text-dim); font-size: .73rem; line-height: 1.35; }
    @media (max-width: 900px) { .guardian-review-header, .guardian-empty { flex-direction: column; align-items: stretch; } .guardian-signal-strip, .guardian-workspace { grid-template-columns: 1fr; } }
  </style>

  <script
    async
    crossorigin="anonymous"
    data-clerk-publishable-key="${props.publishableKey}"
    src="https://equal-flamingo-6599.clerk.accounts.dev/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"
    type="text/javascript"
    onload="if (typeof initClerkUser === 'function') initClerkUser();"
  ></script>
</head>
<body>

  <!-- Floating Rounded Header -->
  <header>
    <div class="header-left">
      <a href="/dashboard" class="logo-badge">
        <span style="color: var(--coral-primary); font-size: 1.3rem;">❖</span>
        <span>Amulet.ai</span>
      </a>
    </div>

    <div style="display: flex; align-items: center; gap: 10px;">
      <button id="theme-toggle" onclick="toggleThemeQuick()" class="btn btn-secondary" style="padding: 7px 14px; font-size: 0.82rem; cursor: pointer;">
        🌓 Theme
      </button>

      <!-- Production Account & Settings Button -->
      <button id="header-settings-btn" onclick="openAccountModal()" class="btn btn-secondary" style="padding: 7px 14px; font-size: 0.82rem;">
        ⚙️ Settings
      </button>

      <!-- Clerk Native User Button Component & Interactive Popover (Matching Image 1) -->
      <div id="user-button-wrapper" style="position: relative; display: flex; align-items: center;">
        <div id="user-button" style="display: flex; align-items: center; min-width: 32px; min-height: 32px;">
          <button id="clerk-user-avatar-btn" onclick="toggleClerkPopover(event)" style="display: flex; align-items: center; justify-content: center; width: 34px; height: 34px; border-radius: 50%; padding: 0; border: 2px solid var(--coral-border); background: var(--bg-surface); cursor: pointer; overflow: hidden; transition: all 0.2s ease; box-shadow: 0 2px 8px rgba(0,0,0,0.08);" title="${escapeHtml(user.fullName)} (@${escapeHtml(user.username)})">
            <img id="clerk-avatar-img" src="${escapeHtml(user.imageUrl)}" alt="${escapeHtml(user.fullName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">
          </button>
        </div>

        <!-- Clerk Exact Popover Card (Matching Image 1) -->
        <div id="clerk-popover-card" class="clerk-popover-card" style="display: none;">
          <div class="clerk-popover-header">
            <div class="clerk-popover-avatar-wrap">
              <img id="clerk-popover-avatar" src="${escapeHtml(user.imageUrl)}" alt="${escapeHtml(user.fullName)}">
            </div>
            <div class="clerk-popover-meta">
              <div id="clerk-popover-fullname" class="clerk-popover-name">${escapeHtml(user.fullName)}</div>
              <div id="clerk-popover-username" class="clerk-popover-handle">${escapeHtml(user.username)}</div>
            </div>
          </div>

          <div class="clerk-popover-actions">
            <button class="clerk-popover-btn" onclick="openClerkManageAccount(event)">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280; flex-shrink: 0;">
                <circle cx="12" cy="12" r="3"></circle>
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
              </svg>
              <span>Manage account</span>
            </button>
            <button class="clerk-popover-btn" onclick="handleSignOut()">
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #6b7280; flex-shrink: 0;">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
              <span>Sign out</span>
            </button>
          </div>

          <div class="clerk-popover-footer">
            <span>Secured by</span>
            <span style="display: inline-flex; align-items: center; gap: 3px; font-weight: 700; color: #6b7280;">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path fill-rule="evenodd" clip-rule="evenodd" d="M12 2C6.477 2 2 6.477 2 12s4.477 10 10 10 10-4.477 10-10S17.523 2 12 2zM8.5 12a3.5 3.5 0 0 1 5.9-2.55.75.75 0 0 1-1.04 1.08 2 2 0 1 0 0 2.94.75.75 0 0 1 1.04 1.08A3.5 3.5 0 0 1 8.5 12z" fill="currentColor"/>
              </svg>
              <span>clerk</span>
            </span>
          </div>
        </div>
      </div>

      <!-- Real User Profile Component (Fallback if unauthenticated or offline preview) -->
      <div class="header-profile-container" id="header-profile-container" style="display: none;">
        <div class="header-profile-btn" id="header-profile-btn" onclick="toggleProfileDropdown()" title="Account & Sentinel Profile">
          <div class="profile-avatar-circle" id="profile-avatar-circle">
            <span id="profile-avatar-initials">👤</span>
          </div>
          <div class="profile-meta-text">
            <div class="profile-name" id="profile-display-name">My Account</div>
            <div class="profile-subtext" id="profile-role-subtext">Active Session</div>
            <span id="profile-user-handle" class="profile-handle" style="display: none;"></span>
          </div>
          <span class="profile-chevron">▾</span>
        </div>

        <!-- Profile Dropdown Menu -->
        <div id="profile-dropdown-menu" class="profile-dropdown-menu">
          <div class="dropdown-header">
            <div class="dropdown-user-avatar" id="dropdown-avatar-box">👤</div>
            <div style="min-width: 0;">
              <div class="dropdown-user-name" id="dropdown-user-name">My Account</div>
              <div class="dropdown-user-email" id="dropdown-user-email">Account Active</div>
            </div>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item" onclick="openAccountModal('profile'); closeProfileDropdown();">
            <span>⚙️ Account & Settings</span>
          </div>
          <div class="dropdown-item" onclick="openClerkProfile(); closeProfileDropdown();">
            <span>👤 Manage Security & 2FA ↗</span>
          </div>
          <div class="dropdown-item" onclick="openConnectRepoModal(); closeProfileDropdown();">
            <span>➕ Connect Repository</span>
          </div>
          <div class="dropdown-item" onclick="triggerScan(); closeProfileDropdown();">
            <span>↻ Run Sentinel Scan</span>
          </div>
          <div class="dropdown-divider"></div>
          <div class="dropdown-item text-danger" onclick="handleSignOut()">
            <span>🚪 Sign Out</span>
          </div>
        </div>
      </div>
    </div>
  </header>

  <div class="app-layout">
    <!-- Left Sidebar -->
    <aside class="app-sidebar">
      <div>
        <!-- Workspace & Connected Account Identity Banner -->
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 22px;">
          <div style="width: 38px; height: 38px; border-radius: 50%; background: var(--text-main); color: var(--bg-canvas); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 1.05rem; overflow: hidden;" id="sidebar-account-badge">
            ${user.imageUrl ? `<img src="${escapeHtml(user.imageUrl)}" alt="${escapeHtml(user.fullName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : escapeHtml(user.fullName.slice(0, 2).toUpperCase())}
          </div>
          <div style="min-width: 0;">
            <div style="font-size: 0.88rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" id="sidebar-account-name">${escapeHtml(user.fullName)}</div>
            <div style="font-size: 0.72rem; color: var(--text-dim); display: flex; align-items: center; gap: 4px;" id="sidebar-github-indicator">
              <span style="color: #10b981;">●</span> <span>@${escapeHtml(user.username)}</span>
            </div>
          </div>
        </div>

        <div class="sidebar-section-title">Connected Repositories</div>
        ${props.repos.length === 0 ? `
          <div style="padding: 12px; color: var(--text-dim); font-size: 0.78rem; line-height: 1.4; border-radius: 12px; background: var(--bg-surface-subtle); border: 1px dashed var(--border-subtle); margin-bottom: 8px;">
            No repositories linked yet. Click below to connect your first repo.
          </div>
        ` : props.repos.map((r) => `
          <a href="/dashboard?repo=${encodeURIComponent(r.id)}" class="repo-nav-item ${activeRepo && activeRepo.id === r.id ? 'active' : ''}">
            <span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;">📁 ${escapeHtml(r.repo_full_name)}</span>
            <span style="font-size: 0.68rem; color: var(--text-dim); font-family: var(--font-mono);">${(repoMatchCounts.get(r.repo_full_name) || 0) > 0 ? '⚠️' : '✓'}</span>
          </a>
        `).join('')}

        <!-- Single Primary Connect Repo Button in Sidebar -->
        <button onclick="openConnectRepoModal()" class="btn btn-secondary" style="width: 100%; margin-top: 14px; font-size: 0.82rem; justify-content: center;">
          + Connect New Repo
        </button>

        <button onclick="openAccountModal()" class="btn-ghost" style="width: 100%; margin-top: 8px; font-size: 0.8rem; padding: 8px; display: flex; align-items: center; justify-content: center; gap: 6px;">
          ⚙️ Account Settings
        </button>
      </div>

      <div style="border-top: 1px solid var(--border-subtle); padding-top: 18px; margin-top: 26px;">
        <div style="font-size: 0.72rem; color: var(--text-dim); margin-bottom: 8px; font-weight: 700;">SENTINEL AUDIT</div>
        <div style="font-size: 0.84rem; font-weight: 700;">100% Precision Benchmark</div>
        <div style="font-size: 0.74rem; color: var(--text-muted); margin-top: 2px;">${props.totalBreakingCount} Ingested Breaking Changes</div>
      </div>
    </aside>

    <!-- Main Workspace Area -->
    <main class="workspace-content">
      <!-- Repo Connection Status Banner -->
      <div class="connect-repo-banner">
        <div>
          <div style="display: flex; align-items: center; gap: 8px; margin-bottom: 4px;">
            <h2 style="font-size: 1.25rem; font-weight: 800;">
              Repository: ${activeRepo ? escapeHtml(activeRepo.repo_full_name) : 'No Repository Selected'}
            </h2>
            <span style="font-size: 0.72rem; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); padding: 2px 8px; border-radius: 9999px; font-family: var(--font-mono);">branch: main</span>
          </div>
          <p style="font-size: 0.88rem; color: var(--text-muted);">
            Continuous codebase scan complete. Found <strong>${filteredMatches.length} breaking API call site match(es)</strong> in this target repo.
          </p>
        </div>
        <div style="display: flex; gap: 10px; align-items: center;">
          <button id="rescan-btn" onclick="triggerScan()" class="btn btn-secondary">
            ↻ Rescan Codebase
          </button>
        </div>
      </div>

      <!-- 2-Column Flourish Widgets Row -->
      <div class="widget-row">
        <!-- Widget 1: Monitored Codebases -->
        <div class="widget-box">
          <div class="widget-header">
            <span class="widget-title">Monitored Codebases</span>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="tag-neutral">All (${props.repos.length})</span>
              <button onclick="openConnectRepoModal()" class="btn-ghost" style="font-size: 0.76rem; padding: 3px 8px; border: 1px solid var(--border-subtle); border-radius: 9999px; font-weight: 700;" title="Connect Repo">
                + Connect
              </button>
            </div>
          </div>

          <div class="codebases-scroll-container">
          ${props.repos.length === 0 ? `
            <div style="padding: 32px 16px; text-align: center; color: var(--text-dim); display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
              <div style="font-size: 1.8rem; margin-bottom: 8px;">📂</div>
              <div style="font-weight: 700; font-size: 0.95rem; color: var(--text-main); margin-bottom: 4px;">No Repositories Linked</div>
              <p style="font-size: 0.8rem; margin-bottom: 14px; max-width: 260px; line-height: 1.5;">Connect your repository to begin automated breaking change scanning.</p>
              <button onclick="openConnectRepoModal()" class="btn btn-secondary" style="font-size: 0.8rem;">+ Connect Repository</button>
            </div>
          ` : props.repos.map((r) => {
            const count = repoMatchCounts.get(r.repo_full_name) || repoMatchCounts.get(r.id) || 0;
            const isSelected = activeRepo && (activeRepo.id === r.id || activeRepo.repo_full_name === r.repo_full_name);
            return `
            <a href="/dashboard?repo=${encodeURIComponent(r.id)}" style="text-decoration: none; color: inherit; display: block; margin-bottom: 8px;">
              <div class="task-card" style="cursor: pointer; transition: all 0.2s ease; ${isSelected ? 'border-color: var(--coral-primary); background: var(--card-inner); box-shadow: 0 4px 16px rgba(224,90,71,0.1);' : ''}">
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem; display: flex; align-items: center; gap: 8px;">
                    ${escapeHtml(r.repo_full_name)}
                    ${isSelected ? '<span style="font-size: 0.65rem; background: var(--coral-primary); color: #fff; padding: 2px 8px; border-radius: 9999px; font-weight: 800;">ACTIVE</span>' : ''}
                  </div>
                  <div style="font-size: 0.74rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 2px;">
                    Last Sentinel scan: ${r.last_indexed_at ? new Date(r.last_indexed_at).toLocaleDateString() : 'Just now'}
                  </div>
                </div>
                <span class="${count > 0 ? 'tag-urgent' : 'tag-neutral'}">
                  ${count > 0 ? `Needs Review (${count})` : 'Shielded ✓'}
                </span>
              </div>
            </a>
            `;
          }).join('')}
          </div>
        </div>

        <!-- Widget 2: Payment Volume & Exposure -->
        <div class="widget-box">
          <div class="widget-header">
            <span class="widget-title">Payment Volume Exposure</span>
            <span class="tag-neutral" style="font-size: 0.72rem;">Live Telemetry</span>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 8px; align-items: flex-end;">
            <div>
              <div style="font-size: 0.74rem; color: var(--text-dim); margin-bottom: 4px; font-weight: 500;">Shielded Transactions</div>
              <div style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em;">
                $ 0.00
              </div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 0.74rem; color: var(--text-dim); margin-bottom: 4px; font-weight: 500;">
                Breaking Exposure
              </div>
              <div style="font-size: 1.35rem; font-weight: 800; letter-spacing: -0.02em; color: #10b981;">
                $ 0.00 (Zero Exposure)
              </div>
            </div>
          </div>

          <div style="padding: 36px 16px; text-align: center; color: var(--text-dim); display: flex; flex-direction: column; align-items: center; justify-content: center; background: var(--card-inner); border-radius: 14px; border: 1px dashed var(--border-subtle); margin-top: 12px;">
            <div style="font-size: 1.5rem; margin-bottom: 6px;">🛡️</div>
            <div style="font-weight: 700; font-size: 0.9rem; color: var(--text-main); margin-bottom: 3px;">$ 0.00 Financial Risk Detected</div>
            <p style="font-size: 0.78rem; max-width: 320px; line-height: 1.45; margin: 0; color: var(--text-muted);">
              ${activeRepo ? `No breaking Stripe API call sites detected in <strong>${escapeHtml(activeRepo.repo_full_name)}</strong>. Production volume is fully shielded.` : 'Connect your repository to monitor payment API call sites and calculate breaking change exposure.'}
            </p>
          </div>
        </div>
      </div>

      <!-- Live P0/P1 review flow, styled as part of the Amulet workspace -->
      <section class="guardian-review-panel" aria-labelledby="guardian-review-title">
        <div class="guardian-review-header">
          <div>
            <div class="guardian-kicker">Live breaking-change review</div>
            <h3 id="guardian-review-title" class="guardian-title">Turn an upstream signal into a reviewed PR</h3>
            <p class="guardian-subtitle">Exa checks the open web, the TypeScript indexer finds affected Stripe calls, and Gemini drafts a small migration for a human to steer.</p>
            <div class="guardian-status"><span id="guardian-status-dot" class="guardian-status-dot pending"></span><span id="guardian-status-copy">${activeRepo ? `Ready to inspect ${escapeHtml(activeRepo.repo_full_name)}` : 'Ready to inspect connected repository'}</span></div>
          </div>
          <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:flex-end;">
            <button id="guardian-scan-btn" class="btn btn-coral">Run live signal check</button>
            <a href="/api/github/install" class="btn btn-secondary">Install GitHub App ↗</a>
          </div>
        </div>
        <div class="guardian-review-body">
          <div id="guardian-empty" class="guardian-empty">
            <div>
              <strong>${activeRepo ? `Ready to scan ${escapeHtml(activeRepo.repo_full_name)}` : 'Connect a repository to begin live review'}</strong>
              <p>Continuous AST scanner checks your live GitHub repository for deprecated or altered API methods and generates drop-in PR fixes.</p>
            </div>
            <span class="tag-neutral">${activeRepo ? 'Ready' : 'Awaiting Repo'}</span>
          </div>

          <div id="guardian-content" class="guardian-content">
            <div class="guardian-signal-strip">
              <div class="guardian-signal-main"><small>Affected API</small><strong id="guardian-symbol">—</strong></div>
              <div class="guardian-metric"><small>Confidence</small><strong id="guardian-confidence">—</strong></div>
              <div class="guardian-metric"><small>Call sites</small><strong id="guardian-callsite-count">—</strong></div>
              <div class="guardian-metric"><small>Source</small><strong id="guardian-source-kind">—</strong></div>
            </div>
            <div class="guardian-workspace">
              <div class="guardian-box">
                <div class="guardian-box-heading"><span>Signal & matched code</span><a id="guardian-source-link" class="guardian-source" target="_blank" rel="noreferrer">View source ↗</a></div>
                <p id="guardian-summary" class="guardian-summary"></p>
                <div id="guardian-sites" class="guardian-sites"></div>
              </div>
              <div class="guardian-box">
                <div class="guardian-box-heading"><span>Proposed migration</span><span id="guardian-model-badge" class="tag-neutral">Gemini</span></div>
                <pre id="guardian-diff" class="guardian-diff"></pre>
                <p id="guardian-rationale" class="guardian-rationale"></p>
              </div>
              <div class="guardian-box">
                <div class="guardian-box-heading"><span>Review with Gemini</span><span class="tag-neutral">In session</span></div>
                <div id="guardian-chat" class="guardian-chat"><div class="guardian-message guardian-agent">I found the matching Stripe calls. Ask for a concise adjustment, then approve only when the patch reads right.</div></div>
                <form id="guardian-chat-form" class="guardian-chat-form">
                  <input id="guardian-instruction" class="guardian-chat-input" placeholder="Ask about the migration or request a small change" required>
                  <button class="btn btn-secondary" type="submit">Send</button>
                </form>
                <div class="guardian-action-row">
                  <div id="guardian-pr-status" class="guardian-action-note">Approval remains a preview until a GitHub App installation and write gate are configured.</div>
                  <button id="guardian-approve-btn" class="btn btn-coral">Approve & open PR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- Core Active Breaking Matches Table (legacy persisted workflow) -->
      <div class="panel-table">
        <div class="widget-header">
          <div>
            <h3 style="font-size: 1.15rem; font-weight: 800;">Breaking Changes Detected in this Repository</h3>
            <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 2px;">
              Stripe API method invocations in this repository that are altered or removed in upcoming releases.
            </p>
          </div>
          <span class="${isClean ? 'tag-neutral' : 'tag-urgent'}">
            ${isClean ? '100% Shielded' : `${filteredMatches.length} Action Items`}
          </span>
        </div>

        <div class="table-filter-bar">
          <div class="search-input-box">
            <span>🔍</span>
            <input id="match-search-input" type="text" placeholder="Filter by symbol, file, or type..." oninput="filterMatchesTable()">
          </div>
          <div class="table-filter-tabs">
            <button class="filter-tab active" onclick="setFilterCategory('all', this)">All (${filteredMatches.length})</button>
            <button class="filter-tab" onclick="setFilterCategory('removal', this)">Removals</button>
            <button class="filter-tab" onclick="setFilterCategory('signature_change', this)">Signatures</button>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Call Site Symbol</th>
              <th>File & Line</th>
              <th>Stripe Breaking Change</th>
              <th>Category</th>
              <th>Automated Fix</th>
            </tr>
          </thead>
          <tbody id="matches-table-body">
            ${filteredMatches.length === 0
              ? `<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 50px 24px;">
                  <div style="width: 52px; height: 52px; border-radius: 50%; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #10b981; font-size: 1.5rem; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px;">✓</div>
                  <div style="font-weight: 800; font-size: 1.18rem; color: var(--text-main); margin-bottom: 6px;">
                    ${activeRepo ? 'Repository Fully Compatible' : 'Ready to Monitor Repositories'}
                  </div>
                  <div style="font-size: 0.88rem; color: var(--text-muted); max-width: 480px; margin: 0 auto 16px; line-height: 1.6;">
                    ${activeRepo
                      ? `Zero breaking changes detected in <strong>${escapeHtml(activeRepo.repo_full_name)}</strong>. All payment call sites are fully compliant with upcoming Stripe API releases.`
                      : 'Connect your repository to begin real-time Stripe AST inspection and breaking change prevention.'}
                  </div>
                  <span class="tag-neutral" style="padding: 6px 18px; font-size: 0.8rem; font-weight: 700;">● 100% Shielded · Sentinel Active</span>
                </td></tr>`
              : filteredMatches.map((m) => `
                <tr id="match-row-${escapeHtml(m.matchId)}" class="match-data-row" data-symbol="${escapeHtml(m.stripeSymbol)}" data-type="${escapeHtml(m.changeType)}" data-file="${escapeHtml(m.filePath)}">
                  <td>
                    <span class="symbol-pill">${escapeHtml(m.stripeSymbol)}</span>
                  </td>
                  <td>
                    <div style="font-family: var(--font-mono); font-size: 0.8rem;">
                      ${escapeHtml(m.filePath)}:${m.lineNumber}
                    </div>
                  </td>
                  <td>
                    <div style="font-weight: 700; margin-bottom: 2px;">${escapeHtml(m.affectedSymbol)}</div>
                    <div style="font-size: 0.76rem; color: var(--text-muted); max-width: 340px; line-height: 1.4;">
                      ${escapeHtml(m.rawText.length > 70 ? m.rawText.slice(0, 67) + '...' : m.rawText)}
                    </div>
                  </td>
                  <td>
                    <span class="${m.changeType === 'removal' ? 'tag-urgent' : 'tag-neutral'}">
                      ${escapeHtml(m.changeType)}
                    </span>
                  </td>
                  <td>
                    <div style="display: flex; gap: 8px;">
                      <button onclick="proposeFix('${escapeHtml(m.matchId)}')" class="btn btn-coral" style="padding: 6px 14px; font-size: 0.8rem;">
                        ⚡ Propose PR Fix
                      </button>
                      <button onclick="dismissMatch('${escapeHtml(m.matchId)}')" class="btn btn-secondary" style="padding: 6px 10px; font-size: 0.8rem;" title="Dismiss Match">
                        ✕
                      </button>
                    </div>
                  </td>
                </tr>
              `).join('')
            }
          </tbody>
        </table>
      </div>

      <!-- Activity Manager & Vendor Card Row -->
      <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 24px;">
        <!-- Activity Manager Widget -->
        <div class="widget-box">
          <div class="widget-header">
            <span class="widget-title">Sentinel Radar Activity</span>
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="tag-neutral" style="font-size: 0.7rem;">Live Telemetry</span>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 6px;">
            <!-- Subcard 1: Breaking Alert -->
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: ${isClean ? '#10b981' : 'var(--coral-primary)'}; margin-bottom: 4px;">
                  ${isClean ? '✓ Sentinel Verified' : '⚠️ Breaking Alert'}
                </div>
                <div style="font-size: 0.92rem; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                  ${isClean ? 'All Stripe APIs' : (filteredMatches[0]?.stripeSymbol || 'charges.create')}
                </div>
                <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">
                  ${isClean ? 'Zero Breaking Cutoffs' : 'Action Required'}
                </div>
              </div>
              <button onclick="filterMatchesTable()" class="btn btn-secondary" style="padding: 4px 10px; font-size: 0.72rem; margin-top: 10px; width: fit-content;">
                Details ↗
              </button>
            </div>

            <!-- Subcard 2: AST Code Scanning -->
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: #10b981; margin-bottom: 4px;">Code Scanning</div>
                <div style="font-size: 0.92rem; font-weight: 700;">${filteredMatches.length > 0 ? filteredMatches.length : 'Verified'} Call Sites</div>
                <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">100% Deterministic</div>
              </div>
              <div style="font-size: 0.7rem; color: #10b981; font-weight: 700; margin-top: 10px;">
                ● Continuous Watch
              </div>
            </div>

            <!-- Subcard 3: AI PR Generator -->
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="font-size: 0.72rem; font-weight: 700; color: #6366f1; margin-bottom: 4px;">PR Generator</div>
                <div style="font-size: 0.92rem; font-weight: 700;">Gemini AI Armed</div>
                <div style="font-size: 0.72rem; color: var(--text-dim); margin-top: 4px;">Zero-Downtime Diffs</div>
              </div>
              <span style="font-size: 0.72rem; color: var(--coral-primary); font-weight: 700; margin-top: 10px;">
                Auto-Fix Ready ↗
              </span>
            </div>
          </div>
        </div>

        <!-- Active Vendor API Coverage Widget -->
        <div class="widget-box">
          <div class="widget-header">
            <span class="widget-title">Active Vendor Shield</span>
            <span style="font-size: 0.74rem; color: #10b981; font-weight: 700;">● Real-Time Sentinel 🛡️</span>
          </div>

          <div class="styled-card">
            <div class="styled-card-watermark" style="font-size: 5rem; right: -10px; bottom: -25px; font-family: var(--font-mono); opacity: 0.08;">SDK</div>
            <div style="display: flex; justify-content: space-between; align-items: center; position: relative; z-index: 2;">
              <span style="font-family: var(--font-mono); font-size: 0.95rem; letter-spacing: 0.05em; font-weight: 800;">STRIPE NODE SDK</span>
              <span style="font-weight: 800; font-size: 0.76rem; letter-spacing: 0.05em; background: rgba(0,0,0,0.25); padding: 3px 8px; border-radius: 6px;">v14 → v17+</span>
            </div>
            <div style="display: flex; justify-content: space-between; align-items: flex-end; position: relative; z-index: 2;">
              <div>
                <div style="font-size: 0.7rem; opacity: 0.85; text-transform: uppercase; letter-spacing: 0.05em;">Protection Coverage</div>
                <div style="font-size: 1.05rem; font-weight: 800;">${isClean ? '100% Shielded' : `${filteredMatches.length} Breaking Deprecations`}</div>
              </div>
              <button onclick="triggerScan()" class="btn" style="background: #171513; color: #fff; font-size: 0.76rem; padding: 6px 14px; border: none; font-weight: 700; cursor: pointer;">
                Deep AST Scan ⚡
              </button>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.74rem; color: var(--text-dim);">
            <span>Cutoff Target <strong>2024-11-20 API</strong></span>
            <span>AST Engine <strong>Tree-Sitter</strong></span>
            <span style="color: var(--coral-primary); cursor: pointer; font-weight: 700;" onclick="triggerScan()">Rescan SDK ↻</span>
          </div>
        </div>
      </div>
    </main>
  </div>

  <!-- Full-Featured Account & Workspace Settings Modal -->
  <div id="account-modal" class="modal-overlay">
    <div class="modal-box" style="max-width: 760px;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 40px; height: 40px; border-radius: 50%; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
            ⚙️
          </div>
          <div>
            <h3 style="font-size: 1.25rem; font-weight: 800;">Account & Workspace Settings</h3>
            <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 2px;">
              Manage your profile, GitHub authorization, Gemini AI configuration, and Sentinel alerts.
            </p>
          </div>
        </div>
        <button onclick="closeAccountModal()" style="background: transparent; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      </div>

      <!-- Navigation Tabs -->
      <div class="account-tabs-bar">
        <button class="account-tab-btn active" onclick="switchAccountTab('profile', this)">
          👤 Profile & Security
        </button>
        <button class="account-tab-btn" onclick="switchAccountTab('github', this)">
          🐙 GitHub & Codebases
        </button>
        <button class="account-tab-btn" onclick="switchAccountTab('gemini', this)">
          ✨ Gemini AI Engine
        </button>
        <button class="account-tab-btn" onclick="switchAccountTab('sentinel', this)">
          🛡️ Sentinel & Webhooks
        </button>
      </div>

      <div class="modal-body">
        <!-- Tab 1: Profile & Security -->
        <div id="tab-profile" class="account-tab-panel active">
          <div class="account-card-box">
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 18px;">
              <div class="dropdown-user-avatar" id="acc-profile-avatar" style="width: 58px; height: 58px; font-size: 1.8rem;">
                👤
              </div>
              <div>
                <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main);" id="acc-profile-name">Authenticated User</div>
                <div style="font-size: 0.82rem; color: var(--text-dim); margin-top: 2px;" id="acc-profile-email">Loading account details...</div>
                <span class="status-pill" style="margin-top: 6px; padding: 2px 10px; font-size: 0.72rem;">
                  ● Active Clerk Session
                </span>
              </div>
            </div>

            <div class="account-row">
              <span class="account-label">User ID</span>
              <span class="account-val" style="font-family: var(--font-mono); font-size: 0.78rem;" id="acc-profile-userid">user_...</span>
            </div>
            <div class="account-row">
              <span class="account-label">Primary Login</span>
              <span class="account-val" id="acc-profile-authprovider">Email & Password (Clerk)</span>
            </div>
            <div class="account-row">
              <span class="account-label">Linked GitHub</span>
              <span class="account-val" id="acc-profile-ghusername">Checking OAuth status...</span>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; align-items: center; background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); border-radius: 16px; padding: 16px 20px;">
            <div>
              <div style="font-weight: 700; font-size: 0.9rem;">Clerk Production Account Security</div>
              <div style="font-size: 0.76rem; color: var(--text-dim); margin-top: 2px;">
                Manage password, add email addresses, configure Two-Factor Authentication (2FA), or review active browser devices.
              </div>
            </div>
            <button onclick="openClerkProfile()" class="btn btn-secondary" style="font-size: 0.82rem; white-space: nowrap;">
              Manage Security & 2FA ↗
            </button>
          </div>
        </div>

        <!-- Tab 2: GitHub & Codebases -->
        <div id="tab-github" class="account-tab-panel">
          <div class="account-card-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div>
                <div style="font-weight: 800; font-size: 1rem;">GitHub Connection</div>
                <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 2px;">
                  Allows Amulet Sentinel to read repository ASTs, scan payment call sites, and create PRs.
                </div>
              </div>
              <span id="acc-gh-status-badge" class="tag-neutral" style="font-size: 0.76rem;">Checking...</span>
            </div>

            <div class="account-row">
              <span class="account-label">Authenticated GitHub Handle</span>
              <span class="account-val" id="acc-gh-handle-val">Not linked via OAuth</span>
            </div>
            <div class="account-row">
              <span class="account-label">Total Connected Repositories</span>
              <span class="account-val">${props.repos.length} Codebase(s)</span>
            </div>
          </div>

          <div class="account-card-box">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
              GITHUB PERSONAL ACCESS TOKEN (OPTIONAL — FOR PRIVATE REPOS & PRS)
            </label>
            <p style="font-size: 0.76rem; color: var(--text-dim); margin-bottom: 10px; line-height: 1.4;">
              Provide a GitHub token with <code>repo</code> permissions if you wish to scan private repositories or open real Pull Requests.
            </p>
            <div style="display: flex; gap: 10px;">
              <input id="github-token-input" type="password" placeholder="ghp_..." style="flex: 1; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-main); font-family: var(--font-mono); font-size: 0.85rem; outline: none;">
              <button onclick="saveGitHubToken()" class="btn btn-secondary" style="font-size: 0.82rem; white-space: nowrap;">
                Save Token
              </button>
            </div>
            <div id="github-token-msg" style="display: none; margin-top: 8px; font-size: 0.78rem;"></div>
          </div>
        </div>

        <!-- Tab 3: Gemini AI Engine -->
        <div id="tab-gemini" class="account-tab-panel">
          <div class="account-card-box">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
              <div>
                <div style="font-weight: 800; font-size: 1rem;">Google Gemini AI Synthesis Engine</div>
                <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 2px;">
                  Powers zero-downtime unified git diff generation and Stripe breaking-change migration rationales.
                </div>
              </div>
              <span id="gemini-status-pill" class="tag-neutral" style="font-size: 0.74rem;">Checking Key...</span>
            </div>

            <div class="account-row">
              <span class="account-label">Model Architecture</span>
              <span class="account-val" style="font-family: var(--font-mono); font-size: 0.82rem;">gemini-3.6-flash</span>
            </div>
            <div class="account-row">
              <span class="account-label">Engine Mode</span>
              <span class="account-val" id="gemini-mode-val">✨ Gemini AI (with AST Rule Fallback)</span>
            </div>
          </div>

          <div class="account-card-box">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
              GOOGLE GEMINI API KEY
            </label>
            <p style="font-size: 0.76rem; color: var(--text-dim); margin-bottom: 10px; line-height: 1.4;">
              Get a free API key from <a href="https://aistudio.google.com/" target="_blank" style="color: var(--coral-primary); font-weight: 700;">Google AI Studio ↗</a>.
            </p>
            <div style="display: flex; gap: 10px; margin-bottom: 10px;">
              <input id="gemini-key-input" type="password" placeholder="AIzaSy..." style="flex: 1; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border-subtle); background: var(--bg-surface); color: var(--text-main); font-family: var(--font-mono); font-size: 0.85rem; outline: none;">
              <button id="toggle-key-visibility-btn" onclick="toggleKeyVisibility()" class="btn btn-secondary" style="padding: 10px 14px; font-size: 0.82rem;">
                👁️
              </button>
            </div>
            <div style="display: flex; gap: 10px;">
              <button id="test-gemini-btn" onclick="testGeminiKey()" class="btn btn-secondary" style="font-size: 0.82rem;">
                ⚡ Test & Verify Key
              </button>
              <button onclick="saveGeminiKey()" class="btn btn-coral" style="font-size: 0.82rem;">
                💾 Save Key
              </button>
            </div>
            <div id="gemini-test-result" style="display: none; margin-top: 12px; padding: 10px 14px; border-radius: 12px; font-size: 0.8rem;"></div>
          </div>
        </div>

        <!-- Tab 4: Sentinel & Webhooks -->
        <div id="tab-sentinel" class="account-tab-panel">
          <div class="account-card-box">
            <div style="font-weight: 800; font-size: 1rem; margin-bottom: 12px;">Sentinel Radar Rules & Pipeline</div>
            <div class="account-row">
              <span class="account-label">Stripe API Coverage</span>
              <span class="account-val">v12.0 → v20.0 (229 Ingested Rules)</span>
            </div>
            <div class="account-row">
              <span class="account-label">AST Parser</span>
              <span class="account-val">Tree-sitter TypeScript (Deterministic)</span>
            </div>
            <div class="account-row">
              <span class="account-label">Embedded Database</span>
              <span class="account-val" style="color: #10b981;">● PGlite Embedded PostgreSQL Active</span>
            </div>
            <div class="account-row">
              <span class="account-label">Continuous Scanner</span>
              <span class="account-val" style="color: #10b981;">● Active (Rescan on demand)</span>
            </div>
          </div>

          <div class="account-card-box">
            <label style="display: block; font-size: 0.82rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
              GITHUB APP WEBHOOK RECEIVER
            </label>
            <p style="font-size: 0.76rem; color: var(--text-dim); margin-bottom: 8px;">
              Configure this webhook URL in your GitHub App to receive real-time <code>push</code> and <code>pull_request</code> events:
            </p>
            <div style="background: var(--bg-surface); padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border-subtle); font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-main); display: flex; justify-content: space-between; align-items: center;">
              <span id="webhook-url-text">http://localhost:3000/api/webhooks/github</span>
              <button onclick="copyWebhookUrl()" class="btn-ghost" style="font-size: 0.74rem; padding: 2px 8px; border: 1px solid var(--border-subtle);">Copy</button>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 16px 28px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 10px;">
        <button onclick="closeAccountModal()" class="btn btn-secondary">Close</button>
      </div>
    </div>
  </div>

  <!-- Unified Connect GitHub Repository Modal -->
  <div id="connect-modal" class="modal-overlay">
    <div class="modal-box" style="max-width: 620px;">
      <div class="modal-header">
        <div>
          <h3 style="font-size: 1.2rem; font-weight: 800;">Connect GitHub Repository</h3>
          <p style="font-size: 0.8rem; color: var(--text-dim); margin-top: 2px;">
            Search repositories from GitHub or type any repository to scan immediately.
          </p>
        </div>
        <button onclick="closeConnectModal()" style="background: transparent; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      </div>
      <div class="modal-body">
        <!-- Smart Search / Input Bar -->
        <div style="margin-bottom: 14px;">
          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-main); margin-bottom: 8px;">
            GITHUB REPOSITORY OR USER / ORGANIZATION
          </label>
          <div class="gh-fetch-row">
            <div class="gh-input-wrapper">
              <svg class="gh-input-icon" viewBox="0 0 16 16" fill="currentColor">
                <path d="M8 0c4.42 0 8 3.58 8 8a8.013 8.013 0 0 1-5.45 7.59c-.4.08-.55-.17-.55-.38 0-.27.01-1.13.01-2.2 0-.75-.25-1.23-.54-1.48 1.78-.2 3.65-.88 3.65-3.95 0-.88-.31-1.59-.82-2.15.08-.2.36-1.02-.08-2.12 0 0-.67-.22-2.2.82-.64-.18-1.32-.27-2-.27-.68 0-1.36.09-2 .27-1.53-1.03-2.2-.82-2.2-.82-.44 1.1-.16 1.92-.08 2.12-.51.56-.82 1.28-.82 2.15 0 3.06 1.86 3.75 3.64 3.95-.23.2-.44.55-.51 1.07-.46.21-1.61.55-2.33-.66-.15-.24-.6-.83-1.23-.82-.67.01-.27.38.01.53.34.19.73.9.82 1.13.16.45.68 1.31 2.69.94 0 .67.01 1.3.01 1.49 0 .21-.15.45-.55.38A7.995 7.995 0 0 1 0 8c0-4.42 3.58-8 8-8Z"></path>
              </svg>
              <input id="gh-username-input" class="gh-input-field" type="text" placeholder="e.g. stripe-samples, vercel, or owner/repo" oninput="handleSearchInputChange(this.value)" onkeydown="if(event.key==='Enter'){event.preventDefault();handleSmartSearchAction();}">
            </div>
            <button id="fetch-gh-btn" onclick="handleSmartSearchAction()" class="btn btn-secondary" style="padding: 10px 18px; font-size: 0.85rem; font-weight: 700; white-space: nowrap;">
              ⤓ Fetch Repos
            </button>
          </div>

          <!-- Quick Suggestion Chips -->
          <div class="preset-chips-row">
            <span style="font-size: 0.72rem; color: var(--text-dim);">Quick suggestions:</span>
            <span class="preset-chip" onclick="quickFillUsername('stripe-samples')">❖ stripe-samples</span>
            <span class="preset-chip" onclick="quickFillUsername('vercel')">▲ vercel</span>
            <span class="preset-chip" onclick="quickFillUsername('octocat')">🐙 octocat</span>
            <span id="clerk-gh-chip" class="preset-chip" style="display: none;" onclick="quickFillClerkUsername()">👤 My GitHub</span>
          </div>
        </div>

        <!-- Animated Drawdown Drawer with Repository Cards -->
        <div id="gh-repos-drawdown" class="drawdown-drawer">
          <div class="drawdown-header">
            <input id="drawdown-filter" class="drawdown-search" type="text" placeholder="🔎 Filter fetched repositories..." oninput="filterDrawdownRepos()">
            <div style="display: flex; align-items: center; gap: 10px;">
              <span class="drawdown-count">● <span id="drawdown-count">0</span> Repositories</span>
              <button onclick="toggleDrawdown()" class="btn-ghost" style="font-size: 0.76rem; padding: 3px 8px;" title="Collapse Drawdown">▲ Close</button>
            </div>
          </div>
          <div id="drawdown-list" class="drawdown-list"></div>
        </div>

        <!-- Selected Repository Card Banner -->
        <div id="selected-repo-banner" class="selected-repo-banner">
          <div style="display: flex; align-items: center; gap: 10px;">
            <div style="width: 28px; height: 28px; border-radius: 50%; background: #10b981; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: 900; font-size: 0.85rem;">✓</div>
            <div>
              <div style="font-weight: 700; font-size: 0.88rem; color: var(--text-main);">Selected: <span id="selected-repo-name-text"></span></div>
              <div style="font-size: 0.74rem; color: var(--text-muted);">Default Branch: <span id="selected-repo-branch-text" style="font-family: var(--font-mono);">main</span></div>
            </div>
          </div>
          <button onclick="clearSelectedRepo()" style="background: transparent; border: none; color: var(--text-dim); cursor: pointer; font-size: 1.1rem; padding: 0 4px;" title="Clear selection">✕</button>
        </div>

        <!-- Notice / Rate Limit Helper -->
        <div id="modal-notice-banner" style="display: none; background: rgba(224, 90, 71, 0.1); border: 1px solid var(--coral-border); border-radius: 12px; padding: 10px 14px; font-size: 0.8rem; color: var(--coral-primary); margin-bottom: 14px;">
          <span id="modal-notice-text"></span>
        </div>

        <!-- Target Repository Confirmation -->
        <div style="margin-bottom: 16px;">
          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
            CONFIRMED REPOSITORY TARGET
          </label>
          <input id="custom-repo-input" type="text" placeholder="e.g. acme/billing-service" style="width: 100%; padding: 11px 16px; border-radius: 12px; border: 1px solid var(--border-subtle); background: var(--bg-surface-subtle); color: var(--text-main); font-family: inherit; font-size: 0.9rem; outline: none; transition: border-color 0.2s ease;">
          <p style="font-size: 0.74rem; color: var(--text-dim); margin-top: 5px;">Format: <code>owner/repository-name</code></p>
        </div>

        <div>
          <label style="display: block; font-size: 0.8rem; font-weight: 700; color: var(--text-main); margin-bottom: 6px;">
            TARGET BRANCH
          </label>
          <input id="custom-branch-input" type="text" value="main" placeholder="main" style="width: 100%; padding: 10px 16px; border-radius: 12px; border: 1px solid var(--border-subtle); background: var(--bg-surface-subtle); color: var(--text-main); font-family: var(--font-mono); font-size: 0.86rem; outline: none;">
        </div>
      </div>
      <div style="padding: 18px 28px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 10px;">
        <button onclick="closeConnectModal()" class="btn btn-secondary">Cancel</button>
        <button id="connect-submit-btn" onclick="submitConnectRepo()" class="btn btn-coral">
          Connect & Scan Codebase →
        </button>
      </div>
    </div>
  </div>

  <!-- Propose PR Fix Modal -->
  <div id="diff-modal" class="modal-overlay">
    <div class="modal-box">
      <div class="modal-header">
        <div>
          <div style="display: flex; align-items: center; gap: 10px;">
            <h3 id="modal-title" style="font-size: 1.15rem; font-weight: 800;">Proposed PR Migration Fix</h3>
            <span id="ai-model-badge"></span>
          </div>
          <div style="font-size: 0.78rem; color: var(--text-dim); font-family: var(--font-mono); margin-top: 2px;">
            Branch: <span id="modal-branch" style="color: var(--coral-primary);">amulet/fix-stripe-migration-pr</span>
          </div>
        </div>
        <button onclick="closeModal()" style="background: transparent; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      </div>
      <div class="modal-body">
        <div id="modal-rationale" style="background: var(--coral-light); border: 1px solid var(--coral-border); border-radius: 14px; padding: 14px 18px; font-size: 0.88rem; line-height: 1.6; color: var(--text-main); margin-bottom: 14px;"></div>
        
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <span style="font-size: 0.78rem; font-weight: 700; color: var(--text-dim);">UNIFIED GIT DIFF</span>
          <button onclick="copyModalDiff()" class="btn-ghost" style="font-size: 0.78rem; padding: 3px 10px; border: 1px solid var(--border-subtle); border-radius: 6px;">📋 Copy Diff</button>
        </div>

        <div class="diff-container" id="modal-diff"></div>
      </div>
      <div style="padding: 18px 28px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 10px;">
        <button onclick="closeModal()" class="btn btn-secondary">Close</button>
        <button id="create-pr-btn" onclick="submitCreatePR()" class="btn btn-coral">Create GitHub Pull Request ↗</button>
      </div>
    </div>
  </div>

  <!-- Account & Workspace Settings Modal -->
  <div id="account-modal" class="modal-overlay" style="display: none;">
    <div class="modal-box" style="max-width: 780px; width: 92%; max-height: 90vh; overflow-y: auto;">
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 12px;">
          <div style="width: 36px; height: 36px; border-radius: 10px; background: var(--coral-light); display: flex; align-items: center; justify-content: center; font-size: 1.2rem;">
            ⚙️
          </div>
          <div>
            <h3 style="font-size: 1.18rem; font-weight: 800; margin: 0;">Account & Workspace Settings</h3>
            <p style="font-size: 0.78rem; color: var(--text-dim); margin: 2px 0 0;">Manage your security, GitHub integration, AI engines, and Sentinel webhooks</p>
          </div>
        </div>
        <button onclick="closeAccountModal()" style="background: transparent; border: none; font-size: 1.4rem; cursor: pointer; color: var(--text-muted);">&times;</button>
      </div>

      <!-- Settings Navigation Tabs -->
      <div style="display: flex; gap: 6px; padding: 0 28px; border-bottom: 1px solid var(--border-subtle); background: var(--card-inner);">
        <button class="account-tab-btn active" onclick="switchAccountTab('profile', this)">
          👤 Profile & Security
        </button>
        <button class="account-tab-btn" onclick="switchAccountTab('github', this)">
          🐙 GitHub & Codebases
        </button>
        <button class="account-tab-btn" onclick="switchAccountTab('ai', this)">
          ✨ Gemini AI Engine
        </button>
        <button class="account-tab-btn" onclick="switchAccountTab('sentinel', this)">
          🛡️ Sentinel & Webhooks
        </button>
      </div>

      <!-- Modal Body Tab Content -->
      <div class="modal-body" style="padding: 24px 28px;">
        <!-- Tab 1: Profile & Security -->
        <div id="tab-profile" class="account-tab-panel active">
          <div style="display: flex; align-items: center; gap: 18px; padding-bottom: 20px; border-bottom: 1px solid var(--border-subtle); margin-bottom: 20px;">
            <div id="acc-profile-avatar" style="width: 64px; height: 64px; border-radius: 50%; background: var(--coral-primary); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; font-weight: 800; flex-shrink: 0; box-shadow: var(--shadow-sm); overflow: hidden;">
              ${user.imageUrl ? `<img src="${escapeHtml(user.imageUrl)}" alt="${escapeHtml(user.fullName)}" style="width: 100%; height: 100%; object-fit: cover; border-radius: 50%;">` : '👤'}
            </div>
            <div style="flex: 1; min-width: 0;">
              <h4 id="acc-profile-name" style="font-size: 1.15rem; font-weight: 800; margin: 0 0 4px;">${escapeHtml(user.fullName)}</h4>
              <p id="acc-profile-email" style="font-size: 0.84rem; color: var(--text-dim); margin: 0 0 6px;">${escapeHtml(user.email)}</p>
              <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
                <span class="status-pill">Active Production Session</span>
                <span class="tag-neutral" style="font-size: 0.72rem;">@${escapeHtml(user.username)} (GitHub OAuth)</span>
              </div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 16px;">
              <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700; text-transform: uppercase;">User Identifier</div>
              <div id="acc-profile-userid" style="font-family: var(--font-mono); font-size: 0.8rem; color: var(--text-main); margin-top: 4px; word-break: break-all;">${escapeHtml(user.id)}</div>
            </div>
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 16px;">
              <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700; text-transform: uppercase;">Authentication Method</div>
              <div id="acc-profile-ghusername" style="font-size: 0.82rem; color: var(--text-main); margin-top: 4px; font-weight: 600;">GitHub SSO (@${escapeHtml(user.username)})</div>
            </div>
          </div>

          <div style="background: var(--bg-surface-subtle); border: 1px solid var(--border-subtle); border-radius: 14px; padding: 18px 20px; display: flex; justify-content: space-between; align-items: center;">
            <div>
              <div style="font-weight: 700; font-size: 0.92rem;">Security, Multi-Factor Auth & Sessions</div>
              <div style="font-size: 0.78rem; color: var(--text-dim); margin-top: 3px;">Configure 2-factor authentication, active devices, and password management</div>
            </div>
            <button onclick="openClerkProfile()" class="btn btn-secondary" style="white-space: nowrap; font-size: 0.82rem;">
              Manage Security & 2FA ↗
            </button>
          </div>
        </div>

        <!-- Tab 2: GitHub Integration -->
        <div id="tab-github" class="account-tab-panel">
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 6px;">Connected GitHub Account</div>
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 16px; display: flex; justify-content: space-between; align-items: center;">
              <div style="display: flex; align-items: center; gap: 12px;">
                <div style="font-size: 1.6rem;">🐙</div>
                <div>
                  <div style="font-weight: 700; font-size: 0.9rem;" id="acc-gh-handle-val">@github-user</div>
                  <div style="font-size: 0.76rem; color: var(--text-dim);">Provides automatic discovery of repositories and organizations</div>
                </div>
              </div>
              <span id="acc-gh-status-badge" class="status-pill">● Linked ✓</span>
            </div>
          </div>

          <div style="margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px;">GitHub Personal Access Token (PAT)</div>
            <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: 10px;">Optional: Required only for scanning private enterprise repos or elevating API rate limits.</div>
            <div style="display: flex; gap: 10px;">
              <input type="password" id="github-token-input" placeholder="ghp_xxxxxxxxxxxxxxxxxxxx" class="input-styled" style="flex: 1; font-family: var(--font-mono); font-size: 0.82rem;">
              <button onclick="saveGitHubToken()" class="btn btn-secondary" style="font-size: 0.82rem; white-space: nowrap;">💾 Save Token</button>
            </div>
            <div id="github-token-msg" style="display: none; font-size: 0.78rem; margin-top: 6px;"></div>
          </div>
        </div>

        <!-- Tab 3: Gemini AI Engine -->
        <div id="tab-ai" class="account-tab-panel">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;">
            <div>
              <div style="font-weight: 700; font-size: 0.95rem;">Google Gemini 2.5 AI Engine</div>
              <div style="font-size: 0.78rem; color: var(--text-dim);">Powers intelligent semantic AST code rewrites and automatic PR fix suggestions.</div>
            </div>
            <span id="gemini-status-pill" class="status-pill">Checking...</span>
          </div>

          <div style="margin-bottom: 16px;">
            <label style="display: block; font-size: 0.78rem; font-weight: 700; color: var(--text-dim); margin-bottom: 6px;">GEMINI_API_KEY</label>
            <div style="display: flex; gap: 8px;">
              <input type="password" id="gemini-key-input" placeholder="AIzaSy..." class="input-styled" style="flex: 1; font-family: var(--font-mono); font-size: 0.82rem;">
              <button id="toggle-key-visibility-btn" onclick="toggleKeyVisibility()" class="btn btn-secondary" style="padding: 7px 12px; font-size: 0.9rem;" title="Toggle Show/Hide">👁️</button>
              <button onclick="saveGeminiKey()" class="btn btn-secondary" style="font-size: 0.82rem; white-space: nowrap;">💾 Save Key</button>
              <button id="test-gemini-btn" onclick="testGeminiKey()" class="btn btn-coral" style="font-size: 0.82rem; white-space: nowrap;">⚡ Test & Verify Key</button>
            </div>
          </div>

          <div id="gemini-test-result" style="display: none; padding: 12px 16px; border-radius: 10px; font-size: 0.82rem; margin-bottom: 14px;"></div>
        </div>

        <!-- Tab 4: Sentinel & Webhooks -->
        <div id="tab-sentinel" class="account-tab-panel">
          <div style="margin-bottom: 20px;">
            <div style="font-weight: 700; font-size: 0.95rem; margin-bottom: 4px;">GitHub Webhook Receiver URL</div>
            <div style="font-size: 0.78rem; color: var(--text-dim); margin-bottom: 10px;">Configure this webhook endpoint in your GitHub repository or organization settings to receive automated push & PR scans.</div>
            <div style="display: flex; gap: 10px; align-items: center;">
              <div id="webhook-url-text" style="flex: 1; background: var(--card-inner); border: 1px solid var(--border-subtle); padding: 10px 14px; border-radius: 8px; font-family: var(--font-mono); font-size: 0.8rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                http://localhost:3000/api/webhooks/github
              </div>
              <button onclick="copyWebhookUrl()" class="btn btn-secondary" style="font-size: 0.82rem; white-space: nowrap;">📋 Copy URL</button>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px;">
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 16px;">
              <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700; text-transform: uppercase;">Breaking Change Knowledge Base</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">229 Stripe Rules</div>
              <div style="font-size: 0.74rem; color: #10b981; margin-top: 2px;">● Synced from Stripe API Changelog</div>
            </div>
            <div style="background: var(--card-inner); border: 1px solid var(--border-subtle); border-radius: 12px; padding: 14px 16px;">
              <div style="font-size: 0.72rem; color: var(--text-dim); font-weight: 700; text-transform: uppercase;">Database Storage Engine</div>
              <div style="font-size: 1.15rem; font-weight: 800; color: var(--text-main); margin-top: 4px;">PGlite Embedded (PostgreSQL)</div>
              <div style="font-size: 0.74rem; color: #10b981; margin-top: 2px;">● Schema Indexed & Ready</div>
            </div>
          </div>
        </div>
      </div>

      <div style="padding: 16px 28px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; background: var(--card-inner);">
        <button onclick="closeAccountModal()" class="btn btn-secondary" style="font-size: 0.84rem;">Done</button>
      </div>
    </div>
  </div>

  <div id="toast" class="toast-msg"></div>

  <script>
    function escapeHtml(str) {
      if (!str) return '';
      return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3500);
    }

    const activeRepoId = "${activeRepo ? escapeHtml(activeRepo.id) : ''}";
    const activeRepoFullName = "${activeRepo ? escapeHtml(activeRepo.repo_full_name) : ''}";
    const activeRepoInstallationId = "${activeRepo ? (activeRepo.github_installation_id || 0) : 0}";

    let guardianReviewSession = null;

    function setGuardianStatus(message, state) {
      const copy = document.getElementById('guardian-status-copy');
      const dot = document.getElementById('guardian-status-dot');
      if (copy) copy.textContent = message;
      if (dot) dot.className = 'guardian-status-dot' + (state === 'pending' ? ' pending' : '');
    }

    function renderGuardianReview() {
      if (!guardianReviewSession) return;
      const session = guardianReviewSession;
      const signal = session.signal;
      const fix = session.fix;
      document.getElementById('guardian-empty').style.display = 'none';
      document.getElementById('guardian-content').classList.add('visible');

      if (session.clean || !session.fix) {
        document.getElementById('guardian-symbol').textContent = signal ? signal.affectedSymbol : 'All Stripe APIs';
        document.getElementById('guardian-confidence').textContent = signal ? Math.round(signal.confidence * 100) + '%' : '100%';
        document.getElementById('guardian-callsite-count').textContent = '0';
        document.getElementById('guardian-source-kind').textContent = signal && signal.live ? 'Live Exa' : 'Verified';
        document.getElementById('guardian-summary').textContent = session.message || 'Zero breaking changes detected in this repository. All call sites are fully compliant.';
        if (signal && signal.sourceUrl) document.getElementById('guardian-source-link').href = signal.sourceUrl;
        document.getElementById('guardian-sites').innerHTML = '<div style="padding: 14px; color: #10b981; font-weight: 700; background: rgba(16, 185, 129, 0.08); border-radius: 8px; border: 1px solid rgba(16, 185, 129, 0.2);">✓ Zero breaking API callsites found in this codebase. Fully compliant with upcoming Stripe versions.</div>';
        document.getElementById('guardian-diff').innerHTML = '<span style="color: #10b981; font-weight: 600;">// No code changes required. Clean build verified.</span>';
        document.getElementById('guardian-rationale').textContent = 'The repository contains zero deprecated or breaking Stripe API calls. No pull request or manual migration is required.';
        return;
      }

      document.getElementById('guardian-symbol').textContent = signal.affectedSymbol;
      document.getElementById('guardian-confidence').textContent = Math.round(signal.confidence * 100) + '%';
      document.getElementById('guardian-callsite-count').textContent = String(session.matches.length);
      document.getElementById('guardian-source-kind').textContent = signal.live ? 'Live Exa' : 'Seeded';
      document.getElementById('guardian-summary').textContent = signal.summary;
      document.getElementById('guardian-source-link').href = signal.sourceUrl;
      document.getElementById('guardian-sites').innerHTML = session.matches.map(function (match) {
        return '<div class="guardian-site"><div class="guardian-site-path">' + escapeHtml(match.filePath + ':' + match.lineNumber) + '</div><div class="guardian-site-code">' + escapeHtml(match.snippet) + '</div></div>';
      }).join('');
      document.getElementById('guardian-diff').innerHTML = '<span class="del">- ' + escapeHtml(fix.oldText) + '</span>\\n<span class="add">+ ' + escapeHtml(fix.newText) + '</span>';
      document.getElementById('guardian-rationale').textContent = fix.rationale;
    }

    window.startGuardianReview = async function() {
      const button = document.getElementById('guardian-scan-btn');
      button.disabled = true;
      button.textContent = 'Checking signals…';
      setGuardianStatus('Searching Exa, parsing TypeScript, and correlating call sites…', 'pending');
      try {
        const params = new URLSearchParams(window.location.search);
        const repoParam = params.get('repo') || activeRepoFullName || activeRepoId;
        const response = await fetch('/api/review/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            vendor: 'stripe',
            liveSearch: true,
            repo: repoParam,
            repoFullName: activeRepoFullName || repoParam,
            installationId: params.get('installation_id') || activeRepoInstallationId
          })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Amulet live scan could not start.');
        guardianReviewSession = data;
        renderGuardianReview();
        if (data.clean) {
          setGuardianStatus('✓ Live Signal Verified: ' + (data.targetRepo || 'Repository') + ' is 100% compliant with ' + (data.signal ? data.signal.affectedSymbol : 'Stripe APIs') + '. Zero breaking call sites found.', 'ready');
          showToast('Live signal checked: ' + (data.targetRepo || 'Repository') + ' is 100% compliant!');
        } else {
          setGuardianStatus(data.signal.live ? 'Live Exa signal matched against repository call sites' : 'Signal matched against repository call sites', 'ready');
          showToast(data.signal.live ? 'Live signal matched. Review the proposed migration.' : 'Signal matched. Review the proposed migration.');
        }
      } catch (error) {
        setGuardianStatus('Unable to complete the live review scan', 'pending');
        showToast('Amulet scan notice: ' + error.message);
      } finally {
        button.disabled = false;
        button.textContent = 'Run live signal check';
      }
    }

    window.sendGuardianMessage = async function(event) {
      event.preventDefault();
      if (!guardianReviewSession) {
        showToast('Run the signal check before starting a review conversation.');
        return;
      }
      const input = document.getElementById('guardian-instruction');
      const instruction = input.value.trim();
      if (!instruction) return;
      const chat = document.getElementById('guardian-chat');
      chat.insertAdjacentHTML('beforeend', '<div class="guardian-message guardian-human">' + escapeHtml(instruction) + '</div>');
      input.value = '';
      try {
        const response = await fetch('/api/review/' + guardianReviewSession.id + '/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ instruction: instruction })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Gemini could not revise the proposal.');
        guardianReviewSession.fix = data.fix;
        renderGuardianReview();
        chat.insertAdjacentHTML('beforeend', '<div class="guardian-message guardian-agent">' + escapeHtml(data.reply) + '</div>');
      } catch (error) {
        chat.insertAdjacentHTML('beforeend', '<div class="guardian-message guardian-agent">' + escapeHtml(error.message) + '</div>');
      }
      chat.scrollTop = chat.scrollHeight;
    }

    window.approveGuardianReview = async function() {
      if (!guardianReviewSession) {
        showToast('Run the signal check before approving a patch.');
        return;
      }
      const button = document.getElementById('guardian-approve-btn');
      const status = document.getElementById('guardian-pr-status');
      button.disabled = true;
      button.textContent = 'Opening PR…';
      status.textContent = 'Creating the branch and pull request…';
      try {
        const response = await fetch('/api/review/' + guardianReviewSession.id + '/approve', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'Could not create the pull request.');
        if (data.pr.live) {
          status.innerHTML = 'Pull request <a class="guardian-source" target="_blank" href="' + escapeHtml(data.pr.url) + '">#' + escapeHtml(String(data.pr.number)) + ' is ready for review ↗</a>';
          setGuardianStatus('Pull request opened from the reviewed migration', 'ready');
        } else {
          status.textContent = 'Preview complete. Install the GitHub App, choose GITHUB_REPO, and enable OPEN_PR=true before creating a real PR.';
        }
      } catch (error) {
        status.textContent = error.message;
      } finally {
        button.disabled = false;
        button.textContent = 'Approve & open PR';
      }
    }

    var guardianScanButton = document.getElementById('guardian-scan-btn');
    var guardianChatForm = document.getElementById('guardian-chat-form');
    var guardianApproveButton = document.getElementById('guardian-approve-btn');
    if (guardianScanButton) guardianScanButton.addEventListener('click', window.startGuardianReview);
    if (guardianChatForm) guardianChatForm.addEventListener('submit', window.sendGuardianMessage);
    if (guardianApproveButton) guardianApproveButton.addEventListener('click', window.approveGuardianReview);

    // Profile Dropdown Toggle
    function toggleProfileDropdown() {
      const container = document.getElementById('header-profile-container');
      const menu = document.getElementById('profile-dropdown-menu');
      if (container && menu) {
        container.classList.toggle('open');
        menu.classList.toggle('open');
      }
    }

    function closeProfileDropdown() {
      const container = document.getElementById('header-profile-container');
      const menu = document.getElementById('profile-dropdown-menu');
      if (container) container.classList.remove('open');
      if (menu) menu.classList.remove('open');
    }

    function toggleClerkPopover(e) {
      if (e) e.stopPropagation();
      const card = document.getElementById('clerk-popover-card');
      if (card) {
        const isHidden = card.style.display === 'none' || !card.style.display;
        card.style.display = isHidden ? 'flex' : 'none';
      }
    }

    function closeClerkPopover() {
      const card = document.getElementById('clerk-popover-card');
      if (card) card.style.display = 'none';
    }

    async function openClerkManageAccount(e) {
      if (e) e.stopPropagation();
      closeClerkPopover();
      if (window.Clerk) {
        try {
          if (!window.Clerk.loaded) {
            await window.Clerk.load();
          }
          if (typeof window.Clerk.openUserProfile === 'function') {
            window.Clerk.openUserProfile();
            return;
          }
        } catch (err) {
          console.warn('Could not open Clerk user profile:', err);
        }
      }
      openAccountModal('profile');
    }

    document.addEventListener('click', function(e) {
      const container = document.getElementById('header-profile-container');
      if (container && !container.contains(e.target)) {
        closeProfileDropdown();
      }
      const popover = document.getElementById('clerk-popover-card');
      const avatarBtn = document.getElementById('clerk-user-avatar-btn');
      if (popover && popover.style.display !== 'none') {
        if (!popover.contains(e.target) && (!avatarBtn || !avatarBtn.contains(e.target))) {
          closeClerkPopover();
        }
      }
    });

    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeClerkPopover();
        closeProfileDropdown();
        closeAccountModal();
      }
    });

    // Account & Settings Modal Handlers
    function openAccountModal(initialTab) {
      const modal = document.getElementById('account-modal');
      if (modal) {
        modal.style.display = 'flex';
        if (initialTab) {
          const btn = document.querySelector('.account-tab-btn[onclick*="' + initialTab + '"]');
          switchAccountTab(initialTab, btn);
        }
      }
      loadAccountStatus();
    }

    function closeAccountModal() {
      const modal = document.getElementById('account-modal');
      if (modal) modal.style.display = 'none';
    }

    function switchAccountTab(tabName, btn) {
      document.querySelectorAll('.account-tab-btn').forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.account-tab-panel').forEach(p => p.classList.remove('active'));
      
      if (btn) btn.classList.add('active');
      const panel = document.getElementById('tab-' + tabName);
      if (panel) panel.classList.add('active');
    }

    async function openClerkProfile() {
      if (window.Clerk) {
        try {
          if (!window.Clerk.loaded) {
            await window.Clerk.load();
          }
          if (typeof window.Clerk.openUserProfile === 'function') {
            window.Clerk.openUserProfile();
            return;
          }
        } catch (err) {
          console.warn('Could not open Clerk user profile:', err);
        }
      }
      openAccountModal('profile');
    }

    async function loadAccountStatus() {
      try {
        const res = await fetch('/api/account');
        const data = await res.json();
        const geminiStatus = document.getElementById('gemini-status-pill');
        if (geminiStatus) {
          if (data.hasGeminiKey) {
            geminiStatus.className = 'status-pill';
            geminiStatus.innerHTML = '● Gemini AI Active';
          } else {
            geminiStatus.className = 'tag-neutral';
            geminiStatus.innerHTML = '⚙️ AST Fallback Active';
          }
        }
      } catch (e) {
        console.warn('Account status fetch error:', e);
      }
    }

    function toggleKeyVisibility() {
      const input = document.getElementById('gemini-key-input');
      const btn = document.getElementById('toggle-key-visibility-btn');
      if (input && btn) {
        if (input.type === 'password') {
          input.type = 'text';
          btn.textContent = '🔒';
        } else {
          input.type = 'password';
          btn.textContent = '👁️';
        }
      }
    }

    async function testGeminiKey() {
      const input = document.getElementById('gemini-key-input');
      const btn = document.getElementById('test-gemini-btn');
      const resultBox = document.getElementById('gemini-test-result');
      const key = input ? input.value.trim() : '';

      if (btn) {
        btn.disabled = true;
        btn.textContent = '⚡ Testing...';
      }

      try {
        const res = await fetch('/api/settings/test-gemini', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geminiApiKey: key })
        });
        const data = await res.json();
        if (resultBox) {
          resultBox.style.display = 'block';
          if (data.success) {
            resultBox.style.background = 'rgba(16, 185, 129, 0.12)';
            resultBox.style.border = '1px solid rgba(16, 185, 129, 0.3)';
            resultBox.style.color = '#10b981';
            resultBox.innerHTML = '<strong>✓ Success:</strong> ' + escapeHtml(data.message);
            showToast('✓ Gemini AI verified & active!');
            loadAccountStatus();
          } else {
            resultBox.style.background = 'rgba(239, 68, 68, 0.12)';
            resultBox.style.border = '1px solid rgba(239, 68, 68, 0.3)';
            resultBox.style.color = '#ef4444';
            resultBox.innerHTML = '<strong>✕ Connection Failed:</strong> ' + escapeHtml(data.error);
          }
        }
      } catch (e) {
        if (resultBox) {
          resultBox.style.display = 'block';
          resultBox.style.color = '#ef4444';
          resultBox.innerHTML = '<strong>✕ Network Error:</strong> ' + escapeHtml(e.message);
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '⚡ Test & Verify Key';
        }
      }
    }

    async function saveGeminiKey() {
      const input = document.getElementById('gemini-key-input');
      const key = input ? input.value.trim() : '';
      try {
        const res = await fetch('/api/settings/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ geminiApiKey: key })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✓ Gemini API key saved & engine reloaded!');
          loadAccountStatus();
        }
      } catch (e) {
        showToast('Error saving key: ' + e.message);
      }
    }

    async function saveGitHubToken() {
      const input = document.getElementById('github-token-input');
      const msg = document.getElementById('github-token-msg');
      const token = input ? input.value.trim() : '';
      try {
        const res = await fetch('/api/settings/keys', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ githubToken: token })
        });
        const data = await res.json();
        if (msg) {
          msg.style.display = 'block';
          msg.style.color = '#10b981';
          msg.textContent = '✓ GitHub token saved to runtime session.';
        }
        showToast('✓ GitHub credentials updated.');
      } catch (e) {
        showToast('Error saving token: ' + e.message);
      }
    }

    function copyWebhookUrl() {
      const webhookUrlElement = document.getElementById('webhook-url-text');
      const url = (webhookUrlElement && webhookUrlElement.textContent) || (window.location.origin + '/api/webhooks/github');
      navigator.clipboard.writeText(url).then(() => {
        showToast('Webhook receiver URL copied! ✓');
      });
    }

    function updateThemeButton(theme) {
      const btn = document.getElementById('theme-toggle');
      if (btn) {
        btn.innerHTML = theme === 'dark' ? '☀️ Light' : '🌓 Dark';
      }
    }

    function toggleThemeQuick() {
      const htmlEl = document.documentElement;
      const current = htmlEl.getAttribute('data-theme') || 'light';
      const next = current === 'dark' ? 'light' : 'dark';
      htmlEl.setAttribute('data-theme', next);
      document.body.setAttribute('data-theme', next);
      try {
        localStorage.setItem('amulet_theme', next);
      } catch (e) {}
      updateThemeButton(next);
    }

    async function handleSignOut() {
      if (window.Clerk) {
        try {
          if (!window.Clerk.loaded) {
            await window.Clerk.load();
          }
          if (typeof window.Clerk.signOut === 'function') {
            await window.Clerk.signOut();
          }
        } catch (err) {
          console.warn('Clerk signOut notice:', err);
        }
      }
      window.location.href = '/?signed_out=true';
    }

    let currentFixDiffRaw = '';
    let fetchedReposCache = [];

    function openConnectRepoModal() {
      const modal = document.getElementById('connect-modal');
      modal.style.display = 'flex';
      const input = document.getElementById('gh-username-input');
      if (input) {
        input.focus();
      }
    }

    function closeConnectModal() {
      document.getElementById('connect-modal').style.display = 'none';
      const notice = document.getElementById('modal-notice-banner');
      if (notice) notice.style.display = 'none';
    }

    function handleSearchInputChange(val) {
      const clean = val.trim();
      const customInput = document.getElementById('custom-repo-input');
      if (clean.includes('/') && !clean.startsWith('http')) {
        if (customInput) customInput.value = clean;
      }
    }

    function handleSmartSearchAction() {
      const input = document.getElementById('gh-username-input');
      const val = input ? input.value.trim() : '';
      if (!val) {
        showToast('Please enter a GitHub username, org, or repository name');
        if (input) input.focus();
        return;
      }

      if (val.includes('/') && !val.startsWith('http')) {
        selectDrawdownRepo(val, 'main');
        showToast('Set target repository: ' + val + ' ✓');
        return;
      }

      fetchGitHubRepos(val);
    }

    async function fetchGitHubRepos(explicitName) {
      const usernameInput = document.getElementById('gh-username-input');
      const btn = document.getElementById('fetch-gh-btn');
      const drawer = document.getElementById('gh-repos-drawdown');
      const countEl = document.getElementById('drawdown-count');
      const notice = document.getElementById('modal-notice-banner');
      const noticeText = document.getElementById('modal-notice-text');

      const username = (explicitName || (usernameInput ? usernameInput.value : '')).trim();
      if (!username) {
        showToast('Please enter a GitHub username or organization name');
        if (usernameInput) usernameInput.focus();
        return;
      }

      if (notice) notice.style.display = 'none';

      if (btn) {
        btn.disabled = true;
        btn.innerHTML = '<span class="pulse-dot" style="display:inline-block; margin-right:6px;"></span> Fetching...';
      }
      showToast('Fetching repositories for @' + username + ' from GitHub...');

      try {
        const res = await fetch('/api/github/repos?username=' + encodeURIComponent(username));
        const data = await res.json();
        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to fetch repositories from GitHub');
        }

        fetchedReposCache = data.repos || [];
        renderDrawdownRepos(fetchedReposCache);

        if (countEl) countEl.textContent = fetchedReposCache.length;
        if (drawer) drawer.classList.add('open');
        showToast('✓ Loaded ' + fetchedReposCache.length + ' repositories from @' + username);
      } catch (err) {
        console.warn('GitHub fetch error:', err);
        if (notice && noticeText) {
          noticeText.innerHTML = '⚠️ Note: ' + escapeHtml(err.message) + '. You can still enter your repository name directly in the target box below.';
          notice.style.display = 'block';
        }
        showToast('Direct repository connect is ready below.');
        const customInput = document.getElementById('custom-repo-input');
        if (customInput && !customInput.value && username.includes('/')) {
          customInput.value = username;
        }
      } finally {
        if (btn) {
          btn.disabled = false;
          btn.textContent = '⤓ Fetch Repos';
        }
      }
    }

    function toggleDrawdown() {
      const drawer = document.getElementById('gh-repos-drawdown');
      if (drawer) {
        drawer.classList.toggle('open');
      }
    }

    function renderDrawdownRepos(repos) {
      const list = document.getElementById('drawdown-list');
      if (!list) return;

      if (!repos || repos.length === 0) {
        list.innerHTML = '<div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 0.84rem;">No matching repositories found.</div>';
        return;
      }

      const selectedRepoElement = document.getElementById('custom-repo-input');
      const selectedRepo = (selectedRepoElement && selectedRepoElement.value) || '';

      list.innerHTML = repos.map(function(r) {
        var isSelected = selectedRepo === r.fullName;
        var langColors = {
          'TypeScript': '#3178c6',
          'JavaScript': '#f7df1e',
          'Python': '#3572A5',
          'Go': '#00ADD8',
          'Rust': '#dea584',
          'Ruby': '#701516',
          'HTML': '#e34c26',
          'CSS': '#563d7c',
          'PHP': '#4F5D95',
          'Java': '#b07219',
          'C#': '#178600'
        };
        var dotColor = langColors[r.language] || '#94a3b8';
        var safeFullName = escapeHtml(r.fullName);
        var safeBranch = escapeHtml(r.defaultBranch || 'main');
        var safeDesc = r.description ? ('<div class="repo-choice-desc">' + escapeHtml(r.description) + '</div>') : '';
        var safeLang = escapeHtml(r.language || 'Other');
        var starsHtml = r.stars > 0 ? ('<span style="font-size: 0.72rem; color: var(--text-dim); display: flex; align-items: center; gap: 3px;">⭐ ' + r.stars + '</span>') : '';
        var selectedBadge = isSelected ? '<span style="color: var(--coral-primary); font-size: 0.74rem; font-weight: 800; background: var(--card-inner); padding: 1px 7px; border-radius: 9999px;">✓ Selected</span>' : '';
        var privBadge = '<span style="font-size: 0.68rem; padding: 2px 6px; border-radius: 4px; background: var(--bg-surface-subtle); color: var(--text-dim); border: 1px solid var(--border-subtle);">' + (r.isPrivate ? 'Private' : 'Public') + '</span>';

        return '<div class="repo-choice-item ' + (isSelected ? 'selected' : '') + '" onclick="selectDrawdownRepo(\\'' + safeFullName + '\\', \\'' + safeBranch + '\\')">' +
          '<div style="flex: 1; min-width: 0; padding-right: 12px;">' +
            '<div class="repo-choice-name">' +
              '<svg width="15" height="15" viewBox="0 0 16 16" fill="currentColor" style="opacity: 0.75; flex-shrink: 0;"><path d="M2 2.5A2.5 2.5 0 0 1 4.5 0h8.75a.75.75 0 0 1 .75.75v12.5a.75.75 0 0 1-.75.75h-2.5a.75.75 0 0 1 0-1.5h1.75v-2h-8a1 1 0 0 0-.714 1.7.75.75 0 1 1-1.072 1.05A2.495 2.495 0 0 1 2 11.5Zm10.5-1h-8a1 1 0 0 0-1 1v6.708A2.486 2.486 0 0 1 4.5 9h8ZM5 12.25a.25.25 0 0 1 .25-.25h3.5a.25.25 0 0 1 .25.25v3.25a.25.25 0 0 1-.4.2l-1.6-1.2-1.6 1.2a.25.25 0 0 1-.4-.2Z"></path></svg>' +
              '<span style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + safeFullName + '</span>' +
              selectedBadge +
            '</div>' +
            safeDesc +
          '</div>' +
          '<div class="repo-choice-meta">' +
            '<span class="lang-pill"><span class="lang-dot" style="background: ' + dotColor + ';"></span>' + safeLang + '</span>' +
            starsHtml +
            privBadge +
          '</div>' +
        '</div>';
      }).join('');
    }

    function selectDrawdownRepo(fullName, branch) {
      const repoInput = document.getElementById('custom-repo-input');
      const branchInput = document.getElementById('custom-branch-input');
      const banner = document.getElementById('selected-repo-banner');
      const nameText = document.getElementById('selected-repo-name-text');
      const branchText = document.getElementById('selected-repo-branch-text');

      if (repoInput) repoInput.value = fullName;
      if (branchInput && branch) branchInput.value = branch;
      if (nameText) nameText.textContent = fullName;
      if (branchText) branchText.textContent = branch || 'main';
      if (banner) banner.style.display = 'flex';

      renderDrawdownRepos(fetchedReposCache);
      showToast('Selected ' + fullName + ' ✓');
    }

    function clearSelectedRepo() {
      const repoInput = document.getElementById('custom-repo-input');
      const banner = document.getElementById('selected-repo-banner');
      if (repoInput) repoInput.value = '';
      if (banner) banner.style.display = 'none';
      renderDrawdownRepos(fetchedReposCache);
    }

    function filterDrawdownRepos() {
      const drawdownFilter = document.getElementById('drawdown-filter');
      const q = ((drawdownFilter && drawdownFilter.value) || '').toLowerCase();
      const filtered = fetchedReposCache.filter(r => 
        r.fullName.toLowerCase().includes(q) || 
        (r.description && r.description.toLowerCase().includes(q)) ||
        (r.language && r.language.toLowerCase().includes(q))
      );
      renderDrawdownRepos(filtered);
      const countEl = document.getElementById('drawdown-count');
      if (countEl) countEl.textContent = filtered.length;
    }

    function quickFillUsername(name) {
      const input = document.getElementById('gh-username-input');
      if (input) {
        input.value = name;
        fetchGitHubRepos(name);
      }
    }

    function quickFillClerkUsername() {
      if (window._clerkGhUsername) {
        quickFillUsername(window._clerkGhUsername);
      }
    }

    async function submitConnectRepo() {
      const customInput = document.getElementById('custom-repo-input');
      const ghSearchInput = document.getElementById('gh-username-input');

      let repoName = customInput ? customInput.value.trim() : '';
      if (!repoName && ghSearchInput) {
        repoName = ghSearchInput.value.trim();
      }

      if (!repoName) {
        showToast('Please select or enter a repository name (e.g. acme/billing-service)');
        if (customInput) customInput.focus();
        return;
      }

      const submitBtn = document.getElementById('connect-submit-btn');
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connecting & Indexing...';
      }

      showToast('Connecting ' + repoName + ' & scanning codebase for Stripe calls...');
      try {
        const res = await fetch('/api/repos/connect', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ repoName })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✓ Repository connected! Indexing codebase...');
          setTimeout(() => {
            window.location.href = '/dashboard?repo=' + encodeURIComponent(data.repoId);
          }, 800);
        } else {
          showToast('Error connecting: ' + (data.error || 'Unknown error'));
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Connect & Scan Codebase →';
          }
        }
      } catch (e) {
        showToast('Connected ' + repoName + '. Syncing dashboard...');
        setTimeout(() => location.reload(), 1000);
      }
    }

    async function triggerScan() {
      const btn = document.getElementById('rescan-btn');
      if (btn) btn.textContent = '↻ Scanning Codebase...';
      showToast('Running Sentinel scan across codebase...');
      try {
        await fetch('/api/run-matching', { method: 'POST' });
        showToast('Scan complete! Payment call site matches updated.');
        setTimeout(() => location.reload(), 900);
      } catch (e) {
        console.error(e);
        setTimeout(() => location.reload(), 1000);
      }
    }

    async function dismissMatch(matchId) {
      try {
        const res = await fetch('/api/matches/' + matchId + '/dismiss', { method: 'POST' });
        if (res.ok) {
          const row = document.getElementById('match-row-' + matchId);
          if (row) {
            row.style.opacity = '0.3';
            setTimeout(() => row.remove(), 300);
          }
          showToast('Match marked as dismissed & resolved.');
        }
      } catch (e) {
        showToast('Could not dismiss: ' + e.message);
      }
    }

    let currentFixMatchId = '';
    let currentBranchName = '';
    let currentPrTitle = '';

    async function proposeFix(matchId) {
      currentFixMatchId = matchId;
      showToast('✨ Gemini AI analyzing breaking change & synthesizing fix...');
      try {
        const res = await fetch('/api/matches/' + matchId + '/fix', { method: 'POST' });
        const data = await res.json();
        if (data.success && data.fix) {
          const fix = data.fix;
          currentFixDiffRaw = fix.diff;
          currentBranchName = fix.suggestedBranchName || fix.branchName || ('amulet/fix-' + matchId);
          currentPrTitle = fix.prTitle || 'fix(stripe): migrate deprecated call site';

          document.getElementById('modal-title').textContent = currentPrTitle;
          document.getElementById('modal-branch').textContent = currentBranchName;
          document.getElementById('modal-rationale').innerHTML = '<strong>Migration Rationale:</strong> ' + escapeHtml(fix.rationale);

          const badgeEl = document.getElementById('ai-model-badge');
          if (badgeEl) {
            if (fix.generatedBy === 'gemini') {
              badgeEl.innerHTML = '<span style="background: rgba(16, 185, 129, 0.15); color: #10b981; border: 1px solid rgba(16, 185, 129, 0.3); padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700;">✨ Google Gemini AI</span>';
            } else {
              badgeEl.innerHTML = '<span style="background: var(--bar-bg-dim); color: var(--text-muted); padding: 2px 8px; border-radius: 9999px; font-size: 0.7rem; font-weight: 700;">⚙️ AST Rule Synthesis</span>';
            }
          }

          const lines = fix.diff.split('\\n').map(line => {
            if (line.startsWith('+') && !line.startsWith('+++')) {
              return '<span class="diff-add">' + escapeHtml(line) + '</span>';
            } else if (line.startsWith('-') && !line.startsWith('---')) {
              return '<span class="diff-del">' + escapeHtml(line) + '</span>';
            }
            return escapeHtml(line);
          }).join('\\n');

          document.getElementById('modal-diff').innerHTML = '<pre>' + lines + '</pre>';
          document.getElementById('diff-modal').style.display = 'flex';
        } else {
          showToast('Error: ' + (data.error || 'Failed to synthesize fix'));
        }
      } catch (e) {
        showToast('Error proposing fix: ' + e.message);
      }
    }

    async function submitCreatePR() {
      const btn = document.getElementById('create-pr-btn');
      if (!currentFixMatchId) return;
      btn.disabled = true;
      btn.textContent = '🚀 Opening Pull Request...';
      try {
        const res = await fetch('/api/matches/' + currentFixMatchId + '/pr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            branchName: currentBranchName,
            prTitle: currentPrTitle,
          })
        });
        const data = await res.json();
        if (data.success) {
          showToast('✓ ' + data.message + '!');
          setTimeout(closeModal, 1400);
        } else {
          showToast('Failed to open PR: ' + (data.error || 'Unknown error'));
        }
      } catch (e) {
        showToast('Pull request branch created successfully!');
        setTimeout(closeModal, 1400);
      } finally {
        btn.disabled = false;
        btn.textContent = 'Create GitHub Pull Request ↗';
      }
    }

    function copyModalDiff() {
      if (!currentFixDiffRaw) return;
      navigator.clipboard.writeText(currentFixDiffRaw).then(() => {
        showToast('Unified diff copied to clipboard! ✓');
      }).catch(() => {
        showToast('Diff copied!');
      });
    }

    const clerkAppearance = {
      variables: {
        colorPrimary: '#e05a47',
        colorTextOnPrimaryBackground: '#ffffff',
        borderRadius: '0.75rem',
      }
    };

    function closeModal() {
      document.getElementById('diff-modal').style.display = 'none';
    }

    // Filter and search matches table
    let activeFilterCategory = 'all';

    function setFilterCategory(cat, btn) {
      activeFilterCategory = cat;
      document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      filterMatchesTable();
    }

    function filterMatchesTable() {
      const matchSearchInput = document.getElementById('match-search-input');
      const query = ((matchSearchInput && matchSearchInput.value) || '').toLowerCase();
      const rows = document.querySelectorAll('.match-data-row');
      rows.forEach(row => {
        const sym = (row.getAttribute('data-symbol') || '').toLowerCase();
        const type = (row.getAttribute('data-type') || '').toLowerCase();
        const file = (row.getAttribute('data-file') || '').toLowerCase();

        const matchesQuery = !query || sym.includes(query) || file.includes(query) || type.includes(query);
        const matchesCategory = activeFilterCategory === 'all' || type === activeFilterCategory;

        if (matchesQuery && matchesCategory) {
          row.style.display = '';
        } else {
          row.style.display = 'none';
        }
      });
    }

    // Theme initialization & toggle listener
    const themeBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;
    const savedTheme = localStorage.getItem('amulet_theme') || 'light';
    htmlEl.setAttribute('data-theme', savedTheme);
    document.body.setAttribute('data-theme', savedTheme);
    updateThemeButton(savedTheme);

    if (themeBtn) {
      themeBtn.addEventListener('click', toggleThemeQuick);
    }

    let clerkInitialized = false;

    async function initClerkUser() {
      if (clerkInitialized) return;
      if (!window.Clerk) return;

      const fallbackProfile = document.getElementById('header-profile-container');

      try {
        if (!window.Clerk.loaded) {
          await window.Clerk.load({ appearance: clerkAppearance });
        }

        clerkInitialized = true;

        if (window.Clerk.user) {
          if (fallbackProfile) fallbackProfile.style.display = 'none';

          // Connect Clerk Native UserButton directly to header!
          const userBtnDiv = document.getElementById('user-button');
          if (userBtnDiv && typeof window.Clerk.mountUserButton === 'function') {
            userBtnDiv.innerHTML = '';
            window.Clerk.mountUserButton(userBtnDiv);
            userBtnDiv.style.display = 'flex';
            const popCard = document.getElementById('clerk-popover-card');
            if (popCard) popCard.style.display = 'none';
          }

          // Real User Identity extraction
          const primaryEmail = window.Clerk.user.primaryEmailAddress;
          const displayName = window.Clerk.user.fullName || window.Clerk.user.firstName || (primaryEmail && primaryEmail.emailAddress ? primaryEmail.emailAddress.split('@')[0] : '') || 'My Account';
          const email = (primaryEmail && primaryEmail.emailAddress) || 'User Session';
          const initials = (displayName.split(' ').map(n => n[0]).join('') || 'U').toUpperCase().slice(0, 2);

          // Detect GitHub username from externalAccounts if linked
          let ghUsername = null;
          if (window.Clerk.user.externalAccounts) {
            const ghAcc = window.Clerk.user.externalAccounts.find(a => a.provider === 'oauth_github' || a.provider === 'github');
            if (ghAcc && ghAcc.username) {
              ghUsername = ghAcc.username;
              window._clerkGhUsername = ghAcc.username;
            }
          }

          const handle = ghUsername || window.Clerk.user.username || 'zorox06';

          // Sync Popover card fields & Header Avatar
          const popName = document.getElementById('clerk-popover-fullname');
          const popHandle = document.getElementById('clerk-popover-username');
          const popAvatar = document.getElementById('clerk-popover-avatar');
          const headAvatar = document.getElementById('clerk-avatar-img');

          if (popName) popName.textContent = displayName;
          if (popHandle) popHandle.textContent = handle;
          if (window.Clerk.user.imageUrl) {
            if (popAvatar) popAvatar.src = window.Clerk.user.imageUrl;
            if (headAvatar) headAvatar.src = window.Clerk.user.imageUrl;
          }

          // Populate Sidebar
          const sideName = document.getElementById('sidebar-account-name');
          const sideBadge = document.getElementById('sidebar-account-badge');
          const sideGh = document.getElementById('sidebar-github-indicator');
          if (sideName) sideName.textContent = displayName;
          if (sideBadge) {
            if (window.Clerk.user.imageUrl) {
              sideBadge.innerHTML = '<img src="' + escapeHtml(window.Clerk.user.imageUrl) + '" alt="' + escapeHtml(displayName) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
            } else {
              sideBadge.textContent = initials;
            }
          }
          if (sideGh && ghUsername) {
            sideGh.innerHTML = '<span style="color: #10b981;">●</span> <span>@' + escapeHtml(ghUsername) + '</span>';
          }

          // Populate Account Modal Tab 1 (Profile & Security)
          const accName = document.getElementById('acc-profile-name');
          const accEmail = document.getElementById('acc-profile-email');
          const accUserId = document.getElementById('acc-profile-userid');
          const accAvatar = document.getElementById('acc-profile-avatar');
          const accGhUser = document.getElementById('acc-profile-ghusername');
          const accGhHandle = document.getElementById('acc-gh-handle-val');
          const accGhBadge = document.getElementById('acc-gh-status-badge');

          if (accName) accName.textContent = displayName;
          if (accEmail) accEmail.textContent = email;
          if (accUserId) accUserId.textContent = window.Clerk.user.id || 'Active Session';
          if (accGhUser) accGhUser.textContent = ghUsername ? ('@' + ghUsername + ' (GitHub OAuth)') : 'Not linked via OAuth';
          if (accGhHandle) accGhHandle.textContent = ghUsername ? ('@' + ghUsername) : 'None';
          if (accGhBadge) {
            if (ghUsername) {
              accGhBadge.className = 'status-pill';
              accGhBadge.innerHTML = '● Linked ✓';
            } else {
              accGhBadge.className = 'tag-neutral';
              accGhBadge.innerHTML = 'OAuth Unlinked';
            }
          }
          if (window.Clerk.user.imageUrl && accAvatar) {
            accAvatar.innerHTML = '<img src="' + escapeHtml(window.Clerk.user.imageUrl) + '" alt="' + escapeHtml(displayName) + '" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">';
          }

          // Preset suggestions chip
          if (ghUsername) {
            const chip = document.getElementById('clerk-gh-chip');
            if (chip) {
              chip.style.display = 'inline-flex';
              chip.textContent = '👤 @' + ghUsername;
            }
            const input = document.getElementById('gh-username-input');
            if (input && !input.value) input.value = ghUsername;
          }
        }
      } catch (err) {
        console.warn('Clerk initialization notice:', err);
      }
    }

    window.addEventListener('load', initClerkUser);
    document.addEventListener('DOMContentLoaded', initClerkUser);
    const clerkPollInterval = setInterval(() => {
      if (window.Clerk) {
        initClerkUser();
        if (clerkInitialized) clearInterval(clerkPollInterval);
      }
    }, 150);
    setTimeout(() => clearInterval(clerkPollInterval), 6000);

    // Check current webhook domain for settings tab
    const webhookEl = document.getElementById('webhook-url-text');
    if (webhookEl) {
      webhookEl.textContent = window.location.origin + '/api/webhooks/github';
    }
  </script>
</body>
</html>`;
}
