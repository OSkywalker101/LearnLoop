import React from 'react'

interface ProgressProps {
  value: number
  max?: number
  size?: 'sm' | 'md' | 'lg'
  showLabel?: boolean
  label?: string
  variant?: 'default' | 'success' | 'warning' | 'info'
  className?: string
}

export const Progress: React.FC<ProgressProps> = ({
  value,
  max = 100,
  size = 'md',
  showLabel = false,
  label,
  variant = 'default',
  className = ''
}) => {
  const percentage = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  
  const variants = {
    default: 'bg-primary-600',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    info: 'bg-blue-500'
  }
  
  const sizes = {
    sm: 'h-1.5',
    md: 'h-2.5',
    lg: 'h-4'
  }

  return (
    <div className={`${className} w-full`}>
      {(showLabel || label) && (
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium text-neutral-700">{label || `${percentage}%`}</span>
          {showLabel && <span className="text-neutral-500">{percentage}%</span>}
        </div>
      )}
      <div className={`w-full bg-neutral-200 rounded-full overflow-hidden ${sizes[size]}`}>
        <div
          className={`${variants[variant]} h-full rounded-full transition-all duration-500 ease-out`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || 'Progress'}
        />
      </div>
    </div>
  )
}

interface CircularProgressProps {
  value: number
  max?: number
  size?: number
  strokeWidth?: number
  showValue?: boolean
  variant?: 'default' | 'success' | 'warning'
  className?: string
}

export const CircularProgress: React.FC<CircularProgressProps> = ({
  value,
  max = 100,
  size = 64,
  strokeWidth = 6,
  showValue = true,
  variant = 'default',
  className = ''
}) => {
  const percentage = Math.max(0, Math.min(100, Math.round((value / max) * 100)))
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const offset = circumference - (percentage / 100) * circumference
  
  const variants = {
    default: 'text-primary-600',
    success: 'text-green-500',
    warning: 'text-amber-500'
  }

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          className="text-neutral-200"
          strokeWidth={strokeWidth}
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
        <circle
          className={`${variants[variant]} transition-all duration-500`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          stroke="currentColor"
          fill="transparent"
          r={radius}
          cx={size / 2}
          cy={size / 2}
        />
      </svg>
      {showValue && (
        <span className="absolute text-center">
          <span className="text-2xl font-bold text-neutral-900">{percentage}%</span>
        </span>
      )}
    </div>
  )
}