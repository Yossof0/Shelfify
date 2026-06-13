import { useState, useMemo, useRef } from 'react';
import { useAuth } from '@/_core/hooks/useAuth';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Plus, Edit2, Trash2, ShoppingCart, RotateCcw, Search, X, ChevronUp, ChevronDown, History } from 'lucide-react';
import { toast } from 'sonner';
import { KeyboardShortcutsOverlay } from '@/components/KeyboardShortcutsOverlay';
import { useKeyboardShortcuts, Shortcut } from '@/hooks/useKeyboardShortcuts';
import { fuzzySearchProducts } from '@/lib/fuzzySearch';
import PurchaseHistory from './PurchaseHistory';

// Bug #10 fix: safe JSON parse helper so a malformed tags string never crashes the app
function safeParseJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

interface CartItem {
  productId: number;
  quantity: number;
  product: any;
}

// Bug #9 fix: unified mode state — removed the redundant `showHistory` boolean
type AppMode = 'catalog' | 'purchase' | 'history';

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<AppMode>('catalog');
  const [searchQuery, setSearchQuery] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(null);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dialogs
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Bug #6 fix: confirmation dialog before clearing cart via Escape
  const [showCancelPurchaseConfirm, setShowCancelPurchaseConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    tags: '',
  });

  // Queries
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = trpc.products.list.useQuery();
  const { data: purchases = [] } = trpc.purchases.list.useQuery();

  // Mutations
  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success('Product added successfully');
      setShowAddProduct(false);
      setFormData({ name: '', description: '', price: '', tags: '' });
      refetchProducts();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to add product');
    },
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success('Product updated successfully');
      setShowEditProduct(false);
      setFormData({ name: '', description: '', price: '', tags: '' });
      refetchProducts();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to update product');
    },
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success('Product deleted successfully');
      setShowDeleteConfirm(false);
      setSelectedProductId(null);
      refetchProducts();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to delete product');
    },
  });

  const deleteAllMutation = trpc.products.deleteAll.useMutation({
    onSuccess: () => {
      toast.success('All products deleted');
      setShowResetConfirm(false);
      refetchProducts();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to reset products');
    },
  });

  const createPurchaseMutation = trpc.purchases.create.useMutation({
    onSuccess: () => {
      toast.success('Purchase completed successfully');
      setCart([]);
      setMode('catalog');
      refetchProducts();
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to complete purchase');
    },
  });

  // Filtered products with fuzzy search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return fuzzySearchProducts(searchQuery, products);
  }, [products, searchQuery]);

  // Bug #9 fix: helper to switch modes cleanly, always resetting search + index
  const switchMode = (newMode: AppMode) => {
    setMode(newMode);
    setSearchQuery('');
    setSelectedProductIndex(0); // Bug #8 fix: reset index on every mode switch
  };

  // Keyboard shortcuts
  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        key: 'n',
        ctrl: true,
        handler: () => mode === 'catalog' && setShowAddProduct(true),
        description: 'Add new product',
        category: 'catalog',
      },
      {
        key: 'p',
        ctrl: true,
        handler: () => switchMode(mode === 'purchase' ? 'catalog' : 'purchase'),
        description: 'Start new purchase',
        category: 'purchase',
      },
      // Bug #5 fix: Ctrl+H shortcut now actually registered
      {
        key: 'h',
        ctrl: true,
        handler: () => switchMode(mode === 'history' ? 'catalog' : 'history'),
        description: 'Toggle purchase history',
        category: 'general',
      },
      {
        key: 'r',
        ctrl: true,
        handler: () => mode === 'catalog' && setShowResetConfirm(true),
        description: 'Reset all products',
        category: 'catalog',
      },
      {
        key: '/',
        handler: () => {
          if (mode === 'purchase' && searchInputRef.current) {
            searchInputRef.current.focus();
          }
        },
        description: 'Focus search',
        category: 'purchase',
      },
      {
        key: 'ArrowUp',
        handler: () => {
          if (mode === 'purchase') {
            setSelectedProductIndex((i) => Math.max(0, i - 1));
          }
        },
        description: 'Navigate up',
        category: 'general',
      },
      {
        key: 'ArrowDown',
        handler: () => {
          if (mode === 'purchase') {
            setSelectedProductIndex((i) => Math.min(filteredProducts.length - 1, i + 1));
          }
        },
        description: 'Navigate down',
        category: 'general',
      },
      {
        key: 'Enter',
        handler: () => {
          if (mode === 'purchase' && filteredProducts[selectedProductIndex]) {
            // Bug #3 fix: only call handleAddToCart here — the toast is inside that function already
            handleAddToCart(filteredProducts[selectedProductIndex]);
          }
        },
        description: 'Add to cart / Confirm',
        category: 'cart',
      },
      {
        key: 'Backspace',
        handler: (e?: KeyboardEvent) => {
          // Bug #11 fix: don't fire cart removal when the user is typing in an input/textarea
          const active = document.activeElement;
          if (
            active instanceof HTMLInputElement ||
            active instanceof HTMLTextAreaElement
          ) {
            return;
          }
          if (mode === 'purchase' && cart.length > 0) {
            handleRemoveFromCart(cart[selectedCartIndex]?.productId);
          }
        },
        description: 'Remove from cart',
        category: 'cart',
      },
      {
        key: 'Escape',
        handler: () => {
          setShowAddProduct(false);
          setShowEditProduct(false);
          // Bug #6 fix: show confirmation before wiping the cart
          if (mode === 'purchase') {
            if (cart.length > 0) {
              setShowCancelPurchaseConfirm(true);
            } else {
              switchMode('catalog');
            }
          }
        },
        description: 'Cancel / Close',
        category: 'general',
      },
    ],
    [mode, selectedProductIndex, selectedCartIndex, filteredProducts, cart]
  );

  useKeyboardShortcuts(shortcuts);

  const handleAddProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }
    await createProductMutation.mutateAsync({
      ...formData,
      tags: formData.tags ? JSON.stringify(formData.tags.split(',').map((t) => t.trim())) : undefined,
    });
  };

  const handleEditProduct = async (productId: number) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price,
      // Bug #10 fix: safe parse so malformed tags don't crash
      tags: safeParseJson<string[]>(product.tags, []).join(', '),
    });
    setSelectedProductId(productId);
    setShowEditProduct(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProductId) return;
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required');
      return;
    }
    await updateProductMutation.mutateAsync({
      id: selectedProductId,
      ...formData,
      tags: formData.tags ? JSON.stringify(formData.tags.split(',').map((t) => t.trim())) : undefined,
    });
  };

  const handleAddToCart = (product: any) => {
    const existingItem = cart.find((item) => item.productId === product.id);
    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.productId === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, product }]);
    }
    // Bug #3 fix: single toast here — the Enter shortcut handler no longer adds a second one
    toast.success(`${product.name} added to cart`);
  };

  const handleIncreaseQuantity = (productId: number) => {
    setCart(
      cart.map((item) =>
        item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item
      )
    );
  };

  const handleDecreaseQuantity = (productId: number) => {
    setCart(
      cart.map((item) =>
        item.productId === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter((item) => item.productId !== productId));
    toast.success('Item removed from cart');
  };

  const handleCompletePurchase = async () => {
    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    const totalAmount = cart
      .reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0)
      .toFixed(2);

    await createPurchaseMutation.mutateAsync({
      items: cart.map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
        priceAtPurchase: item.product.price,
      })),
      totalAmount,
    });
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Please log in</CardTitle>
            <CardDescription>You need to be logged in to use Shelfify</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <KeyboardShortcutsOverlay />

      {/* Header */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Shelfify</h1>
              <p className="text-sm text-slate-600">Point-of-Sale & Product Manager</p>
            </div>
            <div className="flex gap-2">
              {/* Bug #9 fix: all three buttons now use the unified `mode` state */}
              <Button
                variant={mode === 'catalog' ? 'default' : 'outline'}
                onClick={() => switchMode('catalog')}
                className="gap-2"
              >
                <span>Catalog</span>
              </Button>
              <Button
                variant={mode === 'purchase' ? 'default' : 'outline'}
                onClick={() => switchMode('purchase')}
                className="gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Purchase</span>
                {cart.length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-red-600 rounded-full">
                    {cart.length}
                  </span>
                )}
              </Button>
              {/* Bug #5 fix: History button now toggles via unified mode */}
              <Button
                variant={mode === 'history' ? 'default' : 'outline'}
                onClick={() => switchMode(mode === 'history' ? 'catalog' : 'history')}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                <span>History</span>
                <kbd className="hidden sm:inline-block text-xs px-2 py-1 bg-slate-100 rounded">Ctrl+H</kbd>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {mode === 'history' ? (
          <PurchaseHistory />
        ) : mode === 'catalog' ? (
          <div className="space-y-6">
            {/* Catalog Controls */}
            <div className="flex gap-2 flex-wrap">
              <Button
                onClick={() => setShowAddProduct(true)}
                className="gap-2"
                size="lg"
              >
                <Plus className="w-4 h-4" />
                Add Product
                <kbd className="hidden sm:inline-block text-xs px-2 py-1 bg-slate-200 rounded">Ctrl+N</kbd>
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowResetConfirm(true)}
                className="gap-2"
                size="lg"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
                <kbd className="hidden sm:inline-block text-xs px-2 py-1 bg-slate-200 rounded">Ctrl+R</kbd>
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search products by name, description, or tags..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className="text-center py-12">
                <p className="text-slate-600">Loading products...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <Card className="p-12 text-center">
                <p className="text-slate-600 mb-4">No products found</p>
                <Button onClick={() => setShowAddProduct(true)}>Add your first product</Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="hover:shadow-lg transition-shadow">
                    {product.photoUrl && (
                      <div className="w-full h-40 bg-slate-100 overflow-hidden rounded-t-lg">
                        <img
                          src={product.photoUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    )}
                    <CardContent className="pt-4">
                      <h3 className="font-semibold text-lg text-slate-900">{product.name}</h3>
                      {product.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">{product.description}</p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-2xl font-bold text-slate-900">${product.price}</span>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditProduct(product.id)}
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedProductId(product.id);
                              setShowDeleteConfirm(true);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      {/* Bug #10 fix: safeParseJson so malformed tags never crash the card */}
                      {product.tags && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {safeParseJson<string[]>(product.tags, []).map((tag, idx) => (
                            <span
                              key={idx}
                              className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Products for Purchase */}
            <div className="lg:col-span-2 space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                <Input
                  ref={searchInputRef}
                  placeholder="Search products... (/ to focus)"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSelectedProductIndex(0);
                  }}
                  className="pl-10"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredProducts.map((product, idx) => (
                  <Card
                    key={product.id}
                    className={`cursor-pointer transition-all ${
                      idx === selectedProductIndex
                        ? 'ring-2 ring-blue-500 shadow-md'
                        : 'hover:shadow-md'
                    }`}
                    onClick={() => handleAddToCart(product)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900">{product.name}</h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">{product.description}</p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xl font-bold text-slate-900">${product.price}</span>
                        <Button size="sm" variant="default">
                          Add
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Cart */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>Shopping Cart</CardTitle>
                  <CardDescription>{cart.length} items</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {cart.length === 0 ? (
                    <p className="text-sm text-slate-600 text-center py-8">Cart is empty</p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {cart.map((item, idx) => (
                          <div
                            key={item.productId}
                            className={`flex items-center justify-between p-2 rounded transition-all ${
                              idx === selectedCartIndex
                                ? 'bg-blue-100 ring-1 ring-blue-400'
                                : 'bg-slate-50'
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">{item.product.name}</p>
                              <p className="text-xs text-slate-600">
                                {item.quantity} × ${item.product.price}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              {/* Bug #4 fix: ChevronUp now correctly increases, ChevronDown decreases */}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleIncreaseQuantity(item.productId)}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDecreaseQuantity(item.productId)}
                                disabled={item.quantity <= 1}
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleRemoveFromCart(item.productId)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-slate-600">Subtotal:</span>
                          <span className="font-semibold">
                            ${cart
                              .reduce((sum, item) => sum + parseFloat(item.product.price) * item.quantity, 0)
                              .toFixed(2)}
                          </span>
                        </div>
                        <Button
                          onClick={handleCompletePurchase}
                          className="w-full"
                          size="lg"
                        >
                          Complete Purchase
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            if (cart.length > 0) {
                              setShowCancelPurchaseConfirm(true);
                            } else {
                              switchMode('catalog');
                            }
                          }}
                          className="w-full"
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </main>

      {/* Footer — Credits */}
      <footer className="border-t border-slate-200 bg-white mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <p className="text-xs text-slate-400">© Shelfify · Built by Yossof0</p>
          <div className="flex items-center gap-3">
            {/* Website */}
            <a href="https://yossof0.github.io" target="_blank" rel="noreferrer" title="Website" className="text-slate-400 hover:text-slate-700 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
              </svg>
            </a>
            {/* Facebook */}
            <a href="https://facebook.com/YossofABD" target="_blank" rel="noreferrer" title="Facebook" className="text-slate-400 hover:text-blue-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
              </svg>
            </a>
            {/* Twitter/X */}
            <a href="https://x.com/@Overclock33" target="_blank" rel="noreferrer" title="Twitter / X" className="text-slate-400 hover:text-black transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
              </svg>
            </a>
            {/* YouTube */}
            <a href="https://youtube.com/@OverClock33" target="_blank" rel="noreferrer" title="YouTube" className="text-slate-400 hover:text-red-600 transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </a>
          </div>
        </div>
      </footer>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Coffee"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price *</label>
              <Input
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                placeholder="0.00"
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="e.g., hot, beverage, organic"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowAddProduct(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddProduct} disabled={createProductMutation.isPending}>
                Add Product
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Product Dialog */}
      <Dialog open={showEditProduct} onOpenChange={setShowEditProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Product</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Product Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price *</label>
              <Input
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                type="number"
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Tags (comma-separated)</label>
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setShowEditProduct(false)}>
                Cancel
              </Button>
              <Button onClick={handleSaveEdit} disabled={updateProductMutation.isPending}>
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (selectedProductId) {
                  deleteProductMutation.mutate({ id: selectedProductId });
                }
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Confirmation */}
      <AlertDialog open={showResetConfirm} onOpenChange={setShowResetConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Reset All Products</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all products? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteAllMutation.mutate()}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete All
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bug #6 fix: Cancel Purchase confirmation dialog */}
      <AlertDialog open={showCancelPurchaseConfirm} onOpenChange={setShowCancelPurchaseConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Purchase?</AlertDialogTitle>
            <AlertDialogDescription>
              You have {cart.length} item{cart.length !== 1 ? 's' : ''} in your cart. Cancelling will clear the cart. Are you sure?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2 justify-end">
            <AlertDialogCancel>Keep Shopping</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setCart([]);
                switchMode('catalog');
              }}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
