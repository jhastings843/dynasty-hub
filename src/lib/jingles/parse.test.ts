import { describe, expect, it } from "vitest";
import {
  classifyPost,
  decodeEntities,
  detectScoring,
  htmlToLines,
  parseMentions,
  parsePlays,
  parseRankings,
} from "./parse";

// The real markup from the 2026-08-31 Lab 300 post. Kept verbatim and short:
// the exact shape matters (he bolds the position, which splits each row across
// three nodes) and that is precisely what a hand-written fixture would smooth
// over.
const REAL_RANKINGS_HTML = `
<blockquote><p><strong>These are my current preseason Half PPR rankings.</strong></p></blockquote>
<h4><strong>Tier 1: Top 4</strong></h4>
<p>1: Jahmyr Gibbs | <strong>RB1</strong> | DET</p>
<p>2: Bijan Robinson | <strong>RB2</strong> | ATL</p>
<p>3: Puka Nacua | <strong>WR1</strong> | LAR</p>
<p>4: Ja&#8217;Marr Chase | <strong>WR2</strong> | CIN</p>
<h4><strong>Tier 2: 1st Round</strong></h4>
<p>5: Jaxon Smith-Njigba | <strong>WR3</strong> | SEA</p>
<p>6: James Cook III | <strong>RB3</strong> | BUF</p>
<p>7: Amon-Ra St. Brown | <strong>WR4</strong> | DET</p>
`;

/** A full-size list, to prove the parser reports integrity rather than length. */
function syntheticList(count: number, skip: number[] = []): string {
  const rows: string[] = ["<h4><strong>Tier 1: Top 4</strong></h4>"];
  for (let i = 1; i <= count; i++) {
    if (skip.includes(i)) continue;
    rows.push(`<p>${i}: Player ${i} | <strong>RB${i}</strong> | DET</p>`);
  }
  return rows.join("");
}

describe("htmlToLines", () => {
  it("keeps a ranking row on one line despite inline tags", () => {
    const lines = htmlToLines("<p>1: Jahmyr Gibbs | <strong>RB1</strong> | DET</p>");
    expect(lines).toEqual(["1: Jahmyr Gibbs | RB1 | DET"]);
  });

  it("breaks on block elements", () => {
    expect(htmlToLines("<p>one</p><p>two</p>")).toEqual(["one", "two"]);
  });

  it("treats br as a line break", () => {
    expect(htmlToLines("one<br>two")).toEqual(["one", "two"]);
  });

  it("drops script and style content", () => {
    expect(htmlToLines("<p>keep</p><script>var x = 1;</script>")).toEqual(["keep"]);
  });

  it("collapses runs of whitespace", () => {
    expect(htmlToLines("<p>a   \n  b</p>")).toEqual(["a b"]);
  });
});

describe("decodeEntities", () => {
  it("decodes the numeric apostrophe in Ja'Marr Chase", () => {
    expect(decodeEntities("Ja&#8217;Marr Chase")).toBe("Ja’Marr Chase");
  });

  it("decodes named entities", () => {
    expect(decodeEntities("A &amp; B &nbsp;C")).toBe("A & B  C");
  });

  it("decodes hex entities", () => {
    expect(decodeEntities("&#x2019;")).toBe("’");
  });

  it("leaves unknown entities alone rather than mangling them", () => {
    expect(decodeEntities("&notarealentity;")).toBe("&notarealentity;");
  });
});

describe("detectScoring", () => {
  it("reads full PPR from the title", () => {
    expect(detectScoring("The Lab 300: Full-PPR Rankings")).toBe("full_ppr");
  });

  it("reads half PPR from the title", () => {
    expect(detectScoring("The Lab 300: Half-PPR Rankings")).toBe("half_ppr");
  });

  it("falls back to the body when the title is silent", () => {
    expect(detectScoring("The Lab 300", "These are my current preseason Half PPR rankings.")).toBe(
      "half_ppr",
    );
  });

  it("does not read half PPR as full PPR", () => {
    expect(detectScoring("Half PPR and full rosters")).toBe("half_ppr");
  });

  it("says unknown rather than guessing", () => {
    expect(detectScoring("The Lab 300", "Rankings for the season.")).toBe("unknown");
  });
});

describe("classifyPost", () => {
  it("recognises a rankings post", () => {
    expect(classifyPost("The Lab 300: Half-PPR Rankings")).toBe("rankings");
  });

  it("recognises a betting post", () => {
    expect(classifyPost("Georgia Tech vs Colorado: Week 1 Betting Preview")).toBe("betting");
    expect(classifyPost("College Football Week 1 Betting Predictions: 10 Biggest Games")).toBe(
      "betting",
    );
  });

  it("recognises a targets and fades post", () => {
    expect(
      classifyPost("🔬 Under the Microscope: 20 Players I'm Taking Everywhere and Avoiding"),
    ).toBe("targets_fades");
  });

  it("recognises a deep dive", () => {
    expect(classifyPost("Lab Notes #002: The Cook")).toBe("deep_dive");
    expect(classifyPost("League Winner: James Cook")).toBe("deep_dive");
  });

  it("calls a body full of ranking rows a rankings post whatever the title says", () => {
    expect(classifyPost("Some Thoughts", syntheticList(40))).toBe("rankings");
  });

  it("does not call a short list a rankings post", () => {
    expect(classifyPost("Some Thoughts", syntheticList(5))).toBe("other");
  });
});

describe("parseRankings", () => {
  it("parses the real post markup", () => {
    const parsed = parseRankings(REAL_RANKINGS_HTML, "The Lab 300: Half-PPR Rankings");
    expect(parsed.rows).toHaveLength(7);
    expect(parsed.rows[0]).toEqual({
      rank: 1,
      name: "Jahmyr Gibbs",
      position: "RB",
      positionRank: 1,
      team: "DET",
      tier: "Top 4",
    });
  });

  it("keeps the apostrophe in Ja'Marr Chase", () => {
    const parsed = parseRankings(REAL_RANKINGS_HTML);
    expect(parsed.rows[3].name).toBe("Ja’Marr Chase");
  });

  it("keeps suffixes like III in a name", () => {
    const parsed = parseRankings(REAL_RANKINGS_HTML);
    expect(parsed.rows.find((r) => r.rank === 6)?.name).toBe("James Cook III");
  });

  it("keeps a hyphenated name whole", () => {
    const parsed = parseRankings(REAL_RANKINGS_HTML);
    expect(parsed.rows.find((r) => r.rank === 5)?.name).toBe("Jaxon Smith-Njigba");
  });

  it("carries the tier down the rows under its heading", () => {
    const parsed = parseRankings(REAL_RANKINGS_HTML);
    expect(parsed.rows.find((r) => r.rank === 4)?.tier).toBe("Top 4");
    expect(parsed.rows.find((r) => r.rank === 5)?.tier).toBe("1st Round");
    expect(parsed.tiers).toEqual(["Top 4", "1st Round"]);
  });

  it("reads the scoring off the body when the title does not say", () => {
    expect(parseRankings(REAL_RANKINGS_HTML).scoring).toBe("half_ppr");
  });

  it("parses a full-length list with no gaps", () => {
    const parsed = parseRankings(syntheticList(300), "The Lab 300");
    expect(parsed.rows).toHaveLength(300);
    expect(parsed.missingRanks).toEqual([]);
    expect(parsed.duplicateRanks).toEqual([]);
  });

  it("reports gaps instead of returning a quietly shorter list", () => {
    const parsed = parseRankings(syntheticList(300, [7, 42, 199]), "The Lab 300");
    expect(parsed.rows).toHaveLength(297);
    expect(parsed.missingRanks).toEqual([7, 42, 199]);
  });

  it("reports a duplicated rank", () => {
    const html = syntheticList(10) + "<p>5: Someone Else | <strong>WR9</strong> | KC</p>";
    expect(parseRankings(html).duplicateRanks).toEqual([5]);
  });

  it("returns nothing for a post with no rows", () => {
    const parsed = parseRankings("<p>Just some prose about football.</p>");
    expect(parsed.rows).toEqual([]);
    expect(parsed.missingRanks).toEqual([]);
  });

  it("ignores a line that only looks like a row", () => {
    const parsed = parseRankings("<p>2026: a big year | for football | really</p>");
    expect(parsed.rows).toEqual([]);
  });
});

describe("parseMentions", () => {
  const known = new Set(["Travis Etienne", "James Cook", "Puka Nacua"]);

  it("finds the players a prose post names", () => {
    const html =
      "<p>I am out on Travis Etienne this year.</p><p>James Cook is a different story.</p>";
    const found = parseMentions(html, known).map((m) => m.name).sort();
    expect(found).toEqual(["James Cook", "Travis Etienne"]);
  });

  it("captures his ADP and rank verbatim when the line carries them", () => {
    const html = "<p>Travis Etienne: ADP RB19 / 40 Overall -> My Rank RB25 / 60 Overall</p>";
    const [mention] = parseMentions(html, known);
    expect(mention.adp).toBe("RB19 / 40 Overall");
    expect(mention.jinglesRank).toBe("RB25 / 60 Overall");
  });

  it("keeps the sentence for attribution", () => {
    const html = "<p>Puka Nacua is the safest receiver on the board.</p>";
    expect(parseMentions(html, known)[0].context).toContain("safest receiver");
  });

  it("prefers the line carrying a rank over an earlier passing mention", () => {
    const html =
      "<p>More on James Cook later.</p><p>James Cook: ADP RB8 / 20 Overall -> My Rank RB4 / 11 Overall</p>";
    const [mention] = parseMentions(html, known);
    expect(mention.jinglesRank).toBe("RB4 / 11 Overall");
  });

  it("returns nothing when it recognises nobody", () => {
    expect(parseMentions("<p>Football is a great sport.</p>", known)).toEqual([]);
  });

  it("names each player once", () => {
    const html = "<p>James Cook.</p><p>James Cook again.</p><p>And James Cook.</p>";
    expect(parseMentions(html, known)).toHaveLength(1);
  });
});

describe("parsePlays", () => {
  it("parses his sized plays", () => {
    const html = `
      <p>Malachi Hosley Over 40.5 Rushing Yards | 1 Unit</p>
      <p>Danny Scudero Over 50.5 Receiving Yards | 0.5 Units</p>
      <p>Zach Atkins Over 1.5 Receptions | 0.5 Units</p>`;
    expect(parsePlays(html)).toEqual([
      { bet: "Malachi Hosley Over 40.5 Rushing Yards", units: 1, lean: false },
      { bet: "Danny Scudero Over 50.5 Receiving Yards", units: 0.5, lean: false },
      { bet: "Zach Atkins Over 1.5 Receptions", units: 0.5, lean: false },
    ]);
  });

  it("marks a lean as a lean with no stake", () => {
    expect(parsePlays("<p>Over 50.5 | LEAN</p>")).toEqual([
      { bet: "Over 50.5", units: null, lean: true },
    ]);
  });

  it("ignores prose that merely contains numbers", () => {
    const html =
      "<p>Colorado allowed 40.5 rushing yards a game last season, which is why I like this spot.</p>";
    expect(parsePlays(html)).toEqual([]);
  });

  it("ignores a ranking row, which is also pipe delimited", () => {
    expect(parsePlays("<p>1: Jahmyr Gibbs | RB1 | DET</p>")).toEqual([]);
  });

  it("does not repeat the same bet twice", () => {
    const html = "<p>Over 50.5 | 1 Unit</p><p>Over 50.5 | 1 Unit</p>";
    expect(parsePlays(html)).toHaveLength(1);
  });

  it("returns nothing for a post with no sized plays", () => {
    expect(parsePlays("<p>I like this game but I am not betting it.</p>")).toEqual([]);
  });
});
