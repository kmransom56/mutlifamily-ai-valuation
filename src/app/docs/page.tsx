import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'Documentation - Multifamily Apartment Valuation AI',
  description: 'Documentation for using the multifamily apartment valuation AI tool',
};

export default function DocsPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            Documentation
          </h1>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Getting Started</h2>
            <p className="mb-4">
              Multifamily Apartment Valuation AI helps you automate the extraction and analysis of data from 
              property documents. Follow these steps to get started:
            </p>
            
            <ol className="space-y-4 list-decimal pl-5">
              <li>
                <span className="font-medium">Prepare your documents:</span> Gather your Rent Rolls, T12 data, 
                and Offering Memorandums in PDF or Excel format.
              </li>
              <li>
                <span className="font-medium">Prepare your analysis template:</span> Have your Excel analysis 
                template ready for population.
              </li>
              <li>
                <span className="font-medium">Upload your documents:</span> Use the upload form on the home page 
                to submit your documents for processing.
              </li>
              <li>
                <span className="font-medium">Wait for processing:</span> Our AI system will extract and integrate 
                the data from your documents.
              </li>
              <li>
                <span className="font-medium">Download results:</span> Once processing is complete, download your 
                populated analysis template and extracted data.
              </li>
            </ol>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Supported Document Types</h2>
            
            <h3 className="font-medium text-lg mt-6 mb-2">Rent Rolls</h3>
            <p className="mb-3">
              Rent rolls contain information about the units in a property, their occupancy status, and rental rates.
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>Supported formats: PDF, Excel (.xlsx, .xls, .xlsb)</li>
              <li>Extracted data: Unit numbers, sizes, rental rates, lease terms, occupancy status</li>
            </ul>
            
            <h3 className="font-medium text-lg mt-6 mb-2">Trailing 12 (T12) Data</h3>
            <p className="mb-3">
              T12 data shows the property's financial performance over the past 12 months.
            </p>
            <ul className="list-disc pl-5 mb-4">
              <li>Supported formats: Excel (.xlsx, .xls, .xlsb)</li>
              <li>Extracted data: Income, expenses, NOI (Net Operating Income)</li>
            </ul>
            
            <h3 className="font-medium text-lg mt-6 mb-2">Offering Memorandums</h3>
            <p className="mb-3">
              Offering memorandums provide comprehensive information about the property being sold.
            </p>
            <ul className="list-disc pl-5">
              <li>Supported formats: PDF</li>
              <li>Extracted data: Property details, asking price, cap rate, unit mix</li>
            </ul>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Google Drive Integration</h2>
            <p className="mb-4">
              You can set up automatic processing of documents uploaded to Google Drive:
            </p>
            
            <ol className="space-y-3 list-decimal pl-5">
              <li>
                Contact support to set up your Google Drive integration
              </li>
              <li>
                Create a dedicated folder for your property documents
              </li>
              <li>
                Our system will monitor this folder for new documents
              </li>
              <li>
                When new documents are detected, they will be automatically processed
              </li>
              <li>
                You'll receive email notifications when processing is complete
              </li>
            </ol>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Troubleshooting</h2>
            
            <h3 className="font-medium text-lg mt-4 mb-2">Common Issues</h3>
            <ul className="space-y-4">
              <li>
                <span className="font-medium">Data extraction issues:</span> For best results, ensure your PDFs 
                contain selectable text rather than scanned images. If using scanned documents, make sure they 
                are clear and high-resolution.
              </li>
              <li>
                <span className="font-medium">Template population errors:</span> Ensure your analysis template 
                is in a supported Excel format (.xlsx, .xls, .xlsb, .xltx) and doesn't contain password protection 
                or complex macros.
              </li>
              <li>
                <span className="font-medium">Processing timeouts:</span> Very large documents may take longer to 
                process. If you experience timeouts, try splitting your documents into smaller files.
              </li>
            </ul>
            
            <h3 className="font-medium text-lg mt-6 mb-2">Getting Help</h3>
            <p>
              If you encounter any issues not covered here, please contact our support team at 
              <a href="mailto:support@multifamilyai.com" className="text-blue-600 hover:text-blue-800 ml-1">
                support@multifamilyai.com
              </a>
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
