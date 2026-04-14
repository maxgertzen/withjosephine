type OrbPreset = {
  color: string;
  size: number;
  top?: string;
  right?: string;
  bottom?: string;
  left?: string;
  opacity: number;
};

export const PAGE_ORBS: OrbPreset[] = [
  {
    color: "radial-gradient(circle, var(--color-j-gold) 0%, transparent 70%)",
    size: 300,
    top: "-5%",
    right: "-5%",
    opacity: 0.08,
  },
  {
    color: "radial-gradient(circle, var(--color-j-rose) 0%, transparent 70%)",
    size: 250,
    bottom: "10%",
    left: "-5%",
    opacity: 0.06,
  },
];
