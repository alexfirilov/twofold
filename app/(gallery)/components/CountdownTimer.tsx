"use client"

import { useState, useEffect } from 'react'
import { Clock } from 'lucide-react'

interface CountdownTimerProps {
  unlockDate: Date
  className?: string
}

export default function CountdownTimer({ unlockDate, className = "" }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number
    hours: number
    minutes: number
    seconds: number
  } | null>(null)

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = unlockDate.getTime() - new Date().getTime()
      
      if (difference > 0) {
        return {
          days: Math.floor(difference / (1000 * 60 * 60 * 24)),
          hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
          minutes: Math.floor((difference / 1000 / 60) % 60),
          seconds: Math.floor((difference / 1000) % 60)
        }
      }
      
      return null
    }

    setTimeLeft(calculateTimeLeft())

    const timer = setInterval(() => {
      const newTimeLeft = calculateTimeLeft()
      setTimeLeft(newTimeLeft)
      
      // Refresh the page when countdown reaches zero
      if (!newTimeLeft) {
        window.location.reload()
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [unlockDate])

  if (!timeLeft) {
    return null
  }

  const formatTimeUnit = (value: number, unit: string) => {
    if (value === 0) return null
    return `${value}${unit}`
  }

  const timeString = [
    formatTimeUnit(timeLeft.days, 'd'),
    formatTimeUnit(timeLeft.hours, 'h'),
    formatTimeUnit(timeLeft.minutes, 'm'),
    formatTimeUnit(timeLeft.seconds, 's')
  ].filter(Boolean).slice(0, 2).join(' ') // Show only the two most significant units

  return (
    <div className={`flex items-center gap-1 text-xs ${className}`}>
      <Clock className="h-3 w-3" />
      <span>Unlocks in {timeString}</span>
    </div>
  )
}