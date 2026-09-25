// The one place a plain <img> is used: product photos come from any address
// the admin pastes, so next/image's allow-list doesn't fit.
export default function Img({ src, alt, className }: { src: string; alt: string; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} className={className} loading="lazy" decoding="async" />
  );
}
