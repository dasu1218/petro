export function promotionSchedule(promotion) {
  if (!promotion.enabled) return { error: '', message: 'Promotion disabled. Regular prices apply.' }
  const start = promotion.startsAt ? new Date(promotion.startsAt) : null
  const end = promotion.endsAt ? new Date(promotion.endsAt) : null
  if ([start, end].some((date) => date && !Number.isFinite(date.getTime()))) return { error: 'Choose valid promotion dates.', message: '' }
  if (start && end && start >= end) return { error: 'Promotion end must be after its start.', message: '' }
  const format = (date) => date.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
  return { error: '', message: `${start ? `Starts ${format(start)}` : 'Starts immediately when saved'}; ${end ? `ends ${format(end)}` : 'runs until disabled'}. Times use your device’s local timezone. Save product to publish this schedule.` }
}
