import type { Review } from '@/types';

export const MOCK_REVIEWS: Review[] = [
  {
    id: '1',
    productId: '1',
    userId: 'u1',
    user: { id: 'u1', name: 'Sarah Johnson', avatar: 'https://i.pravatar.cc/150?img=1' },
    rating: 5,
    title: 'Absolutely love these sneakers!',
    comment:
      "I've been wearing these for 3 months now and they're still as comfortable as day one. The air cushioning is incredible for long walks and light runs. The color hasn't faded either. Highly recommend!",
    helpful: 124,
    verified: true,
    createdAt: '2025-05-15T10:00:00Z',
  },
  {
    id: '2',
    productId: '1',
    userId: 'u2',
    user: { id: 'u2', name: 'Marcus Chen', avatar: 'https://i.pravatar.cc/150?img=4' },
    rating: 4,
    title: 'Great fit, slightly narrow',
    comment:
      'Quality is top-notch as expected from Nike. I sized up half a size and they fit perfectly. The mesh upper is breathable which I love for summer. Only minor complaint is they run slightly narrow.',
    helpful: 67,
    verified: true,
    createdAt: '2025-04-22T14:30:00Z',
  },
  {
    id: '3',
    productId: '2',
    userId: 'u3',
    user: { id: 'u3', name: 'Emily Rodriguez', avatar: 'https://i.pravatar.cc/150?img=5' },
    rating: 5,
    title: "Best headphones I've ever owned",
    comment:
      'The noise cancellation is phenomenal. I use these on my daily commute and they completely block out the subway noise. Sound quality is rich and detailed. Battery life easily lasts my whole week.',
    helpful: 203,
    verified: true,
    createdAt: '2025-06-01T09:00:00Z',
  },
  {
    id: '4',
    productId: '2',
    userId: 'u4',
    user: { id: 'u4', name: 'David Park', avatar: 'https://i.pravatar.cc/150?img=7' },
    rating: 5,
    title: 'Worth every penny',
    comment:
      'These have completely replaced my studio monitors for casual listening. The spatial audio feature is mind-blowing when watching movies. Build quality feels premium and durable.',
    helpful: 156,
    verified: false,
    createdAt: '2025-05-28T16:00:00Z',
  },
  {
    id: '5',
    productId: '4',
    userId: 'u5',
    user: { id: 'u5', name: 'Aisha Williams', avatar: 'https://i.pravatar.cc/150?img=9' },
    rating: 5,
    title: 'The perfect smartwatch',
    comment:
      'I switched from my old Fitbit to this and the difference is night and day. The health tracking is incredibly accurate, ECG feature is fantastic, and the battery easily lasts all day with always-on display.',
    helpful: 89,
    verified: true,
    createdAt: '2025-06-10T11:00:00Z',
  },
  {
    id: '6',
    productId: '12',
    userId: 'u6',
    user: { id: 'u6', name: "James O'Brien", avatar: 'https://i.pravatar.cc/150?img=11' },
    rating: 5,
    title: 'Spatial audio changed everything',
    comment:
      "The ANC is excellent and the transparency mode is the most natural I've heard. Spatial audio for music is incredible. Battery life is as advertised. These are my go-to for gym sessions.",
    helpful: 312,
    verified: true,
    createdAt: '2025-06-05T08:30:00Z',
  },
];

export const HOMEPAGE_REVIEWS = [
  {
    id: 'hr1',
    user: {
      name: 'Sarah M.',
      avatar: 'https://i.pravatar.cc/150?img=1',
      location: 'New York, USA',
    },
    rating: 5,
    title: 'Exceptional quality and fast delivery!',
    comment:
      'Everything arrived perfectly packaged and exactly as described. The customer service team was incredibly helpful when I had a question about sizing. Will definitely be shopping here again!',
    productName: 'Air Max Pulse Sneakers',
    date: 'June 12, 2025',
  },
  {
    id: 'hr2',
    user: { name: 'Marcus R.', avatar: 'https://i.pravatar.cc/150?img=4', location: 'London, UK' },
    rating: 5,
    title: 'Best online shopping experience',
    comment:
      'The product quality exceeded my expectations. Shipping was super fast — arrived in 2 days. The return policy is also very customer-friendly. Already recommended to 5 friends!',
    productName: 'Pro Wireless Headphones X1',
    date: 'June 8, 2025',
  },
  {
    id: 'hr3',
    user: {
      name: 'Priya K.',
      avatar: 'https://i.pravatar.cc/150?img=9',
      location: 'Toronto, Canada',
    },
    rating: 5,
    title: 'Premium products at great prices',
    comment:
      'Found items here that were sold out everywhere else, and the price was better too. The site is easy to navigate and checkout was a breeze. Packaging was gorgeous and sustainable too!',
    productName: 'SmartWatch Series 8 Pro',
    date: 'June 3, 2025',
  },
];
