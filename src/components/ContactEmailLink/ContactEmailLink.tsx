import { CONTACT_EMAIL } from "@/lib/constants";

export function ContactEmailLink() {
  return (
    <a href={`mailto:${CONTACT_EMAIL}`} className="text-j-text-gold hover:underline">
      {CONTACT_EMAIL}
    </a>
  );
}
