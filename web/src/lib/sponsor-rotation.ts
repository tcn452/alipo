export function nextSponsor<T extends { id: string }>(sponsors: T[], previousId: string | null, offset = 0): T | null {
  if (!sponsors.length) return null;
  const previousIndex = sponsors.findIndex((sponsor) => sponsor.id === previousId);
  return sponsors[previousIndex >= 0 ? (previousIndex + 1) % sponsors.length : offset % sponsors.length];
}
