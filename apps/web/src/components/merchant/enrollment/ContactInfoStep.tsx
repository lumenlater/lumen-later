'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { ContactInfo, ContactPerson } from '@/types/merchant';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface ContactInfoStepProps {
  initialData?: ContactInfo;
  onNext: (data: ContactInfo) => void;
  onBack: () => void;
}

// Test data generators
const firstNames = ['John', 'Sarah', 'Michael', 'Jennifer', 'Robert', 'Lisa', 'David', 'Maria'];
const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis'];
const titles = ['CEO', 'CTO', 'CFO', 'COO', 'President', 'Vice President', 'Director', 'Manager'];
const domains = ['gmail.com', 'company.com', 'business.com', 'corp.com', 'enterprise.com'];

const generateContactPerson = (type: string): ContactPerson => {
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  
  const titleIndex = Math.floor(Math.random() * titles.length);
  let title = titles[titleIndex];
  
  if (type === 'technical') {
    title = ['CTO', 'Technical Director', 'IT Manager', 'Engineering Manager'][Math.floor(Math.random() * 4)];
  } else if (type === 'financial') {
    title = ['CFO', 'Finance Director', 'Controller', 'Accounting Manager'][Math.floor(Math.random() * 4)];
  }
  
  return {
    firstName,
    lastName,
    title,
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${domain}`,
    phone: `+1 ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 900) + 100} ${Math.floor(Math.random() * 9000) + 1000}`,
  };
};

export function ContactInfoStep({ initialData, onNext, onBack }: ContactInfoStepProps) {
  const [contactInfo, setContactInfo] = useState<ContactInfo>(
    initialData || {
      primaryContact: {
        firstName: '',
        lastName: '',
        title: '',
        email: '',
        phone: '',
      },
    }
  );

  const [hasTechnicalContact, setHasTechnicalContact] = useState(!!initialData?.technicalContact);
  const [hasFinancialContact, setHasFinancialContact] = useState(!!initialData?.financialContact);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const validateContact = (contact: ContactPerson, prefix: string): boolean => {
    const newErrors: Record<string, string> = {};

    if (!contact.firstName) {
      newErrors[`${prefix}.firstName`] = 'First name is required';
    }
    if (!contact.lastName) {
      newErrors[`${prefix}.lastName`] = 'Last name is required';
    }
    if (!contact.title) {
      newErrors[`${prefix}.title`] = 'Title is required';
    }
    if (!contact.email) {
      newErrors[`${prefix}.email`] = 'Email is required';
    } else if (!validateEmail(contact.email)) {
      newErrors[`${prefix}.email`] = 'Invalid email format';
    }
    if (!contact.phone) {
      newErrors[`${prefix}.phone`] = 'Phone is required';
    } else if (!validatePhone(contact.phone)) {
      newErrors[`${prefix}.phone`] = 'Invalid phone format';
    }

    setErrors(prev => ({ ...prev, ...newErrors }));
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    setErrors({});
    let isValid = true;

    // Validate primary contact
    isValid = validateContact(contactInfo.primaryContact, 'primary') && isValid;

    // Validate technical contact if enabled
    if (hasTechnicalContact && contactInfo.technicalContact) {
      isValid = validateContact(contactInfo.technicalContact, 'technical') && isValid;
    }

    // Validate financial contact if enabled
    if (hasFinancialContact && contactInfo.financialContact) {
      isValid = validateContact(contactInfo.financialContact, 'financial') && isValid;
    }

    if (isValid) {
      const finalData: ContactInfo = {
        primaryContact: contactInfo.primaryContact,
        ...(hasTechnicalContact && contactInfo.technicalContact && {
          technicalContact: contactInfo.technicalContact,
        }),
        ...(hasFinancialContact && contactInfo.financialContact && {
          financialContact: contactInfo.financialContact,
        }),
      };
      onNext(finalData);
    }
  };

  const updateContact = (
    type: 'primaryContact' | 'technicalContact' | 'financialContact',
    field: keyof ContactPerson,
    value: string
  ) => {
    setContactInfo(prev => ({
      ...prev,
      [type]: {
        ...prev[type],
        [field]: value,
      },
    }));
    // Clear error when user starts typing
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${type.replace('Contact', '')}.${field}`];
      return newErrors;
    });
  };

  const renderContactForm = (
    type: 'primaryContact' | 'technicalContact' | 'financialContact',
    title: string
  ) => {
    const contact = contactInfo[type] || {
      firstName: '',
      lastName: '',
      title: '',
      email: '',
      phone: '',
    };
    const prefix = type.replace('Contact', '');

    return (
      <div className="space-y-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor={`${type}-firstName`}>First Name</Label>
            <Input
              id={`${type}-firstName`}
              value={contact.firstName}
              onChange={(e) => updateContact(type, 'firstName', e.target.value)}
              className={errors[`${prefix}.firstName`] ? 'border-red-500' : ''}
            />
            {errors[`${prefix}.firstName`] && (
              <p className="text-sm text-red-500 mt-1">{errors[`${prefix}.firstName`]}</p>
            )}
          </div>
          <div>
            <Label htmlFor={`${type}-lastName`}>Last Name</Label>
            <Input
              id={`${type}-lastName`}
              value={contact.lastName}
              onChange={(e) => updateContact(type, 'lastName', e.target.value)}
              className={errors[`${prefix}.lastName`] ? 'border-red-500' : ''}
            />
            {errors[`${prefix}.lastName`] && (
              <p className="text-sm text-red-500 mt-1">{errors[`${prefix}.lastName`]}</p>
            )}
          </div>
        </div>

        <div>
          <Label htmlFor={`${type}-title`}>Title/Position</Label>
          <Input
            id={`${type}-title`}
            value={contact.title}
            onChange={(e) => updateContact(type, 'title', e.target.value)}
            placeholder="e.g., CEO, CTO, CFO"
            className={errors[`${prefix}.title`] ? 'border-red-500' : ''}
          />
          {errors[`${prefix}.title`] && (
            <p className="text-sm text-red-500 mt-1">{errors[`${prefix}.title`]}</p>
          )}
        </div>

        <div>
          <Label htmlFor={`${type}-email`}>Email</Label>
          <Input
            id={`${type}-email`}
            type="email"
            value={contact.email}
            onChange={(e) => updateContact(type, 'email', e.target.value)}
            placeholder="contact@company.com"
            className={errors[`${prefix}.email`] ? 'border-red-500' : ''}
          />
          {errors[`${prefix}.email`] && (
            <p className="text-sm text-red-500 mt-1">{errors[`${prefix}.email`]}</p>
          )}
        </div>

        <div>
          <Label htmlFor={`${type}-phone`}>Phone</Label>
          <Input
            id={`${type}-phone`}
            type="tel"
            value={contact.phone}
            onChange={(e) => updateContact(type, 'phone', e.target.value)}
            placeholder="+1 234 567 8900"
            className={errors[`${prefix}.phone`] ? 'border-red-500' : ''}
          />
          {errors[`${prefix}.phone`] && (
            <p className="text-sm text-red-500 mt-1">{errors[`${prefix}.phone`]}</p>
          )}
        </div>
      </div>
    );
  };

  const handleAutofill = () => {
    const newContactInfo: ContactInfo = {
      primaryContact: generateContactPerson('primary'),
      technicalContact: generateContactPerson('technical'),
      financialContact: generateContactPerson('financial'),
    };
    
    setContactInfo(newContactInfo);
    setHasTechnicalContact(true);
    setHasFinancialContact(true);
    setErrors({});
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>Contact Information</CardTitle>
            <CardDescription>
              Provide contact details for your business. The primary contact is required.
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
      <CardContent>
        <div className="space-y-8">
          {/* Primary Contact */}
          {renderContactForm('primaryContact', 'Primary Contact (Required)')}

          {/* Additional Contacts */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Additional Contacts (Optional)</h3>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="technical-contact"
                checked={hasTechnicalContact}
                onCheckedChange={(checked) => {
                  setHasTechnicalContact(!!checked);
                  if (!checked) {
                    setContactInfo(prev => {
                      const { technicalContact, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
              />
              <Label htmlFor="technical-contact">Add Technical Contact</Label>
            </div>

            {hasTechnicalContact && renderContactForm('technicalContact', 'Technical Contact')}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="financial-contact"
                checked={hasFinancialContact}
                onCheckedChange={(checked) => {
                  setHasFinancialContact(!!checked);
                  if (!checked) {
                    setContactInfo(prev => {
                      const { financialContact, ...rest } = prev;
                      return rest;
                    });
                  }
                }}
              />
              <Label htmlFor="financial-contact">Add Financial Contact</Label>
            </div>

            {hasFinancialContact && renderContactForm('financialContact', 'Financial Contact')}
          </div>

          {/* Navigation */}
          <div className="flex justify-between pt-6">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSubmit}>
              Next
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}