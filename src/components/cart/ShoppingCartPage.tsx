import React, { useState } from 'react';
import {
  ShoppingBag,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Tag,
  Truck,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileText,
  X,
  Lock,
} from 'lucide-react';
import {
  CartItem,
  Country,
  Currency,
  DiscountRule,
  StoreSettings,
} from '../../types/ecommerce';
import {
  formatMinorUnits,
  calculateOrderFinancials,
  calculateDiscountBenefit,
  getAvailableShippingMethods,
  validateCountryEligibility,
} from '../../utils/commerce-engine';

interface ShoppingCartPageProps {
  items: CartItem[];
  currentCountry: Country;
  currentCurrency: Currency;
  settings: StoreSettings;
  discounts: DiscountRule[];
  appliedDiscountCode: string;
  onApplyDiscountCode: (code: string) => void;
  orderNotes: string;
  onChangeOrderNotes: (notes: string) => void;
  selectedShippingMethodId: string;
  onSelectShippingMethod: (methodId: string) => void;
  onUpdateQuantity: (cartItemId: string, newQty: number) => void;
  onRemoveItem: (cartItemId: string) => void;
  onClearCart: () => void;
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
  onViewProduct: (product: CartItem['product']) => void;
}

export const ShoppingCartPage: React.FC<ShoppingCartPageProps> = ({
  items,
  currentCountry,
  currentCurrency,
  settings,
  discounts,
  appliedDiscountCode,
  onApplyDiscountCode,
  orderNotes,
  onChangeOrderNotes,
  selectedShippingMethodId,
  onSelectShippingMethod,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onContinueShopping,
  onProceedToCheckout,
  onViewProduct,
}) => {
  const [discountInput, setDiscountInput] = useState(appliedDiscountCode || '');
  const [discountFeedback, setDiscountFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const subtotalMinorUnits = items.reduce(
    (acc, item) => acc + item.totalPriceMinorUnits,
    0
  );

  const shippingMethods = getAvailableShippingMethods(
    currentCountry,
    currentCurrency,
    settings
  );
  const activeShippingMethod =
    shippingMethods.find((m) => m.id === selectedShippingMethodId) ||
    shippingMethods[0];

  const matchedDiscountRule = appliedDiscountCode
    ? discounts.find(
        (d) => d.code.trim().toUpperCase() === appliedDiscountCode.trim().toUpperCase()
      ) || null
    : null;

  const financials = calculateOrderFinancials({
    subtotalMinorUnits,
    country: currentCountry,
    currency: currentCurrency,
    freeShippingThresholdMinorUnits: settings.freeShippingThresholdMinorUnits,
    shippingMethodOption: activeShippingMethod,
    discountRule: matchedDiscountRule,
  });

  const eligibility = validateCountryEligibility(currentCountry);
  const thresholdInTargetMinor = Math.round(
    settings.freeShippingThresholdMinorUnits * currentCurrency.exchangeRateToBase
  );
  const remainingForFreeShipping = Math.max(
    0,
    thresholdInTargetMinor - subtotalMinorUnits
  );

  const handleApplyDiscount = (codeToApply?: string) => {
    const rawCode = (codeToApply !== undefined ? codeToApply : discountInput)
      .trim()
      .toUpperCase();
    if (!rawCode) {
      onApplyDiscountCode('');
      setDiscountFeedback(null);
      return;
    }

    const rule = discounts.find((d) => d.code.trim().toUpperCase() === rawCode);
    if (!rule) {
      setDiscountFeedback({
        type: 'error',
        message: `Discount code "${rawCode}" is not valid.`,
      });
      return;
    }

    const benefit = calculateDiscountBenefit(
      subtotalMinorUnits,
      activeShippingMethod.baseFeeMinorUnits,
      rule
    );

    if (!benefit.eligible) {
      setDiscountFeedback({
        type: 'error',
        message:
          benefit.reason ||
          `Code "${rawCode}" requires a minimum order of ${formatMinorUnits(
            rule.minPurchaseMinorUnits,
            currentCurrency
          )}.`,
      });
      return;
    }

    setDiscountInput(rawCode);
    onApplyDiscountCode(rawCode);
    setDiscountFeedback({
      type: 'success',
      message:
        rule.type === 'free_shipping'
          ? `Code "${rawCode}" applied — Free Express Shipping unlocked!`
          : `Code "${rawCode}" applied — You saved ${formatMinorUnits(
              benefit.discountMinorUnits,
              currentCurrency
            )}!`,
    });
  };

  const handleRemoveDiscount = () => {
    setDiscountInput('');
    onApplyDiscountCode('');
    setDiscountFeedback(null);
  };

  const activePromoPills = discounts.filter((d) => d.status === 'active');

  return (
    <div
      data-testid="shopping-cart-page"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10"
    >
      {/* Top Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-200 pb-6">
        <div>
          <button
            type="button"
            data-testid="cart-continue-shopping-top"
            onClick={onContinueShopping}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-600 hover:text-neutral-900 mb-2 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Continue Shopping</span>
          </button>
          <h1 className="text-2xl sm:text-3xl font-bold font-display text-neutral-900 flex items-center gap-3">
            <span>Your Shopping Cart</span>
            <span className="text-sm font-mono-numbers px-3 py-1 rounded-full bg-neutral-900 text-white">
              {items.reduce((acc, i) => acc + i.quantity, 0)} Items
            </span>
          </h1>
        </div>

        {items.length > 0 && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              data-testid="cart-clear-btn"
              onClick={onClearCart}
              className="px-3.5 py-2 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-600 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer"
            >
              Clear Cart
            </button>
            <button
              type="button"
              data-testid="cart-checkout-top-btn"
              onClick={onProceedToCheckout}
              disabled={!eligibility.isEligible}
              className="px-5 py-2.5 rounded-xl bg-[#8a1538] hover:bg-[#70112d] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {items.length === 0 ? (
        <div
          data-testid="empty-cart-state"
          className="my-12 bg-white rounded-2xl border border-neutral-200 p-12 text-center max-w-xl mx-auto space-y-4 shadow-2xs"
        >
          <div className="w-16 h-16 rounded-2xl bg-neutral-100 text-neutral-400 flex items-center justify-center mx-auto">
            <ShoppingBag className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-neutral-900">
            Your shopping cart is currently empty
          </h2>
          <p className="text-xs text-neutral-500 leading-relaxed">
            Browse our Qatar MOPH-compliant precision CNC hardware, rebuildable atomizers, and cold-macerated botanical reserves. Your cart automatically persists across page refreshes.
          </p>
          <div className="pt-2">
            <button
              type="button"
              data-testid="empty-cart-shop-btn"
              onClick={onContinueShopping}
              className="px-6 py-3 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer"
            >
              <span>Explore Product Catalogue</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left 8 Columns: Line Items & Order Notes */}
          <div className="lg:col-span-8 space-y-6">
            {/* Free Shipping Banner */}
            <div className="p-4 rounded-xl bg-amber-50/90 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 text-xs text-amber-950">
                <Truck className="w-4 h-4 text-amber-800 shrink-0" />
                {remainingForFreeShipping > 0 && financials.shippingFeeMinorUnits > 0 ? (
                  <span>
                    Add{' '}
                    <strong className="font-mono-numbers">
                      {formatMinorUnits(remainingForFreeShipping, currentCurrency)}
                    </strong>{' '}
                    more to qualify for <strong>FREE Doha Same-Day Courier Shipping</strong>!
                  </span>
                ) : (
                  <span className="font-semibold text-emerald-900">
                    ✓ Your order qualifies for FREE Doha Express Shipping!
                  </span>
                )}
              </div>
              <span className="text-[11px] font-mono-numbers text-amber-800 font-semibold">
                Threshold: {formatMinorUnits(thresholdInTargetMinor, currentCurrency)}
              </span>
            </div>

            {/* Line Items Table */}
            <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-2xs">
              <div className="hidden sm:grid sm:grid-cols-12 px-6 py-3.5 bg-neutral-50 border-b border-neutral-200 text-[11px] font-bold uppercase tracking-wider text-neutral-500">
                <div className="col-span-6">Product &amp; Variant</div>
                <div className="col-span-2 text-center">Unit Price</div>
                <div className="col-span-2 text-center">Quantity</div>
                <div className="col-span-2 text-right">Line Total</div>
              </div>

              <div className="divide-y divide-neutral-200">
                {items.map((item) => {
                  const maxStock = item.product.continueSellingWhenOutOfStock
                    ? 99
                    : Math.max(1, item.variant.stockQuantity);
                  return (
                    <div
                      key={item.id}
                      data-testid={`cart-page-item-${item.productId}`}
                      className="p-5 sm:px-6 grid grid-cols-1 sm:grid-cols-12 gap-4 items-center hover:bg-neutral-50/50 transition-colors"
                    >
                      {/* Product & Variant */}
                      <div className="sm:col-span-6 flex items-start gap-4">
                        <img
                          src={item.variant.image || item.product.galleryImages[0]}
                          alt={item.product.name}
                          onClick={() => onViewProduct(item.product)}
                          className="w-20 h-20 rounded-xl object-cover bg-neutral-100 border border-neutral-200 shrink-0 cursor-pointer hover:opacity-90"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0 space-y-1">
                          <div className="text-[10px] font-bold uppercase tracking-wider text-amber-800">
                            {item.product.brand}
                          </div>
                          <h3
                            onClick={() => onViewProduct(item.product)}
                            className="text-sm font-bold text-neutral-900 hover:text-[#8a1538] cursor-pointer truncate"
                          >
                            {item.product.name}
                          </h3>
                          <div className="flex flex-wrap items-center gap-1.5 text-xs text-neutral-600">
                            <span className="px-2 py-0.5 rounded-md bg-neutral-100 border border-neutral-200 font-medium text-[11px]">
                              {item.variant.title}
                            </span>
                            <span className="text-[11px] font-mono-numbers text-neutral-400">
                              SKU: {item.variant.sku}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 pt-0.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>{item.variant.stockQuantity} in stock at Doha Hub</span>
                            </span>
                            <button
                              type="button"
                              data-testid={`cart-page-remove-${item.productId}`}
                              onClick={() => onRemoveItem(item.id)}
                              className="text-[11px] text-red-600 hover:text-red-800 font-semibold inline-flex items-center gap-1 ml-2 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                              <span>Remove</span>
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Unit Price */}
                      <div className="sm:col-span-2 sm:text-center flex sm:block justify-between items-center text-xs">
                        <span className="sm:hidden text-neutral-500">Unit Price:</span>
                        <span className="font-mono-numbers font-semibold text-neutral-800">
                          {formatMinorUnits(item.unitPriceMinorUnits, currentCurrency)}
                        </span>
                      </div>

                      {/* Quantity Controls */}
                      <div className="sm:col-span-2 flex sm:justify-center items-center justify-between">
                        <span className="sm:hidden text-xs text-neutral-500">Quantity:</span>
                        <div className="inline-flex items-center border border-neutral-300 rounded-lg bg-white">
                          <button
                            type="button"
                            data-testid={`cart-page-qty-dec-${item.productId}`}
                            onClick={() => onUpdateQuantity(item.id, item.quantity - 1)}
                            className="px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                            aria-label="Decrease quantity"
                          >
                            -
                          </button>
                          <span
                            data-testid={`cart-page-qty-val-${item.productId}`}
                            className="px-3 py-1.5 text-xs font-mono-numbers font-bold text-neutral-900"
                          >
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            data-testid={`cart-page-qty-inc-${item.productId}`}
                            onClick={() =>
                              onUpdateQuantity(
                                item.id,
                                Math.min(maxStock, item.quantity + 1)
                              )
                            }
                            className="px-2.5 py-1.5 text-xs font-bold text-neutral-600 hover:bg-neutral-100 cursor-pointer"
                            aria-label="Increase quantity"
                          >
                            +
                          </button>
                        </div>
                      </div>

                      {/* Line Total */}
                      <div className="sm:col-span-2 sm:text-right flex sm:block justify-between items-center">
                        <span className="sm:hidden text-xs text-neutral-500">Total:</span>
                        <span
                          data-testid={`cart-page-line-total-${item.productId}`}
                          className="text-sm font-bold font-mono-numbers text-neutral-900"
                        >
                          {formatMinorUnits(item.totalPriceMinorUnits, currentCurrency)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Special Order Instructions & Shipping Estimator */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Order Notes */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3 shadow-2xs">
                <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <FileText className="w-4 h-4 text-amber-800" />
                  <span>Special Delivery Instructions / Concierge Notes</span>
                </label>
                <textarea
                  data-testid="cart-order-notes"
                  rows={3}
                  value={orderNotes}
                  onChange={(e) => onChangeOrderNotes(e.target.value)}
                  placeholder="Gate security code, preferred Doha delivery time window, or gift wrapping instructions..."
                  className="w-full p-3 rounded-xl border border-neutral-300 text-xs focus:outline-hidden focus:border-neutral-900"
                />
                <p className="text-[11px] text-neutral-400">
                  Notes are saved automatically with your cart and included on your courier manifest.
                </p>
              </div>

              {/* Shipping Estimator */}
              <div className="bg-white rounded-2xl border border-neutral-200 p-5 space-y-3 shadow-2xs">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-700">
                    <Truck className="w-4 h-4 text-amber-800" />
                    <span>Shipping Method Estimate ({currentCountry.name})</span>
                  </label>
                </div>
                <div className="space-y-2">
                  {shippingMethods.map((method) => {
                    const isSelected = activeShippingMethod.id === method.id;
                    const isFree =
                      (method.freeOverThreshold &&
                        subtotalMinorUnits >= thresholdInTargetMinor) ||
                      matchedDiscountRule?.type === 'free_shipping';
                    return (
                      <label
                        key={method.id}
                        className={`p-3 rounded-xl border flex items-center justify-between gap-3 cursor-pointer transition-all text-xs ${
                          isSelected
                            ? 'border-neutral-900 bg-neutral-900 text-white'
                            : 'border-neutral-200 bg-neutral-50 text-neutral-800 hover:border-neutral-400'
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <input
                            type="radio"
                            name="cart_shipping_estimate"
                            checked={isSelected}
                            onChange={() => onSelectShippingMethod(method.id)}
                            className="accent-amber-500"
                          />
                          <div className="truncate">
                            <div className="font-semibold truncate">{method.name}</div>
                            <div
                              className={`text-[10px] ${
                                isSelected ? 'text-neutral-300' : 'text-neutral-500'
                              }`}
                            >
                              {method.estimatedLabel}
                            </div>
                          </div>
                        </div>
                        <span className="font-mono-numbers font-bold shrink-0">
                          {isFree
                            ? 'FREE'
                            : formatMinorUnits(method.baseFeeMinorUnits, currentCurrency)}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Discount Code & Order Summary */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24">
            <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5 shadow-xs">
              <h2 className="text-base font-bold font-display text-neutral-900 border-b border-neutral-200 pb-3">
                Order Summary
              </h2>

              {/* Discount Code Input */}
              <div className="space-y-2.5">
                <label className="block text-xs font-semibold text-neutral-700">
                  Promo / Discount Code
                </label>
                <div className="flex gap-2">
                  <div className="relative grow">
                    <Tag className="w-3.5 h-3.5 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      data-testid="cart-discount-input"
                      value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value.toUpperCase())}
                      placeholder="e.g. PEARL15 or FREESHIPQA"
                      className="w-full pl-8 pr-3 py-2 rounded-lg border border-neutral-300 text-xs font-mono-numbers uppercase focus:outline-hidden focus:border-neutral-900"
                    />
                  </div>
                  <button
                    type="button"
                    data-testid="cart-apply-discount-btn"
                    onClick={() => handleApplyDiscount()}
                    className="px-4 py-2 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold shrink-0 cursor-pointer"
                  >
                    Apply
                  </button>
                </div>

                {/* Active Applied Discount Badge */}
                {appliedDiscountCode && matchedDiscountRule && (
                  <div
                    data-testid="cart-applied-discount-badge"
                    className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs text-emerald-900"
                  >
                    <div className="flex items-center gap-1.5 font-semibold">
                      <Tag className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{matchedDiscountRule.code}</span>
                      <span className="text-[11px] font-normal text-emerald-700">
                        ({matchedDiscountRule.title})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveDiscount}
                      className="text-emerald-700 hover:text-red-600 p-0.5 cursor-pointer"
                      aria-label="Remove discount code"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {discountFeedback && (
                  <div
                    data-testid="cart-discount-feedback"
                    className={`p-2.5 rounded-lg text-[11px] flex items-center gap-1.5 ${
                      discountFeedback.type === 'success'
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-red-50 text-red-800 border border-red-200'
                    }`}
                  >
                    {discountFeedback.type === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-red-600" />
                    )}
                    <span>{discountFeedback.message}</span>
                  </div>
                )}

                {/* Quick-Apply Available Store Codes */}
                {activePromoPills.length > 0 && (
                  <div className="pt-1">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400 block mb-1.5">
                      Available Qatar Promotions (Click to Apply):
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {activePromoPills.map((d) => (
                        <button
                          key={d.id}
                          type="button"
                          data-testid={`quick-promo-${d.code}`}
                          onClick={() => handleApplyDiscount(d.code)}
                          className={`px-2 py-1 rounded-md text-[10px] font-mono-numbers font-semibold border transition-colors cursor-pointer ${
                            appliedDiscountCode === d.code
                              ? 'bg-emerald-700 text-white border-emerald-700'
                              : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:border-neutral-400'
                          }`}
                        >
                          {d.code}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Financial Breakdown */}
              <div className="space-y-2.5 pt-4 border-t border-neutral-200 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Subtotal ({items.reduce((a, b) => a + b.quantity, 0)} items)</span>
                  <span
                    data-testid="cart-page-subtotal"
                    className="font-mono-numbers font-semibold text-neutral-900"
                  >
                    {formatMinorUnits(financials.subtotalMinorUnits, currentCurrency)}
                  </span>
                </div>

                {financials.discountMinorUnits > 0 && (
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Discount ({appliedDiscountCode})</span>
                    <span
                      data-testid="cart-page-discount-amount"
                      className="font-mono-numbers"
                    >
                      -{formatMinorUnits(financials.discountMinorUnits, currentCurrency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>Shipping Estimate ({activeShippingMethod.name.split('(')[0].trim()})</span>
                  <span
                    data-testid="cart-page-shipping"
                    className="font-mono-numbers font-medium text-neutral-900"
                  >
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

                {financials.dutyMinorUnits > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Customs Excise ({Math.round(currentCountry.customsDutyRate * 100)}%)
                    </span>
                    <span className="font-mono-numbers">
                      {formatMinorUnits(financials.dutyMinorUnits, currentCurrency)}
                    </span>
                  </div>
                )}

                <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline">
                  <span className="text-sm font-bold text-neutral-900">Estimated Total</span>
                  <span
                    data-testid="cart-page-total"
                    className="text-xl font-bold font-mono-numbers text-neutral-900"
                  >
                    {financials.formattedTotal}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2.5 pt-2">
                {eligibility.isEligible ? (
                  <button
                    type="button"
                    data-testid="cart-page-checkout-btn"
                    onClick={onProceedToCheckout}
                    className="w-full py-3.5 px-6 rounded-xl bg-[#8a1538] hover:bg-[#70112d] text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors cursor-pointer"
                  >
                    <span>Proceed to Shopify Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                    <Lock className="w-4 h-4 text-red-600 shrink-0" />
                    <span>Checkout disabled for {currentCountry.name}.</span>
                  </div>
                )}

                <button
                  type="button"
                  data-testid="cart-page-continue-shopping-btn"
                  onClick={onContinueShopping}
                  className="w-full py-2.5 px-4 rounded-xl bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Continue Shopping</span>
                </button>
              </div>

              {/* Trust & Security Footer */}
              <div className="pt-3 border-t border-neutral-100 space-y-2 text-[11px] text-neutral-500">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>256-Bit TLS Encrypted Tokenized Payment</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Gift Cards &amp; VIP Account Lookup available at Checkout</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
