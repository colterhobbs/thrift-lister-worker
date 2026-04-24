/**
 * Memphis-style scattered geometric decorators rendered as an SVG overlay.
 * Positioned fixed behind all content, pointer-events: none.
 */
export default function MemphisBackground() {
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <svg
        width="100%"
        height="100%"
        xmlns="http://www.w3.org/2000/svg"
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Mint circles */}
        <circle cx="5%" cy="8%" r="22" fill="none" stroke="#6dd5b0" strokeWidth="3" opacity="0.7" />
        <circle cx="92%" cy="15%" r="14" fill="#6dd5b0" opacity="0.35" />
        <circle cx="78%" cy="88%" r="30" fill="none" stroke="#6dd5b0" strokeWidth="3" opacity="0.5" />
        <circle cx="18%" cy="72%" r="10" fill="#6dd5b0" opacity="0.4" />
        <circle cx="50%" cy="5%" r="8" fill="#6dd5b0" opacity="0.3" />

        {/* Lilac shapes */}
        <rect x="88%" y="40%" width="28" height="28" fill="#c4b5e8" opacity="0.5" rx="4" />
        <rect x="3%" y="50%" width="18" height="18" fill="none" stroke="#c4b5e8" strokeWidth="3" opacity="0.6" rx="3" />
        <rect x="60%" y="92%" width="22" height="22" fill="#c4b5e8" opacity="0.4" rx="3" />
        <rect x="35%" y="78%" width="14" height="14" fill="none" stroke="#c4b5e8" strokeWidth="2.5" opacity="0.5" />

        {/* Yellow triangles */}
        <polygon points="95,30 115,70 75,70" fill="#f5e06e" opacity="0.5" />
        <polygon points="700,120 720,160 680,160" fill="none" stroke="#f5e06e" strokeWidth="3" opacity="0.6" />
        <polygon points="200,650 220,690 180,690" fill="#f5e06e" opacity="0.4" />
        <polygon points="1100,500 1120,540 1080,540" fill="none" stroke="#f5e06e" strokeWidth="2.5" opacity="0.5" />

        {/* Black dots */}
        <circle cx="25%" cy="20%" r="4" fill="#1a1a1a" opacity="0.5" />
        <circle cx="70%" cy="35%" r="3" fill="#1a1a1a" opacity="0.4" />
        <circle cx="45%" cy="65%" r="4" fill="#1a1a1a" opacity="0.35" />
        <circle cx="85%" cy="70%" r="3" fill="#1a1a1a" opacity="0.4" />
        <circle cx="12%" cy="90%" r="4" fill="#1a1a1a" opacity="0.3" />
        <circle cx="55%" cy="45%" r="3" fill="#1a1a1a" opacity="0.25" />

        {/* Black diamonds */}
        <rect x="38%" y="12%" width="12" height="12" fill="#1a1a1a" opacity="0.3" transform="rotate(45, 38%, 12%)" />
        <rect x="65%" y="55%" width="10" height="10" fill="#1a1a1a" opacity="0.25" transform="rotate(45, 65%, 55%)" />
        <rect x="8%" y="35%" width="10" height="10" fill="none" stroke="#1a1a1a" strokeWidth="2" opacity="0.3" transform="rotate(45, 8%, 35%)" />

        {/* Coral accents */}
        <circle cx="30%" cy="95%" r="18" fill="none" stroke="#e8825a" strokeWidth="3" opacity="0.4" />
        <rect x="72%" y="8%" width="20" height="20" fill="#e8825a" opacity="0.3" rx="2" />

        {/* Lines */}
        <line x1="0" y1="30%" x2="8%" y2="30%" stroke="#1a1a1a" strokeWidth="2.5" opacity="0.2" />
        <line x1="92%" y1="60%" x2="100%" y2="60%" stroke="#1a1a1a" strokeWidth="2.5" opacity="0.2" />
        <line x1="48%" y1="0" x2="48%" y2="6%" stroke="#1a1a1a" strokeWidth="2.5" opacity="0.2" />
        <line x1="20%" y1="100%" x2="20%" y2="94%" stroke="#1a1a1a" strokeWidth="2.5" opacity="0.2" />
      </svg>
    </div>
  );
}
