type LogoMarkProps = {
  className?: string;
  withGlow?: boolean;
};

export function LogoMark({ className, withGlow = true }: LogoMarkProps) {
  return (
    <svg
      viewBox="0 0 96 96"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <defs>
        <linearGradient id="lumina-core" x1="18" y1="18" x2="74" y2="78" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FFE9FB" />
          <stop offset="0.42" stopColor="#FF76D8" />
          <stop offset="1" stopColor="#6DEBFF" />
        </linearGradient>
        <linearGradient id="lumina-ring" x1="13" y1="12" x2="83" y2="84" gradientUnits="userSpaceOnUse">
          <stop stopColor="#FF8FE3" />
          <stop offset="0.55" stopColor="#B455FF" />
          <stop offset="1" stopColor="#6DDFFF" />
        </linearGradient>
        {withGlow ? (
          <filter id="lumina-glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="blur" />
            <feColorMatrix
              in="blur"
              type="matrix"
              values="1 0 0 0 0.8 0 1 0 0 0.2 0 0 1 0 0.82 0 0 0 0.95 0"
            />
          </filter>
        ) : null}
      </defs>

      {withGlow ? <circle cx="48" cy="48" r="26" fill="url(#lumina-core)" opacity="0.18" filter="url(#lumina-glow)" /> : null}
      <circle cx="48" cy="48" r="31" stroke="url(#lumina-ring)" strokeWidth="2.4" opacity="0.95" />
      <path
        d="M60.5 21.5c-13.5 1.5-24 13.2-24 27.1 0 13.8 10.2 25.4 23.5 27-4.8 2.1-10.1 3.1-15.8 2.5-14.7-1.6-26.2-13.9-26.2-28.9 0-16.1 13-29.1 29.1-29.1 5 0 9.8 1.3 13.4 3.6Z"
        fill="url(#lumina-core)"
      />
      <path
        d="M46.5 27.5v33.8h19.9"
        stroke="#FFF7FD"
        strokeWidth="4.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="m66.2 18.4 2.1 5.3 5.3 2.1-5.3 2.1-2.1 5.3-2.1-5.3-5.3-2.1 5.3-2.1 2.1-5.3Z"
        fill="#FFF8FE"
      />
      <circle cx="25.5" cy="66.5" r="2.5" fill="#6DEBFF" opacity="0.9" />
      <circle cx="69.5" cy="63.5" r="3" fill="#FF90E8" opacity="0.92" />
    </svg>
  );
}
