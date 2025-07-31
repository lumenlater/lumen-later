import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { KYBDocuments, DocumentInfo } from '@/types/merchant';
import { FileText, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface DocumentsStepProps {
  initialData?: KYBDocuments;
  onNext: (documents: KYBDocuments) => void;
  onBack: () => void;
}

const requiredDocuments = [
  {
    key: 'businessRegistration',
    title: 'Business Registration Certificate',
    description: 'Official certificate of business incorporation',
    icon: FileText,
  },
  {
    key: 'taxCertificate',
    title: 'Tax Registration Certificate',
    description: 'Tax ID certificate or EIN confirmation',
    icon: FileText,
  },
  {
    key: 'bankStatement',
    title: 'Bank Statement',
    description: 'Recent statement (within 3 months)',
    icon: FileText,
  },
  {
    key: 'utilityBill',
    title: 'Utility Bill',
    description: 'Proof of business address',
    icon: FileText,
  },
];

export function DocumentsStepPOC({ initialData, onNext, onBack }: DocumentsStepProps) {
  const { toast } = useToast();
  const [checkedDocs, setCheckedDocs] = useState<Set<string>>(new Set());
  
  const createMockDocument = (type: string): DocumentInfo => ({
    documentType: type as any,
    fileHash: 'mock-hash-' + Math.random().toString(36).substr(2, 9),
    uploadedAt: new Date().getTime(), // Ensure it's a valid timestamp
    verified: false,
    verificationNotes: '',
  });

  const handleDocumentCheck = (docKey: string) => {
    setCheckedDocs(prev => {
      const newSet = new Set(prev);
      if (newSet.has(docKey)) {
        newSet.delete(docKey);
      } else {
        newSet.add(docKey);
      }
      return newSet;
    });
  };

  const handleNext = () => {
    if (checkedDocs.size !== requiredDocuments.length) {
      toast({
        title: 'Documents Required',
        description: 'Please confirm all required documents before proceeding.',
        variant: 'destructive',
      });
      return;
    }

    // Create mock document data for POC
    const mockDocuments: KYBDocuments = {
      businessRegistration: createMockDocument('Business Registration'),
      taxCertificate: createMockDocument('Tax Certificate'),
      bankStatement: createMockDocument('Bank Statement'),
      utilityBill: createMockDocument('Utility Bill'),
      additionalDocs: [],
    };

    onNext(mockDocuments);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Required Documents</CardTitle>
              <CardDescription>
                For this POC, please confirm you have the following documents ready. 
                In production, you would upload these documents for verification.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setCheckedDocs(new Set(requiredDocuments.map(doc => doc.key)));
              }}
              className="flex items-center gap-2"
            >
              <span>🎲</span> Autofill Test Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>POC Note:</strong> This is a demonstration of the document collection process. 
              Simply check each document to confirm you understand what would be required.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            {requiredDocuments.map((doc) => {
              const isChecked = checkedDocs.has(doc.key);
              const Icon = doc.icon;

              return (
                <Card 
                  key={doc.key} 
                  className={`cursor-pointer transition-all ${
                    isChecked ? 'border-green-500 bg-green-50/50' : 'hover:border-gray-400'
                  }`}
                  onClick={() => handleDocumentCheck(doc.key)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <div className={`p-2 rounded-lg ${
                        isChecked ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        <Icon className={`w-5 h-5 ${
                          isChecked ? 'text-green-600' : 'text-gray-600'
                        }`} />
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{doc.title}</h3>
                          {isChecked && (
                            <Badge variant="outline" className="text-green-600 border-green-600">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Ready
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{doc.description}</p>
                      </div>

                      <div className="flex items-center">
                        <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                          isChecked 
                            ? 'bg-green-500 border-green-500' 
                            : 'border-gray-300'
                        }`}>
                          {isChecked && (
                            <CheckCircle2 className="w-3 h-3 text-white" />
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-medium mb-2 text-gray-900">In Production, You Would Need:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Documents in PDF, JPEG, or PNG format (max 10MB)</li>
              <li>• All text clearly visible and legible</li>
              <li>• Recent documents (within 3 months where applicable)</li>
              <li>• Business name matching your registration</li>
            </ul>
          </div>

          <div className="text-center py-2">
            <p className="text-sm text-gray-600">
              Documents checked: <span className="font-medium">{checkedDocs.size}</span> of {requiredDocuments.length}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button type="button" variant="outline" onClick={onBack}>
          Back
        </Button>
        <Button 
          onClick={handleNext}
          disabled={checkedDocs.size !== requiredDocuments.length}
        >
          Review & Submit
        </Button>
      </div>
    </div>
  );
}