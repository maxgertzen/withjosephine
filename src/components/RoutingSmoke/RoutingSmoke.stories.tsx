"use client";

import type { Meta, StoryObj } from "@storybook/react";
import { useParams, usePathname, useRouter, useSearchParams } from "next/navigation";

function RoutingSmoke() {
  const params = useParams<{ id?: string }>();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <dl style={{ fontFamily: "monospace", fontSize: "14px", lineHeight: 1.6 }}>
      <dt>useParams()</dt>
      <dd data-testid="routing-smoke-params">{JSON.stringify(params)}</dd>

      <dt>useSearchParams().toString()</dt>
      <dd data-testid="routing-smoke-search">
        {searchParams ? (searchParams.toString() || "(empty)") : "null"}
      </dd>

      <dt>usePathname()</dt>
      <dd data-testid="routing-smoke-pathname">{pathname ?? "null"}</dd>

      <dt>useRouter() shape</dt>
      <dd data-testid="routing-smoke-router">
        {router ? Object.keys(router).sort().join(",") : "null"}
      </dd>
    </dl>
  );
}

const meta: Meta<typeof RoutingSmoke> = {
  title: "Smoke/RoutingHooks",
  component: RoutingSmoke,
};
export default meta;

type Story = StoryObj<typeof RoutingSmoke>;

export const ListenPath: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/listen/abc-123",
        segments: [["id", "abc-123"]],
        query: { welcome: "1" },
      },
    },
  },
};

export const BookingIntakePath: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/book/soul-blueprint/intake",
        segments: [["readingId", "soul-blueprint"]],
        query: {},
      },
    },
  },
};

export const NoParams: Story = {
  parameters: {
    nextjs: {
      appDirectory: true,
      navigation: {
        pathname: "/",
        segments: [],
      },
    },
  },
};
