import { render, screen } from '@testing-library/react';
import App from './App';

// Mock the api module to avoid network calls during tests
jest.mock('./api', () => ({
  loadSession: jest.fn(() => null),
  saveSession: jest.fn(),
  clearSession: jest.fn(),
  isTokenExpired: jest.fn(() => false),
}));

test('renders the AIMS login screen when no session exists', async () => {
  render(<App />);
  // App shows a brief loading state first, then the login form
  const loginHeading = await screen.findByText(/Student Login/i);
  expect(loginHeading).toBeInTheDocument();
});

test('renders the AIMS subtitle on the login screen', async () => {
  render(<App />);
  const subtitle = await screen.findByText(/AIMS - Attendance & Quiz System/i);
  expect(subtitle).toBeInTheDocument();
});

