'use client';

import Link from 'next/link';
import { ShoppingCart, Heart, User, Search, Menu } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Navbar() {
  return (
    <nav className="sticky top-0 z-50 w-full bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Logo */}
          <div className="flex items-center gap-8">
            <Link
              href="/"
              className="text-xl font-semibold text-gray-900 tracking-tight flex items-center gap-2"
            >
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold italic">
                E
              </div>
              <span className="hidden sm:block">ECONTRACT</span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/"
                className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
              >
                Catalog
              </Link>
              <Link
                href="#"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                Solutions
              </Link>
              <Link
                href="#"
                className="text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors"
              >
                About
              </Link>
            </div>
          </div>

          {/* Search Bar - SaaS Style */}
          <div className="hidden lg:flex flex-1 max-w-md mx-8">
            <div className="relative w-full">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                className="block w-full bg-gray-50 border border-gray-200 rounded-full py-1.5 pl-10 pr-3 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2 transition-all"
                placeholder="Search products, hardware, software..."
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 md:gap-4">
            <Link href="/wishlist">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900 rounded-full"
              >
                <Heart className="h-5 w-5" />
              </Button>
            </Link>
            <Link href="/cart">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900 rounded-full relative"
              >
                <ShoppingCart className="h-5 w-5" />
                <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center border-2 border-white">
                  1
                </span>
              </Button>
            </Link>
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block" />
            <Link href="/account">
              <Button
                variant="ghost"
                size="icon"
                className="text-gray-500 hover:text-gray-900 rounded-full"
              >
                <User className="h-5 w-5" />
              </Button>
            </Link>
            <div className="md:hidden">
              <Button variant="ghost" size="icon" className="text-gray-500 rounded-full">
                <Menu className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
