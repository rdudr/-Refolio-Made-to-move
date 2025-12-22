import React from 'react';
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
