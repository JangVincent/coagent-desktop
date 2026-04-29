const PALETTE = [
  "#7a9fd4", "#6db89a", "#c49a6b", "#b87a8a", "#9b8ec4",
  "#5fa8a8", "#c4826b", "#8aab6e", "#d4956a", "#7ab5c4",
  "#a67ab8", "#6ba87a", "#c4b46a", "#7a8fc4", "#b8906b",
  "#6ab8b0", "#c47a9b", "#8fc46a", "#6a8fb8", "#b8a06a",
];

export function nameColor(name: string): string {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(h) % PALETTE.length];
}
