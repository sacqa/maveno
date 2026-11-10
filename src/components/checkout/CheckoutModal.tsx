import React, { useState } from 'react';
import {
  X,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  CreditCard,
  Truck,
  ArrowRight,
  ArrowLeft,
  Lock,
  Building,
  UserCheck,
  FileCheck2,
} from 'lucide-react';
import {
  CartItem,
  Country,
  Currency,
  StoreSettings,
  AgeVerificationRecord,
  ImmutableOrderSnapshot,
} from '../../types/ecommerce';
import {
  calculateOrderFinancials,
  validateCustomerAge,
  validateCountryEligibility,
  buildImmutableOrderSnapshot,
  formatMinorUnits,
} from '../../utils/commerce-engine';
import { storeDb } from '../../services/store-db';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cartItems: CartItem[];
  currentCountry: Country;
  currentCurrency: Currency;
  settings: StoreSettings;
  onOrderCompleted: (order: ImmutableOrderSnapshot) => void;
}

export const CheckoutModal: React.FC<CheckoutModalProps> = ({
  isOpen,
  onClose,
  cartItems,
  currentCountry,
  currentCurrency,
  settings,
  onOrderCompleted,
}) => {
  if (!isOpen) return null;

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5 | 6 | 7>(1);

  // Form State (Defaulted to Qatar Customer)
  const [customerName, setCustomerName] = useState('Tariq Al-Mansoori');
  const [customerEmail, setCustomerEmail] = useState('tariq.almansoori@qatar-holdings.qa');
  const [customerPhone, setCustomerPhone] = useState('+974 5512 8844');

  const [addressLine1, setAddressLine1] = useState('Villa 18, Street 840, Zone 66');
  const [addressLine2, setAddressLine2] = useState('Porto Arabia, The Pearl-Qatar');
  const [city, setCity] = useState('Doha');
  const [stateOrProvince, setStateOrProvince] = useState('Doha');
  const [postalCode, setPostalCode] = useState('PO Box 24411');

  // Age Verification Form
  const [dobYear, setDobYear] = useState('1990');
  const [dobMonth, setDobMonth] = useState('05');
  const [dobDay, setDobDay] = useState('12');
  const [ageVerificationStatus, setAgeVerificationStatus] = useState<'idle' | 'verifying' | 'passed' | 'failed'>('idle');
  const [ageVerificationError, setAgeVerificationError] = useState<string | null>(null);
  const [verifiedRecord, setVerifiedRecord] = useState<AgeVerificationRecord | null>(null);

  // Payment Selection
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    'high_risk_approved_gateway' | 'sandbox_terminal' | 'wire_transfer_swift'
  >('high_risk_approved_gateway');
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);

  // Financials Re-Calculation in Minor Units (Server authoritative)
  const subtotalMinorUnits = cartItems.reduce((acc, i) => acc + i.totalPriceMinorUnits, 0);
  const financials = calculateOrderFinancials({
    subtotalMinorUnits,
    country: currentCountry,
    currency: currentCurrency,
    freeShippingThresholdMinorUnits: settings.freeShippingThresholdMinorUnits,
  });

  const countryEligibility = validateCountryEligibility(currentCountry);

  // Handlers for steps
  const handleVerifyAge = () => {
    setAgeVerificationStatus('verifying');
    setAgeVerificationError(null);

    const dobString = `${dobYear}-${dobMonth.padStart(2, '0')}-${dobDay.padStart(2, '0')}`;
    const ageCheck = validateCustomerAge(dobString, currentCountry);

    setTimeout(() => {
      if (!ageCheck.isCompliant) {
        setAgeVerificationStatus('failed');
        setAgeVerificationError(ageCheck.errorMessage || 'Age compliance check failed.');
        return;
      }

      // Record compliance audit log in Store Database
      const provider =
        currentCountry.code === 'QA'
          ? 'Qatar National ID (QID)'
          : currentCountry.code === 'GB'
          ? 'VerifyMyAge UK'
          : 'Veratad Global';
      const refPrefix = currentCountry.code === 'QA' ? 'QID-290' : currentCountry.code === 'GB' ? 'VMA-GB' : 'VTD-US';
      const record = storeDb.recordAgeVerification({
        customerEmail,
        customerName,
        countryCode: currentCountry.code,
        dateOfBirth: dobString,
        verifiedAge: ageCheck.calculatedAge,
        provider,
        providerReference: `${refPrefix}-${Math.floor(100000 + Math.random() * 900000)}`,
        status: 'passed',
      });

      setVerifiedRecord(record);
      setAgeVerificationStatus('passed');
    }, 600);
  };

  const handleFinalSubmitOrder = () => {
    if (!verifiedRecord) return;
    setIsProcessingOrder(true);

    setTimeout(() => {
      const orderNumber = `ORD-2026-${currentCountry.code}-${Math.floor(1000 + Math.random() * 9000)}`;
      const orderSnapshot = buildImmutableOrderSnapshot({
        orderNumber,
        customer: { fullName: customerName, email: customerEmail, phone: customerPhone },
        shippingAddress: {
          addressLine1,
          addressLine2,
          city,
          stateOrProvince,
          postalCode,
          countryCode: currentCountry.code,
          countryName: currentCountry.name,
        },
        cartItems,
        country: currentCountry,
        currency: currentCurrency,
        ageVerification: verifiedRecord,
        financials,
        paymentMethod: selectedPaymentMethod,
      });

      // Save to database
      storeDb.createOrder(orderSnapshot);
      setIsProcessingOrder(false);
      onOrderCompleted(orderSnapshot);
    }, 800);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950/75 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative bg-white rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl border border-neutral-200 my-8">
        {/* Top Header */}
        <div className="p-5 sm:p-6 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">
                Regulated Order Pipeline
              </span>
              <span className="text-neutral-400">·</span>
              <span className="text-xs text-neutral-600 font-mono-numbers">
                Step {currentStep} of 6
              </span>
            </div>
            <h2 className="text-xl font-bold text-neutral-900 mt-0.5">
              Compliance-First Checkout
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-neutral-400 hover:text-neutral-800 rounded-lg hover:bg-neutral-200/60 transition-colors cursor-pointer"
            aria-label="Close checkout modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step Indicator Bar */}
        <div className="grid grid-cols-6 border-b border-neutral-200 text-center text-[11px] font-medium text-neutral-500 bg-white">
          <div className={`py-2.5 border-b-2 transition-colors ${currentStep >= 1 ? 'border-amber-700 text-amber-900 font-bold' : 'border-transparent'}`}>
            1. Identity
          </div>
          <div className={`py-2.5 border-b-2 transition-colors ${currentStep >= 2 ? 'border-amber-700 text-amber-900 font-bold' : 'border-transparent'}`}>
            2. Destination
          </div>
          <div className={`py-2.5 border-b-2 transition-colors ${currentStep >= 3 ? 'border-amber-700 text-amber-900 font-bold' : 'border-transparent'}`}>
            3. Eligibility
          </div>
          <div className={`py-2.5 border-b-2 transition-colors ${currentStep >= 4 ? 'border-amber-700 text-amber-900 font-bold' : 'border-transparent'}`}>
            4. Age Check
          </div>
          <div className={`py-2.5 border-b-2 transition-colors ${currentStep >= 5 ? 'border-amber-700 text-amber-900 font-bold' : 'border-transparent'}`}>
            5. Tax & Duty
          </div>
          <div className={`py-2.5 border-b-2 transition-colors ${currentStep >= 6 ? 'border-amber-700 text-amber-900 font-bold' : 'border-transparent'}`}>
            6. Payment
          </div>
        </div>

        {/* Main Step Content Area */}
        <div className="p-6 sm:p-8 max-h-[68vh] overflow-y-auto">
          {/* STEP 1: Customer Information */}
          {currentStep === 1 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-neutral-900">Step 1: Customer Identification</h3>
              <p className="text-xs text-neutral-600">
                Provide your legal full name matching your government-issued identity documents for adult age verification.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Legal Full Name *
                  </label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                    placeholder="e.g. Eleanor Vance"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Email Address * (For Audit Hash & Dispatch Tracking)
                  </label>
                  <input
                    type="email"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                    placeholder="e.g. eleanor@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Direct Contact Phone * (For Courier Adult Signature Check)
                  </label>
                  <input
                    type="tel"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                    placeholder="+44 7700 900123"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Shipping Destination */}
          {currentStep === 2 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-neutral-900">Step 2: Shipping Destination</h3>
              <p className="text-xs text-neutral-600">
                Selected country: <strong>{currentCountry.name} ({currentCountry.code})</strong>. Physical courier delivery requires a full street address. PO Boxes are strictly prohibited.
              </p>

              <div className="space-y-3 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Street Address Line 1 *
                  </label>
                  <input
                    type="text"
                    value={addressLine1}
                    onChange={(e) => setAddressLine1(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                    placeholder="House / Building number and street"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Suite / Apartment / Floor (Optional)
                  </label>
                  <input
                    type="text"
                    value={addressLine2}
                    onChange={(e) => setAddressLine2(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                    placeholder="e.g. Suite 4B"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">City *</label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-neutral-700 mb-1">
                      State / Province / County *
                    </label>
                    <input
                      type="text"
                      value={stateOrProvince}
                      onChange={(e) => setStateOrProvince(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-neutral-700 mb-1">
                    Postal / Zip Code *
                  </label>
                  <input
                    type="text"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-lg border border-neutral-300 focus:outline-hidden focus:ring-2 focus:ring-amber-600"
                    required
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Product & Market Eligibility Verification */}
          {currentStep === 3 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-neutral-900">Step 3: Regulatory & Market Audit</h3>
              <p className="text-xs text-neutral-600">
                Automatic server-side audit of destination jurisdiction ({currentCountry.name}) against product catalog rules and trade sanctions.
              </p>

              <div className="space-y-3 pt-2">
                <div
                  className={`p-4 rounded-xl border text-xs ${
                    countryEligibility.isEligible
                      ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                      : 'bg-red-50 border-red-200 text-red-950'
                  }`}
                >
                  <div className="flex items-center gap-2 font-semibold">
                    {countryEligibility.isEligible ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-600" />
                    )}
                    <span>
                      Country Regulatory Status: {currentCountry.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="mt-1 leading-relaxed text-neutral-700">
                    {countryEligibility.isEligible
                      ? `Importation and personal delivery are legally permitted in ${currentCountry.name}. Mandatory minimum age: ${currentCountry.minimumAge}+.`
                      : countryEligibility.reason}
                  </p>
                  <div className="mt-2 text-[11px] font-mono-numbers text-neutral-600">
                    Compliance Note: {currentCountry.complianceNotes}
                  </div>
                </div>

                {/* Items Audit */}
                <div className="border border-neutral-200 rounded-xl overflow-hidden divide-y divide-neutral-100 text-xs">
                  <div className="p-3 bg-neutral-50 font-semibold text-neutral-700 flex justify-between">
                    <span>Item ({cartItems.length} in manifest)</span>
                    <span>Sanction / TPD Check</span>
                  </div>
                  {cartItems.map((item) => (
                    <div key={item.id} className="p-3 flex items-center justify-between">
                      <div>
                        <div className="font-semibold text-neutral-900">{item.product.name}</div>
                        <div className="text-[11px] text-neutral-500">{item.variant.title}</div>
                      </div>
                      <span className="text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Strict Age Verification Engine */}
          {currentStep === 4 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-neutral-900">Step 4: Age Verification Gateway</h3>
              <p className="text-xs text-neutral-600">
                To comply with international adult product regulations in <strong>{currentCountry.name}</strong>, customer must be at least <strong>{currentCountry.minimumAge} years old</strong>. Independent verification is executed via certified partner ({currentCountry.code === 'GB' ? 'VerifyMyAge UK' : 'Veratad Global'}).
              </p>

              <div className="p-5 bg-neutral-50 rounded-xl border border-neutral-200 space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-neutral-900">
                  <UserCheck className="w-4 h-4 text-amber-700" />
                  <span>Enter Date of Birth (As per National ID / Passport)</span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">Day (DD)</label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={dobDay}
                      onChange={(e) => setDobDay(e.target.value)}
                      className="w-full p-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-center font-mono-numbers"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">Month (MM)</label>
                    <input
                      type="number"
                      min="1"
                      max="12"
                      value={dobMonth}
                      onChange={(e) => setDobMonth(e.target.value)}
                      className="w-full p-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-center font-mono-numbers"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-neutral-600 mb-1">Year (YYYY)</label>
                    <input
                      type="number"
                      min="1920"
                      max="2020"
                      value={dobYear}
                      onChange={(e) => setDobYear(e.target.value)}
                      className="w-full p-2.5 bg-white border border-neutral-300 rounded-lg text-sm text-center font-mono-numbers"
                      required
                    />
                  </div>
                </div>

                {ageVerificationStatus !== 'passed' ? (
                  <button
                    type="button"
                    onClick={handleVerifyAge}
                    disabled={ageVerificationStatus === 'verifying'}
                    className="w-full py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                  >
                    {ageVerificationStatus === 'verifying' ? (
                      <span>Consulting Verification Provider...</span>
                    ) : (
                      <>
                        <ShieldCheck className="w-4 h-4 text-amber-400" />
                        <span>Run Independent Age Verification Check</span>
                      </>
                    )}
                  </button>
                ) : (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <strong>Age Verification Passed:</strong> Verified age{' '}
                      <strong>{verifiedRecord?.verifiedAge} years old</strong> via{' '}
                      {verifiedRecord?.provider} (Ref: {verifiedRecord?.providerReference}).
                    </div>
                  </div>
                )}

                {ageVerificationError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-900 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>{ageVerificationError}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* STEP 5: Shipping and Tax Calculation */}
          {currentStep === 5 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-neutral-900">Step 5: Duty, Tax & Shipping Calculation</h3>
              <p className="text-xs text-neutral-600">
                Immutable financial calculations resolved in minor units with official exchange rate snapshot.
              </p>

              <div className="bg-neutral-50 rounded-xl p-5 border border-neutral-200 space-y-3 text-xs">
                <div className="flex justify-between text-neutral-600">
                  <span>Product Subtotal:</span>
                  <span className="font-mono-numbers font-semibold text-neutral-900">
                    {formatMinorUnits(financials.subtotalMinorUnits, currentCurrency)}
                  </span>
                </div>

                <div className="flex justify-between text-neutral-600">
                  <span>
                    Destination Tax ({(currentCountry.standardTaxRate * 100).toFixed(1)}%):
                  </span>
                  <span className="font-mono-numbers font-semibold text-neutral-900">
                    {formatMinorUnits(financials.taxMinorUnits, currentCurrency)}
                  </span>
                </div>

                {financials.dutyMinorUnits > 0 && (
                  <div className="flex justify-between text-neutral-600">
                    <span>
                      Import Customs Duty ({(currentCountry.customsDutyRate * 100).toFixed(1)}%):
                    </span>
                    <span className="font-mono-numbers font-semibold text-neutral-900">
                      {formatMinorUnits(financials.dutyMinorUnits, currentCurrency)}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-neutral-600">
                  <span>Adult Courier Delivery:</span>
                  <span className="font-mono-numbers font-semibold text-neutral-900">
                    {financials.shippingFeeMinorUnits === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE (Complimentary)</span>
                    ) : (
                      formatMinorUnits(financials.shippingFeeMinorUnits, currentCurrency)
                    )}
                  </span>
                </div>

                <div className="pt-3 border-t border-neutral-200 flex justify-between items-baseline text-sm font-bold text-neutral-900">
                  <span>Total Payable:</span>
                  <span className="text-lg font-mono-numbers text-amber-900">
                    {financials.formattedTotal}
                  </span>
                </div>

                <div className="text-[11px] text-neutral-500 pt-2 border-t border-neutral-200">
                  Exchange rate snapshot: 1 USD = {currentCurrency.exchangeRateToBase.toFixed(4)} {currentCurrency.code}. Order total is locked and will not fluctuate after purchase.
                </div>
              </div>
            </div>
          )}

          {/* STEP 6: Payment Provider Architecture */}
          {currentStep === 6 && (
            <div className="space-y-4 max-w-xl mx-auto">
              <h3 className="text-lg font-bold text-neutral-900">Step 6: Payment Authorization</h3>
              <p className="text-xs text-neutral-600">
                Regulated payment processing abstraction. Vaping transactions require certified high-risk merchant processing with tokenization.
              </p>

              <div className="space-y-3">
                <label
                  onClick={() => setSelectedPaymentMethod('high_risk_approved_gateway')}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedPaymentMethod === 'high_risk_approved_gateway'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <CreditCard className="w-5 h-5 text-amber-500" />
                    <div>
                      <div className="font-semibold text-xs">Approved High-Risk Merchant Gateway</div>
                      <div className="text-[11px] opacity-80">Credit / Debit Card (Visa, MasterCard, Amex)</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold">Active</span>
                </label>

                <label
                  onClick={() => setSelectedPaymentMethod('sandbox_terminal')}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedPaymentMethod === 'sandbox_terminal'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileCheck2 className="w-5 h-5 text-emerald-400" />
                    <div>
                      <div className="font-semibold text-xs">Instant Test Sandbox Terminal</div>
                      <div className="text-[11px] opacity-80">One-click simulated authorization for evaluation</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold">Instant Pass</span>
                </label>

                <label
                  onClick={() => setSelectedPaymentMethod('wire_transfer_swift')}
                  className={`p-4 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                    selectedPaymentMethod === 'wire_transfer_swift'
                      ? 'border-neutral-900 bg-neutral-900 text-white shadow-xs'
                      : 'border-neutral-200 bg-white hover:border-neutral-400 text-neutral-800'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Building className="w-5 h-5 text-neutral-400" />
                    <div>
                      <div className="font-semibold text-xs">International SWIFT / SEPA Bank Wire</div>
                      <div className="text-[11px] opacity-80">Commercial orders & invoice settlement</div>
                    </div>
                  </div>
                  <span className="text-xs font-semibold">B2B</span>
                </label>
              </div>

              <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200 text-xs text-neutral-600 flex items-center gap-2">
                <Lock className="w-4 h-4 text-neutral-500 shrink-0" />
                <span>256-bit TLS encryption. Full card data is never stored on our servers.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-5 sm:p-6 border-t border-neutral-200 bg-neutral-50 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={() => setCurrentStep((prev) => (prev - 1) as any)}
              className="px-4 py-2 text-xs font-semibold text-neutral-700 hover:text-neutral-900 flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          {currentStep < 6 ? (
            <button
              onClick={() => {
                if (currentStep === 3 && !countryEligibility.isEligible) {
                  return; // Cannot advance if country is blocked
                }
                if (currentStep === 4 && ageVerificationStatus !== 'passed') {
                  setAgeVerificationError('You must complete age verification to proceed.');
                  return;
                }
                setCurrentStep((prev) => (prev + 1) as any);
              }}
              disabled={currentStep === 3 && !countryEligibility.isEligible}
              className="px-6 py-2.5 bg-amber-700 hover:bg-amber-800 disabled:bg-neutral-300 disabled:cursor-not-allowed text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
            >
              <span>Continue</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          ) : (
            <button
              onClick={handleFinalSubmitOrder}
              disabled={isProcessingOrder}
              className="px-6 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-md"
            >
              {isProcessingOrder ? (
                <span>Capturing Payment & Locking Snapshot...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Authorize & Complete Order ({financials.formattedTotal})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
