'use client';
import { useState } from 'react';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { AnnouncementBar } from '@/components/layout/AnnouncementBar';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { toast } from 'sonner';
import { submitContactMessage } from '@/services/contact-service';
import { toAppError } from '@/lib/errors';
import { selectRuntimeSettings, useSettingsStore } from '@/store/settings-store';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ContactPage() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const settings = useSettingsStore(selectRuntimeSettings);
  const contactInfo = buildContactInfo(settings);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: form.name.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      subject: form.subject.trim(),
      message: form.message.trim(),
    };

    if (payload.name.length < 2) {
      toast.error('Enter your name.');
      return;
    }

    if (!payload.email) {
      toast.error('Enter a valid email address.');
      return;
    }

    if (!payload.subject) {
      toast.error('Select a subject.');
      return;
    }

    if (payload.message.length < 10) {
      toast.error('Message must be at least 10 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await submitContactMessage(payload);
      toast.success("Message sent! We'll get back to you within 24 hours.");
      setForm({ name: '', email: '', phone: '', subject: '', message: '' });
    } catch (error) {
      const appError = toAppError(error);
      const validationMessage = appError.validationErrors
        ? Object.values(appError.validationErrors).flat().find(Boolean)
        : null;
      toast.error(validationMessage || appError.message || 'Unable to send message.');
    } finally {
      setIsSubmitting(false);
    }
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
            <div className="grid grid-cols-1 gap-4">
              {contactInfo.map(({ icon: Icon, label, value, sub }) => (
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
          </div>

          {/* Contact Form */}
          <div className="bg-card border border-border rounded-2xl p-6">
            <h2 className="font-bold text-lg mb-5">Send us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'name', label: 'Your Name', placeholder: 'Enter name' },
                  {
                    key: 'email',
                    label: 'Email Address',
                    placeholder: 'Enter email',
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
                  Phone
                </label>
                <input
                  type="text"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="Enter phone number"
                  className="w-full px-4 py-3 bg-muted border border-transparent rounded-xl text-sm focus:border-primary focus:bg-background outline-none transition-colors"
                />
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
                  <SelectTrigger className="h-12 rounded-xl border-border bg-background px-4 text-sm focus:border-primary">
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
                  placeholder="Enter message"
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

function buildContactInfo(settings: ReturnType<typeof selectRuntimeSettings>) {
  const company = settings?.company_settings ?? {};
  const branding = settings?.branding ?? {};
  const phone = firstText(
    branding.support_phone,
    company.support_phone,
    branding.company_phone,
    company.company_phone,
  );
  const email = firstText(
    branding.support_email,
    company.support_email,
    company.company_email,
  );
  const address = firstText(
    branding.address,
    company.full_address,
    [company.city, company.state, company.country].map(stringValue).filter(Boolean).join(', '),
  );
  const postal = firstText(company.postal_code);
  const hours = firstText(company.business_hours, company.support_hours, company.office_hours);
  const timezone = firstText(company.timezone);
  const timeFormat = firstText(company.time_format);

  return [
    { icon: Phone, label: 'Phone', value: phone || 'Not available', sub: timezone ? `Timezone: ${timezone}` : 'Support contact' },
    { icon: Mail, label: 'Email', value: email || 'Not available', sub: 'Customer support email' },
    { icon: MapPin, label: 'Address', value: address || 'Not available', sub: postal || 'Company address' },
    { icon: Clock, label: 'Hours', value: hours || (timezone ? `Timezone: ${timezone}` : 'Not available'), sub: timeFormat ? `Time format: ${timeFormat}` : 'Company schedule' },
  ];
}

function firstText(...values: unknown[]) {
  return values.map(stringValue).find(Boolean) ?? '';
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
