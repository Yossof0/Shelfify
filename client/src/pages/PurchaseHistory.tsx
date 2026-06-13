import { useState } from 'react';
import { trpc } from '@/lib/trpc';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';

interface ExpandedPurchase {
  [key: number]: boolean;
}

export default function PurchaseHistory() {
  const [expandedPurchases, setExpandedPurchases] = useState<ExpandedPurchase>({});
  const { data: purchases = [], isLoading } = trpc.purchases.list.useQuery();

  const toggleExpand = (purchaseId: number) => {
    setExpandedPurchases((prev) => ({
      ...prev,
      [purchaseId]: !prev[purchaseId],
    }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-slate-600">Loading purchase history...</p>
      </div>
    );
  }

  if (purchases.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-slate-600 mb-4">No purchases yet</p>
        <p className="text-sm text-slate-500">Your purchase history will appear here</p>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-slate-900">Purchase History</h2>
        <p className="text-sm text-slate-600 mt-1">Total purchases: {purchases.length}</p>
      </div>

      {purchases.map((purchase: any) => (
        <Card key={purchase.id} className="overflow-hidden">
          <button
            onClick={() => toggleExpand(purchase.id)}
            className="w-full text-left hover:bg-slate-50 transition-colors"
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg">
                    {format(new Date(purchase.createdAt), 'MMM dd, yyyy')}
                  </CardTitle>
                  <CardDescription>
                    {format(new Date(purchase.createdAt), 'hh:mm a')}
                  </CardDescription>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-slate-900">
                    ${parseFloat(purchase.totalAmount).toFixed(2)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    {expandedPurchases[purchase.id] ? (
                      <ChevronUp className="w-4 h-4 text-slate-600" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-slate-600" />
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </button>

          {expandedPurchases[purchase.id] && (
            <CardContent className="pt-0 border-t border-slate-200">
              <div className="mt-4 space-y-3">
                {Array.isArray(purchase.items) && purchase.items.length > 0 ? (
                  purchase.items.map((item: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">
                          {item.productName ?? `Product #${item.productId}`}
                        </p>
                        <p className="text-xs text-slate-600 mt-1">
                          {item.quantity} × ${parseFloat(item.priceAtPurchase).toFixed(2)} each
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          ${(parseFloat(item.priceAtPurchase) * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-slate-600 text-center py-4">No items in this purchase</p>
                )}
              </div>
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}
