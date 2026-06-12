import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import FilterBar from '../components/shared/FilterBar'
import type { RecordFilters } from '../types'

const defaultFilters: RecordFilters = { page: 1, page_size: 50 }

describe('FilterBar', () => {
  let onChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onChange = vi.fn()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders all filter inputs', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    expect(screen.getByPlaceholderText('İstasyon ara...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Ürün ara...')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Min')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Max')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '2' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '3' })).toBeInTheDocument()
  })

  it('does not show reset button when no filters active', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    expect(screen.queryByText('Sıfırla')).not.toBeInTheDocument()
  })

  it('shows reset button when filters are active', () => {
    render(<FilterBar filters={{ ...defaultFilters, station: 'IMM' }} onChange={onChange} />)
    expect(screen.getByText('Sıfırla')).toBeInTheDocument()
  })

  it('calls onChange after 300ms debounce when typing in station input', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('İstasyon ara...'), { target: { value: 'IMM' } })
    expect(onChange).not.toHaveBeenCalled()
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ station: 'IMM', page: 1 }))
  })

  it('calls onChange after 300ms debounce when typing in product input', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Ürün ara...'), { target: { value: 'PART-A' } })
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ product: 'PART-A', page: 1 }))
  })

  it('does not fire before debounce window expires', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('İstasyon ara...'), { target: { value: 'IMM' } })
    act(() => vi.advanceTimersByTime(299))
    expect(onChange).not.toHaveBeenCalled()
  })

  it('calls onChange with oee_min when OEE min input changes', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Min'), { target: { value: '60' } })
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ oee_min: 60, page: 1 }))
  })

  it('calls onChange with oee_max when OEE max input changes', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('Max'), { target: { value: '90' } })
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ oee_max: 90, page: 1 }))
  })

  it('toggles shift 1 on when clicked', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ shift: [1] }))
  })

  it('selects multiple shifts independently', () => {
    render(<FilterBar filters={defaultFilters} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    fireEvent.click(screen.getByRole('button', { name: '3' }))
    act(() => vi.advanceTimersByTime(300))
    const lastCall = onChange.mock.calls.at(-1)?.[0] as RecordFilters
    expect(lastCall.shift).toEqual(expect.arrayContaining([1, 3]))
  })

  it('deselects a shift when clicked again', () => {
    render(<FilterBar filters={{ ...defaultFilters, shift: [1, 2] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '1' }))
    act(() => vi.advanceTimersByTime(300))
    const lastCall = onChange.mock.calls.at(-1)?.[0] as RecordFilters
    expect(lastCall.shift).toEqual([2])
  })

  it('sets shift to undefined when last selected shift is deselected', () => {
    render(<FilterBar filters={{ ...defaultFilters, shift: [2] }} onChange={onChange} />)
    fireEvent.click(screen.getByRole('button', { name: '2' }))
    act(() => vi.advanceTimersByTime(300))
    const lastCall = onChange.mock.calls.at(-1)?.[0] as RecordFilters
    expect(lastCall.shift).toBeUndefined()
  })

  it('clears all filters when reset is clicked', () => {
    render(<FilterBar filters={{ ...defaultFilters, station: 'IMM', shift: [1] }} onChange={onChange} />)
    fireEvent.click(screen.getByText('Sıfırla'))
    expect(onChange).toHaveBeenCalledWith({ page: 1, page_size: 50 })
  })

  it('resets page to 1 when any filter changes', () => {
    render(<FilterBar filters={{ ...defaultFilters, page: 5 }} onChange={onChange} />)
    fireEvent.change(screen.getByPlaceholderText('İstasyon ara...'), { target: { value: 'X' } })
    act(() => vi.advanceTimersByTime(300))
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ page: 1 }))
  })
})
