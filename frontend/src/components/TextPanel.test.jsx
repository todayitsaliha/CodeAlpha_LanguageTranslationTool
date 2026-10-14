import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import TextPanel from './TextPanel';

function renderPanel(props = {}) {
  const handlers = { onChange: jest.fn(), onClear: jest.fn() };
  render(<TextPanel value="" maxLength={10} validationMessage={null} {...handlers} {...props} />);
  return handlers;
}

describe('TextPanel', () => {
  it('has a labelled text area and a live counter', () => {
    renderPanel({ value: 'Hello' });
    expect(screen.getByLabelText('Your text')).toHaveValue('Hello');
    expect(screen.getByText('5/10')).toBeInTheDocument();
  });

  it('reports typing', async () => {
    const { onChange } = renderPanel();
    await userEvent.type(screen.getByLabelText('Your text'), 'a');
    expect(onChange).toHaveBeenCalledWith('a');
  });

  it('counts emoji as one character, matching the backend', () => {
    renderPanel({ value: '😀😀😀' });
    expect(screen.getByText('3/10')).toBeInTheDocument();
  });

  it('flags text over the limit with words as well as colour', () => {
    renderPanel({ value: 'x'.repeat(11) });
    expect(screen.getByText('11/10')).toBeInTheDocument();
    expect(screen.getByText(/over limit/i)).toBeInTheDocument();
    expect(screen.getByLabelText('Your text')).toHaveAttribute('aria-invalid', 'true');
  });

  it('does not flag text exactly at the limit', () => {
    renderPanel({ value: 'x'.repeat(10) });
    expect(screen.queryByText(/over limit/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Your text')).toHaveAttribute('aria-invalid', 'false');
  });

  it('announces validation messages and ties them to the text area', () => {
    renderPanel({ validationMessage: 'Enter some text to translate.' });
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Enter some text to translate.');
    expect(screen.getByLabelText('Your text')).toHaveAccessibleDescription(
      expect.stringContaining('Enter some text to translate.')
    );
  });

  it('clears via the Clear button, which is disabled when empty', async () => {
    const { onClear } = renderPanel({ value: 'Hello' });
    await userEvent.click(screen.getByRole('button', { name: 'Clear' }));
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  it('disables Clear when there is nothing to clear', () => {
    renderPanel({ value: '' });
    expect(screen.getByRole('button', { name: 'Clear' })).toBeDisabled();
  });
});
