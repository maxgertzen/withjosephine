import { PRIVACY_STORY_META, PrivacyStoryContent } from "@story-fixtures/pages/legal/privacy";
import type { Meta, StoryObj } from "@storybook/react";

import { LegalPageLayout } from "@/components/LegalPageLayout";

function PrivacyPageRender() {
  return (
    <LegalPageLayout {...PRIVACY_STORY_META}>
      <PrivacyStoryContent />
    </LegalPageLayout>
  );
}

const meta: Meta<typeof PrivacyPageRender> = {
  title: "Pages/Privacy",
  component: PrivacyPageRender,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof PrivacyPageRender>;

export const Default: Story = {};
