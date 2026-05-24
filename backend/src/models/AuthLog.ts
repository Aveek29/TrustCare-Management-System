import mongoose, { Schema, Document } from 'mongoose';

export interface IAuthLog extends Document {
  userId?: string;
  userEmail?: string;
  action: 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'REGISTER_SUCCESS' | 'REGISTER_FAILED' | 'LOGOUT' | 'TOKEN_REFRESH' | 'PASSWORD_CHANGE';
  status: 'SUCCESS' | 'FAILED';
  ipAddress?: string;
  userAgent?: string;
  role?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

const AuthLogSchema = new Schema<IAuthLog>(
  {
    userId: { type: String, sparse: true },
    userEmail: { type: String, sparse: true },
    action: { 
      type: String, 
      enum: ['LOGIN_SUCCESS', 'LOGIN_FAILED', 'REGISTER_SUCCESS', 'REGISTER_FAILED', 'LOGOUT', 'TOKEN_REFRESH', 'PASSWORD_CHANGE'],
      required: true 
    },
    status: { type: String, enum: ['SUCCESS', 'FAILED'], required: true },
    ipAddress: { type: String },
    userAgent: { type: String },
    role: { type: String },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed }
  },
  { timestamps: true }
);

AuthLogSchema.index({ userId: 1, createdAt: -1 });
AuthLogSchema.index({ action: 1, status: 1 });
AuthLogSchema.index({ createdAt: -1 });
AuthLogSchema.index({ userEmail: 1, createdAt: -1 });

export const AuthLog = mongoose.models.AuthLog || mongoose.model<IAuthLog>('AuthLog', AuthLogSchema);
