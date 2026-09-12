export interface LandingPageProps {
  publishableKey: string;
  totalBreakingCount: number;
  totalCallSitesCount: number;
  totalReposCount: number;
}

export function renderLandingPage(props: LandingPageProps): string {
  return `<!DOCTYPE html>
<html lang="en" data-theme="light">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Amulet.ai — API Breaking-Change Guardian (Stripe / TypeScript)</title>
  <meta name="description" content="Amulet continuously monitors Stripe release notes against your TypeScript codebase and proposes verified, drop-in GitHub PR fixes before production breaks.">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --font-main: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      --font-mono: 'JetBrains Mono', monospace;

      /* Flourish Terracotta / Coral Accent */
      --coral-primary: #e05a47;
      --coral-hover: #cf4b38;
      --coral-light: rgba(224, 90, 71, 0.1);
      --coral-border: rgba(224, 90, 71, 0.28);
      --coral-glow: 0 12px 36px rgba(224, 90, 71, 0.35);

      /* Flourish Light Theme (Warm Cream Luxury) */
      --bg-canvas: #f4f3ef;
      --bg-surface: #ffffff;
      --bg-surface-subtle: #f9f8f5;
      --bg-surface-elevated: #ffffff;
      --border-subtle: rgba(0, 0, 0, 0.07);
      --border-strong: rgba(0, 0, 0, 0.12);
      --text-main: #171513;
      --text-muted: #66625f;
      --text-dim: #999490;
      --card-shadow: 0 30px 70px -15px rgba(0, 0, 0, 0.07), 0 0 1px rgba(0,0,0,0.06);
      --card-inner: #fcfbfa;
      --bar-bg-dim: #e4e2dd;
      --code-bg: #141113;
      --code-border: #2c2528;
    }

    [data-theme="dark"] {
      /* Flourish Dark Theme (Obsidian & Espresso Glow) */
      --bg-canvas: #120f11;
      --bg-surface: #1a1618;
      --bg-surface-subtle: #221d20;
      --bg-surface-elevated: #282225;
      --border-subtle: rgba(255, 255, 255, 0.08);
      --border-strong: rgba(255, 255, 255, 0.14);
      --text-main: #f5f3ef;
      --text-muted: #9e9996;
      --text-dim: #6e6966;
      --card-shadow: 0 35px 80px -20px rgba(0, 0, 0, 0.65), 0 0 1px rgba(255,255,255,0.08);
      --card-inner: #181416;
      --bar-bg-dim: #2f2a2d;
      --code-bg: #0d0a0c;
      --code-border: #241d21;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      scroll-behavior: smooth;
    }

    body {
      font-family: var(--font-main);
      background-color: var(--bg-canvas);
      color: var(--text-main);
      transition: background-color 0.3s cubic-bezier(0.16, 1, 0.3, 1), color 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      overflow-x: hidden;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      background-image: 
        radial-gradient(ellipse 60% 40% at 50% -10%, rgba(224, 90, 71, 0.08) 0%, transparent 70%);
      background-repeat: no-repeat;
    }

    [data-theme="dark"] body {
      background-image: 
        radial-gradient(ellipse 70% 45% at 20% -10%, rgba(224, 90, 71, 0.22) 0%, transparent 65%),
        radial-gradient(ellipse 65% 45% at 80% -10%, rgba(224, 90, 71, 0.16) 0%, transparent 65%);
    }

    /* Floating Rounded Capsule Navigation Bar */
    header {
      position: sticky;
      top: 18px;
      z-index: 100;
      margin: 18px auto 0;
      max-width: 1100px;
      width: calc(100% - 48px);
      background: rgba(255, 255, 255, 0.86);
      backdrop-filter: blur(28px);
      -webkit-backdrop-filter: blur(28px);
      border: 1px solid var(--border-strong);
      border-radius: 9999px;
      box-shadow: 0 16px 36px -12px rgba(0, 0, 0, 0.08), 0 0 1px rgba(0, 0, 0, 0.06);
      transition: all 0.3s ease;
    }
    [data-theme="dark"] header {
      background: rgba(26, 22, 24, 0.85);
      border-color: rgba(255, 255, 255, 0.12);
      box-shadow: 0 20px 48px -14px rgba(0, 0, 0, 0.7), 0 0 1px rgba(255, 255, 255, 0.1);
    }
    .nav-inner {
      padding: 8px 10px 8px 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .logo-group {
      display: flex;
      align-items: center;
      gap: 10px;
      text-decoration: none;
      color: var(--text-main);
      font-weight: 800;
      font-size: 1.18rem;
      letter-spacing: -0.025em;
    }
    .logo-icon-svg {
      width: 24px;
      height: 24px;
      color: var(--coral-primary);
      flex-shrink: 0;
    }
    .nav-links {
      display: flex;
      align-items: center;
      gap: 4px;
      list-style: none;
    }
    .nav-links a {
      text-decoration: none;
      color: var(--text-muted);
      font-size: 0.88rem;
      font-weight: 600;
      padding: 7px 16px;
      border-radius: 9999px;
      transition: all 0.2s ease;
      display: inline-flex;
      align-items: center;
    }
    .nav-links a:hover {
      color: var(--text-main);
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme="dark"] .nav-links a:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .nav-actions {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    /* Buttons */
    .btn-ghost {
      background: transparent;
      border: none;
      color: var(--text-main);
      font-size: 0.88rem;
      font-weight: 600;
      cursor: pointer;
      padding: 8px 16px;
      border-radius: 9999px;
      transition: all 0.2s ease;
      font-family: inherit;
    }
    .btn-ghost:hover {
      background: rgba(0, 0, 0, 0.05);
    }
    [data-theme="dark"] .btn-ghost:hover {
      background: rgba(255, 255, 255, 0.08);
    }
    .btn-coral {
      background: var(--coral-primary);
      color: #ffffff !important;
      border: none;
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      padding: 10px 24px;
      border-radius: 9999px;
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
      box-shadow: 0 6px 18px rgba(224, 90, 71, 0.35);
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
    }
    .btn-coral:hover {
      background: var(--coral-hover);
      box-shadow: 0 8px 24px rgba(224, 90, 71, 0.5);
      transform: translateY(-1.5px);
    }
    .btn-coral:active {
      transform: translateY(0);
    }
    .btn-secondary {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      color: var(--text-main);
      font-size: 0.9rem;
      font-weight: 600;
      cursor: pointer;
      padding: 10px 22px;
      border-radius: 9999px;
      transition: all 0.2s ease;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      font-family: inherit;
    }
    .btn-secondary:hover {
      background: var(--bg-surface-subtle);
      border-color: var(--text-muted);
      transform: translateY(-1px);
    }
    .theme-toggle-btn {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      width: 38px;
      height: 38px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: var(--text-muted);
      font-size: 1rem;
      transition: all 0.2s ease;
    }
    .theme-toggle-btn:hover {
      color: var(--text-main);
      border-color: var(--border-strong);
      transform: rotate(15deg);
    }

    /* Hero Section */
    .hero-section {
      max-width: 1200px;
      margin: 0 auto;
      padding: 68px 24px 44px;
      text-align: center;
    }
    .announcement-pill {
      display: inline-flex;
      align-items: center;
      gap: 10px;
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 9999px;
      padding: 7px 18px;
      font-size: 0.84rem;
      font-weight: 600;
      color: var(--text-muted);
      margin-bottom: 28px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.03);
      cursor: pointer;
      transition: all 0.25s ease;
      text-decoration: none;
    }
    .announcement-pill:hover {
      border-color: var(--coral-border);
      color: var(--coral-primary);
      transform: translateY(-1px);
      box-shadow: 0 6px 18px rgba(224, 90, 71, 0.15);
    }
    .badge-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: var(--coral-primary);
      box-shadow: 0 0 10px var(--coral-primary);
      animation: pulse-dot 2s infinite;
    }
    @keyframes pulse-dot {
      0% { box-shadow: 0 0 0 0 rgba(224, 90, 71, 0.7); }
      70% { box-shadow: 0 0 0 8px rgba(224, 90, 71, 0); }
      100% { box-shadow: 0 0 0 0 rgba(224, 90, 71, 0); }
    }
    .hero-title {
      font-size: 4.2rem;
      font-weight: 800;
      line-height: 1.1;
      letter-spacing: -0.045em;
      margin-bottom: 22px;
      color: var(--text-main);
      text-wrap: balance;
    }
    .hero-title span.accent {
      color: var(--coral-primary);
    }
    .hero-subtitle {
      max-width: 740px;
      margin: 0 auto 40px;
      font-size: 1.2rem;
      line-height: 1.6;
      color: var(--text-muted);
      font-weight: 400;
      text-wrap: balance;
    }
    .trust-bullets {
      display: flex;
      justify-content: center;
      gap: 28px;
      font-size: 0.85rem;
      color: var(--text-dim);
      font-weight: 500;
      margin-top: 18px;
      flex-wrap: wrap;
    }
    .trust-bullet-item {
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }

    /* Legit System Metrics (Zero Larping) */
    .metrics-ribbon {
      max-width: 1100px;
      margin: 0 auto 50px;
      padding: 0 24px;
    }
    .metrics-ribbon-box {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 22px 32px;
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 20px;
      text-align: center;
      box-shadow: 0 10px 30px -10px rgba(0,0,0,0.04);
    }
    .metric-item-val {
      font-size: 1.8rem;
      font-weight: 800;
      letter-spacing: -0.03em;
      color: var(--text-main);
    }
    .metric-item-lbl {
      font-size: 0.78rem;
      color: var(--text-muted);
      font-weight: 600;
      margin-top: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    /* Legit Ecosystem / Tech Stack (Zero Larping) */
    .ecosystem-section {
      max-width: 1040px;
      margin: 0 auto 70px;
      text-align: center;
      padding: 0 24px;
    }
    .ecosystem-title {
      font-size: 0.78rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.09em;
      color: var(--text-dim);
      margin-bottom: 24px;
    }
    .ecosystem-row {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 36px;
      flex-wrap: wrap;
    }
    .ecosystem-badge {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      padding: 8px 18px;
      border-radius: 9999px;
      font-size: 0.92rem;
      font-weight: 700;
      color: var(--text-main);
      box-shadow: 0 4px 12px rgba(0,0,0,0.02);
      transition: all 0.2s ease;
    }
    .ecosystem-badge:hover {
      border-color: var(--coral-border);
      transform: translateY(-1px);
    }

    /* Embedded Showcase Dashboard (Exact Flourish Mockup) */
    .showcase-wrapper {
      max-width: 1180px;
      margin: 0 auto 100px;
      position: relative;
      padding: 0 24px;
    }
    .showcase-window {
      background: var(--bg-surface);
      border: 1px solid var(--border-strong);
      border-radius: 32px;
      box-shadow: var(--card-shadow);
      overflow: hidden;
      transition: all 0.3s ease;
    }
    .window-header-bar {
      padding: 14px 20px;
      background: var(--bg-surface-subtle);
      border-bottom: 1px solid var(--border-subtle);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .window-dots {
      display: flex;
      gap: 7px;
      align-items: center;
    }
    .window-dot {
      width: 11px;
      height: 11px;
      border-radius: 50%;
    }
    .dot-red { background: #ff5f56; }
    .dot-yellow { background: #ffbd2e; }
    .dot-green { background: #27c93f; }
    .window-title-pill {
      font-size: 0.76rem;
      color: var(--text-dim);
      background: var(--bg-surface);
      padding: 3px 14px;
      border-radius: 9999px;
      border: 1px solid var(--border-subtle);
      font-family: var(--font-mono);
    }
    .showcase-frame {
      padding: 24px;
      display: grid;
      grid-template-columns: 215px 1fr;
      gap: 20px;
    }

    /* Left Mini Sidebar */
    .mini-sidebar {
      background: var(--bg-surface-subtle);
      border-radius: 20px;
      padding: 20px 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .sidebar-top {
      display: flex;
      flex-direction: column;
      gap: 14px;
    }
    .sidebar-logo-circle {
      width: 42px;
      height: 42px;
      background: var(--text-main);
      color: var(--bg-canvas);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      font-size: 1.15rem;
      margin-bottom: 4px;
    }
    .collapse-pill {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      padding: 6px 12px;
      font-size: 0.78rem;
      color: var(--text-muted);
      display: inline-flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
    }
    .mini-search {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 9999px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.76rem;
      color: var(--text-dim);
    }
    .user-profile-widget {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 18px;
    }
    .avatar-img {
      width: 36px;
      height: 36px;
      border-radius: 50%;
      background: var(--coral-light);
      color: var(--coral-primary);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 700;
      font-size: 0.92rem;
    }
    .team-avatar-stack {
      display: flex;
      align-items: center;
      margin-top: 10px;
    }
    .mini-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid var(--bg-surface-subtle);
      margin-left: -6px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.68rem;
      font-weight: 700;
      color: #fff;
    }
    .mini-avatar:first-child { margin-left: 0; }

    /* Showcase Main Grid */
    .showcase-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 18px;
    }
    .widget-box {
      background: var(--card-inner);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      padding: 20px;
    }
    .widget-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 14px;
    }
    .widget-title {
      font-size: 0.95rem;
      font-weight: 700;
      letter-spacing: -0.01em;
    }

    /* Tasks / Repos Widget */
    .task-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 11px 14px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      transition: all 0.2s ease;
    }
    .task-item:hover {
      border-color: var(--coral-border);
      transform: translateX(2px);
    }
    .task-name {
      font-size: 0.84rem;
      font-weight: 600;
    }
    .task-sub {
      font-size: 0.74rem;
      color: var(--text-dim);
      font-family: var(--font-mono);
      margin-top: 2px;
    }
    .tag-urgent {
      background: var(--coral-primary);
      color: #ffffff;
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 700;
    }
    .tag-neutral {
      background: var(--bar-bg-dim);
      color: var(--text-muted);
      padding: 3px 9px;
      border-radius: 9999px;
      font-size: 0.68rem;
      font-weight: 600;
    }

    /* Revenue & Expenses Bar Chart */
    .bar-chart-container {
      display: flex;
      align-items: flex-end;
      gap: 10px;
      height: 96px;
      padding: 10px 0 6px;
    }
    .chart-bar-group {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 4px;
      height: 100%;
      justify-content: flex-end;
    }
    .chart-bar-top {
      width: 100%;
      background: var(--coral-primary);
      border-radius: 5px 5px 0 0;
      transition: height 0.4s ease;
    }
    .chart-bar-bot {
      width: 100%;
      background: var(--bar-bg-dim);
      border-radius: 0 0 5px 5px;
    }
    .chart-days-row {
      display: flex;
      justify-content: space-between;
      font-size: 0.68rem;
      color: var(--text-dim);
      font-family: var(--font-mono);
      margin-top: 6px;
      padding: 0 4px;
    }

    /* Activity Manager Cards */
    .activity-row {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 10px;
      margin-top: 10px;
    }
    .activity-sub-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 14px;
      padding: 12px 14px;
    }

    /* Stylized Coral Card */
    .styled-card {
      background: linear-gradient(135deg, var(--coral-primary) 0%, #cf4b38 100%);
      color: #ffffff;
      border-radius: 18px;
      padding: 18px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 126px;
      box-shadow: 0 10px 26px rgba(224, 90, 71, 0.35);
    }

    /* Section Headings */
    .section-title {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: -0.035em;
      margin-bottom: 14px;
      text-wrap: balance;
    }
    .section-sub {
      color: var(--text-muted);
      font-size: 1.1rem;
      max-width: 680px;
      margin: 0 auto;
      text-wrap: balance;
    }

    /* Professional Code Migration Preview Section */
    .code-demo-section {
      max-width: 1180px;
      margin: 0 auto 110px;
      padding: 0 24px;
    }
    .code-demo-box {
      background: var(--code-bg);
      border: 1px solid var(--code-border);
      border-radius: 24px;
      overflow: hidden;
      box-shadow: var(--card-shadow);
    }
    .code-demo-header {
      background: rgba(255, 255, 255, 0.03);
      border-bottom: 1px solid var(--code-border);
      padding: 14px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .code-demo-tabs {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    .demo-tab {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 6px 16px;
      border-radius: 9999px;
      font-size: 0.82rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: var(--font-mono);
    }
    .demo-tab:hover {
      color: #f1f5f9;
      border-color: rgba(255, 255, 255, 0.25);
    }
    .demo-tab.active {
      background: var(--coral-primary);
      color: #ffffff;
      border-color: var(--coral-primary);
    }
    .editor-file-bar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: rgba(0, 0, 0, 0.2);
      border-bottom: 1px solid var(--code-border);
      padding: 8px 20px;
      font-family: var(--font-mono);
      font-size: 0.78rem;
      color: #94a3b8;
    }
    .code-demo-content {
      padding: 20px 24px;
      font-family: var(--font-mono);
      font-size: 0.88rem;
      line-height: 1.8;
      color: #e2e8f0;
      overflow-x: auto;
    }
    .code-line {
      display: flex;
      align-items: center;
      padding: 2px 0;
      white-space: pre;
    }
    .line-num {
      width: 32px;
      color: #475569;
      user-select: none;
      flex-shrink: 0;
      font-size: 0.8rem;
    }
    .diff-del-row {
      background: rgba(244, 63, 94, 0.12);
      color: #fb7185;
      border-left: 3px solid #f43f5e;
      padding-left: 8px;
      margin: 3px 0;
      border-radius: 0 6px 6px 0;
    }
    .diff-add-row {
      background: rgba(16, 185, 129, 0.12);
      color: #34d399;
      border-left: 3px solid #10b981;
      padding-left: 8px;
      margin: 3px 0;
      border-radius: 0 6px 6px 0;
    }
    .kw { color: #f472b6; font-weight: 600; }
    .fn { color: #60a5fa; }
    .str { color: #fcd34d; }
    .obj { color: #a78bfa; }
    .prop { color: #93c5fd; }
    .comm { color: #64748b; font-style: italic; }

    /* Professional PR Rationale Card */
    .pr-spec-card {
      margin-top: 16px;
      padding: 16px 20px;
      border-radius: 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid var(--code-border);
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 12px;
    }
    .pr-spec-left {
      max-width: 760px;
    }
    .pr-spec-title {
      font-size: 0.84rem;
      font-weight: 700;
      color: var(--coral-primary);
      letter-spacing: 0.04em;
      text-transform: uppercase;
      margin-bottom: 4px;
    }
    .pr-spec-desc {
      font-size: 0.86rem;
      color: #cbd5e1;
      line-height: 1.5;
    }

    /* Executive B2B Comparison Section */
    .comparison-section {
      max-width: 1180px;
      margin: 0 auto 110px;
      padding: 0 24px;
    }
    .comparison-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 24px;
      margin-top: 40px;
    }
    .comparison-card {
      border-radius: 24px;
      padding: 34px 30px;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }
    .comparison-card.bad {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
    }
    .comparison-card.good {
      background: var(--bg-surface);
      border: 2px solid var(--coral-primary);
      position: relative;
    }
    .comparison-badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 0.75rem;
      font-weight: 800;
      padding: 4px 14px;
      border-radius: 9999px;
      margin-bottom: 16px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .comparison-badge.bad {
      background: rgba(0, 0, 0, 0.06);
      color: var(--text-muted);
    }
    [data-theme="dark"] .comparison-badge.bad {
      background: rgba(255, 255, 255, 0.08);
    }
    .comparison-badge.good {
      background: var(--coral-primary);
      color: #ffffff;
    }
    .comp-list {
      list-style: none;
      margin-top: 20px;
    }
    .comp-list li {
      font-size: 0.92rem;
      margin-bottom: 16px;
      display: flex;
      align-items: flex-start;
      gap: 12px;
      line-height: 1.55;
    }

    /* 3-Step Guided Journey Section */
    .steps-section {
      max-width: 1180px;
      margin: 0 auto 110px;
      padding: 0 24px;
    }
    .steps-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 24px;
      margin-top: 44px;
    }
    .step-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 24px;
      padding: 34px 30px;
      box-shadow: var(--card-shadow);
      position: relative;
      transition: all 0.25s ease;
    }
    .step-card:hover {
      transform: translateY(-4px);
      border-color: var(--coral-border);
    }
    .step-number {
      font-size: 0.82rem;
      font-weight: 800;
      color: var(--coral-primary);
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }
    .step-card h3 {
      font-size: 1.35rem;
      font-weight: 800;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }
    .step-card p {
      font-size: 0.94rem;
      color: var(--text-muted);
      line-height: 1.65;
    }

    /* Pricing Section (Clean 2-Tier: $30/mo & Enterprise) */
    .pricing-section {
      max-width: 960px;
      margin: 0 auto 110px;
      padding: 0 24px;
      text-align: center;
    }
    .pricing-grid {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 28px;
      margin-top: 44px;
      text-align: left;
    }
    .pricing-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 28px;
      padding: 40px 36px;
      box-shadow: var(--card-shadow);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.25s ease;
    }
    .pricing-card:hover {
      transform: translateY(-3px);
    }
    .pricing-card.featured {
      border: 2px solid var(--coral-primary);
      box-shadow: var(--card-shadow), 0 0 35px rgba(224, 90, 71, 0.16);
      position: relative;
    }
    .featured-badge {
      position: absolute;
      top: -14px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--coral-primary);
      color: #ffffff;
      font-size: 0.74rem;
      font-weight: 800;
      padding: 4px 16px;
      border-radius: 9999px;
      letter-spacing: 0.06em;
    }
    .price-value {
      font-size: 3.2rem;
      font-weight: 800;
      letter-spacing: -0.04em;
      margin: 18px 0 6px;
    }
    .price-sub {
      font-size: 0.86rem;
      color: var(--text-dim);
      margin-bottom: 28px;
    }
    .feature-list {
      list-style: none;
      margin-bottom: 32px;
    }
    .feature-list li {
      font-size: 0.92rem;
      color: var(--text-muted);
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .check-svg {
      width: 16px;
      height: 16px;
      color: #10b981;
      flex-shrink: 0;
    }

    /* FAQ Section */
    .faq-section {
      max-width: 880px;
      margin: 0 auto 110px;
      padding: 0 24px;
    }
    .faq-item {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: 20px;
      margin-bottom: 12px;
      overflow: hidden;
      transition: all 0.2s ease;
    }
    .faq-question {
      padding: 22px 26px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      cursor: pointer;
      font-size: 1.05rem;
      font-weight: 700;
      user-select: none;
    }
    .faq-icon {
      font-size: 1.3rem;
      color: var(--text-dim);
      transition: transform 0.25s ease;
    }
    .faq-answer {
      padding: 0 26px 24px;
      font-size: 0.94rem;
      color: var(--text-muted);
      line-height: 1.65;
      display: none;
    }
    .faq-item.active .faq-answer {
      display: block;
    }
    .faq-item.active .faq-icon {
      transform: rotate(45deg);
      color: var(--coral-primary);
    }

    /* Pre-Footer Banner */
    .prefooter-banner {
      max-width: 1180px;
      margin: 0 auto 90px;
      padding: 0 24px;
    }
    .prefooter-box {
      background: linear-gradient(135deg, var(--coral-primary) 0%, #cf4b38 100%);
      border-radius: 36px;
      padding: 68px 44px;
      text-align: center;
      color: #ffffff;
      box-shadow: 0 26px 65px -15px rgba(224, 90, 71, 0.5);
    }
    .prefooter-box h2 {
      font-size: 2.9rem;
      font-weight: 800;
      letter-spacing: -0.035em;
      margin-bottom: 16px;
    }
    .prefooter-box p {
      font-size: 1.15rem;
      opacity: 0.94;
      max-width: 620px;
      margin: 0 auto 36px;
      line-height: 1.6;
    }

    /* Rich Multi-Column Footer */
    footer {
      border-top: 1px solid var(--border-subtle);
      padding: 60px 24px 36px;
      background: var(--bg-surface);
      margin-top: auto;
    }
    .footer-top {
      max-width: 1180px;
      margin: 0 auto 40px;
      display: grid;
      grid-template-columns: 2fr 1fr 1fr 1fr;
      gap: 36px;
    }
    .footer-col-title {
      font-size: 0.8rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--text-dim);
      margin-bottom: 16px;
    }
    .footer-links {
      list-style: none;
    }
    .footer-links li {
      margin-bottom: 10px;
    }
    .footer-links a {
      color: var(--text-muted);
      text-decoration: none;
      font-size: 0.88rem;
      transition: color 0.2s ease;
    }
    .footer-links a:hover {
      color: var(--coral-primary);
    }
    .footer-status-pill {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 6px 14px;
      border-radius: 9999px;
      background: rgba(16, 185, 129, 0.1);
      border: 1px solid rgba(16, 185, 129, 0.2);
      color: #10b981;
      font-size: 0.78rem;
      font-weight: 700;
      margin-top: 16px;
    }
    .footer-bottom {
      max-width: 1180px;
      margin: 0 auto;
      padding-top: 24px;
      border-top: 1px solid var(--border-subtle);
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 0.84rem;
      color: var(--text-dim);
      flex-wrap: wrap;
      gap: 16px;
    }

    /* Clerk Modals Mount Backdrop */
    .clerk-mount {
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0, 0, 0, 0.65);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      z-index: 1000;
      display: none;
      align-items: center;
      justify-content: center;
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

    /* Mobile Responsiveness */
    @media (max-width: 960px) {
      .hero-title { font-size: 2.8rem; }
      .showcase-frame { grid-template-columns: 1fr; }
      .mini-sidebar { display: none; }
      .showcase-grid { grid-template-columns: 1fr; }
      .steps-grid { grid-template-columns: 1fr; }
      .pricing-grid { grid-template-columns: 1fr; }
      .comparison-grid { grid-template-columns: 1fr; }
      .footer-top { grid-template-columns: 1fr 1fr; }
      .metrics-ribbon-box { grid-template-columns: repeat(2, 1fr); }
      .nav-links { display: none; }
    }
  </style>

  <script
    async
    crossorigin="anonymous"
    data-clerk-publishable-key="${props.publishableKey}"
    src="https://equal-flamingo-6599.clerk.accounts.dev/npm/@clerk/clerk-js@latest/dist/clerk.browser.js"
    type="text/javascript"
  ></script>
</head>
<body>

  <!-- Floating Rounded Capsule Navigation Bar -->
  <header>
    <div class="nav-inner">
      <a href="/" class="logo-group">
        <svg class="logo-icon-svg" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 2L14.3 7.8L20 6.5L16.5 11.2L21.5 14.5L15.5 16L16.2 22L12 18.2L7.8 22L8.5 16L2.5 14.5L7.5 11.2L4 6.5L9.7 7.8L12 2Z"/>
        </svg>
        <span>Amulet.ai</span>
      </a>

      <ul class="nav-links">
        <li><a href="#migration-preview">Migration Engine</a></li>
        <li><a href="#how-it-works">How It Works</a></li>
        <li><a href="#comparison">Why Amulet</a></li>
        <li><a href="#pricing">Pricing</a></li>
        <li><a href="#faq">FAQ</a></li>
      </ul>

      <div class="nav-actions">
        <button id="theme-toggle" class="theme-toggle-btn" title="Toggle Light/Dark Mode" aria-label="Toggle Theme">
          🌓
        </button>

        <div id="logged-out-controls" style="display: flex; align-items: center; gap: 8px;">
          <button id="nav-login-btn" onclick="openClerkModal('signin')" class="btn-ghost">Log In</button>
          <button id="nav-signup-btn" onclick="openClerkModal('signup')" class="btn-coral">Open Account</button>
        </div>

        <div id="logged-in-controls" style="display: none; align-items: center; gap: 12px;">
          <a href="/dashboard" class="btn-coral">Go to Dashboard →</a>
          <div id="user-button"></div>
        </div>
      </div>
    </div>
  </header>

  <!-- Hero Section matching Screenshot 1 & 4 -->
  <section class="hero-section">
    <div class="announcement-pill" onclick="openClerkModal('signup')" style="cursor: pointer;">
      <span class="badge-dot"></span>
      <span>Stripe Release Sentinel · Automated Deprecation Alerts</span>
      <span>→</span>
    </div>

    <h1 class="hero-title">Advance your business.<br><span class="accent">Shield your codebase.</span></h1>
    <p class="hero-subtitle">
      Eliminate checkout and billing outages caused by upstream Stripe API deprecations. Amulet continuously inspects your codebase against release notes and proposes tested, ready-to-merge GitHub pull request fixes weeks before breaking deadlines.
    </p>

    <!-- Single Prominent Action Button -->
    <div style="display: flex; justify-content: center; gap: 14px; margin-bottom: 24px; flex-wrap: wrap;">
      <button id="hero-cta-btn" onclick="openClerkModal('signup')" class="btn-coral" style="padding: 14px 42px; font-size: 1.05rem; border-radius: 9999px;">
        Connect GitHub Repository →
      </button>
    </div>

    <div class="trust-bullets">
      <div class="trust-bullet-item">✓ 60-Second Setup</div>
      <div class="trust-bullet-item">✓ Read-Only Code Access</div>
      <div class="trust-bullet-item">✓ Zero Production Disruption</div>
    </div>
  </section>

  <!-- Legit System Metrics (Zero Larping) -->
  <div class="metrics-ribbon">
    <div class="metrics-ribbon-box">
      <div>
        <div class="metric-item-val">${props.totalBreakingCount}+</div>
        <div class="metric-item-lbl">Breaking Changes Categorized</div>
      </div>
      <div>
        <div class="metric-item-val">100%</div>
        <div class="metric-item-lbl">Detection Precision Benchmark</div>
      </div>
      <div>
        <div class="metric-item-val">v12 – v20+</div>
        <div class="metric-item-lbl">Stripe Releases Monitored</div>
      </div>
      <div>
        <div class="metric-item-val">0</div>
        <div class="metric-item-lbl">Manual Refactor Overhead</div>
      </div>
    </div>
  </div>

  <!-- Legit Tech Ecosystem Supported (Zero Larping) -->
  <section class="ecosystem-section">
    <div class="ecosystem-title">Engineered for Modern Stripe & TypeScript Ecosystems</div>
    <div class="ecosystem-row">
      <div class="ecosystem-badge"><span>⚡</span> Stripe API</div>
      <div class="ecosystem-badge"><span>🔷</span> TypeScript</div>
      <div class="ecosystem-badge"><span>🟢</span> Node.js</div>
      <div class="ecosystem-badge"><span>▲</span> Next.js</div>
      <div class="ecosystem-badge"><span>🐙</span> GitHub Actions</div>
      <div class="ecosystem-badge"><span>⚙️</span> Express.js</div>
    </div>
  </section>

  <!-- Embedded Showcase Dashboard Mockup (Screenshot 2, 3 & 4) -->
  <div id="interface-preview" class="showcase-wrapper">
    <div class="showcase-window">
      <!-- Window Title Bar -->
      <div class="window-header-bar">
        <div class="window-dots">
          <span class="window-dot dot-red"></span>
          <span class="window-dot dot-yellow"></span>
          <span class="window-dot dot-green"></span>
        </div>
        <div class="window-title-pill">
          amulet.ai/dashboard — live payment exposure sentinel
        </div>
        <div style="font-size: 0.72rem; color: #10b981; font-weight: 700;">
          ● ACTIVE
        </div>
      </div>

      <div class="showcase-frame">
        <!-- Mini Left Sidebar -->
        <div class="mini-sidebar">
          <div class="sidebar-top">
            <div class="sidebar-logo-circle">№</div>
            <div class="collapse-pill">
              <span>=</span>
              <span>&laquo; Collapse</span>
            </div>
            <div class="mini-search">
              <span>🔍 Search call sites...</span>
              <span style="font-size: 0.65rem; background: var(--bg-surface-subtle); padding: 2px 5px; border-radius: 4px;">⌘K</span>
            </div>

            <div class="user-profile-widget">
              <div class="avatar-img">AM</div>
              <div>
                <div style="font-size: 0.82rem; font-weight: 700;">Alex Mercer</div>
                <div style="font-size: 0.7rem; color: var(--text-dim);">Lead Payments Eng</div>
              </div>
            </div>

            <div class="team-avatar-stack">
              <div class="mini-avatar" style="background: #e05a47;">A</div>
              <div class="mini-avatar" style="background: #6366f1;">J</div>
              <div class="mini-avatar" style="background: #10b981;">R</div>
              <div class="mini-avatar" style="background: #3b82f6;">+4</div>
            </div>
          </div>

          <div>
            <a href="/dashboard" class="btn-coral" style="width: 100%; justify-content: center; font-size: 0.8rem; padding: 9px 14px;">
              Open Full Workspace ↗
            </a>
          </div>
        </div>

        <!-- Main Showcase Grid -->
        <div>
          <div class="showcase-grid">
            <!-- Widget 1: My Tasks / Monitored Repos -->
            <div class="widget-box">
              <div class="widget-header">
                <span class="widget-title">Active Repositories</span>
                <div style="display: flex; gap: 6px;">
                  <span style="font-size: 0.72rem; color: var(--text-dim); padding: 3px 8px; border: 1px solid var(--border-subtle); border-radius: 9999px;">
                    Sort: Active
                  </span>
                  <span class="tag-urgent">All Repos (${props.totalReposCount})</span>
                </div>
              </div>

              <div class="task-item">
                <div>
                  <div class="task-name">acme/billing-service</div>
                  <div class="task-sub">Affects: <code>stripe.charges.create</code></div>
                </div>
                <span class="tag-urgent">Urgent</span>
              </div>

              <div class="task-item">
                <div>
                  <div class="task-name">fintech/checkout-portal</div>
                  <div class="task-sub">Affects: <code>stripe.sources.create</code></div>
                </div>
                <span class="tag-urgent">Urgent</span>
              </div>

              <div class="task-item">
                <div>
                  <div class="task-name">enterprise/payment-gateway</div>
                  <div class="task-sub">Affects: <code>stripe.refunds.create</code></div>
                </div>
                <span class="tag-neutral">Shielded</span>
              </div>
            </div>

            <!-- Widget 2: Revenue & Expenses / Payment Exposure -->
            <div class="widget-box">
              <div class="widget-header">
                <span class="widget-title">Payment Volume Shielded</span>
                <span style="font-size: 0.72rem; color: var(--text-dim);">Weekly ˅</span>
              </div>

              <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-dim);">Total Volume</div>
                  <div style="font-size: 1.15rem; font-weight: 800;">$ 23,194.80</div>
                </div>
                <div>
                  <div style="font-size: 0.72rem; color: var(--text-dim);">At Risk (v17+)</div>
                  <div style="font-size: 1.15rem; font-weight: 800; color: var(--coral-primary);">$ 8,145.20</div>
                </div>
              </div>

              <div class="bar-chart-container">
                <div class="chart-bar-group">
                  <div class="chart-bar-top" style="height: 60%;"></div>
                  <div class="chart-bar-bot" style="height: 30%;"></div>
                </div>
                <div class="chart-bar-group">
                  <div class="chart-bar-top" style="height: 75%;"></div>
                  <div class="chart-bar-bot" style="height: 25%;"></div>
                </div>
                <div class="chart-bar-group">
                  <div class="chart-bar-top" style="height: 90%;"></div>
                  <div class="chart-bar-bot" style="height: 20%;"></div>
                </div>
                <div class="chart-bar-group">
                  <div class="chart-bar-top" style="height: 85%;"></div>
                  <div class="chart-bar-bot" style="height: 35%;"></div>
                </div>
                <div class="chart-bar-group">
                  <div class="chart-bar-top" style="height: 95%;"></div>
                  <div class="chart-bar-bot" style="height: 20%;"></div>
                </div>
                <div class="chart-bar-group">
                  <div class="chart-bar-top" style="height: 70%;"></div>
                  <div class="chart-bar-bot" style="height: 40%;"></div>
                </div>
                <div class="chart-bar-group">
                  <div class="chart-bar-top" style="height: 80%;"></div>
                  <div class="chart-bar-bot" style="height: 30%;"></div>
                </div>
              </div>
              <div class="chart-days-row">
                <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
              </div>
            </div>
          </div>

          <!-- Lower Row: Activity Manager & Active Card -->
          <div style="display: grid; grid-template-columns: 1.4fr 1fr; gap: 18px; margin-top: 18px;">
            <div class="widget-box">
              <div class="widget-header">
                <span class="widget-title">Sentinel Radar Activity</span>
                <div style="display: flex; gap: 6px; font-size: 0.72rem;">
                  <span class="tag-neutral">Insights</span>
                  <span class="tag-neutral">Live Feed</span>
                </div>
              </div>

              <div class="activity-row">
                <div class="activity-sub-card">
                  <div style="font-size: 0.72rem; font-weight: 700; color: var(--coral-primary); margin-bottom: 4px;">⚠️ Breaking Alert</div>
                  <div style="font-size: 0.88rem; font-weight: 700;">stripe-node v17.0</div>
                  <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 4px;">${props.totalBreakingCount} changes monitored</div>
                </div>

                <div class="activity-sub-card">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #10b981; margin-bottom: 4px;">Code Scan Live</div>
                  <div style="font-size: 0.88rem; font-weight: 700;">${props.totalCallSitesCount} Call Sites</div>
                  <div style="font-size: 0.7rem; color: var(--text-dim); margin-top: 4px;">100% Precision</div>
                </div>

                <div class="activity-sub-card">
                  <div style="font-size: 0.72rem; font-weight: 700; color: #6366f1; margin-bottom: 4px;">Automated Fix</div>
                  <div style="font-size: 0.88rem; font-weight: 700;">PR Proposer</div>
                  <div style="font-size: 0.7rem; color: var(--coral-primary); font-weight: 700; margin-top: 4px;">Armed ↗</div>
                </div>
              </div>
            </div>

            <!-- Active Card Widget -->
            <div class="widget-box">
              <div class="widget-header">
                <span class="widget-title">Vendor Sentinel</span>
                <span style="font-size: 0.72rem; color: var(--text-dim);">Shield 🔒</span>
              </div>

              <div class="styled-card">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span style="font-family: var(--font-mono); font-size: 0.86rem; letter-spacing: 0.05em;">**** 2719</span>
                  <span style="font-weight: 800; font-size: 0.88rem; letter-spacing: 0.06em;">STRIPE API</span>
                </div>
                <div style="display: flex; justify-content: space-between; align-items: flex-end;">
                  <div>
                    <div style="font-size: 0.7rem; opacity: 0.85;">Guardian State</div>
                    <div style="font-size: 1rem; font-weight: 800;">100% Shielded</div>
                  </div>
                  <a href="/dashboard" class="btn-ghost" style="background: rgba(0,0,0,0.25); color: #fff; font-size: 0.76rem; padding: 6px 14px;">
                    Enter Studio
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Professional Code Migration Engine Preview Section -->
  <section id="migration-preview" class="code-demo-section">
    <div style="text-align: center; margin-bottom: 40px;">
      <h2 class="section-title">
        Precision Code Remediation. Before Production Breaks.
      </h2>
      <p class="section-sub">
        Amulet scans your payment services, detects affected Stripe SDK methods, and prepares minimal, verified pull request migrations with zero spam.
      </p>
    </div>

    <div class="code-demo-box">
      <div class="code-demo-header">
        <div class="code-demo-tabs">
          <button class="demo-tab active" onclick="switchCodeTab('charges', this)">stripe.charges.create</button>
          <button class="demo-tab" onclick="switchCodeTab('sources', this)">stripe.sources.create</button>
          <button class="demo-tab" onclick="switchCodeTab('types', this)">Stripe.Checkout.SessionCreateParams</button>
        </div>
        <div style="display: flex; align-items: center; gap: 10px;">
          <button id="copy-diff-btn" onclick="copyDemoDiff()" class="btn-ghost" style="font-size: 0.78rem; color: #94a3b8; border: 1px solid rgba(255,255,255,0.12); padding: 5px 14px;">
            📋 Copy Diff
          </button>
          <div style="font-size: 0.78rem; color: #94a3b8; font-family: var(--font-mono);">
            branch: amulet/fix-stripe-migration
          </div>
        </div>
      </div>

      <div class="editor-file-bar">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span style="color: #38bdf8; font-weight: 700;">TS</span>
          <span id="demo-file-name">src/services/billing.ts</span>
        </div>
        <div style="color: #64748b;">+1 line · -1 line</div>
      </div>

      <div id="code-demo-body" class="code-demo-content">
        <div class="code-line"><span class="line-num">11</span><span class="kw">export async function</span> <span class="fn">processPayment</span>(amount: <span class="obj">number</span>, currency: <span class="obj">string</span>, source: <span class="obj">string</span>) {</div>
        <div class="code-line"><span class="line-num">12</span>  <span class="comm">// Stripe v17.0: charges.create() deprecated in favor of PaymentIntents</span></div>
        <div class="code-line diff-del-row"><span class="line-num">13</span>- const charge = <span class="kw">await</span> stripe.<span class="fn">charges.create</span>({ amount, currency, source });</div>
        <div class="code-line diff-add-row"><span class="line-num">13</span>+ const paymentIntent = <span class="kw">await</span> stripe.<span class="fn">paymentIntents.create</span>({ amount, currency, <span class="prop">payment_method</span>: source, <span class="prop">confirm</span>: <span class="kw">true</span> });</div>
        <div class="code-line"><span class="line-num">14</span>  <span class="kw">return</span> paymentIntent;</div>
        <div class="code-line"><span class="line-num">15</span>}</div>

        <div class="pr-spec-card">
          <div class="pr-spec-left">
            <div class="pr-spec-title">Stripe v17.0 Migration Specification</div>
            <div class="pr-spec-desc">
              Direct charge creation without customer authentication is deprecated. Automatically refactored to <code>stripe.paymentIntents.create</code> with <code>confirm: true</code> and <code>payment_method</code> for full 3D Secure 2 authentication.
            </div>
          </div>
          <a href="https://github.com/stripe/stripe-node/releases" target="_blank" style="color: var(--coral-primary); font-size: 0.82rem; font-weight: 700; text-decoration: none;">
            View Official Stripe Spec ↗
          </a>
        </div>
      </div>
    </div>
  </section>

  <!-- Executive B2B Comparison Section (Zero Architecture Disclosure) -->
  <section id="comparison" class="comparison-section">
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 class="section-title">
        Manual Upgrades vs Automated Guardian
      </h2>
      <p class="section-sub">
        Why leading payment engineering teams replace manual changelog hunting with continuous protection.
      </p>
    </div>

    <div class="comparison-grid">
      <!-- Manual Status Quo -->
      <div class="comparison-card bad">
        <div>
          <span class="comparison-badge bad">Manual Maintenance</span>
          <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 8px;">The Fragile Status Quo</h3>
          <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6;">
            Relying on developers to spot deprecations across dozens of release notes and internal services.
          </p>
          <ul class="comp-list">
            <li><span>⚠️</span> <div><strong>Manual Changelog Reviews:</strong> Engineers spend hours parsing dense Stripe release docs for every major version bump.</div></li>
            <li><span>⚠️</span> <div><strong>Discovered in Production:</strong> Breaking changes are frequently uncovered only when customer checkouts fail live.</div></li>
            <li><span>⚠️</span> <div><strong>Costly Refactoring Cycles:</strong> Senior developers are pulled off core product delivery to research replacement APIs and write migration code.</div></li>
            <li><span>⚠️</span> <div><strong>Uncertain Microservice Coverage:</strong> Helper wrappers, microservices, and secondary repositories are easily overlooked.</div></li>
          </ul>
        </div>
      </div>

      <!-- Amulet Automated Guardian -->
      <div class="comparison-card good">
        <div>
          <span class="comparison-badge good">Amulet Guardian</span>
          <h3 style="font-size: 1.35rem; font-weight: 800; margin-bottom: 8px;">Automated Continuous Protection</h3>
          <p style="font-size: 0.92rem; color: var(--text-muted); line-height: 1.6;">
            Autonomous monitoring that detects affected payment call sites and delivers verified pull request fixes.
          </p>
          <ul class="comp-list">
            <li><span>✓</span> <div><strong>Proactive Advance Warning:</strong> Automatic detection weeks before Stripe deprecation cutoffs take effect.</div></li>
            <li><span>✓</span> <div><strong>Line-Level Precision:</strong> Pinpoints the exact files and lines across all repositories that require updating.</div></li>
            <li><span>✓</span> <div><strong>Ready-to-Merge Pull Requests:</strong> Delivers minimal, verified git diffs with official migration rationales.</div></li>
            <li><span>✓</span> <div><strong>Human-in-the-Loop:</strong> Your engineering team reviews, runs CI tests, and merges on your own deployment schedule.</div></li>
          </ul>
        </div>
      </div>
    </div>
  </section>

  <!-- 3-Step Guided Journey Section -->
  <section id="how-it-works" class="steps-section">
    <div style="text-align: center; margin-bottom: 30px;">
      <h2 class="section-title">
        How Amulet Protects Production
      </h2>
      <p class="section-sub">
        Continuous, automated breaking-change defense in three streamlined stages.
      </p>
    </div>

    <div class="steps-grid">
      <div class="step-card">
        <div class="step-number">01 / CONNECT</div>
        <h3>Authorize GitHub Repository</h3>
        <p>
          Connect your repositories in seconds with minimally scoped branch read/write permissions. Amulet never asks for access to customer databases, API secret keys, or live payment environments.
        </p>
      </div>

      <div class="step-card">
        <div class="step-number">02 / DETECT</div>
        <h3>Continuous Codebase Analysis</h3>
        <p>
          Continuously scans Stripe changelog releases and maps deprecated symbols to your repository call sites with zero false alarms.
        </p>
      </div>

      <div class="step-card">
        <div class="step-number">03 / HEAL</div>
        <h3>Autonomous Pull Requests</h3>
        <p>
          Synthesizes minimal, non-breaking git diffs with comprehensive migration rationales and opens ready-to-review GitHub PRs weeks before Stripe deprecation cutoffs.
        </p>
      </div>
    </div>
  </section>

  <!-- Pricing Section (Clean $30/mo & Enterprise - No Free Tier) -->
  <section id="pricing" class="pricing-section">
    <h2 class="section-title">
      Simple, Predictable Pricing
    </h2>
    <p class="section-sub">
      One comprehensive plan for engineering teams operating production Stripe integrations.
    </p>

    <div class="pricing-grid">
      <!-- Pro Team Tier ($30/mo) -->
      <div class="pricing-card featured">
        <div class="featured-badge">MOST POPULAR</div>
        <div>
          <h3 style="font-size: 1.35rem; font-weight: 800;">Pro Team</h3>
          <p style="font-size: 0.86rem; color: var(--text-dim); margin-top: 4px;">Complete automated breaking-change defense for production payment pipelines</p>
          <div class="price-value">$30<span style="font-size: 1.05rem; font-weight: 600; color: var(--text-dim);"> USD / mo</span></div>
          <div class="price-sub">Billed monthly · Includes 14-day free trial</div>

          <ul class="feature-list">
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Continuous Stripe Release Monitoring
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Automated GitHub Pull Request Proposals
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Multi-Branch Tracking (main + staging)
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Slack, Discord & Email Deprecation Alerts
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Official Stripe Migration Specs & Rationales
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Unlimited Team Collaborators
            </li>
          </ul>
        </div>
        <button onclick="openClerkModal('signup')" class="btn-coral" style="width: 100%; justify-content: center; font-size: 0.95rem; padding: 12px 20px;">
          Start 14-Day Free Trial
        </button>
      </div>

      <!-- Enterprise Tier -->
      <div class="pricing-card">
        <div>
          <h3 style="font-size: 1.35rem; font-weight: 800;">Enterprise</h3>
          <p style="font-size: 0.86rem; color: var(--text-dim); margin-top: 4px;">For large financial organizations requiring custom SLAs and monorepos</p>
          <div class="price-value">Custom</div>
          <div class="price-sub">Annual contract · Dedicated SLA & support</div>

          <ul class="feature-list">
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Unlimited Repositories & Monorepos
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Private VPC / On-Premises Connector
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              SOC2 Type II & Security Auditing Reports
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Dedicated Solutions Architect & Migration SLA
            </li>
            <li>
              <svg class="check-svg" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
              Custom Invoicing & PO Billing
            </li>
          </ul>
        </div>
        <a href="mailto:enterprise@amulet.ai" class="btn-secondary" style="width: 100%; justify-content: center; font-size: 0.95rem; padding: 12px 20px;">
          Contact Enterprise Sales
        </a>
      </div>
    </div>
  </section>

  <!-- FAQ Section -->
  <section id="faq" class="faq-section">
    <div style="text-align: center; margin-bottom: 40px;">
      <h2 class="section-title">
        Frequently Asked Questions
      </h2>
      <p class="section-sub">
        Technical answers regarding Amulet's capabilities and security standards.
      </p>
    </div>

    <div class="faq-item">
      <div class="faq-question" onclick="toggleFaq(this)">
        <span>How does Amulet detect breaking changes in our codebase?</span>
        <span class="faq-icon">+</span>
      </div>
      <div class="faq-answer">
        Amulet monitors official Stripe release changelogs and semantically maps modified or removed API methods against your repository's payment call sites. This eliminates false alarms on comments, logs, and unrelated variable names.
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-question" onclick="toggleFaq(this)">
        <span>What GitHub permissions does Amulet require?</span>
        <span class="faq-icon">+</span>
      </div>
      <div class="faq-answer">
        Amulet requires only <code>Contents: Read/Write</code> (to inspect payment call sites and branch patches) and <code>Pull Requests: Read/Write</code> (to submit fix proposals). Amulet never accesses environment variables, production secrets, or customer financial databases.
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-question" onclick="toggleFaq(this)">
        <span>Does Amulet merge pull requests automatically?</span>
        <span class="faq-icon">+</span>
      </div>
      <div class="faq-answer">
        No. Amulet adheres strictly to human-in-the-loop engineering. It proposes branch fixes with comprehensive diffs, migration rationales, and official Stripe documentation links, leaving merge decisions entirely to your senior engineers.
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-question" onclick="toggleFaq(this)">
        <span>What Stripe and TypeScript versions are supported?</span>
        <span class="faq-icon">+</span>
      </div>
      <div class="faq-answer">
        Amulet monitors all major and minor releases of <code>stripe-node</code> from v12.0 through v20.0+, with full support for TypeScript 4.x and 5.x across Node.js, Next.js, and Express backends.
      </div>
    </div>

    <div class="faq-item">
      <div class="faq-question" onclick="toggleFaq(this)">
        <span>How does the 14-day free trial work?</span>
        <span class="faq-icon">+</span>
      </div>
      <div class="faq-answer">
        Connect your GitHub repository in under 60 seconds. You receive full access to automated codebase scanning and pull request generation for 14 days with zero risk.
      </div>
    </div>
  </section>

  <!-- Pre-Footer CTA Banner -->
  <div class="prefooter-banner">
    <div class="prefooter-box">
      <h2>Stop Waking Up to Broken Payments.</h2>
      <p>
        Shield your Stripe payment pipeline before the next major release lands. Connect your GitHub repository in under 60 seconds with zero production configuration.
      </p>
      <button onclick="openClerkModal('signup')" class="btn-secondary" style="background: #ffffff; color: var(--coral-primary); padding: 14px 38px; font-size: 1.05rem; border: none; box-shadow: 0 10px 30px rgba(0,0,0,0.15); font-weight: 700;">
        Start 14-Day Free Trial →
      </button>
    </div>
  </div>

  <!-- Rich Footer -->
  <footer>
    <div class="footer-top">
      <div>
        <div style="display: flex; align-items: center; gap: 8px; font-weight: 800; font-size: 1.25rem; color: var(--text-main); margin-bottom: 12px;">
          <svg class="logo-icon-svg" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L14.3 7.8L20 6.5L16.5 11.2L21.5 14.5L15.5 16L16.2 22L12 18.2L7.8 22L8.5 16L2.5 14.5L7.5 11.2L4 6.5L9.7 7.8L12 2Z"/>
          </svg>
          <span>Amulet.ai</span>
        </div>
        <p style="font-size: 0.9rem; color: var(--text-muted); line-height: 1.6; max-width: 320px;">
          The automated API breaking-change sentinel for high-velocity payment engineering teams.
        </p>
        <div class="footer-status-pill">
          <span class="badge-dot"></span>
          <span>All Systems Operational · Stripe Sentinel Active</span>
        </div>
      </div>

      <div>
        <div class="footer-col-title">Product</div>
        <ul class="footer-links">
          <li><a href="/dashboard">Guardian Workspace</a></li>
          <li><a href="#migration-preview">Migration Engine</a></li>
          <li><a href="#comparison">Why Amulet</a></li>
          <li><a href="#pricing">Pricing Plans</a></li>
        </ul>
      </div>

      <div>
        <div class="footer-col-title">Resources</div>
        <ul class="footer-links">
          <li><a href="https://github.com/stripe/stripe-node/releases" target="_blank">Stripe Release Notes</a></li>
          <li><a href="#faq">Engineering FAQ</a></li>
          <li><a href="mailto:support@amulet.ai">Support & SLA</a></li>
        </ul>
      </div>

      <div>
        <div class="footer-col-title">Security & Legal</div>
        <ul class="footer-links">
          <li><a href="#security">SOC2 Type II Readiness</a></li>
          <li><a href="#privacy">Zero-Data Retention Policy</a></li>
          <li><a href="#terms">Terms of Service</a></li>
          <li><a href="#privacy">Privacy Statement</a></li>
        </ul>
      </div>
    </div>

    <div class="footer-bottom">
      <div>&copy; 2026 Amulet.ai Inc. All rights reserved. Built for Stripe / TypeScript payment ecosystems.</div>
      <div style="display: flex; gap: 20px;">
        <a href="/dashboard" style="color: var(--text-dim); text-decoration: none;">Dashboard</a>
        <a href="#how-it-works" style="color: var(--text-dim); text-decoration: none;">Workflow</a>
        <a href="#pricing" style="color: var(--text-dim); text-decoration: none;">Pricing</a>
      </div>
    </div>
  </footer>

  <!-- Clerk Modals Mount Container -->
  <div id="clerk-modal-backdrop" class="clerk-mount">
    <div id="clerk-modal-mount" style="position: relative;">
      <button onclick="closeClerkModal()" style="position: absolute; top: -36px; right: 0; background: transparent; border: none; color: #fff; font-size: 1.4rem; cursor: pointer;">✕</button>
    </div>
  </div>

  <div id="toast" style="position: fixed; bottom: 24px; right: 24px; background: #1e293b; color: #fff; padding: 12px 22px; border-radius: 9999px; font-size: 0.85rem; font-weight: 600; display: none; z-index: 2000; box-shadow: 0 10px 30px rgba(0,0,0,0.3);"></div>

  <script>
    // Theme Toggle Functionality
    const themeToggleBtn = document.getElementById('theme-toggle');
    const htmlEl = document.documentElement;

    const savedTheme = localStorage.getItem('amulet_theme') || 'light';
    htmlEl.setAttribute('data-theme', savedTheme);

    themeToggleBtn.addEventListener('click', () => {
      const current = htmlEl.getAttribute('data-theme');
      const next = current === 'dark' ? 'light' : 'dark';
      htmlEl.setAttribute('data-theme', next);
      localStorage.setItem('amulet_theme', next);
    });

    function showToast(msg) {
      const t = document.getElementById('toast');
      t.textContent = msg;
      t.style.display = 'block';
      setTimeout(() => { t.style.display = 'none'; }, 3000);
    }

    function toggleFaq(el) {
      const item = el.parentElement;
      item.classList.toggle('active');
    }

    const demoSnippets = {
      charges: {
        file: 'src/services/billing.ts',
        lineCount: '+1 line · -1 line',
        lines: [
          { num: '11', content: '<span class="kw">export async function</span> <span class="fn">processPayment</span>(amount: <span class="obj">number</span>, currency: <span class="obj">string</span>, source: <span class="obj">string</span>) {' },
          { num: '12', content: '  <span class="comm">// Stripe v17.0: charges.create() deprecated in favor of PaymentIntents</span>' },
          { num: '13', isDel: true, content: '- const charge = <span class="kw">await</span> stripe.<span class="fn">charges.create</span>({ amount, currency, source });' },
          { num: '13', isAdd: true, content: '+ const paymentIntent = <span class="kw">await</span> stripe.<span class="fn">paymentIntents.create</span>({ amount, currency, <span class="prop">payment_method</span>: source, <span class="prop">confirm</span>: <span class="kw">true</span> });' },
          { num: '14', content: '  <span class="kw">return</span> paymentIntent;' },
          { num: '15', content: '}' }
        ],
        rawDiff: '--- a/src/services/billing.ts\\n+++ b/src/services/billing.ts\\n@@ -13,1 +13,1 @@\\n-const charge = await stripe.charges.create({ amount, currency, source });\\n+const paymentIntent = await stripe.paymentIntents.create({ amount, currency, payment_method: source, confirm: true });',
        specTitle: 'Stripe v17.0 Migration Specification',
        specDesc: 'Direct charge creation without customer authentication is deprecated. Automatically refactored to stripe.paymentIntents.create with confirm: true and payment_method for full 3D Secure 2 authentication.'
      },
      sources: {
        file: 'src/checkout/methods.ts',
        lineCount: '+1 line · -1 line',
        lines: [
          { num: '24', content: '<span class="kw">export async function</span> <span class="fn">attachCardToCustomer</span>(customerId: <span class="obj">string</span>, token: <span class="obj">string</span>) {' },
          { num: '25', content: '  <span class="comm">// Stripe v18.0: Sources API deprecated in favor of PaymentMethods</span>' },
          { num: '26', isDel: true, content: '- const source = <span class="kw">await</span> stripe.<span class="fn">sources.create</span>({ type: <span class="str">"card"</span>, token });' },
          { num: '26', isAdd: true, content: '+ const paymentMethod = <span class="kw">await</span> stripe.<span class="fn">paymentMethods.create</span>({ type: <span class="str">"card"</span>, <span class="prop">card</span>: { token } });' },
          { num: '27', content: '  <span class="kw">return</span> paymentMethod;' },
          { num: '28', content: '}' }
        ],
        rawDiff: '--- a/src/checkout/methods.ts\\n+++ b/src/checkout/methods.ts\\n@@ -26,1 +26,1 @@\\n-const source = await stripe.sources.create({ type: "card", token });\\n+const paymentMethod = await stripe.paymentMethods.create({ type: "card", card: { token } });',
        specTitle: 'Stripe v18.0 Migration Specification',
        specDesc: 'Legacy Sources API superseded by PaymentMethods API for comprehensive fraud prevention and 3D Secure 2 compliance.'
      },
      types: {
        file: 'src/types/checkout.ts',
        lineCount: '+1 line · -1 line',
        lines: [
          { num: '40', content: '<span class="comm">// Stripe v19.0: SessionCreateParams signature extended for embedded checkout</span>' },
          { num: '41', isDel: true, content: '- export function createSession(params: Stripe.Checkout.<span class="obj">SessionCreateParams</span>): <span class="obj">Promise&lt;Session&gt;</span> {' },
          { num: '41', isAdd: true, content: '+ export function createSession(params: Stripe.Checkout.<span class="obj">SessionCreateParams</span> & { <span class="prop">ui_mode</span>?: <span class="str">"embedded"</span> | <span class="str">"hosted"</span> }): <span class="obj">Promise&lt;Session&gt;</span> {' },
          { num: '42', content: '  <span class="kw">return</span> stripe.checkout.sessions.<span class="fn">create</span>(params);' },
          { num: '43', content: '}' }
        ],
        rawDiff: '--- a/src/types/checkout.ts\\n+++ b/src/types/checkout.ts\\n@@ -41,1 +41,1 @@\\n-export function createSession(params: Stripe.Checkout.SessionCreateParams): Promise<Session> {\\n+export function createSession(params: Stripe.Checkout.SessionCreateParams & { ui_mode?: "embedded" | "hosted" }): Promise<Session> {',
        specTitle: 'Stripe v19.0 Migration Specification',
        specDesc: 'Stripe introduced embedded and hosted checkout UI mode parameters. Extended type interfaces prevent compilation failures when upgrading.'
      }
    };

    let activeDemoKey = 'charges';

    function switchCodeTab(key, btn) {
      activeDemoKey = key;
      document.querySelectorAll('.demo-tab').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const d = demoSnippets[key];
      
      document.getElementById('demo-file-name').textContent = d.file;

      const body = document.getElementById('code-demo-body');
      let linesHtml = '';
      for (const l of d.lines) {
        let cls = 'code-line';
        if (l.isDel) cls += ' diff-del-row';
        if (l.isAdd) cls += ' diff-add-row';
        linesHtml += \`<div class="\${cls}"><span class="line-num">\${l.num}</span>\${l.content}</div>\`;
      }

      linesHtml += \`
        <div class="pr-spec-card">
          <div class="pr-spec-left">
            <div class="pr-spec-title">\${d.specTitle}</div>
            <div class="pr-spec-desc">\${d.specDesc}</div>
          </div>
          <a href="https://github.com/stripe/stripe-node/releases" target="_blank" style="color: var(--coral-primary); font-size: 0.82rem; font-weight: 700; text-decoration: none;">
            View Official Stripe Spec ↗
          </a>
        </div>
      \`;

      body.innerHTML = linesHtml;
    }

    function copyDemoDiff() {
      const d = demoSnippets[activeDemoKey];
      navigator.clipboard.writeText(d.rawDiff).then(() => {
        showToast('Unified diff copied to clipboard! ✓');
      }).catch(() => {
        showToast('Copied diff preview!');
      });
    }

    const clerkAppearance = {
      variables: {
        colorPrimary: '#e05a47',
        colorTextOnPrimaryBackground: '#ffffff',
        borderRadius: '0.75rem',
      },
      elements: {
        formField__phoneNumber: { display: 'none !important' },
        formFieldInput__phoneNumber: { display: 'none !important' },
        formFieldLabel__phoneNumber: { display: 'none !important' },
        phoneInputBox: { display: 'none !important' },
        signInAlternativeMethodsPhoneButton: { display: 'none !important' },
        alternativeMethodsPhoneButton: { display: 'none !important' },
        identityPreviewText__phoneNumber: { display: 'none !important' },
      }
    };

    async function openClerkModal(mode) {
      if (!window.Clerk) {
        showToast('Initializing login service... please wait a second.');
        return;
      }

      if (!window.Clerk.loaded) {
        showToast('Connecting to login...');
        try {
          await window.Clerk.load({ appearance: clerkAppearance });
        } catch (err) {
          console.warn('Clerk load error:', err);
        }
      }

      // 1. Try Clerk built-in modal
      try {
        if (mode === 'signup' && typeof window.Clerk.openSignUp === 'function') {
          window.Clerk.openSignUp({
            appearance: clerkAppearance,
            fallbackRedirectUrl: '/dashboard',
            signInFallbackRedirectUrl: '/dashboard',
          });
          return;
        } else if (typeof window.Clerk.openSignIn === 'function') {
          window.Clerk.openSignIn({
            appearance: clerkAppearance,
            fallbackRedirectUrl: '/dashboard',
            signUpFallbackRedirectUrl: '/dashboard',
          });
          return;
        }
      } catch (e) {
        console.warn('openSignIn/SignUp failed, falling back to embedded modal mount:', e);
      }

      // 2. Fallback: Mount inside our modal backdrop
      const backdrop = document.getElementById('clerk-modal-backdrop');
      const mount = document.getElementById('clerk-modal-mount');
      if (backdrop && mount) {
        backdrop.style.display = 'flex';
        mount.innerHTML = '<button onclick="closeClerkModal()" style="position: absolute; top: -36px; right: 0; background: transparent; border: none; color: #fff; font-size: 1.4rem; cursor: pointer;">✕</button><div id="clerk-mount-inner" style="min-width: 360px; min-height: 420px;"></div>';
        const inner = document.getElementById('clerk-mount-inner');
        if (mode === 'signup') {
          window.Clerk.mountSignUp(inner, { appearance: clerkAppearance, afterSignUpUrl: '/dashboard' });
        } else {
          window.Clerk.mountSignIn(inner, { appearance: clerkAppearance, afterSignInUrl: '/dashboard' });
        }
      }
    }

    function closeClerkModal() {
      const backdrop = document.getElementById('clerk-modal-backdrop');
      if (backdrop) backdrop.style.display = 'none';
    }

    window.addEventListener('load', async () => {
      try {
        if (window.Clerk) {
          await window.Clerk.load({
            appearance: clerkAppearance
          });
        }
      } catch (err) {
        console.warn('Clerk initialization notice:', err);
      }

      const loggedOut = document.getElementById('logged-out-controls');
      const loggedIn = document.getElementById('logged-in-controls');
      const userButtonDiv = document.getElementById('user-button');
      const heroCta = document.getElementById('hero-cta-btn');

      if (window.Clerk && window.Clerk.user) {
        // Authenticated users are automatically forwarded to their dashboard workspace
        window.location.href = '/dashboard';
        return;
      } else {
        if (loggedOut) loggedOut.style.display = 'flex';
        if (loggedIn) loggedIn.style.display = 'none';
      }

      // Check if redirected from a protected page
      if (window.location.search.includes('auth=required') || window.location.search.includes('signin=1')) {
        showToast('🔒 Account login required to view Guardian Workspace.');
        setTimeout(() => openClerkModal('signin'), 600);
      }
    });
  </script>
</body>
</html>`;
}
