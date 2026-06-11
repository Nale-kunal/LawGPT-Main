import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  size?: number | string;
}

/**
 * BrandLogo — renders the Juriq logo at the requested size.
 *
 * Uses a <picture> element with WebP as the primary source and PNG as the
 * fallback. At 32px display size, serving the optimized WebP (~3 KB) instead
 * of the original logo.png (591 KB) saves ~577 KB per page load.
 *
 * Size variants:
 *  32px  — navbar, initial loader, favicons
 *  64px  — larger display contexts
 */
export function BrandLogo({ className, size = 32 }: BrandLogoProps) {
  const px = typeof size === "number" ? size : parseInt(size as string, 10);
  // Use the 64px variant for sizes > 40px, otherwise the 32px variant
  const srcSet = px > 40
    ? { webp: "/favicon-64.webp", png: "/favicon-64.png" }
    : { webp: "/favicon-32.webp", png: "/favicon-32.png" };

  return (
    <div className={cn("relative flex items-center justify-center overflow-hidden rounded-sm bg-black", className)}>
      <picture>
        <source srcSet={srcSet.webp} type="image/webp" />
        <img
          src={srcSet.png}
          alt="Juriq Logo"
          width={size}
          height={size}
          className="object-contain"
          style={{ width: size, height: size }}
          loading="eager"
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {...({ fetchpriority: 'high' } as any)}
        />
      </picture>
    </div>
  );
}
