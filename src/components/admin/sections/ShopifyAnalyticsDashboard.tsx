import React, { useState, useEffect, useMemo } from 'react';
import {
  Download,
  Calendar,
  TrendingUp,
  TrendingDown,
  Globe,
  Users,
  ShoppingBag,
  ShoppingCart,
  CreditCard,
  CheckCircle2,
  Monitor,
  Smartphone,
  Tablet,
  ArrowUpRight,
  BarChart2,
  Activity,
  Package,
  Filter,
  RefreshCw,
  MapPin,
  Layers,
} from 'lucide-react';
import {
  ImmutableOrderSnapshot,
  Product,
  CustomerRecord,
  DiscountRule,
} from '../../../types/ecommerce';
import {
  analyticsTracker,
  LiveAnalyticsSnapshot,
  resolveGeoForCountry,
} from '../../../services/analytics-tracker';
import { calculateProfitAndMargin } from '../../../utils/commerce-engine';

interface ShopifyAnalyticsDashboardProps {
  orders: ImmutableOrderSnapshot[];
  products: Product[];
  customers: CustomerRecord[];
  discounts: DiscountRule[];
  notify: (msg: string) => void;
}

type DateFilterPreset = 'today' | '7d' | '30d' | '90d' | 'custom';
type ChartMetricKey = 'total_sales' | 'net_revenue' | 'orders' | 'sessions' | 'aov';
type DashboardSubTab = 'all' | 'live_view' | 'reports';
type MapRegionZoom = 'world' | 'gcc' | 'europe' | 'americas' | 'apac';

// Convert lat/lng (-90..90, -180..180) into 800x400 SVG equirectangular coordinates
function projectLatLngToSvg(lat: number, lng: number): { x: number; y: number } {
  const clampedLat = Math.max(-75, Math.min(80, lat));
  const clampedLng = Math.max(-180, Math.min(180, lng));
  const x = ((clampedLng + 180) / 360) * 800;
  const y = ((90 - clampedLat) / 180) * 400;
  return { x: Math.round(x * 10) / 10, y: Math.round(y * 10) / 10 };
}

function formatPctDelta(current: number, previous: number): {
  label: string;
  isPositive: boolean;
  isNeutral: boolean;
} {
  if (previous === 0 && current === 0) {
    return { label: '0.0%', isPositive: true, isNeutral: true };
  }
  if (previous === 0) {
    return { label: '+100.0%', isPositive: true, isNeutral: false };
  }
  const diffPct = ((current - previous) / previous) * 100;
  const sign = diffPct > 0 ? '+' : '';
  return {
    label: `${sign}${diffPct.toFixed(1)}%`,
    isPositive: diffPct >= 0,
    isNeutral: Math.abs(diffPct) < 0.05,
  };
}

export const ShopifyAnalyticsDashboard: React.FC<ShopifyAnalyticsDashboardProps> = ({
  orders,
  products,
  customers,
  discounts,
  notify,
}) => {
  // --- Navigation & Filter States ---
  const [subTab, setSubTab] = useState<DashboardSubTab>('all');
  const [datePreset, setDatePreset] = useState<DateFilterPreset>('30d');
  const [comparePrevious, setComparePrevious] = useState<boolean>(true);
  const [customStart, setCustomStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split('T')[0];
  });
  const [customEnd, setCustomEnd] = useState<string>(() => {
    return new Date().toISOString().split('T')[0];
  });

  // --- Interactive Chart States ---
  const [selectedChartMetric, setSelectedChartMetric] = useState<ChartMetricKey>('total_sales');
  const [chartStyle, setChartStyle] = useState<'area' | 'bar'>('area');
  const [hoveredBucketIdx, setHoveredBucketIdx] = useState<number | null>(null);

  // --- Interactive World Map States ---
  const [mapRegion, setMapRegion] = useState<MapRegionZoom>('world');
  const [selectedLocationCode, setSelectedLocationCode] = useState<string | null>(null);

  // --- Real-Time Live Snapshot State (SSE + Storefront Tracking) ---
  const [liveSnapshot, setLiveSnapshot] = useState<LiveAnalyticsSnapshot>(() =>
    analyticsTracker.getCombinedSnapshot(orders)
  );
  const [sseConnected, setSseConnected] = useState<boolean>(true);

  useEffect(() => {
    setLiveSnapshot(analyticsTracker.getCombinedSnapshot(orders));
    const unsubscribe = analyticsTracker.subscribe(() => {
      setLiveSnapshot(analyticsTracker.getCombinedSnapshot(orders));
      setSseConnected(true);
    });
    return () => unsubscribe();
  }, [orders]);

  // --- Compute Current & Previous Period Date Windows ---
  const dateWindows = useMemo(() => {
    const now = new Date();
    let endMs = now.getTime();
    let startMs = endMs - 30 * 24 * 60 * 60 * 1000;
    let bucketMode: 'hour' | 'day' = 'day';
    let label = 'Last 30 days';

    if (datePreset === 'today') {
      const startOfDay = new Date(now);
      startOfDay.setHours(0, 0, 0, 0);
      startMs = startOfDay.getTime();
      bucketMode = 'hour';
      label = 'Today';
    } else if (datePreset === '7d') {
      startMs = endMs - 7 * 24 * 60 * 60 * 1000;
      bucketMode = 'day';
      label = 'Last 7 days';
    } else if (datePreset === '30d') {
      startMs = endMs - 30 * 24 * 60 * 60 * 1000;
      bucketMode = 'day';
      label = 'Last 30 days';
    } else if (datePreset === '90d') {
      startMs = endMs - 90 * 24 * 60 * 60 * 1000;
      bucketMode = 'day';
      label = 'Last 90 days';
    } else if (datePreset === 'custom') {
      const parsedStart = new Date(`${customStart}T00:00:00`).getTime();
      const parsedEnd = new Date(`${customEnd}T23:59:59`).getTime();
      if (Number.isFinite(parsedStart) && Number.isFinite(parsedEnd) && parsedEnd >= parsedStart) {
        startMs = parsedStart;
        endMs = parsedEnd;
      }
      const diffDays = (endMs - startMs) / (24 * 60 * 60 * 1000);
      bucketMode = diffDays <= 1.5 ? 'hour' : 'day';
      label = `${customStart} to ${customEnd}`;
    }

    const durationMs = Math.max(60 * 60 * 1000, endMs - startMs);
    const prevEndMs = startMs - 1;
    const prevStartMs = prevEndMs - durationMs;

    return {
      startMs,
      endMs,
      prevStartMs,
      prevEndMs,
      durationMs,
      bucketMode,
      label,
    };
  }, [datePreset, customStart, customEnd]);

  // --- Filter Real Orders & Sessions for Current and Previous Periods ---
  const analyticsData = useMemo(() => {
    const validOrders = orders.filter((o) => !o.isDraft && o.status !== 'cancelled');
    const allSessions = liveSnapshot.sessions;

    const currentOrders = validOrders.filter((o) => {
      const t = new Date(o.orderDate).getTime();
      return t >= dateWindows.startMs && t <= dateWindows.endMs;
    });

    const previousOrders = validOrders.filter((o) => {
      const t = new Date(o.orderDate).getTime();
      return t >= dateWindows.prevStartMs && t <= dateWindows.prevEndMs;
    });

    const currentSessions = allSessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= dateWindows.startMs && t <= dateWindows.endMs;
    });

    const previousSessions = allSessions.filter((s) => {
      const t = new Date(s.startedAt).getTime();
      return t >= dateWindows.prevStartMs && t <= dateWindows.prevEndMs;
    });

    // Helper to compute period KPIs
    const computeMetrics = (
      periodOrders: ImmutableOrderSnapshot[],
      periodSessions: typeof allSessions
    ) => {
      const totalSalesMinor = periodOrders.reduce(
        (acc, o) => acc + o.financials.totalAmountMinorUnits,
        0
      );
      const refundsMinor = periodOrders.reduce(
        (acc, o) => acc + (o.refundedAmountMinorUnits || 0),
        0
      );
      const discountsMinor = periodOrders.reduce(
        (acc, o) => acc + o.financials.discountMinorUnits,
        0
      );
      const netRevenueMinor = Math.max(0, totalSalesMinor - refundsMinor - discountsMinor);
      const ordersCount = periodOrders.length;
      const aovMinor = ordersCount > 0 ? Math.round(totalSalesMinor / ordersCount) : 0;

      // Sessions & Unique Visitors
      const totalSessionsCount = Math.max(periodSessions.length, ordersCount);
      const uniqueVisitorSet = new Set<string>(periodSessions.map((s) => s.visitorId));
      periodOrders.forEach((o) => uniqueVisitorSet.add(`cust_${o.customer.email.toLowerCase()}`));
      const uniqueVisitorsCount = uniqueVisitorSet.size;

      // Funnel steps
      const productViewsCount = periodSessions.filter(
        (s) => s.viewedProductIds.length > 0 || s.addedToCart || s.completedPurchase
      ).length;
      const addedToCartCount = Math.max(
        periodSessions.filter((s) => s.addedToCart || s.completedPurchase).length,
        ordersCount
      );
      const reachedCheckoutCount = Math.max(
        periodSessions.filter((s) => s.reachedCheckout || s.completedPurchase).length,
        ordersCount
      );
      const convertedSessionsCount = ordersCount;

      const conversionRate =
        totalSessionsCount > 0
          ? Math.min(100, (convertedSessionsCount / totalSessionsCount) * 100)
          : 0;

      // Customers & Returning Customers
      const customerEmailsInPeriod = new Set<string>(
        periodOrders.map((o) => o.customer.email.toLowerCase())
      );
      const totalCustomersInPeriod = customerEmailsInPeriod.size;

      // A customer is returning if they have >1 total valid order in the store or segment === 'Returning' / 'VIP'
      let returningCustomersCount = 0;
      customerEmailsInPeriod.forEach((email) => {
        const lifetimeOrdersForEmail = validOrders.filter(
          (o) => o.customer.email.toLowerCase() === email
        ).length;
        const crmRecord = customers.find((c) => c.email.toLowerCase() === email);
        if (
          lifetimeOrdersForEmail > 1 ||
          crmRecord?.segment === 'Returning' ||
          crmRecord?.segment === 'VIP'
        ) {
          returningCustomersCount += 1;
        }
      });

      const returningCustomerRate =
        totalCustomersInPeriod > 0
          ? (returningCustomersCount / totalCustomersInPeriod) * 100
          : 0;

      return {
        totalSalesMinor,
        netRevenueMinor,
        refundsMinor,
        discountsMinor,
        ordersCount,
        aovMinor,
        totalSessionsCount,
        uniqueVisitorsCount,
        productViewsCount,
        addedToCartCount,
        reachedCheckoutCount,
        convertedSessionsCount,
        conversionRate,
        totalCustomersInPeriod,
        returningCustomersCount,
        returningCustomerRate,
      };
    };

    const current = computeMetrics(currentOrders, currentSessions);
    const previous = computeMetrics(previousOrders, previousSessions);

    // --- Build Time-Series Chart Buckets ---
    const numBuckets =
      dateWindows.bucketMode === 'hour'
        ? 12
        : datePreset === '7d'
        ? 7
        : datePreset === '90d'
        ? 15
        : 14;
    const stepMs = dateWindows.durationMs / numBuckets;

    const timeSeries = Array.from({ length: numBuckets }, (_, i) => {
      const bStart = dateWindows.startMs + i * stepMs;
      const bEnd = i === numBuckets - 1 ? dateWindows.endMs + 1000 : bStart + stepMs;

      const pStart = dateWindows.prevStartMs + i * stepMs;
      const pEnd = pStart + stepMs;

      const bucketOrders = currentOrders.filter((o) => {
        const t = new Date(o.orderDate).getTime();
        return t >= bStart && t < bEnd;
      });
      const prevBucketOrders = previousOrders.filter((o) => {
        const t = new Date(o.orderDate).getTime();
        return t >= pStart && t < pEnd;
      });

      const bucketSessions = currentSessions.filter((s) => {
        const t = new Date(s.startedAt).getTime();
        return t >= bStart && t < bEnd;
      });
      const prevBucketSessions = previousSessions.filter((s) => {
        const t = new Date(s.startedAt).getTime();
        return t >= pStart && t < pEnd;
      });

      const salesMinor = bucketOrders.reduce(
        (acc, o) => acc + o.financials.totalAmountMinorUnits,
        0
      );
      const prevSalesMinor = prevBucketOrders.reduce(
        (acc, o) => acc + o.financials.totalAmountMinorUnits,
        0
      );

      const refunds = bucketOrders.reduce((acc, o) => acc + (o.refundedAmountMinorUnits || 0), 0);
      const discountsVal = bucketOrders.reduce(
        (acc, o) => acc + o.financials.discountMinorUnits,
        0
      );
      const netMinor = Math.max(0, salesMinor - refunds - discountsVal);

      const prevRefunds = prevBucketOrders.reduce(
        (acc, o) => acc + (o.refundedAmountMinorUnits || 0),
        0
      );
      const prevDiscountsVal = prevBucketOrders.reduce(
        (acc, o) => acc + o.financials.discountMinorUnits,
        0
      );
      const prevNetMinor = Math.max(0, prevSalesMinor - prevRefunds - prevDiscountsVal);

      const ordCount = bucketOrders.length;
      const prevOrdCount = prevBucketOrders.length;

      const sessCount = Math.max(bucketSessions.length, ordCount);
      const prevSessCount = Math.max(prevBucketSessions.length, prevOrdCount);

      const aovMinor = ordCount > 0 ? Math.round(salesMinor / ordCount) : 0;
      const prevAovMinor = prevOrdCount > 0 ? Math.round(prevSalesMinor / prevOrdCount) : 0;

      const dObj = new Date(bStart);
      const label =
        dateWindows.bucketMode === 'hour'
          ? dObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : dObj.toLocaleDateString([], { month: 'short', day: 'numeric' });

      return {
        label,
        total_sales: salesMinor / 100,
        prev_total_sales: prevSalesMinor / 100,
        net_revenue: netMinor / 100,
        prev_net_revenue: prevNetMinor / 100,
        orders: ordCount,
        prev_orders: prevOrdCount,
        sessions: sessCount,
        prev_sessions: prevSessCount,
        aov: aovMinor / 100,
        prev_aov: prevAovMinor / 100,
      };
    });

    // --- Traffic Sources Breakdown ---
    const trafficMap = new Map<
      string,
      { source: string; sessions: number; orders: number; salesMinor: number }
    >();
    (['Direct', 'Organic Search', 'Social', 'Campaign', 'Referral'] as const).forEach((src) => {
      trafficMap.set(src, { source: src, sessions: 0, orders: 0, salesMinor: 0 });
    });

    currentSessions.forEach((s) => {
      const entry = trafficMap.get(s.trafficSource) || {
        source: s.trafficSource,
        sessions: 0,
        orders: 0,
        salesMinor: 0,
      };
      entry.sessions += 1;
      trafficMap.set(s.trafficSource, entry);
    });

    currentOrders.forEach((o, idx) => {
      const linkedSess = currentSessions.find((s) => s.linkedOrderId === o.orderId);
      const fallbackSources = ['Direct', 'Organic Search', 'Social', 'Campaign', 'Referral'];
      const src =
        linkedSess?.trafficSource ||
        (o.tags?.some((t) => t.toLowerCase().includes('vip'))
          ? 'Campaign'
          : fallbackSources[idx % fallbackSources.length]);
      const entry = trafficMap.get(src) || { source: src, sessions: 0, orders: 0, salesMinor: 0 };
      entry.orders += 1;
      entry.salesMinor += o.financials.totalAmountMinorUnits;
      if (entry.sessions < entry.orders) {
        entry.sessions = entry.orders;
      }
      trafficMap.set(src, entry);
    });

    const trafficSources = Array.from(trafficMap.values()).sort(
      (a, b) => b.salesMinor - a.salesMinor || b.sessions - a.sessions
    );

    // --- Device Breakdown ---
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    currentSessions.forEach((s) => {
      deviceCounts[s.deviceType] = (deviceCounts[s.deviceType] || 0) + 1;
    });
    const totalDeviceSessions = Math.max(
      1,
      deviceCounts.desktop + deviceCounts.mobile + deviceCounts.tablet
    );
    const deviceBreakdown = [
      {
        device: 'Desktop',
        key: 'desktop',
        sessions: deviceCounts.desktop,
        pct: Math.round((deviceCounts.desktop / totalDeviceSessions) * 1000) / 10,
      },
      {
        device: 'Mobile',
        key: 'mobile',
        sessions: deviceCounts.mobile,
        pct: Math.round((deviceCounts.mobile / totalDeviceSessions) * 1000) / 10,
      },
      {
        device: 'Tablet',
        key: 'tablet',
        sessions: deviceCounts.tablet,
        pct: Math.round((deviceCounts.tablet / totalDeviceSessions) * 1000) / 10,
      },
    ];

    // --- Country & Municipality Sales Breakdown + Geo Pins ---
    const locationMap = new Map<
      string,
      {
        key: string;
        countryCode: string;
        countryName: string;
        city: string;
        lat: number;
        lng: number;
        orders: number;
        salesMinor: number;
        activeVisitors: number;
        totalSessions: number;
      }
    >();

    currentOrders.forEach((o) => {
      const city = o.shippingAddress.municipality || o.shippingAddress.city || 'Doha';
      const geo = resolveGeoForCountry(o.shippingAddress.countryCode || 'QA', city);
      const key = `${geo.countryCode}:${geo.city}`;
      const existing = locationMap.get(key) || {
        key,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        city: geo.city,
        lat: geo.lat,
        lng: geo.lng,
        orders: 0,
        salesMinor: 0,
        activeVisitors: 0,
        totalSessions: 0,
      };
      existing.orders += 1;
      existing.salesMinor += o.financials.totalAmountMinorUnits;
      locationMap.set(key, existing);
    });

    allSessions.forEach((s) => {
      const geo = resolveGeoForCountry(s.countryCode, s.city);
      const key = `${geo.countryCode}:${geo.city}`;
      const existing = locationMap.get(key) || {
        key,
        countryCode: geo.countryCode,
        countryName: geo.countryName,
        city: geo.city,
        lat: geo.lat,
        lng: geo.lng,
        orders: 0,
        salesMinor: 0,
        activeVisitors: 0,
        totalSessions: 0,
      };
      existing.totalSessions += 1;
      if (s.isOnline) {
        existing.activeVisitors += 1;
      }
      locationMap.set(key, existing);
    });

    const locationBreakdown = Array.from(locationMap.values()).sort(
      (a, b) =>
        b.activeVisitors - a.activeVisitors ||
        b.salesMinor - a.salesMinor ||
        b.totalSessions - a.totalSessions
    );

    // --- Top Products Performance ---
    const productStats = products
      .map((prod) => {
        let unitsSold = 0;
        let grossSalesMinor = 0;
        currentOrders.forEach((o) => {
          o.items.forEach((item) => {
            if (item.productId === prod.id) {
              unitsSold += item.quantity;
              grossSalesMinor += item.totalPriceMinorUnits;
            }
          });
        });

        const viewsCount = currentSessions.filter((s) =>
          s.viewedProductIds.includes(prod.id)
        ).length;
        const cartAddsCount = liveSnapshot.recentEvents.filter(
          (e) => e.type === 'add_to_cart' && e.productId === prod.id
        ).length;

        const unitRetail = prod.countrySpecificPrices?.['QA'] || prod.basePriceMinorUnits;
        const unitCost = prod.costPerItemMinorUnits || Math.round(unitRetail * 0.5);
        const { marginPercent } = calculateProfitAndMargin(unitRetail, unitCost);
        const estProfitMinor = Math.max(0, grossSalesMinor - unitsSold * unitCost);

        return {
          product: prod,
          unitsSold,
          grossSalesMinor,
          estProfitMinor,
          marginPercent,
          viewsCount: Math.max(viewsCount, unitsSold),
          cartAddsCount: Math.max(cartAddsCount, unitsSold),
        };
      })
      .sort((a, b) => b.grossSalesMinor - a.grossSalesMinor || b.viewsCount - a.viewsCount);

    // --- Customer Behavior & Retention Report ---
    const customerBehavior = customers
      .map((cust) => {
        const custOrders = validOrders.filter(
          (o) => o.customer.email.toLowerCase() === cust.email.toLowerCase()
        );
        const periodCustOrders = currentOrders.filter(
          (o) => o.customer.email.toLowerCase() === cust.email.toLowerCase()
        );
        const lifetimeSpentMinor = custOrders.reduce(
          (acc, o) => acc + o.financials.totalAmountMinorUnits,
          0
        );
        const periodSpentMinor = periodCustOrders.reduce(
          (acc, o) => acc + o.financials.totalAmountMinorUnits,
          0
        );
        const lastOrderDate =
          custOrders.length > 0
            ? custOrders.sort(
                (a, b) => new Date(b.orderDate).getTime() - new Date(a.orderDate).getTime()
              )[0].orderDate
            : null;

        return {
          customer: cust,
          lifetimeOrders: custOrders.length,
          periodOrders: periodCustOrders.length,
          lifetimeSpentMinor,
          periodSpentMinor,
          aovMinor:
            custOrders.length > 0 ? Math.round(lifetimeSpentMinor / custOrders.length) : 0,
          lastOrderDate,
          isReturning:
            custOrders.length > 1 || cust.segment === 'Returning' || cust.segment === 'VIP',
        };
      })
      .sort((a, b) => b.lifetimeSpentMinor - a.lifetimeSpentMinor);

    return {
      currentOrders,
      current,
      previous,
      timeSeries,
      trafficSources,
      deviceBreakdown,
      locationBreakdown,
      productStats,
      customerBehavior,
    };
  }, [orders, products, customers, liveSnapshot, dateWindows, datePreset]);

  // --- Export Complete Analytics Report to CSV ---
  const handleExportCSV = () => {
    const { current, previous, productStats, locationBreakdown, trafficSources } = analyticsData;
    const rows: string[] = [
      `MAVENO / AURA QATAR - SHOPIFY ANALYTICS REPORT (${dateWindows.label})`,
      `Generated At,${new Date().toISOString()}`,
      '',
      'EXECUTIVE SUMMARY METRIC,CURRENT PERIOD,PREVIOUS PERIOD,DELTA',
      `Total Sales (QAR),${(current.totalSalesMinor / 100).toFixed(2)},${(
        previous.totalSalesMinor / 100
      ).toFixed(2)},${formatPctDelta(current.totalSalesMinor, previous.totalSalesMinor).label}`,
      `Net Revenue (QAR),${(current.netRevenueMinor / 100).toFixed(2)},${(
        previous.netRevenueMinor / 100
      ).toFixed(2)},${formatPctDelta(current.netRevenueMinor, previous.netRevenueMinor).label}`,
      `Completed Orders,${current.ordersCount},${previous.ordersCount},${
        formatPctDelta(current.ordersCount, previous.ordersCount).label
      }`,
      `Average Order Value (QAR),${(current.aovMinor / 100).toFixed(2)},${(
        previous.aovMinor / 100
      ).toFixed(2)},${formatPctDelta(current.aovMinor, previous.aovMinor).label}`,
      `Total Sessions,${current.totalSessionsCount},${previous.totalSessionsCount},${
        formatPctDelta(current.totalSessionsCount, previous.totalSessionsCount).label
      }`,
      `Unique Visitors,${current.uniqueVisitorsCount},${previous.uniqueVisitorsCount},${
        formatPctDelta(current.uniqueVisitorsCount, previous.uniqueVisitorsCount).label
      }`,
      `Active Visitors Right Now,${liveSnapshot.liveCounters.activeVisitorsRightNow},-,LIVE`,
      `Conversion Rate (%),${current.conversionRate.toFixed(2)}%,${previous.conversionRate.toFixed(
        2
      )}%,${formatPctDelta(current.conversionRate, previous.conversionRate).label}`,
      `Returning Customer Rate (%),${current.returningCustomerRate.toFixed(
        1
      )}%,${previous.returningCustomerRate.toFixed(1)}%,${
        formatPctDelta(current.returningCustomerRate, previous.returningCustomerRate).label
      }`,
      '',
      'CONVERSION FUNNEL STAGE,COUNT,SHARE OF SESSIONS (%)',
      `Total Storefront Sessions,${current.totalSessionsCount},100.0%`,
      `Viewed Products,${current.productViewsCount},${
        current.totalSessionsCount > 0
          ? ((current.productViewsCount / current.totalSessionsCount) * 100).toFixed(1)
          : 0
      }%`,
      `Added to Cart,${current.addedToCartCount},${
        current.totalSessionsCount > 0
          ? ((current.addedToCartCount / current.totalSessionsCount) * 100).toFixed(1)
          : 0
      }%`,
      `Reached Checkout,${current.reachedCheckoutCount},${
        current.totalSessionsCount > 0
          ? ((current.reachedCheckoutCount / current.totalSessionsCount) * 100).toFixed(1)
          : 0
      }%`,
      `Purchased / Converted,${current.convertedSessionsCount},${current.conversionRate.toFixed(
        2
      )}%`,
      '',
      'TOP PRODUCTS,SKU,UNITS SOLD,GROSS SALES (QAR),EST. PROFIT (QAR),MARGIN %',
      ...productStats.map(
        (p) =>
          `"${p.product.name}",${p.product.sku},${p.unitsSold},${(
            p.grossSalesMinor / 100
          ).toFixed(2)},${(p.estProfitMinor / 100).toFixed(2)},${p.marginPercent}%`
      ),
      '',
      'COUNTRY & CITY BREAKDOWN,COUNTRY CODE,ACTIVE VISITORS,SESSIONS,ORDERS,SALES (QAR)',
      ...locationBreakdown.map(
        (loc) =>
          `"${loc.city}, ${loc.countryName}",${loc.countryCode},${loc.activeVisitors},${
            loc.totalSessions
          },${loc.orders},${(loc.salesMinor / 100).toFixed(2)}`
      ),
      '',
      'TRAFFIC SOURCE,SESSIONS,ORDERS,REVENUE (QAR)',
      ...trafficSources.map(
        (t) => `${t.source},${t.sessions},${t.orders},${(t.salesMinor / 100).toFixed(2)}`
      ),
    ];

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maveno-shopify-analytics-${datePreset}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    notify(`Exported Shopify Analytics CSV report (${dateWindows.label}).`);
  };

  // --- SVG Chart Coordinate Computation ---
  const chartConfig = useMemo(() => {
    const series = analyticsData.timeSeries;
    const prevKey = `prev_${selectedChartMetric}` as const;
    const values = series.map((d) => Number(d[selectedChartMetric]) || 0);
    const prevValues = series.map((d) => Number(d[prevKey]) || 0);
    const maxVal = Math.max(10, ...values, ...(comparePrevious ? prevValues : []));

    const width = 760;
    const height = 220;
    const padX = 36;
    const padY = 22;
    const usableW = width - padX * 2;
    const usableH = height - padY * 2;

    const getCoords = (arr: number[]) =>
      arr.map((val, idx) => {
        const x =
          arr.length <= 1 ? padX + usableW / 2 : padX + (idx / (arr.length - 1)) * usableW;
        const y = padY + usableH - (val / maxVal) * usableH;
        return { x, y, val };
      });

    const currentPoints = getCoords(values);
    const prevPoints = getCoords(prevValues);

    const linePath = currentPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');
    const areaPath =
      currentPoints.length > 0
        ? `${linePath} L ${currentPoints[currentPoints.length - 1].x.toFixed(1)} ${(
            padY + usableH
          ).toFixed(1)} L ${currentPoints[0].x.toFixed(1)} ${(padY + usableH).toFixed(1)} Z`
        : '';

    const prevLinePath = prevPoints
      .map((pt, i) => `${i === 0 ? 'M' : 'L'} ${pt.x.toFixed(1)} ${pt.y.toFixed(1)}`)
      .join(' ');

    return {
      width,
      height,
      padX,
      padY,
      usableW,
      usableH,
      maxVal,
      currentPoints,
      prevPoints,
      linePath,
      areaPath,
      prevLinePath,
    };
  }, [analyticsData.timeSeries, selectedChartMetric, comparePrevious]);

  const mapViewBox = useMemo(() => {
    switch (mapRegion) {
      case 'gcc':
        return '460 110 130 80';
      case 'europe':
        return '360 55 140 85';
      case 'americas':
        return '110 70 190 150';
      case 'apac':
        return '530 110 210 140';
      default:
        return '0 0 800 400';
    }
  }, [mapRegion]);

  const { current, previous } = analyticsData;

  const metricMeta: Record<
    ChartMetricKey,
    { title: string; unit: string; currentTotal: string; delta: ReturnType<typeof formatPctDelta> }
  > = {
    total_sales: {
      title: 'Total Sales (Gross)',
      unit: 'QAR',
      currentTotal: `${(current.totalSalesMinor / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} QAR`,
      delta: formatPctDelta(current.totalSalesMinor, previous.totalSalesMinor),
    },
    net_revenue: {
      title: 'Net Revenue',
      unit: 'QAR',
      currentTotal: `${(current.netRevenueMinor / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} QAR`,
      delta: formatPctDelta(current.netRevenueMinor, previous.netRevenueMinor),
    },
    orders: {
      title: 'Total Orders',
      unit: 'orders',
      currentTotal: `${current.ordersCount.toLocaleString()}`,
      delta: formatPctDelta(current.ordersCount, previous.ordersCount),
    },
    sessions: {
      title: 'Storefront Sessions',
      unit: 'sessions',
      currentTotal: `${current.totalSessionsCount.toLocaleString()}`,
      delta: formatPctDelta(current.totalSessionsCount, previous.totalSessionsCount),
    },
    aov: {
      title: 'Average Order Value',
      unit: 'QAR',
      currentTotal: `${(current.aovMinor / 100).toLocaleString(undefined, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })} QAR`,
      delta: formatPctDelta(current.aovMinor, previous.aovMinor),
    },
  };

  return (
    <div className="space-y-6">
      {/* ====================================================================
          1. SHOPIFY ANALYTICS TOP BAR: VIEW TABS, DATE FILTER, COMPARE, EXPORT
         ==================================================================== */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-lg font-bold text-slate-900">Shopify Analytics &amp; Live View</h2>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-[11px] font-semibold text-emerald-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {sseConnected ? 'Real-Time Stream Active' : 'Connecting...'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Real-time database order telemetry, storefront session funnel, geographic live map, and cohort intelligence.
            </p>
          </div>

          {/* Sub-view mode buttons + Export CSV */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'all', label: 'Overview & Charts' },
                { id: 'live_view', label: `Live View (${liveSnapshot.liveCounters.activeVisitorsRightNow} active)` },
                { id: 'reports', label: 'Product & Customer Reports' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setSubTab(t.id as DashboardSubTab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    subTab === t.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV Report
            </button>
          </div>
        </div>

        {/* Date Range Bar + Compare Period Toggle */}
        <div className="pt-3 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 text-xs font-semibold text-slate-600 mr-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Date Range:</span>
            </div>
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              {[
                { id: 'today', label: 'Today' },
                { id: '7d', label: '7 days' },
                { id: '30d', label: '30 days' },
                { id: '90d', label: '90 days' },
                { id: 'custom', label: 'Custom range' },
              ].map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => setDatePreset(preset.id as DateFilterPreset)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    datePreset === preset.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {datePreset === 'custom' && (
              <div className="flex items-center gap-1.5 text-xs">
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs bg-white"
                />
                <span className="text-slate-400">to</span>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="px-2.5 py-1 border border-slate-200 rounded-lg font-mono text-xs bg-white"
                />
              </div>
            )}
          </div>

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={comparePrevious}
                onChange={(e) => setComparePrevious(e.target.checked)}
                className="rounded border-slate-300"
              />
              <span>Compare to previous period</span>
            </label>
          </div>
        </div>
      </div>

      {/* ====================================================================
          2. EXECUTIVE KPI SCORECARDS (8 CORE METRICS WITH PERIOD COMPARISON)
         ==================================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Sales & Net Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Sales (Gross)</span>
            <ShoppingBag className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {(current.totalSalesMinor / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              QAR
            </div>
            {comparePrevious && (
              <span
                className={`text-xs font-mono font-semibold tabular-nums flex items-center gap-0.5 ${
                  metricMeta.total_sales.delta.isPositive ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {metricMeta.total_sales.delta.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {metricMeta.total_sales.delta.label}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Net Revenue:</span>
            <strong className="font-mono text-slate-800 tabular-nums">
              {(current.netRevenueMinor / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              QAR
            </strong>
          </div>
        </div>

        {/* Card 2: Total Orders & AOV */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Orders</span>
            <CreditCard className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {current.ordersCount.toLocaleString()}
            </div>
            {comparePrevious && (
              <span
                className={`text-xs font-mono font-semibold tabular-nums flex items-center gap-0.5 ${
                  metricMeta.orders.delta.isPositive ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {metricMeta.orders.delta.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {metricMeta.orders.delta.label}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Avg. Order Value (AOV):</span>
            <strong className="font-mono text-slate-800 tabular-nums">
              {(current.aovMinor / 100).toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}{' '}
              QAR
            </strong>
          </div>
        </div>

        {/* Card 3: Total Sessions, Unique Visitors & Active Visitors */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Total Sessions &amp; Visitors</span>
            <Activity className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {current.totalSessionsCount.toLocaleString()}{' '}
              <span className="text-xs font-sans font-normal text-slate-500">
                ({current.uniqueVisitorsCount} unique)
              </span>
            </div>
            {comparePrevious && (
              <span
                className={`text-xs font-mono font-semibold tabular-nums flex items-center gap-0.5 ${
                  metricMeta.sessions.delta.isPositive ? 'text-emerald-700' : 'text-rose-600'
                }`}
              >
                {metricMeta.sessions.delta.isPositive ? (
                  <TrendingUp className="w-3.5 h-3.5" />
                ) : (
                  <TrendingDown className="w-3.5 h-3.5" />
                )}
                {metricMeta.sessions.delta.label}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Active Visitors Right Now:</span>
            <strong className="font-mono text-emerald-700 tabular-nums">
              {liveSnapshot.liveCounters.activeVisitorsRightNow} live
            </strong>
          </div>
        </div>

        {/* Card 4: Conversion Rate & Returning Customers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Conversion &amp; Retention</span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="flex items-baseline justify-between gap-2">
            <div className="text-xl font-bold text-slate-900 font-mono tabular-nums">
              {current.conversionRate.toFixed(2)}%
            </div>
            {comparePrevious && (
              <span
                className={`text-xs font-mono font-semibold tabular-nums flex items-center gap-0.5 ${
                  formatPctDelta(current.conversionRate, previous.conversionRate).isPositive
                    ? 'text-emerald-700'
                    : 'text-rose-600'
                }`}
              >
                {formatPctDelta(current.conversionRate, previous.conversionRate).label}
              </span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
            <span>Returning Customers:</span>
            <strong className="font-mono text-slate-800 tabular-nums">
              {current.returningCustomersCount} / {customers.length} ({current.returningCustomerRate.toFixed(0)}%)
            </strong>
          </div>
        </div>
      </div>

      {/* ====================================================================
          3. INTERACTIVE SALES, ORDERS, SESSIONS & REVENUE GRAPHS
         ==================================================================== */}
      {(subTab === 'all' || subTab === 'reports') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <div className="text-xs font-semibold text-slate-500">
                {metricMeta[selectedChartMetric].title} Over Time ({dateWindows.label})
              </div>
              <div className="flex items-baseline gap-3 mt-1">
                <span className="text-2xl font-bold text-slate-900 font-mono tabular-nums">
                  {metricMeta[selectedChartMetric].currentTotal}
                </span>
                {comparePrevious && (
                  <span
                    className={`text-xs font-mono font-semibold tabular-nums ${
                      metricMeta[selectedChartMetric].delta.isPositive
                        ? 'text-emerald-700'
                        : 'text-rose-600'
                    }`}
                  >
                    {metricMeta[selectedChartMetric].delta.label} vs previous period
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                {(
                  [
                    { id: 'total_sales', label: 'Total Sales' },
                    { id: 'net_revenue', label: 'Net Revenue' },
                    { id: 'orders', label: 'Orders' },
                    { id: 'sessions', label: 'Sessions' },
                    { id: 'aov', label: 'AOV' },
                  ] as const
                ).map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setSelectedChartMetric(m.id)}
                    className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                      selectedChartMetric === m.id
                        ? 'bg-white text-slate-900 shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center bg-slate-100 p-1 rounded-lg">
                <button
                  onClick={() => setChartStyle('area')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    chartStyle === 'area' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Line / Area
                </button>
                <button
                  onClick={() => setChartStyle('bar')}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                    chartStyle === 'bar' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
                  }`}
                >
                  Bar Graph
                </button>
              </div>
            </div>
          </div>

          {/* Interactive SVG Chart */}
          <div className="relative">
            <svg
              viewBox={`0 0 ${chartConfig.width} ${chartConfig.height}`}
              className="w-full h-56 overflow-visible"
            >
              <defs>
                <linearGradient id="shopifyChartAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0f766e" stopOpacity="0.22" />
                  <stop offset="100%" stopColor="#0f766e" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = chartConfig.padY + ratio * chartConfig.usableH;
                const val = Math.round(chartConfig.maxVal * (1 - ratio));
                return (
                  <g key={idx}>
                    <line
                      x1={chartConfig.padX}
                      y1={y}
                      x2={chartConfig.width - chartConfig.padX}
                      y2={y}
                      stroke="#f1f5f9"
                      strokeWidth="1"
                    />
                    <text
                      x={chartConfig.padX - 6}
                      y={y + 3}
                      textAnchor="end"
                      className="fill-slate-400 text-[9px] font-mono"
                    >
                      {val}
                    </text>
                  </g>
                );
              })}

              {chartStyle === 'area' ? (
                <>
                  {/* Previous Period Dashed Line */}
                  {comparePrevious && chartConfig.prevLinePath && (
                    <path
                      d={chartConfig.prevLinePath}
                      fill="none"
                      stroke="#94a3b8"
                      strokeWidth="1.75"
                      strokeDasharray="4 4"
                    />
                  )}

                  {/* Current Period Area & Line */}
                  {chartConfig.areaPath && (
                    <path d={chartConfig.areaPath} fill="url(#shopifyChartAreaGrad)" />
                  )}
                  {chartConfig.linePath && (
                    <path
                      d={chartConfig.linePath}
                      fill="none"
                      stroke="#0f766e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  )}

                  {/* Interactive Data Points */}
                  {chartConfig.currentPoints.map((pt, i) => {
                    const item = analyticsData.timeSeries[i];
                    const isHovered = hoveredBucketIdx === i;
                    return (
                      <g
                        key={i}
                        onMouseEnter={() => setHoveredBucketIdx(i)}
                        onMouseLeave={() => setHoveredBucketIdx(null)}
                        className="cursor-pointer"
                      >
                        <rect
                          x={pt.x - 16}
                          y={chartConfig.padY}
                          width="32"
                          height={chartConfig.usableH}
                          fill="transparent"
                        />
                        {isHovered && (
                          <line
                            x1={pt.x}
                            y1={chartConfig.padY}
                            x2={pt.x}
                            y2={chartConfig.padY + chartConfig.usableH}
                            stroke="#cbd5e1"
                            strokeWidth="1"
                            strokeDasharray="2 2"
                          />
                        )}
                        <circle
                          cx={pt.x}
                          cy={pt.y}
                          r={isHovered ? 5 : 3}
                          className="fill-teal-700 stroke-white stroke-2 transition-all"
                        />
                        <text
                          x={pt.x}
                          y={chartConfig.height - 4}
                          textAnchor="middle"
                          className="fill-slate-400 text-[9px] font-mono"
                        >
                          {item?.label}
                        </text>
                      </g>
                    );
                  })}
                </>
              ) : (
                /* Bar Chart Mode */
                chartConfig.currentPoints.map((pt, i) => {
                  const item = analyticsData.timeSeries[i];
                  const prevPt = chartConfig.prevPoints[i];
                  const barW = Math.max(
                    8,
                    Math.min(24, chartConfig.usableW / (chartConfig.currentPoints.length * 2.2))
                  );
                  const barH = Math.max(2, chartConfig.padY + chartConfig.usableH - pt.y);
                  const prevBarH = prevPt
                    ? Math.max(2, chartConfig.padY + chartConfig.usableH - prevPt.y)
                    : 0;
                  return (
                    <g
                      key={i}
                      onMouseEnter={() => setHoveredBucketIdx(i)}
                      onMouseLeave={() => setHoveredBucketIdx(null)}
                      className="cursor-pointer"
                    >
                      {comparePrevious && prevPt && (
                        <rect
                          x={pt.x - barW - 1}
                          y={prevPt.y}
                          width={barW}
                          height={prevBarH}
                          rx="2"
                          fill="#cbd5e1"
                        />
                      )}
                      <rect
                        x={comparePrevious ? pt.x + 1 : pt.x - barW / 2}
                        y={pt.y}
                        width={barW}
                        height={barH}
                        rx="2"
                        fill="#0f766e"
                      />
                      <text
                        x={pt.x}
                        y={chartConfig.height - 4}
                        textAnchor="middle"
                        className="fill-slate-400 text-[9px] font-mono"
                      >
                        {item?.label}
                      </text>
                    </g>
                  );
                })
              )}
            </svg>

            {/* Hover Tooltip Banner */}
            {hoveredBucketIdx !== null && analyticsData.timeSeries[hoveredBucketIdx] && (
              <div className="mt-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs flex flex-wrap items-center justify-between gap-4">
                <span className="font-semibold">
                  Period: {analyticsData.timeSeries[hoveredBucketIdx].label}
                </span>
                <div className="flex items-center gap-4 font-mono tabular-nums">
                  <span>
                    Current:{' '}
                    <strong>
                      {analyticsData.timeSeries[hoveredBucketIdx][selectedChartMetric]}{' '}
                      {metricMeta[selectedChartMetric].unit}
                    </strong>
                  </span>
                  {comparePrevious && (
                    <span className="text-slate-300">
                      Previous:{' '}
                      {
                        analyticsData.timeSeries[hoveredBucketIdx][
                          `prev_${selectedChartMetric}` as const
                        ]
                      }{' '}
                      {metricMeta[selectedChartMetric].unit}
                    </span>
                  )}
                </div>
              </div>
            )}

            {/* Legend */}
            <div className="flex items-center justify-end gap-5 text-xs text-slate-500 pt-2">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-0.5 bg-teal-700 inline-block" />
                <span>Current Period ({dateWindows.label})</span>
              </div>
              {comparePrevious && (
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-slate-400 border-b border-dashed inline-block" />
                  <span>Previous Period</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          4. REAL-TIME LIVE VIEW WITH INTERACTIVE WORLD MAP & LIVE COUNTERS
         ==================================================================== */}
      {(subTab === 'all' || subTab === 'live_view') && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-teal-700" />
                <h3 className="text-sm font-bold text-slate-900">
                  Real-Time Live View &amp; Global Visitor Map
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Live storefront visitor locations, active shopping carts, checkout sessions, and verified orders.
              </p>
            </div>

            {/* Region Zoom Selector */}
            <div className="flex items-center bg-slate-100 p-1 rounded-lg">
              {(
                [
                  { id: 'world', label: 'World View' },
                  { id: 'gcc', label: 'Qatar & GCC' },
                  { id: 'europe', label: 'Europe' },
                  { id: 'americas', label: 'Americas' },
                  { id: 'apac', label: 'Asia-Pacific' },
                ] as const
              ).map((r) => (
                <button
                  key={r.id}
                  onClick={() => setMapRegion(r.id)}
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors whitespace-nowrap ${
                    mapRegion === r.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* 4 Live Funnel Counters */}
          <div className="grid grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 border-b border-slate-200 bg-slate-50/60">
            <div className="p-4">
              <div className="text-xs font-semibold text-slate-500">Visitors right now</div>
              <div className="text-2xl font-bold text-slate-900 font-mono tabular-nums mt-1">
                {liveSnapshot.liveCounters.activeVisitorsRightNow}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Active storefront sessions (last 5m)
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-slate-500">Active carts</div>
              <div className="text-2xl font-bold text-amber-700 font-mono tabular-nums mt-1">
                {liveSnapshot.liveCounters.activeCartsRightNow}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Sessions with items in bag
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-slate-500">Checking out</div>
              <div className="text-2xl font-bold text-sky-700 font-mono tabular-nums mt-1">
                {liveSnapshot.liveCounters.checkingOutRightNow}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Active in Shopify Checkout flow
              </div>
            </div>
            <div className="p-4">
              <div className="text-xs font-semibold text-slate-500">Orders ({dateWindows.label})</div>
              <div className="text-2xl font-bold text-emerald-700 font-mono tabular-nums mt-1">
                {current.ordersCount}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {(current.totalSalesMinor / 100).toLocaleString()} QAR verified sales
              </div>
            </div>
          </div>

          {/* Interactive World Map + Live Activity Feed Split */}
          <div className="grid grid-cols-1 lg:grid-cols-3 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
            {/* Left 2 Columns: Interactive SVG World Map */}
            <div className="lg:col-span-2 p-5 bg-[#0f172a] text-white flex flex-col justify-between relative">
              <div className="flex items-center justify-between text-xs text-slate-300 mb-3">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
                    <span>Live Visitor Session</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" />
                    <span>Completed Order Location</span>
                  </span>
                </div>
                <span className="font-mono text-[11px] text-slate-400">
                  Click any location pin to inspect metrics
                </span>
              </div>

              <div className="w-full overflow-hidden rounded-lg border border-slate-800 bg-[#0b1120]">
                <svg
                  viewBox={mapViewBox}
                  className="w-full h-72 sm:h-80 transition-all duration-300"
                >
                  {/* Graticule Lines */}
                  {[80, 160, 240, 320].map((y) => (
                    <line
                      key={`lat_${y}`}
                      x1="0"
                      y1={y}
                      x2="800"
                      y2={y}
                      stroke="#1e293b"
                      strokeWidth="0.6"
                      strokeDasharray="3 3"
                    />
                  ))}
                  {[160, 320, 480, 640].map((x) => (
                    <line
                      key={`lng_${x}`}
                      x1={x}
                      y1="0"
                      x2={x}
                      y2="400"
                      stroke="#1e293b"
                      strokeWidth="0.6"
                      strokeDasharray="3 3"
                    />
                  ))}

                  {/* Simplified Continental Landmasses (Equirectangular 800x400) */}
                  <g fill="#1e293b" stroke="#334155" strokeWidth="0.8">
                    {/* North America */}
                    <path d="M 65 55 L 185 45 L 255 95 L 220 165 L 165 190 L 125 160 L 75 110 Z" />
                    {/* South America */}
                    <path d="M 215 205 L 275 225 L 295 275 L 255 360 L 225 345 L 205 255 Z" />
                    {/* Europe */}
                    <path d="M 365 55 L 465 50 L 485 105 L 435 125 L 375 120 L 355 90 Z" />
                    {/* Africa */}
                    <path d="M 365 135 L 455 135 L 505 185 L 475 310 L 425 315 L 395 225 L 355 180 Z" />
                    {/* Middle East & Arabian Peninsula (Highlighted) */}
                    <path
                      d="M 465 125 L 535 130 L 545 175 L 495 190 L 465 160 Z"
                      fill="#1e3a34"
                      stroke="#10b981"
                      strokeWidth="0.9"
                    />
                    {/* Asia */}
                    <path d="M 485 50 L 695 55 L 735 125 L 675 210 L 585 215 L 535 165 L 485 110 Z" />
                    {/* Australia / Oceania */}
                    <path d="M 625 255 L 725 255 L 735 325 L 655 335 L 615 295 Z" />
                  </g>

                  {/* Plot Real Visitor & Order Location Pins */}
                  {analyticsData.locationBreakdown.map((loc) => {
                    const { x, y } = projectLatLngToSvg(loc.lat, loc.lng);
                    const isSelected = selectedLocationCode === loc.key;
                    const hasLive = loc.activeVisitors > 0;
                    const radius = hasLive
                      ? Math.min(9, 4.5 + loc.activeVisitors * 1.2)
                      : Math.min(8, 3.5 + loc.orders * 1.1);

                    return (
                      <g
                        key={loc.key}
                        onClick={() =>
                          setSelectedLocationCode(isSelected ? null : loc.key)
                        }
                        className="cursor-pointer"
                      >
                        {hasLive && (
                          <circle
                            cx={x}
                            cy={y}
                            r={radius + 5}
                            fill="none"
                            stroke="#34d399"
                            strokeWidth="1.2"
                            opacity="0.6"
                          />
                        )}
                        <circle
                          cx={x}
                          cy={y}
                          r={radius}
                          fill={hasLive ? '#10b981' : '#f59e0b'}
                          stroke="#ffffff"
                          strokeWidth={isSelected ? '2' : '1'}
                        />
                        <text
                          x={x}
                          y={y - radius - 4}
                          textAnchor="middle"
                          className="fill-slate-200 text-[8px] font-mono font-semibold"
                        >
                          {loc.city} ({loc.activeVisitors > 0 ? `${loc.activeVisitors} live` : `${loc.orders} ord`})
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Selected Pin Details Bar */}
              {selectedLocationCode && (
                <div className="mt-3 p-3 rounded-lg bg-slate-800/90 border border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
                  {(() => {
                    const loc = analyticsData.locationBreakdown.find(
                      (l) => l.key === selectedLocationCode
                    );
                    if (!loc) return null;
                    return (
                      <>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-emerald-400" />
                          <span className="font-bold text-white">
                            {loc.city}, {loc.countryName} ({loc.countryCode})
                          </span>
                        </div>
                        <div className="flex items-center gap-4 font-mono tabular-nums text-slate-200">
                          <span>Active Visitors: {loc.activeVisitors}</span>
                          <span>Total Sessions: {loc.totalSessions}</span>
                          <span>Orders: {loc.orders}</span>
                          <span className="text-emerald-400 font-bold">
                            Sales: {(loc.salesMinor / 100).toFixed(2)} QAR
                          </span>
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>

            {/* Right Column: Real-Time Storefront Activity Stream & Recent Orders */}
            <div className="p-5 flex flex-col justify-between space-y-4 max-h-[430px] overflow-y-auto">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                  Live Storefront Activity Feed
                </h4>
                {liveSnapshot.recentEvents.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Waiting for storefront interactions...
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {liveSnapshot.recentEvents.slice(0, 10).map((ev) => (
                      <div
                        key={ev.eventId}
                        className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/60 text-xs flex items-start justify-between gap-2"
                      >
                        <div>
                          <div className="font-semibold text-slate-900">
                            {ev.type === 'purchase_completed' && (
                              <span className="text-emerald-700">
                                Order {ev.orderNumber || ''} Completed
                              </span>
                            )}
                            {ev.type === 'checkout_started' && (
                              <span className="text-sky-700">Customer Entered Checkout</span>
                            )}
                            {ev.type === 'add_to_cart' && (
                              <span className="text-amber-700">
                                Added to Cart: {ev.productName || 'Item'}
                              </span>
                            )}
                            {ev.type === 'product_view' && (
                              <span>Inspected: {ev.productName || 'Product'}</span>
                            )}
                            {(ev.type === 'page_view' || ev.type === 'session_start') && (
                              <span>Visited Storefront ({ev.pagePath || '/'})</span>
                            )}
                            {ev.type === 'cart_updated' && <span>Updated Shopping Bag</span>}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {ev.city}, {ev.countryCode} · {ev.deviceType} · {ev.trafficSource}
                          </div>
                        </div>
                        <span className="font-mono text-[10px] text-slate-400 tabular-nums shrink-0">
                          {new Date(ev.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Recent Verified Orders in Live View */}
              <div className="pt-3 border-t border-slate-200">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
                  Recent Orders ({analyticsData.currentOrders.length})
                </h4>
                <div className="space-y-2">
                  {analyticsData.currentOrders.slice(0, 4).map((ord) => (
                    <div
                      key={ord.orderId}
                      className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-0"
                    >
                      <div>
                        <span className="font-mono font-bold text-slate-900">
                          {ord.orderNumber}
                        </span>{' '}
                        <span className="text-slate-600">· {ord.customer.fullName}</span>
                        <div className="text-[10px] text-slate-400">
                          {ord.shippingAddress.municipality || ord.shippingAddress.city},{' '}
                          {ord.shippingAddress.countryName}
                        </div>
                      </div>
                      <span className="font-mono font-bold text-emerald-700 tabular-nums">
                        {(ord.financials.totalAmountMinorUnits / 100).toFixed(2)} QAR
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          5. CONVERSION FUNNEL, DEVICE BREAKDOWN, TRAFFIC SOURCES & COUNTRY SALES
         ==================================================================== */}
      {subTab === 'all' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Conversion Funnel (Sessions → Purchase)
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real storefront progression across {dateWindows.label}
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700 tabular-nums">
                {current.conversionRate.toFixed(2)}% Overall Conversion
              </span>
            </div>

            <div className="space-y-3.5 pt-1">
              {[
                {
                  stage: 'All Storefront Sessions',
                  count: current.totalSessionsCount,
                  pct: 100,
                  barColor: 'bg-slate-900',
                },
                {
                  stage: 'Viewed Product Details',
                  count: current.productViewsCount,
                  pct:
                    current.totalSessionsCount > 0
                      ? Math.min(100, (current.productViewsCount / current.totalSessionsCount) * 100)
                      : 0,
                  barColor: 'bg-slate-700',
                },
                {
                  stage: 'Added to Cart',
                  count: current.addedToCartCount,
                  pct:
                    current.totalSessionsCount > 0
                      ? Math.min(100, (current.addedToCartCount / current.totalSessionsCount) * 100)
                      : 0,
                  barColor: 'bg-amber-600',
                },
                {
                  stage: 'Reached Checkout',
                  count: current.reachedCheckoutCount,
                  pct:
                    current.totalSessionsCount > 0
                      ? Math.min(
                          100,
                          (current.reachedCheckoutCount / current.totalSessionsCount) * 100
                        )
                      : 0,
                  barColor: 'bg-sky-600',
                },
                {
                  stage: 'Sessions Converted (Purchased)',
                  count: current.convertedSessionsCount,
                  pct: current.conversionRate,
                  barColor: 'bg-emerald-600',
                },
              ].map((step) => (
                <div key={step.stage} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700">{step.stage}</span>
                    <span className="font-mono font-bold text-slate-900 tabular-nums">
                      {step.count.toLocaleString()} ({step.pct.toFixed(1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${step.barColor} rounded-full transition-all duration-300`}
                      style={{ width: `${Math.max(3, step.pct)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Device Breakdown & Traffic Sources Card */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
            {/* Device Breakdown */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-900">
                  Sessions by Device Type
                </h3>
                <span className="text-xs text-slate-500 font-mono tabular-nums">
                  {current.totalSessionsCount} total sessions
                </span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                {analyticsData.deviceBreakdown.map((dev) => (
                  <div
                    key={dev.key}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-600 font-semibold">
                      <span>{dev.device}</span>
                      {dev.key === 'desktop' && <Monitor className="w-3.5 h-3.5 text-slate-500" />}
                      {dev.key === 'mobile' && <Smartphone className="w-3.5 h-3.5 text-slate-500" />}
                      {dev.key === 'tablet' && <Tablet className="w-3.5 h-3.5 text-slate-500" />}
                    </div>
                    <div className="text-lg font-bold text-slate-900 font-mono tabular-nums">
                      {dev.pct}%
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono tabular-nums">
                      {dev.sessions} session{dev.sessions === 1 ? '' : 's'}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Traffic Sources */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <h3 className="text-sm font-bold text-slate-900">
                Traffic Sources &amp; Attribution
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <th className="py-2">Source</th>
                      <th className="py-2 text-right">Sessions</th>
                      <th className="py-2 text-right">Orders</th>
                      <th className="py-2 text-right">Conv. Rate</th>
                      <th className="py-2 text-right">Sales (QAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {analyticsData.trafficSources.map((src) => {
                      const conv =
                        src.sessions > 0
                          ? Math.min(100, (src.orders / src.sessions) * 100)
                          : 0;
                      return (
                        <tr key={src.source}>
                          <td className="py-2.5 font-semibold text-slate-900">{src.source}</td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                            {src.sessions}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-700">
                            {src.orders}
                          </td>
                          <td className="py-2.5 text-right font-mono tabular-nums text-slate-600">
                            {conv.toFixed(1)}%
                          </td>
                          <td className="py-2.5 text-right font-mono font-bold tabular-nums text-slate-900">
                            {(src.salesMinor / 100).toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          6. TOP PRODUCTS, COUNTRY-WISE SALES & CUSTOMER BEHAVIOR REPORTS
         ==================================================================== */}
      {(subTab === 'all' || subTab === 'reports') && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Products by Units Sold & Revenue (2 columns) */}
          <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Product Performance &amp; Gross Margin Report
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Ranked by actual units sold, storefront views, cart additions, and net profit
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                    <th className="py-2.5 px-3">Product</th>
                    <th className="py-2.5 px-3 text-right">Views</th>
                    <th className="py-2.5 px-3 text-right">Added to Cart</th>
                    <th className="py-2.5 px-3 text-right">Units Sold</th>
                    <th className="py-2.5 px-3 text-right">Gross Sales</th>
                    <th className="py-2.5 px-3 text-right">Est. Profit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {analyticsData.productStats.slice(0, 8).map((item) => (
                    <tr key={item.product.id} className="hover:bg-slate-50/70">
                      <td className="py-2.5 px-3">
                        <div className="font-bold text-slate-900">{item.product.name}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          SKU: {item.product.sku} · Margin: {item.marginPercent}%
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {item.viewsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-600">
                        {item.cartAddsCount}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {item.unitsSold}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-slate-900">
                        {(item.grossSalesMinor / 100).toFixed(2)} QAR
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold tabular-nums text-emerald-700">
                        +{(item.estProfitMinor / 100).toFixed(2)} QAR
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Country-Wise & Municipality Sales Breakdown (1 column) */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Country &amp; City Sales Breakdown
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Sales and active sessions by destination
              </p>
            </div>

            <div className="space-y-3">
              {analyticsData.locationBreakdown.map((loc) => {
                const sharePct =
                  current.totalSalesMinor > 0
                    ? Math.round((loc.salesMinor / current.totalSalesMinor) * 100)
                    : 0;
                return (
                  <div
                    key={loc.key}
                    className="p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {loc.city}, {loc.countryName} ({loc.countryCode})
                      </span>
                      <span className="font-mono font-bold text-slate-900 tabular-nums">
                        {(loc.salesMinor / 100).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}{' '}
                        QAR
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono tabular-nums">
                      <span>
                        {loc.orders} order{loc.orders === 1 ? '' : 's'} · {loc.totalSessions} session
                        {loc.totalSessions === 1 ? '' : 's'}
                      </span>
                      <span>
                        {loc.activeVisitors > 0 ? `${loc.activeVisitors} live now · ` : ''}
                        {sharePct}% share
                      </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-teal-700 rounded-full"
                        style={{ width: `${Math.max(4, sharePct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ====================================================================
          7. CUSTOMER BEHAVIOR & RETENTION COHORT REPORT
         ==================================================================== */}
      {(subTab === 'all' || subTab === 'reports') && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Customer Behavior, LTV &amp; Returning Cohort Report
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                First-time vs returning buyers, average order value per customer, and lifetime revenue from database records.
              </p>
            </div>
            <div className="flex items-center gap-4 text-xs font-mono tabular-nums">
              <span>
                Total CRM Customers: <strong>{customers.length}</strong>
              </span>
              <span>
                Returning Rate: <strong className="text-emerald-700">{current.returningCustomerRate.toFixed(1)}%</strong>
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                  <th className="py-2.5 px-4">Customer</th>
                  <th className="py-2.5 px-4">Cohort / Segment</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4 text-right">Orders (Period / Total)</th>
                  <th className="py-2.5 px-4 text-right">Avg. Order Value</th>
                  <th className="py-2.5 px-4 text-right">Lifetime Spent (LTV)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {analyticsData.customerBehavior.map((entry) => (
                  <tr key={entry.customer.id} className="hover:bg-slate-50/70">
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{entry.customer.fullName}</div>
                      <div className="text-[11px] text-slate-500">{entry.customer.email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800">
                        {entry.isReturning ? 'Returning Buyer' : 'First-Time Buyer'}
                      </span>{' '}
                      <span className="text-slate-400">· {entry.customer.segment}</span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      {entry.customer.addresses[0]?.municipality ||
                        entry.customer.addresses[0]?.city ||
                        'Doha'}
                      , {entry.customer.addresses[0]?.countryName || 'Qatar'}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <strong>{entry.periodOrders}</strong> / {entry.lifetimeOrders}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">
                      {(entry.aovMinor / 100).toFixed(2)} QAR
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-bold tabular-nums text-emerald-700">
                      {(entry.lifetimeSpentMinor / 100).toFixed(2)} QAR
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
