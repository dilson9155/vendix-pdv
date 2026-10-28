"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Banknote,
  CheckCircle2,
  Loader2,
  Minus,
  Plus,
  Printer,
  ScanBarcode,
  Search,
  ShoppingCart,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatBRL } from "@/lib/money";
import type { PosProduct } from "@/services/catalog.service";
import {
  barcodeLookupAction,
  searchCustomersAction,
  searchPdvProductsAction,
} from "@/app/actions/pos.actions";
import { createSaleAction, openCashAction, shareReceiptAction } from "@/app/actions/sales.actions";

type PaymentMethod = {
  id: string;
  name: string;
  kind: string;
  requiresCustomer: boolean;
};

type SessionInfo = { id: string; terminalName: string; branchId: string; branchName: string } | null;

type CartItem = PosProduct & { quantity: number; discount: number };

type CustomerOption = { id: string; name: string; phone: string | null };

type PaymentLine = { key: string; methodId: string; amount: string; installments: number };

const KIND_LABEL: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Débito",
  CREDITO: "Crédito",
  TRANSFERENCIA: "Transferência",
  CREDITO_LOJA: "Crediário",
  OUTROS: "Outros",
};

export function PdvTerminal({
  branchId,
  branches,
  session,
  methods,
  maxDiscountPercent,
  requireCustomerOnCredit,
}: {
  branchId: string | null;
  branches: Array<{ id: string; name: string }>;
  session: SessionInfo;
  methods: PaymentMethod[];
  maxDiscountPercent: number;
  requireCustomerOnCredit: boolean;
}) {
  const router = useRouter();
  const idempotencyKey = useRef(crypto.randomUUID());
  const searchInput = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PosProduct[]>([]);
  const [searching, setSearching] = useState(false);
  const [cart, setCart] = useState<CartItem[]>([]);

  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerResults, setCustomerResults] = useState<CustomerOption[]>([]);

  const [globalDiscount, setGlobalDiscount] = useState("");
  const [payments, setPayments] = useState<PaymentLine[]>(() => [
    { key: crypto.randomUUID(), methodId: methods[0]?.id ?? "", amount: "", installments: 1 },
  ]);

  const [success, setSuccess] = useState<{ id: string; documentNumber: string } | null>(null);
  const [sharePhone, setSharePhone] = useState("");
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);

  const [openAmount, setOpenAmount] = useState("");
  const [openTerminal, setOpenTerminal] = useState("Caixa 1");
  const [openBranch, setOpenBranch] = useState(branchId ?? branches[0]?.id ?? "");

  const subtotal = useMemo(
    () => cart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [cart]
  );
  const itemDiscounts = useMemo(
    () => cart.reduce((sum, item) => sum + (item.discount || 0), 0),
    [cart]
  );
  const discount = Math.min(Number(globalDiscount.replace(",", ".")) || 0, subtotal);
  const total = Math.max(0, subtotal - discount);
  const paid = useMemo(
    () => payments.reduce((sum, line) => sum + (Number(line.amount.replace(",", ".")) || 0), 0),
    [payments]
  );
  const missing = Math.max(0, total - paid);
  const change = Math.max(0, paid - total);
  const selectedKinds = payments.map(
    (line) => methods.find((method) => method.id === line.methodId)?.kind ?? ""
  );
  const hasCredit = selectedKinds.includes("CREDITO_LOJA");
  const creditNeedsCustomer = hasCredit && requireCustomerOnCredit && !customerId;
  const maxDiscountValue = (subtotal * maxDiscountPercent) / 100;

  function addProduct(product: PosProduct) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.productId === product.productId && item.variantId === product.variantId
      );
      if (existing) {
        return current.map((item) =>
          item === existing ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...current, { ...product, quantity: 1, discount: 0 }];
    });
    setTerm("");
    setResults([]);
    searchInput.current?.focus();
  }

  async function search(value: string) {
    setTerm(value);
    if (value.trim().length < 2) {
      setResults([]);
      return;
    }
    setSearching(true);
    const result = await searchPdvProductsAction(value, branchId ?? undefined);
    setSearching(false);
    if (result.ok) setResults(result.data ?? []);
  }

  async function barcode(value: string) {
    if (!value.trim()) return;
    setSearching(true);
    const result = await barcodeLookupAction(value.trim(), branchId ?? undefined);
    setSearching(false);
    setTerm("");
    setResults([]);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    if (!result.data) {
      setError("Código de barras não encontrado nesta empresa.");
      return;
    }
    setError(null);
    addProduct(result.data);
  }

  async function searchCustomer(value: string) {
    setCustomerName(value);
    if (value.trim().length < 2) {
      setCustomerResults([]);
      return;
    }
    const result = await searchCustomersAction(value);
    if (result.ok) setCustomerResults(result.data ?? []);
  }

  function updateQuantity(index: number, delta: number) {
    setCart((current) =>
      current
        .map((item, i) => (i === index ? { ...item, quantity: Math.max(0, item.quantity + delta) } : item))
        .filter((item) => item.quantity > 0)
    );
  }

  function distributeRemaining() {
    setPayments((current) => {
      const base = [...current];
      if (!base.length) return base;
      const others = base
        .slice(0, -1)
        .reduce((sum, line) => sum + (Number(line.amount.replace(",", ".")) || 0), 0);
      base[base.length - 1] = {
        ...base[base.length - 1],
        amount: Math.max(0, total - others).toFixed(2),
      };
      return base;
    });
  }

  function submit() {
    setError(null);
    if (!cart.length) {
      setError("Adicione ao menos um item à venda.");
      return;
    }
    if (!session) {
      setError("Abra o caixa antes de registrar vendas.");
      return;
    }
    if (creditNeedsCustomer) {
      setError("Vendas no crediário exigem um cliente identificado.");
      return;
    }
    const validPayments = payments.filter(
      (line) => Number(line.amount.replace(",", ".")) > 0 && line.methodId
    );
    if (!validPayments.length) {
      setError("Informe ao menos uma forma de pagamento.");
      return;
    }
    if (paid + 0.005 < total) {
      setError(`Faltam ${formatBRL(missing)} para fechar a venda.`);
      return;
    }

    startTransition(async () => {
      const result = await createSaleAction({
        branchId: session.branchId,
        cashSessionId: session.id,
        customerId: customerId || undefined,
        items: cart.map((item) => ({
          productId: item.productId,
          variantId: item.variantId ?? undefined,
          quantity: item.quantity,
          unitPrice: item.price,
          discount: item.discount || 0,
        })),
        payments: validPayments.map((line) => ({
          paymentMethodId: line.methodId,
          amount: Number(line.amount.replace(",", ".")),
          installments: line.installments,
        })),
        discount: discount,
        idempotencyKey: idempotencyKey.current,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setSuccess(result.data ?? null);
      setCart([]);
      setGlobalDiscount("");
      setCustomerId("");
      setCustomerName("");
      setCustomerResults([]);
      setPayments([
        { key: crypto.randomUUID(), methodId: methods[0]?.id ?? "", amount: "", installments: 1 },
      ]);
      idempotencyKey.current = crypto.randomUUID();
      router.refresh();
    });
  }

  if (!session) {
    return (
      <div className="mx-auto max-w-lg rounded-xl border bg-card p-5 shadow-sm">
        <h2 className="flex items-center gap-2 text-lg font-semibold">
          <Banknote className="size-5 text-primary" /> Abrir caixa
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          O PDV só registra vendas com um caixa aberto. Informe o valor inicial (fundo de troco).
        </p>
        {branches.length > 1 && (
          <div className="mt-4 space-y-1.5">
            <Label htmlFor="open-branch">Unidade</Label>
            <select
              id="open-branch"
              value={openBranch}
              onChange={(event) => setOpenBranch(event.target.value)}
              className="h-10 w-full rounded-lg border bg-background px-3 text-sm"
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="open-terminal">Terminal</Label>
          <Input
            id="open-terminal"
            value={openTerminal}
            onChange={(event) => setOpenTerminal(event.target.value)}
            maxLength={60}
          />
        </div>
        <div className="mt-3 space-y-1.5">
          <Label htmlFor="open-amount">Fundo de troco</Label>
          <Input
            id="open-amount"
            inputMode="decimal"
            placeholder="0,00"
            value={openAmount}
            onChange={(event) => setOpenAmount(event.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <Button
          className="mt-4 w-full"
          disabled={pending}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              const result = await openCashAction({
                branchId: openBranch,
                terminalName: openTerminal,
                openingAmount: Number(openAmount.replace(",", ".")) || 0,
              });
              if (!result.ok) setError(result.error);
              else router.refresh();
            })
          }
        >
          {pending && <Loader2 className="size-4 animate-spin" />}
          Abrir caixa
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 xl:grid-cols-[1.35fr_0.9fr]">
      <div className="space-y-3">
        <div className="rounded-xl border bg-card p-3 shadow-sm">
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                ref={searchInput}
                value={term}
                onChange={(event) => void search(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    if (results.length === 1) addProduct(results[0]);
                    else void barcode(term);
                  }
                }}
                placeholder="Buscar por nome, SKU ou código de barras"
                className="h-11 pl-9 text-base"
                autoFocus
                aria-label="Buscar produto"
              />
              {searching && (
                <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-11"
                onClick={() =>
                  startTransition(async () => {
                    const code = window.prompt("Código de barras");
                    if (code) await barcode(code);
                  })
                }
              >
                <ScanBarcode className="size-4" /> Bipar
              </Button>
            </div>
          </div>

          {results.length > 0 && (
            <div className="mt-2 max-h-72 overflow-y-auto rounded-lg border">
              {results.map((product) => (
                <button
                  key={`${product.productId}-${product.variantId ?? ""}`}
                  type="button"
                  onClick={() => addProduct(product)}
                  className="flex w-full items-center justify-between gap-3 border-b px-3 py-2 text-left last:border-b-0 hover:bg-muted/60"
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {product.name}
                      {product.variantLabel ? ` · ${product.variantLabel}` : ""}
                    </span>
                    <span className="block text-[11px] text-muted-foreground">
                      {product.sku} · estoque {product.stock} {product.unit}
                    </span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold">{formatBRL(product.price)}</span>
                </button>
              ))}
            </div>
          )}
          {term.length >= 2 && !searching && results.length === 0 && (
            <p className="mt-2 text-xs text-muted-foreground">Nenhum produto ativo encontrado.</p>
          )}
        </div>

        <div className="rounded-xl border bg-card shadow-sm">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h2 className="flex items-center gap-2 text-sm font-semibold">
              <ShoppingCart className="size-4 text-primary" /> Carrinho
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px]">
                {cart.reduce((sum, item) => sum + item.quantity, 0)} item(ns)
              </span>
            </h2>
            {cart.length > 0 && (
              <button
                type="button"
                className="text-xs font-medium text-destructive hover:underline"
                onClick={() => setCart([])}
              >
                Limpar
              </button>
            )}
          </div>
          {cart.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <ShoppingCart className="mx-auto size-9 text-muted-foreground/40" />
              <p className="mt-2 text-sm font-medium">Carrinho vazio</p>
              <p className="text-xs text-muted-foreground">
                Busque um produto ou bipе um código para começar.
              </p>
            </div>
          ) : (
            <ul className="divide-y">
              {cart.map((item, index) => (
                <li key={`${item.productId}-${item.variantId ?? ""}`} className="flex gap-3 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {item.name}
                      {item.variantLabel ? ` · ${item.variantLabel}` : ""}
                    </p>
                    <p className="text-[11px] text-muted-foreground">
                      {item.sku} · {formatBRL(item.price)} / {item.unit}
                    </p>
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex items-center rounded-lg border">
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center hover:bg-muted"
                          onClick={() => updateQuantity(index, -1)}
                          aria-label={`Diminuir ${item.name}`}
                        >
                          <Minus className="size-3.5" />
                        </button>
                        <span className="min-w-8 text-center text-sm tabular-nums">{item.quantity}</span>
                        <button
                          type="button"
                          className="flex size-8 items-center justify-center hover:bg-muted"
                          onClick={() => updateQuantity(index, 1)}
                          aria-label={`Aumentar ${item.name}`}
                        >
                          <Plus className="size-3.5" />
                        </button>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] text-muted-foreground">Desc.</span>
                        <Input
                          inputMode="decimal"
                          value={item.discount || ""}
                          onChange={(event) =>
                            setCart((current) =>
                              current.map((row, i) =>
                                i === index
                                  ? { ...row, discount: Number(event.target.value.replace(",", ".")) || 0 }
                                  : row
                              )
                            )
                          }
                          className="h-8 w-20 text-right text-xs"
                          aria-label={`Desconto do item ${item.name}`}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end justify-between">
                    <span className="text-sm font-semibold tabular-nums">
                      {formatBRL(Math.max(0, item.price * item.quantity - item.discount))}
                    </span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-destructive"
                      onClick={() => setCart((current) => current.filter((_, i) => i !== index))}
                      aria-label={`Remover ${item.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="space-y-3 xl:sticky xl:top-20 xl:self-start">
        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <UserRound className="size-4 text-primary" /> Cliente
            <span className="text-[10px] font-normal text-muted-foreground">(opcional)</span>
          </h2>
          {customerId ? (
            <div className="mt-2 flex items-center justify-between rounded-lg bg-muted px-3 py-2">
              <span className="truncate text-sm font-medium">{customerName}</span>
              <button
                type="button"
                onClick={() => {
                  setCustomerId("");
                  setCustomerName("");
                }}
                className="text-muted-foreground hover:text-destructive"
                aria-label="Remover cliente"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <div className="relative mt-2">
              <Input
                value={customerName}
                onChange={(event) => void searchCustomer(event.target.value)}
                placeholder="Buscar por nome, CPF ou telefone"
                className="h-9"
              />
              {customerResults.length > 0 && (
                <div className="absolute z-20 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border bg-popover shadow-lg">
                  {customerResults.map((customer) => (
                    <button
                      key={customer.id}
                      type="button"
                      className="block w-full border-b px-3 py-2 text-left text-sm last:border-b-0 hover:bg-muted"
                      onClick={() => {
                        setCustomerId(customer.id);
                        setCustomerName(customer.name);
                        setCustomerResults([]);
                      }}
                    >
                      <span className="block font-medium">{customer.name}</span>
                      {customer.phone && (
                        <span className="block text-[11px] text-muted-foreground">{customer.phone}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <Banknote className="size-4 text-primary" /> Pagamento
          </h2>
          <div className="mt-2 space-y-2">
            {payments.map((line, index) => {
              const method = methods.find((item) => item.id === line.methodId);
              return (
                <div key={line.key} className="rounded-lg border p-2">
                  <div className="flex gap-2">
                    <select
                      value={line.methodId}
                      onChange={(event) =>
                        setPayments((current) =>
                          current.map((row, i) =>
                            i === index ? { ...row, methodId: event.target.value } : row
                          )
                        )
                      }
                      className="h-9 min-w-0 flex-1 rounded-lg border bg-background px-2 text-sm"
                      aria-label="Forma de pagamento"
                    >
                      {methods.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name}
                        </option>
                      ))}
                    </select>
                    <Input
                      inputMode="decimal"
                      value={line.amount}
                      onChange={(event) =>
                        setPayments((current) =>
                          current.map((row, i) =>
                            i === index ? { ...row, amount: event.target.value } : row
                          )
                        )
                      }
                      onBlur={() => {
                        if (!line.amount && payments.length === 1) distributeRemaining();
                      }}
                      placeholder="0,00"
                      className="h-9 w-28 text-right"
                      aria-label="Valor do pagamento"
                    />
                    {payments.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPayments((current) => current.filter((_, i) => i !== index))}
                        className="px-1 text-muted-foreground hover:text-destructive"
                        aria-label="Remover forma de pagamento"
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </div>
                  {method?.kind === "CREDITO" && (
                    <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Parcelas</span>
                      <select
                        value={line.installments}
                        onChange={(event) =>
                          setPayments((current) =>
                            current.map((row, i) =>
                              i === index ? { ...row, installments: Number(event.target.value) } : row
                            )
                          )
                        }
                        className="h-8 rounded-md border bg-background px-2 text-xs"
                      >
                        {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((n) => (
                          <option key={n} value={n}>
                            {n}x
                          </option>
                        ))}
                      </select>
                      <span className="text-[10px]">Compra no cartão não gera conta a receber.</span>
                    </div>
                  )}
                  {method?.kind === "CREDITO_LOJA" && (
                    <p className="mt-1 text-[10px] font-medium text-amber-700">
                      Gera conta a receber para o cliente.
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-2 flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() =>
                setPayments((current) => [
                  ...current,
                  { key: crypto.randomUUID(), methodId: methods[0]?.id ?? "", amount: "", installments: 1 },
                ])
              }
            >
              <Plus className="size-3.5" /> Dividir pagamento
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={distributeRemaining}>
              Restante
            </Button>
          </div>

          <dl className="mt-4 space-y-1.5 border-t pt-3 text-sm">
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Subtotal</dt>
              <dd className="tabular-nums">{formatBRL(subtotal)}</dd>
            </div>
            {itemDiscounts > 0 && (
              <div className="flex justify-between text-xs text-muted-foreground">
                <dt>Desconto nos itens</dt>
                <dd className="tabular-nums">- {formatBRL(itemDiscounts)}</dd>
              </div>
            )}
            <div className="flex items-center justify-between text-xs">
              <dt className="text-muted-foreground">
                Desconto na venda{" "}
                <span className="text-[10px]">(máx. {maxDiscountPercent}% sem autorização)</span>
              </dt>
              <dd>
                <Input
                  inputMode="decimal"
                  value={globalDiscount}
                  onChange={(event) => setGlobalDiscount(event.target.value)}
                  placeholder="0,00"
                  className="h-8 w-24 text-right text-xs"
                  aria-label="Desconto na venda"
                />
              </dd>
            </div>
            {discount > maxDiscountValue && (
              <p className="text-[11px] text-amber-700">
                O desconto excede a política do perfil; a venda pode ser recusada.
              </p>
            )}
            <div className="flex justify-between border-t pt-2 text-base font-semibold">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatBRL(total)}</dd>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <dt>Recebido</dt>
              <dd className="tabular-nums">{formatBRL(paid)}</dd>
            </div>
            {missing > 0 ? (
              <div className="flex justify-between text-xs font-semibold text-red-600">
                <dt>Faltando</dt>
                <dd className="tabular-nums">{formatBRL(missing)}</dd>
              </div>
            ) : (
              <div className="flex justify-between text-xs font-semibold text-emerald-700">
                <dt>Troco</dt>
                <dd className="tabular-nums">{formatBRL(change)}</dd>
              </div>
            )}
          </dl>

          {error && (
            <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}

          <Button className="mt-3 w-full" size="lg" disabled={pending || cart.length === 0} onClick={submit}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
            Finalizar venda
          </Button>
          <p className="mt-2 text-center text-[10px] text-muted-foreground">
            Caixa {session.terminalName} · operação registrada em auditoria
          </p>
        </div>
      </div>

      {success && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-3 sm:items-center">
          <div className="w-full max-w-md rounded-2xl border bg-card p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 text-lg font-semibold text-emerald-700">
                  <CheckCircle2 className="size-5" /> Venda concluída
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Comprovante {success.documentNumber}. Estoque e financeiro já foram atualizados.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSuccess(null)}
                className="text-muted-foreground hover:text-foreground"
                aria-label="Fechar"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <Button asChild variant="outline">
                <Link href={`/vendas/${success.id}/comprovante?print=1`} target="_blank">
                  <Printer className="size-4" /> Imprimir
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href={`/vendas/${success.id}`}>Ver venda</Link>
              </Button>
            </div>

            <div className="mt-4 rounded-lg border p-3">
              <p className="text-xs font-semibold">Compartilhar comprovante no WhatsApp</p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Sem integração oficial configurada, o Vendix abre o WhatsApp com a mensagem pronta.
              </p>
              <div className="mt-2 flex gap-2">
                <Input
                  value={sharePhone}
                  onChange={(event) => setSharePhone(event.target.value)}
                  placeholder="(11) 99999-9999"
                  inputMode="tel"
                  className="h-9"
                />
                <Button
                  type="button"
                  size="sm"
                  disabled={pending}
                  onClick={() =>
                    startTransition(async () => {
                      setShareFeedback(null);
                      const result = await shareReceiptAction({
                        saleId: success.id,
                        phone: sharePhone,
                      });
                      if (!result.ok) {
                        setShareFeedback(result.error);
                        return;
                      }
                      if (result.data?.mode === "manual" && result.data.url) {
                        window.open(result.data.url, "_blank", "noopener,noreferrer");
                        setShareFeedback("Link manual aberto em nova aba. O envio depende de você confirmar no WhatsApp.");
                      } else {
                        setShareFeedback("Comprovante enviado pelo WhatsApp Cloud API.");
                      }
                    })
                  }
                >
                  Enviar
                </Button>
              </div>
              {shareFeedback && (
                <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">{shareFeedback}</p>
              )}
            </div>

            <Button className="mt-4 w-full" onClick={() => setSuccess(null)}>
              Nova venda
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
