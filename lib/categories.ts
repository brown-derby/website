export type CategoryLandingPage = {
  slug: string;
  category: string;
  title: string;
  heading: string;
  description: string;
  intro: string;
  buyingHeading: string;
  buyingAdvice: string;
};

// Publish only categories with useful, reviewed copy and an existing catalog range.
// Product, search, and arbitrary filter URLs are deliberately not generated.
export const categoryLandingPages: CategoryLandingPage[] = [
  {
    slug: "food-grocery",
    category: "Food & Grocery",
    title: "Wholesale Food & Grocery in Newfoundland",
    heading: "Wholesale food and grocery supplies in Newfoundland.",
    description: "Browse wholesale grocery, sauces, condiments and pantry staples from Brown Derby in Grand Falls-Windsor, serving Central Newfoundland businesses.",
    intro: "Keep everyday food supplies together with Brown Derby's food and grocery range. Our published catalog includes shelf-stable groceries, sauces, condiments, canned goods and pantry staples for businesses in Central Newfoundland, supplied from Grand Falls-Windsor.",
    buyingHeading: "Plan your grocery order around pack sizes.",
    buyingAdvice: "Use the product descriptions to compare sizes and case quantities, and search by item number when reordering a familiar line. For a kitchen order, you can also browse our baking and foodservice ingredients. Contact our team to confirm availability or discuss a product you cannot find before submitting your order.",
  },
  {
    slug: "beverages",
    category: "Beverages",
    title: "Wholesale Beverages in Newfoundland",
    heading: "Wholesale beverages for Newfoundland businesses.",
    description: "Find water, soft drinks, energy drinks and drink mixes in Brown Derby's wholesale beverage catalog in Grand Falls-Windsor, Newfoundland.",
    intro: "Browse drinks for retail shelves, counters and workplace refreshment needs. Brown Derby's beverage catalog brings together water, soft drinks, energy drinks and drink mixes, with product sizes to browse before you sign in to see wholesale prices and order.",
    buyingHeading: "Compare drink formats before ordering.",
    buyingAdvice: "Check each product description for container size and pack quantity so your order matches the space and demand at your business. Search for an existing item number to find a regular purchase quickly. Our Grand Falls-Windsor team can help Central Newfoundland customers with questions about beverage availability and ordering.",
  },
  {
    slug: "candy-chocolate",
    category: "Candy & Chocolate",
    title: "Wholesale Candy & Chocolate in Newfoundland",
    heading: "Wholesale candy and chocolate in Newfoundland.",
    description: "Browse chocolate bars, candy, gum and confectionery from Brown Derby Wholesale in Grand Falls-Windsor for Central Newfoundland businesses.",
    intro: "Explore Brown Derby's range of chocolate bars, candy, gum and novelty sweets for business customers. The confectionery catalog includes individual product names, item numbers, pack information to help you compare lines for your shelves or counter. Sign in to see prices.",
    buyingHeading: "Build a confectionery range that fits your counter.",
    buyingAdvice: "Compare pack sizes and flavours in the descriptions, and use item numbers to reorder the same line. Packaged savoury snacks have their own catalog category if you are planning a wider counter selection. Contact our Grand Falls-Windsor team for help with a particular confectionery item or to discuss becoming a Brown Derby customer.",
  },
  {
    slug: "snacks",
    category: "Snacks",
    title: "Wholesale Snacks in Newfoundland",
    heading: "Wholesale snacks for Newfoundland businesses.",
    description: "Browse packaged snacks, chips, crackers, cookies and nuts from Brown Derby Wholesale, serving Central Newfoundland from Grand Falls-Windsor.",
    intro: "Find packaged snack foods for your business in Brown Derby's published catalog. Browse chips, crackers, cookies, nuts and other snack lines alongside their item numbers, pack descriptions. Sign in to see wholesale pricing. Candy and chocolate are available in a separate confectionery category.",
    buyingHeading: "Choose snack packs for your business.",
    buyingAdvice: "Product descriptions help you compare flavours, portion sizes and case quantities before building your order. Search by name or item number to locate a familiar snack, then sign in to save quantities to your current order. Our Grand Falls-Windsor team can answer questions about products and availability for Central Newfoundland business customers.",
  },
  {
    slug: "packaging-disposables",
    category: "Packaging & Disposables",
    title: "Wholesale Packaging & Disposables in Newfoundland",
    heading: "Wholesale packaging and disposables in Newfoundland.",
    description: "Find wholesale cups, containers, bags, takeout packaging and disposable serviceware at Brown Derby in Grand Falls-Windsor, Newfoundland.",
    intro: "Browse packaging for food service, takeout and everyday business use. Brown Derby's packaging and disposables catalog includes bags, cups, containers and disposable serviceware, with item descriptions and pack quantities to help you plan your supplies.",
    buyingHeading: "Match packaging sizes and quantities.",
    buyingAdvice: "Check capacity, dimensions and pack quantities in the product descriptions. Cups, lids and containers may be listed separately, so contact our team to confirm compatible items when needed. From our Grand Falls-Windsor location, we help Central Newfoundland businesses find the packaging they need for their day-to-day service.",
  },
  {
    slug: "cleaning-janitorial",
    category: "Cleaning & Janitorial",
    title: "Wholesale Cleaning & Janitorial Supplies in Newfoundland",
    heading: "Wholesale cleaning and janitorial supplies in Newfoundland.",
    description: "Browse cleaning products, paper supplies and janitorial essentials from Brown Derby Wholesale in Grand Falls-Windsor, Central Newfoundland.",
    intro: "Bring routine workplace cleaning supplies into your wholesale order. Brown Derby's cleaning and janitorial range includes cleaning products, paper supplies and sanitation essentials for businesses, with product descriptions available in the list below. Sign in to see wholesale pricing.",
    buyingHeading: "Check the product for the job.",
    buyingAdvice: "Compare product names, container sizes and pack quantities when planning your cleaning supplies. Follow the manufacturer's label for intended use, dilution and handling instructions. For help locating a particular supply or confirming availability, contact Brown Derby's team at 22 Hardy Avenue in Grand Falls-Windsor.",
  },
  {
    slug: "baking-foodservice-ingredients",
    category: "Baking & Foodservice Ingredients",
    title: "Wholesale Baking & Foodservice Ingredients in Newfoundland",
    heading: "Wholesale baking and foodservice ingredients in Newfoundland.",
    description: "Browse baking mixes, syrups, toppings and bulk ingredients from Brown Derby Wholesale in Grand Falls-Windsor for Central Newfoundland kitchens.",
    intro: "Explore ingredients for business kitchens and baking needs through Brown Derby's wholesale catalog. This range includes baking mixes, toppings, syrups and bulk ingredients, listed with product names, item numbers and pack descriptions for straightforward ordering.",
    buyingHeading: "Plan ingredients around your kitchen's needs.",
    buyingAdvice: "Compare pack weights and quantities in the descriptions before placing an order. Check manufacturer information for ingredients and allergens rather than relying on the abbreviated catalog name. Browse food and grocery for additional pantry staples, or contact our Grand Falls-Windsor team for help finding a specific ingredient.",
  },
  {
    slug: "restaurant-equipment-smallwares",
    category: "Restaurant Equipment & Smallwares",
    title: "Wholesale Restaurant Supplies & Smallwares in Newfoundland",
    heading: "Restaurant supplies and smallwares in Newfoundland.",
    description: "Find kitchen tools, utensils and restaurant smallwares from Brown Derby Wholesale, serving Central Newfoundland from Grand Falls-Windsor.",
    intro: "Browse Brown Derby's restaurant equipment and smallwares range for kitchen and service needs. The catalog includes kitchen tools, utensils, containers and foodservice supplies, with item numbers and product descriptions to help you find the right line for your business.",
    buyingHeading: "Check specifications before choosing smallwares.",
    buyingAdvice: "Use the descriptions to compare sizes and pack quantities, and ask our team for details when a specification is unclear. Packaging and disposables are listed separately for takeout and service supplies. Brown Derby supports business customers from Grand Falls-Windsor with practical help choosing and ordering wholesale products.",
  },
];

export function getCategoryLandingPage(slug: string) {
  return categoryLandingPages.find((category) => category.slug === slug);
}
