import type { Category } from '@/types';

export const MOCK_CATEGORIES: Category[] = [
  {
    id: '1',
    slug: 'electronics',
    name: 'Electronics',
    description: 'Cutting-edge gadgets and devices for the modern lifestyle.',
    image:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=600&auto=format&fit=crop',
    productCount: 342,
    featured: true,
    children: [
      { id: '1-1', slug: 'smartphones', name: 'Smartphones', productCount: 89 },
      { id: '1-2', slug: 'laptops', name: 'Laptops', productCount: 67 },
      { id: '1-3', slug: 'headphones', name: 'Headphones', productCount: 54 },
      { id: '1-4', slug: 'cameras', name: 'Cameras', productCount: 43 },
      { id: '1-5', slug: 'monitors', name: 'Monitors', productCount: 38 },
      { id: '1-6', slug: 'keyboards', name: 'Keyboards & Mice', productCount: 51 },
    ],
  },
  {
    id: '2',
    slug: 'footwear',
    name: 'Footwear',
    description: 'Step into style with our curated collection of premium footwear.',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=600&auto=format&fit=crop',
    productCount: 215,
    featured: true,
    children: [
      { id: '2-1', slug: 'sneakers', name: 'Sneakers', productCount: 98 },
      { id: '2-2', slug: 'boots', name: 'Boots', productCount: 47 },
      { id: '2-3', slug: 'sandals', name: 'Sandals', productCount: 34 },
      { id: '2-4', slug: 'formal', name: 'Formal Shoes', productCount: 36 },
    ],
  },
  {
    id: '3',
    slug: 'clothing',
    name: 'Clothing',
    description: 'Everyday essentials and premium fashion for every occasion.',
    image:
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=600&auto=format&fit=crop',
    productCount: 487,
    featured: true,
    children: [
      { id: '3-1', slug: 't-shirts', name: 'T-Shirts', productCount: 120 },
      { id: '3-2', slug: 'jackets', name: 'Jackets & Coats', productCount: 78 },
      { id: '3-3', slug: 'pants', name: 'Pants & Jeans', productCount: 95 },
      { id: '3-4', slug: 'dresses', name: 'Dresses', productCount: 84 },
      { id: '3-5', slug: 'activewear', name: 'Activewear', productCount: 110 },
    ],
  },
  {
    id: '4',
    slug: 'accessories',
    name: 'Accessories',
    description: 'Complete your look with our range of premium accessories.',
    image:
      'https://images.unsplash.com/photo-1627123424574-724758594e93?w=600&auto=format&fit=crop',
    productCount: 163,
    featured: true,
    children: [
      { id: '4-1', slug: 'wallets', name: 'Wallets', productCount: 38 },
      { id: '4-2', slug: 'watches', name: 'Watches', productCount: 52 },
      { id: '4-3', slug: 'sunglasses', name: 'Sunglasses', productCount: 43 },
      { id: '4-4', slug: 'belts', name: 'Belts', productCount: 30 },
    ],
  },
  {
    id: '5',
    slug: 'bags',
    name: 'Bags',
    description: 'Stylish and functional bags for work, travel, and everyday use.',
    image: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=600&auto=format&fit=crop',
    productCount: 132,
    featured: true,
    children: [
      { id: '5-1', slug: 'backpacks', name: 'Backpacks', productCount: 55 },
      { id: '5-2', slug: 'handbags', name: 'Handbags', productCount: 37 },
      { id: '5-3', slug: 'luggage', name: 'Luggage', productCount: 25 },
      { id: '5-4', slug: 'gym-bags', name: 'Gym Bags', productCount: 15 },
    ],
  },
  {
    id: '6',
    slug: 'sports',
    name: 'Sports & Fitness',
    description: 'Professional gear for athletes and fitness enthusiasts.',
    image:
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=600&auto=format&fit=crop',
    productCount: 278,
    featured: true,
    children: [
      { id: '6-1', slug: 'yoga', name: 'Yoga & Pilates', productCount: 67 },
      { id: '6-2', slug: 'running', name: 'Running', productCount: 89 },
      { id: '6-3', slug: 'gym-equipment', name: 'Gym Equipment', productCount: 77 },
      { id: '6-4', slug: 'outdoor', name: 'Outdoor Sports', productCount: 45 },
    ],
  },
  {
    id: '7',
    slug: 'home-kitchen',
    name: 'Home & Kitchen',
    description: 'Elevate your living space with premium home essentials.',
    image: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop',
    productCount: 324,
    featured: false,
    children: [
      { id: '7-1', slug: 'kitchen-appliances', name: 'Kitchen Appliances', productCount: 98 },
      { id: '7-2', slug: 'cookware', name: 'Cookware', productCount: 76 },
      { id: '7-3', slug: 'lighting', name: 'Lighting', productCount: 54 },
      { id: '7-4', slug: 'furniture', name: 'Furniture', productCount: 96 },
    ],
  },
  {
    id: '8',
    slug: 'beauty',
    name: 'Beauty & Personal Care',
    description: 'Luxury skincare, grooming, and wellness products.',
    image:
      'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&auto=format&fit=crop',
    productCount: 201,
    featured: false,
    children: [
      { id: '8-1', slug: 'skincare', name: 'Skincare', productCount: 88 },
      { id: '8-2', slug: 'haircare', name: 'Haircare', productCount: 56 },
      { id: '8-3', slug: 'fragrances', name: 'Fragrances', productCount: 32 },
      { id: '8-4', slug: 'grooming', name: 'Grooming', productCount: 25 },
    ],
  },
];

export const FEATURED_CATEGORIES = MOCK_CATEGORIES.filter((c) => c.featured);
