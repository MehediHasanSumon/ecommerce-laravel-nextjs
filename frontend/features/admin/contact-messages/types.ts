export type ContactMessageStatus = "new" | "read" | "replied" | "closed";

export type ContactMessage = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  subject: string;
  message: string;
  status: ContactMessageStatus;
  admin_note?: string | null;
  read_at?: string | null;
  replied_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  user?: { id: number; name: string; email: string } | null;
  handler?: { id: number; name: string } | null;
};
