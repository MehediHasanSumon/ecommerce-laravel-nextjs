// ─── Product Types ─────────────────────────────────────────────────────────────
export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  longDescription?: string;
  price: number;
  originalPrice?: number;
  discount?: number;
  category: string;
  categorySlug: string;
  brand: string;
  brandSlug: string;
  images: string[];
  thumbnail: string;
  rating: number;
  reviewCount: number;
  stock: number;
  sku: string;
  tags: string[];
  badge?: 'new' | 'sale' | 'hot' | 'limited' | 'bestseller';
  features?: string[];
  specifications?: Record<string, string>;
  colors?: ProductVariant[];
  sizes?: string[];
  isFeatured?: boolean;
  isNew?: boolean;
  isBestSeller?: boolean;
  isFlashSale?: boolean;
  flashSaleEndsAt?: string;
  freeShipping?: boolean;
  requiresVariantSelection?: boolean;
  primaryVariantId?: number | null;
  createdAt: string;
}

export interface ProductVariant {
  name: string;
  value: string;
  hex?: string;
}

// ─── Category Types ─────────────────────────────────────────────────────────────
export interface Category {
  id: string;
  slug: string;
  name: string;
  description: string;
  image: string;
  icon?: string;
  productCount: number;
  featured?: boolean;
  children?: SubCategory[];
}

export interface SubCategory {
  id: string;
  slug: string;
  name: string;
  productCount: number;
}

// ─── Brand Types ─────────────────────────────────────────────────────────────
export interface Brand {
  id: string;
  slug: string;
  name: string;
  description: string;
  logo: string;
  coverImage: string;
  productCount: number;
  featured?: boolean;
  website?: string;
}

// ─── Cart Types ─────────────────────────────────────────────────────────────
export interface CartItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  variantId?: string | null;
  unitPrice?: number;
  discountedPrice?: number | null;
  subtotal?: number;
  discountTotal?: number;
  selectedVariant?: string | null;
  selectedColor?: string;
  selectedSize?: string;
  selectedAttributes?: Array<{ name: string; value: string; label?: string | null }>;
  selectedOptions?: Record<string, unknown>;
  selectedSku?: string | null;
  selectedImage?: string | null;
  availability?: {
    inStock: boolean;
    stock: number;
    status?: string | null;
  };
}

export interface Cart {
  items: CartItem[];
  couponCode?: string;
  coupon?: {
    code: string;
    name?: string | null;
    discount: number;
    freeShipping: boolean;
    shippingDiscount: number;
  } | null;
  notice?: {
    message: string;
    type: 'success' | 'info';
    removed?: boolean;
    changed?: boolean;
  } | null;
  discount?: number;
  summary?: {
    subtotal: number;
    itemDiscount?: number;
    couponDiscount?: number;
    discount: number;
    estimatedTax: number;
    shippingOriginal?: number;
    shippingDiscount?: number;
    shipping: number;
    total: number;
  };
}

// ─── Wishlist Types ─────────────────────────────────────────────────────────────
export interface WishlistItem {
  id: string;
  productId: string;
  product: Product;
  addedAt: string;
  discountedPrice?: number | null;
  stockStatus?: string;
}

// ─── User & Auth Types ─────────────────────────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  phone?: string;
  avatar?: string;
  role: 'user' | 'admin';
  createdAt: string;
  addresses: Address[];
  preferences?: UserPreferences;
}

export interface UserPreferences {
  newsletter: boolean;
  smsNotifications: boolean;
  orderUpdates: boolean;
  promotions: boolean;
}

export interface Address {
  id: string;
  label: string;
  fullName: string;
  phone: string;
  street: string;
  city: string;
  state: string;
  country: string;
  zip: string;
  isDefault?: boolean;
}

// ─── Order Types ─────────────────────────────────────────────────────────────
export interface Order {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  shipping: number;
  tax: number;
  discount: number;
  total: number;
  shippingAddress: Address;
  paymentMethod: string;
  trackingNumber?: string;
  estimatedDelivery?: string;
  createdAt: string;
  updatedAt: string;
  timeline: OrderTimeline[];
}

export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled'
  | 'refunded';

export interface OrderItem {
  id: string;
  productId: string;
  product: Product;
  quantity: number;
  price: number;
  selectedColor?: string;
  selectedSize?: string;
}

export interface OrderTimeline {
  status: OrderStatus;
  label: string;
  date: string;
  completed: boolean;
}

// ─── Review Types ─────────────────────────────────────────────────────────────
export interface Review {
  id: string;
  productId: string;
  userId: string;
  user: Pick<User, 'id' | 'name' | 'avatar'>;
  rating: number;
  title: string;
  comment: string;
  images?: string[];
  helpful: number;
  verified: boolean;
  createdAt: string;
}

// ─── Blog Types ─────────────────────────────────────────────────────────────
export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  coverImage: string;
  author: Pick<User, 'id' | 'name' | 'avatar'>;
  category: string;
  tags: string[];
  readTime: number;
  publishedAt: string;
}

// ─── Notification Types ─────────────────────────────────────────────────────
export interface Notification {
  id: string;
  type: 'order' | 'promo' | 'system' | 'review';
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  link?: string;
}

// ─── UI Types ─────────────────────────────────────────────────────────────
export type SortOption = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'rating' | 'popularity';

export interface FilterState {
  category?: string;
  brand?: string;
  minPrice?: number;
  maxPrice?: number;
  rating?: number;
  inStock?: boolean;
  onSale?: boolean;
  tags?: string[];
  sort: SortOption;
}

export interface PaginationMeta {
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
  success: boolean;
}
