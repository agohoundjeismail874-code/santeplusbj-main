import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import QuickConsultationModule from '../QuickConsultationModule';

describe('QuickConsultationModule', () => {
  it('renders all 4 steps', () => {
    render(<QuickConsultationModule doctorData={{ id: '1', name: 'Dr. Test' }} />);
    
    expect(screen.getByText(/Identifier le patient/i)).toBeInTheDocument();
    expect(screen.getByText(/Saisie rapide/i)).toBeInTheDocument();
    expect(screen.getByText(/Prescription/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Enregistrer/i).length).toBeGreaterThan(0);
  });

  it('opens the real patient QR scanner', () => {
    render(<QuickConsultationModule doctorData={{ id: '1', name: 'Dr. Test' }} />);
    
    const scanBtn = screen.getByText(/Scanner QR Code/i);
    fireEvent.click(scanBtn);
    expect(screen.getByText(/Scanner le QR Code Patient/i)).toBeInTheDocument();
  });

  it('displays prescription form', () => {
    render(<QuickConsultationModule doctorData={{ id: '1', name: 'Dr. Test' }} />);
    
    expect(screen.getByText(/Prescription/i)).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Diagnostic/i)).toBeInTheDocument();
  });

  it('handles voice input gracefully', () => {
    render(<QuickConsultationModule doctorData={{ id: '1', name: 'Dr. Test' }} />);
    
    const micButton = screen.getByText(/Cliquez et parlez/i);
    expect(micButton).toBeInTheDocument();
  });
});
