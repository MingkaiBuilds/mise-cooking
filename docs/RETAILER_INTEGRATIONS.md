# Retailer integration policy

Mise must never turn a plausible grocery suggestion into a claim about local
stock. Retailer data is useful only when its provider, store scope, retrieval
time, and limitations remain attached to the match.

## Match states

Every product match should use one of three explicit states:

1. **Suggested** — a culinary and package-size recommendation with no live
   retailer verification.
2. **Catalog verified** — matched to a provider product identifier, but not
   confirmed at the cook's selected store.
3. **Store verified** — the provider reported current availability for a
   specific store or service area, with a retrieval timestamp.

Price and availability must expire quickly and must never be inferred by the
model. Mise should preserve the recipe amount separately from the package to
buy and the expected remainder.

## Whole Foods path

Whole Foods Market's current U.S. consumer flow sends shoppers to Amazon for a
selected ZIP code and store. Mise has not identified a public, location-level
Whole Foods inventory API suitable for an independent public-good application.
Until an official integration or partnership is available, Mise will:

- label its Whole Foods matches as suggestions;
- link users to the official Whole Foods/Amazon shopping flow;
- avoid scraping authenticated storefronts or reverse-engineering private APIs;
- avoid displaying unverified prices, aisle numbers, or stock claims; and
- pursue an official Whole Foods or Amazon integration channel.

Amazon's Creators API may be useful for general Amazon catalog and offer data,
but those offers are not evidence of stock at a particular Whole Foods store.
It must not be presented as such.

## Cross-retailer fallback

Instacart's public Developer Platform can create a hosted shopping-list page
from ingredient names and measurements. On that page, the cook chooses an
available retailer and reviews matched products. This is a legitimate optional
handoff for supported retailers, not proof that Whole Foods is available in a
given U.S. market.

## Data boundaries

Mise may retain provider product IDs, normalized package data, match confidence,
store or service-area scope, retrieval time, and a short-lived availability
result. It should not retain retailer login credentials, carts, order history,
personalized prices, or purchase behavior. Provider terms and display rules
must travel with cached records.

## Integration gate

A retailer provider is production-ready only when:

- access is official and its terms permit Mise's use;
- credentials stay server-side and rotate safely;
- store selection and timestamps are explicit;
- stale data fails back to “suggested,” never to a fabricated live claim;
- sponsored placement cannot affect ranking; and
- contract tests prove provider failures do not block the cookable recipe.

## Primary references

- [Whole Foods Market grocery delivery and pickup](https://wfm.amazon.com/grocery-delivery-and-pickup)
- [Instacart Developer Platform shopping lists](https://docs.instacart.com/developer_platform_api/guide/concepts/shopping_list)
- [Amazon Creators API migration and onboarding](https://affiliate-program.amazon.com/creatorsapi/docs/en-us/migrating-to-creatorsapi-from-paapi)
