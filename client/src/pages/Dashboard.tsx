import { useState, useMemo, useRef, useEffect } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Edit2,
  Trash2,
  ShoppingCart,
  RotateCcw,
  Search,
  X,
  ChevronUp,
  ChevronDown,
  History,
} from "lucide-react";
import { toast } from "sonner";
import { KeyboardShortcutsOverlay } from "@/components/KeyboardShortcutsOverlay";
import { useKeyboardShortcuts, Shortcut } from "@/hooks/useKeyboardShortcuts";
import { fuzzySearchProducts } from "@/lib/fuzzySearch";
import PurchaseHistory from "./PurchaseHistory";

interface CartItem {
  productId: number;
  quantity: number;
  product: any;
}

interface NavigationState {
  selectedIndex: number;
  mode: "catalog" | "purchase" | "history";
}

export default function Dashboard() {
  const { user, isAuthenticated } = useAuth();
  const [mode, setMode] = useState<"catalog" | "purchase" | "history">(
    "catalog"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);
  const [selectedCartIndex, setSelectedCartIndex] = useState(0);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [showHistory, setShowHistory] = useState(false);

  // Dialogs
  const [showAddProduct, setShowAddProduct] = useState(false);
  const [showEditProduct, setShowEditProduct] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    tags: "",
  });

  // Queries
  const {
    data: products = [],
    isLoading: productsLoading,
    refetch: refetchProducts,
  } = trpc.products.list.useQuery();
  const { data: purchases = [] } = trpc.purchases.list.useQuery();

  // Mutations
  const createProductMutation = trpc.products.create.useMutation({
    onSuccess: () => {
      toast.success("Product added successfully");
      setShowAddProduct(false);
      setFormData({ name: "", description: "", price: "", tags: "" });
      refetchProducts();
    },
    onError: error => {
      toast.error(error.message || "Failed to add product");
    },
  });

  const updateProductMutation = trpc.products.update.useMutation({
    onSuccess: () => {
      toast.success("Product updated successfully");
      setShowEditProduct(false);
      setFormData({ name: "", description: "", price: "", tags: "" });
      refetchProducts();
    },
    onError: error => {
      toast.error(error.message || "Failed to update product");
    },
  });

  const deleteProductMutation = trpc.products.delete.useMutation({
    onSuccess: () => {
      toast.success("Product deleted successfully");
      setShowDeleteConfirm(false);
      setSelectedProductId(null);
      refetchProducts();
    },
    onError: error => {
      toast.error(error.message || "Failed to delete product");
    },
  });

  const deleteAllMutation = trpc.products.deleteAll.useMutation({
    onSuccess: () => {
      toast.success("All products deleted");
      setShowResetConfirm(false);
      refetchProducts();
    },
    onError: error => {
      toast.error(error.message || "Failed to reset products");
    },
  });

  const createPurchaseMutation = trpc.purchases.create.useMutation({
    onSuccess: () => {
      toast.success("Purchase completed successfully");
      setCart([]);
      setMode("catalog");
      refetchProducts();
    },
    onError: error => {
      toast.error(error.message || "Failed to complete purchase");
    },
  });

  // Filtered products with fuzzy search
  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    return fuzzySearchProducts(searchQuery, products);
  }, [products, searchQuery]);

  // Keyboard shortcuts
  const shortcuts: Shortcut[] = useMemo(
    () => [
      {
        key: "n",
        ctrl: true,
        handler: () => mode === "catalog" && setShowAddProduct(true),
        description: "Add new product",
        category: "catalog",
      },
      {
        key: "p",
        ctrl: true,
        handler: () => {
          setMode(mode === "catalog" ? "purchase" : "catalog");
          setSearchQuery("");
          setSelectedProductIndex(0);
        },
        description: "Start new purchase",
        category: "purchase",
      },
      {
        key: "r",
        ctrl: true,
        handler: () => mode === "catalog" && setShowResetConfirm(true),
        description: "Reset all products",
        category: "catalog",
      },
      {
        key: "/",
        handler: () => {
          if (mode === "purchase" && searchInputRef.current) {
            searchInputRef.current.focus();
          }
        },
        description: "Focus search",
        category: "purchase",
      },
      {
        key: "ArrowUp",
        handler: () => {
          if (mode === "purchase") {
            setSelectedProductIndex(Math.max(0, selectedProductIndex - 1));
          }
        },
        description: "Navigate up",
        category: "general",
      },
      {
        key: "ArrowDown",
        handler: () => {
          if (mode === "purchase") {
            setSelectedProductIndex(
              Math.min(filteredProducts.length - 1, selectedProductIndex + 1)
            );
          }
        },
        description: "Navigate down",
        category: "general",
      },
      {
        key: "Enter",
        handler: () => {
          if (mode === "purchase" && filteredProducts[selectedProductIndex]) {
            handleAddToCart(filteredProducts[selectedProductIndex]);
            toast.success("Added to cart");
          }
        },
        description: "Add to cart / Confirm",
        category: "cart",
      },
      {
        key: "Backspace",
        handler: () => {
          if (mode === "purchase" && cart.length > 0) {
            handleRemoveFromCart(cart[selectedCartIndex]?.productId);
          }
        },
        description: "Remove from cart",
        category: "cart",
      },
      {
        key: "Escape",
        handler: () => {
          setShowAddProduct(false);
          setShowEditProduct(false);
          if (mode === "purchase") {
            setMode("catalog");
            setCart([]);
          }
        },
        description: "Cancel / Close",
        category: "general",
      },
    ],
    [mode, selectedProductIndex, selectedCartIndex, filteredProducts, cart]
  );

  useKeyboardShortcuts(shortcuts);

  const handleAddProduct = async () => {
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }
    await createProductMutation.mutateAsync({
      ...formData,
      tags: formData.tags
        ? JSON.stringify(formData.tags.split(",").map(t => t.trim()))
        : undefined,
    });
  };

  const handleEditProduct = async (productId: number) => {
    const product = products.find(p => p.id === productId);
    if (!product) return;

    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price,
      tags: product.tags ? JSON.parse(product.tags).join(", ") : "",
    });
    setSelectedProductId(productId);
    setShowEditProduct(true);
  };

  const handleSaveEdit = async () => {
    if (!selectedProductId) return;
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }
    await updateProductMutation.mutateAsync({
      id: selectedProductId,
      ...formData,
      tags: formData.tags
        ? JSON.stringify(formData.tags.split(",").map(t => t.trim()))
        : undefined,
    });
  };

  const handleAddToCart = (product: any) => {
    const existingItem = cart.find(item => item.productId === product.id);
    if (existingItem) {
      setCart(
        cart.map(item =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        )
      );
    } else {
      setCart([...cart, { productId: product.id, quantity: 1, product }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const handleIncreaseQuantity = (productId: number) => {
    setCart(
      cart.map(item =>
        item.productId === productId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  };

  const handleDecreaseQuantity = (productId: number) => {
    setCart(
      cart.map(item =>
        item.productId === productId && item.quantity > 1
          ? { ...item, quantity: item.quantity - 1 }
          : item
      )
    );
  };

  const handleRemoveFromCart = (productId: number) => {
    setCart(cart.filter(item => item.productId !== productId));
    toast.success("Item removed from cart");
  };

  const handleCompletePurchase = async () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    const totalAmount = cart
      .reduce(
        (sum, item) => sum + parseFloat(item.product.price) * item.quantity,
        0
      )
      .toFixed(2);

    await createPurchaseMutation.mutateAsync({
      items: cart.map(item => ({
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
            <CardDescription>
              You need to be logged in to use the Items Manager
            </CardDescription>
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
              <h1 className="text-3xl font-bold text-slate-900">
                Items Manager
              </h1>
              <p className="text-sm text-slate-600">
                Elegant Point-of-Sale System
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant={mode === "catalog" ? "default" : "outline"}
                onClick={() => {
                  setMode("catalog");
                  setCart([]);
                  setSearchQuery("");
                }}
                className="gap-2"
              >
                <span>Catalog</span>
                <kbd className="hidden sm:inline-block text-xs px-2 py-1 bg-slate-100 rounded">
                  Ctrl+P
                </kbd>
              </Button>
              <Button
                variant={mode === "purchase" ? "default" : "outline"}
                onClick={() => setMode("purchase")}
                className="gap-2"
              >
                <ShoppingCart className="w-4 h-4" />
                <span>Purchase</span>
                {cart.length > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-red-600 rounded-full">
                    {cart.length}
                  </span>
                )}
              </Button>
              <Button
                variant={showHistory ? "default" : "outline"}
                onClick={() => setShowHistory(!showHistory)}
                className="gap-2"
              >
                <History className="w-4 h-4" />
                <span>History</span>
                <kbd className="hidden sm:inline-block text-xs px-2 py-1 bg-slate-100 rounded">
                  Ctrl+H
                </kbd>
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {showHistory ? (
          <PurchaseHistory />
        ) : mode === "catalog" ? (
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
                <kbd className="hidden sm:inline-block text-xs px-2 py-1 bg-slate-200 rounded">
                  Ctrl+N
                </kbd>
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowResetConfirm(true)}
                className="gap-2"
                size="lg"
              >
                <RotateCcw className="w-4 h-4" />
                Reset All
                <kbd className="hidden sm:inline-block text-xs px-2 py-1 bg-slate-200 rounded">
                  Ctrl+R
                </kbd>
              </Button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search products by name, description, or tags..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
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
                <Button onClick={() => setShowAddProduct(true)}>
                  Add your first product
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredProducts.map(product => (
                  <Card
                    key={product.id}
                    className="hover:shadow-lg transition-shadow"
                  >
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
                      <h3 className="font-semibold text-lg text-slate-900">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                          {product.description}
                        </p>
                      )}
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-2xl font-bold text-slate-900">
                          ${product.price}
                        </span>
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
                      {product.tags && (
                        <div className="mt-3 flex flex-wrap gap-1">
                          {JSON.parse(product.tags).map(
                            (tag: string, idx: number) => (
                              <span
                                key={idx}
                                className="inline-block px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded"
                              >
                                {tag}
                              </span>
                            )
                          )}
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
                  onChange={e => {
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
                        ? "ring-2 ring-blue-500 shadow-md"
                        : "hover:shadow-md"
                    }`}
                    onClick={() => handleAddToCart(product)}
                  >
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900">
                        {product.name}
                      </h3>
                      <p className="text-sm text-slate-600 mt-1 line-clamp-2">
                        {product.description}
                      </p>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xl font-bold text-slate-900">
                          ${product.price}
                        </span>
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
                    <p className="text-sm text-slate-600 text-center py-8">
                      Cart is empty
                    </p>
                  ) : (
                    <>
                      <div className="space-y-2 max-h-64 overflow-y-auto">
                        {cart.map((item, idx) => (
                          <div
                            key={item.productId}
                            className={`flex items-center justify-between p-2 rounded transition-all ${
                              idx === selectedCartIndex
                                ? "bg-blue-100 ring-1 ring-blue-400"
                                : "bg-slate-50"
                            }`}
                          >
                            <div className="flex-1">
                              <p className="text-sm font-medium text-slate-900">
                                {item.product.name}
                              </p>
                              <p className="text-xs text-slate-600">
                                {item.quantity} × ${item.product.price}
                              </p>
                            </div>
                            <div className="flex gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleDecreaseQuantity(item.productId)
                                }
                                disabled={item.quantity <= 1}
                              >
                                <ChevronUp className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleIncreaseQuantity(item.productId)
                                }
                              >
                                <ChevronDown className="w-3 h-3" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() =>
                                  handleRemoveFromCart(item.productId)
                                }
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
                            $
                            {cart
                              .reduce(
                                (sum, item) =>
                                  sum +
                                  parseFloat(item.product.price) *
                                    item.quantity,
                                0
                              )
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
                            setMode("catalog");
                            setCart([]);
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
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
                placeholder="e.g., Coffee"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Product description"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price *</label>
              <Input
                value={formData.price}
                onChange={e =>
                  setFormData({ ...formData, price: e.target.value })
                }
                placeholder="0.00"
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Tags (comma-separated)
              </label>
              <Input
                value={formData.tags}
                onChange={e =>
                  setFormData({ ...formData, tags: e.target.value })
                }
                placeholder="e.g., hot, beverage, organic"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowAddProduct(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleAddProduct}
                disabled={createProductMutation.isPending}
              >
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
                onChange={e =>
                  setFormData({ ...formData, name: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={formData.description}
                onChange={e =>
                  setFormData({ ...formData, description: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Price *</label>
              <Input
                value={formData.price}
                onChange={e =>
                  setFormData({ ...formData, price: e.target.value })
                }
                type="number"
                step="0.01"
              />
            </div>
            <div>
              <label className="text-sm font-medium">
                Tags (comma-separated)
              </label>
              <Input
                value={formData.tags}
                onChange={e =>
                  setFormData({ ...formData, tags: e.target.value })
                }
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setShowEditProduct(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveEdit}
                disabled={updateProductMutation.isPending}
              >
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
              Are you sure you want to delete this product? This action cannot
              be undone.
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
              Are you sure you want to delete all products? This action cannot
              be undone.
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
    </div>
  );
}
