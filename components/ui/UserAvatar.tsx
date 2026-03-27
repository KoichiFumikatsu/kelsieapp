interface UserAvatarProps {
  name: string
  colorHex?: string
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES = {
  sm: 'h-6 w-6 text-[10px]',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export function UserAvatar({ name, colorHex = '#141413', size = 'md', className = '' }: UserAvatarProps) {
  const initial = name.charAt(0).toUpperCase()
  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center rounded font-bold ${SIZES[size]} ${className}`}
      style={{
        backgroundColor: colorHex + '18',
        color: colorHex,
        border: `1px solid ${colorHex}30`,
      }}
    >
      {initial}
    </div>
  )
}
