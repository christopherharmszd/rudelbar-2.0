const repository = "christopherharmszd/rudelbar-pages";

export async function requestWebsiteBuild(env, fetcher = fetch) {
  if (!env.RUDELBAR_GITHUB_WORKFLOW_TOKEN) return { status: "scheduled" };
  try {
    const response = await fetcher(`https://api.github.com/repos/${repository}/actions/workflows/production.yml/dispatches`, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.RUDELBAR_GITHUB_WORKFLOW_TOKEN}`, Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2022-11-28", "User-Agent": "Rudelbar-CMS", "Content-Type": "application/json" },
      body: JSON.stringify({ ref: "main" }), signal: AbortSignal.timeout(10000),
    });
    return { status: response.ok ? "queued" : "scheduled" };
  } catch { return { status: "scheduled" }; }
}
