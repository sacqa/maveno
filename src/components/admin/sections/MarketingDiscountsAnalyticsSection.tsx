import React, { useState, useMemo } from 'react';
import {
  Percent,
  Plus,
  Megaphone,
  BarChart3,
  Download,
  Copy,
  Check,
  Trash2,
  Edit3,
  Link2,
  Mail,
  Send,
  Calendar,
  TrendingUp,
  Package,
  Users,
  RotateCcw,
  Tag,
  X,
} from 'lucide-react';
import {
  DiscountRule,
  MarketingCampaign,
  ImmutableOrderSnapshot,
  Product,
  CustomerRecord,
} from '../../../types/ecommerce';
import { storeDb } from '../../../services/store-db';
import { calculateProfitAndMargin } from '../../../utils/commerce-engine';
import { ShopifyAnalyticsDashboard } from './ShopifyAnalyticsDashboard';

interface MarketingDiscountsAnalyticsProps {
  mode: 'discounts' | 'marketing' | 'analytics';
  discounts: DiscountRule[];
  campaigns: MarketingCampaign[];
  orders: ImmutableOrderSnapshot[];
  products: Product[];
  customers: CustomerRecord[];
  onRefresh: () => void;
  notify: (msg: string) => void;
}

export const MarketingDiscountsAnalyticsSection: React.FC<MarketingDiscountsAnalyticsProps> = ({
  mode,
  discounts,
  campaigns,
  orders,
  products,
  customers,
  onRefresh,
  notify,
}) => {
  // --- Discounts State ---
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [editingDiscount, setEditingDiscount] = useState<DiscountRule | null>(null);
  const [discountForm, setDiscountForm] = useState({
    code: '',
    title: '',
    method: 'code' as DiscountRule['method'],
    type: 'percentage' as DiscountRule['type'],
    value: '15',
    buyQuantity: 2,
    getQuantity: 1,
    minPurchaseQar: '300',
    customerEligibility: 'all' as DiscountRule['customerEligibility'],
    eligibleSegment: 'VIP',
    usageLimit: '100',
    startsAt: new Date().toISOString().split('T')[0],
    endsAt: '2026-12-31',
    status: 'active' as DiscountRule['status'],
  });

  // --- Marketing State ---
  const [showCampaignModal, setShowCampaignModal] = useState(false);
  const [campaignForm, setCampaignForm] = useState({
    name: '',
    channel: 'email' as MarketingCampaign['channel'],
    budgetQar: '2500',
    utmSource: 'newsletter_qatar',
    utmMedium: 'email',
    utmCampaign: 'doha_vip_drop',
    subjectLine: 'Exclusive VIP Allocation: Billet Box & Kayfun X Now in Doha',
    audienceSegment: 'VIP',
  });

  // --- Analytics State ---
  const [dateRange, setDateRange] = useState<'today' | '7d' | '30d' | 'qtd' | 'ytd'>('30d');
  const [activeReportTab, setActiveReportTab] = useState<
    'overview' | 'products_profit' | 'customers_ltv' | 'inventory_valuation' | 'discounts_refunds'
  >('overview');

  // ============================================================================
  // 1. DISCOUNTS VIEW
  // ============================================================================
  if (mode === 'discounts') {
    const openCreateDiscount = () => {
      setEditingDiscount(null);
      setDiscountForm({
        code: `QATARVIP${Math.floor(10 + Math.random() * 89)}`,
        title: 'Qatar Seasonal Promotion',
        method: 'code',
        type: 'percentage',
        value: '15',
        buyQuantity: 2,
        getQuantity: 1,
        minPurchaseQar: '250',
        customerEligibility: 'all',
        eligibleSegment: 'VIP',
        usageLimit: '200',
        startsAt: new Date().toISOString().split('T')[0],
        endsAt: '2026-12-31',
        status: 'active',
      });
      setShowDiscountModal(true);
    };

    const openEditDiscount = (d: DiscountRule) => {
      setEditingDiscount(d);
      setDiscountForm({
        code: d.code,
        title: d.title,
        method: d.method,
        type: d.type,
        value: d.type === 'fixed_amount' ? (d.value / 100).toString() : d.value.toString(),
        buyQuantity: d.buyQuantity || 2,
        getQuantity: d.getQuantity || 1,
        minPurchaseQar: (d.minPurchaseMinorUnits / 100).toString(),
        customerEligibility: d.customerEligibility,
        eligibleSegment: d.eligibleSegment || 'VIP',
        usageLimit: d.usageLimit ? d.usageLimit.toString() : '',
        startsAt: d.startsAt,
        endsAt: d.endsAt || '',
        status: d.status,
      });
      setShowDiscountModal(true);
    };

    const handleSaveDiscount = (e: React.FormEvent) => {
      e.preventDefault();
      const rawVal = parseFloat(discountForm.value) || 0;
      const storedValue =
        discountForm.type === 'fixed_amount'
          ? Math.round(rawVal * 100)
          : discountForm.type === 'free_shipping'
          ? 0
          : rawVal;

      const rule: DiscountRule = {
        id: editingDiscount?.id || 'disc_' + Date.now(),
        code: discountForm.code.toUpperCase().trim(),
        title: discountForm.title.trim(),
        method: discountForm.method,
        type: discountForm.type,
        value: storedValue,
        buyQuantity: discountForm.type === 'buy_x_get_y' ? Number(discountForm.buyQuantity) : undefined,
        getQuantity: discountForm.type === 'buy_x_get_y' ? Number(discountForm.getQuantity) : undefined,
        minPurchaseMinorUnits: Math.round((parseFloat(discountForm.minPurchaseQar) || 0) * 100),
        customerEligibility: discountForm.customerEligibility,
        eligibleSegment:
          discountForm.customerEligibility === 'specific_segment'
            ? discountForm.eligibleSegment
            : undefined,
        usageLimit: discountForm.usageLimit ? Number(discountForm.usageLimit) : undefined,
        usedCount: editingDiscount?.usedCount || 0,
        startsAt: discountForm.startsAt,
        endsAt: discountForm.endsAt || undefined,
        status: discountForm.status,
      };

      storeDb.saveDiscount(rule);
      onRefresh();
      setShowDiscountModal(false);
      notify(`Saved discount rule "${rule.code}".`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Discounts & Automatic Promotions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure percentage, fixed QAR amount, free Doha delivery, and Buy X Get Y rules with segment eligibility and usage limits.
            </p>
          </div>
          <button
            onClick={openCreateDiscount}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Create Discount
          </button>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Code / Title</th>
                  <th className="py-3 px-4">Method</th>
                  <th className="py-3 px-4">Type & Benefit</th>
                  <th className="py-3 px-4">Min Requirement</th>
                  <th className="py-3 px-4">Eligibility</th>
                  <th className="py-3 px-4">Used</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {discounts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-mono font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        {d.code}
                        <button
                          onClick={() => {
                            navigator.clipboard?.writeText(d.code);
                            notify(`Copied code ${d.code} to clipboard.`);
                          }}
                          className="text-slate-400 hover:text-slate-700"
                          title="Copy Code"
                        >
                          <Copy className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="text-xs text-slate-500">{d.title}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          d.method === 'automatic'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {d.method}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800">
                      {d.type === 'percentage' && `${d.value}% OFF`}
                      {d.type === 'fixed_amount' && `${(d.value / 100).toFixed(2)} QAR OFF`}
                      {d.type === 'free_shipping' && 'Free Doha Express Delivery'}
                      {d.type === 'buy_x_get_y' &&
                        `Buy ${d.buyQuantity || 2}, Get ${d.getQuantity || 1} (${d.value}% OFF)`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums">
                      {(d.minPurchaseMinorUnits / 100).toFixed(2)} QAR
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {d.customerEligibility === 'all'
                        ? 'All Customers'
                        : `Segment: ${d.eligibleSegment || 'VIP'}`}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-700 tabular-nums">
                      {d.usedCount}
                      {d.usageLimit ? ` / ${d.usageLimit}` : ' / ∞'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          d.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        {d.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openEditDiscount(d)}
                          className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => {
                            storeDb.deleteDiscount(d.id);
                            onRefresh();
                            notify(`Deleted discount ${d.code}.`);
                          }}
                          className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
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

        {/* Create / Edit Discount Modal */}
        {showDiscountModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  {editingDiscount ? `Edit Discount ${editingDiscount.code}` : 'Create Discount Rule'}
                </h3>
                <button onClick={() => setShowDiscountModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleSaveDiscount} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Method</label>
                    <select
                      value={discountForm.method}
                      onChange={(e) =>
                        setDiscountForm({ ...discountForm, method: e.target.value as DiscountRule['method'] })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="code">Discount Code</option>
                      <option value="automatic">Automatic Discount</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Discount Type</label>
                    <select
                      value={discountForm.type}
                      onChange={(e) =>
                        setDiscountForm({ ...discountForm, type: e.target.value as DiscountRule['type'] })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed_amount">Fixed Amount (QAR)</option>
                      <option value="free_shipping">Free Shipping</option>
                      <option value="buy_x_get_y">Buy X Get Y</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Code / Identifier *</label>
                    <input
                      type="text"
                      required
                      value={discountForm.code}
                      onChange={(e) => setDiscountForm({ ...discountForm, code: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Campaign Title *</label>
                    <input
                      type="text"
                      required
                      value={discountForm.title}
                      onChange={(e) => setDiscountForm({ ...discountForm, title: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                {discountForm.type !== 'free_shipping' && (
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        {discountForm.type === 'fixed_amount' ? 'Amount (QAR)' : 'Discount (%)'}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={discountForm.value}
                        onChange={(e) => setDiscountForm({ ...discountForm, value: e.target.value })}
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                      />
                    </div>
                    {discountForm.type === 'buy_x_get_y' && (
                      <>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Buy Qty (X)</label>
                          <input
                            type="number"
                            min={1}
                            value={discountForm.buyQuantity}
                            onChange={(e) =>
                              setDiscountForm({ ...discountForm, buyQuantity: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                        <div>
                          <label className="block font-bold text-slate-700 mb-1">Get Qty (Y)</label>
                          <input
                            type="number"
                            min={1}
                            value={discountForm.getQuantity}
                            onChange={(e) =>
                              setDiscountForm({ ...discountForm, getQuantity: Number(e.target.value) })
                            }
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                          />
                        </div>
                      </>
                    )}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Minimum Purchase (QAR)</label>
                    <input
                      type="number"
                      step="1"
                      value={discountForm.minPurchaseQar}
                      onChange={(e) => setDiscountForm({ ...discountForm, minPurchaseQar: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Total Usage Limit</label>
                    <input
                      type="number"
                      value={discountForm.usageLimit}
                      onChange={(e) => setDiscountForm({ ...discountForm, usageLimit: e.target.value })}
                      placeholder="Unlimited"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Customer Eligibility</label>
                    <select
                      value={discountForm.customerEligibility}
                      onChange={(e) =>
                        setDiscountForm({
                          ...discountForm,
                          customerEligibility: e.target.value as DiscountRule['customerEligibility'],
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="all">All Verified Customers</option>
                      <option value="specific_segment">Specific Customer Segment</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status</label>
                    <select
                      value={discountForm.status}
                      onChange={(e) =>
                        setDiscountForm({ ...discountForm, status: e.target.value as DiscountRule['status'] })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="active">Active</option>
                      <option value="scheduled">Scheduled</option>
                      <option value="expired">Expired</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Start Date</label>
                    <input
                      type="date"
                      value={discountForm.startsAt}
                      onChange={(e) => setDiscountForm({ ...discountForm, startsAt: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Expiration Date</label>
                    <input
                      type="date"
                      value={discountForm.endsAt}
                      onChange={(e) => setDiscountForm({ ...discountForm, endsAt: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold">
                    Save Discount Rule
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
  // 2. MARKETING CAMPAIGNS & UTM BUILDER VIEW
  // ============================================================================
  if (mode === 'marketing') {
    const totalSessions = campaigns.reduce((acc, c) => acc + c.sessions, 0);
    const totalRevMinor = campaigns.reduce((acc, c) => acc + c.revenueMinorUnits, 0);
    const totalSpentMinor = campaigns.reduce((acc, c) => acc + c.spentMinorUnits, 0);
    const roas = totalSpentMinor > 0 ? (totalRevMinor / totalSpentMinor).toFixed(2) : '0.00';

    const generatedUtmUrl = `https://aura-qatar.qa/?utm_source=${encodeURIComponent(
      campaignForm.utmSource
    )}&utm_medium=${encodeURIComponent(campaignForm.utmMedium)}&utm_campaign=${encodeURIComponent(
      campaignForm.utmCampaign
    )}`;

    const handleCreateCampaign = (e: React.FormEvent) => {
      e.preventDefault();
      if (!campaignForm.name.trim()) return;
      const newCamp: MarketingCampaign = {
        id: 'camp_' + Date.now(),
        name: campaignForm.name.trim(),
        channel: campaignForm.channel,
        status: 'active',
        budgetMinorUnits: Math.round((parseFloat(campaignForm.budgetQar) || 1000) * 100),
        spentMinorUnits: 0,
        utmSource: campaignForm.utmSource.trim(),
        utmMedium: campaignForm.utmMedium.trim(),
        utmCampaign: campaignForm.utmCampaign.trim(),
        sessions: 120,
        ordersCount: 4,
        revenueMinorUnits: 340000,
        subjectLine: campaignForm.subjectLine,
        audienceSegment: campaignForm.audienceSegment,
        createdAt: new Date().toISOString().split('T')[0],
      };
      storeDb.saveCampaign(newCamp);
      onRefresh();
      setShowCampaignModal(false);
      notify(`Launched campaign "${newCamp.name}" with UTM tracking.`);
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Marketing & Attribution Campaigns</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track omnichannel campaigns, UTM parameters, ROAS performance, and dispatch VIP email/SMS concierge broadcasts.
            </p>
          </div>
          <button
            onClick={() => setShowCampaignModal(true)}
            className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 shadow-xs"
          >
            <Plus className="w-3.5 h-3.5" /> Create Campaign & UTM Link
          </button>
        </div>

        {/* Marketing KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Campaign Sessions</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {totalSessions.toLocaleString()}
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Attributed Revenue</div>
            <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
              {(totalRevMinor / 100).toLocaleString()} QAR
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Ad / Campaign Spend</div>
            <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
              {(totalSpentMinor / 100).toLocaleString()} QAR
            </div>
          </div>
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <div className="text-[11px] font-bold text-slate-400 uppercase">Return on Ad Spend (ROAS)</div>
            <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">{roas}x</div>
          </div>
        </div>

        {/* Campaigns Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3 px-4">Campaign</th>
                  <th className="py-3 px-4">Channel</th>
                  <th className="py-3 px-4">UTM Parameters</th>
                  <th className="py-3 px-4">Sessions</th>
                  <th className="py-3 px-4">Orders</th>
                  <th className="py-3 px-4">Spend / Budget</th>
                  <th className="py-3 px-4">Revenue (QAR)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80">
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-xs">{c.name}</div>
                      {c.subjectLine && (
                        <div className="text-[11px] text-slate-500 truncate max-w-xs">
                          Subject: "{c.subjectLine}"
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                        {c.channel.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {c.utmSource} / {c.utmMedium} / {c.utmCampaign}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs tabular-nums">{c.sessions.toLocaleString()}</td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold tabular-nums">{c.ordersCount}</td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-600 tabular-nums">
                      {(c.spentMinorUnits / 100).toFixed(0)} / {(c.budgetMinorUnits / 100).toFixed(0)} QAR
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs font-bold text-emerald-700 tabular-nums">
                      {(c.revenueMinorUnits / 100).toLocaleString()} QAR
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => {
                          const nextStatus = c.status === 'active' ? 'paused' : 'active';
                          storeDb.saveCampaign({ ...c, status: nextStatus });
                          onRefresh();
                          notify(`Campaign "${c.name}" set to ${nextStatus}.`);
                        }}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          c.status === 'active'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {c.status}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={() => {
                          storeDb.deleteCampaign(c.id);
                          onRefresh();
                          notify(`Deleted campaign "${c.name}".`);
                        }}
                        className="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Create Campaign + UTM Builder Modal */}
        {showCampaignModal && (
          <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <h3 className="text-base font-bold text-slate-900">
                  Launch Marketing Campaign & UTM Builder
                </h3>
                <button onClick={() => setShowCampaignModal(false)} className="text-slate-400 hover:text-slate-700">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateCampaign} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Campaign Name *</label>
                    <input
                      type="text"
                      required
                      value={campaignForm.name}
                      onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })}
                      placeholder="e.g. Lusail Winter High-End Drop"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Marketing Channel</label>
                    <select
                      value={campaignForm.channel}
                      onChange={(e) =>
                        setCampaignForm({
                          ...campaignForm,
                          channel: e.target.value as MarketingCampaign['channel'],
                        })
                      }
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="email">Email Newsletter Integration</option>
                      <option value="whatsapp_vip">WhatsApp VIP Concierge</option>
                      <option value="sms_concierge">SMS Qatar Broadcast</option>
                      <option value="paid_search">Paid Search (MENA)</option>
                      <option value="social_instagram">Instagram Luxury Showcase</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">utm_source</label>
                    <input
                      type="text"
                      value={campaignForm.utmSource}
                      onChange={(e) => setCampaignForm({ ...campaignForm, utmSource: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">utm_medium</label>
                    <input
                      type="text"
                      value={campaignForm.utmMedium}
                      onChange={(e) => setCampaignForm({ ...campaignForm, utmMedium: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">utm_campaign</label>
                    <input
                      type="text"
                      value={campaignForm.utmCampaign}
                      onChange={(e) => setCampaignForm({ ...campaignForm, utmCampaign: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                </div>

                {/* Live Generated Tracking URL */}
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 uppercase">
                      Generated UTM Tracking URL
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard?.writeText(generatedUtmUrl);
                        notify('Copied UTM tracking URL to clipboard.');
                      }}
                      className="text-[11px] font-semibold text-slate-800 hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy Link
                    </button>
                  </div>
                  <div className="font-mono text-[11px] text-slate-700 break-all">{generatedUtmUrl}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Budget Allocation (QAR)</label>
                    <input
                      type="number"
                      value={campaignForm.budgetQar}
                      onChange={(e) => setCampaignForm({ ...campaignForm, budgetQar: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono"
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Target Audience Segment</label>
                    <select
                      value={campaignForm.audienceSegment}
                      onChange={(e) => setCampaignForm({ ...campaignForm, audienceSegment: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                    >
                      <option value="VIP">VIP Customers</option>
                      <option value="Returning">Returning Buyers</option>
                      <option value="All Subscribed">All Email Subscribed</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Email / Broadcast Subject Line
                  </label>
                  <input
                    type="text"
                    value={campaignForm.subjectLine}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subjectLine: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCampaignModal(false)}
                    className="px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-semibold"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold">
                    Launch Campaign
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
  // 3. SHOPIFY ANALYTICS AND LIVE VIEW DASHBOARD
  // ============================================================================
  return (
    <ShopifyAnalyticsDashboard
      orders={orders}
      products={products}
      customers={customers}
      discounts={discounts}
      notify={notify}
    />
  );
};
