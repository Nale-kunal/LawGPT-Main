import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number | string;
}

export function BrandLogo({ className, size = 32 }: BrandLogoProps) {
  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-sm bg-black", className)}>
      <img
        src="/logo.png"
        alt="Juriq Logo"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
      />
    </div>
  );
}
