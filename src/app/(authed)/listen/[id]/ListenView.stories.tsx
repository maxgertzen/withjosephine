import type { Meta, StoryObj } from "@storybook/react";

import { LISTEN_PAGE_DEFAULTS } from "@/data/defaults";

import { ListenView, type ListenViewState } from "./ListenView";

const SUBMISSION_ID = "sub_storybook_listen_view";

const meta: Meta<typeof ListenView> = {
  title: "Pages/ListenView",
  component: ListenView,
  parameters: {
    layout: "fullscreen",
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: `/listen/${SUBMISSION_ID}`,
        segments: [["id", SUBMISSION_ID]],
        query: {},
      },
    },
  },
};
export default meta;

type Story = StoryObj<typeof ListenView>;

const baseArgs = {
  copy: LISTEN_PAGE_DEFAULTS,
};

const deliveredState: Extract<ListenViewState, { kind: "delivered" }> = {
  kind: "delivered",
  readingName: "Soul Blueprint",
  recipientName: null,
  voiceNoteAudioPath: `/api/listen/${SUBMISSION_ID}/audio`,
  pdfDownloadPath: `/api/listen/${SUBMISSION_ID}/pdf`,
  showWelcomeRibbon: true,
};

export const SignIn: Story = {
  args: { ...baseArgs, state: { kind: "signIn", submissionId: SUBMISSION_ID } },
};

export const CheckEmail: Story = {
  args: { ...baseArgs, state: { kind: "checkEmail", submissionId: SUBMISSION_ID } },
};

export const Rested: Story = {
  args: { ...baseArgs, state: { kind: "rested", submissionId: SUBMISSION_ID } },
};

export const Throttled: Story = {
  args: { ...baseArgs, state: { kind: "throttled", submissionId: SUBMISSION_ID } },
};

export const AssetTrouble: Story = {
  args: { ...baseArgs, state: { kind: "assetTrouble", submissionId: SUBMISSION_ID } },
};

export const Delivered: Story = {
  args: { ...baseArgs, state: deliveredState },
};

export const DeliveredGiftRecipient: Story = {
  args: {
    ...baseArgs,
    state: { ...deliveredState, recipientName: "Mira" },
  },
};

export const Expired: Story = {
  args: { ...baseArgs, state: { kind: "expired", submissionId: SUBMISSION_ID } },
};
