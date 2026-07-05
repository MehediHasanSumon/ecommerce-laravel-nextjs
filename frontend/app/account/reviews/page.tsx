'use client';
import Link from 'next/link';
import Image from 'next/image';
import { ChevronRight, Star, Edit2 } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { AccountSidebar } from '@/components/account/AccountSidebar';
import { MOCK_REVIEWS } from '@/mock/reviews';
import { MOCK_PRODUCTS } from '@/mock/products';
import { toast } from 'sonner';

export default function ReviewsPage() {
  const myReviews = MOCK_REVIEWS.filter((r) => r.userId === 'u1').map((r) => ({
    ...r,
    product: MOCK_PRODUCTS.find((p) => p.id === r.productId),
  }));

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-8 pb-16">
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <ChevronRight size={14} />
          <Link href="/account" className="hover:text-foreground">
            Account
          </Link>
          <ChevronRight size={14} />
          <span className="text-foreground font-medium">My Reviews</span>
        </nav>
        <div className="flex gap-8">
          <AccountSidebar active="reviews" />
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-extrabold mb-6">My Reviews</h1>

            {myReviews.length === 0 ? (
              <div className="text-center py-16">
                <Star size={48} className="mx-auto text-muted-foreground opacity-30 mb-4" />
                <h3 className="font-bold text-lg mb-2">No reviews yet</h3>
                <p className="text-muted-foreground text-sm mb-6">
                  Share your experience with the products you&apos;ve purchased.
                </p>
                <Link href="/account/orders" className="text-primary hover:underline">
                  View Your Orders
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {myReviews.map((review) => (
                  <div key={review.id} className="bg-card border border-border rounded-2xl p-5">
                    {review.product && (
                      <div className="flex items-center gap-3 mb-4 pb-4 border-b border-border">
                        <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-muted shrink-0">
                          <Image
                            src={review.product.thumbnail}
                            alt={review.product.name}
                            fill
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{review.product.name}</p>
                          <div className="flex gap-0.5 mt-1">
                            {Array.from({ length: 5 }).map((_, i) => (
                              <Star
                                key={i}
                                size={12}
                                className={
                                  i < review.rating ? 'fill-amber-400 text-amber-400' : 'text-muted'
                                }
                              />
                            ))}
                          </div>
                        </div>
                        <div className="ml-auto flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">
                            {review.createdAt.slice(0, 10)}
                          </span>
                          <button
                            onClick={() => toast('Edit review coming soon!')}
                            className="p-1.5 hover:bg-muted rounded-lg transition-colors"
                          >
                            <Edit2 size={14} className="text-muted-foreground" />
                          </button>
                        </div>
                      </div>
                    )}
                    <h4 className="font-semibold text-sm mb-1">{review.title}</h4>
                    <p className="text-sm text-muted-foreground">{review.comment}</p>
                    <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                      <span>{review.helpful} people found this helpful</span>
                      {review.verified && (
                        <span className="text-emerald-600 font-medium">✓ Verified Purchase</span>
                      )}
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
