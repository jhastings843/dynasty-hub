import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { isAdminMail, slugFrom, stripEmailChrome } from "./inbox";
import { classifyPost, parseRankings } from "./parse";

// The paid path, against the email Substack actually sent.
//
// The fixture is the real "The Lab 300: 2026 Half PPR Rankings" message of
// 2026-09-05, kept whole at 88 KB rather than trimmed to the interesting part.
// The interesting part was not what anybody predicted: the email links to its
// own post as open.substack.com/pub/jingleslabs/p/<slug>, never as
// jingleslabs.com/p/<slug>, so the first version of this matched nothing and
// silently found no post to fill in. A hand-written fixture would have had the
// link the author expected and the test would have passed on a broken reader.

const EMAIL = fs.readFileSync(
  path.join(import.meta.dirname, "../../../test/fixtures/lab-300-2026-half-ppr.email.html"),
  "utf8",
);

describe("which mail is a post", () => {
  it("keeps a post", () => {
    expect(isAdminMail("The Lab 300: 2026 Half PPR Rankings")).toBe(false);
  });

  it.each([
    "Your payment receipt from Jingles Labs #WOARW2RL-0001",
    "798400 is your Substack verification code",
    "Welcome to Jingles Labs 🧪",
  ])("drops Substack's own mail: %s", (subject) => {
    // All three are real subjects sitting in the inbox next to the post.
    expect(isAdminMail(subject)).toBe(true);
  });
});

describe("finding the post a message belongs to", () => {
  it("reads the slug out of the real email", () => {
    expect(slugFrom(EMAIL)).toBe("the-lab-300-2026-half-ppr-rankings");
  });

  it("reads the same slug out of the feed's form of the URL", () => {
    expect(slugFrom("https://www.jingleslabs.com/p/the-lab-300-2026-half-ppr-rankings")).toBe(
      "the-lab-300-2026-half-ppr-rankings",
    );
  });

  it("handles the substack subdomain form too", () => {
    expect(slugFrom("https://jingleslabs.substack.com/p/some-post")).toBe("some-post");
  });

  it("ignores the query string Substack appends", () => {
    expect(
      slugFrom("https://open.substack.com/pub/jingleslabs/p/a-post?utm_source=email&inbox=true"),
    ).toBe("a-post");
  });

  it("is null when there is nothing to match on", () => {
    expect(slugFrom("no links here at all")).toBeNull();
  });
});

describe("cutting off Substack's furniture", () => {
  it("drops the footer", () => {
    const body = stripEmailChrome(EMAIL);
    expect(body.length).toBeLessThan(EMAIL.length);
    expect(body).not.toMatch(/unsubscribe/i);
  });

  it("keeps the rankings", () => {
    expect(stripEmailChrome(EMAIL)).toContain("Jahmyr Gibbs");
  });

  it("does not eat a post that says the word early on", () => {
    const short = "<p>unsubscribe</p>" + "x".repeat(50);
    expect(stripEmailChrome(short)).toBe(short);
  });
});

describe("the emailed post, read the same way a free one is", () => {
  const body = stripEmailChrome(EMAIL);

  it("is classified as rankings, not prose", () => {
    expect(classifyPost("The Lab 300: 2026 Half PPR Rankings", body)).toBe("rankings");
  });

  it("parses all 300 rows out of the email", () => {
    const parsed = parseRankings(body);
    expect(parsed.rows).toHaveLength(300);
    expect(parsed.missingRanks).toEqual([]);
    expect(parsed.duplicateRanks).toEqual([]);
  });

  it("carries the tiers", () => {
    const tiers = parseRankings(body).tiers;
    // The email drops the labels the web version carries, so these come back as
    // "Tier 1", "Tier 2". Thirteen of them, same as the post.
    expect(tiers.length).toBeGreaterThan(5);
    expect(tiers[0]).toMatch(/^Tier 1$/);
  });

  it("knows it is half PPR", () => {
    expect(parseRankings(body, "The Lab 300: 2026 Half PPR Rankings").scoring).toBe("half_ppr");
  });

  it("keeps position, position rank and team", () => {
    const first = parseRankings(body).rows[0];
    expect(first.rank).toBe(1);
    expect(first.position).toBeTruthy();
    expect(first.team).toBeTruthy();
  });
});
