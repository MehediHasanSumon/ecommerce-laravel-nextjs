"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";
import Image from "next/image";
import {
  selectCompanyLogo,
  selectCompanyName,
  selectSettingsPending,
  useSettingsStore,
} from "@/store/settings-store";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
  href?: string;
  ariaLabel?: string;
};

export function BrandLogo({
  className,
  iconClassName,
  textClassName,
  showText = true,
  href,
  ariaLabel,
}: BrandLogoProps) {
  const siteName = useSettingsStore(selectCompanyName);
  const logo = useSettingsStore(selectCompanyLogo);
  const isLoading = useSettingsStore(selectSettingsPending);

  const content = (
    <span className={cn("flex min-w-0 max-w-full items-center gap-2", className)}>
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-primary text-primary-foreground",
          iconClassName,
        )}
      >
        {isLoading ? (
          <span className="h-full w-full animate-pulse bg-muted" />
        ) : logo ? (
          <Image
            src={logo}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-full w-full object-contain"
          />
        ) : (
          <ShoppingBag className="h-[55%] w-[55%]" />
        )}
      </span>
      {showText ? (
        <span className={cn("block min-w-0 max-w-full truncate font-bold text-foreground", textClassName)}>
          {isLoading ? (
            <span className="block h-5 w-28 animate-pulse rounded bg-muted" />
          ) : (
            siteName
          )}
        </span>
      ) : null}
    </span>
  );

  if (href) {
    return (
      <Link href={href} aria-label={ariaLabel ?? siteName ?? "Home"}>
        {content}
      </Link>
    );
  }

  return content;
}
