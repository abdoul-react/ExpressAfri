export function formatPrice(price: number): string {
  return new Intl.NumberFormat('fr-FR').format(price) + ' FCFA'
}

export function formatDate(
  dateStr: string | null | undefined,
  options?: { time?: boolean; long?: boolean },
): string {
  if (!dateStr) return '—'
  const date = new Date(dateStr)
  const opts: Intl.DateTimeFormatOptions = {
    day: '2-digit',
    month: options?.long ? 'long' : 'short',
    year: 'numeric',
  }
  if (options?.time) {
    opts.hour = '2-digit'
    opts.minute = '2-digit'
  }
  return date.toLocaleDateString('fr-FR', opts)
}

export function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'à l\'instant'
  if (minutes < 60) return `${minutes} min`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  return formatDate(ts, { time: false })
}
