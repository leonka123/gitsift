import { getFeed, getLatestDigest } from "@/db/queries";
import { repoHref } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://gitsift.dev").replace(/\/$/, "");

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const digest = getLatestDigest();
  const rising = getFeed({ mode: "rising", limit: 20 }).repos;

  const items = digest
    ? digest.items.map((item) => ({
        title: `${item.repo.fullName} — ${item.repo.summary ?? item.repo.description ?? "repository"}`,
        link: `${SITE}${repoHref(item.repo.fullName)}`,
        description: item.blurb ?? item.repo.summary ?? item.repo.description ?? "",
        date: new Date(digest.createdAt),
        guid: `digest-${digest.week}-${item.repo.id}`,
      }))
    : rising.map((repo) => ({
        title: repo.fullName,
        link: `${SITE}${repoHref(repo.fullName)}`,
        description: repo.summary ?? repo.description ?? "",
        date: new Date(repo.lastSyncedAt),
        guid: `repo-${repo.id}`,
      }));

  const now = new Date().toUTCString();
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>GitSift — new and rising GitHub repositories</title>
    <link>${SITE}</link>
    <description>Signal from the GitHub firehose: new and rising open-source repositories, filtered and ranked.</description>
    <language>en</language>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${SITE}/rss.xml" rel="self" type="application/rss+xml" />
    ${items
      .map(
        (item) => `<item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="false">${escapeXml(item.guid)}</guid>
      <pubDate>${item.date.toUTCString()}</pubDate>
      <description>${escapeXml(item.description)}</description>
    </item>`,
      )
      .join("\n    ")}
  </channel>
</rss>`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=600, stale-while-revalidate=3600",
    },
  });
}
