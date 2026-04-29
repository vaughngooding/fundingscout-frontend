import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import PricingSection from '../PricingSection'

describe('PricingSection', () => {
  it('renders Basic and Pro plan cards', () => {
    render(<PricingSection />)
    expect(screen.getByTestId('plan-card-basic')).toBeInTheDocument()
    expect(screen.getByTestId('plan-card-pro')).toBeInTheDocument()
  })

  it('does NOT render any Free plan card (eliminated 2026-04-29)', () => {
    render(<PricingSection />)
    expect(screen.queryByTestId('plan-card-free')).not.toBeInTheDocument()
    // No "$0" price visible anywhere on the pricing UI.
    expect(screen.queryByText('$0')).not.toBeInTheDocument()
  })

  it('renders the $2.99 trial banner', () => {
    render(<PricingSection />)
    // The trial copy must be visible — it's the lowest-friction CTA.
    const matches = screen.getAllByText(/\$2\.99/)
    expect(matches.length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/Try 7 days for \$2\.99/i)).toBeInTheDocument()
  })

  it('Pro card price reads $49 by default (annual toggle on)', () => {
    // Annual is the default toggle state. Pro annual price is $49/mo.
    render(<PricingSection />)
    const proCard = screen.getByTestId('plan-card-pro')
    expect(proCard).toHaveTextContent('$49')
  })

  it('Basic card shows $8.25 by default (annual)', () => {
    render(<PricingSection />)
    const basicCard = screen.getByTestId('plan-card-basic')
    expect(basicCard).toHaveTextContent('$8.25')
  })

  it('exposes both annual and monthly toggles', () => {
    render(<PricingSection />)
    expect(screen.getByRole('button', { name: /annual/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /monthly/i })).toBeInTheDocument()
  })
})
