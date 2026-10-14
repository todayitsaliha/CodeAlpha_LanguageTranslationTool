import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LanguageBar from './LanguageBar';

const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
];

function renderBar(props = {}) {
  const handlers = { onSourceChange: jest.fn(), onTargetChange: jest.fn(), onSwap: jest.fn() };
  render(
    <LanguageBar
      languages={LANGUAGES}
      ready
      source="auto"
      target="es"
      swapEnabled={false}
      {...handlers}
      {...props}
    />
  );
  return handlers;
}

const optionNames = (select) => Array.from(select.options).map((option) => option.textContent);

describe('LanguageBar', () => {
  it('labels both dropdowns and offers Detect language only as a source', () => {
    renderBar();
    const from = screen.getByLabelText('From');
    const to = screen.getByLabelText('To');
    expect(optionNames(from)).toEqual(['Detect language', 'English', 'French', 'Spanish']);
    expect(optionNames(to)).toEqual(['English', 'French', 'Spanish']);
    expect(from).toHaveValue('auto');
    expect(to).toHaveValue('es');
  });

  it('reports the chosen language codes', async () => {
    const { onSourceChange, onTargetChange } = renderBar();
    await userEvent.selectOptions(screen.getByLabelText('From'), 'fr');
    await userEvent.selectOptions(screen.getByLabelText('To'), 'en');
    expect(onSourceChange).toHaveBeenCalledWith('fr');
    expect(onTargetChange).toHaveBeenCalledWith('en');
  });

  it('swaps when the swap button is enabled', async () => {
    const { onSwap } = renderBar({ source: 'en', swapEnabled: true });
    await userEvent.click(screen.getByRole('button', { name: 'Swap languages' }));
    expect(onSwap).toHaveBeenCalledTimes(1);
  });

  it('disables swap and explains why while nothing has been detected', () => {
    renderBar({ swapEnabled: false });
    const swap = screen.getByRole('button', { name: 'Swap languages' });
    expect(swap).toBeDisabled();
    expect(swap).toHaveAccessibleDescription(/detected/i);
  });

  it('shows disabled dropdowns while languages load', () => {
    renderBar({ ready: false, languages: [] });
    expect(screen.getByLabelText('From')).toBeDisabled();
    expect(screen.getByLabelText('To')).toBeDisabled();
    expect(screen.getAllByText('Loading languages…')).toHaveLength(2);
    expect(screen.getByRole('button', { name: 'Swap languages' })).toBeDisabled();
  });
});
