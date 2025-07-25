import React from 'react';
import { Metadata } from 'next';
import Link from 'next/link';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export const metadata: Metadata = {
  title: 'About - Multifamily Apartment Valuation AI',
  description: 'Learn about our automated valuation tool for multifamily apartment properties',
};

export default function AboutPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-center mb-8">
            About Multifamily Apartment Valuation AI
          </h1>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Our Mission</h2>
            <p className="mb-4">
              Multifamily Apartment Valuation AI was created to streamline the process of analyzing multifamily property 
              investments. Our mission is to save real estate professionals valuable time by automating the tedious 
              data extraction and analysis process.
            </p>
            <p>
              By leveraging advanced AI technology, we can extract key data points from various document formats 
              (PDFs, spreadsheets) and integrate them into your analysis templates, allowing you to make faster, 
              more informed investment decisions.
            </p>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4">Key Features</h2>
            <ul className="space-y-3 list-disc pl-5">
              <li>
                <span className="font-medium">Automated Data Extraction:</span> Extract data from Offering Memorandums, 
                Rent Rolls, and Trailing 12 financial statements
              </li>
              <li>
                <span className="font-medium">Multiple Format Support:</span> Process PDFs and various Excel formats 
                (.xlsx, .xls, .xlsb, .xltx)
              </li>
              <li>
                <span className="font-medium">Template Population:</span> Automatically populate your analysis templates 
                with extracted data
              </li>
              <li>
                <span className="font-medium">Google Drive Integration:</span> Monitor folders for new documents and 
                process them automatically
              </li>
              <li>
                <span className="font-medium">Email Notifications:</span> Receive alerts when processing is complete
              </li>
            </ul>
          </div>
          
          <div className="bg-white shadow-md rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Technology</h2>
            <p className="mb-4">
              Our system uses a combination of OCR (Optical Character Recognition), machine learning, and data processing 
              techniques to accurately extract and interpret information from your documents.
            </p>
            <p className="mb-4">
              The architecture consists of four main components:
            </p>
            <ol className="space-y-3 list-decimal pl-5 mb-4">
              <li>
                <span className="font-medium">Document Processor:</span> Classifies document types and preprocesses them for extraction
              </li>
              <li>
                <span className="font-medium">Data Extraction Module:</span> Extracts structured data from PDFs and spreadsheets
              </li>
              <li>
                <span className="font-medium">Data Transformation Module:</span> Normalizes and validates extracted data
              </li>
              <li>
                <span className="font-medium">Spreadsheet Integration Module:</span> Populates analysis templates with processed data
              </li>
            </ol>
            <p>
              The web interface is built with Next.js and deployed on Cloudflare's global network for fast, reliable access.
            </p>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
