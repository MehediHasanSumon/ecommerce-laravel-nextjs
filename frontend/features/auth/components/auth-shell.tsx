"use client";

import type { ReactNode } from "react";
import { BrandLogo } from "@/components/settings/BrandLogo";

type AuthShellProps = {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
};

export function AuthShell({ title, subtitle, children, footer }: AuthShellProps) {
  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_hsl(var(--primary)/0.14),_transparent_38%),linear-gradient(180deg,hsl(var(--background)),hsl(var(--muted)/0.35))] text-foreground">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute left-[12%] top-[10%] h-56 w-56 rounded-full bg-primary/10 blur-3xl" />
        <div className="absolute bottom-[12%] right-[10%] h-72 w-72 rounded-full bg-primary/8 blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-px bg-border/70" />
      </div>
      <div className="relative flex min-h-screen items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <section className="flex w-full max-w-[34rem] items-center justify-center">
          <div className="w-full rounded-[30px] border border-border/80 bg-background/96 px-5 py-6 shadow-[0_24px_80px_-42px_rgba(15,23,42,0.32)] backdrop-blur sm:px-8 sm:py-9">
            <div className="mb-8">
              <BrandLogo
                href="/"
                className="mb-8 justify-center"
                iconClassName="h-10 w-10 rounded-2xl ring-1 ring-border/70"
                textClassName="text-xl"
              />
              <div className="space-y-3 text-center">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground/85">
                  Account
                </p>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-[2.1rem]">
                  {title}
                </h1>
                <p className="mx-auto max-w-md text-sm leading-6 text-muted-foreground">
                  {subtitle}
                </p>
              </div>
            </div>
            {children}
            <div className="mt-6 border-t border-border/70 pt-5 text-center text-sm text-muted-foreground">
              {footer}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
