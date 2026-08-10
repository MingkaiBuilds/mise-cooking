export type Confidence = "high" | "medium" | "low";

export type Ingredient = {
  name: string;
  amount: string;
  note: string;
  confidence: Confidence;
  product: string;
  packageSize: string;
  buyQuantity: string;
  searchTerm: string;
  optional: boolean;
};

export type RecipeStep = {
  title: string;
  instruction: string;
  why: string;
  time: string;
};

export type RecipeResult = {
  title: string;
  subtitle: string;
  author: string;
  servings: number;
  prepTime: string;
  cookTime: string;
  confidence: Confidence;
  sourceNote: string;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  tools: string[];
  tips: string[];
};

export const sampleRecipe: RecipeResult = {
  title: "Gochujang butter noodles",
  subtitle: "Glossy, spicy-sweet noodles with scallions and a jammy egg.",
  author: "Mise test kitchen",
  servings: 2,
  prepTime: "10 min",
  cookTime: "15 min",
  confidence: "medium",
  sourceNote:
    "The sauce structure and finishing technique are strongly supported by the visible dish. Exact butter and gochujang amounts are estimated and easy to adjust.",
  ingredients: [
    {
      name: "Spaghetti",
      amount: "8 oz",
      note: "Bucatini or ramen noodles also work.",
      confidence: "high",
      product: "365 by Whole Foods Market Spaghetti",
      packageSize: "16 oz box",
      buyQuantity: "1 box",
      searchTerm: "365 spaghetti",
      optional: false,
    },
    {
      name: "Gochujang",
      amount: "2 tbsp",
      note: "Use 1 tbsp for a gentler heat.",
      confidence: "medium",
      product: "Traditional Korean Gochujang Hot Pepper Paste",
      packageSize: "7–10 oz tub",
      buyQuantity: "1 tub",
      searchTerm: "gochujang paste",
      optional: false,
    },
    {
      name: "Unsalted butter",
      amount: "3 tbsp",
      note: "Salted butter is fine; reduce the soy sauce slightly.",
      confidence: "medium",
      product: "365 by Whole Foods Market Unsalted Butter",
      packageSize: "16 oz box",
      buyQuantity: "1 box",
      searchTerm: "365 unsalted butter",
      optional: false,
    },
    {
      name: "Soy sauce",
      amount: "1½ tbsp",
      note: "Tamari makes the sauce gluten-free when paired with GF noodles.",
      confidence: "high",
      product: "365 by Whole Foods Market Organic Soy Sauce",
      packageSize: "10 fl oz bottle",
      buyQuantity: "1 bottle",
      searchTerm: "365 organic soy sauce",
      optional: false,
    },
    {
      name: "Garlic",
      amount: "2 cloves",
      note: "Grate or mince very finely.",
      confidence: "high",
      product: "Organic Garlic",
      packageSize: "3-count pack",
      buyQuantity: "1 pack",
      searchTerm: "organic garlic",
      optional: false,
    },
    {
      name: "Large eggs",
      amount: "2",
      note: "The yolk adds richness when mixed into the noodles.",
      confidence: "medium",
      product: "365 by Whole Foods Market Cage-Free Large Brown Eggs",
      packageSize: "12 count",
      buyQuantity: "1 carton",
      searchTerm: "365 large brown eggs",
      optional: false,
    },
    {
      name: "Scallions",
      amount: "3",
      note: "Keep the pale and green parts separate.",
      confidence: "high",
      product: "Organic Green Onions",
      packageSize: "1 bunch",
      buyQuantity: "1 bunch",
      searchTerm: "organic green onions",
      optional: false,
    },
    {
      name: "Toasted sesame seeds",
      amount: "1 tsp",
      note: "A finishing garnish for crunch and aroma.",
      confidence: "low",
      product: "Toasted Sesame Seeds",
      packageSize: "2–3 oz jar",
      buyQuantity: "1 jar",
      searchTerm: "toasted sesame seeds",
      optional: true,
    },
  ],
  steps: [
    {
      title: "Boil the eggs",
      instruction:
        "Lower the eggs into simmering water for 7 minutes, then move them straight into ice water.",
      why:
        "Seven minutes sets the whites while keeping the yolks jammy. The ice bath stops residual heat from overcooking them.",
      time: "7 min",
    },
    {
      title: "Build the aromatic base",
      instruction:
        "Melt 1 tablespoon butter over medium-low heat. Add the pale scallion parts and garlic; stir until fragrant, about 45 seconds.",
      why:
        "Gentle heat pulls flavor into the butter without scorching the garlic, which would make the whole sauce bitter.",
      time: "2 min",
    },
    {
      title: "Bloom the gochujang",
      instruction:
        "Stir in the gochujang and cook until it turns brick red and begins sticking lightly to the pan.",
      why:
        "Frying the paste wakes up its fermented chile aroma and removes the raw, pasty edge.",
      time: "1 min",
    },
    {
      title: "Cook the noodles",
      instruction:
        "Boil the spaghetti in well-salted water until 1 minute shy of al dente. Reserve ¾ cup pasta water before draining.",
      why:
        "The noodles finish in the sauce, and starchy pasta water helps the butter and gochujang form a glossy emulsion.",
      time: "8–10 min",
    },
    {
      title: "Make it glossy",
      instruction:
        "Add the noodles, soy sauce, remaining butter, and ½ cup pasta water. Toss vigorously over medium heat until the sauce clings; loosen with more water as needed.",
      why:
        "Vigorous tossing suspends butterfat in the starchy water, turning separate ingredients into a smooth sauce instead of an oily coating.",
      time: "2–3 min",
    },
    {
      title: "Finish and taste",
      instruction:
        "Divide between warm bowls. Add the halved eggs, scallion greens, and sesame seeds. Taste before adding salt.",
      why:
        "Soy sauce and gochujang are already salty. Finishing first prevents accidental over-seasoning.",
      time: "2 min",
    },
  ],
  tools: ["Medium saucepan", "Large skillet", "Tongs", "Microplane or knife"],
  tips: [
    "Keep extra pasta water nearby—the sauce thickens quickly as it cools.",
    "For more protein, add shredded rotisserie chicken or crisped tofu.",
    "Whole Foods results vary by store; verify the label, size, and stock before checkout.",
  ],
};

export function wholeFoodsSearchUrl(searchTerm: string, zipCode?: string) {
  const query = zipCode ? `${searchTerm} ${zipCode}` : searchTerm;
  return `https://www.wholefoodsmarket.com/grocery/search?text=${encodeURIComponent(query)}`;
}
