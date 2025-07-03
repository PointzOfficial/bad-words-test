'use client';
import React from 'react';
import BadWordFilter from '@/components/BadWordFilter';

export default function Home() {

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            Bad Word Filter Demo
          </h1>
          <p className="text-gray-600 text-lg">
            Test and compare different bad word filtering libraries
          </p>
        </div>
        {/* Content */}
        <div className="max-w-4xl mx-auto">
          <BadWordFilter />
        </div>
      </div>
    </div>
  );
}
