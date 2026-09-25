import { CONTACT } from "@/src/lib/store";

// The shop's contact channels from lib/store.ts; empty ones are left out.
export default function ContactLinks({ className }: { className?: string }) {
  const links = [
    CONTACT.instagram && { label: `Instagram · @${CONTACT.instagram}`, href: `https://instagram.com/${CONTACT.instagram}` },
    CONTACT.facebook && { label: "Facebook", href: `https://facebook.com/${CONTACT.facebook}` },
    CONTACT.whatsapp && { label: `WhatsApp · +${CONTACT.whatsapp}`, href: `https://wa.me/${CONTACT.whatsapp}` },
    CONTACT.email && { label: CONTACT.email, href: `mailto:${CONTACT.email}` },
  ].filter((link): link is { label: string; href: string } => !!link);

  return (
    <ul className={className}>
      {links.map((link) => (
        <li key={link.href}>
          <a href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer">
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
