'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store';
import { fetchAPI } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  FileText, 
  Upload, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Trash2,
  Download,
  Loader2,
  Shield,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';

interface Document {
  id: string;
  type: string;
  name: string;
  status: 'pending' | 'approved' | 'rejected';
  uploadedAt: string;
  verifiedAt?: string;
  url?: string;
  rejectionReason?: string;
}

const requiredDocuments = [
  { type: 'AADHAR_CARD', name: 'Aadhar Card', description: 'Government-issued identity proof' },
  { type: 'PAN_CARD', name: 'PAN Card', description: 'Tax identification document' },
  { type: 'POLICE_CLEARANCE', name: 'Police Clearance Certificate', description: 'Background verification certificate' },
  { type: 'HEALTH_CERTIFICATE', name: 'Health Certificate', description: 'Medical fitness certificate' },
  { type: 'NURSING_LICENSE', name: 'Nursing License/Certificate', description: 'Professional qualification proof' },
  { type: 'ADDRESS_PROOF', name: 'Address Proof', description: 'Utility bill or rental agreement' },
];

export default function CaregiverDocumentsPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login');
    } else if (user?.role !== 'CAREGIVER') {
      router.push(`/dashboard/${user?.role?.toLowerCase()}`);
    } else {
      fetchData();
    }
  }, [isAuthenticated, user, router]);

  const fetchData = async () => {
    try {
      const [profileData] = await Promise.all([
        fetchAPI('/caregivers/me')
      ]);
      setProfile(profileData);
      
      const mockDocs: Document[] = [
        {
          id: '1',
          type: 'AADHAR_CARD',
          name: 'Aadhar Card',
          status: profileData?.isVerified ? 'approved' : 'pending',
          uploadedAt: new Date().toISOString(),
          url: '#'
        },
        {
          id: '2',
          type: 'POLICE_CLEARANCE',
          name: 'Police Clearance Certificate',
          status: profileData?.isVerified ? 'approved' : 'pending',
          uploadedAt: new Date().toISOString(),
          url: '#'
        },
      ];
      setDocuments(mockDocs);
    } catch (error) {
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (docType: string, file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Only JPG, PNG, and PDF files are allowed');
      return;
    }

    setUploading(docType);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const newDoc: Document = {
        id: Date.now().toString(),
        type: docType,
        name: requiredDocuments.find(d => d.type === docType)?.name || docType,
        status: 'pending',
        uploadedAt: new Date().toISOString(),
        url: '#'
      };

      setDocuments(prev => {
        const filtered = prev.filter(d => d.type !== docType);
        return [...filtered, newDoc];
      });

      toast.success('Document uploaded successfully! It will be reviewed by an admin.');
    } catch (error) {
      toast.error('Failed to upload document');
    } finally {
      setUploading(null);
    }
  };

  const handleDeleteDocument = (docId: string) => {
    setDocuments(prev => prev.filter(d => d.id !== docId));
    toast.success('Document removed');
  };

  const getStatusIcon = (status: Document['status']) => {
    switch (status) {
      case 'approved':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-yellow-500" />;
    }
  };

  const getStatusBadge = (status: Document['status']) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-800">Rejected</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800">Pending Review</Badge>;
    }
  };

  const completedCount = documents.filter(d => d.status === 'approved').length;
  const progressPercent = (completedCount / requiredDocuments.length) * 100;
  const isVerificationComplete = profile?.isVerified || completedCount >= 4;

  if (!isAuthenticated || user?.role !== 'CAREGIVER') {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold" style={{ color: 'var(--foreground)' }}>My Documents</h1>
        <p className="mt-2" style={{ color: 'var(--muted-foreground)' }}>
          Upload and manage your verification documents
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Verification Progress
              </CardTitle>
              <CardDescription>
                Complete your document verification to become a verified caregiver
              </CardDescription>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-primary">{Math.round(progressPercent)}%</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {completedCount} of {requiredDocuments.length} verified
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={progressPercent} className="h-2" />
          
          {isVerificationComplete && (
            <div className="mt-4 p-4 rounded-lg bg-green-50 border border-green-200 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              <div>
                <p className="font-medium text-green-800">Verification Complete!</p>
                <p className="text-sm text-green-700">
                  Your account is verified and you can start receiving bookings.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {requiredDocuments.map((doc) => {
          const uploadedDoc = documents.find(d => d.type === doc.type);
          const isUploading = uploading === doc.type;

          return (
            <Card key={doc.type}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                      uploadedDoc?.status === 'approved' 
                        ? 'bg-green-100' 
                        : uploadedDoc?.status === 'rejected'
                        ? 'bg-red-100'
                        : 'bg-primary/10'
                    }`}>
                      {uploadedDoc?.status === 'approved' ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                      ) : uploadedDoc?.status === 'rejected' ? (
                        <XCircle className="h-5 w-5 text-red-600" />
                      ) : (
                        <FileText className="h-5 w-5 text-primary" />
                      )}
                    </div>
                    <div>
                      <CardTitle className="text-base">{doc.name}</CardTitle>
                      <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        {doc.description}
                      </p>
                    </div>
                  </div>
                  {uploadedDoc && getStatusBadge(uploadedDoc.status)}
                </div>
              </CardHeader>
              <CardContent>
                {uploadedDoc ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                      <Clock className="h-4 w-4" />
                      Uploaded on {new Date(uploadedDoc.uploadedAt).toLocaleDateString()}
                    </div>
                    
                    {uploadedDoc.status === 'rejected' && uploadedDoc.rejectionReason && (
                      <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                        <div className="flex items-start gap-2">
                          <AlertCircle className="h-4 w-4 text-red-600 mt-0.5" />
                          <p className="text-sm text-red-800">{uploadedDoc.rejectionReason}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        disabled={isUploading}
                        onClick={() => {
                          const input = document.createElement('input');
                          input.type = 'file';
                          input.accept = '.jpg,.jpeg,.png,.pdf';
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement).files?.[0];
                            if (file) handleFileUpload(doc.type, file);
                          };
                          input.click();
                        }}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {uploadedDoc.status === 'rejected' ? 'Re-upload' : 'Replace'}
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => toast('Download feature coming soon')}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteDocument(uploadedDoc.id)}
                        className="text-red-500 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div 
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      isUploading ? 'border-primary bg-primary/5' : 'hover:border-primary/50'
                    }`}
                    onClick={() => {
                      if (!isUploading) {
                        const input = document.createElement('input');
                        input.type = 'file';
                        input.accept = '.jpg,.jpeg,.png,.pdf';
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement).files?.[0];
                          if (file) handleFileUpload(doc.type, file);
                        };
                        input.click();
                      }
                    }}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin text-primary" />
                        <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>Uploading...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-8 w-8 mx-auto mb-2" style={{ color: 'var(--muted-foreground)' }} />
                        <p className="text-sm" style={{ color: 'var(--foreground)' }}>Click to upload</p>
                        <p className="text-xs mt-1" style={{ color: 'var(--muted-foreground)' }}>JPG, PNG or PDF (max 5MB)</p>
                      </>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Verification Guidelines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">1</span>
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>Document Quality</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Ensure all documents are clearly readable and not expired
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">2</span>
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>Verification Timeline</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  Documents are typically verified within 24-48 hours of submission
                </p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-xs font-bold text-primary">3</span>
              </div>
              <div>
                <p className="font-medium" style={{ color: 'var(--foreground)' }}>Security</p>
                <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                  All documents are encrypted and stored securely. We never share your personal information.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Need help? Contact our support team at support@caresphere.ai
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
