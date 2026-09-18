import React, { useId } from 'react';
import { motion } from 'motion/react';
import { useDarkMode } from '../lib/theme';

export type ValerieExpression = 'happy' | 'thinking' | 'excited' | 'proud';

interface ValerieMascotProps {
  size?: number;
  className?: string;
  isWaving?: boolean;
  isSpinning?: boolean;
  expression?: ValerieExpression;
  /** Always use light-mode colors (e.g. landing page hero in dark mode) */
  forceLightPalette?: boolean;
}

export function ValerieMascot({ 
  size = 200, 
  className, 
  isWaving = false, 
  isSpinning = false,
  expression = 'happy',
  forceLightPalette = false,
}: ValerieMascotProps) {
  const systemDark = useDarkMode();
  const isDark = forceLightPalette ? false : systemDark;
  const instanceId = useId().replace(/:/g, '');
  const bodyFill = isDark ? '#90E0EF' : '#48CAE4';
  const stroke = isDark ? '#e2e8f0' : '#334155';
  const blush = isDark ? '#0077B6' : '#00B4D8';
  const capFill = isDark ? '#cbd5e1' : '#334155';
  const glowId = `valerie-glow-${instanceId}`;

  return (
    <motion.div 
      className={className}
      animate={isSpinning ? { rotate: 360 } : {}}
      transition={isSpinning ? { duration: 2, repeat: Infinity, ease: "linear" } : {}}
    >
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 200 200" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <radialGradient id={glowId} cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor={bodyFill} stopOpacity={isDark ? "0.35" : "0.4"} />
            <stop offset="100%" stopColor={bodyFill} stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="80" fill={`url(#${glowId})`} />

        <motion.path
          d="M50 100C50 70 70 60 100 60C130 60 150 70 150 100C150 130 130 150 100 150C70 150 50 130 50 100Z"
          fill={bodyFill}
          stroke={stroke}
          strokeWidth="4"
          animate={{
            d: [
              "M50 100C50 70 70 60 100 60C130 60 150 70 150 100C150 130 130 150 100 150C70 150 50 130 50 100Z",
              "M50 102C50 72 70 62 100 62C130 62 150 72 150 102C150 132 130 152 100 152C70 152 50 132 50 102Z",
              "M50 100C50 70 70 60 100 60C130 60 150 70 150 100C150 130 130 150 100 150C70 150 50 130 50 100Z"
            ]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <motion.path
          d="M65 60C65 40 80 30 100 30C120 30 135 40 135 60L135 75L65 75L65 60Z"
          fill={bodyFill}
          stroke={stroke}
          strokeWidth="4"
          animate={{ y: [0, -2, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        <circle cx="80" cy="65" r="6" fill={blush} opacity="0.6" />
        <circle cx="120" cy="65" r="6" fill={blush} opacity="0.6" />

        <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.5, 0.6, 1] }}>
          <circle cx="85" cy="55" r="5" fill={stroke} />
          <circle cx="115" cy="55" r="5" fill={stroke} />
          <circle cx="83" cy="53" r="1.5" fill={isDark ? '#1e293b' : 'white'} />
          <circle cx="113" cy="53" r="1.5" fill={isDark ? '#1e293b' : 'white'} />
        </motion.g>
        
        {expression === 'happy' && (
          <path d="M90 68C90 68 95 72 100 72C105 72 110 68 110 68" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        )}
        {expression === 'excited' && (
          <path d="M90 68C90 72 95 76 100 76C105 76 110 72 110 68" fill={stroke} />
        )}
        {expression === 'thinking' && (
          <path d="M92 70L108 70" stroke={stroke} strokeWidth="2" strokeLinecap="round" />
        )}

        <g transform="translate(0, -5)">
          <path d="M50 30L100 15L150 30L100 45L50 30Z" fill={capFill} />
          <rect x="95" y="15" width="10" height="15" fill={capFill} />
          <path d="M150 30V45" stroke="#F1C40F" strokeWidth="2" />
          <circle cx="150" cy="45" r="3" fill="#F1C40F" />
        </g>

        <g>
          <path d="M55 110C45 110 35 120 30 125" stroke={stroke} strokeWidth="6" strokeLinecap="round" />
          <motion.path 
            d="M145 110C155 110 165 100 175 90" 
            stroke={stroke} 
            strokeWidth="6" 
            strokeLinecap="round"
            animate={isWaving ? { 
              d: [
                "M145 110C155 110 165 100 175 90",
                "M145 110C155 100 165 80 175 70",
                "M145 110C155 110 165 100 175 90"
              ]
            } : {}}
            transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
          />
        </g>

        <rect x="82" y="145" width="8" height="15" rx="4" fill={stroke} />
        <rect x="110" y="145" width="8" height="15" rx="4" fill={stroke} />
      </svg>
    </motion.div>
  );
}
