import "server-only";
import { cached } from "@/lib/redis/cached";
import { classifyPost, htmlToLines, type PostKind } from "./parse";
import { fetchInboxPosts, inboxConfigured, slugFrom } from "./inbox";

// Reading Jingles Labs off Substack.
//
// Two routes, neither of them an official API. Substack's 2026 developer API
// only does public profile lookup, so this uses the feed and the JSON route the
// site's own frontend calls. They are frontend internals: cached hard, timed
// out, and every caller has to survive them returning HTML, a 403, or nothing.
//
// Note the custom domain. jingleslabs.substack.com answers 301 to
// www.jingleslabs.com, and following that redirect is the difference between
// working and an empty feed.

const PUBLICATION = process.env.JINGLES_SUBSTACK_URL ?? "https://www.jingleslabs.com";

/** He posts a few times a week, so an hour of staleness costs nothing. */
const TTL = 60 * 60;

const FETCH_TIMEOUT_MS = 12_000;

export interface JinglesPost {
  /** Substack's post id where known, else the slug. */
  id: string;
  title: string;
  url: string;
  postedAt: string;
  kind: PostKind;
  /** "everyone" or "only_paid", from the archive route. */
  audience: "everyone" | "only_paid" | "unknown";
  /** Post body as HTML. Truncated for a paid post read from the feed. */
  html: string;
  /** True when the body is the paywall teaser rather than the whole post. */
  truncated: boolean;
  source: "feed" | "inbox";
}

async function get(url: string, accept: string): Promise<string | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      cache: "no-store",
      signal: controller.signal,
      headers: {
        accept,
        // Substack's edge is less friendly to an unidentified client. This is a
        // plain descriptive agent, not an attempt to look like a browser.
        "user-agent": "fantasy-hub/1.0 (personal fantasy football tool)",
      },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function pick(block: string, tag: string): string | null {
  const m = block.match(
    new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"),
  );
  return m ? m[1].trim() : null;
}

/**
 * A paid post in the public feed is a teaser: a couple of hundred words ending
 * in "Read more". Length alone would misjudge a genuinely short free post, so
 * this looks for the marker Substack actually leaves behind.
 */
function looksTruncated(html: string): boolean {
  const text = htmlToLines(html).join(" ");
  return /Read more\s*$/i.test(text.trim()) || /subscribe to .* to (read|continue)/i.test(text);
}

/** Posts from the public RSS feed. Free posts arrive whole. */
export async function fetchFeedPosts(): Promise<JinglesPost[]> {
  return cached(`jingles:v1:feed`, TTL, async () => {
    const xml = await get(`${PUBLICATION}/feed`, "application/rss+xml, application/xml");
    if (!xml) return [];

    const items = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];
    const posts: JinglesPost[] = [];

    for (const item of items) {
      const title = pick(item, "title");
      const link = pick(item, "link");
      if (!title || !link) continue;

      const html = pick(item, "content:encoded") ?? pick(item, "description") ?? "";
      const pubDate = pick(item, "pubDate");
      const guid = pick(item, "guid");

      posts.push({
        id: guid || link,
        title,
        url: link,
        postedAt: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString(),
        kind: classifyPost(title, html),
        audience: "unknown",
        html,
        truncated: looksTruncated(html),
        source: "feed",
      });
    }

    return posts;
  });
}

interface ArchiveRow {
  id?: number;
  title?: string;
  slug?: string;
  post_date?: string;
  audience?: string;
  canonical_url?: string;
}

/**
 * Post metadata from the route the site's own archive page calls.
 *
 * Worth the second request for one field: `audience` says whether a post is
 * paid BEFORE deciding whether the feed's copy of it can be trusted, which is
 * cheaper and more reliable than inferring it from the body.
 */
export async function fetchArchive(limit = 30): Promise<Map<string, ArchiveRow>> {
  // Cache a plain array, not the Map. The cache round-trips through JSON, and
  // a Map stringifies to {}, so caching the lookup structure directly would
  // store an empty object and quietly lose every audience flag on the next hit.
  const rows = await cached<ArchiveRow[]>(`jingles:v1:archive:${limit}`, TTL, async () => {
    const raw = await get(
      `${PUBLICATION}/api/v1/archive?sort=new&limit=${limit}&offset=0`,
      "application/json",
    );
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as ArchiveRow[]) : [];
    } catch {
      return [];
    }
  });

  const byUrl = new Map<string, ArchiveRow>();
  for (const row of rows) {
    if (row.canonical_url) byUrl.set(row.canonical_url, row);
  }
  return byUrl;
}

/** Posts to consider ingesting: the feed's list, made whole where it is not. */
export async function fetchPosts(): Promise<JinglesPost[]> {
  const [posts, archive] = await Promise.all([fetchFeedPosts(), fetchArchive()]);

  const merged: JinglesPost[] = posts.map((post) => {
    const row = archive.get(post.url);
    if (!row?.audience) return post;
    const audience =
      row.audience === "only_paid" || row.audience === "everyone" ? row.audience : "unknown";
    return {
      ...post,
      audience,
      // A paid post read from the feed is a teaser whether or not the marker
      // survived, so the archive's word is better than the body's.
      truncated: post.truncated || audience === "only_paid",
    };
  });

  return fillFromInbox(merged);
}

/**
 * Replace the teasers with the real thing, from Jack's email.
 *
 * The Lab 300 went paid on 2026-09-05 and the feed's copy of it is 180 words
 * ending in "Read more". Substack delivers the whole post to a subscriber's
 * inbox, so a post the app wants and cannot read is looked for there.
 *
 * Opened only when there is something to look for, and only when the mailbox
 * is configured. On a day when everything is free this costs one boolean.
 */
async function fillFromInbox(posts: JinglesPost[]): Promise<JinglesPost[]> {
  const wanted = posts.filter((p) => p.truncated && p.kind !== "other");
  if (!wanted.length || !inboxConfigured()) return posts;

  const mail = await fetchInboxPosts();
  if (!mail.size) return posts;

  return posts.map((post) => {
    if (!post.truncated) return post;
    const slug = slugFrom(post.url);
    const found = slug ? mail.get(slug) : undefined;
    if (!found) return post;
    return {
      ...post,
      html: found.html,
      // Classified again against the real body. A teaser is 180 words and can
      // read as prose when the post it was cut from is a 300 row list.
      kind: classifyPost(post.title, found.html),
      truncated: false,
      source: "inbox" as const,
    };
  });
}
