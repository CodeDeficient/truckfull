/**
 * @jest-environment jsdom
 */
import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { renderHook } from '@testing-library/react';

describe('useSidebarKeyboardShortcut', () => {
  let useSidebarKeyboardShortcut: typeof import('@/hooks/useSidebarKeyboardShortcut').useSidebarKeyboardShortcut;

  beforeEach(async () => {
    jest.clearAllMocks();
    globalThis.addEventListener = jest.fn();
    globalThis.removeEventListener = jest.fn();

    const module = await import('@/hooks/useSidebarKeyboardShortcut');
    useSidebarKeyboardShortcut = module.useSidebarKeyboardShortcut;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should add keydown event listener on mount', () => {
    const toggleSidebar = jest.fn();

    renderHook(() => useSidebarKeyboardShortcut(toggleSidebar));

    expect(globalThis.addEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should remove keydown event listener on unmount', () => {
    const toggleSidebar = jest.fn();

    const { unmount } = renderHook(() => useSidebarKeyboardShortcut(toggleSidebar));

    unmount();

    expect(globalThis.removeEventListener).toHaveBeenCalledWith('keydown', expect.any(Function));
  });

  it('should call toggleSidebar when meta+b keys are pressed', () => {
    const toggleSidebar = jest.fn();

    renderHook(() => useSidebarKeyboardShortcut(toggleSidebar));

    const eventListener = (globalThis.addEventListener as jest.Mock).mock.calls[0][1];
    const mockEvent = new KeyboardEvent('keydown', { key: 'b', metaKey: true });

    eventListener(mockEvent);

    expect(toggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('should call toggleSidebar when ctrl+b keys are pressed', () => {
    const toggleSidebar = jest.fn();

    renderHook(() => useSidebarKeyboardShortcut(toggleSidebar));

    const eventListener = (globalThis.addEventListener as jest.Mock).mock.calls[0][1];
    const mockEvent = new KeyboardEvent('keydown', { key: 'b', ctrlKey: true });

    eventListener(mockEvent);

    expect(toggleSidebar).toHaveBeenCalledTimes(1);
  });

  it('should not call toggleSidebar when only b key is pressed', () => {
    const toggleSidebar = jest.fn();

    renderHook(() => useSidebarKeyboardShortcut(toggleSidebar));

    const eventListener = (globalThis.addEventListener as jest.Mock).mock.calls[0][1];
    const mockEvent = new KeyboardEvent('keydown', { key: 'b' });

    eventListener(mockEvent);

    expect(toggleSidebar).not.toHaveBeenCalled();
  });

  it('should not call toggleSidebar when meta+other key is pressed', () => {
    const toggleSidebar = jest.fn();

    renderHook(() => useSidebarKeyboardShortcut(toggleSidebar));

    const eventListener = (globalThis.addEventListener as jest.Mock).mock.calls[0][1];
    const mockEvent = new KeyboardEvent('keydown', { key: 'a', metaKey: true });

    eventListener(mockEvent);

    expect(toggleSidebar).not.toHaveBeenCalled();
  });

  it('should prevent default when shortcut is triggered', () => {
    const toggleSidebar = jest.fn();

    renderHook(() => useSidebarKeyboardShortcut(toggleSidebar));

    const eventListener = (globalThis.addEventListener as jest.Mock).mock.calls[0][1];
    const mockEvent = new KeyboardEvent('keydown', { key: 'b', metaKey: true });
    const preventDefault = jest.fn();
    mockEvent.preventDefault = preventDefault;

    eventListener(mockEvent);

    expect(preventDefault).toHaveBeenCalled();
  });
});