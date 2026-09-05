import "server-only";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";

// The paid half of his publication, out of Jack's own inbox.
//
// The public feed truncates a paid post to a teaser ending in "Read more", and
// the Lab 300 went paid on 2026-09-05 at 11:23. Jack subscribes, Substack
// delivers the whole post to a paying subscriber's email, so the inbox is the
// honest route to it: mail he is entitled to, read with his own credentials.
// The alternative, replaying a Substack session cookie from a server, is
// fragile, expires, and sits in a worse place under their terms.
//
// This is deliberately the SECOND source, not the first. The feed needs no
// credentials, works from any machine and answers in a fraction of a second, so
// it stays the way in for everything free. IMAP is opened only when a post the
// app actually wants came back truncated, which on a normal day is never.
//
// signal-bot holds the same reader in JavaScript for the betting texts. Two
// copies is not the plan and is not free, but the two apps deploy separately
// and neither can import the other. What is deliberately NOT duplicated is the
// parsing: the mail hands its HTML to the same parser the feed does, so a
// ranking read from an email and a ranking read from the feed cannot disagree.

const HOST = "imap.gmail.com";
const SENDER = process.env.JINGLES_SENDER || "jingleslabs@substack.com";

/** Substack's own mail: receipts, verification codes, welcome notes. Not posts. */
export function isAdminMail(subject: string | null | undefined): boolean {
  return /verification code|payment receipt|receipt from|welcome to|your subscription|renew|invoice|password/i.test(
    String(subject || ""),
  );
}

/**
 * Cut the footer off an emailed post.
 *
 * Everything after the unsubscribe line is Substack's own furniture, and left
 * in it becomes text the parser has to step over. The 200 character floor is
 * there so a post that happens to say "unsubscribe" in its first paragraph does
 * not truncate itself to nothing.
 */
export function stripEmailChrome(html: string): string {
  const text = String(html || "");
  const cutPoints = [
    text.search(/unsubscribe/i),
    text.search(/©\s*\d{4}\s*Jingles/i),
    text.search(/You&#39;re (a )?(free|paid) subscriber/i),
    text.search(/You're (a )?(free|paid) subscriber/i),
  ].filter((i) => i > 200);

  const cut = cutPoints.length > 0 ? Math.min(...cutPoints) : -1;
  return cut > 0 ? text.slice(0, cut) : text;
}

/**
 * The post's slug, which is its identity in both sources.
 *
 * The URL is not, and assuming it was cost an afternoon. An emailed post links
 * to itself as `open.substack.com/pub/jingleslabs/p/<slug>?utm_source=...`,
 * never as `jingleslabs.com/p/<slug>`, which is the form the feed uses. Same
 * post, three hosts and a query string. The slug is the part that does not
 * move, so it is what both sides key on.
 */
export function slugFrom(text: string): string | null {
  const patterns = [
    /https?:\/\/open\.substack\.com\/pub\/[a-z0-9-]+\/p\/([a-z0-9-]+)/i,
    /https?:\/\/(?:www\.)?jingleslabs\.com\/p\/([a-z0-9-]+)/i,
    /https?:\/\/[a-z0-9-]+\.substack\.com\/p\/([a-z0-9-]+)/i,
  ];
  for (const re of patterns) {
    const found = String(text || "").match(re);
    if (found) return found[1].toLowerCase();
  }
  return null;
}

export interface InboxPost {
  slug: string;
  title: string;
  postedAt: string;
  html: string;
}

/** Whether this machine can read the mailbox at all. */
export function inboxConfigured(): boolean {
  return Boolean(
    (process.env.GMAIL_USER || process.env.GMAIL_ADDRESS) && process.env.GMAIL_APP_PASSWORD,
  );
}

/**
 * Posts emailed by the publication in the last `days` days, keyed by slug.
 *
 * Returns an empty map rather than throwing when the mailbox is unreachable.
 * A missing paid post costs one stale ranking; a throw costs the whole daily
 * ingest, including the free posts that arrived perfectly well.
 */
export async function fetchInboxPosts({ days = 14 } = {}): Promise<Map<string, InboxPost>> {
  const out = new Map<string, InboxPost>();
  const user = process.env.GMAIL_USER || process.env.GMAIL_ADDRESS;
  const pass = process.env.GMAIL_APP_PASSWORD;
  if (!user || !pass) return out;

  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const client = new ImapFlow({
    host: HOST,
    port: 993,
    secure: true,
    auth: { user, pass },
    logger: false,
    // A hung mailbox must not hold up the run it is only a fallback for.
    socketTimeout: 30_000,
  });

  let lock;
  try {
    await client.connect();
    lock = await client.getMailboxLock("INBOX");

    for await (const message of client.fetch(
      { from: SENDER, since },
      { source: true, envelope: true },
    )) {
      const subject = message.envelope?.subject ?? null;
      if (isAdminMail(subject)) continue;

      let parsed;
      try {
        parsed = await simpleParser(message.source as Buffer);
      } catch {
        continue;
      }

      const html = String(parsed.html || parsed.textAsHtml || "");
      if (!html) continue;

      // No slug means nothing to match this against, and a post that cannot be
      // matched cannot be trusted to be the one that was truncated.
      const slug = slugFrom(html);
      if (!slug) continue;

      out.set(slug, {
        slug,
        title: subject || "Untitled",
        postedAt: (parsed.date || new Date()).toISOString(),
        html: stripEmailChrome(html),
      });
    }
  } catch (err) {
    console.error("[jingles] inbox unavailable:", (err as Error).message);
    return out;
  } finally {
    if (lock) lock.release();
    try {
      await client.logout();
    } catch {
      /* already gone */
    }
  }

  return out;
}
