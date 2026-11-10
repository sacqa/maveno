import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  LayoutDashboard,
  Package,
  Tag,
  Users,
  FileText,
  BarChart2,
  Megaphone,
  Percent,
  Store,
  ShieldCheck,
  Settings,
  Search,
  Plus,
  Bell,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ShoppingBag,
  Layers,
  Gift,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  ExternalLink,
  TrendingUp,
  UserCheck,
  Sparkles,
  Check,
  Clock,
  LogOut,
  Lock,
} from 'lucide-react';
import {
  StoreSettings,
  Country,
  Currency,
  Product,
  ImmutableOrderSnapshot,
  AgeVerificationRecord,
  UserRole,
} from '../../types/ecommerce';
import { storeDb } from '../../services/store-db';
import {
  adminAuthClient,
  AuthenticatedAdminProfile,
  AuthAuditLog,
} from '../../services/admin-auth-client';
import { ProductsAndCollectionsSection } from './sections/ProductsAndCollectionsSection';
import { OrdersAndCustomersSection } from './sections/OrdersAndCustomersSection';
import { MarketingDiscountsAnalyticsSection } from './sections/MarketingDiscountsAnalyticsSection';
import { ContentOnlineStoreSettingsSection } from './sections/ContentOnlineStoreSettingsSection';

interface AdminDashboardProps {
  isOpen: boolean;
  authenticatedAdmin: AuthenticatedAdminProfile | null;
  onClose: () => void;
  onLogout: () => void;
  settings: StoreSettings;
  countries: Country[];
  currencies: Currency[];
  products: Product[];
  orders: ImmutableOrderSnapshot[];
  verifications: AgeVerificationRecord[];
  onRefreshData: () => void;
}

type PrimaryTab =
  | 'home'
  | 'orders'
  | 'draft_orders'
  | 'products'
  | 'collections'
  | 'inventory'
  | 'gift_cards'
  | 'customers'
  | 'content'
  | 'analytics'
  | 'marketing'
  | 'discounts'
  | 'online_store'
  | 'compliance'
  | 'settings';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  isOpen,
  authenticatedAdmin,
  onClose,
  onLogout,
  settings,
  countries,
  currencies,
  products,
  orders,
  verifications,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<PrimaryTab>('home');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [authAuditLogs, setAuthAuditLogs] = useState<AuthAuditLog[]>([]);

  // Global Search (⌘K)
  const [globalSearchQuery, setGlobalSearchQuery] = useState('');
  const [showGlobalSearchDropdown, setShowGlobalSearchDropdown] = useState(false);

  // Notifications & Role Switcher Popovers
  const [showNotificationsPopover, setShowNotificationsPopover] = useState(false);
  const [showProfilePopover, setShowProfilePopover] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);

  // Dashboard Home Interactive Chart State
  const [chartMetric, setChartMetric] = useState<'revenue' | 'orders' | 'conversion'>('revenue');

  // Pull expanded entities from storeDb
  const [customers, setCustomers] = useState(() => storeDb.getCustomers());
  const [collections, setCollections] = useState(() => storeDb.getCollections());
  const [discounts, setDiscounts] = useState(() => storeDb.getDiscounts());
  const [campaigns, setCampaigns] = useState(() => storeDb.getCampaigns());
  const [giftCards, setGiftCards] = useState(() => storeDb.getGiftCards());
  const [pages, setPages] = useState(() => storeDb.getPages());
  const [blogPosts, setBlogPosts] = useState(() => storeDb.getBlogPosts());
  const [menus, setMenus] = useState(() => storeDb.getMenus());
  const [mediaAssets, setMediaAssets] = useState(() => storeDb.getMediaAssets());
  const [locations, setLocations] = useState(() => storeDb.getLocations());
  const [staffAccounts, setStaffAccounts] = useState(() => storeDb.getStaffAccounts());
  const [notifications, setNotifications] = useState(() => storeDb.getNotifications());
  const [currentRole, setCurrentRole] = useState<UserRole>(() => storeDb.getCurrentUserRole());

  const syncLocalAdminState = () => {
    setCustomers(storeDb.getCustomers());
    setCollections(storeDb.getCollections());
    setDiscounts(storeDb.getDiscounts());
    setCampaigns(storeDb.getCampaigns());
    setGiftCards(storeDb.getGiftCards());
    setPages(storeDb.getPages());
    setBlogPosts(storeDb.getBlogPosts());
    setMenus(storeDb.getMenus());
    setMediaAssets(storeDb.getMediaAssets());
    setLocations(storeDb.getLocations());
    setStaffAccounts(storeDb.getStaffAccounts());
    setNotifications(storeDb.getNotifications());
    setCurrentRole(storeDb.getCurrentUserRole());
  };

  const handleFullRefresh = () => {
    syncLocalAdminState();
    onRefreshData();
    void adminAuthClient.verifyAdminActionOnBackend('admin_state_sync');
  };

  useEffect(() => {
    if (isOpen && authenticatedAdmin) {
      syncLocalAdminState();
      adminAuthClient.fetchProtectedAdminSecurityStatus().then((status) => {
        if (status.authorized && status.auditLogs) {
          setAuthAuditLogs(status.auditLogs);
        }
      });
    }
  }, [isOpen, authenticatedAdmin]);

  // Keyboard shortcut Cmd+K / Ctrl+K for global search
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowGlobalSearchDropdown(true);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // Global search results across entities
  const globalSearchResults = useMemo(() => {
    const q = globalSearchQuery.trim().toLowerCase();
    if (!q) return [];
    const results: { type: string; label: string; sub: string; targetTab: PrimaryTab }[] = [];

    products
      .filter((p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((p) =>
        results.push({
          type: 'Product',
          label: p.name,
          sub: `SKU: ${p.sku} · ${((p.countrySpecificPrices?.['QA'] || p.basePriceMinorUnits) / 100).toFixed(2)} QAR`,
          targetTab: 'products',
        })
      );

    orders
      .filter(
        (o) =>
          o.orderNumber.toLowerCase().includes(q) ||
          o.customer.fullName.toLowerCase().includes(q)
      )
      .slice(0, 3)
      .forEach((o) =>
        results.push({
          type: o.isDraft ? 'Draft Order' : 'Order',
          label: `${o.orderNumber} — ${o.customer.fullName}`,
          sub: `${(o.financials.totalAmountMinorUnits / 100).toFixed(2)} QAR · ${o.status}`,
          targetTab: o.isDraft ? 'draft_orders' : 'orders',
        })
      );

    customers
      .filter((c) => c.fullName.toLowerCase().includes(q) || c.email.toLowerCase().includes(q))
      .slice(0, 3)
      .forEach((c) =>
        results.push({
          type: 'Customer',
          label: c.fullName,
          sub: `${c.email} · ${c.segment}`,
          targetTab: 'customers',
        })
      );

    discounts
      .filter((d) => d.code.toLowerCase().includes(q) || d.title.toLowerCase().includes(q))
      .slice(0, 2)
      .forEach((d) =>
        results.push({
          type: 'Discount',
          label: d.code,
          sub: d.title,
          targetTab: 'discounts',
        })
      );

    return results;
  }, [globalSearchQuery, products, orders, customers, discounts]);

  if (!isOpen || !authenticatedAdmin) return null;

  const notify = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const baseCurrency = currencies.find((c) => c.code === 'QAR') || currencies[0];
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // --- Home Dashboard Metrics ---
  const completedOrders = orders.filter((o) => !o.isDraft && o.status !== 'cancelled');
  const totalSalesMinor = completedOrders.reduce(
    (acc, o) => acc + o.financials.totalAmountMinorUnits,
    0
  );
  const totalRefundedMinor = orders.reduce(
    (acc, o) => acc + (o.refundedAmountMinorUnits || 0),
    0
  );
  const netRevenueMinor = Math.max(0, totalSalesMinor - totalRefundedMinor);
  const unfulfilledOrdersCount = orders.filter(
    (o) => !o.isDraft && (o.status === 'paid' || o.status === 'processing' || o.status === 'awaiting_payment')
  ).length;

  // Low stock items (threshold <= 8 units)
  const lowStockVariants = products.flatMap((p) =>
    p.variants
      .filter((v) => v.stockQuantity <= 8)
      .map((v) => ({
        productId: p.id,
        productName: p.name,
        variantTitle: v.title,
        sku: v.sku,
        stock: v.stockQuantity,
        image: p.galleryImages[0],
      }))
  );

  // Sidebar Navigation Structure
  const navGroups = [
    {
      id: 'home' as PrimaryTab,
      label: 'Home',
      icon: LayoutDashboard,
    },
    {
      id: 'orders' as PrimaryTab,
      label: 'Orders',
      icon: ShoppingBag,
      badge: unfulfilledOrdersCount > 0 ? unfulfilledOrdersCount.toString() : undefined,
      children: [
        { id: 'orders' as PrimaryTab, label: 'All Orders' },
        { id: 'draft_orders' as PrimaryTab, label: 'Draft Orders' },
      ],
    },
    {
      id: 'products' as PrimaryTab,
      label: 'Products',
      icon: Package,
      children: [
        { id: 'products' as PrimaryTab, label: 'All Products' },
        { id: 'collections' as PrimaryTab, label: 'Collections' },
        { id: 'inventory' as PrimaryTab, label: 'Inventory & Hubs' },
        { id: 'gift_cards' as PrimaryTab, label: 'Gift Cards' },
      ],
    },
    {
      id: 'customers' as PrimaryTab,
      label: 'Customers',
      icon: Users,
    },
    {
      id: 'content' as PrimaryTab,
      label: 'Content',
      icon: FileText,
    },
    {
      id: 'analytics' as PrimaryTab,
      label: 'Analytics',
      icon: BarChart2,
    },
    {
      id: 'marketing' as PrimaryTab,
      label: 'Marketing',
      icon: Megaphone,
    },
    {
      id: 'discounts' as PrimaryTab,
      label: 'Discounts',
      icon: Percent,
    },
    {
      id: 'online_store' as PrimaryTab,
      label: 'Online Store',
      icon: Store,
    },
    {
      id: 'compliance' as PrimaryTab,
      label: 'Qatar QID Compliance',
      icon: ShieldCheck,
    },
    {
      id: 'settings' as PrimaryTab,
      label: 'Settings',
      icon: Settings,
    },
  ];

  const getBreadcrumbLabel = (tab: PrimaryTab): { section: string; sub?: string } => {
    switch (tab) {
      case 'home':
        return { section: 'Dashboard', sub: 'Executive Overview' };
      case 'orders':
        return { section: 'Orders', sub: 'All Orders & Fulfillment' };
      case 'draft_orders':
        return { section: 'Orders', sub: 'Draft Orders & Quotes' };
      case 'products':
        return { section: 'Products', sub: 'Catalog & Variants' };
      case 'collections':
        return { section: 'Products', sub: 'Manual & Automated Collections' };
      case 'inventory':
        return { section: 'Products', sub: 'Multi-Location Inventory & Transfers' };
      case 'gift_cards':
        return { section: 'Products', sub: 'Gift Cards & Vouchers' };
      case 'customers':
        return { section: 'Customers', sub: 'CRM, Segments & Duplicate Merge' };
      case 'content':
        return { section: 'Content', sub: 'Pages, Blogs, Menus & Media' };
      case 'analytics':
        return { section: 'Analytics', sub: 'Financial & Conversion Reports' };
      case 'marketing':
        return { section: 'Marketing', sub: 'Campaigns & UTM Builder' };
      case 'discounts':
        return { section: 'Discounts', sub: 'Codes & Automatic Rules' };
      case 'online_store':
        return { section: 'Online Store', sub: 'Theme, Homepage & Branding' };
      case 'compliance':
        return { section: 'Compliance', sub: 'Qatar MOPH 21+ Verification Vault' };
      case 'settings':
        return { section: 'Settings', sub: '15-Category Store Configuration' };
    }
  };

  const breadcrumb = getBreadcrumbLabel(activeTab);

  return (
    <div className="fixed inset-0 z-50 bg-[#f1f2f4] flex flex-col font-sans text-slate-900 overflow-hidden">
      {/* ====================================================================
          SHOPIFY TOP DARK HEADER BAR
         ==================================================================== */}
      <header className="h-14 bg-[#1a1a1a] text-white px-4 flex items-center justify-between shrink-0 border-b border-white/10 z-30">
        {/* Left: Brand & Store Switcher */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black text-sm flex items-center justify-center shadow-xs">
            AQ
          </div>
          <div className="hidden sm:block">
            <div className="text-xs font-bold tracking-tight flex items-center gap-1.5">
              <span>{settings.storeName}</span>
              <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                QATAR · QAR
              </span>
            </div>
            <div className="text-[10px] text-slate-400">Shopify Plus Admin Replica</div>
          </div>
        </div>

        {/* Center: Global Search (⌘K) */}
        <div className="relative flex-1 max-w-md mx-4">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={globalSearchQuery}
              onFocus={() => setShowGlobalSearchDropdown(true)}
              onChange={(e) => {
                setGlobalSearchQuery(e.target.value);
                setShowGlobalSearchDropdown(true);
              }}
              placeholder="Search orders, products, customers, discounts... (⌘K)"
              className="w-full bg-[#2a2a2a] hover:bg-[#333333] focus:bg-white focus:text-slate-900 text-white placeholder-slate-400 pl-9 pr-12 py-1.5 rounded-lg text-xs border border-white/10 focus:outline-none transition-colors"
            />
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono text-slate-400 bg-black/30 px-1.5 py-0.5 rounded">
              ⌘K
            </span>
          </div>

          {showGlobalSearchDropdown && globalSearchQuery.trim() && (
            <div className="absolute left-0 right-0 top-10 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-[10px] font-bold text-slate-500 uppercase">
                <span>Global Search Results ({globalSearchResults.length})</span>
                <button onClick={() => setShowGlobalSearchDropdown(false)} className="text-slate-400 hover:text-slate-700">
                  ESC
                </button>
              </div>
              {globalSearchResults.length === 0 ? (
                <div className="p-4 text-xs text-slate-500 text-center">
                  No matching records found for "{globalSearchQuery}".
                </div>
              ) : (
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {globalSearchResults.map((res, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        setActiveTab(res.targetTab);
                        setShowGlobalSearchDropdown(false);
                        setGlobalSearchQuery('');
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-slate-50 flex items-center justify-between text-xs"
                    >
                      <div>
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase mr-2">
                          {res.type}
                        </span>
                        <span className="font-bold text-slate-900">{res.label}</span>
                        <div className="text-[11px] text-slate-500 mt-0.5">{res.sub}</div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Notifications, Role Switcher, View Live Storefront */}
        <div className="flex items-center gap-2">
          {/* Notification Bell */}
          <div className="relative">
            <button
              onClick={() => {
                setShowNotificationsPopover(!showNotificationsPopover);
                setShowProfilePopover(false);
              }}
              className="p-2 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] text-slate-200 relative"
              title="Notifications"
            >
              <Bell className="w-4 h-4" />
              {unreadNotificationsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center absolute -top-1 -right-1">
                  {unreadNotificationsCount}
                </span>
              )}
            </button>

            {showNotificationsPopover && (
              <div className="absolute right-0 top-11 w-80 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">Admin Alerts</span>
                  <button
                    onClick={() => {
                      storeDb.markAllNotificationsRead();
                      handleFullRefresh();
                    }}
                    className="text-[11px] text-emerald-700 font-semibold hover:underline"
                  >
                    Mark all read
                  </button>
                </div>
                <div className="divide-y divide-slate-100 max-h-72 overflow-y-auto">
                  {notifications.map((n) => (
                    <button
                      key={n.id}
                      onClick={() => {
                        storeDb.markNotificationRead(n.id);
                        if (n.targetTab) setActiveTab(n.targetTab as PrimaryTab);
                        setShowNotificationsPopover(false);
                        handleFullRefresh();
                      }}
                      className={`w-full p-3 text-left hover:bg-slate-50 text-xs ${
                        !n.read ? 'bg-amber-50/40' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{n.title}</span>
                        {!n.read && <span className="w-2 h-2 rounded-full bg-emerald-600" />}
                      </div>
                      <p className="text-slate-600 text-[11px] mt-0.5">{n.message}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Profile & Role Switcher */}
          <div className="relative">
            <button
              onClick={() => {
                setShowProfilePopover(!showProfilePopover);
                setShowNotificationsPopover(false);
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#2a2a2a] hover:bg-[#333333] text-xs font-semibold flex items-center gap-2"
            >
              <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px] flex items-center justify-center uppercase">
                {authenticatedAdmin.username.slice(0, 2)}
              </span>
              <span className="hidden md:inline">{authenticatedAdmin.username}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {showProfilePopover && (
              <div className="absolute right-0 top-11 w-64 bg-white text-slate-900 rounded-xl shadow-2xl border border-slate-200 p-3 space-y-2 z-50 text-xs">
                <div className="pb-2 border-b border-slate-100">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <span>{authenticatedAdmin.username}</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase">
                      Verified
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">{authenticatedAdmin.email}</div>
                </div>
                <div className="text-[10px] font-bold text-slate-400 uppercase">Switch Active RBAC Role</div>
                {(
                  [
                    'super_admin',
                    'administrator',
                    'product_manager',
                    'order_manager',
                    'content_manager',
                    'compliance_manager',
                  ] as UserRole[]
                ).map((r) => (
                  <button
                    key={r}
                    onClick={() => {
                      storeDb.setCurrentUserRole(r);
                      setCurrentRole(r);
                      setShowProfilePopover(false);
                      notify(`Switched active session role to ${r.toUpperCase()}.`);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg text-left font-semibold capitalize flex items-center justify-between ${
                      currentRole === r ? 'bg-slate-900 text-white' : 'hover:bg-slate-100 text-slate-700'
                    }`}
                  >
                    <span>{r.replace('_', ' ')}</span>
                    {currentRole === r && <Check className="w-3.5 h-3.5" />}
                  </button>
                ))}
                <div className="pt-2 border-t border-slate-100 space-y-1">
                  <button
                    onClick={() => {
                      setShowProfilePopover(false);
                      setShowResetConfirmModal(true);
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-slate-700 hover:bg-slate-100 font-semibold flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" /> Reset Demo Database
                  </button>
                  <button
                    onClick={() => {
                      setShowProfilePopover(false);
                      onLogout();
                    }}
                    className="w-full px-2.5 py-1.5 rounded-lg text-left text-rose-600 hover:bg-rose-50 font-bold flex items-center gap-1.5"
                  >
                    <LogOut className="w-3.5 h-3.5" /> Sign Out of Admin
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Logout Button in Top Bar */}
          <button
            onClick={onLogout}
            title="Sign out of Admin Console"
            className="px-3 py-1.5 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 border border-rose-500/30 text-rose-200 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </button>

          {/* Exit to Live Storefront */}
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Live Storefront</span>
          </button>
        </div>
      </header>

      {/* ====================================================================
          MAIN BODY: COLLAPSIBLE LEFT SIDEBAR + WORKSPACE
         ==================================================================== */}
      <div className="flex-1 flex overflow-hidden">
        {/* Collapsible Left Sidebar */}
        <aside
          className={`${
            sidebarCollapsed ? 'w-16' : 'w-60'
          } bg-[#ebebeb] border-r border-slate-300/80 flex flex-col justify-between shrink-0 transition-all duration-200 overflow-y-auto`}
        >
          <nav className="p-2.5 space-y-1">
            {navGroups.map((group) => {
              const Icon = group.icon;
              const isGroupActive =
                activeTab === group.id ||
                group.children?.some((child) => child.id === activeTab);

              return (
                <div key={group.id} className="space-y-0.5">
                  <button
                    onClick={() => setActiveTab(group.id)}
                    title={group.label}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                      isGroupActive
                        ? 'bg-white text-slate-950 shadow-2xs font-bold'
                        : 'text-slate-700 hover:bg-black/5'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <Icon className="w-4 h-4 shrink-0 text-slate-700" />
                      {!sidebarCollapsed && <span className="truncate">{group.label}</span>}
                    </div>
                    {!sidebarCollapsed && group.badge && (
                      <span className="px-1.5 py-0.5 rounded-full bg-slate-900 text-white text-[10px] font-mono">
                        {group.badge}
                      </span>
                    )}
                  </button>

                  {/* Sub-items when group is active & sidebar expanded */}
                  {!sidebarCollapsed && group.children && isGroupActive && (
                    <div className="pl-8 pr-1 py-0.5 space-y-0.5">
                      {group.children.map((sub) => (
                        <button
                          key={sub.id}
                          onClick={() => setActiveTab(sub.id)}
                          className={`w-full text-left px-2.5 py-1.5 rounded-md text-xs transition-colors ${
                            activeTab === sub.id
                              ? 'bg-slate-900 text-white font-semibold'
                              : 'text-slate-600 hover:text-slate-950 hover:bg-black/5'
                          }`}
                        >
                          {sub.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Collapse Toggle Footer */}
          <div className="p-2.5 border-t border-slate-300/70">
            <button
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-black/5"
              title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            >
              {sidebarCollapsed ? (
                <ChevronRight className="w-4 h-4" />
              ) : (
                <>
                  <ChevronLeft className="w-4 h-4" />
                  <span>Collapse Sidebar</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Main Workspace Scroll Container */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Breadcrumb Bar + Quick Role Pill */}
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-500">
              <button onClick={() => setActiveTab('home')} className="hover:text-slate-900 font-semibold">
                {settings.storeName}
              </button>
              <ChevronRight className="w-3.5 h-3.5" />
              <span className="font-bold text-slate-900">{breadcrumb.section}</span>
              {breadcrumb.sub && (
                <>
                  <ChevronRight className="w-3.5 h-3.5" />
                  <span className="text-slate-600">{breadcrumb.sub}</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-1 rounded-full bg-white border border-slate-200 text-[11px] font-semibold text-slate-700">
                Active Role: <strong className="uppercase">{currentRole.replace('_', ' ')}</strong>
              </span>
            </div>
          </div>

          <div className="max-w-7xl mx-auto">
            {/* ==============================================================
                1. HOME DASHBOARD
               ============================================================== */}
            {activeTab === 'home' && (
              <div className="space-y-6">
                {/* Welcome & Quick Action Banner */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-slate-900">
                      Qatar Operations Command Center
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Real-time sales analytics, Doha warehouse stock alerts, customer activity, and MOPH 21+ compliance metrics.
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={() => setActiveTab('products')}
                      className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" /> Add Product
                    </button>
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <ShoppingBag className="w-3.5 h-3.5" /> Create Order
                    </button>
                    <button
                      onClick={() => setActiveTab('discounts')}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Percent className="w-3.5 h-3.5" /> Create Discount
                    </button>
                    <button
                      onClick={() => setActiveTab('online_store')}
                      className="px-3.5 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-800 text-xs font-semibold flex items-center gap-1.5"
                    >
                      <Store className="w-3.5 h-3.5" /> Customize Homepage
                    </button>
                  </div>
                </div>

                {/* Primary KPI Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Total Sales (Gross)</div>
                    <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                      {(totalSalesMinor / 100).toLocaleString()} QAR
                    </div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-1">+18.4% vs last month</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Net Revenue</div>
                    <div className="text-xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                      {(netRevenueMinor / 100).toLocaleString()} QAR
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">After refunds & discounts</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Total Orders</div>
                    <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                      {completedOrders.length}
                    </div>
                    <div className="text-[11px] text-amber-700 font-semibold mt-1">
                      {unfulfilledOrdersCount} awaiting fulfillment
                    </div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Verified Customers</div>
                    <div className="text-xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                      {customers.length}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">100% QID 21+ Verified</div>
                  </div>
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <div className="text-[11px] font-bold text-slate-400 uppercase">Conversion Rate</div>
                    <div className="text-xl font-bold text-sky-700 font-mono tabular-nums mt-1">4.12%</div>
                    <div className="text-[11px] text-emerald-600 font-semibold mt-1">Top 5% MENA Luxury</div>
                  </div>
                </div>

                {/* Interactive Sales Analytics Chart + Low Stock Alerts */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Interactive Chart */}
                  <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          Interactive Sales Performance & Conversion Trend
                        </h3>
                        <p className="text-xs text-slate-500">
                          Doha & Lusail daily settlement velocity (QAR)
                        </p>
                      </div>
                      <div className="flex items-center bg-slate-100 p-1 rounded-lg text-xs">
                        {(
                          [
                            { id: 'revenue', label: 'Revenue (QAR)' },
                            { id: 'orders', label: 'Order Volume' },
                            { id: 'conversion', label: 'Conversion %' },
                          ] as const
                        ).map((m) => (
                          <button
                            key={m.id}
                            onClick={() => setChartMetric(m.id)}
                            className={`px-2.5 py-1 rounded-md font-semibold ${
                              chartMetric === m.id ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                            }`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Visual Bar Chart */}
                    <div className="h-52 pt-6 flex items-end gap-3 border-b border-slate-200 pb-2">
                      {[
                        { day: 'Mon', rev: 4200, ord: 4, conv: 3.4, pct: 52 },
                        { day: 'Tue', rev: 5800, ord: 6, conv: 3.8, pct: 68 },
                        { day: 'Wed', rev: 4900, ord: 5, conv: 3.6, pct: 58 },
                        { day: 'Thu', rev: 8400, ord: 9, conv: 4.7, pct: 95 },
                        { day: 'Fri', rev: 7600, ord: 8, conv: 4.4, pct: 86 },
                        { day: 'Sat', rev: 8900, ord: 10, conv: 4.9, pct: 100 },
                        { day: 'Sun', rev: 6500, ord: 7, conv: 4.1, pct: 74 },
                      ].map((bar) => (
                        <div key={bar.day} className="flex-1 flex flex-col items-center gap-2 group">
                          <div className="text-[10px] font-mono font-bold text-slate-700 tabular-nums">
                            {chartMetric === 'revenue' && `${bar.rev} QAR`}
                            {chartMetric === 'orders' && `${bar.ord} ord`}
                            {chartMetric === 'conversion' && `${bar.conv}%`}
                          </div>
                          <div className="w-full bg-slate-100 rounded-t-lg h-36 flex items-end overflow-hidden">
                            <div
                              className="w-full bg-slate-900 group-hover:bg-emerald-600 transition-all rounded-t-lg"
                              style={{ height: `${bar.pct}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-500">{bar.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Low-Stock Alerts Widget */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-600" /> Low-Stock Warehouse Alerts
                        </h3>
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold">
                          {lowStockVariants.length}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500">
                        SKUs in Doha Pearl Hub approaching minimum safety stock (&le; 8 units):
                      </p>
                      <div className="divide-y divide-slate-100 max-h-48 overflow-y-auto">
                        {lowStockVariants.map((item, i) => (
                          <div key={i} className="py-2.5 flex items-center justify-between text-xs">
                            <div className="min-w-0 pr-2">
                              <div className="font-bold text-slate-900 truncate">{item.productName}</div>
                              <div className="text-[11px] text-slate-500 font-mono">{item.sku}</div>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded font-mono font-bold shrink-0 ${
                                item.stock <= 5
                                  ? 'bg-rose-100 text-rose-800'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {item.stock} left
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => setActiveTab('inventory')}
                      className="w-full py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold"
                    >
                      Manage Inventory & Restock
                    </button>
                  </div>
                </div>

                {/* Top Selling Products & Recent Orders / Activity */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Top-Selling Products */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Top-Selling Products (Qatar)</h3>
                      <button
                        onClick={() => setActiveTab('products')}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        View Catalog &rarr;
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {products.slice(0, 5).map((p) => {
                        const qaPrice = p.countrySpecificPrices?.['QA'] || p.basePriceMinorUnits;
                        const totalStock = p.variants.reduce((acc, v) => acc + v.stockQuantity, 0);
                        return (
                          <div key={p.id} className="py-3 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-3 min-w-0">
                              <img
                                src={p.galleryImages[0]}
                                alt={p.name}
                                className="w-10 h-10 rounded-lg object-cover bg-slate-100 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate">{p.name}</div>
                                <div className="text-slate-500">
                                  {p.brand} · Stock: {totalStock} units
                                </div>
                              </div>
                            </div>
                            <div className="font-mono font-bold text-slate-900 tabular-nums shrink-0">
                              {(qaPrice / 100).toFixed(2)} QAR
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Orders & Customer Activity */}
                  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Recent Orders & Customer Activity</h3>
                      <button
                        onClick={() => setActiveTab('orders')}
                        className="text-xs font-semibold text-emerald-700 hover:underline"
                      >
                        All Orders &rarr;
                      </button>
                    </div>
                    <div className="divide-y divide-slate-100">
                      {orders.slice(0, 5).map((o) => (
                        <div key={o.orderId} className="py-3 flex items-center justify-between text-xs">
                          <div>
                            <div className="font-bold text-slate-900 font-mono">
                              {o.orderNumber}{' '}
                              <span className="font-sans font-normal text-slate-600">
                                — {o.customer.fullName}
                              </span>
                            </div>
                            <div className="text-slate-500">
                              {o.shippingAddress.municipality || o.shippingAddress.city} ·{' '}
                              {new Date(o.orderDate).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-mono font-bold text-slate-900 tabular-nums">
                              {(o.financials.totalAmountMinorUnits / 100).toFixed(2)} QAR
                            </div>
                            <span className="inline-block px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold uppercase">
                              {o.isDraft ? 'DRAFT' : o.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ==============================================================
                2. PRODUCTS, COLLECTIONS, INVENTORY & GIFT CARDS
               ============================================================== */}
            {(activeTab === 'products' ||
              activeTab === 'collections' ||
              activeTab === 'inventory' ||
              activeTab === 'gift_cards') && (
              <ProductsAndCollectionsSection
                subView={activeTab}
                setSubView={(v) => setActiveTab(v)}
                products={products}
                baseCurrency={baseCurrency}
                onRefreshData={handleFullRefresh}
                triggerToast={notify}
              />
            )}

            {/* ==============================================================
                3. ORDERS, DRAFT ORDERS & CUSTOMERS
               ============================================================== */}
            {(activeTab === 'orders' ||
              activeTab === 'draft_orders' ||
              activeTab === 'customers') && (
              <OrdersAndCustomersSection
                mode={activeTab}
                orders={orders}
                customers={customers}
                products={products}
                discounts={discounts}
                settings={settings}
                onRefresh={handleFullRefresh}
                notify={notify}
              />
            )}

            {/* ==============================================================
                4. DISCOUNTS, MARKETING & ANALYTICS
               ============================================================== */}
            {(activeTab === 'discounts' ||
              activeTab === 'marketing' ||
              activeTab === 'analytics') && (
              <MarketingDiscountsAnalyticsSection
                mode={activeTab}
                discounts={discounts}
                campaigns={campaigns}
                orders={orders}
                products={products}
                customers={customers}
                onRefresh={handleFullRefresh}
                notify={notify}
              />
            )}

            {/* ==============================================================
                5. CONTENT, ONLINE STORE & 15-CATEGORY SETTINGS
               ============================================================== */}
            {(activeTab === 'content' ||
              activeTab === 'online_store' ||
              activeTab === 'settings') && (
              <ContentOnlineStoreSettingsSection
                mode={activeTab}
                pages={pages}
                blogPosts={blogPosts}
                menus={menus}
                mediaAssets={mediaAssets}
                settings={settings}
                currencies={currencies}
                countries={countries}
                locations={locations}
                staffAccounts={staffAccounts}
                currentRole={currentRole}
                onRoleChange={(r) => {
                  storeDb.setCurrentUserRole(r);
                  setCurrentRole(r);
                }}
                onRefresh={handleFullRefresh}
                onStoreUpdated={onRefreshData}
                notify={notify}
              />
            )}

            {/* ==============================================================
                6. QATAR QID COMPLIANCE VAULT
               ============================================================== */}
            {activeTab === 'compliance' && (
              <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">
                      Qatar MOPH 21+ Age Verification & Cryptographic Audit Vault
                    </h2>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Immutable SHA-256 verification ledger for Qatar National ID (QID) & passport checks prior to order dispatch.
                    </p>
                  </div>
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
                    {verifications.length} Verified Logs
                  </span>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-3 px-4">Customer</th>
                          <th className="py-3 px-4">Verified Age</th>
                          <th className="py-3 px-4">Provider</th>
                          <th className="py-3 px-4">QID / Reference</th>
                          <th className="py-3 px-4">Audit Hash</th>
                          <th className="py-3 px-4">Timestamp</th>
                          <th className="py-3 px-4">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {verifications.map((v) => (
                          <tr key={v.id} className="hover:bg-slate-50">
                            <td className="py-3.5 px-4">
                              <div className="font-bold text-slate-900">{v.customerName}</div>
                              <div className="text-slate-500">{v.customerEmail}</div>
                            </td>
                            <td className="py-3.5 px-4 font-mono font-bold">{v.verifiedAge} yrs</td>
                            <td className="py-3.5 px-4">{v.provider}</td>
                            <td className="py-3.5 px-4 font-mono">{v.providerReference}</td>
                            <td className="py-3.5 px-4 font-mono text-slate-500">{v.complianceAuditHash}</td>
                            <td className="py-3.5 px-4 text-slate-500">
                              {new Date(v.timestamp).toLocaleString()}
                            </td>
                            <td className="py-3.5 px-4">
                              <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold uppercase">
                                {v.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Backend Authentication & Access Security Audit Log */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="p-4 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-emerald-700" />
                      <h3 className="text-sm font-bold text-slate-900">
                        Backend Admin Authentication &amp; API Access Audit Log
                      </h3>
                    </div>
                    <span className="text-xs font-mono text-slate-500">
                      scrypt + HMAC-SHA256 · Public Registration Disabled
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                          <th className="py-2.5 px-4">Event</th>
                          <th className="py-2.5 px-4">Actor</th>
                          <th className="py-2.5 px-4">IP Address</th>
                          <th className="py-2.5 px-4">Details</th>
                          <th className="py-2.5 px-4">Timestamp</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-xs">
                        {authAuditLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-slate-50">
                            <td className="py-2.5 px-4 font-mono font-bold text-slate-900">
                              {log.event}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-slate-700">{log.actor}</td>
                            <td className="py-2.5 px-4 font-mono text-slate-500">{log.ipAddress}</td>
                            <td className="py-2.5 px-4 text-slate-600">{log.details}</td>
                            <td className="py-2.5 px-4 text-slate-400">
                              {new Date(log.timestamp).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Custom Reset Confirmation Modal (Zero window.confirm) */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-200 max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-base font-bold text-slate-900">Reset Qatar Store Database?</h3>
            <p className="text-xs text-slate-600">
              This will restore all products, inventory locations, orders, customers, discounts, and settings to the clean initial Qatar seed state.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowResetConfirmModal(false)}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  storeDb.resetToDefaults();
                  handleFullRefresh();
                  setShowResetConfirmModal(false);
                  notify('Database restored to initial Qatar defaults.');
                }}
                className="px-4 py-2 rounded-lg bg-rose-600 text-white text-xs font-semibold"
              >
                Confirm Reset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-white/10 flex items-center gap-2.5 text-xs font-semibold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
