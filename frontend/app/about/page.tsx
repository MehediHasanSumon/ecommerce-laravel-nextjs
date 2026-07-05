import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag, Users, Star, Package, Globe, Heart } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

const STATS = [
  { icon: Users, label: 'Happy Customers', value: '100K+' },
  { icon: Package, label: 'Products', value: '50K+' },
  { icon: Star, label: 'Average Rating', value: '4.9★' },
  { icon: Globe, label: 'Countries', value: '45+' },
];

const TEAM = [
  { name: 'Sarah Chen', role: 'CEO & Co-Founder', avatar: 'https://i.pravatar.cc/150?img=1' },
  { name: 'Marcus Johnson', role: 'CTO', avatar: 'https://i.pravatar.cc/150?img=4' },
  { name: 'Priya Kumar', role: 'Head of Design', avatar: 'https://i.pravatar.cc/150?img=9' },
  { name: 'James Park', role: 'Head of Operations', avatar: 'https://i.pravatar.cc/150?img=11' },
];

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main>
        {/* Hero */}
        <section className="py-16 px-4 text-center bg-gradient-to-b from-primary/5 to-transparent">
          <div className="max-w-4xl mx-auto">
            <div className="w-16 h-16 bg-primary rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShoppingBag size={32} className="text-primary-foreground" />
            </div>
            <h1 className="text-4xl md:text-5xl font-extrabold mb-4">About LuxeCart</h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              We&apos;re on a mission to make premium shopping accessible to everyone. Founded in
              2020, LuxeCart connects discerning shoppers with the world&apos;s best brands.
            </p>
          </div>
        </section>

        {/* Stats */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {STATS.map(({ icon: Icon, label, value }) => (
              <div key={label} className="text-center p-6 bg-card border border-border rounded-2xl">
                <Icon size={24} className="text-primary mx-auto mb-3" />
                <p className="text-3xl font-extrabold mb-1">{value}</p>
                <p className="text-sm text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Mission */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold mb-4">Our Mission</h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                At LuxeCart, we believe that premium quality shouldn&apos;t come with a premium
                price tag. We work directly with top brands and manufacturers to bring you authentic
                products at fair prices.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Our platform is built on three pillars:{' '}
                <strong className="text-foreground">authenticity</strong>,{' '}
                <strong className="text-foreground">accessibility</strong>, and{' '}
                <strong className="text-foreground">sustainability</strong>. Every product we carry
                is verified genuine, and we&apos;re committed to reducing our environmental
                footprint.
              </p>
              <Link
                href="/shop"
                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-xl font-semibold hover:opacity-90 transition-opacity"
              >
                Shop Our Collection
              </Link>
            </div>
            <div className="relative h-80 rounded-2xl overflow-hidden">
              <Image
                src="https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?w=800&auto=format&fit=crop"
                alt="Our mission"
                fill
                className="object-cover"
              />
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="bg-muted/50 py-16 px-4">
          <div className="max-w-7xl mx-auto">
            <h2 className="text-3xl font-extrabold text-center mb-12">Our Values</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  icon: Star,
                  title: 'Quality First',
                  desc: 'Every product is carefully vetted and quality-checked before it appears on our platform.',
                },
                {
                  icon: Heart,
                  title: 'Customer Love',
                  desc: 'Our 24/7 support team is always ready to help. Your satisfaction is our top priority.',
                },
                {
                  icon: Globe,
                  title: 'Global Reach',
                  desc: 'We ship to 45+ countries with reliable logistics partners and transparent tracking.',
                },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-card border border-border rounded-2xl p-6">
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4">
                    <Icon size={22} className="text-primary" />
                  </div>
                  <h3 className="font-bold text-lg mb-2">{title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Team */}
        <section className="max-w-7xl mx-auto px-4 py-16">
          <h2 className="text-3xl font-extrabold text-center mb-12">Meet the Team</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {TEAM.map(({ name, role, avatar }) => (
              <div key={name} className="text-center">
                <div className="w-24 h-24 rounded-full overflow-hidden mx-auto mb-3 border-4 border-border">
                  <Image src={avatar} alt={name} width={96} height={96} className="object-cover" />
                </div>
                <p className="font-bold text-sm">{name}</p>
                <p className="text-xs text-muted-foreground">{role}</p>
              </div>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
