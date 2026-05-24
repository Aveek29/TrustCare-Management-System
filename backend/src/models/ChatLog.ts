import mongoose, { Schema, Document } from 'mongoose';

export interface IChatLog extends Document {
  userId?: string;
  userRole: string;
  page: string;
  messages: {
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }[];
  sessionId: string;
  createdAt: Date;
  updatedAt: Date;
}

const ChatLogSchema = new Schema<IChatLog>(
  {
    userId: { type: String, sparse: true },
    userRole: { type: String, default: 'GUEST' },
    page: { type: String, default: '/' },
    messages: [{
      role: { type: String, enum: ['user', 'assistant'] },
      content: { type: String },
      timestamp: { type: Date, default: Date.now }
    }],
    sessionId: { type: String, required: true }
  },
  { timestamps: true }
);

ChatLogSchema.index({ userId: 1, createdAt: -1 });
ChatLogSchema.index({ sessionId: 1 });
ChatLogSchema.index({ createdAt: -1 });

export const ChatLog = mongoose.models.ChatLog || mongoose.model<IChatLog>('ChatLog', ChatLogSchema);
