'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BusinessInfo, 
  ContactInfo, 
  KYBDocuments, 
  BankingInfo 
} from '@/types/merchant';
import { 
  ArrowLeft, 
  Building2, 
  Users, 
  FileText, 
  CreditCard,
  CheckCircle,
  Edit
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface ReviewStepProps {
  applicationData: {
    businessInfo?: BusinessInfo;
    contactInfo?: ContactInfo;
    documents?: KYBDocuments;
    bankingInfo?: BankingInfo;
  };
  onSubmit: () => void;
  onBack: () => void;
  onEdit?: (step: number) => void;
  isLoading: boolean;
}

export function ReviewStep({ 
  applicationData, 
  onSubmit, 
  onBack, 
  onEdit,
  isLoading 
}: ReviewStepProps) {
  const formatPhoneNumber = (phone: string) => {
    // Simple phone formatting
    const cleaned = phone.replace(/\D/g, '');
    const match = cleaned.match(/^(\d{1,3})(\d{3})(\d{3})(\d{4})$/);
    if (match) {
      return `+${match[1]} ${match[2]} ${match[3]} ${match[4]}`;
    }
    return phone;
  };

  const maskAccountNumber = (accountNumber: string) => {
    const length = accountNumber.length;
    if (length <= 4) return accountNumber;
    return '*'.repeat(length - 4) + accountNumber.slice(-4);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Review Your Application</CardTitle>
          <CardDescription>
            Please review all information before submitting. Click on any section to edit.
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Business Information */}
      {applicationData.businessInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Building2 className="w-5 h-5 text-gray-600" />
                <CardTitle className="text-lg">Business Information</CardTitle>
              </div>
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(1)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Legal Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.businessInfo.legalName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Trading Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.businessInfo.tradingName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Registration Number</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.businessInfo.registrationNumber}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tax ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.businessInfo.taxId}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Category</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {applicationData.businessInfo.category}
                  {applicationData.businessInfo.subcategory && 
                    ` - ${applicationData.businessInfo.subcategory}`}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Year Established</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.businessInfo.yearEstablished}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Monthly Volume</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  ${applicationData.businessInfo.monthlyVolume.toLocaleString()}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.businessInfo.website}</dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Business Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {applicationData.businessInfo.businessAddress.street}<br />
                  {applicationData.businessInfo.businessAddress.city}, {applicationData.businessInfo.businessAddress.state} {applicationData.businessInfo.businessAddress.postalCode}<br />
                  {applicationData.businessInfo.businessAddress.country}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Description</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.businessInfo.description}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Contact Information */}
      {applicationData.contactInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-gray-600" />
                <CardTitle className="text-lg">Contact Information</CardTitle>
              </div>
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(2)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Primary Contact */}
              <div>
                <h4 className="font-medium text-sm text-gray-700 mb-2">Primary Contact</h4>
                <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Name</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {applicationData.contactInfo.primaryContact.firstName} {applicationData.contactInfo.primaryContact.lastName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Title</dt>
                    <dd className="mt-1 text-sm text-gray-900">{applicationData.contactInfo.primaryContact.title}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Email</dt>
                    <dd className="mt-1 text-sm text-gray-900">{applicationData.contactInfo.primaryContact.email}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Phone</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {formatPhoneNumber(applicationData.contactInfo.primaryContact.phone)}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Technical Contact */}
              {applicationData.contactInfo.technicalContact && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Technical Contact</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {applicationData.contactInfo.technicalContact.firstName} {applicationData.contactInfo.technicalContact.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{applicationData.contactInfo.technicalContact.email}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Financial Contact */}
              {applicationData.contactInfo.financialContact && (
                <div className="pt-4 border-t">
                  <h4 className="font-medium text-sm text-gray-700 mb-2">Financial Contact</h4>
                  <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Name</dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {applicationData.contactInfo.financialContact.firstName} {applicationData.contactInfo.financialContact.lastName}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">Email</dt>
                      <dd className="mt-1 text-sm text-gray-900">{applicationData.contactInfo.financialContact.email}</dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Documents */}
      {applicationData.documents && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-gray-600" />
                <CardTitle className="text-lg">Documents</CardTitle>
              </div>
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(3)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Business Registration</span>
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Uploaded
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tax Certificate</span>
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Uploaded
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Bank Statement</span>
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Uploaded
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Utility Bill</span>
                <Badge variant="success">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Uploaded
                </Badge>
              </div>
              {applicationData.documents.additionalDocs.length > 0 && (
                <div className="pt-2 border-t">
                  <span className="text-sm font-medium">
                    Additional Documents: {applicationData.documents.additionalDocs.length}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Banking Information */}
      {applicationData.bankingInfo && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-gray-600" />
                <CardTitle className="text-lg">Banking Information</CardTitle>
              </div>
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={() => onEdit(4)}>
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Account Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.bankingInfo.accountName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Bank Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{applicationData.bankingInfo.bankName}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Account Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {maskAccountNumber(applicationData.bankingInfo.accountNumber)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Routing Number</dt>
                <dd className="mt-1 text-sm text-gray-900 font-mono">
                  {applicationData.bankingInfo.routingNumber}
                </dd>
              </div>
              {applicationData.bankingInfo.swiftCode && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">SWIFT Code</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {applicationData.bankingInfo.swiftCode}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      )}

      {/* Submission Notice */}
      <Alert>
        <AlertDescription>
          By submitting this application, you agree to our merchant terms and conditions. 
          Your application will be reviewed within 2-3 business days.
        </AlertDescription>
      </Alert>

      {/* Navigation */}
      <div className="flex justify-between">
        <Button variant="outline" onClick={onBack} disabled={isLoading}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        <Button onClick={onSubmit} disabled={isLoading} size="lg">
          {isLoading ? 'Submitting...' : 'Submit Application'}
        </Button>
      </div>
    </div>
  );
}