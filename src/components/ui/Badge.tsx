import React from 'react'

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info'
  size?: 'sm' | 'md' | 'lg'
  dot?: boolean
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', size = 'md', dot = false, className = '', children, ...props }, ref) => {
    const variants = {
      default: 'bg-neutral-100 text-neutral-700 border border-neutral-200',
      primary: 'bg-primary-100 text-primary-700 border border-primary-200',
      success: 'bg-green-100 text-green-700 border border-green-200',
      warning: 'bg-amber-100 text-amber-700 border border-amber-200',
      danger: 'bg-red-100 text-red-700 border border-red-200',
      info: 'bg-blue-100 text-blue-700 border border-blue-200'
    }
    
    const sizes = {
      sm: 'px-2 py-0.5 text-xs',
      md: 'px-2.5 py-1 text-sm',
      lg: 'px-3 py-1 text-base'
    }

    return (
      <span
        ref={ref}
        className={`
          inline-flex items-center gap-1.5 font-medium rounded-full border
          ${variants[variant]} ${sizes[size]} ${className}
        `}
        {...props}
      >
        {dot && <span className={`w-1.5 h-1.5 rounded-full ${variants[variant].replace('bg-', 'bg-').replace('text-', 'bg-')} flex-shrink-0`} />}
        {children}
      </span>
    )
  }
)

Badge.displayName = 'Badge'

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string
  alt?: string
  name?: string
  size?: 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy'
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ src, alt, name, size = 'md', status, className = '', ...props }, ref) => {
    const sizes = {
      sm: 'w-8 h-8 text-xs',
      md: 'w-10 h-10 text-sm',
      lg: 'w-12 h-12 text-base',
      xl: 'w-16 h-16 text-lg'
    }
    
    const statusSizes = {
      sm: 'w-2 h-2',
      md: 'w-2.5 h-2.5',
      lg: 'w-3 h-3',
      xl: 'w-4 h-4'
    }

    const getInitials = (name: string) => {
      return name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    }

    const bgColors = [
      'bg-primary-100 text-primary-700',
      'bg-green-100 text-green-700',
      'bg-amber-100 text-amber-700',
      'bg-purple-100 text-purple-700',
      'bg-pink-100 text-pink-700',
      'bg-blue-100 text-blue-700'
    ]
    
    const colorIndex = name ? name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % bgColors.length : 0

    return (
      <div ref={ref} className={`relative inline-flex ${className}`} {...props}>
        <div
          className={`
            ${sizes[size]} rounded-2xl flex items-center justify-center font-medium overflow-hidden
            ${src ? '' : bgColors[colorIndex]}
          `}
        >
          {src ? (
            <img src={src} alt={alt || name || 'Avatar'} className="w-full h-full object-cover" />
          ) : (
            name ? getInitials(name) : '?'
          )}
        </div>
        {status && (
          <span
            className={`
              absolute bottom-0 right-0 rounded-full border-2 border-white
              ${statusSizes[size]}
              ${status === 'online' ? 'bg-green-500' : status === 'busy' ? 'bg-amber-500' : 'bg-neutral-400'}
            `}
            aria-label={status}
          />
        )}
      </div>
    )
  }
)

Avatar.displayName = 'Avatar'

interface DividerProps extends React.HTMLAttributes<HTMLHRElement> {
  label?: string
  orientation?: 'horizontal' | 'vertical'
}

export const Divider = React.forwardRef<HTMLHRElement, DividerProps>(
  ({ label, orientation = 'horizontal', className = '', ...props }, ref) => {
    if (orientation === 'vertical') {
      return (
        <hr
          ref={ref}
          className={`h-full w-px bg-neutral-200 ${className}`}
          role="separator"
          aria-orientation="vertical"
          {...props}
        />
      )
    }

    return (
      <div className={`flex items-center ${className}`} role="separator" aria-orientation="horizontal">
        <hr className="flex-1 border-0 border-t border-neutral-200" {...props} />
        {label && (
          <span className="px-4 text-sm text-neutral-500">{label}</span>
        )}
        <hr className="flex-1 border-0 border-t border-neutral-200" />
      </div>
    )
  }
)

Divider.displayName = 'Divider'