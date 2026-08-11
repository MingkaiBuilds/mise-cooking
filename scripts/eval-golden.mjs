#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const CONFIDENCE_RANK = { low: 0, medium: 1, high: 2 };
const EVIDENCE_QUALITIES = new Set(["clear", "missing-quantity", "contradictory", "adversarial"]);
const REVIEW_STATUSES = new Set(["draft", "culinary-reviewed", "safety-reviewed", "approved"]);
const RETAILER_CLAIM_PATTERNS = [
  { id: "price", pattern: /[$€£]\s*\d+(?:[.,]\d{1,2})?/iu },
  { id: "inventory", pattern: /\b(?:in stock|currently available|available now|sold out)\b/iu },
  { id: "aisle", pattern: /\baisle\s+[a-z0-9-]+\b/iu },
  { id: "delivery", pattern: /\b(?:same-day|same day) delivery\b/iu },
  { id: "retailer-certainty", pattern: /\bwhole foods (?:has|carries|stocks|currently offers)\b/iu },
];

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function boundedString(value, maxLength) {
  return typeof value === "string" && value.trim().length > 0 && value.length <= maxLength;
}

function normalize(value) {
  return String(value ?? "")
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toLocaleLowerCase("en-US")
    .replace(/[‐‑‒–—]/gu, "-")
    .replace(/[^\p{Letter}\p{Number}°$€£%'-]+/gu, " ")
    .replace(/\s+/gu, " ")
    .trim();
}

function containsPhrase(haystack, needle) {
  const source = ` ${normalize(haystack)} `;
  const target = ` ${normalize(needle)} `;
  return source.includes(target);
}

function arrayOfStrings(value, { min = 0 } = {}) {
  return Array.isArray(value) && value.length >= min && value.every((item) => boundedString(item, 2000));
}

function validateAssertion(value, location, errors) {
  if (!isRecord(value)) {
    errors.push(`${location} must be an object`);
    return;
  }
  if (!boundedString(value.label, 200)) errors.push(`${location}.label must be a non-empty string`);
  if (!arrayOfStrings(value.anyOf, { min: 1 })) errors.push(`${location}.anyOf must contain aliases`);
}

export function validateCaseSet(caseSet) {
  const errors = [];
  if (!isRecord(caseSet)) return { ok: false, errors: ["case set must be an object"], coverage: {} };
  if (caseSet.schemaVersion !== "1.0.0") errors.push("schemaVersion must equal 1.0.0");
  if (caseSet.license !== "CC0-1.0") errors.push("case set license must be CC0-1.0");
  if (!boundedString(caseSet.name, 200)) errors.push("name must be a non-empty string");
  if (!boundedString(caseSet.description, 1000)) errors.push("description must be a non-empty string");

  const authorityUrls = new Set();
  if (!Array.isArray(caseSet.authorityReferences) || caseSet.authorityReferences.length < 1) {
    errors.push("authorityReferences must include at least one source");
  } else {
    caseSet.authorityReferences.forEach((reference, index) => {
      if (!isRecord(reference) || !boundedString(reference.name, 300) || !boundedString(reference.url, 1000)) {
        errors.push(`authorityReferences[${index}] is invalid`);
      } else {
        try {
          const url = new URL(reference.url);
          if (url.protocol !== "https:") errors.push(`authorityReferences[${index}].url must use HTTPS`);
          authorityUrls.add(reference.url);
        } catch {
          errors.push(`authorityReferences[${index}].url must be a valid URL`);
        }
      }
    });
  }

  const cases = Array.isArray(caseSet.cases) ? caseSet.cases : [];
  if (cases.length < 30 || cases.length > 50) errors.push("cases must contain between 30 and 50 entries");
  const ids = new Set();
  const languages = new Set();
  const cuisines = new Set();
  const qualities = new Map();
  let dietaryCases = 0;
  let safetyCases = 0;
  let approvedCases = 0;

  cases.forEach((fixture, index) => {
    const location = `cases[${index}]`;
    if (!isRecord(fixture)) {
      errors.push(`${location} must be an object`);
      return;
    }
    if (!/^mise-seed-\d{3}$/u.test(fixture.id ?? "")) errors.push(`${location}.id is invalid`);
    if (ids.has(fixture.id)) errors.push(`${location}.id is duplicated`);
    ids.add(fixture.id);
    if (!boundedString(fixture.title, 300)) errors.push(`${location}.title is invalid`);
    if (!boundedString(fixture.language, 20)) errors.push(`${location}.language is invalid`);
    else languages.add(fixture.language);
    if (!boundedString(fixture.outputLanguage, 20)) errors.push(`${location}.outputLanguage is invalid`);
    if (!arrayOfStrings(fixture.cuisineTags, { min: 1 })) errors.push(`${location}.cuisineTags is invalid`);
    else fixture.cuisineTags.forEach((tag) => cuisines.add(tag));
    if (!arrayOfStrings(fixture.techniqueTags, { min: 1 })) errors.push(`${location}.techniqueTags is invalid`);
    if (!arrayOfStrings(fixture.dietaryTags)) errors.push(`${location}.dietaryTags is invalid`);
    else if (fixture.dietaryTags.length > 0) dietaryCases += 1;
    if (!EVIDENCE_QUALITIES.has(fixture.evidenceQuality)) errors.push(`${location}.evidenceQuality is invalid`);
    else qualities.set(fixture.evidenceQuality, (qualities.get(fixture.evidenceQuality) ?? 0) + 1);

    if (!isRecord(fixture.evidence) || !boundedString(fixture.evidence.caption, 4000) || !arrayOfStrings(fixture.evidence.visualNotes, { min: 1 })) {
      errors.push(`${location}.evidence is invalid`);
    }
    if (
      !isRecord(fixture.request) ||
      !Number.isInteger(fixture.request.servings) ||
      fixture.request.servings < 1 ||
      fixture.request.servings > 12 ||
      typeof fixture.request.dietary !== "string"
    ) {
      errors.push(`${location}.request is invalid`);
    }

    if (!isRecord(fixture.expected)) {
      errors.push(`${location}.expected is invalid`);
    } else {
      if (!Array.isArray(fixture.expected.requiredIngredients) || fixture.expected.requiredIngredients.length < 1) {
        errors.push(`${location}.expected.requiredIngredients must not be empty`);
      } else {
        fixture.expected.requiredIngredients.forEach((value, assertionIndex) =>
          validateAssertion(value, `${location}.expected.requiredIngredients[${assertionIndex}]`, errors),
        );
      }
      if (!arrayOfStrings(fixture.expected.forbiddenIngredients)) errors.push(`${location}.expected.forbiddenIngredients is invalid`);
      if (!Array.isArray(fixture.expected.requiredConcepts) || fixture.expected.requiredConcepts.length < 1) {
        errors.push(`${location}.expected.requiredConcepts must not be empty`);
      } else {
        fixture.expected.requiredConcepts.forEach((value, assertionIndex) =>
          validateAssertion(value, `${location}.expected.requiredConcepts[${assertionIndex}]`, errors),
        );
      }
      if (!(fixture.expected.confidenceCeiling in CONFIDENCE_RANK)) errors.push(`${location}.expected.confidenceCeiling is invalid`);
      if (!Array.isArray(fixture.expected.safetyRules)) {
        errors.push(`${location}.expected.safetyRules is invalid`);
      } else {
        if (fixture.expected.safetyRules.length > 0) safetyCases += 1;
        fixture.expected.safetyRules.forEach((rule, ruleIndex) => {
          const ruleLocation = `${location}.expected.safetyRules[${ruleIndex}]`;
          if (
            !isRecord(rule) ||
            !boundedString(rule.id, 200) ||
            !arrayOfStrings(rule.anyOf, { min: 1 }) ||
            !arrayOfStrings(rule.mustAlsoInclude) ||
            !authorityUrls.has(rule.authorityUrl)
          ) {
            errors.push(`${ruleLocation} is invalid or cites an undeclared authority`);
          }
        });
      }
    }

    if (fixture.rights?.fixtureOrigin !== "mise-authored-synthetic" || fixture.rights?.license !== "CC0-1.0") {
      errors.push(`${location}.rights must identify a CC0 Mise-authored synthetic fixture`);
    }
    if (!isRecord(fixture.review) || !REVIEW_STATUSES.has(fixture.review.status) || !boundedString(fixture.review.notes, 1000)) {
      errors.push(`${location}.review is invalid`);
    } else if (fixture.review.status === "approved") {
      approvedCases += 1;
    }
  });

  const coverage = {
    cases: cases.length,
    languages: languages.size,
    cuisines: cuisines.size,
    evidenceQuality: Object.fromEntries([...qualities.entries()].sort()),
    dietaryCases,
    safetyCases,
    approvedCases,
  };
  if (languages.size < 8) errors.push("coverage requires at least 8 source languages");
  if (cuisines.size < 15) errors.push("coverage requires at least 15 cuisine tags");
  for (const quality of EVIDENCE_QUALITIES) {
    if (!qualities.has(quality)) errors.push(`coverage requires evidenceQuality=${quality}`);
  }
  if ((qualities.get("adversarial") ?? 0) < 2) errors.push("coverage requires at least 2 adversarial cases");
  if ((qualities.get("contradictory") ?? 0) < 3) errors.push("coverage requires at least 3 contradictory cases");
  if ((qualities.get("missing-quantity") ?? 0) < 5) errors.push("coverage requires at least 5 missing-quantity cases");
  if (dietaryCases < 8) errors.push("coverage requires at least 8 dietary cases");
  if (safetyCases < 8) errors.push("coverage requires at least 8 food-safety cases");

  return { ok: errors.length === 0, errors, coverage };
}

export function validateRecipeShape(value, expectedServings) {
  const errors = [];
  if (!isRecord(value)) return { ok: false, errors: ["recipe must be an object"] };
  const requiredStrings = [
    ["title", 200],
    ["subtitle", 500],
    ["author", 200],
    ["prepTime", 80],
    ["cookTime", 80],
    ["sourceNote", 1200],
  ];
  for (const [field, max] of requiredStrings) {
    if (!boundedString(value[field], max)) errors.push(`${field} is invalid`);
  }
  if (!Number.isInteger(value.servings) || value.servings < 1 || value.servings > 12) errors.push("servings is invalid");
  if (expectedServings !== undefined && value.servings !== expectedServings) errors.push(`servings must equal ${expectedServings}`);
  if (!(value.confidence in CONFIDENCE_RANK)) errors.push("confidence is invalid");

  if (!Array.isArray(value.ingredients) || value.ingredients.length < 2 || value.ingredients.length > 60) {
    errors.push("ingredients must contain 2–60 entries");
  } else {
    value.ingredients.forEach((ingredient, index) => {
      if (!isRecord(ingredient)) {
        errors.push(`ingredients[${index}] must be an object`);
        return;
      }
      for (const [field, max] of [["name", 160], ["amount", 100], ["note", 600], ["product", 240], ["packageSize", 120], ["buyQuantity", 80], ["searchTerm", 160]]) {
        if (!boundedString(ingredient[field], max)) errors.push(`ingredients[${index}].${field} is invalid`);
      }
      if (!(ingredient.confidence in CONFIDENCE_RANK)) errors.push(`ingredients[${index}].confidence is invalid`);
      if (typeof ingredient.optional !== "boolean") errors.push(`ingredients[${index}].optional is invalid`);
    });
  }

  if (!Array.isArray(value.steps) || value.steps.length < 2 || value.steps.length > 40) {
    errors.push("steps must contain 2–40 entries");
  } else {
    value.steps.forEach((step, index) => {
      if (!isRecord(step)) {
        errors.push(`steps[${index}] must be an object`);
        return;
      }
      for (const [field, max] of [["title", 160], ["instruction", 2000], ["why", 1200], ["time", 80]]) {
        if (!boundedString(step[field], max)) errors.push(`steps[${index}].${field} is invalid`);
      }
    });
  }
  if (!arrayOfStrings(value.tools) || value.tools.length > 30) errors.push("tools is invalid");
  if (!arrayOfStrings(value.tips) || value.tips.length > 20) errors.push("tips is invalid");
  return { ok: errors.length === 0, errors };
}

function recipeText(recipe) {
  return [
    recipe.title,
    recipe.subtitle,
    recipe.sourceNote,
    ...(recipe.ingredients ?? []).flatMap((ingredient) => [ingredient.name, ingredient.amount, ingredient.note, ingredient.product, ingredient.packageSize, ingredient.buyQuantity, ingredient.searchTerm]),
    ...(recipe.steps ?? []).flatMap((step) => [step.title, step.instruction, step.why, step.time]),
    ...(recipe.tools ?? []),
    ...(recipe.tips ?? []),
  ].join("\n");
}

function ingredientText(recipe) {
  return (recipe.ingredients ?? [])
    .flatMap((ingredient) => [ingredient.name, ingredient.note, ingredient.product, ingredient.searchTerm])
    .join("\n");
}

function scoreAssertions(assertions, text) {
  const details = assertions.map((assertion) => ({
    label: assertion.label,
    pass: assertion.anyOf.some((alias) => containsPhrase(text, alias)),
  }));
  return { pass: details.every((detail) => detail.pass), details };
}

export function scoreRecipe(fixture, recipe) {
  const shape = validateRecipeShape(recipe, fixture.request.servings);
  if (!shape.ok) {
    return {
      caseId: fixture.id,
      pass: false,
      schema: { pass: false, errors: shape.errors },
      requiredIngredients: { pass: false, details: [] },
      forbiddenIngredients: { pass: false, found: [] },
      requiredConcepts: { pass: false, details: [] },
      safety: { pass: false, details: [] },
      confidence: { pass: false },
      retailerHonesty: { pass: false, violations: [] },
    };
  }

  const allText = recipeText(recipe);
  const ingredientsOnly = ingredientText(recipe);
  const requiredIngredients = scoreAssertions(fixture.expected.requiredIngredients, ingredientsOnly);
  const forbiddenFound = fixture.expected.forbiddenIngredients.filter((term) => containsPhrase(ingredientsOnly, term));
  const forbiddenIngredients = { pass: forbiddenFound.length === 0, found: forbiddenFound };
  const requiredConcepts = scoreAssertions(fixture.expected.requiredConcepts, allText);
  const safetyDetails = fixture.expected.safetyRules.map((rule) => ({
    id: rule.id,
    pass:
      rule.anyOf.some((term) => containsPhrase(allText, term)) &&
      (rule.mustAlsoInclude.length === 0 || rule.mustAlsoInclude.some((term) => containsPhrase(allText, term))),
  }));
  const safety = { pass: safetyDetails.every((detail) => detail.pass), details: safetyDetails };
  const confidence = {
    pass: CONFIDENCE_RANK[recipe.confidence] <= CONFIDENCE_RANK[fixture.expected.confidenceCeiling],
    actual: recipe.confidence,
    ceiling: fixture.expected.confidenceCeiling,
  };
  const violations = RETAILER_CLAIM_PATTERNS
    .filter(({ pattern }) => pattern.test(allText))
    .map(({ id }) => id);
  const retailerHonesty = { pass: violations.length === 0, violations };
  const dimensions = [shape.ok, requiredIngredients.pass, forbiddenIngredients.pass, requiredConcepts.pass, safety.pass, confidence.pass, retailerHonesty.pass];

  return {
    caseId: fixture.id,
    pass: dimensions.every(Boolean),
    schema: { pass: true, errors: [] },
    requiredIngredients,
    forbiddenIngredients,
    requiredConcepts,
    safety,
    confidence,
    retailerHonesty,
  };
}

function ratio(numerator, denominator) {
  return denominator === 0 ? 1 : numerator / denominator;
}

export function scoreCandidateRun(caseSet, candidateRun, { allowPartial = false } = {}) {
  const errors = [];
  if (!isRecord(candidateRun) || candidateRun.schemaVersion !== "1.0.0" || !Array.isArray(candidateRun.results)) {
    return { ok: false, errors: ["candidate run must have schemaVersion 1.0.0 and a results array"] };
  }
  const fixturesById = new Map(caseSet.cases.map((fixture) => [fixture.id, fixture]));
  const seen = new Set();
  const scores = [];
  let totalCostUsd = 0;
  let totalLatencyMs = 0;

  candidateRun.results.forEach((result, index) => {
    if (!isRecord(result) || !boundedString(result.caseId, 100)) {
      errors.push(`results[${index}] is invalid`);
      return;
    }
    if (seen.has(result.caseId)) errors.push(`results[${index}].caseId is duplicated`);
    seen.add(result.caseId);
    const fixture = fixturesById.get(result.caseId);
    if (!fixture) {
      errors.push(`results[${index}].caseId is unknown`);
      return;
    }
    if (result.error) {
      scores.push({ caseId: result.caseId, pass: false, error: String(result.error) });
    } else {
      scores.push(scoreRecipe(fixture, result.recipe));
    }
    if (Number.isFinite(result.costUsd) && result.costUsd >= 0) totalCostUsd += result.costUsd;
    if (Number.isFinite(result.latencyMs) && result.latencyMs >= 0) totalLatencyMs += result.latencyMs;
  });

  if (!allowPartial && seen.size !== caseSet.cases.length) {
    errors.push(`full run requires ${caseSet.cases.length} unique case results; received ${seen.size}`);
  }
  const count = scores.length;
  const passed = (dimension) => scores.filter((score) => score[dimension]?.pass).length;
  const summary = {
    evaluatedCases: count,
    casePassRate: ratio(scores.filter((score) => score.pass).length, count),
    schemaPassRate: ratio(passed("schema"), count),
    requiredIngredientPassRate: ratio(passed("requiredIngredients"), count),
    forbiddenIngredientPassRate: ratio(passed("forbiddenIngredients"), count),
    conceptPassRate: ratio(passed("requiredConcepts"), count),
    safetyPassRate: ratio(passed("safety"), count),
    confidencePassRate: ratio(passed("confidence"), count),
    retailerHonestyPassRate: ratio(passed("retailerHonesty"), count),
    averageLatencyMs: count === 0 ? 0 : totalLatencyMs / count,
    totalCostUsd,
  };
  const gates = {
    hasResults: count > 0,
    schemaPerfect: summary.schemaPassRate === 1,
    safetyPerfect: summary.safetyPassRate === 1,
    retailerHonestyPerfect: summary.retailerHonestyPassRate === 1,
    ingredientCoverage: summary.requiredIngredientPassRate >= 0.95,
  };
  return {
    ok: errors.length === 0 && Object.values(gates).every(Boolean),
    errors,
    gates,
    summary,
    scores,
  };
}

function parseArguments(argv) {
  const options = { caseSetPath: "evals/golden/cases.v1.json", resultsPath: undefined, allowPartial: false, json: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === "--cases") options.caseSetPath = argv[++index];
    else if (argument === "--results") options.resultsPath = argv[++index];
    else if (argument === "--allow-partial") options.allowPartial = true;
    else if (argument === "--json") options.json = true;
    else throw new Error(`Unknown argument: ${argument}`);
  }
  return options;
}

function printHumanValidation(result) {
  console.log(`Golden seed validation: ${result.ok ? "PASS" : "FAIL"}`);
  console.log(`Cases: ${result.coverage.cases}; languages: ${result.coverage.languages}; cuisine tags: ${result.coverage.cuisines}`);
  console.log(`Safety cases: ${result.coverage.safetyCases}; dietary cases: ${result.coverage.dietaryCases}; approved: ${result.coverage.approvedCases}`);
  console.log(`Evidence quality: ${JSON.stringify(result.coverage.evidenceQuality)}`);
  result.errors.forEach((error) => console.error(`- ${error}`));
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const caseSet = JSON.parse(fs.readFileSync(path.resolve(options.caseSetPath), "utf8"));
  const validation = validateCaseSet(caseSet);
  if (options.json) console.log(JSON.stringify({ validation }, null, 2));
  else printHumanValidation(validation);
  if (!validation.ok) process.exitCode = 1;
  if (!options.resultsPath || !validation.ok) return;

  const candidateRun = JSON.parse(fs.readFileSync(path.resolve(options.resultsPath), "utf8"));
  const scored = scoreCandidateRun(caseSet, candidateRun, { allowPartial: options.allowPartial });
  if (options.json) console.log(JSON.stringify({ scored }, null, 2));
  else {
    console.log(`Candidate run: ${scored.ok ? "PASS" : "FAIL"}`);
    console.log(JSON.stringify(scored.summary, null, 2));
    scored.errors.forEach((error) => console.error(`- ${error}`));
    for (const score of scored.scores.filter((item) => !item.pass)) {
      console.error(`- ${score.caseId}: failed ${Object.entries(score).filter(([, value]) => value?.pass === false).map(([key]) => key).join(", ") || "generation"}`);
    }
  }
  if (!scored.ok) process.exitCode = 1;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) await main();
