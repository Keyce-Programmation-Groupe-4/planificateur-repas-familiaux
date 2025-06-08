import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';
import FamilyPage from './FamilyPage';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebaseConfig'; // To be mocked
import useMediaQuery from '@mui/material/useMediaQuery'; // Import the mocked hook
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
  writeBatch,
  addDoc,
  serverTimestamp,
  updateDoc,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';

// Mock AuthContext
vi.mock('../contexts/AuthContext', () => ({
  useAuth: vi.fn(),
}));

// Mock Firestore
vi.mock('../firebaseConfig', () => ({
  db: vi.fn(), // Mock db instance
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((db, collectionName, id) => ({
    path: `${collectionName}/${id}`, // Construct a path for getDoc mock to use
    id: id,
  })),
  getDoc: vi.fn(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  getDocs: vi.fn(),
  writeBatch: vi.fn(() => ({
    set: vi.fn(),
    update: vi.fn(),
    commit: vi.fn().mockResolvedValue(undefined), // Ensure commit is a function
  })),
  addDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'mock-timestamp'), // Mock serverTimestamp
  updateDoc: vi.fn().mockResolvedValue(undefined), // Mock updateDoc
  arrayUnion: vi.fn(),
  arrayRemove: vi.fn(),
  // Add any other Firestore functions used by FamilyPage if necessary
}));

// Mock MUI useMediaQuery
vi.mock('@mui/material/useMediaQuery', () => ({ default: vi.fn() }));


describe('FamilyPage - Dietary Restrictions', () => {
  let mockCurrentUser;
  let mockUserData;
  let mockFamilyData;
  let mockMembersData;
  let mockInvitations;

  beforeEach(() => {
    // Reset mocks before each test
    vi.clearAllMocks();

    // Default Mocks
    mockCurrentUser = {
      uid: 'user123',
      email: 'user@example.com',
    };
    mockUserData = {
      uid: 'user123',
      familyId: 'family123',
      displayName: 'Current User',
      email: 'user@example.com',
      dietaryRestrictions: ['No Gluten', 'Vegetarian'],
      familyRole: 'Admin', // Make current user admin for some tests
    };
    mockFamilyData = {
      id: 'family123',
      familyName: 'Test Family',
      adminUid: 'user123',
      memberUids: ['user123', 'member2'],
      createdAt: 'some-timestamp'
    };
    mockMembersData = [
      { ...mockUserData }, // Current user
      {
        uid: 'member2',
        displayName: 'Other Member',
        email: 'member2@example.com',
        dietaryRestrictions: ['No Nuts'],
        familyRole: 'Member',
      },
    ];
    mockInvitations = [];

    useAuth.mockReturnValue({
      currentUser: mockCurrentUser,
      userData: mockUserData,
      loading: false,
    });

    // Mock useMediaQuery to return false (desktop) by default
    useMediaQuery.mockReturnValue(false);

    // Mock Firestore responses
    getDoc.mockImplementation((docRef) => {
      // Simplified: assumes docRef.id is used to distinguish
      // This might need to be more specific based on how doc() is called if paths are complex
      if (docRef.path.startsWith('families/')) {
        return Promise.resolve({
          exists: () => true,
          id: mockFamilyData.id,
          data: () => mockFamilyData,
        });
      }
      if (docRef.path.startsWith('users/')) {
        const userId = docRef.path.split('/')[1];
        const member = mockMembersData.find(m => m.uid === userId);
        if (member) {
          return Promise.resolve({ exists: () => true, id: member.uid, data: () => member });
        }
        return Promise.resolve({ exists: () => false });
      }
      return Promise.resolve({ exists: () => false });
    });

    getDocs.mockImplementation((q) => {
        // For fetching invitations (assuming it's the only getDocs call for now)
        // This needs to be more specific if other getDocs calls are made
        return Promise.resolve({
            docs: mockInvitations.map(inv => ({ id: inv.id, data: () => inv }))
        });
    });

    // Mock collection and other chained calls if necessary for specific tests
    // For example, if query(collection(...), where(...)) is used:
    const mockQuery = {
        // mock methods used on the query object if any, e.g., onSnapshot, getDocs
    };
    collection.mockReturnValue({
        // mock methods used on the collection ref if any
    });
    query.mockReturnValue(mockQuery); // query returns a query object

  });

  test('renders without crashing and shows basic family info', async () => {
    render(<FamilyPage />);
    // Wait for async operations like data fetching to complete
    await waitFor(() => {
      expect(screen.getByText(mockFamilyData.familyName)).toBeInTheDocument();
    });
    expect(screen.getByText('Current User')).toBeInTheDocument(); // From membersData rendering
  });

  // Test Case 1: Current user sees their restrictions and edit button.
  describe('Current User View', () => {
    it('displays their own dietary restrictions and the edit button', async () => {
      render(<FamilyPage />);
      await waitFor(() => {
        expect(screen.getByText('No Gluten')).toBeInTheDocument();
        expect(screen.getByText('Vegetarian')).toBeInTheDocument();
      });
      // The button text changed to "Mes Besoins Alimentaires"
      expect(screen.getByRole('button', { name: /Mes Besoins Alimentaires/i })).toBeInTheDocument();
    });
  });

  // Test Case 2: Other members' restrictions are displayed, but no edit button for them.
  describe('Other Members View', () => {
    it('displays other member\'s restrictions and no edit button for them', async () => {
      render(<FamilyPage />);
      const otherMemberName = mockMembersData[1].displayName;

      await waitFor(() => {
        // Check for other member's name to ensure their card is rendered
        expect(screen.getByText(otherMemberName)).toBeInTheDocument();
        // Check for their restriction
        expect(screen.getByText('No Nuts')).toBeInTheDocument();
      });

      // Check that the "Edit Dietary Needs" button is not associated with the other member.
      // This is a bit tricky as the button exists on the page for the current user.
      // We need to ensure it's not within the other member's list item or card.
      const otherMemberListItem = screen.getByText(otherMemberName).closest('li'); // Assuming members are in ListItems
      expect(otherMemberListItem).not.toHaveTextContent(/Mes Besoins Alimentaires/i);
    });
  });

  // Test Case 3: Dialog opens, and restrictions can be added.
  describe('Edit Dialog Functionality - Add', () => {
    it('dialog opens on edit click, and a new restriction can be added', async () => {
      render(<FamilyPage />);
      await waitFor(() => {
        expect(screen.getByText('No Gluten')).toBeInTheDocument(); // Ensure page loaded
      });

      fireEvent.click(screen.getByRole('button', { name: /Mes Besoins Alimentaires/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /Modifier mes Besoins Alimentaires/i})).toBeVisible();
      });

      const inputField = screen.getByLabelText(/Ajouter une restriction/i);
      const addButton = screen.getByRole('button', { name: 'Ajouter' });

      fireEvent.change(inputField, { target: { value: 'Vegan' } });
      fireEvent.click(addButton);

      await waitFor(() => {
        // Check within the dialog for the new chip
        const dialog = screen.getByRole('dialog', { name: /Modifier mes Besoins Alimentaires/i});
        expect(dialog).toHaveTextContent('Vegan');
        // Check that the original ones are still there too
        expect(dialog).toHaveTextContent('No Gluten');
        expect(dialog).toHaveTextContent('Vegetarian');
      });
    });
  });

  // Test Case 4: Restrictions can be deleted in the dialog.
  describe('Edit Dialog Functionality - Delete', () => {
    it('a restriction can be deleted from the dialog', async () => {
      render(<FamilyPage />);
      await waitFor(() => {
        expect(screen.getByText('No Gluten')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByRole('button', { name: /Mes Besoins Alimentaires/i }));

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeVisible();
      });

      // Find the chip for 'No Gluten' and its delete icon
      const dialogElement = screen.getByRole('dialog', { name: /Modifier mes Besoins Alimentaires/i });

      // Find the chip for 'No Gluten' specifically within the dialog
      const glutenChipInDialog = within(dialogElement).getByText('No Gluten');
      const deleteIcon = glutenChipInDialog.closest('.MuiChip-root').querySelector('svg[data-testid="CancelIcon"]');

      expect(deleteIcon).toBeInTheDocument();
      fireEvent.click(deleteIcon);

      await waitFor(() => {
        expect(within(dialogElement).queryByText('No Gluten')).not.toBeInTheDocument();
        expect(within(dialogElement).getByText('Vegetarian')).toBeInTheDocument(); // Ensure other restriction is still there
      });
    });
  });

  // Test Case 5: Saving restrictions (mocked Firestore call).
  describe('Edit Dialog Functionality - Save', () => {
    it('saves the updated restrictions and calls updateDoc', async () => {
      updateDoc.mockResolvedValue(undefined); // Ensure updateDoc is mocked to resolve

      render(<FamilyPage />);
      await waitFor(() => {
        // Check the main page for the initial restriction.
        expect(screen.getAllByText('No Gluten').length).toBeGreaterThan(0);
      });

      fireEvent.click(screen.getByRole('button', { name: /Mes Besoins Alimentaires/i }));

      const dialogElement = await screen.findByRole('dialog', { name: /Modifier mes Besoins Alimentaires/i });
      expect(dialogElement).toBeVisible();

      // Add a new restriction (within the dialog)
      fireEvent.change(within(dialogElement).getByLabelText(/Ajouter une restriction/i), { target: { value: 'Vegan' } });
      fireEvent.click(within(dialogElement).getByRole('button', { name: 'Ajouter' }));

      // Delete an existing restriction ('No Gluten') from within the dialog
      // Ensure the chip is present before attempting to delete
      await waitFor(() => {
        expect(within(dialogElement).getByText('No Gluten')).toBeInTheDocument();
      });
      const glutenChipInDialog = within(dialogElement).getByText('No Gluten');
      const deleteGlutenIcon = glutenChipInDialog.closest('.MuiChip-root').querySelector('svg[data-testid="CancelIcon"]');
      expect(deleteGlutenIcon).toBeInTheDocument(); // Make sure icon is found
      fireEvent.click(deleteGlutenIcon);

      await waitFor(() => {
         expect(within(dialogElement).getByText('Vegan')).toBeInTheDocument();
         expect(within(dialogElement).queryByText('No Gluten')).not.toBeInTheDocument();
      });

      const saveButton = within(dialogElement).getByRole('button', { name: 'Enregistrer' });
      fireEvent.click(saveButton);

      await waitFor(() => {
        expect(updateDoc).toHaveBeenCalledTimes(1);
        expect(updateDoc).toHaveBeenCalledWith(
          // doc(db, "users", currentUser.uid) - we need to mock doc to return a specific object
          // so we can check if updateDoc was called with that object.
          // For simplicity here, we'll check the path if doc is transparent.
          // In a more complex setup, doc itself would return a mock object.
          expect.anything(), // This would ideally be a more specific matcher for the doc ref
          {
            dietaryRestrictions: ['Vegetarian', 'Vegan'], // Order might matter depending on implementation
            updatedAt: 'mock-timestamp',
          }
        );
      });

      // Check if dialog closes (might need a slight delay for UI update)
      await waitFor(() => {
        expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      });
    });
  });

});
