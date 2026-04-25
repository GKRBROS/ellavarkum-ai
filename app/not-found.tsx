'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8 max-w-md"
      >
        <div className="relative">
          <h1 className="text-[12rem] font-heading font-black text-slate-100 leading-none tracking-tighter select-none">404</h1>
          <div className="absolute inset-0 flex items-center justify-center">
            <h2 className="text-4xl font-heading font-black text-slate-900 tracking-tight">Lost in Space.</h2>
          </div>
        </div>
        
        <p className="text-slate-500 text-lg leading-relaxed">
          The page you&apos;re looking for has drifted away. Let&apos;s get you back to the generator.
        </p>
        
        <Link 
          href="/"
          className="inline-block px-10 py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all active:scale-95"
        >
          Back to Home
        </Link>
      </motion.div>
    </div>
  );
}
