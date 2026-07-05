import type { Brand } from '@/types';

export const MOCK_BRANDS: Brand[] = [
  {
    id: '1',
    slug: 'nike',
    name: 'Nike',
    description:
      "Just Do It. The world's leading athletic brand for footwear, apparel, and equipment.",
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/a6/Logo_NIKE.svg/320px-Logo_NIKE.svg.png',
    coverImage:
      'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1200&auto=format&fit=crop',
    productCount: 145,
    featured: true,
    website: 'https://nike.com',
  },
  {
    id: '2',
    slug: 'apple',
    name: 'Apple',
    description: 'Think Different. Premium consumer electronics, software, and services.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fa/Apple_logo_black.svg/160px-Apple_logo_black.svg.png',
    coverImage:
      'https://images.unsplash.com/photo-1546868871-7041f2a55e12?w=1200&auto=format&fit=crop',
    productCount: 78,
    featured: true,
    website: 'https://apple.com',
  },
  {
    id: '3',
    slug: 'sony',
    name: 'Sony',
    description: 'Make Believe. World-class consumer electronics and entertainment products.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/ca/Sony_logo.svg/320px-Sony_logo.svg.png',
    coverImage:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1200&auto=format&fit=crop',
    productCount: 93,
    featured: true,
    website: 'https://sony.com',
  },
  {
    id: '4',
    slug: 'adidas',
    name: 'Adidas',
    description: 'Impossible Is Nothing. Premium sportswear, footwear, and accessories.',
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Adidas_Logo.svg/320px-Adidas_Logo.svg.png',
    coverImage:
      'https://images.unsplash.com/photo-1608231387042-66d1773070a5?w=1200&auto=format&fit=crop',
    productCount: 112,
    featured: true,
    website: 'https://adidas.com',
  },
  {
    id: '5',
    slug: 'samsung',
    name: 'Samsung',
    description: "Do What You Can't. Pioneering technology and innovative electronics.",
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/24/Samsung_Logo.svg/320px-Samsung_Logo.svg.png',
    coverImage:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop',
    productCount: 167,
    featured: true,
    website: 'https://samsung.com',
  },
  {
    id: '6',
    slug: 'lululemon',
    name: 'Lululemon',
    description: 'Elevate the world by realizing the full potential in every one of us.',
    logo: 'https://upload.wikimedia.org/wikipedia/en/thumb/5/5a/Lululemon_Athletica_logo.svg/320px-Lululemon_Athletica_logo.svg.png',
    coverImage:
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=1200&auto=format&fit=crop',
    productCount: 56,
    featured: true,
    website: 'https://lululemon.com',
  },
  {
    id: '7',
    slug: 'lg',
    name: 'LG',
    description: "Life's Good. Innovation that makes life better, smarter, and more connected.",
    logo: 'https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/LG_symbol.svg/160px-LG_symbol.svg.png',
    coverImage:
      'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=1200&auto=format&fit=crop',
    productCount: 84,
    featured: false,
    website: 'https://lg.com',
  },
  {
    id: '8',
    slug: 'peak-design',
    name: 'Peak Design',
    description: 'Designed by photographers, adventurers, and minimalists for everyday carry.',
    logo: 'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=160&auto=format&fit=crop',
    coverImage:
      'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?w=1200&auto=format&fit=crop',
    productCount: 28,
    featured: false,
    website: 'https://peakdesign.com',
  },
];

export const FEATURED_BRANDS = MOCK_BRANDS.filter((b) => b.featured);
