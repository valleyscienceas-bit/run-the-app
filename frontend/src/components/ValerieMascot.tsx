import React from 'react';
import { motion } from 'motion/react';

export type ValerieExpression = 'happy' | 'thinking' | 'excited' | 'proud';

interface ValerieMascotProps {
  size?: number;
  className?: string;
  isWaving?: boolean;
  isSpinning?: boolean;
  expression?: ValerieExpression;
}

export function ValerieMascot({ 
  size = 200, 
  className, 
  isWaving = false, 
  isSpinning = false,
  expression = 'happy'
}: ValerieMascotProps) {
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
        {/* Glow effect */}
        <defs>
          <radialGradient id="glow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
            <stop offset="0%" stopColor="#FADADD" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#FADADD" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="100" cy="100" r="80" fill="url(#glow)" />

        {/* Body - Softer, more organic shape */}
        <motion.path
          d="M50 100C50 70 70 60 100 60C130 60 150 70 150 100C150 130 130 150 100 150C70 150 50 130 50 100Z"
          fill="#FADADD"
          stroke="#334155"
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
        
        {/* Head - Integrated more smoothly */}
        <motion.path
          d="M65 60C65 40 80 30 100 30C120 30 135 40 135 60L135 75L65 75L65 60Z"
          fill="#FADADD"
          stroke="#334155"
          strokeWidth="4"
          animate={{
            y: [0, -2, 0]
          }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        />
        
        {/* Blush */}
        <circle cx="80" cy="65" r="6" fill="#FFB6C1" opacity="0.6" />
        <circle cx="120" cy="65" r="6" fill="#FFB6C1" opacity="0.6" />

        {/* Eyes */}
        <motion.g animate={{ scaleY: [1, 1, 0.1, 1, 1] }} transition={{ duration: 3, repeat: Infinity, times: [0, 0.4, 0.5, 0.6, 1] }}>
          <circle cx="85" cy="55" r="5" fill="#334155" />
          <circle cx="115" cy="55" r="5" fill="#334155" />
          {/* Eye shines */}
          <circle cx="83" cy="53" r="1.5" fill="white" />
          <circle cx="113" cy="53" r="1.5" fill="white" />
        </motion.g>
        
        {/* Mouth */}
        {expression === 'happy' && (
          <path d="M90 68C90 68 95 72 100 72C105 72 110 68 110 68" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        )}
        {expression === 'excited' && (
          <path d="M90 68C90 72 95 76 100 76C105 76 110 72 110 68" fill="#334155" />
        )}
        {expression === 'thinking' && (
          <path d="M92 70L108 70" stroke="#334155" strokeWidth="2" strokeLinecap="round" />
        )}

        {/* Graduation Cap */}
        <g transform="translate(0, -5)">
          <path d="M50 30L100 15L150 30L100 45L50 30Z" fill="#334155" />
          <rect x="95" y="15" width="10" height="15" fill="#334155" />
          <path d="M150 30V45" stroke="#F1C40F" strokeWidth="2" />
          <circle cx="150" cy="45" r="3" fill="#F1C40F" />
        </g>

        {/* Arms */}
        <g>
          {/* Left Arm */}
          <path 
            d="M55 110C45 110 35 120 30 125" 
            stroke="#334155" 
            strokeWidth="6" 
            strokeLinecap="round" 
          />
          {/* Right Arm */}
          <motion.path 
            d="M145 110C155 110 165 100 175 90" 
            stroke="#334155" 
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

        {/* Legs */}
        <rect x="82" y="145" width="8" height="15" rx="4" fill="#334155" />
        <rect x="110" y="145" width="8" height="15" rx="4" fill="#334155" />
      </svg>
    </motion.div>
  );
}
