import {
  REFUND_POLICY_STORY_META,
  RefundPolicyStoryContent,
} from "@story-fixtures/pages/legal/refundPolicy";
import type { Meta, StoryObj } from "@storybook/react";

import { LegalPageLayout } from "@/components/LegalPageLayout";

function RefundPolicyPageRender() {
  return (
    <LegalPageLayout {...REFUND_POLICY_STORY_META}>
      <RefundPolicyStoryContent />
    </LegalPageLayout>
  );
}

const meta: Meta<typeof RefundPolicyPageRender> = {
  title: "Pages/RefundPolicy",
  component: RefundPolicyPageRender,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof RefundPolicyPageRender>;

export const Default: Story = {};
