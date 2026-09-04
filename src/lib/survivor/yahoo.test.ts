import { describe, expect, it } from "vitest";
import {
  canonYahoo,
  extractJsonObject,
  normalizeOwnership,
  parseYahoo,
} from "./yahoo";

describe("canonYahoo", () => {
  it("maps Yahoo's PFR-style keys onto ours", () => {
    expect(canonYahoo("GNB")).toBe("GB");
    expect(canonYahoo("KAN")).toBe("KC");
    expect(canonYahoo("NWE")).toBe("NE");
    expect(canonYahoo("SFO")).toBe("SF");
  });

  it("still translates the Raiders, which Yahoo files under OAK", () => {
    expect(canonYahoo("OAK")).toBe("LV");
  });

  it("passes through the keys that already agree", () => {
    for (const a of ["KC", "BUF", "PHI", "WAS", "LAC", "LAR"]) {
      expect(canonYahoo(a)).toBe(a);
    }
  });
});

describe("extractJsonObject", () => {
  it("pulls the object that follows the key", () => {
    expect(extractJsonObject('x{"a":1}y"k":{"b":2} tail', "k")).toBe('{"b":2}');
  });

  it("matches braces through nesting", () => {
    const html = '"k":{"a":{"b":{"c":1}},"d":2}rest';
    expect(extractJsonObject(html, "k")).toBe('{"a":{"b":{"c":1}},"d":2}');
  });

  it("ignores braces inside strings", () => {
    const html = '"k":{"a":"}}}not the end{","b":1}tail';
    expect(extractJsonObject(html, "k")).toBe('{"a":"}}}not the end{","b":1}');
  });

  it("ignores an escaped quote inside a string", () => {
    const html = '"k":{"a":"say \\"}\\" now","b":1}tail';
    expect(extractJsonObject(html, "k")).toBe('{"a":"say \\"}\\" now","b":1}');
  });

  it("returns null when the key is absent or truncated", () => {
    expect(extractJsonObject('{"a":1}', "missing")).toBeNull();
    expect(extractJsonObject('"k":{"a":1', "k")).toBeNull();
  });
});

describe("parseYahoo", () => {
  const html = `junk"pickDistribution":{"1":[
    {"team":{"editorial_team_abbr":"LAC","pick_percentage":32.2}},
    {"team":{"editorial_team_abbr":"GNB","pick_percentage":0.36}}
  ],"2":[
    {"team":{"editorial_team_abbr":"OAK","pick_percentage":11.5}}
  ],"21":[
    {"team":{"editorial_team_abbr":"KAN","pick_percentage":50}}
  ]}tail`;

  it("keys by week and converts percentages to fractions", () => {
    const out = parseYahoo(html);
    expect(out.get(1)?.LAC).toBeCloseTo(0.322, 6);
    expect(out.get(1)?.GB).toBeCloseTo(0.0036, 6);
  });

  it("normalises team keys on the way in", () => {
    expect(parseYahoo(html).get(2)?.LV).toBeCloseTo(0.115, 6);
  });

  it("drops the playoff weeks Yahoo also ships", () => {
    expect(parseYahoo(html).has(21)).toBe(false);
  });

  it("returns an empty map rather than throwing on junk", () => {
    expect(parseYahoo("no json here").size).toBe(0);
    expect(parseYahoo('"pickDistribution":{not json}').size).toBe(0);
  });
});

describe("normalizeOwnership", () => {
  it("leaves a complete distribution alone", () => {
    const out = normalizeOwnership({ KC: 0.6, DEN: 0.4 }, ["KC", "DEN"]);
    expect(out.KC).toBeCloseTo(0.6, 6);
    expect(out.DEN).toBeCloseTo(0.4, 6);
  });

  it("spreads the missing mass over the teams nobody listed", () => {
    const out = normalizeOwnership({ KC: 0.8 }, ["KC", "DEN", "BUF"]);
    expect(out.KC).toBeCloseTo(0.8, 6);
    expect(out.DEN).toBeCloseTo(0.1, 6);
    expect(out.BUF).toBeCloseTo(0.1, 6);
  });

  it("rescales when the listed totals drift off one", () => {
    const out = normalizeOwnership({ KC: 0.6, DEN: 0.6 }, ["KC", "DEN"]);
    expect(out.KC + out.DEN).toBeCloseTo(1, 6);
  });

  it("degrades to a uniform field instead of dividing by zero", () => {
    const out = normalizeOwnership({}, ["KC", "DEN", "BUF", "SF"]);
    for (const t of ["KC", "DEN", "BUF", "SF"]) {
      expect(out[t]).toBeCloseTo(0.25, 6);
    }
  });

  it("ignores teams that are not playing this week", () => {
    const out = normalizeOwnership({ KC: 0.5, PHI: 0.5 }, ["KC", "DEN"]);
    expect(out.PHI).toBeUndefined();
  });

  it("handles an empty slate", () => {
    expect(normalizeOwnership({ KC: 1 }, [])).toEqual({});
  });
});
