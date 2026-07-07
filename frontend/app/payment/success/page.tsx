import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, Home, Package, ShoppingBag } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";

type PaymentSuccessPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function PaymentSuccessPage({ searchParams }: PaymentSuccessPageProps) {
  const params = await searchParams;
  const orderParam = params.order;
  const orderNumber = Array.isArray(orderParam) ? orderParam[0] : orderParam;

  if (!orderNumber?.trim()) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="mx-auto mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950">
          <CheckCircle size={48} className="text-emerald-500" />
        </div>
        <h1 className="mb-2 text-3xl font-extrabold">Payment Successful</h1>
        <p className="mb-2 text-muted-foreground">
          Thank you for your purchase. Your order is confirmed and being processed.
        </p>
        {orderNumber ? <p className="mb-8 text-lg font-bold text-primary">{orderNumber}</p> : null}

        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          {[
            { title: "Payment Complete", desc: "Your payment was verified", status: "complete" },
            { title: "Order Confirmed", desc: "Your order has been placed", status: "active" },
            { title: "Delivery", desc: "Est. 3-5 business days", status: "pending" },
          ].map(({ title, desc, status }) => (
            <div
              key={title}
              className={`rounded-2xl border p-4 ${
                status === "complete"
                  ? "border-emerald-200 bg-emerald-50 dark:bg-emerald-950"
                  : status === "active"
                    ? "border-primary/30 bg-primary/5"
                    : "border-border bg-muted/50"
              }`}
            >
              <Package
                size={20}
                className={`mx-auto mb-2 ${
                  status === "complete"
                    ? "text-emerald-500"
                    : status === "active"
                      ? "text-primary"
                      : "text-muted-foreground"
                }`}
              />
              <p className="text-sm font-semibold">{title}</p>
              <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mb-8 rounded-2xl border border-border bg-card p-6 text-left">
          <h2 className="mb-4 font-bold">What happens next?</h2>
          <div className="space-y-3">
            {[
              "You will receive a confirmation email with your order details",
              "We will notify you when your order ships with a tracking number",
              "Your package will arrive within the estimated delivery time",
              "You can track your order from your account order history",
            ].map((step, index) => (
              <div key={step} className="flex items-start gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                  {index + 1}
                </span>
                <p className="text-sm text-muted-foreground">{step}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <Link
            href="/account/orders"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 font-semibold text-primary-foreground transition-opacity hover:opacity-90"
          >
            <Package size={16} /> Track Order
          </Link>
          <Link
            href="/shop"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted"
          >
            <ShoppingBag size={16} /> Continue Shopping
          </Link>
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-6 py-3 font-semibold transition-colors hover:bg-muted"
          >
            <Home size={16} /> Home
          </Link>
        </div>
      </main>
      <Footer />
    </div>
  );
}
