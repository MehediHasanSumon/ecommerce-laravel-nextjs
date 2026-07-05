import type { BlogPost } from '@/types';

export const MOCK_BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    slug: 'top-10-tech-gadgets-2025',
    title: 'Top 10 Tech Gadgets You Need in 2025',
    excerpt:
      'From spatial computing headsets to AI-powered earbuds, we roundup the must-have tech of the year.',
    content: 'Full article content here...',
    coverImage:
      'https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop',
    author: { id: 'u1', name: 'Alex Turner', avatar: 'https://i.pravatar.cc/150?img=12' },
    category: 'Technology',
    tags: ['gadgets', 'tech', '2025', 'review'],
    readTime: 8,
    publishedAt: '2025-06-10T09:00:00Z',
  },
  {
    id: '2',
    slug: 'sustainable-fashion-guide',
    title: 'The Ultimate Guide to Sustainable Fashion Shopping',
    excerpt:
      'How to build a conscious wardrobe without sacrificing style. Expert tips on brands, materials, and more.',
    content: 'Full article content here...',
    coverImage:
      'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop',
    author: { id: 'u2', name: 'Maya Johnson', avatar: 'https://i.pravatar.cc/150?img=5' },
    category: 'Fashion',
    tags: ['fashion', 'sustainable', 'eco-friendly', 'style'],
    readTime: 6,
    publishedAt: '2025-06-05T11:00:00Z',
  },
  {
    id: '3',
    slug: 'home-office-setup-guide',
    title: 'Build the Perfect Home Office Setup in 2025',
    excerpt:
      'Transform your workspace with these ergonomic essentials. Products and tips from productivity experts.',
    content: 'Full article content here...',
    coverImage:
      'https://images.unsplash.com/photo-1511467687858-23d96c32e4ae?w=800&auto=format&fit=crop',
    author: { id: 'u3', name: 'Ryan Park', avatar: 'https://i.pravatar.cc/150?img=7' },
    category: 'Productivity',
    tags: ['home-office', 'productivity', 'setup', 'ergonomics'],
    readTime: 10,
    publishedAt: '2025-05-28T08:30:00Z',
  },
  {
    id: '4',
    slug: 'running-gear-beginners',
    title: 'Best Running Gear for Beginners: Start Right in 2025',
    excerpt:
      'Everything you need to know about picking the right shoes, wearables, and accessories for your first run.',
    content: 'Full article content here...',
    coverImage:
      'https://images.unsplash.com/photo-1599447421416-3414500d18a5?w=800&auto=format&fit=crop',
    author: { id: 'u4', name: 'Lisa Chen', avatar: 'https://i.pravatar.cc/150?img=9' },
    category: 'Sports',
    tags: ['running', 'fitness', 'gear', 'beginners'],
    readTime: 7,
    publishedAt: '2025-05-20T10:00:00Z',
  },
  {
    id: '5',
    slug: 'coffee-brewing-guide',
    title: 'From Bean to Cup: The Complete Coffee Brewing Guide',
    excerpt:
      'Master the art of home brewing with our expert guide covering French press, pour-over, and espresso methods.',
    content: 'Full article content here...',
    coverImage:
      'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=800&auto=format&fit=crop',
    author: { id: 'u5', name: "James O'Brien", avatar: 'https://i.pravatar.cc/150?img=11' },
    category: 'Lifestyle',
    tags: ['coffee', 'brewing', 'kitchen', 'guide'],
    readTime: 9,
    publishedAt: '2025-05-15T12:00:00Z',
  },
  {
    id: '6',
    slug: 'wireless-audio-comparison',
    title: 'AirPods Pro vs Sony WH-1000XM5: Which Should You Buy?',
    excerpt:
      "We tested both flagship wireless audio products for 30 days. Here's our detailed comparison.",
    content: 'Full article content here...',
    coverImage:
      'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800&auto=format&fit=crop',
    author: { id: 'u6', name: 'Sarah Williams', avatar: 'https://i.pravatar.cc/150?img=1' },
    category: 'Technology',
    tags: ['audio', 'headphones', 'comparison', 'review'],
    readTime: 12,
    publishedAt: '2025-05-08T09:00:00Z',
  },
];
