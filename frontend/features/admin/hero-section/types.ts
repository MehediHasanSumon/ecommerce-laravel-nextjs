export type HeroMode = "simple" | "advanced";
export type HeroDevice = "desktop" | "tablet" | "mobile";
export type HeroElementType = "heading" | "subheading" | "paragraph" | "button" | "image" | "shape";

export type HeroSettings = {
  enabled: boolean;
  mode: HeroMode;
  slider_autoplay: boolean;
  autoplay_delay: number;
  infinite_loop: boolean;
  show_navigation: boolean;
  show_pagination: boolean;
  swipe_support: boolean;
  pause_on_hover: boolean;
  lazy_load_images: boolean;
};

export type HeroElementBox = {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
};

export type HeroSlideElement = {
  id?: number;
  type: HeroElementType;
  name: string;
  content: Record<string, string>;
  style: Record<string, string | number>;
  responsive: Record<HeroDevice, HeroElementBox>;
  z_index: number;
  locked: boolean;
  hidden: boolean;
};

export type HeroSlide = {
  id?: number;
  name: string;
  background_image: string;
  mobile_image: string;
  title: string;
  subtitle: string;
  description: string;
  primary_button_text: string;
  primary_button_url: string;
  secondary_button_text: string;
  secondary_button_url: string;
  text_alignment: "left" | "center" | "right";
  overlay: boolean;
  overlay_opacity: number;
  background_color: string;
  background_gradient: string;
  background_overlay: boolean;
  canvas_overlay_opacity: number;
  canvas_size: Record<HeroDevice, { width: number; height: number }>;
  status: boolean;
  sort_order: number;
  elements: HeroSlideElement[];
};

export type HeroSectionPayload = {
  settings: HeroSettings;
  slides: HeroSlide[];
};

export const defaultHeroSettings: HeroSettings = {
  enabled: true,
  mode: "simple",
  slider_autoplay: true,
  autoplay_delay: 6000,
  infinite_loop: true,
  show_navigation: true,
  show_pagination: true,
  swipe_support: true,
  pause_on_hover: true,
  lazy_load_images: true,
};

export function createBlankSlide(sortOrder = 0): HeroSlide {
  return {
    name: `Hero Slide ${sortOrder + 1}`,
    background_image: "",
    mobile_image: "",
    title: "",
    subtitle: "",
    description: "",
    primary_button_text: "",
    primary_button_url: "",
    secondary_button_text: "",
    secondary_button_url: "",
    text_alignment: "left",
    overlay: true,
    overlay_opacity: 80,
    background_color: "#0f172a",
    background_gradient: "",
    background_overlay: true,
    canvas_overlay_opacity: 40,
    canvas_size: {
      desktop: { width: 1280, height: 620 },
      tablet: { width: 768, height: 560 },
      mobile: { width: 390, height: 480 },
    },
    status: true,
    sort_order: sortOrder,
    elements: [],
  };
}

export function createElement(type: HeroElementType, index: number): HeroSlideElement {
  const baseBox = { x: 80 + index * 12, y: 90 + index * 12, width: 280, height: 72 };
  const content: Record<string, string> =
    type === "button" ? { text: "Shop Now", url: "/shop", target: "_self" } :
    type === "image" ? { src: "", alt: "Hero image" } :
    type === "shape" ? { shape: "rectangle" } :
    { text: type === "heading" ? "New Hero Heading" : type === "subheading" ? "Subheading" : "Paragraph text" };

  return {
    type,
    name: `${type.charAt(0).toUpperCase()}${type.slice(1)} ${index + 1}`,
    content,
    style: {
      fontFamily: "Inter, sans-serif",
      fontSize: type === "heading" ? 56 : type === "subheading" ? 22 : 16,
      fontWeight: type === "heading" ? 800 : 600,
      color: "#ffffff",
      backgroundColor: type === "button" ? "#ffffff" : type === "shape" ? "#ffffff" : "transparent",
      textColor: type === "button" ? "#0f172a" : "#ffffff",
      borderRadius: type === "button" ? 12 : 0,
      opacity: 1,
      lineHeight: 1.15,
      letterSpacing: 0,
      textAlign: "left",
      padding: type === "button" ? "12px 22px" : "0",
      border: "0 solid transparent",
      boxShadow: "",
    },
    responsive: {
      desktop: baseBox,
      tablet: { ...baseBox, x: 56, y: 88, width: Math.min(baseBox.width, 420) },
      mobile: { ...baseBox, x: 24, y: 80, width: 300 },
    },
    z_index: index + 1,
    locked: false,
    hidden: false,
  };
}
