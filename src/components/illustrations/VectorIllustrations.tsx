import React from 'react';

/**
 * High-quality Flat Design & Cartoon Vector Illustrations
 * Crafted with pure SVG geometry, cheerful palettes, and bold outlines.
 */

export const EmptyCartIllustration: React.FC<{ className?: string }> = ({ className = "w-36 h-36" }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    {/* Background soft flat circle */}
    <circle cx="100" cy="100" r="85" fill="#EEF2F6" />
    
    {/* Floor shadow */}
    <ellipse cx="100" cy="165" rx="55" ry="10" fill="#CBD5E1" />

    {/* Shopping Cart Body */}
    <rect x="52" y="70" width="96" height="65" rx="14" fill="#38BDF8" stroke="#0F172A" strokeWidth="4" />
    
    {/* Cart Front Accent */}
    <path d="M54 84H146" stroke="#0F172A" strokeWidth="3" strokeDasharray="6 6" />
    <rect x="66" y="94" width="68" height="28" rx="8" fill="#F0F9FF" />

    {/* Cute Cartoon Eyes on Cart */}
    <circle cx="90" cy="108" r="4.5" fill="#0F172A" />
    <circle cx="110" cy="108" r="4.5" fill="#0F172A" />
    <circle cx="92" cy="106" r="1.5" fill="#FFFFFF" />
    <circle cx="112" cy="106" r="1.5" fill="#FFFFFF" />
    
    {/* Cute Smiling Mouth */}
    <path d="M96 114C98.5 117 101.5 117 104 114" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />
    
    {/* Rosy Cheeks */}
    <circle cx="82" cy="112" r="3" fill="#FDA4AF" />
    <circle cx="118" cy="112" r="3" fill="#FDA4AF" />

    {/* Cart Handle */}
    <path d="M40 52H56L68 110" stroke="#0F172A" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />
    <rect x="34" y="46" width="16" height="10" rx="4" fill="#F43F5E" stroke="#0F172A" strokeWidth="3.5" />

    {/* Cart Wheels */}
    <circle cx="72" cy="150" r="14" fill="#F8FAFC" stroke="#0F172A" strokeWidth="4" />
    <circle cx="72" cy="150" r="5" fill="#0F172A" />
    
    <circle cx="128" cy="150" r="14" fill="#F8FAFC" stroke="#0F172A" strokeWidth="4" />
    <circle cx="128" cy="150" r="5" fill="#0F172A" />

    {/* Playful Floating Vector Stars */}
    <path d="M152 48L155 56L163 59L155 62L152 70L149 62L141 59L149 56L152 48Z" fill="#FBBF24" stroke="#0F172A" strokeWidth="2.5" />
    <circle cx="48" cy="105" r="4" fill="#34D399" stroke="#0F172A" strokeWidth="2" />
    <circle cx="158" cy="120" r="5" fill="#A855F7" stroke="#0F172A" strokeWidth="2" />
  </svg>
);

export const EmptySearchIllustration: React.FC<{ className?: string }> = ({ className = "w-32 h-32" }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="100" cy="100" r="85" fill="#F1F5F9" />
    <ellipse cx="100" cy="162" rx="50" ry="8" fill="#CBD5E1" />

    {/* Magnifying Glass Body */}
    <circle cx="92" cy="88" r="46" fill="#67E8F9" stroke="#0F172A" strokeWidth="4.5" />
    <circle cx="92" cy="88" r="34" fill="#FFFFFF" />

    {/* Cartoon Face inside glass */}
    <circle cx="82" cy="84" r="4" fill="#0F172A" />
    <circle cx="102" cy="84" r="4" fill="#0F172A" />
    <circle cx="84" cy="82" r="1.5" fill="#FFFFFF" />
    <circle cx="104" cy="82" r="1.5" fill="#FFFFFF" />
    <circle cx="75" cy="89" r="3" fill="#FDA4AF" />
    <circle cx="109" cy="89" r="3" fill="#FDA4AF" />
    <path d="M88 94C90.5 97 93.5 97 96 94" stroke="#0F172A" strokeWidth="2.5" strokeLinecap="round" />

    {/* Magnifier Handle */}
    <path d="M125 121L156 152" stroke="#0F172A" strokeWidth="12" strokeLinecap="round" />
    <path d="M125 121L156 152" stroke="#F59E0B" strokeWidth="6" strokeLinecap="round" />

    {/* Question marks */}
    <path d="M138 52C140 45 146 44 148 48C150 52 145 54 144 58M144 64H144.1" stroke="#0F172A" strokeWidth="3.5" strokeLinecap="round" />
  </svg>
);

export const SuccessCelebrationIllustration: React.FC<{ className?: string }> = ({ className = "w-28 h-28" }) => (
  <svg viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg" className={className}>
    <circle cx="100" cy="100" r="85" fill="#ECFDF5" />
    
    {/* Receipt Paper */}
    <path d="M60 40H140V160L130 152L120 160L110 152L100 160L90 152L80 160L70 152L60 160V40Z" fill="#FFFFFF" stroke="#0F172A" strokeWidth="4" />
    
    {/* Checkmark Badge */}
    <circle cx="100" cy="85" r="24" fill="#10B981" stroke="#0F172A" strokeWidth="3.5" />
    <path d="M90 85L97 92L112 76" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" strokeLinejoin="round" />

    {/* Cartoon Smile on Receipt */}
    <circle cx="86" cy="122" r="3.5" fill="#0F172A" />
    <circle cx="114" cy="122" r="3.5" fill="#0F172A" />
    <path d="M96 130C98.5 133 101.5 133 104 130" stroke="#0F172A" strokeWidth="3" strokeLinecap="round" />

    {/* Colorful Confetti */}
    <rect x="36" y="58" width="8" height="8" rx="2" fill="#F43F5E" transform="rotate(25 36 58)" />
    <rect x="156" y="66" width="9" height="9" rx="2" fill="#3B82F6" transform="rotate(-18 156 66)" />
    <circle cx="48" cy="120" r="4" fill="#F59E0B" />
    <circle cx="158" cy="130" r="5" fill="#10B981" />
    <path d="M98 22L101 28L107 30L101 32L98 38L95 32L89 30L95 28L98 22Z" fill="#FBBF24" stroke="#0F172A" strokeWidth="2" />
  </svg>
);
