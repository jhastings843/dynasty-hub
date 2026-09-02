import { describe, expect, it } from "vitest";
import { normalizeName, resolveNames, toCandidates } from "./resolve";
import type { SleeperCandidate } from "./resolve";

const c = (
  playerId: string,
  fullName: string,
  position: string | null,
  team: string | null,
): SleeperCandidate => ({ playerId, fullName, position, team });

const LEAGUE: SleeperCandidate[] = [
  c("9221", "Jahmyr Gibbs", "RB", "DET"),
  c("7564", "Ja'Marr Chase", "WR", "CIN"),
  c("6790", "James Cook", "RB", "BUF"),
  c("8155", "Kenneth Walker", "RB", "SEA"),
  c("4035", "Michael Carter", "RB", "ARI"),
  c("7600", "Michael Carter", "WR", "NYJ"),
  c("1234", "Chicago Bears", "DEF", "CHI"),
];

describe("normalizeName", () => {
  it("strips the apostrophe so both spellings agree", () => {
    expect(normalizeName("Ja’Marr Chase")).toBe(normalizeName("Ja'Marr Chase"));
    expect(normalizeName("Ja’Marr Chase")).toBe("jamarr chase");
  });

  it("drops generational suffixes", () => {
    expect(normalizeName("James Cook III")).toBe("james cook");
    expect(normalizeName("Marvin Harrison Jr.")).toBe("marvin harrison");
  });

  it("keeps a hyphenated surname as two words consistently", () => {
    expect(normalizeName("Jaxon Smith-Njigba")).toBe("jaxon smith njigba");
  });

  it("strips accents", () => {
    expect(normalizeName("Equanimeous St. Brown")).toBe("equanimeous st brown");
  });

  it("collapses whitespace", () => {
    expect(normalizeName("  Amon-Ra   St. Brown ")).toBe("amon ra st brown");
  });
});

describe("resolveNames", () => {
  it("matches on name, position and team", () => {
    const r = resolveNames([{ name: "Jahmyr Gibbs", position: "RB", team: "DET" }], LEAGUE);
    expect(r.resolved).toHaveLength(1);
    expect(r.resolved[0].playerId).toBe("9221");
    expect(r.resolved[0].via).toBe("name+position+team");
  });

  it("still matches when he has the player on the wrong team", () => {
    // He posts before a trade lands; Sleeper updates faster than a ranking list.
    const r = resolveNames([{ name: "Jahmyr Gibbs", position: "RB", team: "KC" }], LEAGUE);
    expect(r.resolved[0].playerId).toBe("9221");
    expect(r.resolved[0].via).toBe("name+position");
  });

  it("matches a suffixed name to the unsuffixed Sleeper record", () => {
    const r = resolveNames([{ name: "James Cook III", position: "RB", team: "BUF" }], LEAGUE);
    expect(r.resolved[0].playerId).toBe("6790");
  });

  it("matches through a typographic apostrophe", () => {
    const r = resolveNames([{ name: "Ja’Marr Chase", position: "WR", team: "CIN" }], LEAGUE);
    expect(r.resolved[0].playerId).toBe("7564");
  });

  it("uses position to separate two players with the same name", () => {
    const r = resolveNames([{ name: "Michael Carter", position: "WR", team: "NYJ" }], LEAGUE);
    expect(r.resolved[0].playerId).toBe("7600");
  });

  it("reports an ambiguous name instead of picking one", () => {
    const r = resolveNames([{ name: "Michael Carter", position: "QB", team: "XXX" }], LEAGUE);
    expect(r.resolved).toHaveLength(0);
    expect(r.ambiguous).toHaveLength(1);
    expect(r.ambiguous[0].candidates).toHaveLength(2);
  });

  it("reports an unknown player rather than dropping him", () => {
    const r = resolveNames([{ name: "Nobody At All", position: "RB", team: "DET" }], LEAGUE);
    expect(r.resolved).toHaveLength(0);
    expect(r.unresolved).toHaveLength(1);
    expect(r.unresolved[0].name).toBe("Nobody At All");
  });

  it("matches a defence he named by nickname only", () => {
    // He writes "Bears", Sleeper stores "Chicago Bears". No name match will
    // ever join those, so the team code is the join.
    const r = resolveNames([{ name: "Bears", position: "DST", team: "CHI" }], LEAGUE);
    expect(r.resolved[0].playerId).toBe("1234");
    expect(r.resolved[0].via).toBe("team-defence");
  });

  it("matches a defence given its full name too", () => {
    const r = resolveNames([{ name: "Chicago Bears", position: "DST", team: "CHI" }], LEAGUE);
    expect(r.resolved[0].playerId).toBe("1234");
  });

  it("never puts one team's defence on another team's id", () => {
    // The failure that mattered in the v2.0 curation: a Bears defence listed
    // on DET would have been stored under Detroit's id.
    const r = resolveNames([{ name: "Bears", position: "DST", team: "DET" }], LEAGUE);
    expect(r.resolved).toHaveLength(0);
    expect(r.unresolved).toHaveLength(1);
  });

  it("matches a first-name variant on surname, position and team", () => {
    const roster = [c("5000", "Joshua Palmer", "WR", "BUF")];
    const r = resolveNames([{ name: "Josh Palmer", position: "WR", team: "BUF" }], roster);
    expect(r.resolved[0].playerId).toBe("5000");
    expect(r.resolved[0].via).toBe("surname+position+team");
  });

  it("matches a misspelled first name on surname, position and team", () => {
    const roster = [c("5001", "Samaje Perine", "RB", "CIN")];
    const r = resolveNames([{ name: "Semaj Perine", position: "RB", team: "CIN" }], roster);
    expect(r.resolved[0].playerId).toBe("5001");
  });

  it("will not match on surname alone when the team differs", () => {
    const roster = [c("5000", "Joshua Palmer", "WR", "BUF")];
    const r = resolveNames([{ name: "Josh Palmer", position: "WR", team: "NYJ" }], roster);
    expect(r.resolved).toHaveLength(0);
  });

  it("reports two same-surname teammates rather than picking one", () => {
    const roster = [c("6001", "Amari Cooper", "WR", "BUF"), c("6002", "Skyler Cooper", "WR", "BUF")];
    const r = resolveNames([{ name: "Josh Cooper", position: "WR", team: "BUF" }], roster);
    expect(r.resolved).toHaveLength(0);
    expect(r.ambiguous).toHaveLength(1);
  });

  it("handles a team abbreviation that differs between sources", () => {
    const jax = [c("999", "Travis Etienne", "RB", "JAX")];
    const r = resolveNames([{ name: "Travis Etienne", position: "RB", team: "JAC" }], jax);
    expect(r.resolved[0].via).toBe("name+position+team");
  });

  it("resolves a full batch and accounts for every input", () => {
    const inputs = [
      { name: "Jahmyr Gibbs", position: "RB", team: "DET" },
      { name: "Ja’Marr Chase", position: "WR", team: "CIN" },
      { name: "Ghost Player", position: "TE", team: "NE" },
    ];
    const r = resolveNames(inputs, LEAGUE);
    expect(r.resolved.length + r.unresolved.length + r.ambiguous.length).toBe(inputs.length);
  });
});

describe("toCandidates", () => {
  it("builds a full name from first and last when full_name is missing", () => {
    const out = toCandidates({ "1": { first_name: "Bijan", last_name: "Robinson", position: "RB", team: "ATL" } });
    expect(out[0].fullName).toBe("Bijan Robinson");
  });

  it("skips a record with no usable name", () => {
    expect(toCandidates({ "1": { position: "RB", team: "ATL" } })).toEqual([]);
  });
});
