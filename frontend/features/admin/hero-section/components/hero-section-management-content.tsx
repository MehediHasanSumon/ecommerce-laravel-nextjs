"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { PointerEvent } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
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

export function HeroSectionManagementContent() {
  useAuthStore((state) => state.user?.permissions);
  const canCreate = hasPermission("can_create_hero_section");
  const canEdit = hasPermission("can_edit_hero_section");
  const canDelete = hasPermission("can_delete_hero_section");
  const [settings, setSettings] = useState<HeroSettings>(defaultHeroSettings);
  const [slides, setSlides] = useState<HeroSlide[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingSlide, setSavingSlide] = useState(false);
  const [slidesPanelOpen, setSlidesPanelOpen] = useState(true);

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
    if (!window.confirm(`Delete "${slide.name || "Hero Slide"}"?`)) return;
    if (!slide.id) {
      setSlides((current) => current.filter((_, itemIndex) => itemIndex !== index));
      setActiveIndex(Math.max(0, index - 1));
      return;
    }
    try {
      const response = await heroSectionService.deleteSlide(slide.id);
      setSlides((current) => current.filter((item) => item.id !== slide.id));
      setActiveIndex(Math.max(0, index - 1));
      toast.success(response.message);
    } catch (error) {
      toast.error(toAppError(error).message);
    }
  }

  async function moveSlide(index: number, direction: -1 | 1) {
    if (!canEdit) return;
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    const ordered = next.map((slide, itemIndex) => ({ ...slide, sort_order: itemIndex }));
    setSlides(ordered);
    setActiveIndex(target);
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
                      onClick={() => setActiveIndex(index)}
                      className={cn("flex w-full items-center gap-2 rounded-lg border p-2 text-left transition", index === activeIndex ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted/50")}
                    >
                      <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-xs font-bold">{index + 1}</span>
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
                    {canEdit ? <Button size="sm" variant="secondary" icon={<ArrowUp className="h-4 w-4" />} disabled={activeIndex === 0} onClick={() => void moveSlide(activeIndex, -1)}>Move Up</Button> : null}
                    {canEdit ? <Button size="sm" variant="secondary" icon={<ArrowDown className="h-4 w-4" />} disabled={activeIndex === slides.length - 1} onClick={() => void moveSlide(activeIndex, 1)}>Move Down</Button> : null}
                    {canCreate ? <Button size="sm" variant="secondary" icon={<Copy className="h-4 w-4" />} onClick={() => void duplicateSlide(activeSlide, activeIndex)}>Duplicate</Button> : null}
                    {canDelete ? <Button size="sm" variant="danger" icon={<Trash2 className="h-4 w-4" />} onClick={() => void deleteSlide(activeSlide, activeIndex)}>Delete</Button> : null}
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
    <div className="mb-4 grid gap-3 md:grid-cols-3">
      <TextInput label="Slide Name" value={slide.name ?? ""} onChange={(event) => onChange({ ...slide, name: event.target.value })} />
      <TextInput label="Sort Order" type="number" min={0} value={slide.sort_order} onChange={(event) => onChange({ ...slide, sort_order: Number(event.target.value || 0) })} />
      <ToggleSwitch label="Slide Status" checked={slide.status} onChange={(status) => onChange({ ...slide, status })} />
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
  const selectedElements = slide.elements.filter((element) => selected.includes(element.z_index));
  const selectedElement = selectedElements[0] ?? slide.elements[0] ?? null;

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

  function updateBox(target: HeroSlideElement, box: Partial<HeroElementBox>) {
    const current = target.responsive[device];
    updateElement(target, { responsive: { ...target.responsive, [device]: { ...current, ...box } } });
  }

  function duplicateElement(target: HeroSlideElement) {
    if (!canEdit) return;
    const nextZ = Math.max(0, ...slide.elements.map((element) => element.z_index)) + 1;
    const copy = { ...target, id: undefined, name: `${target.name} Copy`, z_index: nextZ };
    commit({ ...slide, elements: [...slide.elements, copy] });
    setSelected([nextZ]);
  }

  function deleteElement(target: HeroSlideElement) {
    if (!canEdit) return;
    commit({ ...slide, elements: slide.elements.filter((element) => element !== target) });
    setSelected([]);
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

      if (event.key === "Delete" || event.key === "Backspace") {
        if (!canEdit) return;
        if (!selected.length) return;
        event.preventDefault();
        commit({ ...slide, elements: slide.elements.filter((element) => !selected.includes(element.z_index)) });
        setSelected([]);
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
  }, [canEdit, commit, future, history, moveSelected, redo, selected, slide, undo]);

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
          </>
        ) : null}
      </div>

      <div className={cn("grid gap-4", layersOpen ? "xl:grid-cols-[minmax(0,1fr)_320px]" : "xl:grid-cols-1")}>
        <CanvasStage slide={slide} device={device} selected={selected} onSelect={selectElement} onChange={commit} />
        {layersOpen ? (
          <div className="space-y-3">
            <LayerManager slide={slide} selected={selected} onSelect={selectElement} onChange={commit} onClose={() => setLayersOpen(false)} />
            {selectedElement ? <ElementInspector element={selectedElement} device={device} onChange={(patch) => updateElement(selectedElement, patch)} onBoxChange={(box) => updateBox(selectedElement, box)} /> : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function CanvasStage({ slide, device, selected, onSelect, onChange }: { slide: HeroSlide; device: HeroDevice; selected: number[]; onSelect: (z: number | null, additive?: boolean) => void; onChange: (slide: HeroSlide) => void }) {
  const size = slide.canvas_size[device];
  const scale = device === "desktop" ? 0.66 : device === "tablet" ? 0.78 : 1;
  const stageRef = useRef<HTMLDivElement>(null);

  function moveElement(target: HeroSlideElement, start: PointerEvent<HTMLElement>, mode: "move" | "resize") {
    if (target.locked) return;
    start.preventDefault();
    const activeZ = mode === "move" && selected.includes(target.z_index) ? selected : [target.z_index];
    const origins = new Map(slide.elements.map((element) => [element.z_index, element.responsive[device]]));
    const origin = target.responsive[device];
    const startX = start.clientX;
    const startY = start.clientY;

    const move = (event: globalThis.PointerEvent) => {
      const dx = Math.round((event.clientX - startX) / scale);
      const dy = Math.round((event.clientY - startY) / scale);
      const nextTargetBox = mode === "move"
        ? { ...origin, x: Math.max(0, origin.x + dx), y: Math.max(0, origin.y + dy) }
        : { ...origin, width: Math.max(24, origin.width + dx), height: Math.max(20, origin.height + dy) };
      onChange({
        ...slide,
        elements: slide.elements.map((element) => {
          if (mode === "resize") {
            return element === target ? { ...element, responsive: { ...element.responsive, [device]: nextTargetBox } } : element;
          }
          if (!activeZ.includes(element.z_index) || element.locked) return element;
          const elementOrigin = origins.get(element.z_index) ?? element.responsive[device];
          const nextBox = { ...elementOrigin, x: Math.max(0, elementOrigin.x + dx), y: Math.max(0, elementOrigin.y + dy) };
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
                {selected.includes(element.z_index) && selected.length === 1 && !element.locked ? (
                  <button
                    type="button"
                    aria-label="Resize element"
                    className="absolute -bottom-1.5 -right-1.5 h-3 w-3 rounded-full bg-primary"
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      moveElement(element, event, "resize");
                    }}
                  />
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
    return <div className="h-full w-full" style={{ ...common, background: String(style.backgroundColor ?? "#fff"), border: String(style.border ?? "0 solid transparent") }} />;
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

function LayerManager({ slide, selected, onSelect, onChange, onClose }: { slide: HeroSlide; selected: number[]; onSelect: (z: number, additive?: boolean) => void; onChange: (slide: HeroSlide) => void; onClose: () => void }) {
  function patch(target: HeroSlideElement, patchValue: Partial<HeroSlideElement>) {
    onChange({ ...slide, elements: slide.elements.map((element) => element === target ? { ...element, ...patchValue } : element) });
  }

  return (
    <div className="rounded-lg border border-border bg-background">
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <span className="text-sm font-bold">Layer Manager</span>
        <Button type="button" size="icon" variant="ghost" aria-label="Hide layer manager" icon={<PanelRightClose className="h-4 w-4" />} onClick={onClose} />
      </div>
      <div className="max-h-72 overflow-auto p-2">
        {slide.elements.slice().sort((a, b) => b.z_index - a.z_index).map((element) => (
          <div key={`${element.name}-${element.z_index}`} className={cn("flex items-center gap-2 rounded-lg p-2", selected.includes(element.z_index) && "bg-primary/10")}>
            <button type="button" className="min-w-0 flex-1 text-left text-sm font-medium" onClick={(event) => onSelect(element.z_index, event.ctrlKey || event.metaKey)}>{element.name}</button>
            <Button size="icon" variant="ghost" aria-label="Toggle hidden" icon={element.hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} onClick={() => patch(element, { hidden: !element.hidden })} />
            <Button size="icon" variant="ghost" aria-label="Toggle locked" icon={element.locked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />} onClick={() => patch(element, { locked: !element.locked })} />
          </div>
        ))}
      </div>
    </div>
  );
}

function ElementInspector({ element, device, onChange, onBoxChange }: { element: HeroSlideElement; device: HeroDevice; onChange: (patch: Partial<HeroSlideElement>) => void; onBoxChange: (box: Partial<HeroElementBox>) => void }) {
  const box = element.responsive[device];
  const style = element.style;
  return (
    <div className="space-y-3 rounded-lg border border-border bg-background p-3">
      <Input label="Layer Name" value={element.name} onChange={(event) => onChange({ name: event.target.value })} />
      {element.type !== "shape" ? (
        element.type === "image" ? (
          <ImagePicker label="Image" value={element.content.src ?? ""} onChange={(src) => onChange({ content: { ...element.content, src } })} compact />
        ) : (
          <Input
            label={element.type === "button" ? "Button Text" : "Text"}
            value={element.content.text ?? ""}
            onChange={(event) => onChange({ content: { ...element.content, text: event.target.value } })}
          />
        )
      ) : null}
      {element.type === "button" ? <Input label="Button URL" value={element.content.url ?? ""} onChange={(event) => onChange({ content: { ...element.content, url: event.target.value } })} /> : null}
      <div className="grid grid-cols-2 gap-2">
        <Input label="X" type="number" value={box.x} onChange={(event) => onBoxChange({ x: Number(event.target.value || 0) })} />
        <Input label="Y" type="number" value={box.y} onChange={(event) => onBoxChange({ y: Number(event.target.value || 0) })} />
        <Input label="Width" type="number" value={box.width} onChange={(event) => onBoxChange({ width: Number(event.target.value || 0) })} />
        <Input label="Height" type="number" value={box.height} onChange={(event) => onBoxChange({ height: Number(event.target.value || 0) })} />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Font Size" type="number" value={String(style.fontSize ?? 16)} onChange={(event) => onChange({ style: { ...style, fontSize: Number(event.target.value || 0) } })} />
        <Input label="Weight" type="number" value={String(style.fontWeight ?? 600)} onChange={(event) => onChange({ style: { ...style, fontWeight: Number(event.target.value || 0) } })} />
        <Input label="Text Color" value={String(style.color ?? style.textColor ?? "#ffffff")} onChange={(event) => onChange({ style: { ...style, color: event.target.value, textColor: event.target.value } })} />
        <Input label="Background" value={String(style.backgroundColor ?? "transparent")} onChange={(event) => onChange({ style: { ...style, backgroundColor: event.target.value } })} />
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
