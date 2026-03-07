/**
 * Realistic mock product database for Indian grocery items.
 * 50+ items across vegetables, fruits, dairy, grains, spices, and more.
 */

export interface MockProduct {
  name: string;
  brand?: string;
  price: number;
  mrp?: number;
  quantity: string;
  unit: string;
  category: string;
  available: boolean;
  searchTerms: string[];
}

export const MOCK_PRODUCTS: MockProduct[] = [
  // ============ VEGETABLES ============
  { name: 'Onion', brand: undefined, price: 35, mrp: 40, quantity: '1', unit: 'kg', category: 'vegetables', available: true, searchTerms: ['onion', 'pyaaz', 'pyaz'] },
  { name: 'Tomato (Hybrid)', brand: undefined, price: 40, mrp: 45, quantity: '1', unit: 'kg', category: 'vegetables', available: true, searchTerms: ['tomato', 'tamatar'] },
  { name: 'Potato', brand: undefined, price: 30, mrp: 35, quantity: '1', unit: 'kg', category: 'vegetables', available: true, searchTerms: ['potato', 'aloo', 'alu'] },
  { name: 'Green Chilli', brand: undefined, price: 10, mrp: 15, quantity: '100', unit: 'g', category: 'vegetables', available: true, searchTerms: ['green chilli', 'hari mirch', 'chilli'] },
  { name: 'Ginger', brand: undefined, price: 18, mrp: 20, quantity: '100', unit: 'g', category: 'vegetables', available: true, searchTerms: ['ginger', 'adrak'] },
  { name: 'Garlic', brand: undefined, price: 25, mrp: 30, quantity: '200', unit: 'g', category: 'vegetables', available: true, searchTerms: ['garlic', 'lehsun', 'lahsun'] },
  { name: 'Coriander Leaves', brand: undefined, price: 15, mrp: 15, quantity: '100', unit: 'g', category: 'vegetables', available: true, searchTerms: ['coriander', 'dhania', 'cilantro'] },
  { name: 'Spinach (Palak)', brand: undefined, price: 25, mrp: 30, quantity: '250', unit: 'g', category: 'vegetables', available: true, searchTerms: ['spinach', 'palak'] },
  { name: 'Capsicum (Green)', brand: undefined, price: 35, mrp: 40, quantity: '250', unit: 'g', category: 'vegetables', available: true, searchTerms: ['capsicum', 'shimla mirch', 'bell pepper'] },
  { name: 'Cauliflower (Gobi)', brand: undefined, price: 40, mrp: 45, quantity: '1', unit: 'pc', category: 'vegetables', available: true, searchTerms: ['cauliflower', 'gobi', 'phool gobi'] },
  { name: 'Cabbage', brand: undefined, price: 30, mrp: 35, quantity: '1', unit: 'pc', category: 'vegetables', available: true, searchTerms: ['cabbage', 'patta gobi', 'bandh gobi'] },
  { name: 'Carrot (Gajar)', brand: undefined, price: 45, mrp: 50, quantity: '500', unit: 'g', category: 'vegetables', available: true, searchTerms: ['carrot', 'gajar'] },
  { name: 'Beans (French)', brand: undefined, price: 55, mrp: 60, quantity: '250', unit: 'g', category: 'vegetables', available: true, searchTerms: ['beans', 'french beans', 'green beans'] },
  { name: 'Brinjal (Baingan)', brand: undefined, price: 35, mrp: 40, quantity: '500', unit: 'g', category: 'vegetables', available: true, searchTerms: ['brinjal', 'baingan', 'eggplant'] },
  { name: 'Lady Finger (Bhindi)', brand: undefined, price: 45, mrp: 50, quantity: '250', unit: 'g', category: 'vegetables', available: true, searchTerms: ['lady finger', 'bhindi', 'okra'] },
  { name: 'Cucumber (Kheera)', brand: undefined, price: 30, mrp: 35, quantity: '500', unit: 'g', category: 'vegetables', available: true, searchTerms: ['cucumber', 'kheera', 'kakdi'] },
  { name: 'Bitter Gourd (Karela)', brand: undefined, price: 40, mrp: 45, quantity: '250', unit: 'g', category: 'vegetables', available: false, searchTerms: ['bitter gourd', 'karela'] },
  { name: 'Bottle Gourd (Lauki)', brand: undefined, price: 35, mrp: 40, quantity: '1', unit: 'pc', category: 'vegetables', available: true, searchTerms: ['bottle gourd', 'lauki', 'ghiya', 'dudhi'] },

  // ============ FRUITS ============
  { name: 'Banana (Robusta)', brand: undefined, price: 45, mrp: 50, quantity: '6', unit: 'pcs', category: 'fruits', available: true, searchTerms: ['banana', 'kela'] },
  { name: 'Apple (Shimla)', brand: undefined, price: 180, mrp: 200, quantity: '1', unit: 'kg', category: 'fruits', available: true, searchTerms: ['apple', 'seb'] },
  { name: 'Mango (Alphonso)', brand: undefined, price: 350, mrp: 400, quantity: '1', unit: 'kg', category: 'fruits', available: false, searchTerms: ['mango', 'aam', 'alphonso'] },
  { name: 'Orange (Nagpur)', brand: undefined, price: 120, mrp: 140, quantity: '1', unit: 'kg', category: 'fruits', available: true, searchTerms: ['orange', 'santra', 'narangi'] },
  { name: 'Lemon (Nimbu)', brand: undefined, price: 30, mrp: 35, quantity: '4', unit: 'pcs', category: 'fruits', available: true, searchTerms: ['lemon', 'nimbu', 'lime'] },
  { name: 'Papaya', brand: undefined, price: 55, mrp: 60, quantity: '1', unit: 'pc', category: 'fruits', available: true, searchTerms: ['papaya', 'papita'] },
  { name: 'Pomegranate (Anar)', brand: undefined, price: 160, mrp: 180, quantity: '500', unit: 'g', category: 'fruits', available: true, searchTerms: ['pomegranate', 'anar'] },

  // ============ DAIRY ============
  { name: 'Amul Toned Milk', brand: 'Amul', price: 30, mrp: 30, quantity: '500', unit: 'ml', category: 'dairy', available: true, searchTerms: ['milk', 'doodh', 'toned milk'] },
  { name: 'Amul Full Cream Milk', brand: 'Amul', price: 35, mrp: 35, quantity: '500', unit: 'ml', category: 'dairy', available: true, searchTerms: ['full cream milk', 'whole milk'] },
  { name: 'Mother Dairy Curd', brand: 'Mother Dairy', price: 40, mrp: 42, quantity: '400', unit: 'g', category: 'dairy', available: true, searchTerms: ['curd', 'dahi', 'yogurt'] },
  { name: 'Amul Butter', brand: 'Amul', price: 58, mrp: 60, quantity: '100', unit: 'g', category: 'dairy', available: true, searchTerms: ['butter', 'makhan'] },
  { name: 'Amul Fresh Paneer', brand: 'Amul', price: 90, mrp: 95, quantity: '200', unit: 'g', category: 'dairy', available: true, searchTerms: ['paneer', 'cottage cheese'] },
  { name: 'Amul Ghee', brand: 'Amul', price: 280, mrp: 290, quantity: '500', unit: 'ml', category: 'dairy', available: true, searchTerms: ['ghee', 'clarified butter', 'desi ghee'] },
  { name: 'Mother Dairy Cheese Slices', brand: 'Mother Dairy', price: 105, mrp: 110, quantity: '200', unit: 'g', category: 'dairy', available: true, searchTerms: ['cheese', 'cheese slices'] },
  { name: 'Amul Cream', brand: 'Amul', price: 35, mrp: 38, quantity: '200', unit: 'ml', category: 'dairy', available: true, searchTerms: ['cream', 'fresh cream', 'malai'] },

  // ============ GRAINS & PULSES ============
  { name: 'India Gate Basmati Rice', brand: 'India Gate', price: 195, mrp: 210, quantity: '1', unit: 'kg', category: 'grains', available: true, searchTerms: ['basmati rice', 'chawal', 'rice'] },
  { name: 'Tata Sampann Toor Dal', brand: 'Tata Sampann', price: 165, mrp: 175, quantity: '1', unit: 'kg', category: 'grains', available: true, searchTerms: ['toor dal', 'arhar dal', 'dal'] },
  { name: 'Tata Sampann Moong Dal', brand: 'Tata Sampann', price: 155, mrp: 165, quantity: '1', unit: 'kg', category: 'grains', available: true, searchTerms: ['moong dal', 'mung dal'] },
  { name: 'Tata Sampann Chana Dal', brand: 'Tata Sampann', price: 125, mrp: 135, quantity: '1', unit: 'kg', category: 'grains', available: true, searchTerms: ['chana dal', 'gram dal'] },
  { name: 'Tata Sampann Masoor Dal', brand: 'Tata Sampann', price: 120, mrp: 130, quantity: '1', unit: 'kg', category: 'grains', available: true, searchTerms: ['masoor dal', 'red lentil', 'masoor'] },
  { name: 'Fortune Chakki Fresh Atta', brand: 'Fortune', price: 265, mrp: 280, quantity: '5', unit: 'kg', category: 'grains', available: true, searchTerms: ['atta', 'wheat flour', 'chakki atta'] },
  { name: 'Aashirvaad Select Atta', brand: 'Aashirvaad', price: 290, mrp: 305, quantity: '5', unit: 'kg', category: 'grains', available: true, searchTerms: ['aashirvaad atta', 'atta', 'wheat flour'] },
  { name: 'Rajma (Red Kidney Beans)', brand: 'Tata Sampann', price: 140, mrp: 150, quantity: '500', unit: 'g', category: 'grains', available: true, searchTerms: ['rajma', 'kidney beans'] },
  { name: 'Poha (Flattened Rice)', brand: undefined, price: 50, mrp: 55, quantity: '500', unit: 'g', category: 'grains', available: true, searchTerms: ['poha', 'flattened rice', 'chivda'] },
  { name: 'Sooji (Semolina)', brand: undefined, price: 45, mrp: 50, quantity: '500', unit: 'g', category: 'grains', available: true, searchTerms: ['sooji', 'semolina', 'rava', 'suji'] },
  { name: 'Besan (Gram Flour)', brand: undefined, price: 65, mrp: 70, quantity: '500', unit: 'g', category: 'grains', available: true, searchTerms: ['besan', 'gram flour', 'chickpea flour'] },

  // ============ SPICES & MASALAS ============
  { name: 'MDH Garam Masala', brand: 'MDH', price: 75, mrp: 82, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['garam masala', 'masala'] },
  { name: 'Everest Turmeric Powder', brand: 'Everest', price: 50, mrp: 55, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['turmeric', 'haldi', 'turmeric powder'] },
  { name: 'Everest Red Chilli Powder', brand: 'Everest', price: 60, mrp: 65, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['red chilli powder', 'lal mirch', 'chilli powder'] },
  { name: 'MDH Coriander Powder', brand: 'MDH', price: 48, mrp: 52, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['coriander powder', 'dhania powder'] },
  { name: 'Tata Sampann Cumin Seeds', brand: 'Tata Sampann', price: 90, mrp: 95, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['cumin', 'jeera', 'cumin seeds'] },
  { name: 'Tata Sampann Mustard Seeds', brand: 'Tata Sampann', price: 40, mrp: 45, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['mustard seeds', 'rai', 'sarson'] },
  { name: 'MDH Chaat Masala', brand: 'MDH', price: 55, mrp: 60, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['chaat masala', 'chat masala'] },
  { name: 'MDH Kitchen King Masala', brand: 'MDH', price: 85, mrp: 90, quantity: '100', unit: 'g', category: 'spices', available: true, searchTerms: ['kitchen king', 'kitchen king masala'] },

  // ============ OILS & COOKING ESSENTIALS ============
  { name: 'Fortune Sunflower Oil', brand: 'Fortune', price: 180, mrp: 195, quantity: '1', unit: 'L', category: 'oils', available: true, searchTerms: ['sunflower oil', 'cooking oil', 'oil'] },
  { name: 'Fortune Mustard Oil', brand: 'Fortune', price: 165, mrp: 175, quantity: '1', unit: 'L', category: 'oils', available: true, searchTerms: ['mustard oil', 'sarson ka tel'] },
  { name: 'Tata Salt', brand: 'Tata', price: 25, mrp: 25, quantity: '1', unit: 'kg', category: 'essentials', available: true, searchTerms: ['salt', 'namak', 'tata salt'] },
  { name: 'Tata Sugar', brand: 'Tata', price: 48, mrp: 50, quantity: '1', unit: 'kg', category: 'essentials', available: true, searchTerms: ['sugar', 'cheeni', 'shakkar'] },
  { name: 'Tata Tea Gold', brand: 'Tata', price: 220, mrp: 235, quantity: '500', unit: 'g', category: 'essentials', available: true, searchTerms: ['tea', 'chai', 'tea leaves'] },
  { name: 'Nescafe Classic Coffee', brand: 'Nescafe', price: 295, mrp: 310, quantity: '200', unit: 'g', category: 'essentials', available: true, searchTerms: ['coffee', 'nescafe', 'instant coffee'] },
  { name: 'MTR Sambar Powder', brand: 'MTR', price: 85, mrp: 90, quantity: '200', unit: 'g', category: 'spices', available: true, searchTerms: ['sambar powder', 'sambar masala'] },
  { name: 'MTR Rasam Powder', brand: 'MTR', price: 75, mrp: 80, quantity: '200', unit: 'g', category: 'spices', available: true, searchTerms: ['rasam powder', 'rasam masala'] },

  // ============ BREAD & BAKERY ============
  { name: 'Britannia Brown Bread', brand: 'Britannia', price: 45, mrp: 48, quantity: '400', unit: 'g', category: 'bakery', available: true, searchTerms: ['brown bread', 'bread', 'whole wheat bread'] },
  { name: 'Britannia White Bread', brand: 'Britannia', price: 35, mrp: 38, quantity: '400', unit: 'g', category: 'bakery', available: true, searchTerms: ['white bread', 'bread'] },

  // ============ INSTANT / PACKAGED ============
  { name: 'Maggi 2-Minute Noodles', brand: 'Maggi', price: 14, mrp: 14, quantity: '1', unit: 'pc', category: 'instant', available: true, searchTerms: ['maggi', 'noodles', 'instant noodles'] },
  { name: 'Saffola Oats', brand: 'Saffola', price: 120, mrp: 130, quantity: '500', unit: 'g', category: 'instant', available: true, searchTerms: ['oats', 'rolled oats'] },
];

/**
 * Search mock products by query. Matches against searchTerms.
 */
export function searchMockProducts(query: string, filters?: {
  brand?: string;
  maxPrice?: number;
  sortBy?: 'relevance' | 'price_low' | 'price_high';
}): MockProduct[] {
  const normalizedQuery = query.toLowerCase().trim();
  const queryTerms = normalizedQuery.split(/\s+/);

  let results = MOCK_PRODUCTS.filter((product) => {
    const matchesSearch = product.searchTerms.some((term) =>
      queryTerms.some((qt) => term.includes(qt) || qt.includes(term))
    ) || product.name.toLowerCase().includes(normalizedQuery);

    const matchesBrand = !filters?.brand ||
      product.brand?.toLowerCase().includes(filters.brand.toLowerCase());

    const matchesPrice = !filters?.maxPrice || product.price <= filters.maxPrice;

    return matchesSearch && matchesBrand && matchesPrice;
  });

  // Sort results
  if (filters?.sortBy === 'price_low') {
    results.sort((a, b) => a.price - b.price);
  } else if (filters?.sortBy === 'price_high') {
    results.sort((a, b) => b.price - a.price);
  }
  // Default: relevance (order by how early the match occurs in searchTerms)

  return results;
}

/**
 * Available mock offers
 */
export const MOCK_OFFERS = [
  {
    id: 'FLAT50',
    title: 'Flat Rs.50 Off',
    description: 'Get flat Rs.50 off on orders above Rs.499',
    code: 'MEALMATE50',
    minOrderValue: 499,
    discount: 50,
    maxDiscount: 50,
  },
  {
    id: 'FIRST100',
    title: 'First Order - Rs.100 Off',
    description: 'Get Rs.100 off on your first order above Rs.299',
    code: 'MMFIRST',
    minOrderValue: 299,
    discount: 100,
    maxDiscount: 100,
  },
  {
    id: 'SAVE10',
    title: '10% Off Groceries',
    description: 'Get 10% off up to Rs.150 on grocery orders',
    code: 'SAVE10',
    minOrderValue: 399,
    discount: 10,
    maxDiscount: 150,
  },
];
