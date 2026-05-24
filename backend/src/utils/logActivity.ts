import { Request } from 'express';
import { ActivityLog } from '../models/index';

export type ActivityCategory = 'AUTH' | 'BOOKING' | 'PAYMENT' | 'CAREGIVER' | 'REVIEW' | 'PROFILE' | 'CHAT' | 'SYSTEM';

interface LogActivityParams {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  category: ActivityCategory;
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  req?: Request;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  metadata?: Record<string, any>;
}

export const logActivity = async (params: LogActivityParams): Promise<void> => {
  try {
    const { req, ...logData } = params;
    
    await ActivityLog.create({
      userId: logData.userId,
      userEmail: logData.userEmail,
      userRole: logData.userRole,
      action: logData.action,
      category: logData.category,
      status: logData.status,
      ipAddress: req?.ip || req?.socket?.remoteAddress || 'unknown',
      userAgent: req?.headers['user-agent'],
      resourceType: logData.resourceType,
      resourceId: logData.resourceId,
      description: logData.description,
      metadata: logData.metadata,
    });
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

export const activityCategories = {
  AUTH: 'AUTH',
  BOOKING: 'BOOKING',
  PAYMENT: 'PAYMENT',
  CAREGIVER: 'CAREGIVER',
  REVIEW: 'REVIEW',
  PROFILE: 'PROFILE',
  CHAT: 'CHAT',
  SYSTEM: 'SYSTEM',
} as const;

export const authActions = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGIN_FAILED: 'LOGIN_FAILED',
  REGISTER_SUCCESS: 'REGISTER_SUCCESS',
  REGISTER_FAILED: 'REGISTER_FAILED',
  LOGOUT: 'LOGOUT',
  PASSWORD_CHANGE: 'PASSWORD_CHANGE',
} as const;

export const bookingActions = {
  BOOKING_CREATED: 'BOOKING_CREATED',
  BOOKING_UPDATED: 'BOOKING_UPDATED',
  BOOKING_CANCELLED: 'BOOKING_CANCELLED',
  BOOKING_COMPLETED: 'BOOKING_COMPLETED',
  BOOKING_ACCEPTED: 'BOOKING_ACCEPTED',
  BOOKING_REJECTED: 'BOOKING_REJECTED',
} as const;

export const paymentActions = {
  PAYMENT_INITIATED: 'PAYMENT_INITIATED',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  PAYMENT_FAILED: 'PAYMENT_FAILED',
  PAYMENT_REFUNDED: 'PAYMENT_REFUNDED',
  ESCROW_RELEASED: 'ESCROW_RELEASED',
} as const;

export const caregiverActions = {
  PROFILE_VIEWED: 'PROFILE_VIEWED',
  PROFILE_CREATED: 'PROFILE_CREATED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  VERIFICATION_REQUESTED: 'VERIFICATION_REQUESTED',
  VERIFICATION_APPROVED: 'VERIFICATION_APPROVED',
  VERIFICATION_REJECTED: 'VERIFICATION_REJECTED',
} as const;

export const reviewActions = {
  REVIEW_CREATED: 'REVIEW_CREATED',
  REVIEW_UPDATED: 'REVIEW_UPDATED',
  REVIEW_DELETED: 'REVIEW_DELETED',
} as const;

export const profileActions = {
  PROFILE_VIEWED: 'PROFILE_VIEWED',
  PROFILE_UPDATED: 'PROFILE_UPDATED',
  SETTINGS_CHANGED: 'SETTINGS_CHANGED',
  THEME_CHANGED: 'THEME_CHANGED',
} as const;
