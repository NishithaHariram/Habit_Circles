interface AvatarProps {
  shirt?: string;
  pants?: string;
  accessories?: string[];
  size?: 'small' | 'medium' | 'large';
  className?: string;
}

export function Avatar({
  shirt = 'default',
  pants = 'blue',
  accessories = [],
  size = 'medium',
  className = ''
}: AvatarProps) {
  const sizeClasses = {
    small: 'w-24 h-32',
    medium: 'w-48 h-64',
    large: 'w-64 h-80'
  };

  const getShirtColor = (shirtType: string) => {
    const colors: { [key: string]: string } = {
      default: '#6B7280',
      red: '#EF4444',
      blue: '#3B82F6',
      green: '#10B981',
      yellow: '#F59E0B',
      purple: '#A855F7',
      black: '#1F2937'
    };
    return colors[shirtType] || colors.default;
  };

  const getPantsColor = (pantsType: string) => {
    const colors: { [key: string]: string } = {
      blue: '#2563EB',
      black: '#1F2937',
      brown: '#92400E',
      gray: '#4B5563',
      green: '#065F46'
    };
    return colors[pantsType] || colors.blue;
  };

  return (
    <div className={`relative ${sizeClasses[size]} ${className}`}>
      <svg
        viewBox="0 0 200 300"
        className="w-full h-full"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="100" cy="60" r="35" fill="#F5C99C" />

        <ellipse cx="88" cy="55" rx="4" ry="6" fill="#2C1810" />
        <ellipse cx="112" cy="55" rx="4" ry="6" fill="#2C1810" />

        <path d="M 85 70 Q 100 75 115 70" stroke="#D97757" strokeWidth="2" fill="none" strokeLinecap="round" />

        <path
          d="M 70 90 L 70 100 L 65 180 L 80 180 L 80 100 L 100 100 L 120 100 L 120 180 L 135 180 L 130 100 L 130 90 Z"
          fill={getShirtColor(shirt)}
          stroke="#000"
          strokeWidth="1"
          opacity="0.9"
        />

        <rect x="70" y="95" width="25" height="8" fill={getShirtColor(shirt)} opacity="0.7" />
        <rect x="105" y="95" width="25" height="8" fill={getShirtColor(shirt)} opacity="0.7" />

        <path
          d="M 75 180 L 75 270 L 95 270 L 95 180 Z"
          fill={getPantsColor(pants)}
          stroke="#000"
          strokeWidth="1"
          opacity="0.9"
        />
        <path
          d="M 105 180 L 105 270 L 125 270 L 125 180 Z"
          fill={getPantsColor(pants)}
          stroke="#000"
          strokeWidth="1"
          opacity="0.9"
        />

        <rect x="88" y="270" width="14" height="8" rx="2" fill="#3F3F3F" />
        <rect x="108" y="270" width="14" height="8" rx="2" fill="#3F3F3F" />

        {accessories.includes('hat') && (
          <ellipse cx="100" cy="25" rx="40" ry="8" fill="#DC2626" />
        )}
        {accessories.includes('glasses') && (
          <g>
            <circle cx="88" cy="55" r="8" fill="none" stroke="#000" strokeWidth="2" />
            <circle cx="112" cy="55" r="8" fill="none" stroke="#000" strokeWidth="2" />
            <line x1="96" y1="55" x2="104" y2="55" stroke="#000" strokeWidth="2" />
          </g>
        )}
        {accessories.includes('necklace') && (
          <circle cx="100" cy="85" r="6" fill="#FFD700" stroke="#DAA520" strokeWidth="2" />
        )}
      </svg>

      <div className="absolute inset-0 hover:scale-105 transition-transform duration-300" />
    </div>
  );
}
