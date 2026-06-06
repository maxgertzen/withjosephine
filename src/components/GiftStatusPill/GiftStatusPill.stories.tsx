import type { Meta, StoryObj } from "@storybook/react";

import { MY_GIFTS_PAGE_DEFAULTS } from "@/data/defaults";
import { GIFT_STATUS_KIND } from "@/lib/booking/constants";
import type { GiftStatus } from "@/lib/booking/giftStatus";

import { GiftStatusPill } from "./GiftStatusPill";

const SAMPLE_DATE = "2026-06-15T14:30:00.000Z";

const meta: Meta<typeof GiftStatusPill> = {
  title: "Components/Feedback/GiftStatusPill",
  component: GiftStatusPill,
  args: { copy: MY_GIFTS_PAGE_DEFAULTS },
};

export default meta;
type Story = StoryObj<typeof GiftStatusPill>;

const scheduled: GiftStatus = { kind: GIFT_STATUS_KIND.scheduled, sendAt: SAMPLE_DATE };
const selfSendReady: GiftStatus = { kind: GIFT_STATUS_KIND.selfSendReady, firedAt: null };
const sent: GiftStatus = { kind: GIFT_STATUS_KIND.sentWaitingRecipient, firedAt: SAMPLE_DATE };
const preparing: GiftStatus = {
  kind: GIFT_STATUS_KIND.recipientPreparing,
  claimedAt: SAMPLE_DATE,
};
const delivered: GiftStatus = { kind: GIFT_STATUS_KIND.delivered, deliveredAt: SAMPLE_DATE };
const cancelled: GiftStatus = { kind: GIFT_STATUS_KIND.cancelled, cancelledAt: SAMPLE_DATE };

export const Scheduled: Story = { args: { status: scheduled } };
export const SelfSendReady: Story = { args: { status: selfSendReady } };
export const SentWaitingRecipient: Story = { args: { status: sent } };
export const RecipientPreparing: Story = { args: { status: preparing } };
export const Delivered: Story = { args: { status: delivered } };
export const Cancelled: Story = { args: { status: cancelled } };
