import React from 'react';
// Mock @react-pdf/renderer to prevent issues during App render
// Mock mocks
jest.mock('./config/firebase', () => ({
  db: {},
  auth: {},
  app: {}
}));

jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(),
  onAuthStateChanged: jest.fn(() => jest.fn())
}));

jest.mock('./services/authService', () => ({
  authService: {
    onAuthStateChanged: jest.fn(() => jest.fn())
  }
}));

// Mock @react-pdf/renderer to prevent issues during App render
jest.mock('@react-pdf/renderer', () => ({
  pdf: jest.fn(() => ({
    toBlob: jest.fn(() => Promise.resolve(new Blob(['mock'], { type: 'application/pdf' })))
  })),
  Document: ({ children }: any) => <div>{children}</div>,
  Page: ({ children }: any) => <div>{children}</div>,
  Text: ({ children }: any) => <div>{children}</div>,
  View: ({ children }: any) => <div>{children}</div>,
  StyleSheet: { create: (styles: any) => styles },
  Font: { register: jest.fn() },
  PDFViewer: ({ children }: any) => <div>{children}</div>,
}));

import { render, screen } from '@testing-library/react';
import App from './App';

test('renders Refolio application', () => {
  render(<App />);
  const titleElement = screen.getByText(/Refolio/i);
  expect(titleElement).toBeInTheDocument();
});

test('renders Made to move tagline', () => {
  render(<App />);
  const taglineElement = screen.getByText(/Made to move/i);
  expect(taglineElement).toBeInTheDocument();
});

test('renders upload resume section', () => {
  render(<App />);
  const uploadElement = screen.getByRole('heading', { name: /Upload Your Resume/i });
  expect(uploadElement).toBeInTheDocument();
});
