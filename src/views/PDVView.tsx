import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { Product, ProductVariant, Customer, PaymentMethodType, SalePayment, Sale } from '../types';
import { formatBRL, toCents, fromCents, addCurrency, subtractCurrency } from '../utils/currency';
import { ReceiptModal } from '../components/ReceiptModal';
import confetti from 'canvas-confetti';
import {
  Barcode,
  Search,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Percent,
  User,
  CreditCard,
  QrCode,
  Banknote,
  Calendar,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface CartItem {
  cartId: string;
  productId: string;
  variantId?: string;
  product: Product;
  variant?: ProductVariant;
  name: string;
  sku: string;
  barcode: string;
  unitPrice: number;
  unitCost: number;
  quantity: number;
  discount: number; // in R$
  totalPrice: number;
}

export const PDVView: React.FC = () => {
  const {
    products,
    customers,
    activeCashRegister,
    currentTenant,
    currentUser,
    executeSale,
  } = useApp();

  // Cart state
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [overallDiscount, setOverallDiscount] = useState<string>('0');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [salespersonName, setSalespersonName] = useState<string>(currentUser.fullName);
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [mobileTab, setMobileTab] = useState<'catalog' | 'cart'>('catalog');

  // Barcode / Search input
  const [searchInput, setSearchInput] = useState<string>('');
  const [searchFeedback, setSearchFeedback] = useState<string>('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Payment Modal state
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [payments, setPayments] = useState<SalePayment[]>([]);
  const [currentMethod, setCurrentMethod] = useState<PaymentMethodType>('pix');
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [installmentsInput, setInstallmentsInput] = useState<number>(1);
  const [receivedCashInput, setReceivedCashInput] = useState<string>('');

  // Completed sale receipt modal
  const [completedSale, setCompletedSale] = useState<Sale | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  // Keep focus on barcode reader
  useEffect(() => {
    searchInputRef.current?.focus();
  }, [cartItems, isPaymentModalOpen]);

  // Global keyboard shortcuts (F2, F4, F8, Esc)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F2') {
        e.preventDefault();
        searchInputRef.current?.focus();
      } else if (e.key === 'F8') {
        e.preventDefault();
        if (cartItems.length > 0 && !isPaymentModalOpen) {
          handleOpenPaymentModal();
        }
      } else if (e.key === 'Escape') {
        if (isPaymentModalOpen) {
          setIsPaymentModalOpen(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [cartItems, isPaymentModalOpen]);

  // Cart Totals Calculation
  const subtotal = cartItems.reduce((acc, item) => addCurrency(acc, item.totalPrice), 0);
  const discountVal = parseFloat(overallDiscount) || 0;
  const netTotal = Math.max(0, subtractCurrency(subtotal, discountVal));

  // Add product to cart
  const addToCart = (product: Product, variant?: ProductVariant) => {
    setSearchFeedback('');
    let unitPrice = variant?.salePrice || product.salePrice;
    let unitCost = variant?.costPrice || product.costPrice;
    let sku = variant?.sku || product.sku;
    let barcode = variant?.barcode || product.barcode;
    let variantSuffix = variant ? ` (${variant.size || ''} ${variant.color || ''})` : '';

    const cartId = `${product.id}-${variant?.id || 'standard'}`;

    setCartItems((prev) => {
      const existing = prev.find((item) => item.cartId === cartId);
      if (existing) {
        return prev.map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + 1;
            const newTotal = fromCents(Math.round(toCents(item.unitPrice) * newQty - toCents(item.discount)));
            return { ...item, quantity: newQty, totalPrice: newTotal };
          }
          return item;
        });
      }

      const newItem: CartItem = {
        cartId,
        productId: product.id,
        variantId: variant?.id,
        product,
        variant,
        name: `${product.name}${variantSuffix}`,
        sku,
        barcode,
        unitPrice,
        unitCost,
        quantity: 1,
        discount: 0,
        totalPrice: unitPrice,
      };
      return [...prev, newItem];
    });

    setSearchInput('');
  };

  // Barcode / SKU / Name search handler
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchInput.trim().toLowerCase();
    if (!query) return;

    // 1. Direct barcode match on products or variants
    let matchedProduct: Product | undefined;
    let matchedVariant: ProductVariant | undefined;

    for (const prod of products) {
      if (prod.barcode && prod.barcode.toLowerCase() === query) {
        matchedProduct = prod;
        break;
      }
      if (prod.sku && prod.sku.toLowerCase() === query) {
        matchedProduct = prod;
        break;
      }
      if (prod.variants) {
        const vMatch = prod.variants.find(
          (v) => (v.barcode && v.barcode.toLowerCase() === query) || (v.sku && v.sku.toLowerCase() === query)
        );
        if (vMatch) {
          matchedProduct = prod;
          matchedVariant = vMatch;
          break;
        }
      }
    }

    // 2. Fallback: search by name
    if (!matchedProduct) {
      matchedProduct = products.find((p) => p.name.toLowerCase().includes(query));
      if (matchedProduct && matchedProduct.variants && matchedProduct.variants.length > 0) {
        matchedVariant = matchedProduct.variants[0];
      }
    }

    if (matchedProduct) {
      addToCart(matchedProduct, matchedVariant);
      setSearchFeedback(`Adicionado: ${matchedProduct.name}`);
      setTimeout(() => setSearchFeedback(''), 1500);
    } else {
      setSearchFeedback(`Produto não encontrado com código: "${query}"`);
    }
  };

  // Cart item modifications
  const updateQuantity = (cartId: string, delta: number) => {
    setCartItems((prev) =>
      prev
        .map((item) => {
          if (item.cartId === cartId) {
            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            const newTotal = fromCents(Math.round(toCents(item.unitPrice) * newQty - toCents(item.discount)));
            return { ...item, quantity: newQty, totalPrice: newTotal };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeItem = (cartId: string) => {
    setCartItems((prev) => prev.filter((item) => item.cartId !== cartId));
  };

  const clearCart = () => {
    setCartItems([]);
    setOverallDiscount('0');
    setSearchFeedback('');
    setErrorMessage('');
  };

  // Open Payment Modal
  const handleOpenPaymentModal = () => {
    if (cartItems.length === 0) return;
    setPayments([
      {
        paymentMethod: 'pix',
        amount: netTotal,
        installments: 1,
        changeAmount: 0,
      },
    ]);
    setPaymentAmountInput(netTotal.toFixed(2));
    setInstallmentsInput(1);
    setReceivedCashInput(netTotal.toFixed(2));
    setIsPaymentModalOpen(true);
  };

  // Split payment helpers
  const paidTotal = payments.reduce((acc, p) => addCurrency(acc, p.amount), 0);
  const remainingToPay = Math.max(0, subtractCurrency(netTotal, paidTotal));

  const addPaymentMethod = () => {
    const amt = parseFloat(paymentAmountInput);
    if (isNaN(amt) || amt <= 0) return;

    const newPayment: SalePayment = {
      paymentMethod: currentMethod,
      amount: amt,
      installments: currentMethod === 'crediario' || currentMethod === 'cartao_credito' ? installmentsInput : 1,
      changeAmount: 0,
    };

    setPayments((prev) => [...prev, newPayment]);

    // Recalculate remaining for next payment
    const newRemaining = Math.max(0, subtractCurrency(netTotal, addCurrency(paidTotal, amt)));
    setPaymentAmountInput(newRemaining.toFixed(2));
    if (currentMethod === 'dinheiro') {
      setReceivedCashInput(amt.toFixed(2));
    }
  };

  const removePaymentMethod = (index: number) => {
    setPayments((prev) => prev.filter((_, i) => i !== index));
  };

  // Change calculation for cash payment
  const cashPayments = payments.filter((p) => p.paymentMethod === 'dinheiro');
  const cashTotal = cashPayments.reduce((acc, p) => addCurrency(acc, p.amount), 0);
  const receivedCash = parseFloat(receivedCashInput) || cashTotal;
  const changeAmount = Math.max(0, subtractCurrency(receivedCash, cashTotal));

  // Finish Sale
  const handleFinishSale = () => {
    setErrorMessage('');

    if (Math.abs(paidTotal - netTotal) > 0.05) {
      setErrorMessage(`O total dos pagamentos (${formatBRL(paidTotal)}) deve coincidir com o total da venda (${formatBRL(netTotal)}).`);
      return;
    }

    const payload = {
      items: cartItems.map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        discount: item.discount,
      })),
      payments: payments.map((p) => {
        if (p.paymentMethod === 'dinheiro') {
          return { ...p, changeAmount };
        }
        return p;
      }),
      customerId: selectedCustomerId || undefined,
      salespersonName,
      notes: saleNotes,
    };

    const result = executeSale(payload);

    if (result.success && result.sale) {
      // Confetti celebration
      try {
        confetti({
          particleCount: 80,
          spread: 60,
          origin: { y: 0.6 },
          colors: ['#6D28D9', '#FF6B6B', '#10B981', '#3B82F6'],
        });
      } catch (e) {
        // Safe fallback
      }

      setIsPaymentModalOpen(false);
      setCompletedSale(result.sale);
      clearCart();
    } else {
      setErrorMessage(result.error || 'Erro ao processar a venda.');
    }
  };

  const selectedCustomer = customers.find((c) => c.id === selectedCustomerId);

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-61px)] overflow-hidden bg-slate-950">
      {/* Alert if Cash Register is closed */}
      {!activeCashRegister && (
        <div className="bg-amber-500/20 border-b border-amber-500/40 px-4 py-2 text-xs text-amber-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-400" />
            <span>Atenção: O caixa deste terminal está FECHADO. Abra o caixa para registrar vendas financeiras normais.</span>
          </div>
        </div>
      )}

      {/* Mobile PDV Segmented Switcher */}
      <div className="lg:hidden flex border-b border-slate-800 bg-slate-900/90 p-2 gap-2 text-xs shrink-0">
        <button
          type="button"
          onClick={() => setMobileTab('catalog')}
          className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'catalog'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Catálogo</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab('cart')}
          className={`flex-1 py-2 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-all ${
            mobileTab === 'cart'
              ? 'bg-purple-600 text-white shadow-md'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>Carrinho ({cartItems.reduce((a, b) => a + b.quantity, 0)})</span>
          {netTotal > 0 && <span className="text-emerald-400 font-mono">· {formatBRL(netTotal)}</span>}
        </button>
      </div>

      {/* Main PDV Workspace: Split in 2 panels on desktop, tabbed on mobile */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left Side: Product Search, Catalog & Fast Barcode Entry */}
        <div
          className={`flex-1 flex flex-col border-r border-slate-800 bg-slate-900/60 p-3 sm:p-4 overflow-hidden ${
            mobileTab === 'cart' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Barcode Search Box */}
          <div className="mb-4">
            <form onSubmit={handleSearchSubmit} className="relative">
              <div className="flex items-center bg-slate-800 border-2 border-purple-500/60 rounded-xl px-3 py-2.5 shadow-lg shadow-purple-950/30 focus-within:border-purple-400 transition-all">
                <Barcode className="w-6 h-6 text-purple-400 mr-2 shrink-0 animate-pulse" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Escaneie o código de barras ou digite SKU / Nome do produto (F2)..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full bg-transparent text-white text-sm font-semibold placeholder:text-slate-500 focus:outline-none"
                  autoFocus
                />
                <button
                  type="submit"
                  className="ml-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg transition-colors"
                >
                  Adicionar
                </button>
              </div>
            </form>

            {/* Live Search Feedback */}
            {searchFeedback && (
              <p className="mt-1 text-xs font-semibold text-emerald-400 pl-1 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5" />
                {searchFeedback}
              </p>
            )}
          </div>

          {/* Quick Product Grid for Touch & Click */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex items-center justify-between pb-2">
              <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                Catálogo Rápido de Produtos
              </span>
              <span className="text-xs text-slate-500">{products.length} itens cadastrados</span>
            </div>

            <div className="flex-1 overflow-y-auto pr-1 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2.5">
              {products
                .filter((p) => p.isActive)
                .map((product) => {
                  const hasVariants = product.variants && product.variants.length > 0;
                  const isLowStock = product.currentStock <= product.minStock;

                  return (
                    <div
                      key={product.id}
                      className="bg-slate-800/90 hover:bg-slate-800 border border-slate-700/60 hover:border-purple-500/50 rounded-xl p-2.5 flex flex-col justify-between transition-all group shadow-xs"
                    >
                      <div>
                        {product.imageUrl && (
                          <div className="w-full h-20 rounded-lg overflow-hidden mb-2 bg-slate-900">
                            <img
                              src={product.imageUrl}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <h4 className="text-xs font-bold text-white line-clamp-2 leading-tight">
                            {product.name}
                          </h4>
                          {isLowStock && (
                            <span className="bg-amber-500/20 text-amber-300 text-[9px] font-bold px-1.5 py-0.5 rounded-sm shrink-0 border border-amber-500/30">
                              {product.currentStock} UN
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono">{product.sku}</p>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-700/60 flex items-center justify-between">
                        <span className="text-sm font-extrabold text-emerald-400">
                          {formatBRL(product.salePrice)}
                        </span>

                        {hasVariants ? (
                          <div className="relative group/var">
                            <button className="bg-slate-700 hover:bg-purple-600 text-white text-[10px] font-bold px-2 py-1 rounded-md flex items-center gap-1 transition-colors">
                              <span>Grades</span>
                              <ChevronDown className="w-3 h-3" />
                            </button>
                            {/* Variant dropdown */}
                            <div className="absolute right-0 bottom-full mb-1 hidden group-hover/var:block bg-slate-900 border border-slate-700 rounded-lg shadow-xl p-1.5 z-20 w-44">
                              <p className="text-[9px] text-slate-400 font-semibold px-1 pb-1">Selecione o tamanho/cor:</p>
                              {product.variants?.map((v) => (
                                <button
                                  key={v.id}
                                  onClick={() => addToCart(product, v)}
                                  className="w-full text-left px-2 py-1 hover:bg-purple-600 text-white text-xs rounded-sm flex justify-between items-center transition-colors"
                                >
                                  <span>{v.size || ''} {v.color || ''}</span>
                                  <span className="text-[10px] text-slate-300 font-mono">{v.stockQuantity} un</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-1.5 rounded-lg shadow-md shadow-purple-950/40 transition-colors"
                            title="Adicionar ao Carrinho"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Mobile floating bottom bar when items exist */}
            {cartItems.length > 0 && (
              <div className="lg:hidden mt-2 p-2.5 rounded-xl bg-purple-950/80 border border-purple-500/40 backdrop-blur-md flex items-center justify-between shrink-0 shadow-lg">
                <div>
                  <span className="text-[10px] text-slate-300 block font-semibold">
                    {cartItems.reduce((a, b) => a + b.quantity, 0)} item(s) no carrinho
                  </span>
                  <span className="text-sm font-black text-emerald-400 font-mono">{formatBRL(netTotal)}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setMobileTab('cart')}
                    className="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                  >
                    <span>Ver Carrinho</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenPaymentModal}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1 shadow-md"
                  >
                    <span>Pagar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Side: Virtual Cart, Client, Totals & Checkout */}
        <div
          className={`w-full lg:w-[420px] bg-slate-900 flex flex-col justify-between shrink-0 shadow-xl ${
            mobileTab === 'catalog' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Header Cart Info */}
          <div className="p-3 bg-slate-800/80 border-b border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-white text-xs uppercase tracking-wider">
                  Carrinho de Venda ({cartItems.reduce((a, b) => a + b.quantity, 0)} itens)
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setMobileTab('catalog')}
                  className="lg:hidden text-purple-400 hover:text-purple-300 text-xs font-semibold px-2 py-0.5 rounded-md bg-purple-950/50 border border-purple-500/30"
                >
                  + Catálogo
                </button>
                {cartItems.length > 0 && (
                  <button
                    onClick={clearCart}
                    className="text-slate-400 hover:text-rose-400 text-xs font-semibold flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Limpar</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customer selector */}
            <div className="flex items-center gap-2 bg-slate-900 px-2 py-1.5 rounded-lg border border-slate-700/60">
              <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="bg-transparent text-xs text-slate-200 w-full focus:outline-none cursor-pointer"
              >
                <option value="" className="bg-slate-900 text-slate-400">
                  Consumidor Final (Sem cadastro)
                </option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                    {c.name} {c.cnpjCpf ? `(${c.cnpjCpf})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Customer Crediário info badge if selected */}
            {selectedCustomer && (
              <div className="bg-purple-950/40 border border-purple-500/30 p-2 rounded-lg text-[11px] flex justify-between items-center text-purple-200">
                <span>Limite Crediário:</span>
                <span className="font-bold">
                  {formatBRL(selectedCustomer.creditLimit - selectedCustomer.creditUsed)} disponível
                </span>
              </div>
            )}
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {cartItems.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 p-6 text-center">
                <ShoppingCart className="w-12 h-12 text-slate-700 mb-3 stroke-[1.5]" />
                <p className="text-xs font-bold text-slate-400">O carrinho está vazio</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Escaneie produtos pelo leitor de código de barras ou selecione itens do catálogo ao lado.
                </p>
              </div>
            ) : (
              cartItems.map((item) => (
                <div
                  key={item.cartId}
                  className="bg-slate-800/80 border border-slate-700/60 rounded-xl p-2.5 flex items-center justify-between gap-2 shadow-xs"
                >
                  <div className="flex-1 min-w-0">
                    <h5 className="text-xs font-bold text-white truncate">{item.name}</h5>
                    <p className="text-[10px] text-slate-400 font-mono">
                      {item.quantity} x {formatBRL(item.unitPrice)}
                    </p>
                  </div>

                  {/* Quantity controls */}
                  <div className="flex items-center gap-1 bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                    <button
                      onClick={() => updateQuantity(item.cartId, -1)}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-white px-1.5 min-w-[20px] text-center">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateQuantity(item.cartId, 1)}
                      className="p-1 text-slate-400 hover:text-white rounded-md hover:bg-slate-800"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>

                  {/* Item total */}
                  <div className="text-right min-w-[70px]">
                    <span className="text-xs font-black text-white">{formatBRL(item.totalPrice)}</span>
                  </div>

                  <button
                    onClick={() => removeItem(item.cartId)}
                    className="text-slate-500 hover:text-rose-400 p-1"
                    title="Remover item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {/* Footer Totals & Checkout Button */}
          <div className="p-4 bg-slate-800/90 border-t border-slate-800 space-y-3">
            {/* Discount input */}
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span className="flex items-center gap-1">
                <Percent className="w-3.5 h-3.5 text-purple-400" />
                Desconto na Venda (R$):
              </span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={overallDiscount}
                onChange={(e) => setOverallDiscount(e.target.value)}
                className="w-24 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-white font-bold text-xs focus:outline-none focus:border-purple-500"
              />
            </div>

            <div className="space-y-1 pt-1 border-t border-slate-700/60">
              <div className="flex justify-between text-xs text-slate-400">
                <span>Subtotal:</span>
                <span>{formatBRL(subtotal)}</span>
              </div>
              {discountVal > 0 && (
                <div className="flex justify-between text-xs text-emerald-400 font-semibold">
                  <span>Desconto:</span>
                  <span>- {formatBRL(discountVal)}</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="text-sm font-bold text-slate-200">Total a Pagar:</span>
                <span className="text-2xl font-black text-emerald-400 font-['Montserrat']">
                  {formatBRL(netTotal)}
                </span>
              </div>
            </div>

            {/* Big Finish Button */}
            <button
              onClick={handleOpenPaymentModal}
              disabled={cartItems.length === 0}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm shadow-xl shadow-purple-950/50 flex items-center justify-center gap-2 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <span>Ir para Pagamento (F8)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Payment Selection & Split Payment Modal */}
      {isPaymentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col">
            {/* Modal Header */}
            <div className="p-4 bg-slate-800 border-b border-slate-700 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Finalização de Venda</h3>
                <p className="text-xs text-slate-400">Total da venda: {formatBRL(netTotal)}</p>
              </div>
              <button
                onClick={() => setIsPaymentModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                ✕
              </button>
            </div>

            {errorMessage && (
              <div className="mx-4 mt-4 p-3 bg-rose-500/20 border border-rose-500/40 text-rose-300 rounded-xl text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="p-6 space-y-5">
              {/* Payment Methods Tabs */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Selecione a Forma de Pagamento
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                  {[
                    { id: 'pix', label: 'Pix', icon: QrCode, color: 'text-emerald-400' },
                    { id: 'dinheiro', label: 'Dinheiro', icon: Banknote, color: 'text-green-400' },
                    { id: 'cartao_credito', label: 'Crédito', icon: CreditCard, color: 'text-indigo-400' },
                    { id: 'cartao_debito', label: 'Débito', icon: CreditCard, color: 'text-blue-400' },
                    { id: 'crediario', label: 'Crediário', icon: Calendar, color: 'text-amber-400' },
                  ].map((m) => {
                    const Icon = m.icon;
                    const isSelected = currentMethod === m.id;
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setCurrentMethod(m.id as PaymentMethodType)}
                        className={`p-2.5 rounded-xl border flex flex-col items-center justify-center gap-1.5 transition-all ${
                          isSelected
                            ? 'bg-purple-600/30 border-purple-500 text-white shadow-md'
                            : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        <Icon className={`w-5 h-5 ${m.color}`} />
                        <span className="text-xs font-bold">{m.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method specific inputs */}
              <div className="bg-slate-800/60 p-4 rounded-xl border border-slate-700 space-y-3">
                <div className="flex gap-3">
                  <div className="flex-1">
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Valor deste Pagamento (R$)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={paymentAmountInput}
                      onChange={(e) => setPaymentAmountInput(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-purple-500"
                    />
                  </div>

                  {(currentMethod === 'cartao_credito' || currentMethod === 'crediario') && (
                    <div className="w-32">
                      <label className="block text-xs font-semibold text-slate-300 mb-1">
                        Parcelas
                      </label>
                      <select
                        value={installmentsInput}
                        onChange={(e) => setInstallmentsInput(parseInt(e.target.value))}
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold text-sm focus:outline-none focus:border-purple-500"
                      >
                        {[1, 2, 3, 4, 5, 6, 10, 12].map((n) => (
                          <option key={n} value={n}>
                            {n}x de {formatBRL((parseFloat(paymentAmountInput) || 0) / n)}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>

                {/* Cash change calculator */}
                {currentMethod === 'dinheiro' && (
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-400">
                        Valor Recebido do Cliente:
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={receivedCashInput}
                        onChange={(e) => setReceivedCashInput(e.target.value)}
                        className="bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-white text-xs font-bold w-28 focus:outline-none focus:border-purple-500 mt-1"
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[11px] text-slate-400">Troco a Devolver:</span>
                      <p className="text-base font-black text-emerald-400">
                        {formatBRL(changeAmount)}
                      </p>
                    </div>
                  </div>
                )}

                {/* Add payment split button */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={addPaymentMethod}
                    className="px-3 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold transition-colors"
                  >
                    + Registrar Forma de Pagamento
                  </button>
                </div>
              </div>

              {/* Recorded payments breakdown */}
              {payments.length > 0 && (
                <div className="space-y-1.5">
                  <span className="text-xs font-bold text-slate-400 uppercase">
                    Pagamentos Lançados ({payments.length})
                  </span>
                  {payments.map((p, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-800 border border-slate-700 rounded-xl p-2.5 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-white uppercase">{p.paymentMethod}</span>
                        {p.installments > 1 && (
                          <span className="text-slate-400">({p.installments}x)</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-bold text-emerald-400">{formatBRL(p.amount)}</span>
                        <button
                          type="button"
                          onClick={() => removePaymentMethod(idx)}
                          className="text-slate-400 hover:text-rose-400"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Balance comparison */}
              <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <div>
                  <span className="text-slate-400">Total Pago: </span>
                  <span className="font-bold text-white">{formatBRL(paidTotal)}</span>
                </div>
                <div>
                  <span className="text-slate-400">Falta Pagar: </span>
                  <span
                    className={`font-black ${
                      remainingToPay > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatBRL(remainingToPay)}
                  </span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-800 border-t border-slate-700 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-300 font-semibold text-xs"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleFinishSale}
                disabled={remainingToPay > 0.05}
                className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-950/40 transition-all hover:scale-[1.02]"
              >
                Concluir Venda e Gerar Cupom
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Sale Receipt Modal */}
      {completedSale && (
        <ReceiptModal
          sale={completedSale}
          onClose={() => setCompletedSale(null)}
        />
      )}
    </div>
  );
};
