/**
 * Clinic Logo & Monogram Emblem
 * Dr. Mohamed Sabra Elnaggar Dental Clinic
 */
import React from 'react';

interface ClinicLogoProps {
  variant?: 'full' | 'icon' | 'badge' | 'photo';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  inverted?: boolean;
  className?: string;
}

export const ClinicLogo: React.FC<ClinicLogoProps> = ({
  variant = 'full',
  size = 'md',
  inverted = true,
  className = '',
}) => {
  // Size classes
  const iconSize = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
    xl: 'w-20 h-20',
  }[size];

  // Vector Monogram: Tooth outline with orthodontic bracket & wire + M/S curves
  const MonogramSvg = (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${iconSize} shrink-0`}
    >
      {/* Dynamic S-curve swoosh above */}
      <path
        d="M 32 34 C 44 24, 76 25, 78 36 C 80 47, 56 46, 38 52 C 28 55, 30 68, 42 70"
        stroke={inverted ? '#FFFFFF' : '#4E2E63'}
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      {/* Central Twin Teeth / Inverted M arches */}
      <path
        d="M 36 68 C 36 46, 48 46, 50 56 C 52 46, 64 46, 64 68 Z"
        stroke={inverted ? '#FFFFFF' : '#4E2E63'}
        strokeWidth="3.2"
        fill="none"
        strokeLinejoin="round"
      />
      {/* Orthodontic Archwire */}
      <line
        x1="28"
        y1="58"
        x2="72"
        y2="58"
        stroke={inverted ? '#E8D7A1' : '#6F4785'}
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      {/* Left Bracket */}
      <rect
        x="40"
        y="54"
        width="6"
        height="8"
        rx="1"
        stroke={inverted ? '#FFFFFF' : '#4E2E63'}
        strokeWidth="1.8"
        fill={inverted ? '#2E1B3A' : '#FAF7F2'}
      />
      {/* Right Bracket */}
      <rect
        x="54"
        y="54"
        width="6"
        height="8"
        rx="1"
        stroke={inverted ? '#FFFFFF' : '#4E2E63'}
        strokeWidth="1.8"
        fill={inverted ? '#2E1B3A' : '#FAF7F2'}
      />
    </svg>
  );

  if (variant === 'photo') {
    return (
      <div className={`flex items-center gap-3 ${className}`}>
        <div className="relative rounded-xl overflow-hidden border border-[#A985BA]/30 shadow-md">
          <img
            src="/assets/aistudio/374917296_976419427053706_5286893722185683800_n_e903d224.jpg"
            alt="Dr. Mohamed Sabra Elnaggar"
            className={`${iconSize} object-cover`}
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  }

  if (variant === 'icon') {
    return <div className={`inline-flex items-center justify-center ${className}`}>{MonogramSvg}</div>;
  }

  return (
    <div className={`flex items-center gap-2 sm:gap-3 min-w-0 ${className}`}>
      {/* Brand Image Box */}
      <div className="relative rounded-xl overflow-hidden border border-[#E8D7A1]/40 shadow-sm shrink-0 bg-[#2E1B3A] ring-1 ring-white/10">
        <img
          src="/assets/aistudio/374917296_976419427053706_5286893722185683800_n_e903d224.jpg"
          alt="د. محمد صبرة النجار"
          className={`${iconSize} object-cover`}
          referrerPolicy="no-referrer"
        />
      </div>

      {/* Brand Typography */}
      <div className="flex flex-col text-right leading-tight min-w-0">
        <span className={`text-xs sm:text-base font-bold tracking-tight truncate ${inverted ? 'text-white' : 'text-[#2E1B3A]'}`}>
          د. محمد صبرة النجار
        </span>
        <span className={`text-[10px] sm:text-xs ${inverted ? 'text-[#E8D7A1]' : 'text-[#6F4785]'} font-medium truncate`}>
          أخصائي طب وجراحة وتقويم الأسنان
        </span>
      </div>
    </div>
  );
};
