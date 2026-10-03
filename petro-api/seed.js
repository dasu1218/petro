import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const categories = [
  { name: 'Skin Care', slug: 'skin-care', description: 'Soothing care for sensitive skin and healthy coat maintenance.' },
  { name: 'Digestion', slug: 'digestion', description: 'Daily support for gut health and a comfortable routine.' },
  { name: 'Flea & Tick', slug: 'flea-tick', description: 'Protection against parasites and seasonal irritants.' },
  { name: 'Nutrition', slug: 'nutrition', description: 'Balanced nutrition for normal energy, coats, and immunity.' },
  { name: 'Bundles', slug: 'bundles', description: 'Curated sets that simplify pet care routines.' },
];

const products = [
  {
    name: 'Petal Cleanse Shampoo',
    slug: 'petal-cleanse-shampoo',
    description: 'Gentle medicated shampoo for sensitive skin and irritated coats.',
    category: 'skin-care',
    images: [{ url: 'https://images.example.com/shampoo-1.jpg', publicId: 'petro-shampoo-1' }],
    variants: [
      { label: '250ml', price: 2450, stock: 40 },
      { label: '500ml', price: 3950, stock: 24 },
    ],
    badges: ['Vet Formulated', 'Sulfate-Free'],
    rating: 4.8,
    numReviews: 134,
    isFeatured: true,
  },
  {
    name: 'Omega Bites Plus',
    slug: 'omega-bites-plus',
    description: 'Daily omega-rich nutrition for shiny coats and joint support.',
    category: 'nutrition',
    images: [{ url: 'https://images.example.com/bites-1.jpg', publicId: 'petro-bites-1' }],
    variants: [
      { label: '300g', price: 3180, stock: 18 },
      { label: '600g', price: 5600, stock: 12 },
    ],
    badges: ['Best Seller', 'Fish Oil'],
    rating: 4.9,
    numReviews: 204,
    isFeatured: true,
  },
  {
    name: 'Calm Coat Tonic',
    slug: 'calm-coat-tonic',
    description: 'Soothing herbal tonic that supports coat health and calm routines.',
    category: 'digestion',
    images: [{ url: 'https://images.example.com/tonic-1.jpg', publicId: 'petro-tonic-1' }],
    variants: [
      { label: '120ml', price: 2980, stock: 28 },
      { label: '240ml', price: 4890, stock: 16 },
    ],
    badges: ['New', 'Organic'],
    rating: 4.7,
    numReviews: 81,
    isFeatured: false,
  },
  {
    name: 'PawGuard Flea Shield',
    slug: 'pawguard-flea-shield',
    description: 'Protective flea and tick care with a gentle, residue-safe finish.',
    category: 'flea-tick',
    images: [{ url: 'https://images.example.com/flea-1.jpg', publicId: 'petro-flea-1' }],
    variants: [
      { label: '250ml', price: 3280, stock: 22 },
      { label: '500ml', price: 5890, stock: 13 },
    ],
    badges: ['Tick Defense', 'Vet Approved'],
    rating: 4.6,
    numReviews: 112,
    isFeatured: true,
  },
  {
    name: 'Puppy Starter Kit',
    slug: 'puppy-starter-kit',
    description: 'A complete wellness bundle for puppies during first weeks at home.',
    category: 'bundles',
    images: [{ url: 'https://images.example.com/bundle-1.jpg', publicId: 'petro-bundle-1' }],
    variants: [{ label: 'Starter Set', price: 6990, stock: 10 }],
    badges: ['Bundle Deal', 'Beginner Friendly'],
    rating: 4.9,
    numReviews: 96,
    isFeatured: true,
  },
  {
    name: 'Gentle Gut Probiotic',
    slug: 'gentle-gut-probiotic',
    description: 'Digestive support with daily probiotic strains to ease tummy ups and downs.',
    category: 'digestion',
    images: [{ url: 'https://images.example.com/gut-1.jpg', publicId: 'petro-gut-1' }],
    variants: [
      { label: '90 caps', price: 2890, stock: 17 },
      { label: '180 caps', price: 4990, stock: 11 },
    ],
    badges: ['Digestive Care', 'Daily Use'],
    rating: 4.8,
    numReviews: 87,
    isFeatured: false,
  },
  {
    name: 'Coat Renewal Drops',
    slug: 'coat-renewal-drops',
    description: 'Nourishing oil drops for dull coats and softer, healthier fur.',
    category: 'skin-care',
    images: [{ url: 'https://images.example.com/coat-1.jpg', publicId: 'petro-coat-1' }],
    variants: [
      { label: '100ml', price: 3540, stock: 20 },
      { label: '200ml', price: 6190, stock: 8 },
    ],
    badges: ['Silky Finish', 'For Dry Coats'],
    rating: 4.7,
    numReviews: 72,
    isFeatured: false,
  },
  {
    name: 'Immunity Boost Bites',
    slug: 'immunity-boost-bites',
    description: 'Immune-supporting chews with zinc, mushrooms, and antioxidants.',
    category: 'nutrition',
    images: [{ url: 'https://images.example.com/immunity-1.jpg', publicId: 'petro-immunity-1' }],
    variants: [
      { label: '250g', price: 3490, stock: 15 },
      { label: '500g', price: 6290, stock: 10 },
    ],
    badges: ['Immune Support', 'Daily Boost'],
    rating: 4.9,
    numReviews: 158,
    isFeatured: true,
  },
];

const seedData = {
  categories,
  products,
};

const outputDir = path.resolve(process.cwd());
const outputFile = path.join(outputDir, 'seed-data.json');

const saveSeedData = async () => {
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputFile, JSON.stringify(seedData, null, 2));
  console.log(`Seed data saved to ${outputFile}`);
};

const tryMongoSeed = async () => {
  try {
    const { default: mongoose } = await import('mongoose');

    if (!process.env.MONGO_URI) {
      console.log('No MONGO_URI found. Using local seed file fallback.');
      return false;
    }

    await mongoose.connect(process.env.MONGO_URI);

    const Category = mongoose.models.Category || mongoose.model('Category', new mongoose.Schema({
      name: String,
      slug: String,
      description: String,
    }, { timestamps: true }));

    const Product = mongoose.models.Product || mongoose.model('Product', new mongoose.Schema({
      name: String,
      slug: String,
      description: String,
      category: String,
      images: Array,
      variants: Array,
      badges: Array,
      rating: Number,
      numReviews: Number,
      isFeatured: Boolean,
    }, { timestamps: true }));

    await Category.deleteMany({});
    await Product.deleteMany({});
    await Category.insertMany(categories);
    await Product.insertMany(products);

    console.log('MongoDB seed complete.');
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.log('Mongoose not available or MongoDB not connected. Local seed file created instead.');
    return false;
  }
};

const main = async () => {
  await saveSeedData();
  await tryMongoSeed();
};

await main();
