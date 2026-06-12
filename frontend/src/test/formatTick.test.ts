import { describe, it, expect } from 'vitest'

// formatTick is defined inside OeeTrendChart — duplicated here to test in isolation
type Granularity = 'daily' | 'weekly' | 'monthly'

const TR_MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']

function formatTick(value: string, granularity: Granularity): string {
  if (granularity === 'daily') return value.slice(5)
  if (granularity === 'weekly') {
    const week = value.split('-W')[1]
    return `H${week}`
  }
  const [year, month] = value.split('-')
  return `${TR_MONTHS[parseInt(month) - 1]}'${year.slice(2)}`
}

describe('formatTick', () => {
  describe('daily', () => {
    it('strips the year and returns MM-DD', () => {
      expect(formatTick('2025-11-05', 'daily')).toBe('11-05')
    })

    it('handles end-of-year dates', () => {
      expect(formatTick('2025-12-31', 'daily')).toBe('12-31')
    })
  })

  describe('weekly', () => {
    it('formats ISO week as H{week}', () => {
      expect(formatTick('2025-W45', 'weekly')).toBe('H45')
    })

    it('handles single-digit week numbers', () => {
      expect(formatTick('2026-W03', 'weekly')).toBe('H03')
    })
  })

  describe('monthly', () => {
    it('formats January correctly', () => {
      expect(formatTick('2025-01', 'monthly')).toBe("Oca'25")
    })

    it('formats December correctly', () => {
      expect(formatTick('2025-12', 'monthly')).toBe("Ara'25")
    })

    it('formats all 12 Turkish month abbreviations', () => {
      const expected = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara']
      expected.forEach((abbr, i) => {
        const month = String(i + 1).padStart(2, '0')
        expect(formatTick(`2025-${month}`, 'monthly')).toBe(`${abbr}'25`)
      })
    })

    it('uses last two digits of year', () => {
      expect(formatTick('2030-06', 'monthly')).toBe("Haz'30")
    })
  })
})
