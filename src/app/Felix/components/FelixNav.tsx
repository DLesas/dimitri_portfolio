'use client';

import { usePathname, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Button } from '@heroui/react';
import { useState } from 'react';

export default function FelixNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [hoveredButton, setHoveredButton] = useState<'home' | 'demo' | null>(null);

  const isHome = pathname === '/Felix';
  const isDemo = pathname === '/Felix/Demo';

  return (
    <>
      {/* Desktop: Left Sidebar Navigation */}
      <motion.div
        initial={{ x: -20, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="fixed left-6 top-1/2 -translate-y-1/2 z-40 hidden lg:block"
      >
        <div className="flex flex-col gap-2 bg-default-100/80 backdrop-blur-md rounded-2xl p-2 shadow-lg border border-default-200">
          <div
            onMouseEnter={() => setHoveredButton('home')}
            onMouseLeave={() => setHoveredButton(null)}
            className="relative"
          >
            <Button
              isIconOnly
              variant={isHome ? 'solid' : 'light'}
              color={isHome ? 'primary' : 'default'}
              size="lg"
              onPress={() => router.push('/Felix')}
              className="h-14 w-14"
              aria-label="Home"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                />
              </svg>
            </Button>
            {hoveredButton === 'home' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-default-900 text-default-50 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap pointer-events-none"
              >
                Case Study
              </motion.div>
            )}
          </div>

          <div className="h-px bg-default-300 mx-2" />

          <div
            onMouseEnter={() => setHoveredButton('demo')}
            onMouseLeave={() => setHoveredButton(null)}
            className="relative"
          >
            <Button
              isIconOnly
              variant={isDemo ? 'solid' : 'light'}
              color={isDemo ? 'primary' : 'default'}
              size="lg"
              onPress={() => router.push('/Felix/Demo')}
              className="h-14 w-14"
              aria-label="Demo"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.227 0 4.458l-1.502 1.502c-1.232 1.232-3.227 1.232-4.458 0l-1.402-1.402M5 14.5V12m0 0V9.75m0 2.25h2.25"
                />
              </svg>
            </Button>
            {hoveredButton === 'demo' && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute left-full ml-3 top-1/2 -translate-y-1/2 bg-default-900 text-default-50 px-3 py-1.5 rounded-lg text-sm whitespace-nowrap pointer-events-none"
              >
                Live Demo
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Mobile/Tablet: Bottom Sticky Navigation */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="fixed bottom-0 left-0 right-0 z-40 block lg:hidden"
      >
        <div className="bg-background/80 backdrop-blur-lg border-t border-default-200 shadow-lg">
          <div className="max-w-screen-sm mx-auto px-4 pb-safe">
            <div className="flex items-center justify-around gap-2 py-3">
              {/* Case Study Button */}
              <button
                onClick={() => router.push('/Felix')}
                className={`flex flex-col items-center justify-center gap-1.5 px-6 py-2 rounded-xl transition-all duration-200 min-w-[120px] ${
                  isHome
                    ? 'bg-primary/10 text-primary scale-105'
                    : 'text-default-600 hover:text-default-900 dark:hover:text-default-100 hover:bg-default-100 dark:hover:bg-default-50/10'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-6 h-6 transition-transform ${isHome ? 'scale-110' : ''}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25"
                  />
                </svg>
                <span className={`text-xs font-medium ${isHome ? 'font-semibold' : ''}`}>
                  Case Study
                </span>
              </button>

              {/* Live Demo Button */}
              <button
                onClick={() => router.push('/Felix/Demo')}
                className={`flex flex-col items-center justify-center gap-1.5 px-6 py-2 rounded-xl transition-all duration-200 min-w-[120px] ${
                  isDemo
                    ? 'bg-primary/10 text-primary scale-105'
                    : 'text-default-600 hover:text-default-900 dark:hover:text-default-100 hover:bg-default-100 dark:hover:bg-default-50/10'
                }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className={`w-6 h-6 transition-transform ${isDemo ? 'scale-110' : ''}`}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23-.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232 1.232 3.227 0 4.458l-1.502 1.502c-1.232 1.232-3.227 1.232-4.458 0l-1.402-1.402M5 14.5V12m0 0V9.75m0 2.25h2.25"
                  />
                </svg>
                <span className={`text-xs font-medium ${isDemo ? 'font-semibold' : ''}`}>
                  Live Demo
                </span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  );
}
