import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Download,
  Upload,
  Eye,
  Printer,
  Truck,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  FileText,
  User,
  MapPin,
  Tag,
  Mail,
  Phone,
  ShieldCheck,
  AlertTriangle,
  GitMerge,
  Send,
  Package,
  CreditCard,
  X,
  Check,
  Edit3,
  Trash2,
} from 'lucide-react';
import {
  ImmutableOrderSnapshot,
  CustomerRecord,
  CustomerAddress,
  Product,
  DiscountRule,
  StoreSettings,
} from '../../../types/ecommerce';
import { storeDb } from '../../../services/store-db';
import { detectDuplicateCustomers, calculateDiscountBenefit } from '../../../utils/commerce-engine';

interface OrdersAndCustomersProps {
  mode: 'orders' | 'draft_orders' | 'customers';
  orders: ImmutableOrderSnapshot[];
  customers: CustomerRecord[];
  products: Product[];
  discounts: DiscountRule[];
  settings: StoreSettings;
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export const OrdersAndCustomersSection: React.FC<OrdersAndCustomersProps> = ({
  mode,
  orders,
  customers,
  products,
  discounts,
  settings,
  onRefresh,
  notify,
}) => {
  // --- Orders State ---
  const [orderTab, setOrderTab] = useState<'all' | 'drafts' | 'unfulfilled' | 'paid' | 'shipped' | 'refunded'>(
    mode === 'draft_orders' ? 'drafts' : 'all'
  );
  const [orderSearch, setOrderSearch] = useState('');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [inspectingOrder, setInspectingOrder] = useState<ImmutableOrderSnapshot | null>(null);
  const [printingOrder, setPrintingOrder] = useState<{
    order: ImmutableOrderSnapshot;
    docType: 'invoice' | 'packing_slip';
  } | null>(null);

  // Create Order / Draft Order Modal State
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [newOrderForm, setNewOrderForm] = useState({
    isDraft: mode === 'draft_orders',
    customerName: '',
    customerEmail: '',
    customerPhone: '+974 ',
    qidNumber: '',
    municipality: 'Doha',
    zone: 'Zone 66 (The Pearl)',
    addressLine1: '',
    productId: products[0]?.id || '',
    quantity: 1,
    customUnitPriceQar: '',
    discountCode: '',
    paymentMethod: 'high_risk_approved_gateway' as ImmutableOrderSnapshot['payment']['method'],
    notes: '',
    tags: 'Qatar-Direct, Concierge',
  });

  // Order Inspector Action States
  const [trackingInput, setTrackingInput] = useState('');
  const [carrierInput, setCarrierInput] = useState(settings.defaultShippingCarrier || 'Doha City Express');
  const [refundAmountQar, setRefundAmountQar] = useState('');
  const [refundReason, setRefundReason] = useState('Customer requested partial adjustment');
  const [restockOnRefund, setRestockOnRefund] = useState(true);
  const [timelineComment, setTimelineComment] = useState('');
  const [orderNoteEdit, setOrderNoteEdit] = useState('');
  const [deletingOrdersConfirm, setDeletingOrdersConfirm] = useState<{
    orderIds: string[];
    label: string;
  } | null>(null);
  const [restockOnDelete, setRestockOnDelete] = useState(true);

  // --- Customers State ---
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState<string>('all');
  const [customerSearch, setCustomerSearch] = useState('');
  const [inspectingCustomer, setInspectingCustomer] = useState<CustomerRecord | null>(null);
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({
    fullName: '',
    email: '',
    phone: '+974 ',
    segment: 'Returning' as CustomerRecord['segment'],
    qidNumber: '',
    addressLine1: '',
    municipality: 'Doha',
    zone: 'Zone 66',
    tags: 'Qatar-Resident, Verified-21+',
    notes: '',
    marketingSubscribed: true,
    smsMarketingSubscribed: true,
  });

  // New Address inside Customer Drawer
  const [newAddrLabel, setNewAddrLabel] = useState('Office Tower');
  const [newAddrLine1, setNewAddrLine1] = useState('');
  const [newAddrMunicipality, setNewAddrMunicipality] = useState('Doha');
  const [newAddrZone, setNewAddrZone] = useState('Zone 61 (West Bay)');

  // Sync tab when mode prop changes
  React.useEffect(() => {
    if (mode === 'draft_orders') {
      setOrderTab('drafts');
    } else if (mode === 'orders' && orderTab === 'drafts') {
      setOrderTab('all');
    }
  }, [mode]);

  // --- Filtered Orders ---
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (orderTab === 'drafts' && !o.isDraft) return false;
      if (orderTab === 'all' && o.isDraft) return false;
      if (orderTab === 'unfulfilled' && (o.isDraft || o.status === 'shipped' || o.status === 'delivered' || o.status === 'cancelled' || o.status === 'refunded')) return false;
      if (orderTab === 'paid' && o.payment.paymentStatus !== 'captured') return false;
      if (orderTab === 'shipped' && o.status !== 'shipped' && o.status !== 'delivered') return false;
      if (orderTab === 'refunded' && o.status !== 'refunded' && o.payment.paymentStatus !== 'partially_refunded' && (!o.returnStatus || o.returnStatus === 'none')) return false;

      if (orderSearch.trim()) {
        const q = orderSearch.toLowerCase();
        return (
          o.orderNumber.toLowerCase().includes(q) ||
          o.customer.fullName.toLowerCase().includes(q) ||
          o.customer.email.toLowerCase().includes(q) ||
          (o.shippingAddress.municipality || o.shippingAddress.city).toLowerCase().includes(q) ||
          o.items.some((i) => i.productName.toLowerCase().includes(q) || i.sku.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [orders, orderTab, orderSearch]);

  // --- Filtered Customers & Duplicate Detection ---
  const duplicatePairs = useMemo(() => detectDuplicateCustomers(customers), [customers]);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (customerSegmentFilter !== 'all') {
        if (customerSegmentFilter === 'subscribed' && !c.marketingSubscribed) return false;
        if (customerSegmentFilter !== 'subscribed' && c.segment !== customerSegmentFilter) return false;
      }
      if (customerSearch.trim()) {
        const q = customerSearch.toLowerCase();
        return (
          c.fullName.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.phone.toLowerCase().includes(q) ||
          c.tags.some((t) => t.toLowerCase().includes(q)) ||
          (c.qidNumber || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [customers, customerSegmentFilter, customerSearch]);

  // Helper to compute customer LTV & orders
  const getCustomerStats = (email: string) => {
    const custOrders = orders.filter(
      (o) => !o.isDraft && o.customer.email.toLowerCase() === email.toLowerCase()
    );
    const totalSpentMinor = custOrders.reduce((acc, o) => acc + o.financials.totalAmountMinorUnits, 0);
    return {
      ordersCount: custOrders.length,
      totalSpentMinor,
      avgOrderMinor: custOrders.length > 0 ? Math.round(totalSpentMinor / custOrders.length) : 0,
      custOrders,
    };
  };

  // --- Order Handlers ---
  const handleSelectOrder = (orderId: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(orderId) ? prev.filter((id) => id !== orderId) : [...prev, orderId]
    );
  };

  const handleBulkOrderAction = (action: 'fulfill' | 'mark_paid' | 'cancel' | 'export' | 'delete') => {
    if (selectedOrderIds.length === 0) return;
    if (action === 'delete') {
      setDeletingOrdersConfirm({
        orderIds: [...selectedOrderIds],
        label:
          selectedOrderIds.length === 1
            ? orders.find((o) => o.orderId === selectedOrderIds[0])?.orderNumber || '1 selected order'
            : `${selectedOrderIds.length} selected orders`,
      });
      return;
    }
    if (action === 'export') {
      const selected = orders.filter((o) => selectedOrderIds.includes(o.orderId));
      const csvRows = [
        ['Order Number', 'Date', 'Customer', 'Email', 'Status', 'Payment', 'Total (QAR)', 'Municipality'].join(','),
        ...selected.map((o) =>
          [
            o.orderNumber,
            o.orderDate.split('T')[0],
            `"${o.customer.fullName}"`,
            o.customer.email,
            o.status,
            o.payment.paymentStatus,
            (o.financials.totalAmountMinorUnits / 100).toFixed(2),
            `"${o.shippingAddress.municipality || o.shippingAddress.city}"`,
          ].join(',')
        ),
      ].join('\n');
      const blob = new Blob([csvRows], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-qatar-orders-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      notify(`Exported ${selected.length} orders to CSV.`);
      return;
    }

    selectedOrderIds.forEach((id) => {
      if (action === 'fulfill') {
        storeDb.fulfillOrder(id, `DHA-BULK-${Math.floor(10000 + Math.random() * 90000)}`, settings.defaultShippingCarrier || 'Doha City Express');
      } else if (action === 'mark_paid') {
        const ord = storeDb.getOrderById(id);
        if (ord) {
          storeDb.updateOrder(id, {
            isDraft: false,
            status: 'paid',
            payment: { ...ord.payment, paymentStatus: 'captured' },
          });
        }
      } else if (action === 'cancel') {
        storeDb.updateOrderStatus(id, 'cancelled', 'Bulk cancelled by administrator');
      }
    });

    onRefresh();
    setSelectedOrderIds([]);
    notify(`Bulk action (${action}) applied to ${selectedOrderIds.length} orders.`);
  };

  const handleConfirmDeleteOrders = () => {
    if (!deletingOrdersConfirm) return;
    const { orderIds, label } = deletingOrdersConfirm;
    const deletedCount = storeDb.deleteOrdersBulk(orderIds, restockOnDelete);
    if (inspectingOrder && orderIds.includes(inspectingOrder.orderId)) {
      setInspectingOrder(null);
    }
    setSelectedOrderIds((prev) => prev.filter((id) => !orderIds.includes(id)));
    setDeletingOrdersConfirm(null);
    onRefresh();
    notify(
      `Deleted ${deletedCount === 1 ? `order ${label}` : `${deletedCount} orders`}${
        restockOnDelete ? ' (inventory restocked).' : '.'
      }`
    );
  };

  const handleCreateCustomOrDraftOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const product = products.find((p) => p.id === newOrderForm.productId) || products[0];
    if (!product || !newOrderForm.customerName.trim() || !newOrderForm.customerEmail.trim()) return;

    const variant = product.variants[0];
    const unitPriceMinor = newOrderForm.customUnitPriceQar
      ? Math.round(parseFloat(newOrderForm.customUnitPriceQar) * 100)
      : product.countrySpecificPrices?.['QA'] || product.basePriceMinorUnits;

    const qty = Math.max(1, Number(newOrderForm.quantity) || 1);
    const subtotalMinor = unitPriceMinor * qty;

    const shippingMinor =
      subtotalMinor >= (settings.freeShippingThresholdMinorUnits || 35000)
        ? 0
        : settings.standardShippingFeeMinorUnits ?? 2500;

    // Check if discount code matches
    let discountMinor = 0;
    if (newOrderForm.discountCode.trim()) {
      const matchedDisc = discounts.find(
        (d) => d.code.toUpperCase() === newOrderForm.discountCode.trim().toUpperCase() && d.status === 'active'
      );
      if (matchedDisc) {
        const benefit = calculateDiscountBenefit(subtotalMinor, shippingMinor, matchedDisc);
        discountMinor = benefit.discountMinorUnits;
      }
    }

    const totalMinor = Math.max(0, subtotalMinor - discountMinor + shippingMinor);

    const orderNum = newOrderForm.isDraft
      ? `DRAFT-QA-${Math.floor(1000 + Math.random() * 9000)}`
      : `AURA-QA-${Math.floor(100000 + Math.random() * 900000)}`;

    const newOrder: ImmutableOrderSnapshot = {
      orderId: 'ord_' + Date.now(),
      orderNumber: orderNum,
      orderDate: new Date().toISOString(),
      status: newOrderForm.isDraft
        ? 'awaiting_payment'
        : newOrderForm.paymentMethod === 'cash_on_delivery'
        ? 'processing'
        : 'paid',
      isDraft: newOrderForm.isDraft,
      refundedAmountMinorUnits: 0,
      returnStatus: 'none',
      notes: newOrderForm.notes,
      tags: newOrderForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      customer: {
        fullName: newOrderForm.customerName.trim(),
        email: newOrderForm.customerEmail.trim(),
        phone: newOrderForm.customerPhone.trim(),
      },
      shippingAddress: {
        addressLine1: newOrderForm.addressLine1.trim() || 'Tower 12, Porto Arabia',
        city: newOrderForm.municipality,
        municipality: newOrderForm.municipality,
        zone: newOrderForm.zone,
        stateOrProvince: newOrderForm.municipality,
        postalCode: '00000',
        countryCode: 'QA',
        countryName: 'Qatar',
      },
      items: [
        {
          productId: product.id,
          variantId: variant?.id || 'v_default',
          productName: product.name,
          variantTitle: variant?.title || 'Standard Edition',
          sku: variant?.sku || product.sku,
          quantity: qty,
          unitPriceMinorUnits: unitPriceMinor,
          totalPriceMinorUnits: subtotalMinor,
          productSnapshot: {
            brand: product.brand,
            image: product.galleryImages[0] || '',
            specs: product.specs,
          },
        },
      ],
      financials: {
        currencyCode: 'QAR',
        exchangeRateUsed: 1,
        subtotalMinorUnits: subtotalMinor,
        discountMinorUnits: discountMinor,
        shippingFeeMinorUnits: shippingMinor,
        taxMinorUnits: 0,
        dutyMinorUnits: 0,
        totalAmountMinorUnits: totalMinor,
        formattedTotal: `${(totalMinor / 100).toFixed(2)} QAR`,
      },
      compliance: {
        countryMinimumAgeRequired: 21,
        customerVerifiedAge: 28,
        ageVerificationRecordId: 'av_admin_' + Date.now(),
        verificationProviderRef: newOrderForm.qidNumber || 'QID-ADMIN-VERIFIED',
        jurisdictionLegalStatus: 'approved',
        tpdFdaComplianceStatement: 'Qatar MOPH Adult Signature 21+ Required Upon Doha Delivery.',
      },
      payment: {
        method: newOrderForm.paymentMethod,
        paymentStatus: newOrderForm.isDraft
          ? 'pending'
          : newOrderForm.paymentMethod === 'cash_on_delivery'
          ? 'authorized'
          : 'captured',
        transactionId: 'tx_qa_' + Math.random().toString(36).substring(2, 10),
      },
      shipping: {
        carrier: settings.defaultShippingCarrier || 'Doha City Express',
        service: 'Qatar Same-Day Couriers (Adult Signature 21+)',
        estimatedDeliveryDays: 1,
      },
      timeline: [
        {
          status: newOrderForm.isDraft ? 'Draft Order Created in Admin' : 'Custom Order Created & Verified',
          timestamp: new Date().toISOString(),
          note: newOrderForm.isDraft
            ? 'Draft invoice ready to send or convert to active order.'
            : `Created by Admin for ${newOrderForm.municipality} delivery.`,
        },
      ],
    };

    storeDb.createOrder(newOrder);
    onRefresh();
    setShowCreateOrderModal(false);
    if (newOrderForm.isDraft) {
      setOrderTab('drafts');
    }
    notify(`${newOrderForm.isDraft ? 'Draft order' : 'Order'} ${orderNum} created (${(totalMinor / 100).toFixed(2)} QAR).`);
  };

  // --- Customer Handlers ---
  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomerForm.fullName.trim() || !newCustomerForm.email.trim()) return;
    const newCust: CustomerRecord = {
      id: 'cust_' + Date.now(),
      fullName: newCustomerForm.fullName.trim(),
      email: newCustomerForm.email.trim(),
      phone: newCustomerForm.phone.trim(),
      addresses: [
        {
          id: 'addr_' + Date.now(),
          label: 'Primary Residence',
          addressLine1: newCustomerForm.addressLine1.trim() || 'West Bay Lagoon Villa',
          city: newCustomerForm.municipality,
          municipality: newCustomerForm.municipality,
          zone: newCustomerForm.zone,
          postalCode: '00000',
          countryCode: 'QA',
          countryName: 'Qatar',
          isDefault: true,
        },
      ],
      tags: newCustomerForm.tags
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
      notes: newCustomerForm.notes,
      marketingSubscribed: newCustomerForm.marketingSubscribed,
      smsMarketingSubscribed: newCustomerForm.smsMarketingSubscribed,
      segment: newCustomerForm.segment,
      qidNumber: newCustomerForm.qidNumber || 'QID-28963401999',
      verifiedAge: 29,
      taxExempt: false,
      createdAt: new Date().toISOString(),
    };

    storeDb.saveCustomer(newCust);
    onRefresh();
    setShowCreateCustomerModal(false);
    notify(`Customer profile ${newCust.fullName} added to Qatar CRM.`);
  };

  const handleExportCustomersCSV = () => {
    const rows = [
      ['Full Name', 'Email', 'Phone', 'Segment', 'QID', 'Marketing', 'Municipality', 'Tags'].join(','),
      ...customers.map((c) =>
        [
          `"${c.fullName}"`,
          c.email,
          `"${c.phone}"`,
          c.segment,
          c.qidNumber || '',
          c.marketingSubscribed ? 'Subscribed' : 'Unsubscribed',
          `"${c.addresses[0]?.municipality || 'Doha'}"`,
          `"${c.tags.join('; ')}"`,
        ].join(',')
      ),
    ].join('\n');
    const blob = new Blob([rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `aura-qatar-customers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    notify(`Exported ${customers.length} customer profiles to CSV.`);
  };

  // ============================================================================
  // RENDER: CUSTOMERS VIEW
  // ============================================================================
  if (mode === 'customers') {
    return (
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Customers & Segmentation</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Complete Qatar customer directory, lifetime value (LTV), multiple addresses, tags, and duplicate profile resolution.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCustomersCSV}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </button>
            <button
              onClick={() => {
                const sampleImport: CustomerRecord = {
                  id: 'cust_imp_' + Date.now(),
                  fullName: 'Noor Al-Sulaiti',
                  email: `noor.sulaiti.${Math.floor(100 + Math.random() * 899)}@qatar-vip.qa`,
                  phone: '+974 5591 8840',
                  addresses: [
                    {
                      id: 'addr_imp_' + Date.now(),
                      label: 'Primary Villa',
                      addressLine1: 'Al Waab Street, Compound 8',
                      city: 'Al Rayyan',
                      municipality: 'Al Rayyan',
                      zone: 'Zone 55',
                      postalCode: '00000',
                      countryCode: 'QA',
                      countryName: 'Qatar',
                      isDefault: true,
                    },
                  ],
                  tags: ['CSV-Imported', 'Qatar-Resident', 'Verified-21+'],
                  notes: 'Imported via Shopify CSV Customer Importer.',
                  marketingSubscribed: true,
                  smsMarketingSubscribed: true,
                  segment: 'VIP',
                  qidNumber: '29363400881',
                  verifiedAge: 31,
                  createdAt: new Date().toISOString(),
                };
                storeDb.saveCustomer(sampleImport);
                onRefresh();
                notify(`Imported customer "${sampleImport.fullName}" via CSV template.`);
              }}
              className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
            >
              <Upload className="w-3.5 h-3.5" /> Import CSV
            </button>
            <button
              onClick={() => setShowCreateCustomerModal(true)}
              className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
            >
              <Plus className="w-3.5 h-3.5" /> Add Customer
            </button>
          </div>
        </div>

        {/* Duplicate Customer Detection Alert */}
        {duplicatePairs.length > 0 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <GitMerge className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                  Duplicate Customer Profile Detected ({duplicatePairs.length})
                </h4>
                <p className="text-xs text-amber-800 mt-0.5">
                  <strong>{duplicatePairs[0].primary.fullName}</strong> ({duplicatePairs[0].primary.email}) and{' '}
                  <strong>{duplicatePairs[0].duplicate.fullName}</strong> ({duplicatePairs[0].duplicate.email}) —{' '}
                  <span className="underline">{duplicatePairs[0].matchReason}</span>.
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                const pair = duplicatePairs[0];
                storeDb.mergeCustomers(pair.primary.id, pair.duplicate.id);
                onRefresh();
                notify(`Merged duplicate profile into ${pair.primary.fullName} and consolidated addresses & order history.`);
              }}
              className="px-4 py-2 rounded-lg bg-amber-900 hover:bg-amber-800 text-white text-xs font-semibold flex items-center gap-1.5 shrink-0"
            >
              <GitMerge className="w-3.5 h-3.5" /> Merge Profiles Now
            </button>
          </div>
        )}

        {/* Segment Filter Bar + Search */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              {[
                { id: 'all', label: `All Customers (${customers.length})` },
                { id: 'VIP', label: 'VIP Segment' },
                { id: 'Returning', label: 'Returning' },
                { id: 'First-Time', label: 'First-Time' },
                { id: 'Wholesale', label: 'Wholesale' },
                { id: 'subscribed', label: 'Email Subscribed' },
              ].map((seg) => (
                <button
                  key={seg.id}
                  onClick={() => setCustomerSegmentFilter(seg.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                    customerSegmentFilter === seg.id
                      ? 'bg-slate-900 text-white'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {seg.label}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => setCustomerSearch(e.target.value)}
                placeholder="Search name, email, +974, QID, tag..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>

          {/* Customers Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Segment & Marketing</th>
                  <th className="py-3 px-4">Location (Qatar)</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Lifetime Spent (LTV)</th>
                  <th className="py-3 px-4">Tags</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {filteredCustomers.map((c) => {
                  const stats = getCustomerStats(c.email);
                  const defaultAddr = c.addresses.find((a) => a.isDefault) || c.addresses[0];
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">{c.fullName}</div>
                        <div className="text-xs text-slate-500">{c.email} · {c.phone}</div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              c.segment === 'VIP'
                                ? 'bg-amber-100 text-amber-800'
                                : c.segment === 'Wholesale'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {c.segment}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                              c.marketingSubscribed
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {c.marketingSubscribed ? 'Subscribed' : 'Not Subscribed'}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-700">
                        {defaultAddr ? `${defaultAddr.municipality}, ${defaultAddr.zone}` : 'Doha, Qatar'}
                        <div className="text-[11px] text-slate-400">
                          {c.addresses.length} saved address{c.addresses.length === 1 ? '' : 'es'}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-800 tabular-nums">
                        {stats.ordersCount} order{stats.ordersCount === 1 ? '' : 's'}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-700 tabular-nums">
                        {(stats.totalSpentMinor / 100).toFixed(2)} QAR
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {c.tags.slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-medium"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => setInspectingCustomer(c)}
                          className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" /> Full Profile
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Customer Full Profile Slide-Over Modal */}
        {inspectingCustomer && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-end">
            <div className="bg-white w-full max-w-3xl h-full overflow-y-auto shadow-2xl border-l border-slate-200 flex flex-col justify-between">
              <div className="p-6 space-y-6">
                <div className="flex items-start justify-between border-b border-slate-200 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-xl font-bold text-slate-900">{inspectingCustomer.fullName}</h3>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800">
                        {inspectingCustomer.segment}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {inspectingCustomer.email} · {inspectingCustomer.phone} · QID: {inspectingCustomer.qidNumber || 'Verified'}
                    </p>
                  </div>
                  <button
                    onClick={() => setInspectingCustomer(null)}
                    className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* LTV & Key Metrics */}
                {(() => {
                  const stats = getCustomerStats(inspectingCustomer.email);
                  return (
                    <div className="grid grid-cols-3 gap-4">
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Lifetime Value (LTV)</div>
                        <div className="text-lg font-bold text-emerald-700 font-mono tabular-nums mt-1">
                          {(stats.totalSpentMinor / 100).toFixed(2)} QAR
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Total Orders</div>
                        <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
                          {stats.ordersCount}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[11px] font-bold text-slate-400 uppercase">Average Order Value</div>
                        <div className="text-lg font-bold text-slate-900 font-mono tabular-nums mt-1">
                          {(stats.avgOrderMinor / 100).toFixed(2)} QAR
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Editable Customer Settings: Segment, Marketing, Tags, Notes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Customer Segment
                    </label>
                    <select
                      value={inspectingCustomer.segment}
                      onChange={(e) => {
                        const updated: CustomerRecord = {
                          ...inspectingCustomer,
                          segment: e.target.value as CustomerRecord['segment'],
                        };
                        storeDb.saveCustomer(updated);
                        setInspectingCustomer(updated);
                        onRefresh();
                        notify('Customer segment updated.');
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-semibold"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Returning">Returning</option>
                      <option value="First-Time">First-Time</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="At-Risk">At-Risk</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Marketing Subscriptions
                    </label>
                    <div className="flex items-center gap-4 pt-1.5">
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inspectingCustomer.marketingSubscribed}
                          onChange={(e) => {
                            const updated = {
                              ...inspectingCustomer,
                              marketingSubscribed: e.target.checked,
                            };
                            storeDb.saveCustomer(updated);
                            setInspectingCustomer(updated);
                            onRefresh();
                          }}
                          className="rounded border-slate-300"
                        />
                        Email Marketing
                      </label>
                      <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={inspectingCustomer.smsMarketingSubscribed}
                          onChange={(e) => {
                            const updated = {
                              ...inspectingCustomer,
                              smsMarketingSubscribed: e.target.checked,
                            };
                            storeDb.saveCustomer(updated);
                            setInspectingCustomer(updated);
                            onRefresh();
                          }}
                          className="rounded border-slate-300"
                        />
                        SMS / WhatsApp VIP
                      </label>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      Customer Tags (Comma separated)
                    </label>
                    <input
                      type="text"
                      value={inspectingCustomer.tags.join(', ')}
                      onChange={(e) => {
                        const updated = {
                          ...inspectingCustomer,
                          tags: e.target.value
                            .split(',')
                            .map((t) => t.trim())
                            .filter(Boolean),
                        };
                        storeDb.saveCustomer(updated);
                        setInspectingCustomer(updated);
                        onRefresh();
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-600 uppercase mb-1">
                      CRM Staff Notes
                    </label>
                    <textarea
                      rows={2}
                      value={inspectingCustomer.notes}
                      onChange={(e) => {
                        const updated = { ...inspectingCustomer, notes: e.target.value };
                        storeDb.saveCustomer(updated);
                        setInspectingCustomer(updated);
                        onRefresh();
                      }}
                      className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {/* Multiple Addresses Manager */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-slate-500" /> Saved Qatar Delivery Addresses ({inspectingCustomer.addresses.length})
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {inspectingCustomer.addresses.map((addr) => (
                      <div
                        key={addr.id}
                        className={`p-3.5 rounded-xl border text-xs ${
                          addr.isDefault ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white'
                        }`}
                      >
                        <div className="flex items-center justify-between font-bold text-slate-900">
                          <span>{addr.label}</span>
                          {addr.isDefault ? (
                            <span className="px-2 py-0.5 rounded bg-slate-900 text-white text-[10px]">Default</span>
                          ) : (
                            <button
                              onClick={() => {
                                const updatedAddrs = inspectingCustomer.addresses.map((a) => ({
                                  ...a,
                                  isDefault: a.id === addr.id,
                                }));
                                const updated = { ...inspectingCustomer, addresses: updatedAddrs };
                                storeDb.saveCustomer(updated);
                                setInspectingCustomer(updated);
                                onRefresh();
                                notify(`Set "${addr.label}" as default address.`);
                              }}
                              className="text-[11px] text-slate-500 hover:text-slate-900 underline"
                            >
                              Set Default
                            </button>
                          )}
                        </div>
                        <p className="text-slate-600 mt-1">{addr.addressLine1}</p>
                        <p className="text-slate-500">
                          {addr.municipality} · {addr.zone} · {addr.countryName}
                        </p>
                      </div>
                    ))}
                  </div>

                  {/* Quick Add Address */}
                  <div className="p-3.5 rounded-xl border border-dashed border-slate-300 bg-slate-50/50 space-y-2.5">
                    <div className="text-[11px] font-bold text-slate-700 uppercase">Add Secondary Address</div>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={newAddrLabel}
                        onChange={(e) => setNewAddrLabel(e.target.value)}
                        placeholder="Label (e.g. Office)"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                      />
                      <input
                        type="text"
                        value={newAddrLine1}
                        onChange={(e) => setNewAddrLine1(e.target.value)}
                        placeholder="Tower / Villa / Street"
                        className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg sm:col-span-2"
                      />
                      <button
                        onClick={() => {
                          if (!newAddrLine1.trim()) return;
                          const newAddr: CustomerAddress = {
                            id: 'addr_' + Date.now(),
                            label: newAddrLabel || 'Secondary Address',
                            addressLine1: newAddrLine1.trim(),
                            city: newAddrMunicipality,
                            municipality: newAddrMunicipality,
                            zone: newAddrZone,
                            postalCode: '00000',
                            countryCode: 'QA',
                            countryName: 'Qatar',
                            isDefault: false,
                          };
                          const updated = {
                            ...inspectingCustomer,
                            addresses: [...inspectingCustomer.addresses, newAddr],
                          };
                          storeDb.saveCustomer(updated);
                          setInspectingCustomer(updated);
                          setNewAddrLine1('');
                          onRefresh();
                          notify('Added address to customer profile.');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                      >
                        + Add Address
                      </button>
                    </div>
                  </div>
                </div>

                {/* Complete Order History */}
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Complete Order History
                  </h4>
                  {(() => {
                    const { custOrders } = getCustomerStats(inspectingCustomer.email);
                    if (custOrders.length === 0) {
                      return (
                        <div className="p-6 text-center bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500">
                          No completed orders recorded for this customer yet.
                        </div>
                      );
                    }
                    return (
                      <div className="space-y-2.5">
                        {custOrders.map((ord) => (
                          <div
                            key={ord.orderId}
                            className="p-3.5 rounded-xl border border-slate-200 flex items-center justify-between text-xs hover:bg-slate-50"
                          >
                            <div>
                              <div className="font-bold text-slate-900">
                                {ord.orderNumber}{' '}
                                <span className="text-slate-400 font-normal">
                                  ({new Date(ord.orderDate).toLocaleDateString()})
                                </span>
                              </div>
                              <div className="text-slate-600 mt-0.5">
                                {ord.items.map((i) => `${i.quantity}x ${i.productName}`).join(', ')}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="font-mono font-bold text-slate-900">
                                  {(ord.financials.totalAmountMinorUnits / 100).toFixed(2)} QAR
                                </div>
                                <span className="inline-block mt-0.5 px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase">
                                  {ord.status}
                                </span>
                              </div>
                              <button
                                onClick={() =>
                                  setDeletingOrdersConfirm({
                                    orderIds: [ord.orderId],
                                    label: ord.orderNumber,
                                  })
                                }
                                title="Delete Order"
                                className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  })()}
                </div>
              </div>

              <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                <button
                  onClick={() => {
                    storeDb.deleteCustomer(inspectingCustomer.id);
                    setInspectingCustomer(null);
                    onRefresh();
                    notify(`Deleted customer profile ${inspectingCustomer.fullName}.`);
                  }}
                  className="px-3 py-2 rounded-lg text-rose-600 hover:bg-rose-50 text-xs font-semibold flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Profile
                </button>
                <button
                  onClick={() => setInspectingCustomer(null)}
                  className="px-5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Create Customer Modal */}
        {showCreateCustomerModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">Add New Qatar Customer Profile</h3>
                <button onClick={() => setShowCreateCustomerModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={newCustomerForm.fullName}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, fullName: e.target.value })}
                      placeholder="e.g. Sheikh Tamim Al-Kuwari"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Email *</label>
                    <input
                      type="email"
                      required
                      value={newCustomerForm.email}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
                      placeholder="customer@doha.qa"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Phone (+974)</label>
                    <input
                      type="text"
                      value={newCustomerForm.phone}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Qatar National ID (QID)</label>
                    <input
                      type="text"
                      value={newCustomerForm.qidNumber}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, qidNumber: e.target.value })}
                      placeholder="28963400123"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Municipality</label>
                    <select
                      value={newCustomerForm.municipality}
                      onChange={(e) => setNewCustomerForm({ ...newCustomerForm, municipality: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="Doha">Doha</option>
                      <option value="Al Rayyan">Al Rayyan</option>
                      <option value="Al Daayen (Lusail)">Al Daayen (Lusail)</option>
                      <option value="Al Wakrah">Al Wakrah</option>
                      <option value="Al Khor">Al Khor</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Segment</label>
                    <select
                      value={newCustomerForm.segment}
                      onChange={(e) =>
                        setNewCustomerForm({
                          ...newCustomerForm,
                          segment: e.target.value as CustomerRecord['segment'],
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="VIP">VIP</option>
                      <option value="Returning">Returning</option>
                      <option value="First-Time">First-Time</option>
                      <option value="Wholesale">Wholesale</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Primary Delivery Address</label>
                  <input
                    type="text"
                    value={newCustomerForm.addressLine1}
                    onChange={(e) => setNewCustomerForm({ ...newCustomerForm, addressLine1: e.target.value })}
                    placeholder="Tower / Compound / Street"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateCustomerModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold">
                    Save Customer Profile
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ============================================================================
  // RENDER: ORDERS & DRAFT ORDERS VIEW
  // ============================================================================
  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            {orderTab === 'drafts' ? 'Draft Orders & Custom Invoices' : 'Orders & Fulfillment Ledger'}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage Qatar MOPH-verified orders, draft invoices, shipping labels, partial/full refunds, returns, and tax invoices.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => {
              setNewOrderForm({ ...newOrderForm, isDraft: true });
              setShowCreateOrderModal(true);
            }}
            className="px-3.5 py-2 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5"
          >
            <FileText className="w-3.5 h-3.5" /> Create Draft Order
          </button>
          <button
            onClick={() => {
              setNewOrderForm({ ...newOrderForm, isDraft: false });
              setShowCreateOrderModal(true);
            }}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Create Custom Order
          </button>
        </div>
      </div>

      {/* Tabs + Search + Bulk Actions */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: `All Orders (${orders.filter((o) => !o.isDraft).length})` },
              { id: 'drafts', label: `Draft Orders (${orders.filter((o) => o.isDraft).length})` },
              { id: 'unfulfilled', label: 'Unfulfilled' },
              { id: 'paid', label: 'Paid' },
              { id: 'shipped', label: 'Shipped / Delivered' },
              { id: 'refunded', label: 'Refunds & Returns' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setOrderTab(tab.id as typeof orderTab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap ${
                  orderTab === tab.id ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {selectedOrderIds.length > 0 && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
                <span className="text-[11px] font-bold text-slate-700 px-2">
                  {selectedOrderIds.length} selected
                </span>
                <button
                  onClick={() => handleBulkOrderAction('fulfill')}
                  className="px-2.5 py-1 rounded bg-white text-slate-800 text-[11px] font-semibold shadow-2xs hover:bg-slate-50"
                >
                  Fulfill
                </button>
                <button
                  onClick={() => handleBulkOrderAction('mark_paid')}
                  className="px-2.5 py-1 rounded bg-white text-emerald-700 text-[11px] font-semibold shadow-2xs hover:bg-slate-50"
                >
                  Mark Paid
                </button>
                <button
                  onClick={() => handleBulkOrderAction('export')}
                  className="px-2.5 py-1 rounded bg-white text-slate-700 text-[11px] font-semibold shadow-2xs hover:bg-slate-50"
                >
                  Export CSV
                </button>
                <button
                  onClick={() => handleBulkOrderAction('cancel')}
                  className="px-2.5 py-1 rounded bg-white text-amber-700 text-[11px] font-semibold shadow-2xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBulkOrderAction('delete')}
                  className="px-2.5 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold shadow-2xs hover:bg-rose-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}

            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order #, customer, SKU..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-slate-900"
              />
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4 w-8">
                  <input
                    type="checkbox"
                    checked={
                      filteredOrders.length > 0 &&
                      filteredOrders.every((o) => selectedOrderIds.includes(o.orderId))
                    }
                    onChange={(e) =>
                      setSelectedOrderIds(
                        e.target.checked ? filteredOrders.map((o) => o.orderId) : []
                      )
                    }
                    className="rounded border-slate-300"
                  />
                </th>
                <th className="py-3 px-4">Order</th>
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Customer & Destination</th>
                <th className="py-3 px-4">Payment</th>
                <th className="py-3 px-4">Fulfillment</th>
                <th className="py-3 px-4">Items</th>
                <th className="py-3 px-4">Total (QAR)</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm">
              {filteredOrders.map((order) => (
                <tr key={order.orderId} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <input
                      type="checkbox"
                      checked={selectedOrderIds.includes(order.orderId)}
                      onChange={() => handleSelectOrder(order.orderId)}
                      className="rounded border-slate-300"
                    />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                      {order.orderNumber}
                      {order.isDraft && (
                        <span className="px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 text-[10px] font-sans font-bold">
                          DRAFT
                        </span>
                      )}
                    </div>
                    {order.tags && order.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {order.tags.map((t) => (
                          <span key={t} className="px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded text-[10px]">
                            {t}
                          </span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-600 tabular-nums">
                    {new Date(order.orderDate).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900 text-xs">{order.customer.fullName}</div>
                    <div className="text-[11px] text-slate-500">
                      {order.shippingAddress.municipality || order.shippingAddress.city}, Qatar
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        order.payment.paymentStatus === 'captured'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : order.payment.paymentStatus === 'partially_refunded' ||
                            order.payment.paymentStatus === 'refunded'
                          ? 'bg-rose-50 text-rose-700 border border-rose-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {order.payment.paymentStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        order.status === 'shipped' || order.status === 'delivered'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : order.status === 'cancelled' || order.status === 'refunded'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {order.status.replace('_', ' ')}
                    </span>
                    {order.returnStatus && order.returnStatus !== 'none' && (
                      <div className="text-[10px] font-bold text-rose-600 mt-0.5 uppercase">
                        Return: {order.returnStatus}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-700">
                    {order.items.reduce((acc, i) => acc + i.quantity, 0)} item(s)
                  </td>
                  <td className="py-3.5 px-4 font-mono text-xs font-bold text-slate-900 tabular-nums">
                    {(order.financials.totalAmountMinorUnits / 100).toFixed(2)} QAR
                    {(order.refundedAmountMinorUnits || 0) > 0 && (
                      <div className="text-[10px] text-rose-600 font-normal">
                        Refunded: {((order.refundedAmountMinorUnits || 0) / 100).toFixed(2)} QAR
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {order.isDraft && (
                        <button
                          onClick={() => {
                            storeDb.convertDraftOrderToActive(order.orderId);
                            onRefresh();
                            notify(`Draft ${order.orderNumber} converted to active paid order!`);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          Convert to Active
                        </button>
                      )}
                      <button
                        onClick={() =>
                          setPrintingOrder({ order, docType: 'invoice' })
                        }
                        title="Print Tax Invoice / Packing Slip"
                        className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          setInspectingOrder(order);
                          setOrderNoteEdit(order.notes || '');
                          setTrackingInput(order.shipping.trackingNumber || '');
                          setRefundAmountQar(
                            ((order.financials.totalAmountMinorUnits - (order.refundedAmountMinorUnits || 0)) / 100).toFixed(2)
                          );
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1"
                      >
                        <Eye className="w-3.5 h-3.5" /> Manage
                      </button>
                      <button
                        onClick={() =>
                          setDeletingOrdersConfirm({
                            orderIds: [order.orderId],
                            label: order.orderNumber,
                          })
                        }
                        title={`Delete Order ${order.orderNumber}`}
                        aria-label={`Delete Order ${order.orderNumber}`}
                        className="p-1.5 rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detailed Order Inspector Modal */}
      {inspectingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-4xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-200 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900 font-mono">
                    {inspectingOrder.orderNumber}
                  </h3>
                  {inspectingOrder.isDraft && (
                    <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 text-xs font-bold">
                      DRAFT ORDER
                    </span>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-slate-100 text-slate-800">
                    {inspectingOrder.status}
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Placed {new Date(inspectingOrder.orderDate).toLocaleString()} · Customer:{' '}
                  <strong>{inspectingOrder.customer.fullName}</strong> ({inspectingOrder.customer.email})
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintingOrder({ order: inspectingOrder, docType: 'invoice' })}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Invoice / Slip
                </button>
                <button
                  onClick={() =>
                    setDeletingOrdersConfirm({
                      orderIds: [inspectingOrder.orderId],
                      label: inspectingOrder.orderNumber,
                    })
                  }
                  className="px-3 py-1.5 rounded-lg border border-rose-200 bg-rose-50 text-xs font-semibold text-rose-700 hover:bg-rose-100 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete Order
                </button>
                <button
                  onClick={() => setInspectingOrder(null)}
                  className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Left 2 Columns: Line Items, Fulfillment, Refunds, Timeline */}
              <div className="lg:col-span-2 space-y-5">
                {/* Line Items */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Order Items ({inspectingOrder.items.length})
                  </h4>
                  <div className="divide-y divide-slate-100">
                    {inspectingOrder.items.map((item, idx) => (
                      <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-slate-900">{item.productName}</div>
                          <div className="text-slate-500">
                            SKU: {item.sku} · Variant: {item.variantTitle}
                          </div>
                        </div>
                        <div className="font-mono font-bold text-slate-900 tabular-nums">
                          {item.quantity} × {(item.unitPriceMinorUnits / 100).toFixed(2)} ={' '}
                          {(item.totalPriceMinorUnits / 100).toFixed(2)} QAR
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-slate-200 pt-3 space-y-1 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Subtotal</span>
                      <span className="font-mono">{(inspectingOrder.financials.subtotalMinorUnits / 100).toFixed(2)} QAR</span>
                    </div>
                    {inspectingOrder.financials.discountMinorUnits > 0 && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Discount</span>
                        <span className="font-mono">-{(inspectingOrder.financials.discountMinorUnits / 100).toFixed(2)} QAR</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Qatar Delivery ({inspectingOrder.shipping.carrier})</span>
                      <span className="font-mono">{(inspectingOrder.financials.shippingFeeMinorUnits / 100).toFixed(2)} QAR</span>
                    </div>
                    <div className="flex justify-between font-bold text-slate-900 text-sm pt-1 border-t border-slate-100">
                      <span>Total</span>
                      <span className="font-mono">{(inspectingOrder.financials.totalAmountMinorUnits / 100).toFixed(2)} QAR</span>
                    </div>
                  </div>
                </div>

                {/* Fulfillment & Shipping Label Box */}
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Truck className="w-4 h-4 text-slate-600" /> Fulfillment & Qatar Courier Dispatch
                    </h4>
                    <button
                      onClick={() =>
                        setTrackingInput(`QPOST-DHA-${Math.floor(100000 + Math.random() * 900000)}`)
                      }
                      className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline"
                    >
                      Generate Doha Waybill #
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <select
                      value={carrierInput}
                      onChange={(e) => setCarrierInput(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-medium"
                    >
                      <option value="Doha City Express">Doha City Express (Same-Day)</option>
                      <option value="Qatar Post Express">Qatar Post Express</option>
                      <option value="Aramex Qatar">Aramex Qatar</option>
                      <option value="DHL Express Doha">DHL Express Doha</option>
                    </select>
                    <input
                      type="text"
                      value={trackingInput}
                      onChange={(e) => setTrackingInput(e.target.value)}
                      placeholder="Tracking / Waybill #"
                      className="px-3 py-2 bg-white border border-slate-200 rounded-lg font-mono"
                    />
                    <button
                      onClick={() => {
                        const updated = storeDb.fulfillOrder(
                          inspectingOrder.orderId,
                          trackingInput || `DHA-${Date.now()}`,
                          carrierInput
                        );
                        setInspectingOrder(updated);
                        onRefresh();
                        notify(`Order ${updated.orderNumber} fulfilled and tracking dispatched.`);
                      }}
                      className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold"
                    >
                      Mark Fulfilled & Ship
                    </button>
                  </div>
                </div>

                {/* Partial & Full Refund + Return Controls */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <RotateCcw className="w-4 h-4 text-rose-600" /> Refunds, Returns & Cancellations
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Refund Amount (QAR)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={refundAmountQar}
                        onChange={(e) => setRefundAmountQar(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Reason for Refund
                      </label>
                      <input
                        type="text"
                        value={refundReason}
                        onChange={(e) => setRefundReason(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-200 rounded-lg"
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={restockOnRefund}
                        onChange={(e) => setRestockOnRefund(e.target.checked)}
                        className="rounded border-slate-300"
                      />
                      Restock items to Doha Pearl Hub if full refund
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          const minor = Math.round((parseFloat(refundAmountQar) || 0) * 100);
                          if (minor <= 0) return;
                          const updated = storeDb.refundOrder(
                            inspectingOrder.orderId,
                            minor,
                            refundReason,
                            restockOnRefund
                          );
                          setInspectingOrder(updated);
                          onRefresh();
                          notify(`Processed ${(minor / 100).toFixed(2)} QAR refund on ${updated.orderNumber}.`);
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold"
                      >
                        Issue Refund
                      </button>
                      <button
                        onClick={() => {
                          const nextReturn =
                            inspectingOrder.returnStatus === 'requested' ? 'approved' : 'requested';
                          const updated = storeDb.updateOrder(inspectingOrder.orderId, {
                            returnStatus: nextReturn,
                          });
                          storeDb.addOrderTimelineNote(
                            inspectingOrder.orderId,
                            `Return status updated to ${nextReturn.toUpperCase()}`,
                            'Return Workflow Updated'
                          );
                          setInspectingOrder(storeDb.getOrderById(inspectingOrder.orderId) || updated);
                          onRefresh();
                          notify(`Order return status set to ${nextReturn}.`);
                        }}
                        className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                      >
                        {inspectingOrder.returnStatus === 'requested'
                          ? 'Approve Return'
                          : 'Log Return Request'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Order Timeline & Staff Notes */}
                <div className="p-4 rounded-xl border border-slate-200 space-y-3">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Order Audit Timeline
                  </h4>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={timelineComment}
                      onChange={(e) => setTimelineComment(e.target.value)}
                      placeholder="Add internal staff note to order timeline..."
                      className="flex-1 px-3 py-1.5 text-xs border border-slate-200 rounded-lg"
                    />
                    <button
                      onClick={() => {
                        if (!timelineComment.trim()) return;
                        const updated = storeDb.addOrderTimelineNote(
                          inspectingOrder.orderId,
                          timelineComment.trim()
                        );
                        setInspectingOrder(updated);
                        setTimelineComment('');
                        onRefresh();
                        notify('Added note to order timeline.');
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-slate-900 text-white text-xs font-semibold"
                    >
                      Post Comment
                    </button>
                  </div>
                  <div className="space-y-2.5 pt-2 max-h-48 overflow-y-auto">
                    {inspectingOrder.timeline.map((ev, i) => (
                      <div key={i} className="text-xs border-l-2 border-slate-300 pl-3 py-0.5">
                        <div className="font-bold text-slate-800">
                          {ev.status}{' '}
                          <span className="font-normal text-slate-400">
                            · {new Date(ev.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <div className="text-slate-600">{ev.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Right Column: Customer, QID Compliance, Order Notes */}
              <div className="space-y-4">
                <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider">Customer & Delivery</h4>
                  <div className="font-semibold text-slate-900">{inspectingOrder.customer.fullName}</div>
                  <div className="text-slate-600">{inspectingOrder.customer.email}</div>
                  <div className="text-slate-600">{inspectingOrder.customer.phone}</div>
                  <div className="border-t border-slate-100 pt-2 mt-2 text-slate-700">
                    <div className="font-bold text-slate-800">Shipping Address (Qatar)</div>
                    <div>{inspectingOrder.shippingAddress.addressLine1}</div>
                    <div>
                      {inspectingOrder.shippingAddress.municipality || inspectingOrder.shippingAddress.city} ·{' '}
                      {inspectingOrder.shippingAddress.zone || 'Zone 66'}
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/50 space-y-1.5 text-xs">
                  <div className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" /> Qatar MOPH 21+ Compliance
                  </div>
                  <div className="text-emerald-800">
                    Verified Age: <strong>{inspectingOrder.compliance.customerVerifiedAge} yrs</strong> (Min{' '}
                    {inspectingOrder.compliance.countryMinimumAgeRequired}+)
                  </div>
                  <div className="text-emerald-700 font-mono text-[11px]">
                    Ref: {inspectingOrder.compliance.verificationProviderRef}
                  </div>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 space-y-2 text-xs">
                  <h4 className="font-bold text-slate-900 uppercase tracking-wider">Order Notes</h4>
                  <textarea
                    rows={3}
                    value={orderNoteEdit}
                    onChange={(e) => setOrderNoteEdit(e.target.value)}
                    placeholder="Special delivery instructions..."
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                  <button
                    onClick={() => {
                      const updated = storeDb.updateOrder(inspectingOrder.orderId, {
                        notes: orderNoteEdit,
                      });
                      setInspectingOrder(updated);
                      onRefresh();
                      notify('Saved order notes.');
                    }}
                    className="w-full py-1.5 rounded-lg bg-slate-900 text-white font-semibold"
                  >
                    Save Order Note
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Printable Tax Invoice & Packing Slip Modal */}
      {printingOrder && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-2xl w-full p-8 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPrintingOrder({ ...printingOrder, docType: 'invoice' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    printingOrder.docType === 'invoice'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Commercial Tax Invoice
                </button>
                <button
                  onClick={() => setPrintingOrder({ ...printingOrder, docType: 'packing_slip' })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
                    printingOrder.docType === 'packing_slip'
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Warehouse Packing Slip
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    window.print();
                    notify(`Sent ${printingOrder.docType} for ${printingOrder.order.orderNumber} to printer.`);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" /> Print Now
                </button>
                <button
                  onClick={() => setPrintingOrder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Body */}
            <div className="space-y-5 text-xs text-slate-800 border border-slate-200 p-6 rounded-xl">
              <div className="flex justify-between items-start border-b border-slate-200 pb-4">
                <div>
                  <div className="text-base font-bold text-slate-900">{settings.storeName}</div>
                  <div className="text-slate-500">{settings.supportAddress}</div>
                  <div className="text-slate-500">
                    {settings.contactEmail} · {settings.contactPhone}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-bold uppercase text-slate-900">
                    {printingOrder.docType === 'invoice' ? 'QATAR COMMERCIAL INVOICE' : 'DOHA HUB PACKING SLIP'}
                  </div>
                  <div className="font-mono font-bold text-slate-700 mt-0.5">
                    {printingOrder.order.orderNumber}
                  </div>
                  <div className="text-slate-500">
                    Date: {new Date(printingOrder.order.orderDate).toLocaleDateString()}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Recipient (Adult 21+ Verified)</div>
                  <div className="font-bold text-slate-900 mt-0.5">{printingOrder.order.customer.fullName}</div>
                  <div>{printingOrder.order.shippingAddress.addressLine1}</div>
                  <div>
                    {printingOrder.order.shippingAddress.municipality || printingOrder.order.shippingAddress.city}, Qatar
                  </div>
                  <div>Phone: {printingOrder.order.customer.phone}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-500 uppercase text-[10px]">Fulfillment & Compliance</div>
                  <div>Carrier: {printingOrder.order.shipping.carrier}</div>
                  <div>Tracking: {printingOrder.order.shipping.trackingNumber || 'Pending Dispatch'}</div>
                  <div>QID Ref: {printingOrder.order.compliance.verificationProviderRef}</div>
                </div>
              </div>

              <table className="w-full text-left border-collapse border-t border-b border-slate-200 my-2">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase">
                    <th className="py-2">SKU</th>
                    <th className="py-2">Product Description</th>
                    <th className="py-2 text-right">Qty</th>
                    {printingOrder.docType === 'invoice' && (
                      <>
                        <th className="py-2 text-right">Unit Price</th>
                        <th className="py-2 text-right">Line Total</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {printingOrder.order.items.map((item, i) => (
                    <tr key={i}>
                      <td className="py-2 font-mono">{item.sku}</td>
                      <td className="py-2 font-semibold">{item.productName} ({item.variantTitle})</td>
                      <td className="py-2 text-right font-mono">{item.quantity}</td>
                      {printingOrder.docType === 'invoice' && (
                        <>
                          <td className="py-2 text-right font-mono">
                            {(item.unitPriceMinorUnits / 100).toFixed(2)} QAR
                          </td>
                          <td className="py-2 text-right font-mono font-bold">
                            {(item.totalPriceMinorUnits / 100).toFixed(2)} QAR
                          </td>
                        </>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>

              {printingOrder.docType === 'invoice' && (
                <div className="flex justify-end">
                  <div className="w-56 space-y-1 text-right">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Subtotal:</span>
                      <span className="font-mono">
                        {(printingOrder.order.financials.subtotalMinorUnits / 100).toFixed(2)} QAR
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Shipping:</span>
                      <span className="font-mono">
                        {(printingOrder.order.financials.shippingFeeMinorUnits / 100).toFixed(2)} QAR
                      </span>
                    </div>
                    <div className="flex justify-between font-bold text-sm border-t border-slate-200 pt-1">
                      <span>Total Paid:</span>
                      <span className="font-mono">
                        {(printingOrder.order.financials.totalAmountMinorUnits / 100).toFixed(2)} QAR
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Create Custom Order / Draft Order Modal */}
      {showCreateOrderModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {newOrderForm.isDraft ? 'Create Draft Order / Custom Quote' : 'Create Custom Qatar Order'}
              </h3>
              <button onClick={() => setShowCreateOrderModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateCustomOrDraftOrder} className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200">
                <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newOrderForm.isDraft}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, isDraft: e.target.checked })}
                    className="rounded border-slate-300"
                  />
                  Save as Draft Order (Reserve quote without deducting live stock)
                </label>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newOrderForm.customerName}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerName: e.target.value })}
                    placeholder="Rashid Al-Mansoori"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Customer Email *</label>
                  <input
                    type="email"
                    required
                    value={newOrderForm.customerEmail}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerEmail: e.target.value })}
                    placeholder="rashid@doha.qa"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Phone (+974)</label>
                  <input
                    type="text"
                    value={newOrderForm.customerPhone}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customerPhone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Qatar National ID (QID)</label>
                  <input
                    type="text"
                    value={newOrderForm.qidNumber}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, qidNumber: e.target.value })}
                    placeholder="28963400512"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Municipality</label>
                  <select
                    value={newOrderForm.municipality}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, municipality: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    <option value="Doha">Doha</option>
                    <option value="Al Rayyan">Al Rayyan</option>
                    <option value="Al Daayen (Lusail)">Al Daayen (Lusail)</option>
                    <option value="Al Wakrah">Al Wakrah</option>
                    <option value="Al Khor">Al Khor</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Street / Tower Address</label>
                  <input
                    type="text"
                    value={newOrderForm.addressLine1}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, addressLine1: e.target.value })}
                    placeholder="Porto Arabia Tower 14"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block font-bold text-slate-700 mb-1">Select Product</label>
                  <select
                    value={newOrderForm.productId}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, productId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({((p.countrySpecificPrices?.['QA'] || p.basePriceMinorUnits) / 100).toFixed(2)} QAR)
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min={1}
                    value={newOrderForm.quantity}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, quantity: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Custom Unit Price (QAR, optional)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newOrderForm.customUnitPriceQar}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, customUnitPriceQar: e.target.value })}
                    placeholder="Leave blank for catalog price"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Apply Discount Code</label>
                  <input
                    type="text"
                    value={newOrderForm.discountCode}
                    onChange={(e) => setNewOrderForm({ ...newOrderForm, discountCode: e.target.value })}
                    placeholder="e.g. DOHAVIP15"
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateOrderModal(false)}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold">
                  {newOrderForm.isDraft ? 'Save Draft Order' : 'Create & Authorize Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Order(s) Confirmation Modal */}
      {deletingOrdersConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Delete {deletingOrdersConfirm.orderIds.length === 1 ? 'Order' : 'Orders'}?
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Target: <strong className="font-mono text-slate-800">{deletingOrdersConfirm.label}</strong>
                  </p>
                </div>
              </div>
              <button
                onClick={() => setDeletingOrdersConfirm(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              This will permanently remove the selected order record(s) from the Orders &amp; Fulfillment Ledger and customer order history. This action cannot be undone.
            </p>

            <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium cursor-pointer">
              <input
                type="checkbox"
                checked={restockOnDelete}
                onChange={(e) => setRestockOnDelete(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Restock unrefunded item quantities back to Doha Pearl Hub inventory</span>
            </label>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeletingOrdersConfirm(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteOrders}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" /> Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
