import type { MetadataRoute } from "next";
import { getAllRepoPaths, getTopicCounts, listDigests } from "@/db/queries";

export const dynamic = "force-dynamic";

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://gitsift.dev").replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: `${SITE}/trending`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/new`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE}/gems`, lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/search`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/topics`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/digest`, lastModified: now, changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
  ];

  let topicRoutes: MetadataRoute.Sitemap = [];
  let digestRoutes: MetadataRoute.Sitemap = [];
  let repoRoutes: MetadataRoute.Sitemap = [];

  try {
    topicRoutes = getTopicCounts(80).map((topic) => ({
      url: `${SITE}/topics/${encodeURIComponent(topic.topic)}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.5,
    }));

    digestRoutes = listDigests(24).map((digest) => ({
      url: `${SITE}/digest/${digest.week}`,
      lastModified: new Date(digest.createdAt),
      changeFrequency: "monthly" as const,
      priority: 0.6,
    }));

    repoRoutes = getAllRepoPaths(500).map((repo) => ({
      url: `${SITE}/repo/${repo.fullName.split("/").map(encodeURIComponent).join("/")}`,
      lastModified: new Date(repo.updatedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch {
    // The database may not exist yet (first deploy). Static routes still work.
  }

  return [...staticRoutes, ...topicRoutes, ...digestRoutes, ...repoRoutes];
}
