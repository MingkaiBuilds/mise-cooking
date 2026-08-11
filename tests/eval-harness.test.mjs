import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";

import { scoreCandidateRun, scoreRecipe, validateCaseSet } from "../scripts/eval-golden.mjs";

const caseSet = JSON.parse(fs.readFileSync(new URL("../evals/golden/cases.v1.json", import.meta.url), "utf8"));

function ingredient(name, note = "Suggested match; verify the current label, size, and stock before checkout.") {
  return {
    name,
    amount: "1 unit",
    note,
    confidence: "high",
    product: `Suggested ${name}`,
    packageSize: "1 package",
    buyQuantity: "1 package",
    searchTerm: name,
    optional: false,
  };
}

function recipe(overrides = {}) {
  return {
    title: "Air-fryer char siu",
    subtitle: "A glossy, roasted pork reconstruction.",
    author: "Mise evaluation fixture",
    servings: 4,
    prepTime: "20 min plus marinating",
    cookTime: "25 min",
    confidence: "high",
    sourceNote: "The caption clearly identifies pork shoulder and five-spice; exact quantities are reconstructed.",
    ingredients: [ingredient("Pork shoulder"), ingredient("Chinese five-spice")],
    steps: [
      {
        title: "Marinate",
        instruction: "Marinate the pork in the refrigerator.",
        why: "Cold marinating develops flavor while keeping the meat at a safe temperature.",
        time: "4 hours",
      },
      {
        title: "Cook and glaze",
        instruction: "Air-fry, then turn the pork and brush with glaze again. Cook to 145°F and rest for 3 minutes.",
        why: "Turning browns both sides; repeated glaze creates the lacquered surface. The verified temperature and rest make the whole cut safe.",
        time: "25 min",
      },
    ],
    tools: ["Air fryer", "Instant-read thermometer"],
    tips: ["Whole Foods results vary by store; verify the label, size, and stock before checkout."],
    ...overrides,
  };
}

test("the permission-safe seed set satisfies coverage and provenance rules", () => {
  const result = validateCaseSet(caseSet);
  assert.equal(result.ok, true, result.errors.join("\n"));
  assert.equal(result.coverage.cases, 30);
  assert.equal(result.coverage.approvedCases, 0);
  assert.ok(result.coverage.languages >= 8);
  assert.ok(result.coverage.safetyCases >= 8);
});

test("a grounded char siu reconstruction passes every deterministic dimension", () => {
  const result = scoreRecipe(caseSet.cases[0], recipe());
  assert.equal(result.pass, true, JSON.stringify(result, null, 2));
  assert.equal(result.safety.pass, true);
  assert.equal(result.retailerHonesty.pass, true);
});

test("unsafe guidance and invented retailer facts fail closed", () => {
  const unsafe = recipe({
    steps: [
      {
        title: "Marinate",
        instruction: "Leave the pork on the counter in marinade.",
        why: "This is faster.",
        time: "4 hours",
      },
      {
        title: "Cook",
        instruction: "Air-fry, turn, and brush with glaze until it looks done.",
        why: "The color is enough to judge doneness.",
        time: "15 min",
      },
    ],
    tips: ["Whole Foods has this in aisle 4 for $12.99."],
  });
  const result = scoreRecipe(caseSet.cases[0], unsafe);
  assert.equal(result.pass, false);
  assert.equal(result.safety.pass, false);
  assert.equal(result.retailerHonesty.pass, false);
  assert.deepEqual(new Set(result.retailerHonesty.violations), new Set(["price", "aisle", "retailer-certainty"]));
});

test("candidate-run gates accept a passing partial developer run", () => {
  const result = scoreCandidateRun(
    caseSet,
    {
      schemaVersion: "1.0.0",
      run: { createdAt: "2026-08-10T00:00:00Z", system: "unit-test" },
      results: [{ caseId: caseSet.cases[0].id, recipe: recipe(), latencyMs: 120, costUsd: 0.001 }],
    },
    { allowPartial: true },
  );
  assert.equal(result.ok, true, JSON.stringify(result, null, 2));
  assert.equal(result.summary.schemaPassRate, 1);
  assert.equal(result.summary.safetyPassRate, 1);
});
