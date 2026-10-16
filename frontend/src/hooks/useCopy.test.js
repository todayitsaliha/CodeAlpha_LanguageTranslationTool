import { act, renderHook } from '@testing-library/react';
import { copyText } from '../utils/clipboard';
import { useCopy } from './useCopy';

jest.mock('../utils/clipboard', () => ({ copyText: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  copyText.mockReset();
});
afterEach(() => jest.useRealTimers());

describe('useCopy', () => {
  it('reports copied, then returns to idle after the reset time', async () => {
    copyText.mockResolvedValue(true);
    const { result } = renderHook(() => useCopy(2000));
    expect(result.current.status).toBe('idle');

    await act(() => result.current.copy('Hola'));
    expect(copyText).toHaveBeenCalledWith('Hola');
    expect(result.current.status).toBe('copied');

    act(() => jest.advanceTimersByTime(1999));
    expect(result.current.status).toBe('copied');
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.status).toBe('idle');
  });

  it('keeps a failure message on screen three times as long', async () => {
    copyText.mockResolvedValue(false);
    const { result } = renderHook(() => useCopy(2000));
    await act(() => result.current.copy('Hola'));
    expect(result.current.status).toBe('failed');

    act(() => jest.advanceTimersByTime(5999));
    expect(result.current.status).toBe('failed');
    act(() => jest.advanceTimersByTime(1));
    expect(result.current.status).toBe('idle');
  });

  it('restarts the timer when copying again', async () => {
    copyText.mockResolvedValue(true);
    const { result } = renderHook(() => useCopy(2000));
    await act(() => result.current.copy('a'));
    act(() => jest.advanceTimersByTime(1500));
    await act(() => result.current.copy('a'));
    act(() => jest.advanceTimersByTime(1500));
    expect(result.current.status).toBe('copied');
    act(() => jest.advanceTimersByTime(500));
    expect(result.current.status).toBe('idle');
  });

  it('leaves no timer running after unmount', async () => {
    copyText.mockResolvedValue(true);
    const { result, unmount } = renderHook(() => useCopy(2000));
    await act(() => result.current.copy('a'));
    unmount();
    expect(jest.getTimerCount()).toBe(0);
  });
});
