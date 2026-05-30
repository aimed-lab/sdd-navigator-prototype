import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { type, title, description } = await req.json();

  if (!type || !title || !description) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    return NextResponse.json({ error: "GitHub token not configured" }, { status: 500 });
  }

  const referer = req.headers.get("referer") ?? "unknown page";
  const label   = (type as string).toLowerCase().replaceAll(" ", "-");

  const res = await fetch("https://api.github.com/repos/aimed-lab/sdd-navigator/issues", {
    method: "POST",
    headers: {
      Authorization:          `Bearer ${token}`,
      Accept:                 "application/vnd.github.v3+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "Content-Type":         "application/json",
    },
    body: JSON.stringify({
      title:  `[${type}] ${title}`,
      body:   `${description}\n\n---\nSubmitted from: ${referer}`,
      labels: [label],
    }),
  });

  if (!res.ok) {
    const detail = await res.text();
    console.error("GitHub API error:", res.status, detail);
    return NextResponse.json({ error: "GitHub API request failed" }, { status: 502 });
  }

  const issue = await res.json();
  return NextResponse.json({ url: issue.html_url }, { status: 201 });
}
