/* eslint-disable @next/next/no-page-custom-font, @next/next/no-html-link-for-pages */
"use client";

import { useEffect } from "react";

import { captureException } from "@/lib/sentry-client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global-error]", error);
    captureException(error);
  }, [error]);
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;1,300&family=Inter:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              body {
                margin: 0;
                min-height: 100vh;
                display: flex;
                align-items: center;
                justify-content: center;
                background: #FAF8F4;
                color: #3D3633;
                font-family: 'Inter', sans-serif;
                text-align: center;
                padding: 1.5rem;
              }
              h1 {
                font-family: 'Cormorant Garamond', serif;
                font-weight: 300;
                font-style: italic;
                font-size: clamp(2rem, 5vw, 3.2rem);
                line-height: 1.2;
                color: #3D3633;
                margin: 0 0 1rem;
              }
              p {
                color: #7A6F6A;
                margin: 0 0 2rem;
                max-width: 28rem;
              }
              .actions { display: flex; gap: 1rem; justify-content: center; }
              button, a {
                display: inline-block;
                padding: 0.75rem 1.5rem;
                border-radius: 50px;
                font-family: 'Inter', sans-serif;
                font-size: 0.82rem;
                text-transform: uppercase;
                letter-spacing: 0.12em;
                font-weight: 500;
                cursor: pointer;
                text-decoration: none;
                transition: opacity 0.2s;
              }
              button {
                background: #1C1935;
                color: #FAF8F4;
                border: none;
              }
              a {
                background: transparent;
                color: #7A6F6A;
              }
              button:hover, a:hover { opacity: 0.8; }
              .tag {
                font-size: 0.68rem;
                letter-spacing: 0.22em;
                text-transform: uppercase;
                color: #C4A46B;
                margin-bottom: 1rem;
              }
            `,
          }}
        />
      </head>
      <body>
        <div>
          <div className="tag">✦ Something Went Wrong</div>
          <h1>an unexpected error occurred</h1>
          <p>
            We&apos;re sorry for the inconvenience. Please try again or return to the homepage.
          </p>
          <div className="actions">
            <button onClick={reset} type="button">
              Try Again
            </button>
            <a href="/">Return Home</a>
          </div>
        </div>
      </body>
    </html>
  );
}
