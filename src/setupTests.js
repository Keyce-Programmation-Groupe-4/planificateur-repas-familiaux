// src/setupTests.js
import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock Firebase related modules if they cause issues during testing
// Example: Mocking Firestore (can be more specific based on test needs)
vi.mock('firebase/firestore', async () => {
  const actual = await vi.importActual('firebase/firestore');
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})), // Mock getFirestore
    doc: vi.fn(),
    collection: vi.fn(),
    addDoc: vi.fn(),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    deleteDoc: vi.fn(),
    onSnapshot: vi.fn(() => vi.fn()), // Mock onSnapshot to return an unsubscribe function
    serverTimestamp: vi.fn(() => 'mock-server-timestamp'),
    Timestamp: {
      fromDate: vi.fn(date => ({
        toDate: () => date,
        seconds: Math.floor(date.getTime() / 1000),
        nanoseconds: (date.getTime() % 1000) * 1e6,
      })),
      now: vi.fn(() => ({
        toDate: () => new Date(),
        seconds: Math.floor(Date.now() / 1000),
        nanoseconds: (Date.now() % 1000) * 1e6,
      })),
    },
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    getDocs: vi.fn().mockResolvedValue({ docs: [], empty: true }),
    writeBatch: vi.fn(() => ({
      set: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      commit: vi.fn().mockResolvedValue(undefined),
    })),
  };
});

vi.mock('firebase/auth', async () => {
  const actual = await vi.importActual('firebase/auth');
  return {
    ...actual,
    getAuth: vi.fn(() => ({
      currentUser: null,
      onAuthStateChanged: vi.fn(() => vi.fn()), // Returns an unsubscribe function
    })),
    updateProfile: vi.fn(),
    // Add other auth functions as needed
  };
});

vi.mock('firebase/storage', async () => {
  const actual = await vi.importActual('firebase/storage');
  return {
    ...actual,
    getStorage: vi.fn(() => ({})),
    ref: vi.fn(),
    uploadBytesResumable: vi.fn(() => ({
        on: vi.fn((event, progress, error, complete) => {
            // Immediately call complete for simplicity in mock
            if (event === 'state_changed' && typeof complete === 'function') {
                complete();
            }
            return vi.fn(); // Return unsubscribe function
        }),
        snapshot: { ref: 'mockRef', totalBytes: 100, bytesTransferred: 100 }
    })),
    getDownloadURL: vi.fn().mockResolvedValue('mock-url.jpg'),
    deleteObject: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock('firebase/functions', async () => {
  const actual = await vi.importActual('firebase/functions');
  return {
    ...actual,
    getFunctions: vi.fn(() => ({})),
    httpsCallable: vi.fn((functionsInstance, functionName) => {
      // Return a mock function that simulates the callable behavior
      return vi.fn().mockImplementation(async (data) => {
        console.log(`Mocked function ${functionName} called with:`, data);
        // Simulate a successful response
        return Promise.resolve({ data: { message: 'Mocked success!' } });
      });
    }),
  };
});

// Mock for react-router-dom navigation
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    useNavigate: () => vi.fn(path => console.log('Mock navigate to:', path)),
    useParams: () => ({ recipeId: 'mockRecipeId' }), // Example mock params
  };
});

// If you use other browser features not available in JSDOM, mock them here
// For example, window.scrollTo
window.scrollTo = vi.fn();

// You might need to mock other specific dependencies if they cause issues
// e.g., pdfMake if it's not tree-shaken and causes problems in test environment
vi.mock('pdfmake/build/pdfmake', () => ({
  createPdf: vi.fn(() => ({
    download: vi.fn(),
    open: vi.fn(),
    print: vi.fn(),
  })),
}));
vi.mock('pdfmake/build/vfs_fonts', () => ({
    // Mock structure if needed, often just an empty object is fine if not directly used
}));
