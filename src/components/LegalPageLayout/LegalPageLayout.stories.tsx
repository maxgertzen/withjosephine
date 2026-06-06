import { PRIVACY_STORY_META, PrivacyStoryContent } from "@story-fixtures/pages/legal/privacy";
import {
  REFUND_POLICY_STORY_META,
  RefundPolicyStoryContent,
} from "@story-fixtures/pages/legal/refundPolicy";
import { TERMS_STORY_META, TermsStoryContent } from "@story-fixtures/pages/legal/terms";
import type { Meta, StoryObj } from "@storybook/react";

import { LegalPageLayout } from "./LegalPageLayout";

const meta: Meta<typeof LegalPageLayout> = {
  title: "Components/Layouts/LegalPageLayout",
  component: LegalPageLayout,
};

export default meta;
type Story = StoryObj<typeof LegalPageLayout>;

export const Privacy: Story = {
  args: {
    ...PRIVACY_STORY_META,
    children: <PrivacyStoryContent />,
  },
};

export const Terms: Story = {
  args: {
    ...TERMS_STORY_META,
    children: <TermsStoryContent />,
  },
};

export const RefundPolicy: Story = {
  args: {
    ...REFUND_POLICY_STORY_META,
    children: <RefundPolicyStoryContent />,
  },
};
