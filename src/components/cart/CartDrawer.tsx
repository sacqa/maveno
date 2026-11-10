import React from 'react';
import {
  X,
  Trash2,
  ShoppingBag,
  ShieldCheck,
  ArrowRight,
  Lock,
  ExternalLink,
  Truck,
} from 'lucide-react';
import { CartItem, Country, Currency, StoreSettings } from '../../types/ecommerce';
import {
  formatMinorUnits,
  calculateOrderFinancials,
  validateCountryEligibility,
} from '../../utils/commerce-engine';

interface CartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  items: CartItem[];
  currentCountry: Country;
  currentCurrency: Currency;
  settings: StoreSettings;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onViewFullCart?: () => void;
  onCheckout: () => void;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  onClose,
  items,
  currentCountry,
  currentCurrency,
  settings,
  onUpdateQuantity,
  onRemoveItem,
  onViewFullCart,
  onCheckout,
}) => {
  if (!isOpen) return null;

  const subtotalMinorUnits = items.reduce(
    (acc, item) => acc + item.totalPriceMinorUnits,
    0
  );

  const financials = calculateOrderFinancials({
    subtotalMinorUnits,
    country: currentCountry,
    currency: currentCurrency,
    freeShippingThresholdMinorUnits: settings.freeShippingThresholdMinorUnits,
  });

  const eligibility = validateCountryEligibility(currentCountry);
  const thresholdInTargetMinor = Math.round(
    settings.freeShippingThresholdMinorUnits * currentCurrency.exchangeRateToBase
  );
  const remainingForFreeShipping = Math.max(
    0,
    thresholdInTargetMinor - subtotalMinorUnits
  );
  const progressPercent =
    thresholdInTargetMinor > 0
      ? Math.min(100, Math.round((subtotalMinorUnits / thresholdInTargetMinor) * 100))
      : 100;

  return (
    <div
      data-testid="cart-drawer"
      className="fixed inset-0 z-50 overflow-hidden bg-neutral-950/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white h-full shadow-2xl flex flex-col justify-between border-l border-neutral-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div className="flex items-center gap-2.5">
            <ShoppingBag className="w-5 h-5 text-amber-800" />
            <div>
              <h2 className="text-base font-bold font-display text-neutral-900">
                Your Shopping Cart ({items.reduce((a, b) => a + b.quantity, 0)})
              </h2>
              <p className="text-[11px] text-neutral-500">
                Destination: {currentCountry.flagEmoji} {currentCountry.name} ({currentCurrency.code})
              </p>
            </div>
          </div>
          <button
            data-testid="close-cart-drawer-btn"
            onClick={onClose}
            className="p-2 rounded-lg text-neutral-500 hover:text-neutral-900 hover:bg-neutral-200/60 transition-colors cursor-pointer"
            aria-label="Close shopping cart"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Free Shipping Progress Bar */}
        {items.length > 0 && (
          <div className="px-5 py-3 bg-amber-50/70 border-b border-amber-200/70 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="flex items-center gap-1.5 font-medium text-amber-950">
                <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                {remainingForFreeShipping > 0 ? (
                  <span>
                    Add{' '}
                    <strong className="font-mono-numbers">
                      {formatMinorUnits(remainingForFreeShipping, currentCurrency)}
                    </strong>{' '}
                    more for <strong className="text-emerald-800">FREE Express Shipping</strong>
                  </span>
                ) : (
                  <span className="text-emerald-800 font-bold">
                    ✓ You unlocked FREE Doha Express Shipping!
                  </span>
                )}
              </span>
              <span className="text-[10px] font-mono-numbers font-bold text-amber-800">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full h-1.5 bg-amber-200/70 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-600 transition-all duration-300 rounded-full"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        )}

        {/* Cart Items List */}
        <div className="grow overflow-y-auto p-5 space-y-4">
          {items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center py-12 text-neutral-500 space-y-3">
              <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center text-neutral-400">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-neutral-700">Your cart is empty</p>
              <p className="text-xs text-neutral-400 max-w-xs">
                Explore our precision CNC hardware and cold-extracted botanical formulations.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 px-4 py-2 bg-neutral-900 text-white rounded-lg text-xs font-semibold hover:bg-neutral-800 transition-colors cursor-pointer"
              >
                Continue Shopping
              </button>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.id}
                data-testid={`drawer-cart-item-${item.productId}`}
                className="flex gap-3.5 p-3.5 rounded-xl bg-neutral-50 border border-neutral-200/80"
              >
                <img
                  src={item.variant.image || item.product.galleryImages[0]}
                  alt={item.product.name}
                  className="w-16 h-16 rounded-lg object-cover bg-white border border-neutral-200 shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div className="grow min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-bold text-neutral-900 truncate">
                      {item.product.name}
                    </h3>
                    <button
                      type="button"
                      data-testid={`drawer-remove-item-${item.productId}`}
                      onClick={() => onRemoveItem(item.id)}
                      className="text-neutral-400 hover:text-red-600 transition-colors p-0.5 cursor-pointer"
                      aria-label={`Remove ${item.product.name} from cart`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-[11px] text-neutral-500 truncate mt-0.5">
                    {item.variant.title} ·{' '}
                    <span className="font-mono-numbers">{item.variant.sku}</span>
                  </p>
                  <p className="text-[10px] text-neutral-400 font-mono-numbers mt-0.5">
                    Unit: {formatMinorUnits(item.unitPriceMinorUnits, currentCurrency)}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between">
                    <div className="flex items-center border border-neutral-300 rounded-md bg-white">
                      <button
                        type="button"
                        data-testid={`drawer-qty-dec-${item.productId}`}
                        onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                        className="px-2 py-0.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <span
                        data-testid={`drawer-qty-val-${item.productId}`}
                        className="px-2.5 py-0.5 text-xs font-mono-numbers font-semibold"
                      >
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        data-testid={`drawer-qty-inc-${item.productId}`}
                        onClick={() => onUpdateQuantity(item.id, item.quantity + 1)}
                        className="px-2 py-0.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    <span
                      data-testid={`drawer-item-total-${item.productId}`}
                      className="text-xs font-bold font-mono-numbers text-neutral-900"
                    >
                      {formatMinorUnits(item.totalPriceMinorUnits, currentCurrency)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Drawer Footer Summary & Checkout Trigger */}
        {items.length > 0 && (
          <div className="p-5 border-t border-neutral-200 bg-neutral-50 space-y-4">
            {/* Financial Breakdown */}
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Cart Subtotal</span>
                <span
                  data-testid="drawer-subtotal"
                  className="font-mono-numbers font-medium text-neutral-900"
                >
                  {formatMinorUnits(financials.subtotalMinorUnits, currentCurrency)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>Estimated Shipping ({currentCountry.code})</span>
                <span className="font-mono-numbers">
                  {financials.shippingFeeMinorUnits === 0
                    ? 'FREE'
                    : formatMinorUnits(financials.shippingFeeMinorUnits, currentCurrency)}
                </span>
              </div>
              <div className="flex justify-between text-neutral-600">
                <span>
                  Estimated Tax ({Math.round(currentCountry.standardTaxRate * 100)}%)
                </span>
                <span className="font-mono-numbers">
                  {formatMinorUnits(financials.taxMinorUnits, currentCurrency)}
                </span>
              </div>
              <div className="pt-2 border-t border-neutral-200 flex justify-between text-sm font-bold text-neutral-900">
                <span>Estimated Total</span>
                <span data-testid="drawer-estimated-total" className="font-mono-numbers">
                  {financials.formattedTotal}
                </span>
              </div>
            </div>

            {/* Age Verification Notice */}
            <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200/80 text-[11px] text-amber-950 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-amber-700 shrink-0" />
              <span>
                Mandatory <strong>{currentCountry.minimumAge}+ Age Verification</strong> &amp; discount codes available in Cart &amp; Checkout.
              </span>
            </div>

            {eligibility.isEligible ? (
              <div className="grid grid-cols-2 gap-2.5">
                {onViewFullCart && (
                  <button
                    type="button"
                    data-testid="drawer-view-cart-btn"
                    onClick={onViewFullCart}
                    className="py-3 px-4 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 border border-neutral-300 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>View Cart</span>
                  </button>
                )}
                <button
                  type="button"
                  data-testid="drawer-checkout-btn"
                  onClick={onCheckout}
                  className={`${
                    onViewFullCart ? 'col-span-1' : 'col-span-2'
                  } py-3 px-4 rounded-xl bg-[#8a1538] hover:bg-[#70112d] text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer`}
                >
                  <span>Checkout</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                <Lock className="w-4 h-4 text-red-600 shrink-0" />
                <span>Checkout blocked for {currentCountry.name}.</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
