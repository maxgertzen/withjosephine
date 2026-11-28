import { render } from "@react-email/render";
import type { Meta, StoryObj } from "@storybook/react";

import { EMAIL_DOWNLOAD_LINK_DEFAULTS, EMAIL_NEWSLETTER_CONFIRM_DEFAULTS } from "@/data/defaults";

import { OneButtonEmail, type OneButtonEmailProps } from "./OneButtonEmail";
import { PREVIEW_FIXTURE } from "./preview-fixtures";

function EmailFrame({ html }: { html?: string }) {
  return <iframe title="Email preview" srcDoc={html} sandbox="" className="h-[100vh] w-full border-0" />;
}

const meta: Meta<typeof EmailFrame> = {
  title: "Emails/Signup",
  component: EmailFrame,
  parameters: { layout: "fullscreen" },
  render: (_args, { loaded }) => <EmailFrame html={loaded.html as string} />,
};

export default meta;
type Story = StoryObj<typeof EmailFrame>;

const htmlOf = (props: OneButtonEmailProps) => async () => ({ html: await render(<OneButtonEmail {...props} />) });

export const DownloadLink: Story = {
  loaders: [
    htmlOf({
      buttonUrl: PREVIEW_FIXTURE.downloadLinkUrl,
      vars: { downloadName: PREVIEW_FIXTURE.downloadName },
      copy: EMAIL_DOWNLOAD_LINK_DEFAULTS,
    }),
  ],
};

export const NewsletterConfirm: Story = {
  loaders: [
    htmlOf({
      buttonUrl: PREVIEW_FIXTURE.newsletterConfirmUrl,
      vars: {},
      copy: EMAIL_NEWSLETTER_CONFIRM_DEFAULTS,
    }),
  ],
};
