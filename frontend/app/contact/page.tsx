'use client';
import { useState } from 'react';
import { Mail, Phone, MapPin, Clock, MessageCircle } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const CONTACT_INFO = [
  { icon: Phone, label: 'Phone', value: '+1 (800) 123-4567', sub: 'Mon-Fri 9am-6pm EST' },
  { icon: Mail, label: 'Email', value: 'support@luxecart.com', sub: 'Response within 24hrs' },
  { icon: MapPin, label: 'Address', value: '123 Commerce St', sub: 'New York, NY 10001' },
  { icon: Clock, label: 'Hours', value: 'Mon-Fri: 9am-6pm', sub: 'Sat: 10am-4pm EST' },
];

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await new Promise((r) => setTimeout(r, 1000));
    setIsSubmitting(false);
    toast.success("Message sent! We'll get back to you within 24 hours.");
    setForm({ name: '', email: '', subject: '', message: '' });
  };

  return (
    <div className="min-h-screen bg-background">
      <AnnouncementBar />
      <Header />
      <main className="max-w-7xl mx-auto px-4 py-12 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-extrabold mb-3">Get in Touch</h1>
          <p className="text-muted-foreground max-w-xl mx-auto">
            Have a question, feedback, or need help with your order? We&apos;re here for you, 7 days
            a week.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-12 max-w-5xl mx-auto">
          {/* Contact Info */}
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
              {CONTACT_INFO.map(({ icon: Icon, label, value, sub }) => (
                <div key={label} className="bg-card border border-border rounded-2xl p-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
                    <Icon size={18} className="text-primary" />
                  </div>
                  <p className="font-semibold text-sm">{label}</p>
                  <p className="text-sm text-foreground mt-0.5">{value}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
                </div>
              ))}
            </div>

            <div className="bg-primary rounded-2xl p-6 text-primary-foreground">
              <div className="flex items-center gap-3 mb-3">
                <MessageCircle size={22} />
                <h3 className="font-bold">Live Chat</h3>
              </div>
              <p className="text-primary-foreground/80 text-sm mb-4">
                Chat with our support team in real-time. Available Monday through Friday.
              </p>
              <button className="px-5 py-2.5 bg-primary-foreground text-primary rounded-xl text-sm font-bold hover:opacity-90 transition-opacity">
                Start Live Chat
              </button>
            </div>
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-5">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Your Name', placeholder: 'John Doe' },
                  {
                    key: 'email',
                    label: 'Email Address',
                    placeholder: 'john@example.com',
                    type: 'email',
                  },
                ].map(({ key, label, placeholder, type }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                      {label}
                    </label>
                    <input
                      type={type ?? 'text'}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      required
                      className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                  Subject
                </label>
                <Select
                  value={form.subject}
                  onValueChange={(value) => setForm((f) => ({ ...f, subject: value }))}
                  required
                >
                  <SelectTrigger className="h-12 rounded-xl border-transparent bg-muted px-4 text-sm focus:bg-background">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      'Order Issue',
                      'Return / Refund',
                      'Product Question',
                      'Technical Support',
                      'Partnership',
                      'Other',
                    ].map((subject) => (
                      <SelectItem key={subject} value={subject}>
                        {subject}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1.5 text-muted-foreground uppercase tracking-wide">
                  Message
                </label>
                <textarea
                  value={form.message}
                  onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))}
                  placeholder="Describe your issue or question in detail..."
                  rows={5}
                  required
                  className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors resize-none"
                />
              </div>
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-primary text-primary-foreground rounded-xl font-bold text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {isSubmitting ? 'Sending...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
