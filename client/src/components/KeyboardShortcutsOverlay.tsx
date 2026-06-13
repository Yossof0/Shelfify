import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { SHORTCUTS, getShortcutLabel } from '@/hooks/useKeyboardShortcuts';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

export function KeyboardShortcutsOverlay() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
        e.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const categories = {
    catalog: 'Product Catalog',
    purchase: 'Purchase',
    cart: 'Cart',
    general: 'General',
  };

  const groupedShortcuts = SHORTCUTS.reduce(
    (acc, shortcut) => {
      if (!acc[shortcut.category]) {
        acc[shortcut.category] = [];
      }
      acc[shortcut.category].push(shortcut);
      return acc;
    },
    {} as Record<string, typeof SHORTCUTS>
  );

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Keyboard Shortcuts</span>
              <span className="text-xs font-normal text-muted-foreground">Press ? to toggle</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(categories).map(([key, label]) => {
              const shortcuts = groupedShortcuts[key as keyof typeof categories];
              if (!shortcuts || shortcuts.length === 0) return null;

              return (
                <div key={key}>
                  <h3 className="text-sm font-semibold text-foreground mb-3">{label}</h3>
                  <div className="space-y-2">
                    {shortcuts.map((shortcut, idx) => (
                      <div key={idx} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{shortcut.description}</span>
                        <kbd className="px-2 py-1 text-xs font-semibold text-gray-800 bg-gray-100 border border-gray-200 rounded-lg">
                          {getShortcutLabel(shortcut)}
                        </kbd>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating hint button */}
      <div className="fixed bottom-4 right-4 z-40">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="text-xs"
          title="Press ? for keyboard shortcuts"
        >
          ? Shortcuts
        </Button>
      </div>
    </>
  );
}
