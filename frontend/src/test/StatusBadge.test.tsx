import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StatusBadge from '../components/shared/StatusBadge'

describe('StatusBadge', () => {
  it('renders "Temiz" for clean status', () => {
    render(<StatusBadge status="clean" />)
    expect(screen.getByText('Temiz')).toBeInTheDocument()
  })

  it('renders "Uyarı" for warning status', () => {
    render(<StatusBadge status="warning" />)
    expect(screen.getByText('Uyarı')).toBeInTheDocument()
  })

  it('renders "Reddedildi" for rejected status', () => {
    render(<StatusBadge status="rejected" />)
    expect(screen.getByText('Reddedildi')).toBeInTheDocument()
  })

  it('renders "Bekliyor" for pending status', () => {
    render(<StatusBadge status="pending" />)
    expect(screen.getByText('Bekliyor')).toBeInTheDocument()
  })

  it('renders "Başarılı" for success status', () => {
    render(<StatusBadge status="success" />)
    expect(screen.getByText('Başarılı')).toBeInTheDocument()
  })

  it('renders "Başarısız" for failed status', () => {
    render(<StatusBadge status="failed" />)
    expect(screen.getByText('Başarısız')).toBeInTheDocument()
  })

  it('renders "İşleniyor" for processing status', () => {
    render(<StatusBadge status="processing" />)
    expect(screen.getByText('İşleniyor')).toBeInTheDocument()
  })

  it('renders "Hata" for error status', () => {
    render(<StatusBadge status="error" />)
    expect(screen.getByText('Hata')).toBeInTheDocument()
  })

  it('falls back to raw status string for unknown status', () => {
    // @ts-expect-error intentional unknown status
    render(<StatusBadge status="unknown_xyz" />)
    expect(screen.getByText('unknown_xyz')).toBeInTheDocument()
  })
})
