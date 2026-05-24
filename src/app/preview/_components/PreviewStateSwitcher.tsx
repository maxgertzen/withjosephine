type SwitcherProps = {
  states: readonly string[];
  current: string;
  basePath: string;
  title: string;
};

export function PreviewStateSwitcher({ states, current, basePath, title }: SwitcherProps) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 50,
        background: "#1C1935",
        color: "#FAF8F4",
        padding: "10px 16px",
        fontFamily: "Inter, system-ui, sans-serif",
        fontSize: 12,
        letterSpacing: "0.04em",
        display: "flex",
        gap: 12,
        alignItems: "center",
        flexWrap: "wrap",
      }}
      data-testid="preview-state-switcher"
    >
      <strong style={{ marginRight: 8, opacity: 0.7 }}>{title}</strong>
      {states.map((state) => {
        const active = state === current;
        return (
          <a
            key={state}
            href={`${basePath}?state=${state}`}
            style={{
              color: active ? "#1C1935" : "#FAF8F4",
              background: active ? "#C4A46B" : "transparent",
              border: `1px solid ${active ? "#C4A46B" : "rgba(250,248,244,0.3)"}`,
              padding: "4px 10px",
              borderRadius: 9999,
              textDecoration: "none",
              fontWeight: active ? 600 : 400,
            }}
          >
            {state}
          </a>
        );
      })}
    </div>
  );
}
