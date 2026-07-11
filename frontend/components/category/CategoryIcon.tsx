import { cn } from "@/utils/cn";

type CategoryIconProps = {
  icon?: string | null;
  name: string;
  className?: string;
};

function isImageIcon(value: string) {
  return (
    value.endsWith(".svg") ||
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/storage/") ||
    value.startsWith("storage/") ||
    value.startsWith("data:image/svg")
  );
}

export function CategoryIcon({ icon, name, className }: CategoryIconProps) {
  const value = icon?.trim();

  if (value && isImageIcon(value)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={value}
        alt=""
        className={cn("h-full w-full object-contain", className)}
        loading="lazy"
      />
    );
  }

  return <>{value || name.slice(0, 1)}</>;
}
