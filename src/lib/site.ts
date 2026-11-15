/**
 * One place for the public identity of this deployment.
 *
 * The repository always lives at `leonka123/gitsift`; the site URL is whatever
 * `NEXT_PUBLIC_SITE_URL` says (localhost during development). Keeping both here
 * means the header, footer, README links, canonicals, RSS and OG images cannot
 * drift apart.
 */

export const REPO_OWNER = "leonka123";
export const REPO_NAME = "gitsift";
export const REPO_SLUG = `${REPO_OWNER}/${REPO_NAME}`;
export const REPO_URL = `https://github.com/${REPO_SLUG}`;
export const ISSUES_URL = `${REPO_URL}/issues`;
export const DISCUSSIONS_URL = `${REPO_URL}/discussions`;

/** Absolute origin used for canonicals, sitemap, RSS and OG metadata. */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:3000"
).replace(/\/$/, "");
