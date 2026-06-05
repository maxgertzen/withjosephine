import type { Meta, StoryObj } from "@storybook/react";

import { Button } from "@/components/Button";
import { Portal } from "@/components/Portal";
import { NOT_FOUND_PAGE_DEFAULTS } from "@/data/defaults";

interface NotFoundRenderProps {
  tag: string;
  heading: string;
  description: string;
  buttonText: string;
}

function NotFoundRender({ tag, heading, description, buttonText }: NotFoundRenderProps) {
  return (
    <div className="relative min-h-screen bg-j-cream flex flex-col items-center justify-center px-6 text-center overflow-hidden">
      <div className="relative z-10 flex flex-col items-center">
        <Portal />

        <span className="text-[0.68rem] tracking-[0.22em] uppercase text-j-accent font-body block mb-4 mt-8">
          {tag}
        </span>

        <h1 className="font-display text-[clamp(2.5rem,6vw,4rem)] font-light italic text-j-text-heading leading-tight">
          {heading}
        </h1>

        <p className="font-display text-lg italic text-j-text-muted mt-4 max-w-md mx-auto">
          {description}
        </p>

        <div className="mt-10">
          <Button href="/" variant="primary" size="lg">
            {buttonText}
          </Button>
        </div>
      </div>
    </div>
  );
}

const meta: Meta<typeof NotFoundRender> = {
  title: "Pages/NotFound",
  component: NotFoundRender,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof NotFoundRender>;

export const Default: Story = {
  args: NOT_FOUND_PAGE_DEFAULTS,
};

export const CustomCopy: Story = {
  args: {
    tag: "✦ Off the path",
    heading: "you've wandered somewhere quiet",
    description: "There's nothing here, but the way back is always lit.",
    buttonText: "Return to the start",
  },
};
