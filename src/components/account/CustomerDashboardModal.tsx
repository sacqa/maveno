import React from 'react';
import { X, UserCheck, Package, ShieldCheck, MapPin, Truck, ExternalLink } from 'lucide-react';
import { ImmutableOrderSnapshot, StoreSettings, UserRole } from '../../types/ecommerce';
import { storeDb } from '../../services/store-db';

interface CustomerDashboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: ImmutableOrderSnapshot[];
  settings: StoreSettings;
  currentRole: UserRole;
  onRoleChanged: (role: UserRole) => void;
  onViewOrder: (order: ImmutableOrderSnapshot) => void;
}

export const CustomerDashboardModal: React.FC<CustomerDashboardModalProps> = ({
  isOpen,
  onClose,
  orders,
  settings,
  currentRole,
  onRoleChanged,
  onViewOrder,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-neutral-200 my-8">
        {/* Header */}
        <div className="p-6 bg-neutral-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-neutral-800 text-amber-400 rounded-xl border border-neutral-700">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-neutral-400 uppercase tracking-wider font-semibold">
                Customer Account &amp; Verification Vault
              </div>
              <h2 className="text-lg font-bold text-white mt-0.5">
                Alexander Vance
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            aria-label="Close customer account modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 sm:p-8 space-y-6 max-h-[75vh] overflow-y-auto text-xs text-neutral-700">
          {/* Identity & Compliance Status Card */}
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <div className="font-bold text-xs text-emerald-900">
                  Government ID Age Verification Status: Certified Active
                </div>
                <div className="text-[11px] text-emerald-800 mt-0.5">
                  Verified Age: 38 (Pass Date: Nov 8, 2026 · Provider: VerifyMyAge UK)
                </div>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-md uppercase text-[10px] shrink-0 text-center">
              Verified Adult (18+/21+)
            </span>
          </div>

          {/* User Role Switcher */}
          <div className="p-4 rounded-xl bg-neutral-50 border border-neutral-200 flex items-center justify-between gap-4">
            <div>
              <div className="font-semibold text-neutral-900">Current Security Role (RLS Context):</div>
              <div className="text-neutral-500 text-[11px] mt-0.5">
                Simulate role-based access control as an Administrator or a Customer.
              </div>
            </div>
            <select
              value={currentRole}
              onChange={(e) => {
                const newRole = e.target.value as UserRole;
                storeDb.setCurrentUserRole(newRole);
                onRoleChanged(newRole);
              }}
              className="text-xs bg-white border border-neutral-300 rounded-lg px-3 py-1.5 font-medium"
            >
              <option value="super_admin">Super Admin</option>
              <option value="compliance_manager">Compliance Manager</option>
              <option value="order_manager">Order Manager</option>
              <option value="customer">Standard Customer</option>
            </select>
          </div>

          {/* Order History */}
          <div>
            <h3 className="font-bold text-sm text-neutral-900 mb-3 flex items-center gap-2">
              <Package className="w-4 h-4 text-amber-700" />
              <span>Order History &amp; Immutable Receipts ({orders.length})</span>
            </h3>

            {orders.length === 0 ? (
              <p className="text-neutral-500 italic">No orders found.</p>
            ) : (
              <div className="border border-neutral-200 rounded-xl divide-y divide-neutral-100 overflow-hidden">
                {orders.map((ord) => (
                  <div key={ord.orderId} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-50">
                    <div>
                      <div className="font-bold font-mono-numbers text-neutral-900">
                        {ord.orderNumber}
                      </div>
                      <div className="text-neutral-500 text-[11px] mt-0.5 flex items-center gap-2">
                        <span>{new Date(ord.orderDate).toLocaleDateString()}</span>
                        <span>·</span>
                        <span>{ord.shippingAddress.countryName}</span>
                        <span>·</span>
                        <span className="font-mono-numbers font-semibold text-neutral-900">
                          {ord.financials.formattedTotal}
                        </span>
                      </div>
                      {ord.shipping.trackingNumber && (
                        <div className="text-[11px] text-amber-700 mt-1 flex items-center gap-1 font-mono-numbers">
                          <Truck className="w-3.5 h-3.5" />
                          <span>Tracking: {ord.shipping.trackingNumber}</span>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => {
                        onClose();
                        onViewOrder(ord);
                      }}
                      className="px-3 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs font-semibold text-neutral-800 hover:bg-neutral-100 flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer"
                    >
                      <span>View Receipt</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-neutral-200 bg-neutral-50 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
          >
            Close Account
          </button>
        </div>
      </div>
    </div>
  );
};
