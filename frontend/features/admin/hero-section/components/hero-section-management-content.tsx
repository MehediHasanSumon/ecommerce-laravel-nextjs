"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent, ReactNode } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  ImageIcon,
  Layers3,
  Loader2,
  Lock,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Monitor,
  MousePointer2,
  Pencil,
  Plus,
  Redo2,
  Save,
  SendToBack,
  Smartphone,
  Square,
  Tablet,
  Trash2,
  Type,
  Undo2,
  Unlock,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  FormGrid,
  SettingsGrid,
  SettingsPageShell,
  SettingsSection,
  TextInput,
  TextareaInput,
  ToggleSwitch,
  ImageDropzone,
} from "@/features/admin/settings/components/settings-primitives";
import { heroSectionService } from "@/features/admin/hero-section/services/hero-section-service";
import { hasPermission } from "@/lib/permissions";
import { useAuthStore } from "@/store/auth-store";
import {
  createBlankSlide,
  createElement,
  defaultHeroSettings,
  type HeroDevice,
  type HeroElementBox,
  type HeroElementType,
  type HeroSettings,
  type HeroSlide,
  type HeroSlideElement,
} from "@/features/admin/hero-section/types";
import { toAppError } from "@/lib/errors";
import { cn } from "@/utils/cn";

const devices: Array<{ key: HeroDevice; icon: typeof Monitor; label: string }> = [
  { key: "desktop", icon: Monitor, label: "Desktop" },
  { key: "tablet", icon: Tablet, label: "Tablet" },
  { key: "mobile", icon: Smartphone, label: "Mobile" },
];

const shapeOptions = [
  "rectangle",
  "rounded-rectangle",
  "circle",
  "oval",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "octagon",
  "star",
  "arrow",
  "double-arrow",
  "line",
  "callout",
  "speech-bubble",
  "ribbon",
  "banner",
  "heart",
  "cloud",
  "lightning",
  "plus",
  "minus",
  "cross",
  "polygon",
] as const;

function offsetResponsive(responsive: HeroSlideElement["responsive"]): HeroSlideElement["responsive"] {
  return {
    desktop: { ...responsive.desktop, x: responsive.desktop.x + 24, y: responsive.desktop.y + 24 },
    tablet: { ...responsive.tablet, x: responsive.tablet.x + 20, y: responsive.tablet.y + 20 },
    mobile: { ...responsive.mobile, x: responsive.mobile.x + 16, y: responsive.mobile.y + 16 },
  };
}

function shapeClipPath(shape?: string) {
  switch (shape) {
    case "circle":
    case "oval":
      return "ellipse(50% 50% at 50% 50%)";
    case "triangle":
      return "polygon(50% 0%, 0% 100%, 100% 100%)";
    case "diamond":
      return "polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)";
    case "pentagon":
      return "polygon(50% 0%, 100% 38%, 82% 100%, 18% 100%, 0% 38%)";
    case "hexagon":
      return "polygon(25% 0%, 75% 0%, 100% 50%, 75% 100%, 25% 100%, 0% 50%)";
    case "octagon":
      return "polygon(30% 0%, 70% 0%, 100% 30%, 100% 70%, 70% 100%, 30% 100%, 0% 70%, 0% 30%)";
    case "star":
      return "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 92%, 50% 70%, 21% 92%, 32% 57%, 2% 35%, 39% 35%)";
    case "arrow":
      return "polygon(0% 35%, 60% 35%, 60% 15%, 100% 50%, 60% 85%, 60% 65%, 0% 65%)";
    case "double-arrow":
      return "polygon(0% 50%, 25% 15%, 25% 35%, 75% 35%, 75% 15%, 100% 50%, 75% 85%, 75% 65%, 25% 65%, 25% 85%)";
    case "heart":
      return "polygon(50% 90%, 8% 48%, 8% 22%, 28% 8%, 50% 28%, 72% 8%, 92% 22%, 92% 48%)";
    case "lightning":
      return "polygon(58% 0%, 18% 55%, 46% 55%, 35% 100%, 82% 38%, 54% 38%)";
    case "plus":
      return "polygon(35% 0%, 65% 0%, 65% 35%, 100% 35%, 100% 65%, 65% 65%, 65% 100%, 35% 100%, 35% 65%, 0% 65%, 0% 35%, 35% 35%)";
    case "minus":
      return "polygon(0% 35%, 100% 35%, 100% 65%, 0% 65%)";
    case "cross":
      return "polygon(20% 0%, 50% 30%, 80% 0%, 100% 20%, 70% 50%, 100% 80%, 80% 100%, 50% 70%, 20% 100%, 0% 80%, 30% 50%, 0% 20%)";
    default:
      return undefined;
  }
}

export function HeroSectionManagementContent() {
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_hero_section");
  const canEdit = hasPermission("can_edit_hero_section");
  const canDelete = hasPermission("can_delete_hero_section");
  const [settings, setSettings] = useState<HeroSettings>(defaultHeroSettings);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [draggedSlideIndex, setDraggedSlideIndex] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSlide, setSavingSlide] = useState(false);
  const [slidesPanelOpen, setSlidesPanelOpen] = useState(true);
  const [deleteSlideTarget, setDeleteSlideTarget] = useState<{ slide: HeroSlide; index: number } | null>(null);

  const activeSlide = slides[activeIndex] ?? null;

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const response = await heroSectionService.get();
      setSettings(response.data.settings);
      setSlides(response.data.slides.length ? response.data.slides : [createBlankSlide(0)]);
      setActiveIndex(0);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateSlideAt(index: number, updater: (slide: HeroSlide) => HeroSlide) {
    setSlides((current) => current.map((slide, itemIndex) => itemIndex === index ? updater(slide) : slide));
  }

  function createSlide() {
    if (!canCreate) return;
    setSlides((current) => {
      const next = [...current, createBlankSlide(current.length)];
      setActiveIndex(next.length - 1);
      return next;
    });
  }

  async function saveSettings() {
    if (!canEdit) return;
    try {
      setSavingSettings(true);
      const response = await heroSectionService.updateSettings(settings);
      setSettings(response.data.settings);
      toast.success(response.message);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSavingSettings(false);
    }
  }

  async function saveSlide() {
    if (!canEdit && !(canCreate && !activeSlide?.id)) return;
    if (!activeSlide) return;
    if (settings.mode === "simple" && !activeSlide.background_image.trim()) {
      toast.error("Background image is required for simple hero slides.");
      return;
    }

    try {
      setSavingSlide(true);
      const payload = { ...activeSlide, sort_order: activeIndex };
      const response = activeSlide.id
        ? await heroSectionService.updateSlide(activeSlide.id, payload)
        : await heroSectionService.createSlide(payload);
      updateSlideAt(activeIndex, () => response.data.item);
      toast.success(response.message);
    } catch (error) {
      toast.error(toAppError(error).message);
    } finally {
      setSavingSlide(false);
    }
  }

  async function duplicateSlide(slide: HeroSlide, index: number) {
    if (!canCreate) return;
    if (!slide.id) {
      setSlides((current) => {
        const copy = { ...slide, id: undefined, name: `${slide.name || "Hero Slide"} Copy`, sort_order: current.length, elements: slide.elements.map((element) => ({ ...element, id: undefined })) };
        return [...current, copy];
      });
      return;
    }
    try {
      const response = await heroSectionService.duplicateSlide(slide.id);
      setSlides((current) => [...current, response.data.item]);
      setActiveIndex(slides.length);
      toast.success(response.message);
    } catch (error) {
      toast.error(toAppError(error).message);
      setActiveIndex(index);
    }
  }

  async function deleteSlide(slide: HeroSlide, index: number) {
    if (!canDelete) return;
    if (!slide.id) {
      setSlides((current) => current.filter((_, itemIndex) => itemIndex !== index));
      setActiveIndex(Math.max(0, index - 1));
      setDeleteSlideTarget(null);
      return;
    }
    try {
      const response = await heroSectionService.deleteSlide(slide.id);
      setSlides((current) => current.filter((item) => item.id !== slide.id));
      setActiveIndex(Math.max(0, index - 1));
      setDeleteSlideTarget(null);
      toast.success(response.message);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function dropSlide(targetIndex: number) {
    if (!canEdit || draggedSlideIndex === null || draggedSlideIndex === targetIndex) return;

    const next = [...slides];
    const [dragged] = next.splice(draggedSlideIndex, 1);
    next.splice(targetIndex, 0, dragged);
    const ordered = next.map((slide, itemIndex) => ({ ...slide, sort_order: itemIndex }));
    const nextActiveIndex = activeSlide ? ordered.findIndex((slide) => slide === activeSlide || (slide.id && slide.id === activeSlide.id)) : targetIndex;

    setSlides(ordered);
    setActiveIndex(nextActiveIndex >= 0 ? nextActiveIndex : targetIndex);
    setDraggedSlideIndex(null);

    const persisted = ordered.filter((slide) => slide.id).map((slide) => ({ id: slide.id!, sort_order: slide.sort_order }));
    if (!persisted.length) return;

    try {
      await heroSectionService.reorderSlides(persisted);
    } catch (error) {
      toast.error(toAppError(error).message);
      void load();
    }
  }

  return (
    <SettingsPageShell
      title="Hero Section"
      description="Manage the home page hero with simple image slides or the advanced responsive canvas builder."
      icon={Layers3}
      actions={(
        <>
          {canCreate ? <Button type="button" variant="secondary" icon={<Plus className="h-4 w-4" />} onClick={createSlide}>Create Slide</Button> : null}
          {canEdit ? <Button type="button" icon={<Save className="h-4 w-4" />} isLoading={savingSettings} onClick={() => void saveSettings()}>Save Settings</Button> : null}
        </>
      )}
    >
      {loading ? (
        <div className="flex min-h-80 items-center justify-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Loading hero builder...
        </div>
      ) : (
        <SettingsGrid>
          <HeroGeneralSettings settings={settings} onChange={setSettings} />

          <div className={cn("grid gap-4", slidesPanelOpen ? "lg:grid-cols-[280px_minmax(0,1fr)]" : "lg:grid-cols-1")}>
            {slidesPanelOpen ? (
              <SettingsSection title="Slides" description="Create, duplicate, reorder, enable, or remove hero slides." icon={GripVertical}>
                <div className="mb-3 flex justify-end">
                  <Button type="button" size="sm" variant="secondary" icon={<PanelLeftClose className="h-4 w-4" />} onClick={() => setSlidesPanelOpen(false)}>Hide</Button>
                </div>
                <div className="space-y-2">
                  {slides.map((slide, index) => (
                    <button
                      key={slide.id ?? `draft-${index}`}
                      type="button"
                      draggable={canEdit}
                      onClick={() => setActiveIndex(index)}
                      onDragStart={(event) => {
                        setDraggedSlideIndex(index);
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", String(index));
                      }}
                      onDragOver={(event) => {
                        if (canEdit) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        event.preventDefault();
                        void dropSlide(index);
                      }}
                      onDragEnd={() => setDraggedSlideIndex(null)}
                      className={cn("flex w-full cursor-grab items-center gap-2 rounded-lg border p-2 text-left transition active:cursor-grabbing", index === activeIndex ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50", draggedSlideIndex === index && "opacity-60")}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold"><GripVertical className="h-4 w-4" /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-bold">{slide.name || slide.title || "Hero Slide"}</span>
                        <span className="text-xs text-muted-foreground">{slide.status ? "Enabled" : "Disabled"}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </SettingsSection>
            ) : null}

            {activeSlide ? (
              <SettingsSection
                title={settings.mode === "advanced" ? "Advanced Canvas Builder" : "Simple Slide Editor"}
                description={settings.mode === "advanced" ? "Design responsive hero slides with layers, drag, resize, and per-device positions." : "Use the current storefront hero design with dynamic slide content."}
                icon={settings.mode === "advanced" ? MousePointer2 : ImageIcon}
              >
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-2">
                    {!slidesPanelOpen ? <Button size="sm" variant="secondary" icon={<PanelLeftOpen className="h-4 w-4" />} onClick={() => setSlidesPanelOpen(true)}>Slides</Button> : null}
                    {canCreate ? <Button size="sm" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => void duplicateSlide(activeSlide, activeIndex)}>Duplicate</Button> : null}
                    {canDelete ? <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => setDeleteSlideTarget({ slide: activeSlide, index: activeIndex })}>Delete</Button> : null}
                  </div>
                  {canEdit || (canCreate && !activeSlide.id) ? <Button size="sm" icon={<Save className="h-4 w-4" />} isLoading={savingSlide} onClick={() => void saveSlide()}>Save Slide</Button> : null}
                </div>

                <SlideBasics slide={activeSlide} onChange={(next) => updateSlideAt(activeIndex, () => next)} />

                {settings.mode === "advanced" ? (
                  <CanvasBuilder slide={activeSlide} canEdit={canEdit} onChange={(next) => updateSlideAt(activeIndex, () => next)} />
                ) : (
                  <SimpleSlideFields slide={activeSlide} onChange={(next) => updateSlideAt(activeIndex, () => next)} />
                )}
              </SettingsSection>
            ) : null}
          </div>
        </SettingsGrid>
      )}
      <ConfirmActionModal
        open={Boolean(deleteSlideTarget)}
        title="Delete slide"
        description={`Delete "${deleteSlideTarget?.slide.name || "Hero Slide"}"? This action cannot be undone.`}
        confirmLabel="Delete Slide"
        onCancel={() => setDeleteSlideTarget(null)}
        onConfirm={() => deleteSlideTarget ? void deleteSlide(deleteSlideTarget.slide, deleteSlideTarget.index) : undefined}
      />
    </SettingsPageShell>
  );
}

function HeroGeneralSettings({ settings, onChange }: { settings: HeroSettings; onChange: (settings: HeroSettings) => void }) {
  return (
    <SettingsSection title="General Settings" description="These controls apply to both simple and advanced hero rendering." icon={Layers3}>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <ToggleSwitch label="Enable Hero Section" checked={settings.enabled} onChange={(enabled) => onChange({ ...settings, enabled })} />
        <ToggleSwitch label="Slider Autoplay" checked={settings.slider_autoplay} onChange={(slider_autoplay) => onChange({ ...settings, slider_autoplay })} />
        <ToggleSwitch label="Infinite Loop" checked={settings.infinite_loop} onChange={(infinite_loop) => onChange({ ...settings, infinite_loop })} />
        <ToggleSwitch label="Show Navigation" checked={settings.show_navigation} onChange={(show_navigation) => onChange({ ...settings, show_navigation })} />
        <ToggleSwitch label="Show Pagination" checked={settings.show_pagination} onChange={(show_pagination) => onChange({ ...settings, show_pagination })} />
        <ToggleSwitch label="Keyboard Navigation" checked={settings.keyboard_navigation} onChange={(keyboard_navigation) => onChange({ ...settings, keyboard_navigation })} />
        <ToggleSwitch label="Swipe Support" checked={settings.swipe_support} onChange={(swipe_support) => onChange({ ...settings, swipe_support })} />
        <ToggleSwitch label="Pause on Hover" checked={settings.pause_on_hover} onChange={(pause_on_hover) => onChange({ ...settings, pause_on_hover })} />
        <ToggleSwitch label="Lazy Load Images" checked={settings.lazy_load_images} onChange={(lazy_load_images) => onChange({ ...settings, lazy_load_images })} />
      </div>
      <FormGrid>
        <label className="mt-3 space-y-2">
          <span className="text-sm font-semibold">Hero Mode</span>
          <Select value={settings.mode} onValueChange={(mode) => onChange({ ...settings, mode: mode as HeroSettings["mode"] })}>
            <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="simple">Simple Mode</SelectItem>
              <SelectItem value="advanced">Advanced Canvas Mode</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <label className="mt-3 space-y-2">
          <span className="text-sm font-semibold">Transition Effect</span>
          <Select value={settings.transition_effect} onValueChange={(transition_effect) => onChange({ ...settings, transition_effect: transition_effect as HeroSettings["transition_effect"] })}>
            <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="slide">Slide</SelectItem>
              <SelectItem value="fade">Fade</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <TextInput label="Autoplay Delay" type="number" min={1000} max={30000} value={settings.autoplay_delay} onChange={(event) => onChange({ ...settings, autoplay_delay: Number(event.target.value || 0) })} />
        <TextInput label="Transition Speed" type="number" min={100} max={5000} value={settings.transition_speed} onChange={(event) => onChange({ ...settings, transition_speed: Number(event.target.value || 0) })} />
      </FormGrid>
    </SettingsSection>
  );
}

function SlideBasics({ slide, onChange }: { slide: HeroSlide; onChange: (slide: HeroSlide) => void }) {
  return (
    <div className="mb-4 grid gap-3 md:grid-cols-2">
      <TextInput label="Slide Name" value={slide.name ?? ""} onChange={(event) => onChange({ ...slide, name: event.target.value })} />
      <label className="space-y-2">
        <span className="text-sm font-semibold">Slide Status</span>
        <Select value={slide.status ? "enabled" : "disabled"} onValueChange={(status) => onChange({ ...slide, status: status === "enabled" })}>
          <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="enabled">Enabled</SelectItem>
            <SelectItem value="disabled">Disabled</SelectItem>
          </SelectContent>
        </Select>
      </label>
    </div>
  );
}

function SimpleSlideFields({ slide, onChange }: { slide: HeroSlide; onChange: (slide: HeroSlide) => void }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-3 md:grid-cols-2">
        <ImagePicker label="Background Image" value={slide.background_image ?? ""} onChange={(background_image) => onChange({ ...slide, background_image })} />
        <ImagePicker label="Mobile Image" value={slide.mobile_image ?? ""} onChange={(mobile_image) => onChange({ ...slide, mobile_image })} />
      </div>
      <FormGrid>
        <TextInput label="Title" value={slide.title ?? ""} onChange={(event) => onChange({ ...slide, title: event.target.value })} />
        <TextInput label="Subtitle" value={slide.subtitle ?? ""} onChange={(event) => onChange({ ...slide, subtitle: event.target.value })} />
      </FormGrid>
      <TextareaInput label="Description" value={slide.description ?? ""} onChange={(event) => onChange({ ...slide, description: event.target.value })} />
      <FormGrid>
        <TextInput label="Primary Button" value={slide.primary_button_text ?? ""} onChange={(event) => onChange({ ...slide, primary_button_text: event.target.value })} />
        <TextInput label="Primary Button URL" value={slide.primary_button_url ?? ""} onChange={(event) => onChange({ ...slide, primary_button_url: event.target.value })} />
        <TextInput label="Secondary Button" value={slide.secondary_button_text ?? ""} onChange={(event) => onChange({ ...slide, secondary_button_text: event.target.value })} />
        <TextInput label="Secondary Button URL" value={slide.secondary_button_url ?? ""} onChange={(event) => onChange({ ...slide, secondary_button_url: event.target.value })} />
        <label className="space-y-2">
          <span className="text-sm font-semibold">Text Alignment</span>
          <Select value={slide.text_alignment} onValueChange={(text_alignment) => onChange({ ...slide, text_alignment: text_alignment as HeroSlide["text_alignment"] })}>
            <SelectTrigger className="h-11 rounded-lg"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="left">Left</SelectItem>
              <SelectItem value="center">Center</SelectItem>
              <SelectItem value="right">Right</SelectItem>
            </SelectContent>
          </Select>
        </label>
        <TextInput label="Overlay Opacity" type="number" min={0} max={100} value={slide.overlay_opacity} onChange={(event) => onChange({ ...slide, overlay_opacity: Number(event.target.value || 0) })} />
        <ToggleSwitch label="Overlay" checked={slide.overlay} onChange={(overlay) => onChange({ ...slide, overlay })} />
      </FormGrid>
    </div>
  );
}

function CanvasBuilder({ slide, canEdit, onChange }: { slide: HeroSlide; canEdit: boolean; onChange: (slide: HeroSlide) => void }) {
  const [device, setDevice] = useState<HeroDevice>("desktop");
  const [selected, setSelected] = useState<number[]>(slide.elements[0] ? [slide.elements[0].z_index] : []);
  const [history, setHistory] = useState<HeroSlide[]>([]);
  const [future, setFuture] = useState<HeroSlide[]>([]);
  const [layersOpen, setLayersOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);
  const [clipboard, setClipboard] = useState<HeroSlideElement | null>(null);
  const [editingElement, setEditingElement] = useState<HeroSlideElement | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; z: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HeroSlideElement | null>(null);
  const selectedElements = slide.elements.filter((element) => selected.includes(element.z_index));
  const selectedElement = selectedElements[0] ?? slide.elements[0] ?? null;
  const contextElement = contextMenu ? slide.elements.find((element) => element.z_index === contextMenu.z) ?? null : null;
  const zoomScale = device === "desktop" ? 0.66 * zoom : device === "tablet" ? 0.78 * zoom : zoom;

  const commit = useCallback((next: HeroSlide) => {
    if (!canEdit) return;
    setHistory((current) => [...current.slice(-19), slide]);
    setFuture([]);
    onChange(next);
  }, [canEdit, onChange, slide]);

  const undo = useCallback(() => {
    const previous = history.at(-1);
    if (!previous) return;
    setHistory((current) => current.slice(0, -1));
    setFuture((current) => [slide, ...current]);
    onChange(previous);
  }, [history, onChange, slide]);

  const redo = useCallback(() => {
    const next = future[0];
    if (!next) return;
    setFuture((current) => current.slice(1));
    setHistory((current) => [...current, slide]);
    onChange(next);
  }, [future, onChange, slide]);

  function addElement(type: HeroElementType) {
    if (!canEdit) return;
    const element = createElement(type, slide.elements.length);
    commit({ ...slide, elements: [...slide.elements, element] });
    setSelected([element.z_index]);
  }

  function updateElement(target: HeroSlideElement, patch: Partial<HeroSlideElement>) {
    commit({ ...slide, elements: slide.elements.map((element) => element === target ? { ...element, ...patch } : element) });
  }

  const duplicateElement = useCallback((target: HeroSlideElement) => {
    if (!canEdit) return;
    const nextZ = Math.max(0, ...slide.elements.map((element) => element.z_index)) + 1;
    const copy = { ...target, id: undefined, name: `${target.name} Copy`, z_index: nextZ, responsive: offsetResponsive(target.responsive) };
    commit({ ...slide, elements: [...slide.elements, copy] });
    setSelected([nextZ]);
  }, [canEdit, commit, slide]);

  function deleteElement(target: HeroSlideElement) {
    if (!canEdit) return;
    commit({ ...slide, elements: slide.elements.filter((element) => element !== target) });
    setSelected([]);
    setDeleteTarget(null);
  }

  function layer(target: HeroSlideElement, direction: -1 | 1) {
    updateElement(target, { z_index: Math.max(0, target.z_index + direction) });
  }

  function layerSelected(direction: -1 | 1) {
    if (!selected.length) return;
    commit({
      ...slide,
      elements: slide.elements.map((element) => (
        selected.includes(element.z_index)
          ? { ...element, z_index: Math.max(0, element.z_index + direction) }
          : element
      )),
    });
  }

  function layerToEdge(target: HeroSlideElement, edge: "front" | "back") {
    if (!canEdit) return;
    const zValues = slide.elements.map((element) => element.z_index);
    updateElement(target, { z_index: edge === "front" ? Math.max(...zValues, 0) + 1 : 0 });
  }

  function copyElement(target: HeroSlideElement) {
    setClipboard({ ...target, id: undefined });
    toast.success("Layer copied.");
  }

  const pasteElement = useCallback(() => {
    if (!canEdit || !clipboard) return;
    const nextZ = Math.max(0, ...slide.elements.map((element) => element.z_index)) + 1;
    const pasted = { ...clipboard, id: undefined, name: `${clipboard.name} Copy`, z_index: nextZ, responsive: offsetResponsive(clipboard.responsive) };
    commit({ ...slide, elements: [...slide.elements, pasted] });
    setSelected([nextZ]);
  }, [canEdit, clipboard, commit, slide]);

  function openElementMenu(event: ReactMouseEvent, z: number) {
    event.preventDefault();
    event.stopPropagation();
    onSelectForMenu(z, event.ctrlKey || event.metaKey || event.shiftKey);
    setContextMenu({ x: event.clientX, y: event.clientY, z });
  }

  function onSelectForMenu(z: number, additive = false) {
    selectElement(z, additive);
  }

  function closeContextMenu() {
    setContextMenu(null);
  }

  function selectElement(z: number | null, additive = false) {
    if (z === null) {
      setSelected([]);
      return;
    }

    setSelected((current) => {
      if (!additive) return [z];
      return current.includes(z) ? current.filter((item) => item !== z) : [...current, z];
    });
  }

  const updateSelectedBoxes = useCallback((patch: (box: HeroElementBox) => Partial<HeroElementBox>) => {
    if (!selected.length) return;
    commit({
      ...slide,
      elements: slide.elements.map((element) => {
        if (!selected.includes(element.z_index) || element.locked) return element;
        const current = element.responsive[device];
        return { ...element, responsive: { ...element.responsive, [device]: { ...current, ...patch(current) } } };
      }),
    });
  }, [commit, device, selected, slide]);

  const moveSelected = useCallback((dx: number, dy: number) => {
    updateSelectedBoxes((box) => ({ x: Math.max(0, box.x + dx), y: Math.max(0, box.y + dy) }));
  }, [updateSelectedBoxes]);

  useEffect(() => {
    setSelected((current) => current.filter((z) => slide.elements.some((element) => element.z_index === z)));
  }, [slide.elements]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      const editing = target && (["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName) || target.isContentEditable);
      if (editing) return;

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        if (event.shiftKey) {
          redo();
        } else {
          undo();
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
        event.preventDefault();
        redo();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "a") {
        event.preventDefault();
        setSelected(slide.elements.map((element) => element.z_index));
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c") {
        if (selectedElement) {
          event.preventDefault();
          copyElement(selectedElement);
        }
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
        event.preventDefault();
        pasteElement();
        return;
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        if (selectedElement) {
          event.preventDefault();
          duplicateElement(selectedElement);
        }
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!canEdit) return;
        if (!selected.length) return;
        event.preventDefault();
        if (selected.length === 1 && selectedElement) {
          setDeleteTarget(selectedElement);
        } else {
          commit({ ...slide, elements: slide.elements.filter((element) => !selected.includes(element.z_index)) });
          setSelected([]);
        }
        return;
      }

      const step = event.shiftKey ? 10 : 1;
      const movement = {
        ArrowUp: [0, -step],
        ArrowDown: [0, step],
        ArrowLeft: [-step, 0],
        ArrowRight: [step, 0],
      }[event.key] as [number, number] | undefined;

      if (!movement || !selected.length || !canEdit) return;
      event.preventDefault();
      moveSelected(movement[0], movement[1]);
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canEdit, clipboard, commit, duplicateElement, future, history, moveSelected, pasteElement, redo, selected, selectedElement, slide, undo]);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => closeContextMenu();
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [contextMenu]);

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-2 md:grid-rows-3">
        <div className="md:row-span-3 [&>div]:h-full [&>div]:space-y-2 [&_label]:!h-[calc(100%-1.75rem)]">
          <ImagePicker label="Canvas Background Image" value={slide.background_image ?? ""} onChange={(background_image) => onChange({ ...slide, background_image })} />
        </div>
        <TextInput label="Background Color" value={slide.background_color ?? ""} onChange={(event) => onChange({ ...slide, background_color: event.target.value })} />
        <TextInput label="Background Gradient" value={slide.background_gradient ?? ""} onChange={(event) => onChange({ ...slide, background_gradient: event.target.value })} />
        <TextInput label="Overlay Opacity" type="number" min={0} max={100} value={slide.canvas_overlay_opacity} onChange={(event) => onChange({ ...slide, canvas_overlay_opacity: Number(event.target.value || 0) })} />
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-border bg-background p-2">
        {devices.map(({ key, icon: Icon, label }) => (
          <Button key={key} type="button" size="sm" variant={device === key ? "primary" : "secondary"} icon={<Icon className="h-4 w-4" />} onClick={() => setDevice(key)}>{label}</Button>
        ))}
        <span className="mx-1 h-6 w-px bg-border" />
        {canEdit ? <Button size="sm" variant="secondary" icon={<Type className="h-4 w-4" />} onClick={() => addElement("heading")}>Heading</Button> : null}
        {canEdit ? <Button size="sm" variant="secondary" icon={<Type className="h-4 w-4" />} onClick={() => addElement("paragraph")}>Text</Button> : null}
        {canEdit ? <Button size="sm" variant="secondary" icon={<Square className="h-4 w-4" />} onClick={() => addElement("button")}>Button</Button> : null}
        {canEdit ? <Button size="sm" variant="secondary" icon={<ImageIcon className="h-4 w-4" />} onClick={() => addElement("image")}>Image</Button> : null}
        {canEdit ? <Button size="sm" variant="secondary" icon={<Square className="h-4 w-4" />} onClick={() => addElement("shape")}>Shape</Button> : null}
        {canEdit ? <span className="mx-1 h-6 w-px bg-border" /> : null}
        {canEdit ? <Button size="icon" variant="ghost" aria-label="Undo" icon={<Undo2 className="h-4 w-4" />} disabled={!history.length} onClick={undo} /> : null}
        {canEdit ? <Button size="icon" variant="ghost" aria-label="Redo" icon={<Redo2 className="h-4 w-4" />} disabled={!future.length} onClick={redo} /> : null}
        <Select value={String(zoom)} onValueChange={(value) => setZoom(Number(value))}>
          <SelectTrigger className="h-9 w-24 rounded-lg"><SelectValue /></SelectTrigger>
          <SelectContent>
            {[0.25, 0.5, 0.75, 1, 1.5, 2].map((value) => <SelectItem key={value} value={String(value)}>{Math.round(value * 100)}%</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" variant={showGrid ? "primary" : "secondary"} onClick={() => setShowGrid((value) => !value)}>Grid</Button>
        <Button size="sm" variant={snapToGrid ? "primary" : "secondary"} onClick={() => setSnapToGrid((value) => !value)}>Snap</Button>
        <Button size="sm" variant={previewMode ? "primary" : "secondary"} icon={previewMode ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} onClick={() => setPreviewMode((value) => !value)}>Preview</Button>
        <Button size="sm" variant="secondary" icon={layersOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />} onClick={() => setLayersOpen((value) => !value)}>
          {layersOpen ? "Hide Panels" : "Panels"}
        </Button>
        {selectedElement ? (
          <>
            {canEdit ? <Button size="icon" variant="ghost" aria-label="Duplicate" icon={<Copy className="h-4 w-4" />} onClick={() => duplicateElement(selectedElement)} /> : null}
            {canEdit ? <Button size="icon" variant="ghost" aria-label="Delete" icon={<Trash2 className="h-4 w-4" />} onClick={() => selectedElements.length > 1 ? (commit({ ...slide, elements: slide.elements.filter((element) => !selected.includes(element.z_index)) }), setSelected([])) : deleteElement(selectedElement)} /> : null}
            <Button size="icon" variant="ghost" aria-label="Bring forward" icon={<ArrowUp className="h-4 w-4" />} onClick={() => selectedElements.length > 1 ? layerSelected(1) : layer(selectedElement, 1)} />
            <Button size="icon" variant="ghost" aria-label="Send backward" icon={<SendToBack className="h-4 w-4" />} onClick={() => selectedElements.length > 1 ? layerSelected(-1) : layer(selectedElement, -1)} />
            <Button size="icon" variant="ghost" aria-label="Align left" icon={<AlignLeft className="h-4 w-4" />} onClick={() => updateSelectedBoxes(() => ({ x: 0 }))} />
            <Button size="icon" variant="ghost" aria-label="Align center" icon={<AlignCenter className="h-4 w-4" />} onClick={() => updateSelectedBoxes((box) => ({ x: Math.round((slide.canvas_size[device].width - box.width) / 2) }))} />
            <Button size="icon" variant="ghost" aria-label="Align right" icon={<AlignRight className="h-4 w-4" />} onClick={() => updateSelectedBoxes((box) => ({ x: slide.canvas_size[device].width - box.width }))} />
            <Button size="sm" variant="secondary" onClick={() => setEditingElement(selectedElement)}>Edit</Button>
          </>
        ) : null}
      </div>

      <div className={cn("grid gap-4", layersOpen ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "xl:grid-cols-1")}>
        <CanvasStage slide={slide} device={device} selected={selected} scale={zoomScale} showGrid={showGrid} snapToGrid={snapToGrid} previewMode={previewMode} onSelect={selectElement} onContextMenu={openElementMenu} onChange={commit} />
        {layersOpen ? (
          <div className="space-y-3">
            <LayerManager slide={slide} selected={selected} canEdit={canEdit} clipboard={clipboard} onSelect={selectElement} onEdit={setEditingElement} onDuplicate={duplicateElement} onCopy={copyElement} onPaste={pasteElement} onDelete={setDeleteTarget} onChange={commit} onClose={() => setLayersOpen(false)} />
          </div>
        ) : null}
      </div>
      <ElementEditModal
        element={editingElement}
        device={device}
        onClose={() => setEditingElement(null)}
        onUpload={async (file) => (await heroSectionService.uploadImage(file)).data.url}
        onSave={(next) => {
          updateElement(editingElement!, next);
          setEditingElement(null);
        }}
      />
      <HeroElementContextMenu
        element={contextElement}
        position={contextMenu}
        canEdit={canEdit}
        canPaste={Boolean(clipboard)}
        onClose={closeContextMenu}
        onEdit={(element) => setEditingElement(element)}
        onDuplicate={duplicateElement}
        onCopy={copyElement}
        onPaste={pasteElement}
        onBringForward={(element) => layer(element, 1)}
        onBringToFront={(element) => layerToEdge(element, "front")}
        onSendBackward={(element) => layer(element, -1)}
        onSendToBack={(element) => layerToEdge(element, "back")}
        onToggleLock={(element) => updateElement(element, { locked: !element.locked })}
        onToggleHide={(element) => updateElement(element, { hidden: !element.hidden })}
        onDelete={(element) => setDeleteTarget(element)}
      />
      <ConfirmActionModal
        open={Boolean(deleteTarget)}
        title="Delete layer"
        description={`Delete "${deleteTarget?.name || "Layer"}"? This action cannot be undone.`}
        confirmLabel="Delete Layer"
        onCancel={() => setDeleteTarget(null)}
        onConfirm={() => deleteTarget ? deleteElement(deleteTarget) : undefined}
      />
    </div>
  );
}

function CanvasStage({
  slide,
  device,
  selected,
  scale,
  showGrid,
  snapToGrid,
  previewMode,
  onSelect,
  onContextMenu,
  onChange,
}: {
  slide: HeroSlide;
  device: HeroDevice;
  selected: number[];
  scale: number;
  showGrid: boolean;
  snapToGrid: boolean;
  previewMode: boolean;
  onSelect: (z: number | null, additive?: boolean) => void;
  onContextMenu: (event: ReactMouseEvent, z: number) => void;
  onChange: (slide: HeroSlide) => void;
}) {
  const size = slide.canvas_size[device];
  const stageRef = useRef<HTMLDivElement>(null);
  const snap = (value: number) => snapToGrid ? Math.round(value / 8) * 8 : value;

  function moveElement(target: HeroSlideElement, start: PointerEvent<HTMLElement>, mode: "move" | "resize" | "rotate") {
    if (target.locked) return;
    start.preventDefault();
    const activeZ = mode === "move" && selected.includes(target.z_index) ? selected : [target.z_index];
    const origins = new Map(slide.elements.map((element) => [element.z_index, element.responsive[device]]));
    const origin = target.responsive[device];
    const startX = start.clientX;
    const startY = start.clientY;

    const move = (event: globalThis.PointerEvent) => {
      if (mode === "rotate") {
        const rect = stageRef.current?.getBoundingClientRect();
        if (!rect) return;
        const centerX = rect.left + (origin.x + origin.width / 2) * scale;
        const centerY = rect.top + (origin.y + origin.height / 2) * scale;
        const radians = Math.atan2(event.clientY - centerY, event.clientX - centerX);
        let rotation = Math.round((radians * 180) / Math.PI + 90);
        if (event.shiftKey) rotation = Math.round(rotation / 15) * 15;
        onChange({
          ...slide,
          elements: slide.elements.map((element) => (
            element === target
              ? { ...element, responsive: { ...element.responsive, [device]: { ...origin, rotation } } }
              : element
          )),
        });
        return;
      }

      const dx = Math.round((event.clientX - startX) / scale);
      const dy = Math.round((event.clientY - startY) / scale);
      const nextTargetBox = mode === "move"
        ? { ...origin, x: Math.max(0, snap(origin.x + dx)), y: Math.max(0, snap(origin.y + dy)) }
        : { ...origin, width: Math.max(24, snap(origin.width + dx)), height: Math.max(20, snap(origin.height + dy)) };
      onChange({
        ...slide,
        elements: slide.elements.map((element) => {
          if (mode === "resize") {
            return element === target ? { ...element, responsive: { ...element.responsive, [device]: nextTargetBox } } : element;
          }
          if (!activeZ.includes(element.z_index) || element.locked) return element;
          const elementOrigin = origins.get(element.z_index) ?? element.responsive[device];
          const nextBox = { ...elementOrigin, x: Math.max(0, snap(elementOrigin.x + dx)), y: Math.max(0, snap(elementOrigin.y + dy)) };
          return { ...element, responsive: { ...element.responsive, [device]: nextBox } };
        }),
      });
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  }

  return (
    <div className="overflow-auto rounded-lg border border-border bg-muted p-4">
      <div
        className="relative mx-auto overflow-hidden rounded-lg border border-border bg-slate-950 shadow-sm"
        style={{ width: size.width * scale, height: size.height * scale }}
      >
        <div
          ref={stageRef}
          role="application"
          className="relative origin-top-left overflow-hidden"
          style={{
            width: size.width,
            height: size.height,
            transform: `scale(${scale})`,
            backgroundColor: slide.background_color || "#0f172a",
            backgroundImage: slide.background_image ? `url(${slide.background_image})` : slide.background_gradient || undefined,
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
          onPointerDown={() => onSelect(null)}
        >
          {showGrid && !previewMode ? <div className="pointer-events-none absolute inset-0 opacity-30" style={{ backgroundImage: "linear-gradient(rgba(255,255,255,.2) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.2) 1px, transparent 1px)", backgroundSize: "32px 32px" }} /> : null}
          {!previewMode ? (
            <>
              <div className="pointer-events-none absolute left-1/2 top-0 h-full w-px bg-primary/30" />
              <div className="pointer-events-none absolute left-0 top-1/2 h-px w-full bg-primary/30" />
            </>
          ) : null}
          {slide.background_overlay ? <div className="absolute inset-0 bg-black" style={{ opacity: slide.canvas_overlay_opacity / 100 }} /> : null}
          {slide.elements.slice().sort((a, b) => a.z_index - b.z_index).map((element) => {
            const box = element.responsive[device];
            if (element.hidden) return null;
            return (
              <div
                key={`${element.id ?? element.name}-${element.z_index}`}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onSelect(element.z_index, event.ctrlKey || event.metaKey);
                  moveElement(element, event, "move");
                }}
                onContextMenu={(event) => onContextMenu(event, element.z_index)}
                className={cn("absolute cursor-move border", selected.includes(element.z_index) ? "border-primary" : "border-transparent", selected.length > 1 && selected.includes(element.z_index) && "ring-1 ring-primary/40", element.locked && "cursor-not-allowed")}
                style={{
                  left: box.x,
                  top: box.y,
                  width: box.width,
                  height: box.height,
                  zIndex: element.z_index,
                  transform: `rotate(${box.rotation ?? 0}deg)`,
                }}
              >
                <CanvasElement element={element} />
                {selected.includes(element.z_index) && selected.length === 1 && !element.locked && !previewMode ? (
                  <>
                    <span className="pointer-events-none absolute left-1/2 top-[-34px] h-8 w-px -translate-x-1/2 bg-primary/70" />
                    <button
                      type="button"
                      aria-label="Rotate element"
                      title="Drag to rotate. Hold Shift for 15 degree snapping."
                      className="absolute left-1/2 top-[-46px] flex h-5 w-5 -translate-x-1/2 items-center justify-center rounded-full border border-primary bg-background text-[10px] text-primary shadow-sm"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        moveElement(element, event, "rotate");
                      }}
                    >
                      ↻
                    </button>
                    <button
                      type="button"
                      aria-label="Resize element"
                      className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-primary"
                      onPointerDown={(event) => {
                        event.stopPropagation();
                        moveElement(element, event, "resize");
                      }}
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CanvasElement({ element }: { element: HeroSlideElement }) {
  const style = element.style;
  const common = {
    opacity: Number(style.opacity ?? 1),
    borderRadius: style.borderRadius,
    boxShadow: String(style.boxShadow ?? ""),
  };

  if (element.type === "image") {
    return element.content.src ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={element.content.src} alt={element.content.alt ?? ""} className="h-full w-full object-cover" style={common} />
    ) : <div className="flex h-full w-full items-center justify-center bg-white/20 text-xs text-white">Image</div>;
  }

  if (element.type === "button") {
    return (
      <div className="flex h-full w-full items-center justify-center" style={{ ...common, background: String(style.backgroundColor ?? "#fff"), color: String(style.textColor ?? "#111"), padding: String(style.padding ?? "12px 22px") }}>
        <span className="truncate text-sm font-bold">{element.content.text}</span>
      </div>
    );
  }

  if (element.type === "shape") {
    return (
      <div
        className="h-full w-full"
        style={{
          ...common,
          background: String(style.gradientFill || (style.backgroundColor ?? "#fff")),
          border: String(style.border ?? "0 solid transparent"),
          clipPath: shapeClipPath(element.content.shape),
        }}
      />
    );
  }

  return (
    <div
      className="h-full w-full overflow-hidden"
      style={{
        ...common,
        color: String(style.color ?? "#fff"),
        fontFamily: String(style.fontFamily ?? "Inter, sans-serif"),
        fontSize: Number(style.fontSize ?? 16),
        fontWeight: Number(style.fontWeight ?? 600),
        lineHeight: Number(style.lineHeight ?? 1.2),
        letterSpacing: Number(style.letterSpacing ?? 0),
        textAlign: style.textAlign as "left" | "center" | "right",
      }}
    >
      {element.content.text}
    </div>
  );
}

function LayerManager({
  slide,
  selected,
  canEdit,
  clipboard,
  onSelect,
  onEdit,
  onDuplicate,
  onCopy,
  onPaste,
  onDelete,
  onChange,
  onClose,
}: {
  slide: HeroSlide;
  selected: number[];
  canEdit: boolean;
  clipboard: HeroSlideElement | null;
  onSelect: (z: number, additive?: boolean) => void;
  onEdit: (element: HeroSlideElement) => void;
  onDuplicate: (element: HeroSlideElement) => void;
  onCopy: (element: HeroSlideElement) => void;
  onPaste: () => void;
  onDelete: (element: HeroSlideElement) => void;
  onChange: (slide: HeroSlide) => void;
  onClose: () => void;
}) {
  const [menu, setMenu] = useState<{ x: number; y: number; z: number } | null>(null);
  const menuElement = menu ? slide.elements.find((element) => element.z_index === menu.z) ?? null : null;

  function patch(target: HeroSlideElement, patchValue: Partial<HeroSlideElement>) {
    onChange({ ...slide, elements: slide.elements.map((element) => element === target ? { ...element, ...patchValue } : element) });
  }

  function openMenu(event: ReactMouseEvent, target: HeroSlideElement) {
    event.preventDefault();
    onSelect(target.z_index, false);
    setMenu({ x: event.clientX, y: event.clientY, z: target.z_index });
  }

  function closeMenu() {
    setMenu(null);
  }

  useEffect(() => {
    if (!menu) return;
    const close = () => closeMenu();
    window.addEventListener("click", close);
    window.addEventListener("keydown", close);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("keydown", close);
    };
  }, [menu]);

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <span className="text-sm font-bold">Layer Manager</span>
        <Button type="button" size="icon" variant="ghost" aria-label="Hide layer manager" icon={<PanelRightClose className="h-4 w-4" />} onClick={onClose} />
      </div>
      <div className="max-h-72 overflow-auto p-2">
        {slide.elements.slice().sort((a, b) => b.z_index - a.z_index).map((element) => (
          <div
            key={`${element.name}-${element.z_index}`}
            className={cn("flex items-center gap-2 rounded-lg p-2", selected.includes(element.z_index) && "bg-primary/10")}
            onContextMenu={(event) => openMenu(event, element)}
          >
            <button type="button" className="min-w-0 flex-1 text-left text-sm font-medium" onClick={(event) => onSelect(element.z_index, event.ctrlKey || event.metaKey)}>{element.name}</button>
            <Button size="icon" variant="ghost" aria-label="Toggle hidden" icon={element.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={() => patch(element, { hidden: !element.hidden })} />
            <Button size="icon" variant="ghost" aria-label="Toggle locked" icon={element.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} onClick={() => patch(element, { locked: !element.locked })} />
          </div>
        ))}
      </div>
      {menu && menuElement ? (
        <div
          className="fixed z-50 w-48 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-xl"
          style={{ left: menu.x, top: menu.y }}
          onClick={(event) => event.stopPropagation()}
        >
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onEdit(menuElement); closeMenu(); }} disabled={!canEdit}>
            <Pencil className="h-4 w-4" /> Edit
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onDuplicate(menuElement); closeMenu(); }} disabled={!canEdit}>
            <Copy className="h-4 w-4" /> Duplicate Layer
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onCopy(menuElement); closeMenu(); }}>
            <Copy className="h-4 w-4" /> Copy
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { onPaste(); closeMenu(); }} disabled={!canEdit || !clipboard}>
            <Copy className="h-4 w-4" /> Paste
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { patch(menuElement, { hidden: !menuElement.hidden }); closeMenu(); }}>
            {menuElement.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} {menuElement.hidden ? "Show Layer" : "Hide Layer"}
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted" onClick={() => { patch(menuElement, { locked: !menuElement.locked }); closeMenu(); }}>
            {menuElement.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />} {menuElement.locked ? "Unlock Layer" : "Lock Layer"}
          </button>
          <button type="button" className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-destructive hover:bg-destructive/10" onClick={() => { onDelete(menuElement); closeMenu(); }} disabled={!canEdit}>
            <Trash2 className="h-4 w-4" /> Delete Layer
          </button>
        </div>
      ) : null}
    </div>
  );
}

function HeroElementContextMenu({
  element,
  position,
  canEdit,
  canPaste,
  onClose,
  onEdit,
  onDuplicate,
  onCopy,
  onPaste,
  onBringForward,
  onBringToFront,
  onSendBackward,
  onSendToBack,
  onToggleLock,
  onToggleHide,
  onDelete,
}: {
  element: HeroSlideElement | null;
  position: { x: number; y: number; z: number } | null;
  canEdit: boolean;
  canPaste: boolean;
  onClose: () => void;
  onEdit: (element: HeroSlideElement) => void;
  onDuplicate: (element: HeroSlideElement) => void;
  onCopy: (element: HeroSlideElement) => void;
  onPaste: () => void;
  onBringForward: (element: HeroSlideElement) => void;
  onBringToFront: (element: HeroSlideElement) => void;
  onSendBackward: (element: HeroSlideElement) => void;
  onSendToBack: (element: HeroSlideElement) => void;
  onToggleLock: (element: HeroSlideElement) => void;
  onToggleHide: (element: HeroSlideElement) => void;
  onDelete: (element: HeroSlideElement) => void;
}) {
  if (!element || !position) return null;
  const run = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div className="fixed z-50 w-56 overflow-hidden rounded-lg border border-border bg-background p-1 shadow-xl" style={{ left: position.x, top: position.y }} onClick={(event) => event.stopPropagation()}>
      <ContextMenuButton icon={<Pencil className="h-4 w-4" />} label="Edit" onClick={() => run(() => onEdit(element))} disabled={!canEdit} />
      <ContextMenuButton icon={<Copy className="h-4 w-4" />} label="Duplicate" onClick={() => run(() => onDuplicate(element))} disabled={!canEdit} />
      <ContextMenuButton icon={<Copy className="h-4 w-4" />} label="Copy" onClick={() => run(() => onCopy(element))} />
      <ContextMenuButton icon={<Copy className="h-4 w-4" />} label="Paste" onClick={() => run(onPaste)} disabled={!canEdit || !canPaste} />
      <div className="my-1 h-px bg-border" />
      <ContextMenuButton icon={<ArrowUp className="h-4 w-4" />} label="Bring Forward" onClick={() => run(() => onBringForward(element))} disabled={!canEdit} />
      <ContextMenuButton icon={<ArrowUp className="h-4 w-4" />} label="Bring to Front" onClick={() => run(() => onBringToFront(element))} disabled={!canEdit} />
      <ContextMenuButton icon={<SendToBack className="h-4 w-4" />} label="Send Backward" onClick={() => run(() => onSendBackward(element))} disabled={!canEdit} />
      <ContextMenuButton icon={<SendToBack className="h-4 w-4" />} label="Send to Back" onClick={() => run(() => onSendToBack(element))} disabled={!canEdit} />
      <div className="my-1 h-px bg-border" />
      <ContextMenuButton icon={element.locked ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />} label={element.locked ? "Unlock" : "Lock"} onClick={() => run(() => onToggleLock(element))} disabled={!canEdit} />
      <ContextMenuButton icon={element.hidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />} label={element.hidden ? "Show" : "Hide"} onClick={() => run(() => onToggleHide(element))} disabled={!canEdit} />
      <ContextMenuButton icon={<Pencil className="h-4 w-4" />} label="Rename" onClick={() => run(() => onEdit(element))} disabled={!canEdit} />
      <ContextMenuButton icon={<Trash2 className="h-4 w-4" />} label="Delete" destructive onClick={() => run(() => onDelete(element))} disabled={!canEdit} />
    </div>
  );
}

function ContextMenuButton({ icon, label, onClick, disabled, destructive }: { icon: ReactNode; label: string; onClick: () => void; disabled?: boolean; destructive?: boolean }) {
  return (
    <button
      type="button"
      disabled={disabled}
      className={cn("flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50", destructive && "text-destructive hover:bg-destructive/10")}
      onClick={onClick}
    >
      {icon} {label}
    </button>
  );
}

function ElementEditModal({ element, device, onClose, onUpload, onSave }: { element: HeroSlideElement | null; device: HeroDevice; onClose: () => void; onUpload: (file: File) => Promise<string>; onSave: (patch: Partial<HeroSlideElement>) => void }) {
  const [draft, setDraft] = useState<HeroSlideElement | null>(element);

  useEffect(() => {
    setDraft(element);
  }, [element]);

  if (!element || !draft) return null;

  const box = draft.responsive[device];
  const style = draft.style;
  const content = draft.content;
  const setStyle = (patch: Record<string, string | number>) => setDraft({ ...draft, style: { ...style, ...patch } });
  const setContent = (patch: Record<string, string>) => setDraft({ ...draft, content: { ...content, ...patch } });
  const setBox = (patch: Partial<HeroElementBox>) => setDraft({ ...draft, responsive: { ...draft.responsive, [device]: { ...box, ...patch } } });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-xl border border-border bg-background shadow-2xl">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-base font-bold">Edit {draft.type}</h2>
            <p className="text-xs text-muted-foreground">Configure this layer without leaving the canvas.</p>
          </div>
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>Close</Button>
        </div>
        <div className="max-h-[68vh] overflow-y-auto p-4">
          <FormGrid>
            <Input label="Layer Name" value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} />
            <TextInput label="Opacity" type="number" min={0} max={1} step={0.05} value={String(style.opacity ?? 1)} onChange={(event) => setStyle({ opacity: Number(event.target.value || 1) })} />
            <TextInput label="Rotation" type="number" value={String(box.rotation ?? 0)} onChange={(event) => setBox({ rotation: Number(event.target.value || 0) })} />
            <Input label="Link" value={content.url ?? ""} onChange={(event) => setContent({ url: event.target.value })} />
          </FormGrid>

          {(draft.type === "heading" || draft.type === "subheading" || draft.type === "paragraph") ? (
            <div className="mt-4 space-y-3">
              <TextareaInput label={draft.type === "paragraph" ? "Rich Text" : "Text"} value={content.text ?? ""} onChange={(event) => setContent({ text: event.target.value })} />
              <FormGrid>
                <Input label="Font Family" value={String(style.fontFamily ?? "Inter, sans-serif")} onChange={(event) => setStyle({ fontFamily: event.target.value })} />
                <Input label="Font Color" value={String(style.color ?? "#ffffff")} onChange={(event) => setStyle({ color: event.target.value })} />
                <Input label="Text Shadow" value={String(style.textShadow ?? "")} onChange={(event) => setStyle({ textShadow: event.target.value })} />
                <Input label="Letter Spacing" value={String(style.letterSpacing ?? 0)} onChange={(event) => setStyle({ letterSpacing: Number(event.target.value || 0) })} />
                <Input label="Line Height" value={String(style.lineHeight ?? 1.2)} onChange={(event) => setStyle({ lineHeight: Number(event.target.value || 1.2) })} />
                <label className="space-y-2 text-sm font-semibold">Text Alignment<Select value={String(style.textAlign ?? "left")} onValueChange={(textAlign) => setStyle({ textAlign })}><SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="left">Left</SelectItem><SelectItem value="center">Center</SelectItem><SelectItem value="right">Right</SelectItem></SelectContent></Select></label>
              </FormGrid>
            </div>
          ) : null}

          {draft.type === "button" ? (
            <div className="mt-4 space-y-3">
              <FormGrid>
                <Input label="Button Text" value={content.text ?? ""} onChange={(event) => setContent({ text: event.target.value })} />
                <Input label="Open Target" value={content.target ?? "_self"} onChange={(event) => setContent({ target: event.target.value })} />
                <Input label="Background Color" value={String(style.backgroundColor ?? "#ffffff")} onChange={(event) => setStyle({ backgroundColor: event.target.value })} />
                <Input label="Text Color" value={String(style.textColor ?? "#0f172a")} onChange={(event) => setStyle({ textColor: event.target.value })} />
                <Input label="Hover Background" value={String(style.hoverBackgroundColor ?? "")} onChange={(event) => setStyle({ hoverBackgroundColor: event.target.value })} />
                <Input label="Hover Text Color" value={String(style.hoverTextColor ?? "")} onChange={(event) => setStyle({ hoverTextColor: event.target.value })} />
                <Input label="Border Radius" type="number" value={String(style.borderRadius ?? 12)} onChange={(event) => setStyle({ borderRadius: Number(event.target.value || 0) })} />
                <Input label="Border Width" value={String(style.borderWidth ?? 0)} onChange={(event) => setStyle({ borderWidth: Number(event.target.value || 0), border: `${Number(event.target.value || 0)}px solid ${String(style.borderColor ?? "transparent")}` })} />
                <Input label="Border Color" value={String(style.borderColor ?? "transparent")} onChange={(event) => setStyle({ borderColor: event.target.value, border: `${Number(style.borderWidth ?? 0)}px solid ${event.target.value}` })} />
                <Input label="Shadow" value={String(style.boxShadow ?? "")} onChange={(event) => setStyle({ boxShadow: event.target.value })} />
                <Input label="Padding" value={String(style.padding ?? "12px 22px")} onChange={(event) => setStyle({ padding: event.target.value })} />
              </FormGrid>
            </div>
          ) : null}

          {draft.type === "image" ? (
            <div className="mt-4 space-y-3">
              <ImageDropzone label="Replace Image" value={content.src ?? ""} onChange={(src) => setContent({ src })} onUpload={onUpload} />
              <FormGrid>
                <Input label="Alt Text" value={content.alt ?? ""} onChange={(event) => setContent({ alt: event.target.value })} />
                <Input label="Object Fit" value={String(style.objectFit ?? "cover")} onChange={(event) => setStyle({ objectFit: event.target.value })} />
                <Input label="Width" type="number" value={String(box.width)} onChange={(event) => setBox({ width: Number(event.target.value || 0) })} />
                <Input label="Height" type="number" value={String(box.height)} onChange={(event) => setBox({ height: Number(event.target.value || 0) })} />
                <Input label="Border Radius" type="number" value={String(style.borderRadius ?? 0)} onChange={(event) => setStyle({ borderRadius: Number(event.target.value || 0) })} />
                <Input label="Shadow" value={String(style.boxShadow ?? "")} onChange={(event) => setStyle({ boxShadow: event.target.value })} />
              </FormGrid>
            </div>
          ) : null}

          {draft.type === "shape" ? (
            <div className="mt-4 space-y-3">
              <FormGrid>
                <label className="space-y-2 text-sm font-semibold">Shape<Select value={content.shape ?? "rectangle"} onValueChange={(shape) => setContent({ shape })}><SelectTrigger className="h-10 rounded-lg"><SelectValue /></SelectTrigger><SelectContent>{shapeOptions.map((shape) => <SelectItem key={shape} value={shape}>{shape.replace(/-/g, " ")}</SelectItem>)}</SelectContent></Select></label>
                <Input label="Width" type="number" value={String(box.width)} onChange={(event) => setBox({ width: Number(event.target.value || 0) })} />
                <Input label="Height" type="number" value={String(box.height)} onChange={(event) => setBox({ height: Number(event.target.value || 0) })} />
                <Input label="Fill Color" value={String(style.backgroundColor ?? "#ffffff")} onChange={(event) => setStyle({ backgroundColor: event.target.value })} />
                <Input label="Gradient Fill" value={String(style.gradientFill ?? "")} onChange={(event) => setStyle({ gradientFill: event.target.value })} />
                <Input label="Border Width" value={String(style.borderWidth ?? 0)} onChange={(event) => setStyle({ borderWidth: Number(event.target.value || 0), border: `${Number(event.target.value || 0)}px solid ${String(style.borderColor ?? "transparent")}` })} />
                <Input label="Border Color" value={String(style.borderColor ?? "transparent")} onChange={(event) => setStyle({ borderColor: event.target.value, border: `${Number(style.borderWidth ?? 0)}px solid ${event.target.value}` })} />
                <Input label="Corner Radius" type="number" value={String(style.borderRadius ?? 0)} onChange={(event) => setStyle({ borderRadius: Number(event.target.value || 0) })} />
                <Input label="Shadow" value={String(style.boxShadow ?? "")} onChange={(event) => setStyle({ boxShadow: event.target.value })} />
              </FormGrid>
            </div>
          ) : null}
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <Button type="button" size="sm" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" size="sm" onClick={() => onSave({ ...draft })}>Apply Changes</Button>
        </div>
      </div>
    </div>
  );
}

function ConfirmActionModal({ open, title, description, confirmLabel, onCancel, onConfirm }: { open: boolean; title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-background p-5 shadow-2xl">
        <h2 className="text-base font-bold">{title}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        <div className="mt-5 flex justify-end gap-2">
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button type="button" size="sm" variant="danger" onClick={onConfirm}>{confirmLabel}</Button>
        </div>
      </div>
    </div>
  );
}

function ImagePicker({ label, value, onChange, compact = false }: { label: string; value: string; onChange: (value: string) => void; compact?: boolean }) {
  return (
    <div className={cn(compact && "[&>div>label]:h-28")}>
      <ImageDropzone
        label={label}
        value={value}
        onChange={onChange}
        onUpload={async (file) => (await heroSectionService.uploadImage(file)).data.url}
      />
    </div>
  );
}
