const r2PublicHost = process.env.NEXT_PUBLIC_R2_PUBLIC_HOST;
if (!r2PublicHost) {
  throw new Error(
    "NEXT_PUBLIC_R2_PUBLIC_HOST is required — set it in your GH Environment / repo variables, .env.local, or vitest config",
  );
}

export const R2_PUBLIC_ORIGIN = `https://${r2PublicHost}`;
