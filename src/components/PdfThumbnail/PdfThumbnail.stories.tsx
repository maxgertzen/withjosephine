import type { Meta, StoryObj } from "@storybook/react";

import { PdfThumbnail } from "./PdfThumbnail";

// A stand-in "first page" so the with-thumbnail state is reviewable without the
// backend. Real thumbnails come from pdfjs page-1 rasterization (dex lx1j6k8r).
const samplePage = `data:image/svg+xml;utf8,${encodeURIComponent(
  `<svg xmlns='http://www.w3.org/2000/svg' width='420' height='594' viewBox='0 0 420 594'>
     <rect width='420' height='594' fill='#FAF8F4'/>
     <text x='210' y='90' text-anchor='middle' font-family='Georgia, serif' font-style='italic' font-size='30' fill='#3D3633'>Birth Chart Reading</text>
     <text x='210' y='120' text-anchor='middle' font-family='Georgia, serif' font-size='13' fill='#7A6F6A'>for Rebecca</text>
     ${Array.from({ length: 14 })
       .map((_, i) => {
         const y = 170 + i * 26;
         const w = [300, 340, 320, 350, 290][i % 5];
         return `<rect x='45' y='${y}' width='${w}' height='6' rx='3' fill='#E8D5C4' opacity='0.7'/>`;
       })
       .join("")}
   </svg>`,
)}`;

const meta: Meta<typeof PdfThumbnail> = {
  title: "Components/Listen/PdfThumbnail",
  component: PdfThumbnail,
  parameters: {
    layout: "centered",
    backgrounds: { default: "cream" },
  },
  args: {
    downloadHref: "#",
    downloadLabel: "Download PDF",
    readingName: "Birth Chart Reading",
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof PdfThumbnail>;

// Real first-page thumbnail. On desktop, hover the page to reveal the overlay.
export const WithThumbnail: Story = {
  args: { thumbnailSrc: samplePage },
};

// Fallback when no thumbnail resolved (generation failed / legacy submission).
export const PlaceholderFallback: Story = {
  args: { thumbnailSrc: null },
};

// A broken image URL falls back to the styled page via onError.
export const BrokenImageFallsBack: Story = {
  args: { thumbnailSrc: "/this-thumbnail-does-not-exist.png" },
};

// Mobile: the overlay is always visible (no hover on touch).
export const Mobile: Story = {
  args: { thumbnailSrc: samplePage },
  parameters: { viewport: { defaultViewport: "mobile1" } },
};
