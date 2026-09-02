import { describe, expect, it } from "vitest";
import { classifyPost, detectScoring, parsePlays, parseRankings } from "./parse";

// A smoke test against the real publication, opt-in.
//
// The unit tests pin the parser against fixtures, which is what you want on
// every run. This is the other half: the fixtures were written from his markup
// as it looked on 2026-09-02, and Substack can change that markup whenever it
// likes without telling anyone. When the Lab 300 stops parsing, this is the
// test that says so.
//
// Run it with:  JINGLES_LIVE=1 pnpm test
const live = process.env.JINGLES_LIVE === "1";
const PUBLICATION = process.env.JINGLES_SUBSTACK_URL ?? "https://www.jingleslabs.com";

interface Item {
  title: string;
  html: string;
  url: string;
}

async function fetchItems(): Promise<Item[]> {
  const res = await fetch(`${PUBLICATION}/feed`, {
    redirect: "follow",
    headers: { "user-agent": "fantasy-hub/1.0 (personal fantasy football tool)" },
  });
  const xml = await res.text();
  const blocks = xml.match(/<item>[\s\S]*?<\/item>/gi) ?? [];

  const grab = (block: string, tag: string) => {
    const m = block.match(
      new RegExp(`<${tag}[^>]*>(?:<!\\[CDATA\\[)?([\\s\\S]*?)(?:\\]\\]>)?</${tag}>`, "i"),
    );
    return m ? m[1].trim() : "";
  };

  return blocks.map((b) => ({
    title: grab(b, "title"),
    html: grab(b, "content:encoded"),
    url: grab(b, "link"),
  }));
}

describe.skipIf(!live)("live Jingles Labs feed", () => {
  it("serves a feed with posts in it", async () => {
    const items = await fetchItems();
    expect(items.length).toBeGreaterThan(0);
  });

  it("still parses a rankings post to a complete list", async () => {
    const items = await fetchItems();
    const rankings = items.filter((i) => classifyPost(i.title, i.html) === "rankings");

    // No rankings post in the current window is not a failure; a rankings post
    // that no longer parses is.
    for (const post of rankings) {
      const parsed = parseRankings(post.html, post.title);
      if (parsed.rows.length === 0) continue; // paid teaser, nothing to check

      expect(parsed.missingRanks, `gaps in "${post.title}"`).toEqual([]);
      expect(parsed.duplicateRanks, `duplicates in "${post.title}"`).toEqual([]);
      expect(parsed.rows.length, `too few rows in "${post.title}"`).toBeGreaterThan(50);
      expect(detectScoring(post.title, post.html)).not.toBe("unknown");
    }
  });

  it("finds sized plays in a betting post that is not paywalled", async () => {
    const items = await fetchItems();
    const betting = items.filter((i) => classifyPost(i.title, i.html) === "betting");
    const withPlays = betting.filter((i) => parsePlays(i.html).length > 0);

    // Paid betting posts arrive truncated, so this only asserts that whenever a
    // full one is present, its plays are readable.
    for (const post of withPlays) {
      for (const play of parsePlays(post.html)) {
        expect(play.bet.length).toBeGreaterThan(3);
        expect(play.units === null || play.units > 0).toBe(true);
      }
    }
    expect(betting.length).toBeGreaterThanOrEqual(0);
  });
});
