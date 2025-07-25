import React from 'react';
import Link from 'next/link';
import { Building2, Calculator, FileText, Settings, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';
import UserMenu from '@/components/UserMenu';

export default function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <Building2 className="h-6 w-6" />
            <span className="hidden font-bold sm:inline-block">
              Multifamily AI
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Dashboard
            </Link>
            <Link
              href="/properties"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Properties
            </Link>
            <Link
              href="/calculator"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Calculator
            </Link>
            <Link
              href="/crm-integration"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              CRM
            </Link>
            <Link
              href="/docs"
              className="transition-colors hover:text-foreground/80 text-foreground/60"
            >
              Documentation
            </Link>
          </nav>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <Link href="/" className="flex items-center space-x-2 md:hidden">
              <Building2 className="h-6 w-6" />
              <span className="font-bold">Multifamily AI</span>
            </Link>
          </div>
          <nav className="flex items-center space-x-2">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 md:hidden">
              <Menu className="h-4 w-4" />
              <span className="sr-only">Menu</span>
            </Button>
            <UserMenu />
          </nav>
        </div>
      </div>
    </header>
  );
}
