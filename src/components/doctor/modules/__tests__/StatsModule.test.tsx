import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import StatsModule from '../StatsModule';

describe('StatsModule', () => {
  it('renders statistics cards', async () => {
    render(<StatsModule doctorData={{ id: '1', name: 'Dr. Test' }} />);
    
    expect(await screen.findByText(/Patients aujourd'hui/i)).toBeInTheDocument();
    expect((await screen.findAllByText('0')).length).toBeGreaterThan(0);
  });

  it('displays KPI cards with trends', async () => {
    render(<StatsModule doctorData={{ id: '1', name: 'Dr. Test' }} />);
    
    expect(await screen.findByText(/Patients aujourd'hui/i)).toBeInTheDocument();
    const kpiCards = screen.getAllByRole('heading');
    expect(kpiCards.length).toBeGreaterThan(0);
  });

  it('shows revenue information', async () => {
    render(<StatsModule doctorData={{ id: '1', name: 'Dr. Test' }} />);
    
    expect(await screen.findByText(/Revenus/i)).toBeInTheDocument();
  });
});
