'use client'

import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'

interface CapybaraBotProps {
  size?: 'sm' | 'md' | 'lg' | 'xl'
  mood?: 'idle' | 'thinking' | 'happy' | 'scanning'
  showGlow?: boolean
  className?: string
}

const sizes = {
  sm: 60,
  md: 100,
  lg: 160,
  xl: 240,
}

export default function CapybaraBot({
  size = 'md',
  mood = 'idle',
  showGlow = true,
  className = '',
}: CapybaraBotProps) {
  const px = sizes[size]

  const glowColor = mood === 'thinking'
    ? 'rgba(59, 130, 246, 0.5)' // Tech blue
    : mood === 'happy'
    ? 'rgba(34, 197, 94, 0.6)'  // Emerald green
    : mood === 'scanning'
    ? 'rgba(16, 185, 129, 0.5)' // Green-teal
    : 'rgba(217, 119, 6, 0.4)'  // Warm amber/caramel

  return (
    <motion.div
      className={`relative flex items-center justify-center ${className}`}
      style={{ width: px, height: px }}
      animate={
        mood === 'scanning'
          ? { scale: [1, 1.03, 1], rotate: [0, 1, -1, 0] }
          : { y: [0, -6, 0] }
      }
      transition={
        mood === 'scanning'
          ? { duration: 0.5, repeat: Infinity }
          : { duration: 4, repeat: Infinity, ease: 'easeInOut' }
      }
    >
      {/* Outer glow ring */}
      {showGlow && (
        <motion.div
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(circle, ${glowColor} 0%, transparent 70%)`,
            filter: 'blur(8px)',
          }}
          animate={{ opacity: [0.5, 1, 0.5], scale: [0.9, 1.1, 0.9] }}
          transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* SVG Capybara */}
      <svg
        width={px}
        height={px}
        viewBox="0 0 200 200"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Body glow bg */}
        <ellipse cx="100" cy="125" rx="70" ry="50" fill="url(#bodyGlow)" opacity="0.35" />

        {/* Body */}
        <ellipse cx="100" cy="128" rx="64" ry="46" fill="url(#bodyGrad)" stroke="#4A2508" strokeWidth="3.2" />

        {/* Circuit lines on body */}
        <path d="M60 120 L75 120 L80 110 L90 110" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M140 120 L125 120 L120 110 L110 110" stroke="rgba(16, 185, 129, 0.6)" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M85 140 L100 140 L115 140" stroke="rgba(16, 185, 129, 0.5)" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="80" cy="120" r="2.5" fill="#10B981" />
        <circle cx="120" cy="120" r="2.5" fill="#10B981" />
        <circle cx="100" cy="140" r="2.5" fill="#10B981" />

        {/* Head */}
        <ellipse cx="100" cy="90" rx="46" ry="42" fill="url(#headGrad)" stroke="#4A2508" strokeWidth="3.2" />

        {/* Snout / nose area */}
        <ellipse cx="100" cy="106" rx="22" ry="14" fill="url(#snoutGrad)" stroke="#4A2508" strokeWidth="1.8" />

        {/* Nostrils */}
        <ellipse cx="94" cy="106" rx="3.5" ry="2.5" fill="#4A2508" />
        <ellipse cx="106" cy="106" rx="3.5" ry="2.5" fill="#4A2508" />

        {/* Eyes - Left */}
        <motion.g
          animate={
            mood === 'thinking'
              ? { scaleY: [1, 0.5, 1] }
              : { scaleY: [1, 1, 0.05, 1, 1] }
          }
          transition={
            mood === 'thinking'
              ? { duration: 1, repeat: Infinity }
              : { duration: 5, repeat: Infinity, times: [0, 0.4, 0.42, 0.44, 1] }
          }
          style={{ transformOrigin: '78px 84px' }}
        >
          <ellipse cx="78" cy="84" rx="11" ry="13" fill="#FFFFFF" stroke="#4A2508" strokeWidth="1.5" />
          <ellipse cx="78" cy="84" rx="7.5" ry="9.5" fill="#3D7FB0" />
          <ellipse cx="78" cy="84" rx="4.5" ry="5.5" fill="#0F2C40" />
          <ellipse cx="75" cy="81" rx="2.5" ry="2.5" fill="#FFFFFF" />
          {/* Eye glow ring */}
          <ellipse cx="78" cy="84" rx="12" ry="14" fill="none" stroke={mood === 'thinking' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(16, 185, 129, 0.4)'} strokeWidth="1" />
        </motion.g>

        {/* Eyes - Right */}
        <motion.g
          animate={
            mood === 'thinking'
              ? { scaleY: [1, 0.5, 1] }
              : { scaleY: [1, 1, 0.05, 1, 1] }
          }
          transition={
            mood === 'thinking'
              ? { duration: 1, repeat: Infinity, delay: 0.1 }
              : { duration: 5, repeat: Infinity, times: [0, 0.4, 0.42, 0.44, 1], delay: 0.05 }
          }
          style={{ transformOrigin: '122px 84px' }}
        >
          <ellipse cx="122" cy="84" rx="11" ry="13" fill="#FFFFFF" stroke="#4A2508" strokeWidth="1.5" />
          <ellipse cx="122" cy="84" rx="7.5" ry="9.5" fill="#3D7FB0" />
          <ellipse cx="122" cy="84" rx="4.5" ry="5.5" fill="#0F2C40" />
          <ellipse cx="119" cy="81" rx="2.5" ry="2.5" fill="#FFFFFF" />
          {/* Eye glow ring */}
          <ellipse cx="122" cy="84" rx="12" ry="14" fill="none" stroke={mood === 'thinking' ? 'rgba(59, 130, 246, 0.6)' : 'rgba(16, 185, 129, 0.4)'} strokeWidth="1" />
        </motion.g>

        {/* Ears */}
        <ellipse cx="62" cy="58" rx="12" ry="16" fill="url(#headGrad)" stroke="#4A2508" strokeWidth="2.5" />
        <ellipse cx="62" cy="58" rx="7" ry="10" fill="url(#earInner)" />
        <ellipse cx="138" cy="58" rx="12" ry="16" fill="url(#headGrad)" stroke="#4A2508" strokeWidth="2.5" />
        <ellipse cx="138" cy="58" rx="7" ry="10" fill="url(#earInner)" />

        {/* Tech headset / antenna */}
        <line x1="100" y1="50" x2="100" y2="36" stroke="#4A2508" strokeWidth="2.5" />
        <motion.circle
          cx="100"
          cy="32"
          r="6"
          fill="#FFFFFF"
          stroke="#4A2508"
          strokeWidth="1.8"
          animate={{ opacity: [0.7, 1, 0.7] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        />
        <motion.circle
          cx="100"
          cy="32"
          r="3.5"
          fill={mood === 'scanning' ? '#10B981' : mood === 'thinking' ? '#3B82F6' : '#137C53'}
          animate={{ opacity: [0.8, 1, 0.8], scale: [0.8, 1.1, 0.8] }}
          transition={{ duration: 1, repeat: Infinity }}
        />

        {/* Legs */}
        <ellipse cx="72" cy="165" rx="16" ry="10" fill="url(#headGrad)" stroke="#4A2508" strokeWidth="2.5" />
        <ellipse cx="128" cy="165" rx="16" ry="10" fill="url(#headGrad)" stroke="#4A2508" strokeWidth="2.5" />

        {/* Mouth/Smile */}
        {mood === 'happy' ? (
          <path d="M90 114 Q100 124 110 114" stroke="#4A2508" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        ) : (
          <path d="M93 113 Q100 117 107 113" stroke="#4A2508" strokeWidth="2.0" strokeLinecap="round" fill="none" opacity="0.85" />
        )}

        {/* Thinking dots */}
        {mood === 'thinking' && (
          <motion.g
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <circle cx="86" cy="65" r="3" fill="#3B82F6" opacity="0.9" />
            <circle cx="100" cy="60" r="3" fill="#3B82F6" opacity="0.9" />
            <circle cx="114" cy="65" r="3" fill="#3B82F6" opacity="0.9" />
          </motion.g>
        )}

        {/* Scanning ring */}
        {mood === 'scanning' && (
          <motion.circle
            cx="100"
            cy="100"
            r="90"
            fill="none"
            stroke="rgba(16, 185, 129, 0.5)"
            strokeWidth="2.5"
            strokeDasharray="20 10"
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: 'linear' }}
            style={{ transformOrigin: '100px 100px' }}
          />
        )}

        {/* Gradients */}
        <defs>
          <radialGradient id="bodyGrad" cx="40%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#F5C088" />
            <stop offset="55%" stopColor="#C98443" />
            <stop offset="100%" stopColor="#8A4E1B" />
          </radialGradient>
          <radialGradient id="headGrad" cx="40%" cy="32%" r="70%">
            <stop offset="0%" stopColor="#FAD4B2" />
            <stop offset="55%" stopColor="#D59458" />
            <stop offset="100%" stopColor="#965824" />
          </radialGradient>
          <radialGradient id="snoutGrad" cx="50%" cy="45%" r="55%">
            <stop offset="0%" stopColor="#FFF2E0" />
            <stop offset="100%" stopColor="#DBBA96" />
          </radialGradient>
          <radialGradient id="earInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#EFA48C" />
            <stop offset="100%" stopColor="#B8563A" />
          </radialGradient>
          <radialGradient id="bodyGlow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#8A4E1B" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#8A4E1B" stopOpacity="0" />
          </radialGradient>
        </defs>
      </svg>

      {/* Status indicator */}
      {mood === 'scanning' && (
        <motion.div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider"
          style={{
            background: 'rgba(16, 185, 129, 0.15)',
            border: '1px solid rgba(16, 185, 129, 0.4)',
            color: '#059669',
          }}
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 1, repeat: Infinity }}
        >
          ANALIZANDO
        </motion.div>
      )}
    </motion.div>
  )
}
