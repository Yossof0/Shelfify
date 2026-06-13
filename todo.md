# Items Manager v2 - Project TODO

## Database & Backend
- [x] Create products table schema (id, name, description, price, tags, photoUrl, createdAt, updatedAt)
- [x] Create purchases table schema (id, userId, totalAmount, createdAt)
- [x] Create purchaseItems table schema (id, purchaseId, productId, quantity, priceAtPurchase)
- [x] Add database query helpers for products CRUD
- [x] Add database query helpers for purchases and purchase items

## Product Management Backend (tRPC Procedures)
- [x] Create products.list procedure (get all products)
- [x] Create products.create procedure (add new product with optional photo)
- [x] Create products.update procedure (edit product details)
- [x] Create products.delete procedure (remove product)
- [x] Create products.deleteAll procedure (reset entire catalog)
- [x] Create purchases.list procedure (get all purchases with items)
- [x] Create purchases.create procedure (create new purchase from cart)

## Product Catalog UI
- [x] Build product catalog page layout with elegant design
- [x] Build product list display (name, description, price, tags, photo)
- [x] Build add product modal with form (name, description, price, tags, photo upload)
- [x] Build edit product modal with form
- [x] Build delete product confirmation dialog
- [x] Build reset catalog confirmation dialog
- [x] Implement keyboard shortcuts for product management (Ctrl+N for new, E for edit, D for delete, etc.)
- [x] Add keyboard shortcut cheat-sheet overlay (? to toggle)

## Purchase/Cart Workflow UI
- [x] Build purchase session starter (button/shortcut to begin)
- [x] Build product search/filter interface with fuzzy matching
- [x] Build cart display panel with line items, quantities, totals
- [x] Build add-to-cart functionality with keyboard navigation
- [x] Build quantity adjustment in cart (keyboard + UI)
- [x] Build remove-from-cart functionality (keyboard + UI)
- [x] Build purchase completion flow (confirm/cancel with keyboard)
- [x] Implement keyboard shortcuts for purchase workflow (/ for search, Enter to add, Backspace to remove, etc.)

## Purchase History
- [ ] Build purchase history page/panel
- [ ] Display list of completed purchases (date, items, total)
- [ ] Show purchase details (expandable items list)

## Keyboard Shortcut System
- [x] Create centralized keyboard shortcut manager/hook
- [x] Document all shortcuts in cheat-sheet
- [x] Implement shortcut overlay component (? to toggle)
- [ ] Test all shortcuts for conflicts and responsiveness

## Polish & Testing
- [ ] Verify elegant UI styling and spacing
- [ ] Test all keyboard shortcuts end-to-end
- [ ] Test data persistence across page reloads
- [ ] Test fuzzy search filtering
- [ ] Test cart calculations and totals
- [ ] Write vitest tests for critical procedures
- [ ] Create checkpoint for delivery

## Delivery
- [ ] Save final checkpoint
- [ ] Generate ZIP file
