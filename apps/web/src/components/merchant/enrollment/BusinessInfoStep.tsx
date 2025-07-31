import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BusinessInfo } from '@/types/merchant';

interface BusinessInfoStepProps {
  initialData?: Partial<BusinessInfo>;
  onNext: (data: BusinessInfo) => void;
  onBack?: () => void;
}

// Test data generators
const companyNames = ['Stellar', 'Nova', 'Quantum', 'Phoenix', 'Apex', 'Zenith', 'Cosmos', 'Nexus'];
const suffixes = ['Corp', 'Inc', 'LLC', 'Holdings', 'Enterprises', 'Solutions', 'Group'];
const businessTypes = ['Electronics', 'Fashion', 'Services', 'Technology', 'Healthcare', 'Restaurant'];
const streets = ['Main', 'Oak', 'Maple', 'Cedar', 'Elm', 'Pine', 'Washington', 'Broadway'];
const cities = ['New York', 'Los Angeles', 'Chicago', 'Houston', 'Phoenix', 'Philadelphia', 'San Antonio', 'San Diego'];
const states = ['NY', 'CA', 'IL', 'TX', 'AZ', 'PA', 'TX', 'CA'];

const generateTestData = (): BusinessInfo => {
  const companyName = companyNames[Math.floor(Math.random() * companyNames.length)];
  const suffix = suffixes[Math.floor(Math.random() * suffixes.length)];
  const businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
  const streetName = streets[Math.floor(Math.random() * streets.length)];
  const cityIndex = Math.floor(Math.random() * cities.length);
  const city = cities[cityIndex];
  const state = states[cityIndex];
  
  return {
    legalName: `${companyName} ${suffix}`,
    tradingName: `${companyName} ${businessType}`,
    registrationNumber: Math.random().toString().slice(2, 11),
    taxId: `${Math.floor(Math.random() * 90) + 10}-${Math.floor(Math.random() * 9000000) + 1000000}`,
    category: businessCategories[Math.floor(Math.random() * businessCategories.length)] as any,
    subcategory: businessType,
    yearEstablished: Math.floor(Math.random() * 20) + 2004,
    monthlyVolume: Math.floor(Math.random() * 90000) + 10000,
    website: `https://www.${companyName.toLowerCase()}-${businessType.toLowerCase()}.com`,
    description: `Leading provider of ${businessType.toLowerCase()} products and services. We specialize in innovative solutions for modern businesses with a focus on quality and customer satisfaction.`,
    businessAddress: {
      street: `${Math.floor(Math.random() * 9000) + 1000} ${streetName} Street`,
      city: city,
      state: state,
      postalCode: Math.floor(Math.random() * 90000 + 10000).toString(),
      country: 'US',
    },
  };
};

const businessCategories = [
  'retail',
  'restaurant',
  'services',
  'healthcare',
  'education',
  'technology',
  'automotive',
  'home_garden',
  'fashion',
  'electronics',
  'other'
];

export function BusinessInfoStep({ initialData, onNext, onBack }: BusinessInfoStepProps) {
  const [formData, setFormData] = useState<BusinessInfo>({
    legalName: initialData?.legalName || '',
    tradingName: initialData?.tradingName || '',
    registrationNumber: initialData?.registrationNumber || '',
    taxId: initialData?.taxId || '',
    category: initialData?.category || ('' as any),
    subcategory: initialData?.subcategory || '',
    yearEstablished: initialData?.yearEstablished || new Date().getFullYear(),
    monthlyVolume: initialData?.monthlyVolume || 0,
    website: initialData?.website || '',
    description: initialData?.description || '',
    businessAddress: {
      street: initialData?.businessAddress?.street || '',
      city: initialData?.businessAddress?.city || '',
      state: initialData?.businessAddress?.state || '',
      postalCode: initialData?.businessAddress?.postalCode || '',
      country: initialData?.businessAddress?.country || 'US',
    },
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.legalName) newErrors.legalName = 'Legal name is required';
    if (!formData.tradingName) newErrors.tradingName = 'Trading name is required';
    if (!formData.registrationNumber) newErrors.registrationNumber = 'Registration number is required';
    if (!formData.taxId) newErrors.taxId = 'Tax ID is required';
    if (!formData.category) newErrors.category = 'Business category is required';
    if (!formData.website) newErrors.website = 'Website is required';
    if (!formData.description) newErrors.description = 'Business description is required';
    
    // Address validation
    if (!formData.businessAddress.street) newErrors.street = 'Street address is required';
    if (!formData.businessAddress.city) newErrors.city = 'City is required';
    if (!formData.businessAddress.state) newErrors.state = 'State is required';
    if (!formData.businessAddress.postalCode) newErrors.postalCode = 'Postal code is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onNext(formData);
    }
  };

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateAddressField = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessAddress: { ...prev.businessAddress, [field]: value }
    }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAutofill = () => {
    const testData = generateTestData();
    setFormData(testData);
    setErrors({});
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>
                Tell us about your business. This information will be used for verification.
              </CardDescription>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAutofill}
              className="flex items-center gap-2"
            >
              <span>🎲</span> Autofill Test Data
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="legalName">Legal Business Name *</Label>
              <Input
                id="legalName"
                value={formData.legalName}
                onChange={(e) => updateField('legalName', e.target.value)}
                placeholder="ABC Corp"
                className={errors.legalName ? 'border-red-500' : ''}
              />
              {errors.legalName && <p className="text-sm text-red-500">{errors.legalName}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="tradingName">Trading Name *</Label>
              <Input
                id="tradingName"
                value={formData.tradingName}
                onChange={(e) => updateField('tradingName', e.target.value)}
                placeholder="ABC Store"
                className={errors.tradingName ? 'border-red-500' : ''}
              />
              {errors.tradingName && <p className="text-sm text-red-500">{errors.tradingName}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="registrationNumber">Business Registration Number *</Label>
              <Input
                id="registrationNumber"
                value={formData.registrationNumber}
                onChange={(e) => updateField('registrationNumber', e.target.value)}
                placeholder="123456789"
                className={errors.registrationNumber ? 'border-red-500' : ''}
              />
              {errors.registrationNumber && <p className="text-sm text-red-500">{errors.registrationNumber}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="taxId">Tax ID / EIN *</Label>
              <Input
                id="taxId"
                value={formData.taxId}
                onChange={(e) => updateField('taxId', e.target.value)}
                placeholder="12-3456789"
                className={errors.taxId ? 'border-red-500' : ''}
              />
              {errors.taxId && <p className="text-sm text-red-500">{errors.taxId}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Business Category *</Label>
              <Select value={formData.category} onValueChange={(value) => updateField('category', value)}>
                <SelectTrigger className={errors.category ? 'border-red-500' : ''}>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {businessCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subcategory">Subcategory</Label>
              <Input
                id="subcategory"
                value={formData.subcategory}
                onChange={(e) => updateField('subcategory', e.target.value)}
                placeholder="Electronics"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="yearEstablished">Year Established</Label>
              <Input
                id="yearEstablished"
                type="number"
                value={formData.yearEstablished}
                onChange={(e) => updateField('yearEstablished', parseInt(e.target.value))}
                min="1900"
                max={new Date().getFullYear()}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="monthlyVolume">Estimated Monthly Volume (USD)</Label>
              <Input
                id="monthlyVolume"
                type="number"
                value={formData.monthlyVolume}
                onChange={(e) => updateField('monthlyVolume', parseFloat(e.target.value))}
                placeholder="10000"
                min="0"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="website">Website *</Label>
              <Input
                id="website"
                type="url"
                value={formData.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://example.com"
                className={errors.website ? 'border-red-500' : ''}
              />
              {errors.website && <p className="text-sm text-red-500">{errors.website}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Business Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Describe your business, products, and services..."
              rows={3}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Business Address</CardTitle>
          <CardDescription>
            Your registered business address
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="street">Street Address *</Label>
            <Input
              id="street"
              value={formData.businessAddress.street}
              onChange={(e) => updateAddressField('street', e.target.value)}
              placeholder="123 Main St"
              className={errors.street ? 'border-red-500' : ''}
            />
            {errors.street && <p className="text-sm text-red-500">{errors.street}</p>}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="city">City *</Label>
              <Input
                id="city"
                value={formData.businessAddress.city}
                onChange={(e) => updateAddressField('city', e.target.value)}
                placeholder="New York"
                className={errors.city ? 'border-red-500' : ''}
              />
              {errors.city && <p className="text-sm text-red-500">{errors.city}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="state">State *</Label>
              <Input
                id="state"
                value={formData.businessAddress.state}
                onChange={(e) => updateAddressField('state', e.target.value)}
                placeholder="NY"
                className={errors.state ? 'border-red-500' : ''}
              />
              {errors.state && <p className="text-sm text-red-500">{errors.state}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="postalCode">Postal Code *</Label>
              <Input
                id="postalCode"
                value={formData.businessAddress.postalCode}
                onChange={(e) => updateAddressField('postalCode', e.target.value)}
                placeholder="10001"
                className={errors.postalCode ? 'border-red-500' : ''}
              />
              {errors.postalCode && <p className="text-sm text-red-500">{errors.postalCode}</p>}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="country">Country</Label>
              <Input
                id="country"
                value={formData.businessAddress.country}
                onChange={(e) => updateAddressField('country', e.target.value)}
                placeholder="US"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between">
        {onBack && (
          <Button type="button" variant="outline" onClick={onBack}>
            Back
          </Button>
        )}
        <Button type="submit" className="ml-auto">
          Next: Contact Information
        </Button>
      </div>
    </form>
  );
}