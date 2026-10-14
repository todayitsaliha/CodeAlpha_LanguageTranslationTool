import { render, screen } from '@testing-library/react';
import Header from './Header';

it('shows the blip360 name as the page heading with the tagline', () => {
  render(<Header />);
  expect(screen.getByRole('heading', { level: 1, name: 'blip360' })).toBeInTheDocument();
  expect(screen.getByText('Translate anything, anywhere.')).toBeInTheDocument();
});
