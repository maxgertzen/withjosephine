import { mergeClasses } from "@/lib/utils";
import { inputClasses, labelClasses } from "@/lib/formStyles";
import { SectionHeading } from "@/components/SectionHeading";
import { Button } from "@/components/Button";

interface ContactFormProps {
  className?: string;
}

export function ContactForm({ className }: ContactFormProps) {
  return (
    <section id="contact" className={mergeClasses("py-24 px-6", className)}>
      <div className="max-w-lg mx-auto">
        <SectionHeading
          tag="✦ Get in Touch"
          heading="i'd love to hear from you"
          className="mb-6"
        />

        <p className="font-body text-base text-j-text-muted text-center mb-12">
          If you have a question before you book, or you&rsquo;d simply like to
          say hello, please don&rsquo;t hesitate to reach out. I read every
          message personally.
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
            <Button type="submit">Send Message</Button>
          </div>
        </form>
      </div>
    </section>
  );
}
