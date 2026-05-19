export function RecipientEmailEscapeHatch({ recipientEmail }: { recipientEmail: string | null }) {
  return (
    <p className="font-body text-sm text-j-text-muted leading-relaxed mb-10 max-w-[50ch]">
      {recipientEmail ? (
        <>
          We have <span className="text-j-text">{recipientEmail.toLowerCase()}</span> on file for
          this gift, so the email field below is locked. If that&rsquo;s the wrong address,{" "}
          <ContactLink>contact us</ContactLink> before continuing.
        </>
      ) : (
        <>
          Enter the email you&rsquo;d like Josephine to use for delivery. Need help?{" "}
          <ContactLink>Contact us</ContactLink>.
        </>
      )}
    </p>
  );
}

function ContactLink({ children }: { children: React.ReactNode }) {
  return (
    <a href="/contact" className="underline decoration-j-rose/40 hover:decoration-j-text-heading">
      {children}
    </a>
  );
}
