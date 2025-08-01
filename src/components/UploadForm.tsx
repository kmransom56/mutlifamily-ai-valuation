'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, Upload, FileText, Calculator, Building2 } from 'lucide-react';

interface FileState {
  rentRoll: File | null;
  t12: File | null;
  offeringMemo: File | null;
  template: File | null;
}

interface PropertyInfo {
  propertyName: string;
  propertyType: string;
  investmentStrategy: string;
  units: string;
  location: string;
}

interface ProcessResponse {
  success: boolean;
  jobId?: string;
  message?: string;
  error?: string;
}

export default function UploadForm() {
  const router = useRouter();
  const [files, setFiles] = useState<FileState>({
    rentRoll: null,
    t12: null,
    offeringMemo: null,
    template: null,
  });
  const [propertyInfo, setPropertyInfo] = useState<PropertyInfo>({
    propertyName: '',
    propertyType: 'multifamily',
    investmentStrategy: 'value-add',
    units: '',
    location: '',
  });
  const [email, setEmail] = useState<string>('');
  const [notifyInvestors, setNotifyInvestors] = useState<boolean>(false);
  const [investorGroupId, setInvestorGroupId] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [jobId, setJobId] = useState<string>('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files: fileList } = e.target;
    if (fileList && fileList.length > 0) {
      setFiles((prev) => ({
        ...prev,
        [name]: fileList[0],
      }));
    }
  };

  const handlePropertyInfoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPropertyInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handlePropertySelectChange = (name: keyof PropertyInfo, value: string) => {
    setPropertyInfo((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEmail(e.target.value);
  };

  const handleNotifyInvestorsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNotifyInvestors(e.target.checked);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    
    // Validate at least one file is uploaded
    if (!files.rentRoll && !files.t12 && !files.offeringMemo) {
      setError('Please upload at least one property document');
      return;
    }

    // Validate property name
    if (!propertyInfo.propertyName.trim()) {
      setError('Please enter a property name');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      
      // Append files to form data
      if (files.rentRoll) formData.append('rent_roll', files.rentRoll);
      if (files.t12) formData.append('t12', files.t12);
      if (files.offeringMemo) formData.append('om', files.offeringMemo);
      if (files.template) formData.append('template', files.template);
      
      // Append property info
      Object.entries(propertyInfo).forEach(([key, value]) => {
        formData.append(key, value);
      });
      
      // Add email for notifications if provided
      if (email) formData.append('email', email);
      
      // Add investor notification settings
      formData.append('notifyInvestors', notifyInvestors.toString());
      if (notifyInvestors && investorGroupId) {
        formData.append('investorGroupId', investorGroupId);
      }

      // Submit form data to processing API
      const response = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data: ProcessResponse = await response.json();

      if (data.success && data.jobId) {
        setJobId(data.jobId);
        router.push(`/status?jobId=${data.jobId}`);
      } else {
        setError(data.message || data.error || 'An error occurred during processing');
      }
    } catch (err) {
      setError('Failed to submit files for processing');
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 p-4 text-red-800 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="h-4 w-4" />
          <span>{error}</span>
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Property Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="propertyName">Property Name</Label>
              <Input
                id="propertyName"
                name="propertyName"
                value={propertyInfo.propertyName}
                onChange={handlePropertyInfoChange}
                placeholder="Enter property name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="propertyType">Property Type</Label>
              <Select
                value={propertyInfo.propertyType}
                onValueChange={(value) => handlePropertySelectChange('propertyType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multifamily">Multifamily</SelectItem>
                  <SelectItem value="commercial">Commercial</SelectItem>
                  <SelectItem value="mixed-use">Mixed-Use</SelectItem>
                  <SelectItem value="single-family">Single Family</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="investmentStrategy">Investment Strategy</Label>
              <Select
                value={propertyInfo.investmentStrategy}
                onValueChange={(value) => handlePropertySelectChange('investmentStrategy', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select investment strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="value-add">Value-Add</SelectItem>
                  <SelectItem value="core-plus">Core-Plus</SelectItem>
                  <SelectItem value="opportunistic">Opportunistic</SelectItem>
                  <SelectItem value="core">Core</SelectItem>
                  <SelectItem value="development">Development</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="units">Number of Units</Label>
              <Input
                id="units"
                name="units"
                type="number"
                value={propertyInfo.units}
                onChange={handlePropertyInfoChange}
                placeholder="Enter number of units"
              />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                name="location"
                value={propertyInfo.location}
                onChange={handlePropertyInfoChange}
                placeholder="City, State"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Property Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="rentRoll">Rent Roll (PDF or Excel)</Label>
              <Input
                id="rentRoll"
                name="rentRoll"
                type="file"
                accept=".pdf,.xlsx,.xls,.xlsb"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-sm text-muted-foreground">
                Upload your property rent roll document
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="t12">T12 / Trailing 12 (Excel)</Label>
              <Input
                id="t12"
                name="t12"
                type="file"
                accept=".xlsx,.xls,.xlsb"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-sm text-muted-foreground">
                Upload your trailing 12 months financial data
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="offeringMemo">Offering Memorandum (PDF)</Label>
              <Input
                id="offeringMemo"
                name="offeringMemo"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-sm text-muted-foreground">
                Upload the property offering memorandum
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="template">Analysis Template (Excel)</Label>
              <Input
                id="template"
                name="template"
                type="file"
                accept=".xlsx,.xls,.xlsb,.xltx"
                onChange={handleFileChange}
                className="file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
              />
              <p className="text-sm text-muted-foreground">
                Upload your analysis spreadsheet template
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Notification Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email for Notifications</Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="your@email.com"
              />
              <p className="text-sm text-muted-foreground">
                We'll notify you when processing is complete
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                id="notifyInvestors"
                checked={notifyInvestors}
                onChange={handleNotifyInvestorsChange}
                className="rounded border-gray-300 text-primary focus:ring-primary focus:ring-offset-0"
              />
              <Label htmlFor="notifyInvestors" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                Notify Investor Group
              </Label>
            </div>

            {notifyInvestors && (
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="investorGroup">Investor Group</Label>
                <Select
                  value={investorGroupId}
                  onValueChange={setInvestorGroupId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select an investor group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="group1">Preferred Investors</SelectItem>
                    <SelectItem value="group2">Accredited Investors</SelectItem>
                    <SelectItem value="group3">Family Office</SelectItem>
                    <SelectItem value="group4">All Investors</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="min-w-[200px]"
        >
          {isSubmitting ? (
            <>
              <Upload className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Upload className="h-4 w-4 mr-2" />
              Process Documents
            </>
          )}
        </Button>
      </div>
    </form>
  );
}
