"use client";

import { type FormEvent, type ReactNode, useState } from "react";

import { Button } from "@/components/Button";
import { InlineError } from "@/components/Form/InlineError";
import { Input } from "@/components/Form/Input";
import { GiftMessageCard } from "@/components/GiftMessageCard";
import { InvisibleTurnstile } from "@/components/InvisibleTurnstile";
import { CLARITY_MASK_PROPS } from "@/lib/clarity";
import { applyTokens } from "@/lib/emails/applyTokens";
import { formatLongDate } from "@/lib/formatDate";
import { errorClasses } from "@/lib/formStyles";
import {
  GIFT_RECIPIENT_NAME_MAX_CHARS,
  type GiftSendRequest,
  type GiftSendStatus,
  type GiftSendSummary,
} from "@/lib/gift/giftSendContract";
import { jsonPost } from "@/lib/http/jsonPost";
import { GIFT_SEND_API_ROUTE } from "@/lib/http/routes";
import { useTurnstileChallenge } from "@/lib/intake/useTurnstileChallenge";
import { goldLinkClasses } from "@/lib/textStyles";

import type { GiftSendCopy } from "./giftSendCopy";

const RESENDS_LEFT_AFTER_FIRST_SEND = 1;

export type GiftSendFormProps = {
  token: string;
  status: GiftSendStatus;
  copy: GiftSendCopy;
  disabled?: boolean;
  readyHeading?: string;
};

type CardState = Exclude<GiftSendStatus["state"], "ready" | "sent">;

type SentView = {
  kind: "sent";
  summary: GiftSendSummary;
  lastSentAt: string | null;
  typedEmail: string | null;
  canResend: boolean;
};

type FormView =
  | { kind: "form"; summary: GiftSendSummary; expectedSendCount: 0 | 1 }
  | SentView
  | { kind: CardState };

type SendSuccess = { state: "sent" | "used"; recipientName: string; lastSentAt: string };

type SendErrorBody = {
  fieldErrors?: { recipientName?: string; recipientEmail?: string };
} & (GiftSendStatus | { state?: undefined });

const CARD_COPY_KEYS: Record<CardState, { heading: keyof GiftSendCopy; body: keyof GiftSendCopy }> =
  {
    used: { heading: "resendUsedHeading", body: "resendUsedBody" },
    opened: { heading: "sendPageOpenedHeadingTemplate", body: "sendPageOpenedBody" },
    invalid: { heading: "sendLinkInvalidHeading", body: "sendLinkInvalidBody" },
  };

function viewForStatus(status: GiftSendStatus): FormView {
  switch (status.state) {
    case "ready":
      return { kind: "form", summary: status, expectedSendCount: 0 };
    case "sent":
      return {
        kind: "sent",
        summary: status,
        lastSentAt: status.lastSentAt,
        typedEmail: null,
        canResend: true,
      };
    default:
      return { kind: status.state };
  }
}

function currentNoteSummary(status: GiftSendStatus, fallback: GiftSendSummary): GiftSendSummary {
  return status.state === "ready" || status.state === "sent" ? status : fallback;
}

function emailErrorCopy(code: string | undefined, copy: GiftSendCopy): string | null {
  if (code === "invalid_email") return copy.recipientEmailInvalid;
  if (code === "own_email") return copy.recipientEmailIsBuyer;
  return null;
}

function sentCardText(
  view: SentView,
  copy: GiftSendCopy,
): { heading: string; body: string | null } {
  const { summary, typedEmail, lastSentAt } = view;
  const { recipientName } = summary;
  if (typedEmail !== null) {
    return {
      heading: applyTokens(copy.sentHeadingTemplate, { recipientName }),
      body: applyTokens(copy.sentBodyTemplate, { recipientEmail: typedEmail }),
    };
  }
  return {
    heading: copy.alreadySentHeading,
    body: lastSentAt
      ? applyTokens(copy.alreadySentBodyTemplate, {
          recipientName,
          date: formatLongDate(lastSentAt),
        })
      : null,
  };
}

function StateCard({
  heading,
  body,
  action,
}: {
  heading: string;
  body: string | null;
  action?: ReactNode;
}) {
  return (
    <GiftMessageCard
      heading={heading}
      body={body ? <p className="m-0">{body}</p> : null}
      action={action}
    />
  );
}

export function GiftSendForm({
  token,
  status,
  copy,
  disabled = false,
  readyHeading,
}: GiftSendFormProps) {
  const [view, setView] = useState<FormView>(() => viewForStatus(status));
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [emailError, setEmailError] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const turnstile = useTurnstileChallenge();

  function reopenForm(sent: SentView) {
    setRecipientName(sent.summary.recipientName ?? "");
    setRecipientEmail("");
    setEmailError(null);
    setFailed(false);
    setView({ kind: "form", summary: sent.summary, expectedSendCount: 1 });
  }

  async function postSend(fields: Omit<GiftSendRequest, "turnstileToken">) {
    const turnstileToken = await turnstile.requestFreshToken();
    if (turnstile.turnstileRequired && !turnstileToken) return null;
    const request: GiftSendRequest = { ...fields, turnstileToken: turnstileToken ?? "" };
    return jsonPost<SendSuccess>(GIFT_SEND_API_ROUTE, request);
  }

  async function send(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (disabled || isSending || view.kind !== "form") return;
    setEmailError(null);
    setFailed(false);
    setIsSending(true);

    const typedEmail = recipientEmail.trim();
    const result = await postSend({
      token,
      expectedSendCount: view.expectedSendCount,
      recipientName,
      recipientEmail: typedEmail,
    });
    setIsSending(false);

    if (result?.ok && result.data) {
      setView({
        kind: "sent",
        summary: { ...view.summary, recipientName: result.data.recipientName },
        lastSentAt: result.data.lastSentAt,
        typedEmail,
        canResend: result.data.state === "sent",
      });
      return;
    }

    const body = (result?.errorBody ?? null) as SendErrorBody | null;
    if (body?.state) {
      setView(viewForStatus(body));
      if (body.state === "ready") setFailed(true);
      return;
    }
    const fieldError = emailErrorCopy(body?.fieldErrors?.recipientEmail, copy);
    if (fieldError) setEmailError(fieldError);
    else setFailed(true);
  }

  if (view.kind === "sent") {
    const { heading, body } = sentCardText(view, copy);
    return (
      <div {...CLARITY_MASK_PROPS} className="w-full">
        <StateCard
          heading={heading}
          body={body}
          action={
            view.canResend ? (
              <button
                type="button"
                onClick={() => reopenForm(view)}
                className={`${goldLinkClasses} min-h-11 font-body text-sm`}
              >
                {applyTokens(copy.resendLinkTemplate, { count: RESENDS_LEFT_AFTER_FIRST_SEND })}
              </button>
            ) : undefined
          }
        />
      </div>
    );
  }
  if (view.kind !== "form") {
    const keys = CARD_COPY_KEYS[view.kind];
    return <StateCard heading={copy[keys.heading]} body={copy[keys.body]} />;
  }

  const isFirstSend = view.expectedSendCount === 0;
  const heading = isFirstSend && readyHeading ? readyHeading : copy.sendHeading;
  const { buyerName, hasNote } = currentNoteSummary(status, view.summary);
  const helpTemplate = hasNote ? copy.sendHelpTemplate : copy.sendHelpNoNoteTemplate;
  return (
    <form
      {...CLARITY_MASK_PROPS}
      onSubmit={send}
      aria-labelledby="gift-send-heading"
      className="flex w-full flex-col gap-4 text-left"
    >
      <h2 id="gift-send-heading" className="font-display italic text-xl text-j-text-heading">
        {heading}
      </h2>
      <Input
        id="gift-send-name"
        name="recipientName"
        label={copy.recipientNameLabel}
        value={recipientName}
        onChange={setRecipientName}
        maxLength={GIFT_RECIPIENT_NAME_MAX_CHARS}
        autoComplete="off"
        enterKeyHint="next"
        required
      />
      <Input
        id="gift-send-email"
        name="recipientEmail"
        type="email"
        label={copy.recipientEmailLabel}
        value={recipientEmail}
        onChange={(value) => {
          setRecipientEmail(value);
          setEmailError(null);
        }}
        error={emailError ?? undefined}
        autoComplete="off"
        enterKeyHint="send"
        required
      />
      <p className="m-0 font-body text-sm leading-relaxed text-j-text-muted">
        {applyTokens(helpTemplate, { buyerName })}
      </p>
      <InvisibleTurnstile challenge={turnstile} />
      <Button
        type="submit"
        disabled={disabled || isSending}
        className="w-full min-h-11 indent-[0.12em]"
      >
        {isSending ? copy.sendingLabel : copy.sendButtonLabel}
      </Button>
      <InlineError message={failed ? copy.sendFailedNotice : null} className={errorClasses} />
    </form>
  );
}
