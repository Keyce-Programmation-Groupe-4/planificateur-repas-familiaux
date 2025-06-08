import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import MyDeliveriesPage from './MyDeliveriesPage';
import { DELIVERY_STATUSES } from '../../config/deliveryStatuses';
import { useAuth } from '../../contexts/AuthContext';
import { collection, query, where, orderBy, onSnapshot, doc, getDoc } from 'firebase/firestore';

// Mock react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

// Mock useAuth
jest.mock('../../contexts/AuthContext');

// Mock Firestore
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  onSnapshot: jest.fn(),
  doc: jest.fn(),
  getDoc: jest.fn(),
  Timestamp: {
    fromDate: (date) => ({
      toDate: () => date,
      seconds: date.getTime() / 1000,
      nanoseconds: 0,
    }),
    now: () => ({
      toDate: () => new Date(),
      seconds: new Date().getTime() / 1000,
      nanoseconds: 0,
    })
  }
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
}));


describe('MyDeliveriesPage', () => {
  const mockFamilyId = 'family123';

  const mockDeliveriesData = [
    {
      id: 'del1',
      familyId: mockFamilyId,
      status: DELIVERY_STATUSES.PENDING_VENDOR_CONFIRMATION.key,
      deliveryAddress: '1 Active St',
      requestedDate: '2024-08-01',
      requestedTime: '10:00',
      totalCost: 100,
      deliveryFee: 10,
      vendorId: 'vendor1',
      createdAt: { toDate: () => new Date('2024-08-01T09:00:00Z') }
    },
    {
      id: 'del2',
      familyId: mockFamilyId,
      status: DELIVERY_STATUSES.DELIVERED.key,
      deliveryAddress: '2 Delivered Rd',
      requestedDate: '2024-07-30',
      requestedTime: '11:00',
      totalCost: 200,
      deliveryFee: 20,
      vendorId: 'vendor2',
      createdAt: { toDate: () => new Date('2024-07-30T09:00:00Z') }
    },
    {
      id: 'del3',
      familyId: mockFamilyId,
      status: DELIVERY_STATUSES.CANCELLED_BY_USER.key,
      deliveryAddress: '3 Cancelled Ave',
      requestedDate: '2024-07-29',
      requestedTime: '12:00',
      totalCost: 300,
      deliveryFee: 30,
      vendorId: 'vendor1',
      createdAt: { toDate: () => new Date('2024-07-29T09:00:00Z') }
    },
     {
      id: 'del4',
      familyId: mockFamilyId,
      status: DELIVERY_STATUSES.SHOPPING.key, // Another active status
      deliveryAddress: '4 Shopping St',
      requestedDate: '2024-08-02',
      requestedTime: '11:00',
      totalCost: 150,
      deliveryFee: 15,
      vendorId: 'vendor2',
      createdAt: { toDate: () => new Date('2024-08-02T09:00:00Z') }
    },
  ];

  const mockVendorsData = {
    vendor1: { name: 'Vendor One', phone: '111-111-1111' },
    vendor2: { name: 'Vendor Two', phone: '222-222-2222' },
  };

  beforeEach(() => {
    jest.clearAllMocks();

    useAuth.mockReturnValue({
      currentUser: { uid: 'user123' },
      userData: { familyId: mockFamilyId },
    });

    // Mock onSnapshot to immediately call the callback with mock data
    onSnapshot.mockImplementation((q, callback) => {
      const mockSnapshot = {
        docs: mockDeliveriesData.map(del => ({
          id: del.id,
          data: () => ({ ...del, familyId: mockFamilyId }), // Ensure familyId matches
        })),
      };
      // Use act to wrap state updates
      act(() => {
        callback(mockSnapshot);
      });
      return jest.fn(); // Return a mock unsubscribe function
    });

    getDoc.mockImplementation(docRef => {
        // This simple mock assumes docRef.id is the vendorId
        // In a real firestore mock, you might need to parse the path from docRef
        const vendorId = docRef.id || docRef._key.path.segments.pop();
        if (mockVendorsData[vendorId]) {
            return Promise.resolve({
                exists: () => true,
                data: () => mockVendorsData[vendorId],
            });
        }
        return Promise.resolve({ exists: () => false });
    });
  });

  it('renders loading state initially', () => {
    onSnapshot.mockImplementationOnce(() => jest.fn()); // Prevent immediate data load
    render(<MyDeliveriesPage />);
    expect(screen.getByText(/Chargement de vos livraisons.../i)).toBeInTheDocument();
  });

  it('renders deliveries and filters correctly when data is loaded', async () => {
    render(<MyDeliveriesPage />);

    // Wait for data to load and cards to render
    // Active tab should be selected by default
    await waitFor(() => {
      expect(screen.getByText('1 Active St')).toBeInTheDocument(); // del1
      expect(screen.getByText('4 Shopping St')).toBeInTheDocument(); // del4
    });

    // Check counts in tabs
    expect(screen.getByRole('tab', { name: /Actives \(2\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Terminées \(1\)/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /Annulées \(1\)/i })).toBeInTheDocument();

    // Check content of Active tab
    expect(screen.getByText('1 Active St')).toBeInTheDocument();
    expect(screen.getByText('4 Shopping St')).toBeInTheDocument();
    expect(screen.queryByText('2 Delivered Rd')).not.toBeInTheDocument();
    expect(screen.queryByText('3 Cancelled Ave')).not.toBeInTheDocument();

    // Switch to Terminées tab
    fireEvent.click(screen.getByRole('tab', { name: /Terminées \(1\)/i }));
    await waitFor(() => {
      expect(screen.getByText('2 Delivered Rd')).toBeInTheDocument();
    });
    expect(screen.queryByText('1 Active St')).not.toBeInTheDocument();
    expect(screen.queryByText('4 Shopping St')).not.toBeInTheDocument();
    expect(screen.queryByText('3 Cancelled Ave')).not.toBeInTheDocument();

    // Switch to Annulées tab
    fireEvent.click(screen.getByRole('tab', { name: /Annulées \(1\)/i }));
    await waitFor(() => {
      expect(screen.getByText('3 Cancelled Ave')).toBeInTheDocument();
    });
    expect(screen.queryByText('1 Active St')).not.toBeInTheDocument();
    expect(screen.queryByText('4 Shopping St')).not.toBeInTheDocument();
    expect(screen.queryByText('2 Delivered Rd')).not.toBeInTheDocument();
  });

  it('displays empty state message for a tab with no deliveries', async () => {
     onSnapshot.mockImplementation((q, callback) => {
      const mockSnapshot = {
        docs: [mockDeliveriesData[0]].map(del => ({ // Only one active delivery
          id: del.id,
          data: () => ({ ...del, familyId: mockFamilyId }),
        })),
      };
      act(() => {callback(mockSnapshot)});
      return jest.fn();
    });

    render(<MyDeliveriesPage />);

    await waitFor(() => {
      expect(screen.getByText('1 Active St')).toBeInTheDocument();
    });

    // Switch to Terminées tab - should be empty
    fireEvent.click(screen.getByRole('tab', { name: /Terminées \(0\)/i }));
    await waitFor(() => {
      expect(screen.getByText(/Aucune livraison terminée/i)).toBeInTheDocument();
    });
     expect(screen.queryByText('1 Active St')).not.toBeInTheDocument();


    // Switch to Annulées tab - should be empty
    fireEvent.click(screen.getByRole('tab', { name: /Annulées \(0\)/i }));
    await waitFor(() => {
      expect(screen.getByText(/Aucune livraison annulée/i)).toBeInTheDocument();
    });
  });

  it('handles error state if familyId is missing', () => {
    useAuth.mockReturnValue({
      currentUser: { uid: 'user123' },
      userData: { familyId: null }, // No familyId
    });
    onSnapshot.mockImplementationOnce(() => jest.fn());


    render(<MyDeliveriesPage />);
    expect(screen.getByText(/Informations de famille manquantes./i)).toBeInTheDocument();
  });

   it('handles error state if firestore call fails', () => {
    onSnapshot.mockImplementation((q, successCallback, errorCallback) => {
      act(() => {errorCallback(new Error("Firestore error"))});
      return jest.fn();
    });

    render(<MyDeliveriesPage />);
    expect(screen.getByText(/Erreur lors du chargement des livraisons./i)).toBeInTheDocument();
  });

});
