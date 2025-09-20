import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import App from '../src/App'

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('workspace-container')).toBeInTheDocument()
  })

  it('shows loading state initially', () => {
    render(<App />)
    // The workspace starts in loading state since useEffect hasn't run
    expect(screen.getByText('Loading workspace')).toBeInTheDocument()
  })
})