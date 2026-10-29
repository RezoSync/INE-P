export type MapRange = {
  min: number
  max: number
}

export function createMapRanges(values: number[], bucketCount = 4): MapRange[] {
  const sorted = values
    .filter((value) => Number.isFinite(value))
    .sort((left, right) => left - right)
  if (!sorted.length || !Number.isInteger(bucketCount) || bucketCount < 1) {
    return []
  }

  const min = sorted[0]!
  const max = sorted[sorted.length - 1]!
  if (min === max) {
    return Array.from({ length: bucketCount }, (_, index) => ({
      min,
      max: index === bucketCount - 1 ? max : min,
    }))
  }

  const boundaries = Array.from({ length: bucketCount + 1 }, (_, index) => {
    const position = (index / bucketCount) * (sorted.length - 1)
    const lower = Math.floor(position)
    const upper = Math.ceil(position)
    const fraction = position - lower
    return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * fraction
  })

  return Array.from({ length: bucketCount }, (_, index) => ({
    min: boundaries[index]!,
    max: boundaries[index + 1]!,
  }))
}

export function getMapBucket(value: number, ranges: MapRange[]): number {
  const index = ranges.findIndex(
    (range, rangeIndex) =>
      value >= range.min &&
      (value < range.max || rangeIndex === ranges.length - 1),
  )
  return index < 0 ? Math.max(ranges.length - 1, 0) : index
}
