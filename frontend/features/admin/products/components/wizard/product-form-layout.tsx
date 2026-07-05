"use client";

import { Check, ChevronLeft, ChevronRight, Save } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { productWizardSteps } from "@/features/admin/products/components/wizard/product-wizard-types";
import type { ProductWizardStepId } from "@/features/admin/products/components/wizard/product-wizard-types";
import { routePaths } from "@/constants/routes";
import { cn } from "@/utils/cn";

export function ProductFormLayout({
  title,
  description,
  activeStep,
  children,
  isSubmitting,
  submitLabel,
  onStepClick,
  onPrevious,
  onNext,
  onSaveDraft,
  onSubmit,
}: {
  title: string;
  description: string;
  activeStep: number;
  children: ReactNode;
  isSubmitting: boolean;
  submitLabel: string;
  onStepClick: (step: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSaveDraft: () => void;
  onSubmit: () => void;
}) {
  const isLastStep = activeStep === productWizardSteps.length - 1;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
        <Link href={routePaths.dashboard}>Dashboard</Link>
        <ChevronRight className="h-4 w-4" />
        <Link href={routePaths.adminProducts}>Product Management</Link>
        <ChevronRight className="h-4 w-4" />
        <span className="font-medium text-foreground">{title}</span>
      </div>

      <section className="rounded-lg border border-border bg-card p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" size="sm" icon={<Save className="h-4 w-4" />} onClick={onSaveDraft}>Save Draft</Button>
            <Link href={routePaths.adminProducts}>
              <Button type="button" variant="ghost" size="sm">Back to Products</Button>
            </Link>
          </div>
        </div>
      </section>

      <section className="rounded-lg border border-border bg-card">
        <div className="border-b border-border p-3">
          <div className="grid gap-2 md:grid-cols-4 xl:grid-cols-8">
            {productWizardSteps.map((step, index) => {
              const complete = index < activeStep;
              const active = index === activeStep;
              return (
                <button
                  key={step.id}
                  type="button"
                  onClick={() => onStepClick(index)}
                  className={cn(
                    "flex min-h-16 items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-left transition",
                    active ? "border-primary bg-primary/10 text-foreground" : "hover:bg-muted",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-bold",
                    complete ? "border-primary bg-primary text-primary-foreground" : active ? "border-primary text-primary" : "border-border text-muted-foreground",
                  )}>
                    {complete ? <Check className="h-3.5 w-3.5" /> : index + 1}
                  </span>
                  <span className="min-w-0 text-xs font-bold leading-snug">{step.title}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="p-4 sm:p-5">{children}</div>

        <StepNavigation
          isFirstStep={activeStep === 0}
          isLastStep={isLastStep}
          isSubmitting={isSubmitting}
          submitLabel={submitLabel}
          onPrevious={onPrevious}
          onNext={onNext}
          onSubmit={onSubmit}
        />
      </section>
    </div>
  );
}

export function StepNavigation({
  isFirstStep,
  isLastStep,
  isSubmitting,
  submitLabel,
  onPrevious,
  onNext,
  onSubmit,
}: {
  isFirstStep: boolean;
  isLastStep: boolean;
  isSubmitting: boolean;
  submitLabel: string;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:items-center sm:justify-between">
      <Button type="button" variant="secondary" icon={<ChevronLeft className="h-4 w-4" />} disabled={isFirstStep || isSubmitting} onClick={onPrevious}>
        Previous
      </Button>
      {isLastStep ? (
        <Button type="button" isLoading={isSubmitting} onClick={onSubmit}>{submitLabel}</Button>
      ) : (
        <Button type="button" icon={<ChevronRight className="h-4 w-4" />} onClick={onNext}>Next</Button>
      )}
    </div>
  );
}

export function sectionForStep(stepId: ProductWizardStepId) {
  return stepId;
}
