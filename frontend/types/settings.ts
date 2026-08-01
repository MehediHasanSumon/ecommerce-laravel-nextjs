export type RuntimeNavigationItem = {
  label: string;
  href: string;
  icon?: string;
  module?: string;
  enabled?: boolean;
  permission?: string;
};

export type RuntimeNavigationGroup = {
  key: string;
  label: string;
  icon?: string;
  type: "single" | "group";
  items: RuntimeNavigationItem[];
};

export type RuntimeSocialLink = {
  platform: string;
  url: string;
  icon?: string;
  open_in_new_tab: boolean;
};

export type CategoryDisplayMode =
  | "landing_page"
  | "home_grid_navbar_dropdown"
  | "navbar_dropdown_only";

export type RuntimeCategoryDisplaySettings = {
  enable_home_category_section: boolean;
  category_display_mode: CategoryDisplayMode;
  categories_page_enabled: boolean;
  navbar_dropdown_enabled: boolean;
  home_category_variant: "landing_cards" | "icon_grid" | "hidden";
};

export type RuntimeCategory = {
  id: number;
  name: string;
  slug: string;
  description?: string | null;
  image_url?: string | null;
  icon?: string | null;
  product_count: number;
  show_on_home: boolean;
  show_in_navbar: boolean;
  home_display_order: number;
  navbar_display_order: number;
  children: RuntimeCategory[];
};

export type RuntimeCurrencySettings = {
  currency: string;
  currency_symbol: string;
  currency_position: "left" | "right";
  decimal_places: number;
  decimal_separator: string;
  thousands_separator: string;
};

export type RuntimeHomeFeatureCard = {
  id: number;
  icon: string;
  title: string;
  description: string;
  sort_order: number;
};

export type RuntimeBlogSettings = {
  enabled: boolean;
  layout: "grid" | "list";
  list_options: {
    enable_thumbnail: boolean;
    show_excerpt: boolean;
    show_author: boolean;
    show_published_date: boolean;
    show_reading_time: boolean;
  };
  show_on_home: boolean;
  home_limit: number;
  allow_comments: boolean;
  enable_related: boolean;
  enable_search: boolean;
  seo: {
    default_meta_title?: string | null;
    default_meta_description?: string | null;
    open_graph_image?: string | null;
    canonical_url?: string | null;
  };
};

export type RuntimeBrandSettings = {
  enabled: boolean;
  show_on_home: boolean;
};

export type RuntimeHomePageSettings = {
  product_section: {
    enabled: boolean;
    limit: number;
  };
  testimonial_section: {
    enabled: boolean;
  };
  announcement_bar: {
    enabled: boolean;
    text: string;
    link_text: string;
    link_url: string;
  };
};

export type RuntimePaymentMethod = {
  gateway: string;
  name: string;
  description?: string | null;
  logoUrl?: string | null;
  sandboxMode: boolean;
  sortOrder: number;
};

export type ProductCardStyle = "simple" | "hover" | "hover_review";
export type ProductLayout = "grid" | "swipe" | "list";

export type RuntimeProductCardSettings = {
  style: ProductCardStyle;
  layout: ProductLayout;
  slider: {
    loop: boolean;
    autoplay: boolean;
    autoplay_delay: number;
    transition_speed: number;
    pause_on_hover: boolean;
    mouse_drag: boolean;
    touch_swipe: boolean;
    navigation: boolean;
    pagination: boolean;
    desktop_slides: number;
    tablet_slides: number;
    mobile_slides: number;
    space_between: number;
    center_mode: boolean;
  };
};

export type RuntimeCustomerSettings = {
  allow_registration: boolean;
  allow_guest_checkout: boolean;
  require_login_before_checkout: boolean;
};

export type RuntimeSmsSettings = {
  enabled: boolean;
  require_guest_checkout_otp: boolean;
  require_registered_checkout_otp: boolean;
  otp_length: number;
  otp_expiration_minutes: number;
  otp_resend_cooldown_seconds: number;
};

export type RuntimeFeedbackSettings = {
  reviews: {
    enabled: boolean;
    access: "registered" | "everyone";
    moderated: boolean;
    editing_enabled: boolean;
    edit_time_limit_minutes: number;
  };
  comments: {
    enabled: boolean;
    access: "registered" | "everyone";
    moderated: boolean;
    editing_enabled: boolean;
    edit_time_limit_minutes: number;
  };
  guest_name_required: boolean;
  guest_email_required: boolean;
  verified_purchase_badge_enabled: boolean;
};

export type RuntimeFloatingContact = {
  enabled: boolean;
  messenger_url?: string | null;
  whatsapp_url?: string | null;
};

export type RuntimeMarketingTracking = {
  meta: {
    enabled: boolean;
    pixel_id?: string | null;
    browser_side_tracking: boolean;
    server_side_tracking: boolean;
    automatic_event_tracking: boolean;
    advanced_matching: boolean;
    debug_mode: boolean;
  };
  google: {
    enabled: boolean;
    measurement_id?: string | null;
    client_side_events: boolean;
    server_side_events: boolean;
    enhanced_ecommerce: boolean;
    debug_mode: boolean;
    anonymize_ip: boolean;
    respect_consent_mode: boolean;
  };
};

export type RuntimeSettings = {
  company_settings: Record<string, unknown>;
  website_settings: Record<string, unknown>;
  appearance_settings: {
    logo?: string | null;
    dark_logo?: string | null;
    favicon?: string | null;
    site_name?: string | null;
  };
  module_settings: Record<string, boolean>;
  feature_card_settings: {
    enabled: boolean;
  };
  home_page_settings: RuntimeHomePageSettings;
  blog_settings: RuntimeBlogSettings;
  brand_settings: RuntimeBrandSettings;
  category_display_settings: RuntimeCategoryDisplaySettings;
  theme_configuration: {
    currency?: string | null;
    currency_symbol?: string | null;
    currency_country?: string | null;
    currency_position?: string | null;
    decimal_places?: number | string | null;
    decimal_separator?: string | null;
    thousands_separator?: string | null;
    timezone?: string | null;
    date_format?: string | null;
    time_format?: string | null;
  };
  branding: {
    site_name?: string | null;
    company_name?: string | null;
    legal_company_name?: string | null;
    logo?: string | null;
    dark_logo?: string | null;
    favicon?: string | null;
    support_email?: string | null;
    support_phone?: string | null;
    company_phone?: string | null;
    address?: string | null;
  };
  navigation: {
    frontend: RuntimeNavigationItem[];
  };
  categories: RuntimeCategory[];
  home_feature_cards: RuntimeHomeFeatureCard[];
  payment_methods: RuntimePaymentMethod[];
  social_links: RuntimeSocialLink[];
  product_card_settings: RuntimeProductCardSettings;
  customer_settings: RuntimeCustomerSettings;
  sms_settings: RuntimeSmsSettings;
  feedback_settings: RuntimeFeedbackSettings;
  floating_contact: RuntimeFloatingContact;
  marketing_tracking: RuntimeMarketingTracking;
};
