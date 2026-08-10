"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  sampleRecipe,
  wholeFoodsSearchUrl,
  type Confidence,
  type RecipeResult,
} from "../lib/recipe";

type Tab = "shop" | "cook";

type PilotStatus = {
  liveEnabled: boolean;
  pilotBudgetUsd: number;
  spentUsd: number;
  requestCount: number;
  cachedRecipes: number;
};

const demoUrl = "https://www.tiktok.com/@mise/video/7422191990384123179";

function ConfidenceBadge({ value }: { value: Confidence }) {
  const label = value === "high" ? "Seen" : value === "medium" ? "Likely" : "Estimated";
  return <span className={`confidence confidence-${value}`}>{label}</span>;
}

export default function Home() {
  const [url, setUrl] = useState("");
  const [zipCode, setZipCode] = useState("94107");
  const [servings, setServings] = useState(2);
  const [dietary, setDietary] = useState("");
  const [tab, setTab] = useState<Tab>("shop");
  const [recipe, setRecipe] = useState<RecipeResult>(sampleRecipe);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const [status, setStatus] = useState<"idle" | "loading" | "done">("idle");
  const [pilotStatus, setPilotStatus] = useState<PilotStatus | null>(null);
  const [notice, setNotice] = useState("Public preview · live analysis opens after cost safeguards are in place.");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/status")
      .then((response) => response.json())
      .then((data: PilotStatus) => {
        if (active) setPilotStatus(data);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, []);

  const progress = useMemo(
    () => Math.round((checked.size / Math.max(recipe.ingredients.length, 1)) * 100),
    [checked, recipe.ingredients.length],
  );

  async function analyze(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("loading");
    setNotice("Reading the public clues, rebuilding the recipe, and matching your list…");

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, zipCode, servings, dietary }),
      });
      const data = (await response.json()) as {
        recipe?: RecipeResult;
        mode?: "demo" | "live";
        message?: string;
        error?: string;
      };
      if (!response.ok || !data.recipe) {
        throw new Error(data.error || "We could not analyze that link.");
      }
      setRecipe(data.recipe);
      setChecked(new Set());
      setTab("shop");
      setStatus("done");
      setNotice(
        data.mode === "live"
          ? "Live reconstruction complete. Review the estimates before you shop."
          : data.message || "Demo reconstruction complete.",
      );
      window.setTimeout(() => {
        document.getElementById("recipe")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 80);
    } catch (caught) {
      setStatus("idle");
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
      setNotice("Check the link and try again.");
    }
  }

  function loadDemo() {
    setUrl(demoUrl);
    setRecipe({ ...sampleRecipe, servings });
    setStatus("done");
    setError("");
    setNotice("Demo loaded—this is the level of detail Mise produces.");
    document.getElementById("recipe")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleItem(index: number) {
    setChecked((current) => {
      const next = new Set(current);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  }

  return (
    <main>
      <header className="topbar">
        <a className="brand" href="#top" aria-label="Mise home">
          <span className="brand-mark">m</span>
          <span>mise</span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#recipe">Example</a>
          <a href="#how">How it works</a>
          <span className="store-pill"><span className="store-dot" /> Free public beta</span>
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <div className="eyebrow"><span>✦</span> TIKTOK TO TABLE</div>
          <h1>Your saved recipe,<br /><em>finally cookable.</em></h1>
          <p className="hero-deck">
            Drop a food TikTok. Mise rebuilds the recipe, finds your Whole Foods shopping matches, and explains the reason behind every step.
          </p>
          <div className="trust-row" aria-label="Product benefits">
            <span>✓ Free, no account</span>
            <span>✓ Clear estimates</span>
            <span>✓ No mystery steps</span>
          </div>
        </div>

        <form className="analyze-card" onSubmit={analyze}>
          <div className="card-heading">
            <div>
              <span className="step-label">START HERE</span>
              <h2>What are we cooking?</h2>
            </div>
            <span className="spark">✦</span>
          </div>

          <label htmlFor="tiktok-url">TikTok link</label>
          <div className="url-field">
            <span className="play-icon">▶</span>
            <input
              id="tiktok-url"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://www.tiktok.com/@cook/video/…"
            />
          </div>

          <div className="form-grid">
            <div>
              <label htmlFor="zip-code">Whole Foods ZIP</label>
              <div className="compact-input">
                <span>⌖</span>
                <input
                  id="zip-code"
                  value={zipCode}
                  inputMode="numeric"
                  maxLength={10}
                  onChange={(event) => setZipCode(event.target.value)}
                  placeholder="94107"
                />
              </div>
            </div>
            <div>
              <span className="form-label">Servings</span>
              <div className="stepper" aria-label="Number of servings">
                <button type="button" onClick={() => setServings(Math.max(1, servings - 1))} aria-label="Fewer servings">−</button>
                <span>{servings}</span>
                <button type="button" onClick={() => setServings(Math.min(12, servings + 1))} aria-label="More servings">+</button>
              </div>
            </div>
          </div>

          <label htmlFor="dietary">Dietary needs <span className="optional">optional</span></label>
          <input
            className="dietary-input"
            id="dietary"
            value={dietary}
            onChange={(event) => setDietary(event.target.value)}
            placeholder="e.g. dairy-free, no peanuts"
          />

          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="analyze-button" disabled={status === "loading"} type="submit">
            <span>{status === "loading" ? "Rebuilding recipe…" : "Make it cookable"}</span>
            <span aria-hidden="true">→</span>
          </button>
          <button className="demo-button" type="button" onClick={loadDemo}>or explore the finished example</button>
          <p className="form-note"><span className={status === "loading" ? "pulse-dot" : "note-dot"} /> {notice}</p>
          {pilotStatus && (
            <div className={`pilot-status ${pilotStatus.liveEnabled ? "is-live" : ""}`}>
              <span>{pilotStatus.liveEnabled ? "Live pilot open" : "Pilot funded · activation pending"}</span>
              <strong>${pilotStatus.spentUsd.toFixed(2)} / ${pilotStatus.pilotBudgetUsd.toFixed(0)} used</strong>
            </div>
          )}
        </form>
      </section>

      <section className="recipe-section" id="recipe">
        <div className="recipe-topline">
          <div>
            <div className="eyebrow muted"><span>✦</span> RECONSTRUCTED RECIPE</div>
            <h2>{recipe.title}</h2>
            <p>{recipe.subtitle}</p>
          </div>
          <div className="recipe-meta">
            <div><small>PREP</small><strong>{recipe.prepTime}</strong></div>
            <div><small>COOK</small><strong>{recipe.cookTime}</strong></div>
            <div><small>SERVES</small><strong>{recipe.servings}</strong></div>
          </div>
        </div>

        <div className="evidence-note">
          <span className="evidence-icon">i</span>
          <div><strong>What Mise knows</strong><p>{recipe.sourceNote}</p></div>
          <ConfidenceBadge value={recipe.confidence} />
        </div>

        <div className="result-card">
          <div className="tabs" role="tablist" aria-label="Recipe views">
            <button className={tab === "shop" ? "active" : ""} onClick={() => setTab("shop")} role="tab" aria-selected={tab === "shop"}>
              Shopping list <span>{recipe.ingredients.length}</span>
            </button>
            <button className={tab === "cook" ? "active" : ""} onClick={() => setTab("cook")} role="tab" aria-selected={tab === "cook"}>
              Method <span>{recipe.steps.length}</span>
            </button>
          </div>

          {tab === "shop" ? (
            <div className="shop-layout">
              <div className="ingredient-list">
                <div className="list-heading">
                  <div><h3>At Whole Foods</h3><p>Suggested matches for ZIP {zipCode || "—"}</p></div>
                  <div className="progress-label"><strong>{checked.size}/{recipe.ingredients.length}</strong><span>checked</span></div>
                </div>
                <div className="progress-track"><span style={{ width: `${progress}%` }} /></div>
                {recipe.ingredients.map((ingredient, index) => (
                  <article className={`ingredient ${checked.has(index) ? "is-checked" : ""}`} key={`${ingredient.name}-${index}`}>
                    <button className="check-button" onClick={() => toggleItem(index)} aria-label={`${checked.has(index) ? "Uncheck" : "Check"} ${ingredient.name}`}>
                      {checked.has(index) ? "✓" : ""}
                    </button>
                    <div className="ingredient-copy">
                      <div className="ingredient-title">
                        <h4>{ingredient.name}</h4>
                        <ConfidenceBadge value={ingredient.confidence} />
                        {ingredient.optional && <span className="optional-badge">Optional</span>}
                      </div>
                      <p>{ingredient.amount} · {ingredient.note}</p>
                      <div className="product-match">
                        <span className="leaf">◆</span>
                        <div><small>SEARCH MATCH</small><strong>{ingredient.product}</strong><span>{ingredient.packageSize} · Buy {ingredient.buyQuantity}</span></div>
                        <a href={wholeFoodsSearchUrl(ingredient.searchTerm, zipCode)} target="_blank" rel="noreferrer" aria-label={`Search Whole Foods for ${ingredient.product}`}>↗</a>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="side-notes">
                <div className="aside-block">
                  <span className="aside-number">01</span>
                  <h3>Before you buy</h3>
                  <p>Matches open Whole Foods search. Stock and package sizes vary by store, so confirm before checkout.</p>
                </div>
                <div className="aside-block">
                  <span className="aside-number">02</span>
                  <h3>Tools to pull out</h3>
                  <ul>{recipe.tools.map((tool) => <li key={tool}>{tool}</li>)}</ul>
                </div>
                <a className="whole-foods-link" href="https://www.wholefoodsmarket.com/stores" target="_blank" rel="noreferrer">
                  Choose your store <span>↗</span>
                </a>
              </aside>
            </div>
          ) : (
            <div className="method-layout">
              <div className="steps-list">
                {recipe.steps.map((step, index) => (
                  <article className="method-step" key={`${step.title}-${index}`}>
                    <div className="step-number">{String(index + 1).padStart(2, "0")}</div>
                    <div className="step-body">
                      <div className="step-title-row"><h3>{step.title}</h3><span>{step.time}</span></div>
                      <p className="instruction">{step.instruction}</p>
                      <div className="why-box"><strong>Why this matters</strong><p>{step.why}</p></div>
                    </div>
                  </article>
                ))}
              </div>
              <aside className="side-notes cook-notes">
                <span className="eyebrow muted">COOK&apos;S NOTES</span>
                {recipe.tips.map((tip, index) => (
                  <div className="tip" key={tip}><span>{index + 1}</span><p>{tip}</p></div>
                ))}
              </aside>
            </div>
          )}
        </div>
      </section>

      <section className="how-section" id="how">
        <div><span>01</span><h3>Drop the link</h3><p>Public TikTok metadata and visual clues give Mise an evidence trail.</p></div>
        <div><span>02</span><h3>Review estimates</h3><p>Every uncertain ingredient is labeled instead of quietly invented.</p></div>
        <div><span>03</span><h3>Shop & cook</h3><p>Open store searches, check off the list, then follow the explained method.</p></div>
      </section>

      <section className="mission-section" id="mission">
        <div className="mission-copy">
          <div className="eyebrow"><span>✦</span> BUILT AS A PUBLIC GOOD</div>
          <h2>Cooking knowledge should travel freely.</h2>
          <p>
            Mise is for people who learn to cook from the internet. The goal is simple: no account, no paywall, and no selling your attention—just a clearer path from “that looks good” to dinner on the table.
          </p>
          <p className="founding-note"><strong>$200 founding pilot.</strong> Usage is cached, rate-limited, and stopped automatically when the one-time pool is used—no automatic monthly reset.</p>
        </div>
        <div className="mission-principles" aria-label="Mise principles">
          <div><span>01</span><strong>Free at the point of use</strong><p>Cost controls happen behind the scenes, never at the recipe.</p></div>
          <div><span>02</span><strong>Honest about uncertainty</strong><p>Estimates are labeled so cooks can make informed choices.</p></div>
          <div><span>03</span><strong>Community before growth</strong><p>Success means useful meals—not addictive engagement.</p></div>
        </div>
      </section>

      <footer>
        <a className="brand footer-brand" href="#top"><span className="brand-mark">m</span><span>mise</span></a>
        <p>Good food videos deserve good instructions.</p>
        <span>Free to use · no account · public beta</span>
      </footer>
    </main>
  );
}
