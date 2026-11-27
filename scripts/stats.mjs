import { writeFileSync } from "node:fs";

const token = process.env.STATS_TOKEN;
if (!token) {
  console.error("STATS_TOKEN is not set");
  process.exit(1);
}

const query = `
  query {
    viewer {
      login
      contributionsCollection {
        totalCommitContributions
        totalIssueContributions
        totalPullRequestContributions
        totalPullRequestReviewContributions
        restrictedContributionsCount
        contributionCalendar { totalContributions }
      }
    }
  }
`;

const res = await fetch("https://api.github.com/graphql", {
  method: "POST",
  headers: {
    Authorization: `bearer ${token}`,
    "User-Agent": "N01Ta-profile-stats",
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ query }),
});

if (!res.ok) {
  console.error(`GraphQL HTTP ${res.status}: ${(await res.text()).slice(0, 300)}`);
  process.exit(1);
}

const payload = await res.json();
if (payload.errors) {
  console.error(JSON.stringify(payload.errors).slice(0, 500));
  process.exit(1);
}

const viewer = payload.data.viewer;
const c = viewer.contributionsCollection;
const total = c.contributionCalendar.totalContributions;
const privateCount = c.restrictedContributionsCount;
const publicCount = Math.max(0, total - privateCount);
const commits = c.totalCommitContributions;
const prs = c.totalPullRequestContributions;
const issues = c.totalIssueContributions;

const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
}[ch]));

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="860" height="240" viewBox="0 0 860 240" role="img" aria-labelledby="title">
  <title id="title">${esc(viewer.login)} GitHub stats: ${total} contributions in the last year, ${privateCount} private</title>
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#f97316"/>
      <stop offset="1" stop-color="#22d3ee"/>
    </linearGradient>
  </defs>
  <rect width="860" height="240" rx="16" fill="#0d1117" stroke="#30363d"/>
  <rect x="0" y="0" width="860" height="4" rx="2" fill="url(#accent)"/>

  <text x="32" y="44" fill="#c9d1d9" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="18" font-weight="700">${esc(viewer.login)}</text>
  <text x="32" y="64" fill="#8b949e" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="12">github stats · last year</text>

  <text x="32" y="146" fill="url(#accent)" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="64" font-weight="700">${total}</text>
  <text x="34" y="172" fill="#c9d1d9" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="14">contributions</text>
  <text x="34" y="198" fill="#8b949e" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="12">includes private repositories</text>

  <line x1="400" y1="28" x2="400" y2="212" stroke="#30363d"/>

  <text x="432" y="88" fill="#f97316" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="28" font-weight="700">${privateCount}</text>
  <text x="432" y="106" fill="#8b949e" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="12">private</text>

  <text x="632" y="88" fill="#22d3ee" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="28" font-weight="700">${publicCount}</text>
  <text x="632" y="106" fill="#8b949e" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="12">public</text>

  <text x="432" y="166" fill="#c9d1d9" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="22" font-weight="700">${commits}</text>
  <text x="432" y="184" fill="#8b949e" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="12">commit contributions</text>

  <text x="632" y="166" fill="#c9d1d9" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="22" font-weight="700">${prs} / ${issues}</text>
  <text x="632" y="184" fill="#8b949e" font-family="ui-monospace, SFMono-Regular, Consolas, 'Liberation Mono', monospace" font-size="12">PRs / issues</text>
</svg>
`;

writeFileSync(".github/stats.svg", svg);
console.log(`stats: total=${total} private=${privateCount} public=${publicCount} commits=${commits} prs=${prs} issues=${issues}`);
