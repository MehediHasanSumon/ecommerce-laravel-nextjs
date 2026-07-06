export const APP_NAME = 'LuxeCart';
export const APP_DESCRIPTION = 'Premium Shopping Experience';
export const APP_URL = process.env.NEXT_PUBLIC_CREATE_APP_URL ?? 'http://localhost:4000';

export const CURRENCY = 'USD';
export const CURRENCY_SYMBOL = '$';

export const FREE_SHIPPING_THRESHOLD = 75;
export const TAX_RATE = 0.08;
export const SHIPPING_COST = 9.99;

export const PRODUCTS_PER_PAGE = 12;
export const REVIEWS_PER_PAGE = 5;
export const ORDERS_PER_PAGE = 10;

export const FLASH_SALE_DURATION_HOURS = 6;

export const NAV_LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Shop', href: '/shop' },
  { label: 'Categories', href: '/categories' },
  { label: 'Brands', href: '/brands' },
  { label: 'Deals', href: '/deals' },
  { label: 'Blog', href: '/blogs' },
];

export const ACCOUNT_NAV = [
  { label: 'Dashboard', href: '/account', icon: 'LayoutDashboard' },
  { label: 'My Orders', href: '/account/orders', icon: 'ShoppingBag' },
  { label: 'Wishlist', href: '/wishlist', icon: 'Heart' },
  { label: 'Profile', href: '/account/profile', icon: 'User' },
  { label: 'Addresses', href: '/account/addresses', icon: 'MapPin' },
  { label: 'Payment Methods', href: '/account/payment', icon: 'CreditCard' },
  { label: 'Notifications', href: '/account/notifications', icon: 'Bell' },
  { label: 'Reviews', href: '/account/reviews', icon: 'Star' },
  { label: 'Settings', href: '/account/settings', icon: 'Settings' },
];

export const FOOTER_LINKS = {
  company: [
    { label: 'About Us', href: '/about' },
    { label: 'Careers', href: '/careers' },
    { label: 'Press', href: '/press' },
    { label: 'Blog', href: '/blogs' },
    { label: 'Contact Us', href: '/contact' },
  ],
  support: [
    { label: 'FAQ', href: '/faq' },
    { label: 'Shipping Policy', href: '/shipping-policy' },
    { label: 'Return Policy', href: '/return-policy' },
    { label: 'Order Tracking', href: '/account/orders' },
    { label: 'Size Guide', href: '/size-guide' },
  ],
  legal: [
    { label: 'Terms & Conditions', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookie Policy', href: '/cookies' },
  ],
  shop: [
    { label: 'New Arrivals', href: '/new-arrivals' },
    { label: 'Best Sellers', href: '/best-sellers' },
    { label: 'Flash Sale', href: '/flash-sale' },
    { label: 'Gift Cards', href: '/gift-cards' },
    { label: 'Deals', href: '/deals' },
  ],
};

export const PAYMENT_METHODS = ['visa', 'mastercard', 'paypal', 'apple-pay', 'google-pay'];

export const SOCIAL_LINKS = {
  facebook: 'https://facebook.com',
  twitter: 'https://twitter.com',
  instagram: 'https://instagram.com',
  youtube: 'https://youtube.com',
  tiktok: 'https://tiktok.com',
};

export const SORT_OPTIONS = [
  { label: 'Newest', value: 'newest' },
  { label: 'Price: Low to High', value: 'price-asc' },
  { label: 'Price: High to Low', value: 'price-desc' },
  { label: 'Highest Rated', value: 'rating' },
  { label: 'Most Popular', value: 'popularity' },
];

export const RATING_OPTIONS = [5, 4, 3, 2, 1];

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pending',
  confirmed: 'Confirmed',
  processing: 'Processing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
  refunded: 'Refunded',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  pending: 'text-yellow-600 bg-yellow-50 dark:bg-yellow-900/20',
  confirmed: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  processing: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  shipped: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
  delivered: 'text-green-600 bg-green-50 dark:bg-green-900/20',
  cancelled: 'text-red-600 bg-red-50 dark:bg-red-900/20',
  refunded: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
};
