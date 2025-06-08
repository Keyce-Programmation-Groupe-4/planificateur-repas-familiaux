import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom'; // For matchers like toBeInTheDocument
import DeliveryStatusCard from './DeliveryStatusCard';
import { DELIVERY_STATUSES } from '../../config/deliveryStatuses';

describe('DeliveryStatusCard', () => {
  const mockBaseDelivery = {
    id: 'del123',
    deliveryAddress: '123 Test St, Test City',
    requestedDate: '2024-07-30',
    requestedTime: '17:00',
    totalCost: 5000, // Assuming this is item cost
    deliveryFee: 500,
  };

  const mockVendor = {
    name: 'Test Vendor',
    phone: '123-456-7890',
  };

  const mockOnTrack = jest.fn();
  const mockOnCancel = jest.fn();

  // Test for each relevant status
  Object.values(DELIVERY_STATUSES).forEach(statusConfig => {
    it(`should display the correct status label and information for status: ${statusConfig.key}`, () => {
      const delivery = {
        ...mockBaseDelivery,
        status: statusConfig.key,
      };
      render(
        <DeliveryStatusCard
          delivery={delivery}
          vendor={mockVendor}
          onTrack={mockOnTrack}
          onCancel={mockOnCancel}
        />
      );

      // Check for status label
      expect(screen.getByText(statusConfig.userLabel || statusConfig.label)).toBeInTheDocument();

      // Check for address and date (these are always displayed)
      expect(screen.getByText(delivery.deliveryAddress)).toBeInTheDocument();
      expect(screen.getByText(`${delivery.requestedDate} à ${delivery.requestedTime}`)).toBeInTheDocument();

      // Check for total cost
      const expectedTotal = ((delivery.totalCost || 0) + (delivery.deliveryFee || 0)).toLocaleString("fr-FR", {
        style: "currency",
        currency: "XAF",
      });
      expect(screen.getByText(expectedTotal)).toBeInTheDocument();
    });
  });

  describe('Cancel Button Visibility', () => {
    it('should display "Annuler / Rejeter" button for PENDING_VENDOR_CONFIRMATION status if onCancel is provided', () => {
      const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key };
      render(<DeliveryStatusCard delivery={delivery} vendor={mockVendor} onTrack={mockOnTrack} onCancel={mockOnCancel} />);
      expect(screen.getByRole('button', { name: /Annuler \/ Rejeter/i })).toBeInTheDocument();
    });

    it('should display "Annuler / Rejeter" button for PENDING_USER_ACCEPTANCE status if onCancel is provided', () => {
      const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.PENDING_USER_ACCEPTANCE.key };
      render(<DeliveryStatusCard delivery={delivery} vendor={mockVendor} onTrack={mockOnTrack} onCancel={mockOnCancel} />);
      expect(screen.getByRole('button', { name: /Annuler \/ Rejeter/i })).toBeInTheDocument();
    });

    it('should NOT display "Annuler / Rejeter" button if status is CONFIRMED', () => {
      const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.CONFIRMED.key };
      render(<DeliveryStatusCard delivery={delivery} vendor={mockVendor} onTrack={mockOnTrack} onCancel={mockOnCancel} />);
      expect(screen.queryByRole('button', { name: /Annuler \/ Rejeter/i })).not.toBeInTheDocument();
    });

    it('should NOT display "Annuler / Rejeter" button if onCancel prop is not provided', () => {
      const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key };
      render(<DeliveryStatusCard delivery={delivery} vendor={mockVendor} onTrack={mockOnTrack} />); // No onCancel
      expect(screen.queryByRole('button', { name: /Annuler \/ Rejeter/i })).not.toBeInTheDocument();
    });
  });

  it('should display vendor information if vendor prop is provided', () => {
    const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.CONFIRMED.key };
    render(<DeliveryStatusCard delivery={delivery} vendor={mockVendor} onTrack={mockOnTrack} />);
    expect(screen.getByText(mockVendor.name)).toBeInTheDocument();
    expect(screen.getByText(mockVendor.phone)).toBeInTheDocument();
  });

  it('should NOT display vendor information if vendor prop is NOT provided', () => {
    const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.CONFIRMED.key };
    render(<DeliveryStatusCard delivery={delivery} onTrack={mockOnTrack} />);
    expect(screen.queryByText(mockVendor.name)).not.toBeInTheDocument();
  });

  it('should call onTrack when "Suivre" button is clicked', () => {
    const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.CONFIRMED.key };
    render(<DeliveryStatusCard delivery={delivery} vendor={mockVendor} onTrack={mockOnTrack} onCancel={mockOnCancel} />);
    const trackButton = screen.getByRole('button', { name: /Suivre/i });
    trackButton.click();
    expect(mockOnTrack).toHaveBeenCalledTimes(1);
  });

  it('should call onCancel when "Annuler / Rejeter" button is clicked', () => {
    const delivery = { ...mockBaseDelivery, status: DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key };
    render(<DeliveryStatusCard delivery={delivery} vendor={mockVendor} onTrack={mockOnTrack} onCancel={mockOnCancel} />);
    const cancelButton = screen.getByRole('button', { name: /Annuler \/ Rejeter/i });
    cancelButton.click();
    expect(mockOnCancel).toHaveBeenCalledTimes(1);
  });
});
