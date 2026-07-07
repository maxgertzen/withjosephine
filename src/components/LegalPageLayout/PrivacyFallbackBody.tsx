import { ContactEmailLink } from "@/components/ContactEmailLink";

export function PrivacyFallbackBody() {
  return (
    <>
      <section className="flex flex-col gap-5">
        <p className="font-body text-base text-j-text leading-[1.9] font-light">
          This policy explains what information Josephine collects when you book a reading, why
          it&rsquo;s collected, who it&rsquo;s shared with, and the rights you have over it. It
          covers <span className="italic">withjosephine.com</span> and any subdomains of it.
        </p>
        <p className="font-body text-base text-j-text-muted leading-[1.9] font-light">
          Josephine is the sole data controller for everything described here. There is no team -
          it&rsquo;s one person reading for you.
        </p>
      </section>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        What is collected
      </h2>
      <ul className="flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>
          <strong className="font-medium">Contact details</strong>: your name and email address,
          which you provide when booking.
        </li>
        <li>
          <strong className="font-medium">Reading details</strong>: the inputs Josephine needs to
          prepare your reading, submitted through the intake form after booking. What is collected
          depends on which reading you book:
          <ul className="mt-2 flex flex-col gap-2 list-disc pl-5">
            <li>
              <em>Birth Chart Reading</em>: your date, time, and place of birth. No name or
              photograph is required.
            </li>
            <li>
              <em>Akashic Record Reading</em>: your full name and a recent photograph with your eyes
              open.
            </li>
            <li>
              <em>Soul Blueprint Reading</em>: both of the above combined.
            </li>
          </ul>
        </li>
        <li>
          <strong className="font-medium">Payment information</strong>: handled entirely by Stripe.
          Josephine never sees your card number, CVV, or full billing address. She only receives a
          confirmation that you paid, along with the email you used at checkout.
        </li>
        <li>
          <strong className="font-medium">Basic technical data</strong>: IP address, browser, and
          referrer, logged by Cloudflare for abuse protection.
        </li>
        <li>
          <strong className="font-medium">Anonymous usage analytics</strong>: see the &ldquo;Cookies
          &amp; analytics&rdquo; section below.
        </li>
      </ul>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Why it&rsquo;s collected
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Solely to create and deliver your reading, to contact you about it, and to comply with tax
        and accounting obligations. Your information is not used for marketing and is not sold or
        rented to anyone.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Who it&rsquo;s shared with
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        A small, deliberate set of processors operate the website and the delivery workflow:
      </p>
      <ul className="mt-3 flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>
          <strong className="font-medium">Stripe</strong>: processes your payment. See{" "}
          <a
            href="https://stripe.com/privacy"
            target="_blank"
            rel="noopener noreferrer"
            className="text-j-accent hover:underline"
          >
            Stripe&rsquo;s privacy policy
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
          .
        </li>
        <li>
          <strong className="font-medium">Cloudflare</strong>: hosting, DNS, email routing,
          anti-spam, and secure storage of your uploaded photograph.
        </li>
        <li>
          <strong className="font-medium">Sanity</strong>: the content system for the site, and the
          secure store that holds your reading - your intake answers and your delivered voice note
          and PDF.
        </li>
        <li>
          <strong className="font-medium">Resend</strong>: sends Josephine&rsquo;s booking and admin
          emails.
        </li>
        <li>
          <strong className="font-medium">Brevo</strong>: sends customer emails and, if you
          subscribe, the newsletter (EU-based).
        </li>
        <li>
          <strong className="font-medium">Mixpanel</strong>: anonymous funnel analytics. No name,
          email, photograph, or birth details are ever sent to it.
        </li>
        <li>
          <strong className="font-medium">Microsoft Clarity</strong>: anonymous session analytics;
          your form entries are masked before anything is recorded.
        </li>
        <li>
          <strong className="font-medium">Sentry</strong>: error monitoring, so faults can be
          diagnosed.
        </li>
      </ul>
      <p className="font-body text-base text-j-text-muted leading-[1.9] font-light mt-3">
        Each processor has its own privacy policy. Data shared with them is limited to what&rsquo;s
        needed for that specific function.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        How long it&rsquo;s kept
      </h2>
      <ul className="flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>
          Your <strong className="font-medium">reading</strong> (intake answers, voice note, PDF,
          and - for an Akashic reading - your photograph) is kept for up to{" "}
          <strong className="font-medium">3 years</strong> from your booking, then permanently
          deleted, unless you ask for it to be deleted sooner.
        </li>
        <li>
          After delivery, your <strong className="font-medium">voice note and PDF</strong> stay
          reachable from your unique reading link for{" "}
          <strong className="font-medium">90 days</strong>. After that the link expires; email{" "}
          <ContactEmailLink /> and Josephine can re-issue it while your reading is still held.
        </li>
        <li>
          Your uploaded <strong className="font-medium">photograph</strong> is removed from image
          storage within <strong className="font-medium">90 days</strong> of payment.
        </li>
        <li>
          <strong className="font-medium">Payment records</strong> are kept for{" "}
          <strong className="font-medium">6 years</strong> to meet UK tax and accounting
          requirements. If you ask for deletion, the identifying fields are redacted while the
          minimal transaction record is retained as legally required.
        </li>
        <li>
          Intake forms that never lead to a payment are deleted within about{" "}
          <strong className="font-medium">30 days</strong>.
        </li>
        <li>Contact-form messages that do not lead to a booking are deleted once resolved.</li>
      </ul>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        International access to your data
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Josephine works remotely and may access your information from countries outside the United
        Kingdom and the European Economic Area, including countries that do not have a UK or EU
        adequacy decision. When that happens, the transfer is necessary for the performance of your
        booking contract with Josephine (UK GDPR / GDPR Article 49(1)(b)). Several processors are
        US-based (Stripe, Sanity, Mixpanel, Microsoft) and operate under the EU-US / UK Data Privacy
        Framework and Standard Contractual Clauses. Your data is not stored long-term on personal
        devices.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        California residents (CCPA / CPRA)
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        If you are a California resident, you have the right to know what personal information is
        collected about you, to request its deletion, and to correct inaccurate information.
        Josephine does not{" "}
        <strong className="font-medium">sell or share your personal information</strong> for
        cross-context behavioural advertising, and has not done so in the previous 12 months. To
        exercise any CCPA right, email <ContactEmailLink />.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Your rights</h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Depending on where you live, you have rights under GDPR, UK GDPR, or CCPA. You can ask
        Josephine to:
      </p>
      <ul className="mt-3 flex flex-col gap-3 font-body text-base text-j-text leading-[1.9] font-light list-disc pl-5">
        <li>Show you what she holds about you.</li>
        <li>Correct anything that&rsquo;s wrong.</li>
        <li>Delete your information (subject to legal records-retention obligations above).</li>
        <li>Stop processing it for anything beyond the reading itself.</li>
      </ul>
      <p className="font-body text-base text-j-text leading-[1.9] font-light mt-3">
        To request a copy of your data, or for any other request, email <ContactEmailLink />. She
        responds within 30 days.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Cookies &amp; analytics
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        The site uses no advertising cookies, no ad pixels, and no social-media tracking. It does
        use two privacy-preserving analytics tools - Mixpanel (anonymous funnel metrics) and
        Microsoft Clarity (anonymous session analytics with your form entries masked). If
        you&rsquo;re in the EU/EEA, UK, Switzerland, or California, you&rsquo;ll see a consent
        banner and nothing analytics-related runs until you accept. The only other persistent
        storage is what Stripe sets for checkout (governed by Stripe&rsquo;s policy).
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Children</h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Readings are for people aged 18 and over. Information about minors is not knowingly
        collected. If you believe a minor has submitted information through the site, email{" "}
        <ContactEmailLink /> and it will be deleted.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">
        Changes to this policy
      </h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        When this policy changes, the &ldquo;Last updated&rdquo; date at the top will change too.
        Material changes will be flagged on the homepage for a reasonable period.
      </p>

      <h2 className="font-display text-2xl italic text-j-text-heading mt-12 mb-4">Contact</h2>
      <p className="font-body text-base text-j-text leading-[1.9] font-light">
        Questions about this policy, or about anything Josephine holds about you, go to{" "}
        <ContactEmailLink />.
      </p>
    </>
  );
}
