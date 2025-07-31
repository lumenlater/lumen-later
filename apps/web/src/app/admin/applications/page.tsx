'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { MerchantApplication } from '@/types/merchant';
import { UnifiedMerchantStatus } from '@/types/merchant';
import { useMerchant } from '@/hooks/use-merchant';
import { useWallet } from '@/hooks/web3/use-wallet';
import { 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  AlertTriangle,
  Search,
  Filter
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export default function AdminApplicationsPage() {
  const { isConnected, publicKey } = useWallet();
  const { toast } = useToast();
  const { getAllApplications, reviewApplication, isLoading } = useMerchant();
  const [applications, setApplications] = useState<MerchantApplication[]>([]);
  const [total, setTotal] = useState(0);

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedApplication, setSelectedApplication] = useState<MerchantApplication | null>(null);
  const [reviewDialog, setReviewDialog] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const pageSize = 10;

  // Fetch applications on mount and when filters change
  useEffect(() => {
    const fetchApplications = async () => {
      const result = await getAllApplications({
        status: statusFilter === 'all' ? undefined : statusFilter as UnifiedMerchantStatus,
        search: searchTerm,
        limit: pageSize,
        offset: currentPage * pageSize,
      });
      setApplications(result.applications);
      setTotal(result.total);
    };
    
    fetchApplications();
  }, [getAllApplications, statusFilter, searchTerm, currentPage]);

  const getStatusConfig = (status: UnifiedMerchantStatus) => {
    switch (status) {
      case UnifiedMerchantStatus.Submitted:
        return { color: 'bg-blue-100 text-blue-800', label: 'New' };
      case UnifiedMerchantStatus.Pending:
        return { color: 'bg-yellow-100 text-yellow-800', label: 'In Review' };
      case UnifiedMerchantStatus.Approved:
        return { color: 'bg-green-100 text-green-800', label: 'Approved' };
      case UnifiedMerchantStatus.Rejected:
        return { color: 'bg-red-100 text-red-800', label: 'Rejected' };
      default:
        return { color: 'bg-gray-100 text-gray-800', label: 'Unknown' };
    }
  };

  const getRiskBadge = (score?: number) => {
    if (!score) return { color: 'bg-gray-100 text-gray-800', label: 'Unassessed' };
    if (score <= 30) return { color: 'bg-green-100 text-green-800', label: 'Low Risk' };
    if (score <= 60) return { color: 'bg-yellow-100 text-yellow-800', label: 'Medium Risk' };
    return { color: 'bg-red-100 text-red-800', label: 'High Risk' };
  };

  // Applications are already filtered by the API
  const filteredApplications = applications;

  const handleReviewApplication = (application: MerchantApplication) => {
    setSelectedApplication(application);
    setReviewDialog(true);
  };

  const submitReview = async (decision: UnifiedMerchantStatus, reason?: string, riskScore?: number) => {
    if (!selectedApplication || !publicKey) return;

    const isApproved = decision === UnifiedMerchantStatus.Approved;
    const success = await reviewApplication(
      selectedApplication.id,
      isApproved,
      reason || '',
      publicKey,
      riskScore
    );

    if (success) {
      setReviewDialog(false);
      setSelectedApplication(null);
      // Refresh applications
      const result = await getAllApplications({
        status: statusFilter === 'all' ? undefined : statusFilter as UnifiedMerchantStatus,
        search: searchTerm,
        limit: pageSize,
        offset: currentPage * pageSize,
      });
      setApplications(result.applications);
      setTotal(result.total);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Merchant Applications</h1>
        <p className="text-gray-600 mt-2">
          Review and manage merchant enrollment applications
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Applications</p>
                <p className="text-2xl font-bold">{applications.length}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Pending Review</p>
                <p className="text-2xl font-bold">
                  {applications.filter(a => 
                    (a.status as UnifiedMerchantStatus) === UnifiedMerchantStatus.Submitted || 
                    (a.status as UnifiedMerchantStatus) === UnifiedMerchantStatus.Pending
                  ).length}
                </p>
              </div>
              <Clock className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Approved</p>
                <p className="text-2xl font-bold">
                  {applications.filter(a => (a.status as UnifiedMerchantStatus) === UnifiedMerchantStatus.Approved).length}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">High Risk</p>
                <p className="text-2xl font-bold">
                  {applications.filter(a => (a.riskScore || 0) > 60).length}
                </p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Applications</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by business name, email, or ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={UnifiedMerchantStatus.Submitted}>New</SelectItem>
                <SelectItem value={UnifiedMerchantStatus.Pending}>Under Review</SelectItem>
                <SelectItem value={UnifiedMerchantStatus.Approved}>Approved</SelectItem>
                <SelectItem value={UnifiedMerchantStatus.Rejected}>Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Applications Table */}
          <div className="space-y-4">
            {filteredApplications.map((application) => {
              const statusConfig = getStatusConfig(application.status as UnifiedMerchantStatus);
              const riskConfig = getRiskBadge(application.riskScore ?? undefined);

              return (
                <Card key={application.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-semibold text-lg">
                            {application.businessInfo.tradingName}
                          </h3>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          <Badge className={riskConfig.color}>
                            {riskConfig.label}
                          </Badge>
                        </div>
                        
                        <p className="text-gray-600 mb-1">
                          {application.businessInfo.legalName}
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                          <div>
                            <span className="font-medium">Category:</span> {application.businessInfo.category}
                          </div>
                          <div>
                            <span className="font-medium">Monthly Volume:</span> ${application.businessInfo.monthlyVolume.toLocaleString()}
                          </div>
                          <div>
                            <span className="font-medium">Submitted:</span> {new Date(application.createdAt).toLocaleDateString()}
                          </div>
                        </div>
                        
                        <div className="mt-2 text-sm text-gray-600">
                          <span className="font-medium">Contact:</span> {application.contactInfo.primaryContact.email}
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedApplication(application);
                            // Open view dialog (would implement separately)
                          }}
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        
                        {((application.status as UnifiedMerchantStatus) === UnifiedMerchantStatus.Submitted || 
                          (application.status as UnifiedMerchantStatus) === UnifiedMerchantStatus.Pending) && (
                          <Button 
                            size="sm"
                            onClick={() => handleReviewApplication(application)}
                          >
                            Review
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {isLoading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading applications...</p>
            </div>
          )}

          {!isLoading && filteredApplications.length === 0 && (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No applications found matching your criteria</p>
            </div>
          )}

          {/* Pagination */}
          {!isLoading && total > pageSize && (
            <div className="flex justify-between items-center mt-6">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                disabled={currentPage === 0}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600">
                Page {currentPage + 1} of {Math.ceil(total / pageSize)}
              </span>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={(currentPage + 1) * pageSize >= total}
              >
                Next
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Dialog */}
      <ApplicationReviewDialog
        application={selectedApplication}
        open={reviewDialog}
        onOpenChange={setReviewDialog}
        onSubmit={submitReview}
      />
    </div>
  );
}

// Review Dialog Component
function ApplicationReviewDialog({ 
  application, 
  open, 
  onOpenChange, 
  onSubmit 
}: {
  application: MerchantApplication | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (decision: UnifiedMerchantStatus, reason?: string, riskScore?: number) => void;
}) {
  const [decision, setDecision] = useState<UnifiedMerchantStatus>(UnifiedMerchantStatus.Approved);
  const [reason, setReason] = useState('');
  const [riskScore, setRiskScore] = useState<number>(application?.riskScore || 50);

  if (!application) return null;

  const handleSubmit = () => {
    onSubmit(decision, reason || undefined, riskScore);
    setReason('');
    setRiskScore(50);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review Application #{application.id}</DialogTitle>
          <DialogDescription>
            {application.businessInfo.tradingName} - {application.contactInfo.primaryContact.email}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              Review all business information and documents before making a decision.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="decision">Decision</Label>
              <Select value={decision} onValueChange={(value) => setDecision(value as UnifiedMerchantStatus)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UnifiedMerchantStatus.Approved}>Approve</SelectItem>
                  <SelectItem value={UnifiedMerchantStatus.Rejected}>Reject</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="riskScore">Risk Score (0-100)</Label>
              <Input
                id="riskScore"
                type="number"
                min="0"
                max="100"
                value={riskScore}
                onChange={(e) => setRiskScore(parseInt(e.target.value))}
              />
            </div>
          </div>

          {decision === UnifiedMerchantStatus.Rejected && (
            <div>
              <Label htmlFor="reason">
                Rejection Reason
              </Label>
              <Textarea
                id="reason"
                placeholder="Please provide a reason for rejection..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              Submit Review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}