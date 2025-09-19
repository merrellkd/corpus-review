import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByText('Corpus Review')).toBeInTheDocument()
  })

  it('shows coming soon message', () => {
    render(<App />)
    expect(screen.getByText('Project Workspace coming soon...')).toBeInTheDocument()
  })
})