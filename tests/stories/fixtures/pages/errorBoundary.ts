export const ERROR_BOUNDARY_DEFAULT_ERROR = Object.assign(
  new Error("Something broke in the render path"),
  { digest: "abc123" },
);

export const ERROR_BOUNDARY_TIMEOUT_ERROR = Object.assign(
  new Error("Network request timed out"),
  { digest: "def456" },
);
