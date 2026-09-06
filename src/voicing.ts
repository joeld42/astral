/** Preserve pitch classes while choosing a compact register near the last chord. */
export function leadVoices(target: number[], previous: number[]) {
  if (!previous.length)
    return target
      .map((n) => {
        while (n > 88) n -= 12;
        while (n < 45) n += 12;
        return n;
      })
      .sort((a, b) => a - b);
  const matches = target.map((pitch) =>
    previous.find((n) => n % 12 === pitch % 12),
  );
  const reserved = matches.filter((n): n is number => n !== undefined);
  const chosen: number[] = [];
  const available = previous.filter((n) => !reserved.includes(n));
  for (const [index, pitch] of target.entries()) {
    if (matches[index] !== undefined) {
      chosen.push(matches[index]!);
      continue;
    }
    const candidates = [-24, -12, 0, 12, 24]
      .map((o) => pitch + o)
      .filter(
        (n) =>
          n >= 45 && n <= 88 && !chosen.includes(n) && !reserved.includes(n),
      );
    const reference = available.length ? available : previous;
    let best = candidates[0] ?? pitch,
      distance = Infinity,
      matched = 0;
    for (const candidate of candidates)
      for (let i = 0; i < reference.length; i++) {
        const score =
          Math.abs(candidate - reference[i]) + 0.03 * Math.abs(candidate - 64);
        if (score < distance) {
          distance = score;
          best = candidate;
          matched = i;
        }
      }
    chosen.push(best);
    if (available.length) available.splice(matched, 1);
  }
  return chosen.sort((a, b) => a - b);
}
