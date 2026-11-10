import React from 'react';
import { CheckCircle2, ShieldCheck, Truck, Printer, X, PackageCheck } from 'lucide-react';
import { ImmutableOrderSnapshot } from '../../types/ecommerce';

interface OrderConfirmationModalProps {
  order: ImmutableOrderSnapshot | null;
  onClose: () => void;
}

export const OrderConfirmationModal: React.FC<OrderConfirmationModalProps> = ({ order, onClose }) => {
  if (!order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-neutral-200 my-8">
        {/* Header Banner */}
        <div className="p-6 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-full border border-emerald-500/30">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs text-neutral-400 uppercase tracking-widest font-semibold">
                Order Confirmed &amp; Dispatched to Fulfillment
              </div>
              <h2 className="text-xl font-bold font-mono-numbers text-white mt-0.5">
                {order.orderNumber}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close order confirmation"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-neutral-700">
          {/* Tracking Strip */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-[11px] text-neutral-500 uppercase font-semibold">
                Carrier &amp; Adult Signature Service
              </div>
              <div className="font-semibold text-neutral-900 mt-0.5 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-amber-700" />
                <span>{order.shipping.carrier} · {order.shipping.service}</span>
              </div>
            </div>
            <div className="sm:text-right">
              <div className="text-[11px] text-neutral-500 uppercase font-semibold">
                Tracking Number
              </div>
              <div className="font-mono-numbers font-bold text-neutral-900 mt-0.5">
                {order.shipping.trackingNumber}
              </div>
            </div>
          </div>

          {/* Compliance Audit Certificate */}
          <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200/80 text-amber-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-amber-900">
              <ShieldCheck className="w-4 h-4 text-amber-700" />
              <span>Immutable Regulatory Compliance Record</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
              <div>
                <span className="text-neutral-500 block">Verified Age:</span>
                <span className="font-semibold text-neutral-900">{order.compliance.customerVerifiedAge} years old (Min: {order.compliance.countryMinimumAgeRequired}+)</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Verification Provider:</span>
                <span className="font-semibold text-neutral-900">{order.compliance.verificationProviderRef}</span>
              </div>
              <div>
                <span className="text-neutral-500 block">Jurisdiction Status:</span>
                <span className="font-semibold text-emerald-800 uppercase">{order.compliance.jurisdictionLegalStatus}</span>
              </div>
            </div>
            <p className="text-[11px] text-neutral-600 pt-1">
              {order.compliance.tpdFdaComplianceStatement}
            </p>
          </div>

          {/* Purchased Items List */}
          <div>
            <h4 className="font-semibold text-neutral-900 uppercase tracking-wider mb-2">
              Item Manifest
            </h4>
            <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 overflow-hidden">
              {order.items.map((item, idx) => (
                <div key={idx} className="p-3 flex items-center justify-between">
                  <div>
                    <div className="font-semibold text-neutral-900">{item.productName}</div>
                    <div className="text-[11px] text-neutral-500">
                      {item.variantTitle} · SKU: {item.sku} · Qty: {item.quantity}
                    </div>
                  </div>
                  <div className="font-mono-numbers font-bold text-neutral-900">
                    {order.financials.formattedTotal}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Financial Breakdown Snapshot */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-mono-numbers font-semibold">
                {order.financials.subtotalMinorUnits} minor units
              </span>
            </div>
            <div className="flex justify-between">
              <span>Destination Tax:</span>
              <span className="font-mono-numbers font-semibold">
                {order.financials.taxMinorUnits} minor units
              </span>
            </div>
            <div className="flex justify-between">
              <span>Adult Shipping Fee:</span>
              <span className="font-mono-numbers font-semibold">
                {order.financials.shippingFeeMinorUnits === 0 ? 'Complimentary' : `${order.financials.shippingFeeMinorUnits} minor units`}
              </span>
            </div>
            <div className="pt-2 border-t border-neutral-200 flex justify-between font-bold text-sm text-neutral-900">
              <span>Final Captured Amount:</span>
              <span className="font-mono-numbers text-amber-900">
                {order.financials.formattedTotal}
              </span>
            </div>
          </div>

          {/* Shipping Address */}
          <div>
            <h4 className="font-semibold text-neutral-900 uppercase tracking-wider mb-1">
              Delivery Recipient
            </h4>
            <p className="text-neutral-600">
              <strong>{order.customer.fullName}</strong> ({order.customer.email})
              <br />
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ''}
              <br />
              {order.shippingAddress.city}, {order.shippingAddress.stateOrProvince} {order.shippingAddress.postalCode}
              <br />
              {order.shippingAddress.countryName}
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          <button
            onClick={() => window.print()}
            className="px-4 py-2 bg-white border border-neutral-300 text-neutral-700 hover:text-neutral-900 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Receipt</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Return to Storefront
          </button>
        </div>
      </div>
    </div>
  );
};
