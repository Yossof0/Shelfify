import { useEffect, useCallback } from 'react';

export interface Shortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  handler: () => void;
  description: string;
  category: 'catalog' | 'purchase' | 'cart' | 'general';
}

export const SHORTCUTS: Shortcut[] = [
  // Catalog shortcuts
  {
    key: 'n',
    ctrl: true,
    handler: () => {},
    description: 'Add new product',
    category: 'catalog',
  },
  {
    key: 'e',
    handler: () => {},
    description: 'Edit selected product',
    category: 'catalog',
  },
  {
    key: 'd',
    handler: () => {},
    description: 'Delete selected product',
    category: 'catalog',
  },
  {
    key: 'r',
    ctrl: true,
    handler: () => {},
    description: 'Reset all products',
    category: 'catalog',
  },
  // Purchase shortcuts
  {
    key: 'p',
    ctrl: true,
    handler: () => {},
    description: 'Start new purchase',
    category: 'purchase',
  },
  {
    key: '/',
    handler: () => {},
    description: 'Search products',
    category: 'purchase',
  },
  {
    key: 'Enter',
    handler: () => {},
    description: 'Add to cart / Confirm',
    category: 'cart',
  },
  {
    key: 'Backspace',
    handler: () => {},
    description: 'Remove from cart',
    category: 'cart',
  },
  {
    key: 'ArrowUp',
    handler: () => {},
    description: 'Navigate up',
    category: 'general',
  },
  {
    key: 'ArrowDown',
    handler: () => {},
    description: 'Navigate down',
    category: 'general',
  },
  {
    key: 'Escape',
    handler: () => {},
    description: 'Cancel / Close',
    category: 'general',
  },
  {
    key: '?',
    handler: () => {},
    description: 'Show keyboard shortcuts',
    category: 'general',
  },
];

export function useKeyboardShortcuts(shortcuts: Shortcut[]) {
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      for (const shortcut of shortcuts) {
        const matchesKey = event.key === shortcut.key || event.code === shortcut.key;
        const matchesCtrl = (shortcut.ctrl || false) === event.ctrlKey;
        const matchesShift = (shortcut.shift || false) === event.shiftKey;
        const matchesAlt = (shortcut.alt || false) === event.altKey;
        const matchesMeta = (shortcut.meta || false) === event.metaKey;

        if (matchesKey && matchesCtrl && matchesShift && matchesAlt && matchesMeta) {
          event.preventDefault();
          shortcut.handler();
          break;
        }
      }
    },
    [shortcuts]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}

export function getShortcutLabel(shortcut: Shortcut): string {
  let label = '';
  if (shortcut.ctrl) label += 'Ctrl+';
  if (shortcut.shift) label += 'Shift+';
  if (shortcut.alt) label += 'Alt+';
  if (shortcut.meta) label += 'Cmd+';
  label += shortcut.key;
  return label;
}
