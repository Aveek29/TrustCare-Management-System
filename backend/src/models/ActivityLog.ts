import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  userId?: string;
  userEmail?: string;
  userRole?: string;
  action: string;
  category: 'AUTH' | 'BOOKING' | 'PAYMENT' | 'CAREGIVER' | 'REVIEW' | 'PROFILE' | 'CHAT' | 'SYSTEM';
  status: 'SUCCESS' | 'FAILED' | 'PENDING';
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
  resourceType?: string;
  resourceId?: string;
  description?: string;
  createdAt: Date;
}

const ActivityLogSchema = new Schema<IActivityLog>(
  {
    userId: { type: String, sparse: true, index: true },
    userEmail: { type: String, sparse: true },
    userRole: { type: String },
    action: { type: String, required: true, index: true },
    category: { 
      type: String, 
      enum: ['AUTH', 'BOOKING', 'PAYMENT', 'CAREGIVER', 'REVIEW', 'PROFILE', 'CHAT', 'SYSTEM'],
      required: true,
      index: true 
    },
    status: { 
      type: String, 
      enum: ['SUCCESS', 'FAILED', 'PENDING'],
      required: true 
    },
    ipAddress: { type: String },
    userAgent: { type: String },
    metadata: { type: Schema.Types.Mixed },
    resourceType: { type: String },
    resourceId: { type: String },
    description: { type: String },
  },
  { timestamps: true }
);

ActivityLogSchema.index({ createdAt: -1 });
ActivityLogSchema.index({ category: 1, action: 1 });
ActivityLogSchema.index({ userId: 1, createdAt: -1 });
ActivityLogSchema.index({ status: 1, category: 1 });

export const ActivityLog = mongoose.models.ActivityLog || mongoose.model<IActivityLog>('ActivityLog', ActivityLogSchema);
