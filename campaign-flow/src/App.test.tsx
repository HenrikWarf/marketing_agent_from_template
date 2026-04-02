/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';
import { BlackboardProvider } from './context/BlackboardProvider';
import React from 'react';

// Mock fetch
global.fetch = vi.fn(() => 
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ environments: [], agents: [], content: '', schema: [] }),
  } as Response)
);

describe('App Component', () => {
  it('renders the Campaign Orchestrator title', async () => {
    render(
      <BlackboardProvider>
        <App />
      </BlackboardProvider>
    );
    
    expect(screen.getByText(/Campaign Orchestrator/i)).toBeDefined();
  });
});
