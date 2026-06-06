import { TERMS_STORY_META, TermsStoryContent } from "@story-fixtures/pages/legal/terms";
import type { Meta, StoryObj } from "@storybook/react";

import { LegalPageLayout } from "@/components/LegalPageLayout";

function TermsPageRender() {
  return (
    <LegalPageLayout {...TERMS_STORY_META}>
      <TermsStoryContent />
    </LegalPageLayout>
  );
}

const meta: Meta<typeof TermsPageRender> = {
  title: "Pages/Terms",
  component: TermsPageRender,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof TermsPageRender>;

export const Default: Story = {};
