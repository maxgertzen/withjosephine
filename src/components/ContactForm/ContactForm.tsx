import { mergeClasses } from "@/lib/utils";
import { inputClasses, labelClasses } from "@/lib/formStyles";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/Button";

interface ContactFormContent {
  sectionTag: string;
  heading: string;
  description: string;
  submitText: string;
}

const CONTACT_DEFAULTS: ContactFormContent = {
  sectionTag: "\u2726 Get in Touch",
  heading: "i\u2019d love to hear from you",
  description:
    "If you have a question before you book, or you\u2019d simply like to say hello, please don\u2019t hesitate to reach out. I read every message personally.",
  submitText: "Send Message",
};

interface ContactFormProps {
  content?: ContactFormContent;
  className?: string;
}

export function ContactForm({ content, className }: ContactFormProps) {
  const { sectionTag, heading, description, submitText } = content ?? CONTACT_DEFAULTS;

  return (
    <section id="contact" className={mergeClasses("py-24 px-6", className)}>
      <div className="max-w-lg mx-auto">
        <SectionHeading
          tag={sectionTag}
          heading={heading}
          className="mb-6"
        />

        <p className="font-body text-base text-j-text-muted text-center mb-12">
          {description}
        </p>

        <form action="#" className="flex flex-col gap-6">
          <div>
            <label htmlFor="contact-name" className={labelClasses}>
              Your Name
            </label>
            <input
              id="contact-name"
              type="text"
              name="name"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="contact-email" className={labelClasses}>
              Your Email
            </label>
            <input
              id="contact-email"
              type="email"
              name="email"
              className={inputClasses}
            />
          </div>

          <div>
            <label htmlFor="contact-message" className={labelClasses}>
              Your Message
            </label>
            <textarea
              id="contact-message"
              name="message"
              rows={5}
              className={inputClasses}
            />
          </div>

          <div className="text-center">
            <Button type="submit">{submitText}</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
