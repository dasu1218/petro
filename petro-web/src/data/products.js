const products = [
  {
    slug: 'petal-cleanse-shampoo',
    name: 'Petal Cleanse Shampoo',
    description: 'Gentle medicated shampoo for sensitive skin and irritated coats.',
    category: 'Skin Care',
    accent: 'rose',
    packageType: 'bottle',
    badges: ['Vet Formulated', 'Sulfate-Free'],
    rating: 4.8,
    reviewCount: 134,
    variants: [
      { label: '250ml', price: 2450, stock: 40 },
      { label: '500ml', price: 3950, stock: 24 },
    ],
  },
  {
    slug: 'omega-bites-plus',
    name: 'Omega Bites Plus',
    description: 'Daily omega-rich nutrition for shiny coats and joint support.',
    category: 'Nutrition',
    accent: 'gold',
    packageType: 'pouch',
    badges: ['Best Seller', 'Fish Oil'],
    rating: 4.9,
    reviewCount: 204,
    variants: [
      { label: '300g', price: 3180, stock: 18 },
      { label: '600g', price: 5600, stock: 12 },
    ],
  },
  {
    slug: 'calm-coat-tonic',
    name: 'Calm Coat Tonic',
    description: 'Soothing herbal tonic that supports coat health and calm routines.',
    category: 'Skin Care',
    accent: 'teal',
    packageType: 'bottle',
    badges: ['New', 'Organic'],
    rating: 4.7,
    reviewCount: 81,
    variants: [
      { label: '120ml', price: 2980, stock: 28 },
      { label: '240ml', price: 4890, stock: 16 },
    ],
  },
]

export default products