import React, { useState } from 'react';
import {
  CheckCircle2,
  ShieldCheck,
  Truck,
  Mail,
  FileText,
  Printer,
  ArrowRight,
  CreditCard,
  MapPin,
  Package,
  Send,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { Currency, ImmutableOrderSnapshot } from '../../types/ecommerce';
import { formatMinorUnits } from '../../utils/commerce-engine';

interface OrderConfirmationPageProps {
  order: ImmutableOrderSnapshot | null;
  allOrders: ImmutableOrderSnapshot[];
  currentCurrency: Currency;
  onContinueShopping: () => void;
  onViewOrderReceipt: (order: ImmutableOrderSnapshot) => void;
  onOpenCustomerAccount: () => void;
}

export const OrderConfirmationPage: React.FC<OrderConfirmationPageProps> = ({
  order,
  allOrders,
  currentCurrency,
  onContinueShopping,
  onViewOrderReceipt,
  onOpenCustomerAccount,
}) => {
  const [emailResentAt, setEmailResentAt] = useState<string | null>(null);
  const [showEmailPreview, setShowEmailPreview] = useState<boolean>(true);

  if (!order) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <h2 className="text-2xl font-bold text-neutral-900">
          No Active Order Selected
        </h2>
        <p className="text-xs text-neutral-500">
          Return to the storefront or open your Customer Account to view past order receipts.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onContinueShopping}
            className="px-5 py-2.5 bg-neutral-900 text-white rounded-xl text-xs font-bold cursor-pointer"
          >
            Continue Shopping
          </button>
          <button
            type="button"
            onClick={onOpenCustomerAccount}
            className="px-5 py-2.5 bg-white border border-neutral-300 text-neutral-800 rounded-xl text-xs font-bold cursor-pointer"
          >
            View Order History
          </button>
        </div>
      </div>
    );
  }

  // Filter customer's complete order history by email
  const customerOrderHistory = allOrders.filter(
    (o) => o.customer.email.toLowerCase() === order.customer.email.toLowerCase()
  );

  const paymentMethodLabel =
    order.payment.method === 'credit_card_gateway'
      ? `${order.payment.cardBrand || 'Card'} ending in •••• ${order.payment.cardLast4 || '4481'}`
      : order.payment.method === 'paypal_express'
      ? `PayPal Express (${order.payment.payerEmail || order.customer.email})`
      : order.payment.method === 'apple_google_pay'
      ? 'Apple Pay / Google Pay Biometric Token'
      : order.payment.method === 'cash_on_delivery'
      ? 'Cash / POS on Delivery (Doha Courier)'
      : order.payment.method;

  const billingAddr = order.billingAddress || order.shippingAddress;

  return (
    <div
      data-testid="order-confirmation-page"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8"
    >
      {/* Hero Confirmation Banner */}
      <div className="bg-emerald-950 text-white rounded-3xl p-6 sm:p-10 border border-emerald-800 shadow-lg flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-300">
              <span>Thank You, {order.customer.fullName}!</span>
              <span>•</span>
              <span>Order Confirmed</span>
            </div>
            <h1
              data-testid="confirmation-order-number"
              className="text-2xl sm:text-3xl font-bold font-mono-numbers text-white"
            >
              Order #{order.orderNumber}
            </h1>
            <p className="text-xs sm:text-sm text-emerald-200/90 max-w-2xl leading-relaxed">
              We have accepted your order and committed your inventory at the Doha Pearl Flagship Fulfillment Hub. A confirmation receipt has been sent to{' '}
              <strong className="text-white">{order.customer.email}</strong>.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-emerald-900/80 hover:bg-emerald-800 text-emerald-100 border border-emerald-700 text-xs font-semibold inline-flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
          <button
            type="button"
            data-testid="confirmation-continue-shopping-btn"
            onClick={onContinueShopping}
            className="px-5 py-2.5 rounded-xl bg-white hover:bg-neutral-100 text-emerald-950 text-xs font-bold inline-flex items-center gap-2 shadow-sm transition-colors cursor-pointer"
          >
            <span>Continue Shopping</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left 7 Columns: Shipping, Payment Confirmation, Confirmation Email Preview & Customer Order History */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Payment & Shipping Confirmation Grid */}
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-6 shadow-2xs">
            <h2 className="text-base font-bold text-neutral-900 border-b border-neutral-200 pb-3">
              Order &amp; Delivery Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs">
              {/* Shipping Address */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-[#8a1538]" />
                  <span>Shipping Address</span>
                </div>
                <div
                  data-testid="confirmation-shipping-address"
                  className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-0.5 text-neutral-700"
                >
                  <div className="font-bold text-neutral-900">
                    {order.customer.fullName}
                  </div>
                  <div>{order.shippingAddress.addressLine1}</div>
                  {order.shippingAddress.addressLine2 && (
                    <div>{order.shippingAddress.addressLine2}</div>
                  )}
                  <div>
                    {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                  </div>
                  <div className="font-semibold text-neutral-900">
                    {order.shippingAddress.countryName}
                  </div>
                  <div className="text-[11px] text-neutral-500 pt-1 font-mono-numbers">
                    Tel: {order.customer.phone}
                  </div>
                </div>
              </div>

              {/* Billing Address */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#8a1538]" />
                  <span>Billing Address</span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-0.5 text-neutral-700">
                  <div className="font-bold text-neutral-900">
                    {order.billingAddress?.fullName || order.customer.fullName}
                  </div>
                  <div>{billingAddr.addressLine1}</div>
                  {billingAddr.addressLine2 && <div>{billingAddr.addressLine2}</div>}
                  <div>
                    {billingAddr.city}, {billingAddr.postalCode}
                  </div>
                  <div className="font-semibold text-neutral-900">
                    {billingAddr.countryName}
                  </div>
                  <div className="text-[11px] text-emerald-700 pt-1 font-medium">
                    {order.billingSameAsShipping !== false
                      ? '✓ Matches shipping address'
                      : '✓ Custom billing address'}
                  </div>
                </div>
              </div>

              {/* Payment Confirmation */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-[#8a1538]" />
                  <span>Payment Confirmation</span>
                </div>
                <div
                  data-testid="confirmation-payment-details"
                  className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1 text-neutral-700"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-900">
                      {paymentMethodLabel}
                    </span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold uppercase">
                      {order.payment.paymentStatus}
                    </span>
                  </div>
                  <div className="text-[11px] font-mono-numbers text-neutral-500">
                    Transaction ID: {order.payment.transactionId}
                  </div>
                  {order.payment.paymentToken && (
                    <div className="text-[10px] font-mono-numbers text-neutral-400 truncate">
                      Token: {order.payment.paymentToken}
                    </div>
                  )}
                  <div className="text-xs font-bold font-mono-numbers text-neutral-900 pt-1">
                    Amount Charged: {order.financials.formattedTotal}
                  </div>
                </div>
              </div>

              {/* Shipping Method & Tracking */}
              <div className="space-y-1.5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-[#8a1538]" />
                  <span>Shipping Method &amp; Tracking</span>
                </div>
                <div className="p-3.5 rounded-xl bg-neutral-50 border border-neutral-200 space-y-1 text-neutral-700">
                  <div className="font-bold text-neutral-900">
                    {order.shipping.service}
                  </div>
                  <div className="text-[11px] text-neutral-600">
                    Carrier: {order.shipping.carrier}
                  </div>
                  <div className="text-[11px] font-mono-numbers text-amber-800 font-semibold">
                    Tracking #: {order.shipping.trackingNumber || 'AURA-DHA-PRIORITY'}
                  </div>
                  <div className="text-[11px] text-emerald-700 font-medium">
                    Estimated Delivery: {order.shipping.estimatedDeliveryDays} Business Day(s)
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. Order Confirmation Email Dispatch Card */}
          <div
            data-testid="confirmation-email-card"
            className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-2xs"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-200 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-center">
                  <Mail className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-neutral-900">
                    Order Confirmation Email Dispatched
                  </h3>
                  <p className="text-[11px] text-neutral-500">
                    Sent to <strong>{order.customer.email}</strong> at{' '}
                    {new Date(
                      emailResentAt || order.confirmationEmailSentAt || order.orderDate
                    ).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowEmailPreview(!showEmailPreview)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-300 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 cursor-pointer"
                >
                  {showEmailPreview ? 'Hide Email' : 'Preview Email'}
                </button>
                <button
                  type="button"
                  data-testid="resend-confirmation-email-btn"
                  onClick={() => setEmailResentAt(new Date().toISOString())}
                  className="px-3.5 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{emailResentAt ? 'Email Resent ✓' : 'Resend Email'}</span>
                </button>
              </div>
            </div>

            {showEmailPreview && (
              <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 text-xs space-y-2.5 text-neutral-700">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] text-neutral-500 border-b border-neutral-200 pb-2">
                  <span>
                    <strong>From:</strong> AURA Qatar Concierge &lt;orders@aura.qa&gt;
                  </span>
                  <span>
                    <strong>Subject:</strong> Order #{order.orderNumber} Confirmed — Doha Express Dispatch
                  </span>
                </div>
                <p>Dear {order.customer.fullName},</p>
                <p className="leading-relaxed">
                  Thank you for your order with AURA QATAR. Your payment of{' '}
                  <strong className="font-mono-numbers">{order.financials.formattedTotal}</strong> has been processed ({paymentMethodLabel}) and your items are being prepared at our Pearl-Qatar Fulfillment Hub.
                </p>
                <div className="text-[11px] font-mono-numbers bg-white p-2.5 rounded-lg border border-neutral-200">
                  Tracking Reference: <strong>{order.shipping.trackingNumber}</strong> · Adult 21+ QID Verification Reference: <strong>{order.compliance.verificationProviderRef}</strong>
                </div>
              </div>
            )}
          </div>

          {/* 3. Customer Order History Section */}
          <div
            data-testid="confirmation-customer-order-history"
            className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-4 shadow-2xs"
          >
            <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#8a1538]" />
                <h3 className="text-sm font-bold text-neutral-900">
                  Customer Order History ({customerOrderHistory.length} Orders for{' '}
                  {order.customer.email})
                </h3>
              </div>
              <button
                type="button"
                data-testid="open-full-customer-history-btn"
                onClick={onOpenCustomerAccount}
                className="text-xs font-bold text-[#8a1538] hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Open Account Vault</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-neutral-100">
              {customerOrderHistory.map((histOrder) => {
                const isCurrent = histOrder.orderNumber === order.orderNumber;
                return (
                  <div
                    key={histOrder.orderId}
                    className={`py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs ${
                      isCurrent ? 'bg-emerald-50/50 -mx-3 px-3 rounded-xl' : ''
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold font-mono-numbers text-neutral-900">
                          {histOrder.orderNumber}
                        </span>
                        {isCurrent && (
                          <span className="px-2 py-0.5 rounded bg-emerald-600 text-white text-[10px] font-bold">
                            Just Placed
                          </span>
                        )}
                        <span className="px-2 py-0.5 rounded bg-neutral-100 text-neutral-700 text-[10px] font-semibold uppercase">
                          {histOrder.status}
                        </span>
                      </div>
                      <div className="text-[11px] text-neutral-500 mt-0.5">
                        {new Date(histOrder.orderDate).toLocaleString()} ·{' '}
                        {histOrder.items.reduce((a, b) => a + b.quantity, 0)} items
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="font-mono-numbers font-bold text-neutral-900">
                        {histOrder.financials.formattedTotal}
                      </span>
                      {!isCurrent && (
                        <button
                          type="button"
                          onClick={() => onViewOrderReceipt(histOrder)}
                          className="px-2.5 py-1 rounded-lg border border-neutral-300 text-[11px] font-semibold hover:bg-neutral-100 cursor-pointer"
                        >
                          View
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right 5 Columns: Itemized Order Summary & Audit Trail */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border border-neutral-200 p-6 space-y-5 shadow-xs">
            <h2 className="text-base font-bold font-display text-neutral-900 border-b border-neutral-200 pb-3">
              Order Summary ({order.items.reduce((a, b) => a + b.quantity, 0)} Items)
            </h2>

            <div className="space-y-3 divide-y divide-neutral-100">
              {order.items.map((item, idx) => (
                <div
                  key={idx}
                  data-testid={`confirmation-item-${item.productId}`}
                  className="pt-3 first:pt-0 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <img
                      src={item.productSnapshot.image}
                      alt={item.productName}
                      className="w-14 h-14 rounded-xl object-cover bg-neutral-100 border border-neutral-200 shrink-0"
                      referrerPolicy="no-referrer"
                    />
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-neutral-900 truncate">
                        {item.productName}
                      </div>
                      <div className="text-[11px] text-neutral-500 truncate">
                        {item.variantTitle} · Qty: {item.quantity}
                      </div>
                      <div className="text-[10px] font-mono-numbers text-neutral-400">
                        SKU: {item.sku}
                      </div>
                    </div>
                  </div>
                  <div className="text-xs font-bold font-mono-numbers text-neutral-900 shrink-0">
                    {formatMinorUnits(item.totalPriceMinorUnits, currentCurrency)}
                  </div>
                </div>
              ))}
            </div>

            {/* Financial Totals */}
            <div className="pt-4 border-t border-neutral-200 space-y-2 text-xs">
              <div className="flex justify-between text-neutral-600">
                <span>Subtotal</span>
                <span className="font-mono-numbers font-semibold text-neutral-900">
                  {formatMinorUnits(order.financials.subtotalMinorUnits, currentCurrency)}
                </span>
              </div>

              {order.financials.discountMinorUnits > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Discount {order.discountCode ? `(${order.discountCode})` : ''}</span>
                  <span className="font-mono-numbers">
                    -{formatMinorUnits(order.financials.discountMinorUnits, currentCurrency)}
                  </span>
                </div>
              )}

              <div className="flex justify-between text-neutral-600">
                <span>Shipping</span>
                <span className="font-mono-numbers">
                  {order.financials.shippingFeeMinorUnits === 0
                    ? 'FREE'
                    : formatMinorUnits(order.financials.shippingFeeMinorUnits, currentCurrency)}
                </span>
              </div>

              <div className="flex justify-between text-neutral-600">
                <span>Taxes</span>
                <span className="font-mono-numbers">
                  {formatMinorUnits(order.financials.taxMinorUnits, currentCurrency)}
                </span>
              </div>

              {order.financials.dutyMinorUnits > 0 && (
                <div className="flex justify-between text-neutral-600">
                  <span>Customs Excise</span>
                  <span className="font-mono-numbers">
                    {formatMinorUnits(order.financials.dutyMinorUnits, currentCurrency)}
                  </span>
                </div>
              )}

              {(order.financials.giftCardAppliedMinorUnits || 0) > 0 && (
                <div className="flex justify-between text-amber-800 font-semibold">
                  <span>Gift Card {order.giftCardCode ? `(${order.giftCardCode})` : ''}</span>
                  <span className="font-mono-numbers">
                    -
                    {formatMinorUnits(
                      order.financials.giftCardAppliedMinorUnits || 0,
                      currentCurrency
                    )}
                  </span>
                </div>
              )}

              <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline">
                <span className="text-sm font-bold text-neutral-900">Total Paid</span>
                <span
                  data-testid="confirmation-total-paid"
                  className="text-xl font-bold font-mono-numbers text-emerald-800"
                >
                  {order.financials.formattedTotal}
                </span>
              </div>
            </div>

            {/* Order Status Timeline */}
            <div className="pt-4 border-t border-neutral-200 space-y-2.5">
              <div className="text-xs font-bold uppercase tracking-wider text-neutral-500 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Immutable Fulfillment Timeline</span>
              </div>
              <div className="space-y-2">
                {order.timeline.map((step, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-xl bg-neutral-50 border border-neutral-200/80 text-[11px]"
                  >
                    <div className="font-bold text-neutral-900">{step.status}</div>
                    <div className="text-neutral-600 mt-0.5">{step.note}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
