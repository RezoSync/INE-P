export function calculateParticipation(
  voters: number,
  nonVoters: number,
  decimalPlaces = 1,
): number | null {
  const total = voters + nonVoters
  if (
    !Number.isFinite(voters) ||
    !Number.isFinite(nonVoters) ||
    voters < 0 ||
    nonVoters < 0 ||
    total <= 0 ||
    !Number.isInteger(decimalPlaces) ||
    decimalPlaces < 0 ||
    decimalPlaces > 10
  ) {
    return null
  }
  const scale = 10 ** decimalPlaces
  return Math.round((voters / total) * 100 * scale) / scale
}

export function matchesParticipation(
  voters: number,
  nonVoters: number,
  officialPercentage: number,
  decimalPlaces = 1,
  tolerance = 0,
): boolean {
  const calculated = calculateParticipation(voters, nonVoters, decimalPlaces)
  return (
    calculated !== null &&
    Number.isFinite(tolerance) &&
    tolerance >= 0 &&
    Math.abs(calculated - officialPercentage) <= tolerance
  )
}
