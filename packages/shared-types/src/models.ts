/**
 * Domain model types — shared between frontend and backend.
 *
 * These types represent the core domain entities.
 * They match the Mongoose model schemas in backend/src/models/.
 */

export type CaseStatus = 'active' | 'pending' | 'closed' | 'archived';
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue' | 'cancelled';
export type SubscriptionStatus = 'active' | 'halted' | 'cancelled' | 'pending' | 'expired';
export type PlanTier = 'free' | 'basic' | 'pro' | 'premium' | 'elite';
export type UserRole = 'user' | 'admin' | 'superadmin';

export interface UserBase {
  _id: string;
  name: string;
  email: string;
  role: UserRole;
  isVerified: boolean;
  is2FAEnabled: boolean;
  googleId?: string;
  createdAt: string;
}

export interface CaseBase {
  _id: string;
  ownerId: string;
  title: string;
  caseNumber?: string;
  court?: string;
  clientId?: string;
  status: CaseStatus;
  description?: string;
  filingDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HearingBase {
  _id: string;
  ownerId: string;
  caseId: string;
  date: string;
  court?: string;
  description?: string;
  status?: string;
}

export interface ClientBase {
  _id: string;
  ownerId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  createdAt: string;
}
