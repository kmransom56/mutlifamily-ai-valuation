import React from 'react';
import { Metadata } from 'next';
import UploadForm from '@/components/UploadForm';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, Brain, FileText, Download, ArrowRight, Zap, Target, BarChart3 } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Multifamily AI - Professional Property Analysis',
  description: 'Advanced AI-powered multifamily property analysis and pitch deck generation platform',
};

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow">
        <div className="container mx-auto px-4 py-12">
          {/* Hero Section */}
          <div className="text-center space-y-6 mb-16">
            <div className="inline-flex items-center rounded-lg bg-muted px-3 py-1 text-sm font-medium">
              <Zap className="h-4 w-4 mr-2" />
              Powered by Advanced AI
            </div>
            <h1 className="text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
              Multifamily Property
              <span className="text-primary"> Analysis</span>
            </h1>
            <p className="mx-auto max-w-[700px] text-lg text-muted-foreground">
              Transform your property documents into professional pitch decks and comprehensive 
              financial analysis with our AI-powered platform.
            </p>
          </div>

          {/* Upload Form */}
          <div className="max-w-4xl mx-auto mb-16">
            <Card>
              <CardHeader>
                <CardTitle className="text-center flex items-center justify-center gap-2">
                  <FileText className="h-6 w-6" />
                  Upload Property Documents
                </CardTitle>
              </CardHeader>
              <CardContent>
                <UploadForm />
              </CardContent>
            </Card>
          </div>

          {/* How It Works */}
          <div className="max-w-6xl mx-auto mb-16">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tight">How It Works</h2>
              <p className="text-lg text-muted-foreground">
                Transform your property data into professional presentations in minutes
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">Upload Documents</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Upload rent rolls, T12 statements, and offering memorandums in PDF or Excel format.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <Brain className="h-6 w-6" />
                    </div>
                    <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">AI Processing</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Advanced AI extracts key financial data, metrics, and property information automatically.
                  </p>
                </CardContent>
              </Card>

              <Card className="relative">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div className="hidden lg:block absolute -right-3 top-1/2 transform -translate-y-1/2">
                      <ArrowRight className="h-5 w-5 text-muted-foreground" />
                    </div>
                  </div>
                  <CardTitle className="text-lg">Analysis Generation</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Generate comprehensive financial models and professional investor presentations.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                    <Download className="h-6 w-6" />
                  </div>
                  <CardTitle className="text-lg">Download Results</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Download polished PowerPoint presentations and Excel analysis files ready for investors.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Features */}
          <div className="max-w-6xl mx-auto">
            <div className="text-center space-y-4 mb-12">
              <h2 className="text-3xl font-bold tracking-tight">Why Choose Multifamily AI?</h2>
              <p className="text-lg text-muted-foreground">
                Built specifically for multifamily real estate professionals
              </p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <Target className="h-12 w-12 text-primary" />
                  <CardTitle>Specialized for Multifamily</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Purpose-built for apartment buildings, student housing, and multifamily investments with 
                    industry-specific metrics and analysis.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Zap className="h-12 w-12 text-primary" />
                  <CardTitle>Lightning Fast</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    What takes hours manually now takes minutes. Generate professional pitch decks 
                    and analysis in under 5 minutes.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <Building2 className="h-12 w-12 text-primary" />
                  <CardTitle>Investor Ready</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Professional presentations that impress investors with comprehensive financial 
                    models and compelling visualizations.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
}
