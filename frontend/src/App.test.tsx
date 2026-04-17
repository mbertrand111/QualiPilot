import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
    json: () => Promise.resolve({ status: 'ok' }),
  }));
});

describe('App', () => {
  it('renders the application title', () => {
    render(<App />);
    expect(screen.getByText('QualiPilot')).toBeInTheDocument();
  });
});
