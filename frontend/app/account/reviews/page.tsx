"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Star, Edit2, Trash2, X, Save } from "lucide-react";
import { toast } from "sonner";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AccountSidebar } from "@/components/account/AccountSidebar";
import { accountService, type AccountReview } from "@/services/account-service";

export default function ReviewsPage() {
  const [reviews, setReviews] = useState<AccountReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ rating: 5, comment: "" });

  useEffect(() => {
    accountService.reviews().then(setReviews).finally(() => setLoading(false));
  }, []);

  function startEdit(review: AccountReview) {
    setEditingId(review.id);
    setEditForm({ rating: review.rating, comment: review.comment });
  }

  async function saveReview(reviewId: number) {
    setSavingId(reviewId);
    try {
      const next = await accountService.updateReview(reviewId, editForm);
      setReviews((current) => current.map((review) => review.id === reviewId ? next : review));
      setEditingId(null);
      toast.success("Review updated. It will appear publicly after approval.");
    } catch {
      toast.error("Unable to update review.");
    } finally {
      setSavingId(null);
    }
  }

  async function deleteReview(reviewId: number) {
    if (!window.confirm("Delete this review?")) return;
    setDeletingId(reviewId);
    try {
      await accountService.deleteReview(reviewId);
      setReviews((current) => current.filter((review) => review.id !== reviewId));
      toast.success("Review deleted.");
    } catch {
      toast.error("Unable to delete review.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">Account</Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">My Reviews</span>
        </nav>
        <div className="flex flex-col gap-4 md:flex-row md:gap-8">
          <AccountSidebar active="reviews" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">My Reviews</h1>

            {loading ? (
              <div className="space-y-4">{Array.from({ length: 3 }).map((_, index) => <div key={index} className="h-36 rounded-2xl bg-muted animate-pulse" />)}</div>
            ) : reviews.length === 0 ? (
              <div className="text-center py-16">
                <Star size={48} className="mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="font-bold text-lg mb-2">No reviews yet</h3>
                <p className="text-muted-foreground text-sm mb-6">Share your experience with the products you&apos;ve purchased.</p>
                <Link href="/account/orders" className="text-primary hover:underline">View Your Orders</Link>
              </div>
            ) : (
              <div className="space-y-4">
                {reviews.map((review) => (
                  <div key={review.id} className="bg-card border border-border rounded-2xl p-5">
                    {review.product && (
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                        <Link href={`/products/${review.product.slug}`} className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                          <Image src={review.product.thumbnail} alt={review.product.name} fill unoptimized className="object-cover" />
                        </Link>
                        <Link href={`/products/${review.product.slug}`} className="min-w-0 hover:text-primary">
                          <p className="font-semibold text-sm">{review.product.name}</p>
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, index) => (
                              <Star key={index} size={12} className={index < review.rating ? "fill-amber-400 text-amber-400" : "text-muted"} />
                            ))}
                          </div>
                        </Link>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{review.createdAt ? new Date(review.createdAt).toLocaleDateString() : ""}</span>
                          <button type="button" onClick={() => startEdit(review)} className="p-1.5 hover:bg-muted rounded-lg transition-colors" aria-label="Edit review">
                            <Edit2 size={14} className="text-muted-foreground" />
                          </button>
                          <button type="button" disabled={deletingId === review.id} onClick={() => void deleteReview(review.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50" aria-label="Delete review">
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    )}
                    {!review.product ? (
                      <div className="mb-4 flex items-center justify-between gap-3 border-b border-border pb-4">
                        <p className="text-sm font-semibold text-muted-foreground">Product unavailable</p>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => startEdit(review)} className="p-1.5 hover:bg-muted rounded-lg transition-colors" aria-label="Edit review">
                            <Edit2 size={14} className="text-muted-foreground" />
                          </button>
                          <button type="button" disabled={deletingId === review.id} onClick={() => void deleteReview(review.id)} className="p-1.5 hover:bg-destructive/10 rounded-lg transition-colors disabled:opacity-50" aria-label="Delete review">
                            <Trash2 size={14} className="text-destructive" />
                          </button>
                        </div>
                      </div>
                    ) : null}
                    {editingId === review.id ? (
                      <div className="space-y-3">
                        <div>
                          <label className="mb-2 block text-sm font-semibold">Rating</label>
                          <div className="flex gap-1">
                            {Array.from({ length: 5 }).map((_, index) => {
                              const value = index + 1;
                              return (
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => setEditForm((current) => ({ ...current, rating: value }))}
                                  className="rounded-lg p-1 transition-colors hover:bg-muted"
                                  aria-label={`${value} star rating`}
                                >
                                  <Star
                                    size={18}
                                    className={value <= editForm.rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}
                                  />
                                </button>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <label className="mb-2 block text-sm font-semibold">Review</label>
                          <textarea
                            value={editForm.comment}
                            onChange={(event) => setEditForm((current) => ({ ...current, comment: event.target.value }))}
                            rows={4}
                            className="w-full rounded-xl border border-transparent bg-muted px-4 py-3 text-sm outline-none transition-colors focus:border-primary focus:bg-background"
                          />
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            disabled={savingId === review.id}
                            onClick={() => void saveReview(review.id)}
                            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
                          >
                            <Save size={14} />
                            Save Review
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingId(null)}
                            className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold transition-colors hover:bg-muted"
                          >
                            <X size={14} />
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">{review.comment}</p>
                    )}
                    {review.replies?.length ? (
                      <div className="mt-4 space-y-3 border-l-2 border-border pl-4">
                        {review.replies.map((reply) => (
                          <div key={reply.id} className="rounded-xl bg-muted/50 p-4">
                            <div className="mb-1 flex items-center justify-between gap-3">
                              <p className="text-xs font-bold uppercase text-foreground">{reply.author}</p>
                              {reply.createdAt ? <span className="text-xs text-muted-foreground">{new Date(reply.createdAt).toLocaleDateString()}</span> : null}
                            </div>
                            <p className="text-sm text-muted-foreground">{reply.comment}</p>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      {review.verified && <span className="text-emerald-600 font-medium">Verified Purchase</span>}
                      <span className="capitalize">{review.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
