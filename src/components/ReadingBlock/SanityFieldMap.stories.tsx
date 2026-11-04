import { render } from "@react-email/render";
import type { Meta, StoryObj } from "@storybook/react";
import { userEvent, within } from "storybook/test";

import { NewsletterConfirmView } from "@/app/newsletter/confirm/NewsletterConfirmView";
import { EmailFirstButton } from "@/app/tt/EmailFirstButton";
import { footerNewsletterSlot } from "@/components/Footer/footerNewsletterSlot";
import { ReadingCard } from "@/components/ReadingCard";
import type { EmailOneButtonContent } from "@/data/defaults";
import { OneButtonEmail } from "@/lib/emails/OneButtonEmail";
import {
  FIELD_MAP_DOWNLOAD_EMAIL,
  FIELD_MAP_NEWSLETTER_CONFIRM_EMAIL,
  FIELD_MAP_STORED_NEWSLETTER,
  fieldMapLinksPageEmailForm,
  fieldMapNewsletterContent,
} from "@/lib/signup/signupFieldMapFixture";

import { ReadingBlockPreview } from "./ReadingBlockPreview";
import { fieldMapBlockProps, fieldMapCardProps } from "./sanityFieldMapFixture";

const meta: Meta = {
  title: "Sanity field map",
  parameters: {
    docs: {
      description: {
        component:
          "Every visible text shows the Studio place, Studio title and field that feeds it, run through the same mapping code as the live pages.",
      },
    },
  },
};
export default meta;

type Story = StoryObj;

const CARD = fieldMapCardProps();
const BLOCK = fieldMapBlockProps();

export const HomepageReadingCard: Story = {
  render: () => (
    <div className="max-w-xl bg-j-warm p-6">
      <ReadingCard {...CARD} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: CARD.labels.learnMoreLabel }));
  },
};

export const BookingPageReadingBlock: Story = {
  render: () => (
    <div className="max-w-3xl bg-j-ivory p-6">
      <ReadingBlockPreview {...BLOCK} />
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    for (const section of BLOCK.sections) {
      if (section.kind === "list") await userEvent.click(canvas.getByRole("button", { name: section.title }));
    }
  },
};

const NEWSLETTER = fieldMapNewsletterContent();
const LINKS_EMAIL_FORM = fieldMapLinksPageEmailForm();

export const FooterNewsletterBox: Story = {
  render: () => <div className="max-w-xl bg-j-cream p-6">{footerNewsletterSlot(FIELD_MAP_STORED_NEWSLETTER)}</div>,
};

export const LinksPageButtonAskingForEmail: Story = {
  render: () => (
    <div className="mx-auto max-w-md bg-j-cream p-6">
      <EmailFirstButton
        buttonKey={LINKS_EMAIL_FORM.button.key}
        className="w-full rounded-[50px] bg-j-bg-interactive px-6 py-3 font-body text-j-text-on-dark"
        words={LINKS_EMAIL_FORM.words}
        offersNewsletter
        consent={LINKS_EMAIL_FORM.consent}
        trackingAttributes={{}}
      >
        {LINKS_EMAIL_FORM.button.label}
      </EmailFirstButton>
    </div>
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: LINKS_EMAIL_FORM.button.label }));
  },
};

export const NewsletterConfirmPageAsk: Story = {
  render: () => <NewsletterConfirmView words={NEWSLETTER} state={{ kind: "ask", token: "field-map" }} />,
};

export const NewsletterConfirmPageConfirmed: Story = {
  render: () => <NewsletterConfirmView words={NEWSLETTER} state={{ kind: "confirmed" }} />,
};

export const NewsletterConfirmPageLinkDidNotWork: Story = {
  render: () => <NewsletterConfirmView words={NEWSLETTER} state={{ kind: "failed" }} />,
};

const emailHtml = (copy: EmailOneButtonContent, buttonUrl: string) => async () => ({
  html: await render(<OneButtonEmail buttonUrl={buttonUrl} vars={{}} copy={copy} />),
});

const EmailFrame = ({ html }: { html: string }) => (
  <iframe title="Email preview" srcDoc={html} sandbox="" className="h-[100vh] w-full border-0" />
);

export const DownloadLinkEmail: Story = {
  loaders: [emailHtml(FIELD_MAP_DOWNLOAD_EMAIL, "https://cdn.sanity.io/files/preview/production/guide.pdf?dl=")],
  render: (_args, { loaded }) => <EmailFrame html={loaded.html as string} />,
};

export const NewsletterConfirmEmail: Story = {
  loaders: [emailHtml(FIELD_MAP_NEWSLETTER_CONFIRM_EMAIL, "https://withjosephine.com/newsletter/confirm?token=preview")],
  render: (_args, { loaded }) => <EmailFrame html={loaded.html as string} />,
};
