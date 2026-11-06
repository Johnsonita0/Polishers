import { useEffect, useRef, useState } from 'react'
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Clock, X } from 'lucide-react'

function dateTimeValue(date) {
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}

function dateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function minimumDateTime() {
  const date = new Date(Date.now() + 5 * 60_000)
  date.setSeconds(0, 0)
  date.setMinutes(Math.ceil(date.getMinutes() / 5) * 5)
  return date
}

function formatSelectedDate(date) {
  return date.toLocaleString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function ScheduleDateTimePicker({ value, onChange, disabled = false }) {
  const pickerRef = useRef(null)
  const selectedDate = value ? new Date(value) : null
  const hasSelection = selectedDate && !Number.isNaN(selectedDate.getTime())
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const date = hasSelection ? selectedDate : new Date()
    return new Date(date.getFullYear(), date.getMonth(), 1)
  })

  useEffect(() => {
    if (hasSelection) setVisibleMonth(new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1))
  }, [value])

  useEffect(() => {
    if (!isOpen) return undefined
    function dismiss(event) {
      if (event.type === 'keydown' && event.key === 'Escape') setIsOpen(false)
      if (event.type === 'pointerdown' && !pickerRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('keydown', dismiss)
    document.addEventListener('pointerdown', dismiss)
    return () => {
      document.removeEventListener('keydown', dismiss)
      document.removeEventListener('pointerdown', dismiss)
    }
  }, [isOpen])

  const monthStart = new Date(visibleMonth.getFullYear(), visibleMonth.getMonth(), 1)
  const firstGridDate = new Date(monthStart)
  firstGridDate.setDate(1 - monthStart.getDay())
  const days = Array.from({ length: 42 }, (_, index) => {
    const date = new Date(firstGridDate)
    date.setDate(firstGridDate.getDate() + index)
    return date
  })
  const minimum = minimumDateTime()
  const currentDay = dateKey(new Date())
  const minimumDay = dateKey(minimum)
  const selectedKey = hasSelection ? dateKey(selectedDate) : ''
  const hour = hasSelection ? selectedDate.getHours() : 9
  const minute = hasSelection ? selectedDate.getMinutes() : 0
  const twelveHour = hour % 12 || 12
  const period = hour >= 12 ? 'PM' : 'AM'

  function chooseDate(date) {
    const nextDate = hasSelection ? new Date(selectedDate) : new Date(date.getFullYear(), date.getMonth(), date.getDate(), 9, 0)
    nextDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate())
    if (nextDate.getTime() < minimum.getTime()) nextDate.setTime(minimum.getTime())
    onChange(dateTimeValue(nextDate))
  }

  function adjustTime(unit, amount) {
    if (!hasSelection) return
    const nextDate = new Date(selectedDate)
    if (unit === 'hour') nextDate.setHours(nextDate.getHours() + amount)
    else nextDate.setMinutes(nextDate.getMinutes() + amount * 5)
    onChange(dateTimeValue(nextDate))
  }

  function setPeriod(nextPeriod) {
    if (!hasSelection || period === nextPeriod) return
    const nextDate = new Date(selectedDate)
    nextDate.setHours(nextDate.getHours() + (nextPeriod === 'PM' ? 12 : -12))
    onChange(dateTimeValue(nextDate))
  }

  function changeMonth(amount) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + amount, 1))
  }

  return (
    <div className="schedule-picker" ref={pickerRef}>
      <button
        className="schedule-picker-trigger"
        type="button"
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        disabled={disabled}
      >
        <CalendarDays size={16} />
        <span>{hasSelection ? formatSelectedDate(selectedDate) : 'Choose date and time'}</span>
        <ChevronDown size={15} />
      </button>
      {isOpen && <div className="schedule-picker-popover" role="dialog" aria-label="Schedule newsletter delivery">
        <div className="schedule-picker-month">
          <button type="button" aria-label="Previous month" onClick={() => changeMonth(-1)}><ChevronLeft size={17} /></button>
          <strong>{visibleMonth.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</strong>
          <button type="button" aria-label="Next month" onClick={() => changeMonth(1)}><ChevronRight size={17} /></button>
          <button className="schedule-picker-close" type="button" aria-label="Close calendar" onClick={() => setIsOpen(false)}><X size={15} /></button>
        </div>
        <div className="schedule-picker-weekdays" aria-hidden="true">
          {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => <span key={day}>{day}</span>)}
        </div>
        <div className="schedule-picker-days">
          {days.map((date) => {
            const key = dateKey(date)
            const isPast = key < minimumDay
            const classes = [
              'schedule-picker-day',
              date.getMonth() !== visibleMonth.getMonth() ? 'is-outside-month' : '',
              key === selectedKey ? 'is-selected' : '',
              key === currentDay ? 'is-today' : '',
            ].filter(Boolean).join(' ')
            return <button
              key={key}
              className={classes}
              type="button"
              aria-label={date.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              aria-pressed={key === selectedKey}
              disabled={isPast || disabled}
              onClick={() => chooseDate(date)}
            >{date.getDate()}</button>
          })}
        </div>
        <div className="schedule-picker-time">
          <div className="schedule-picker-time-title"><Clock size={15} /><span>Delivery time</span></div>
          <div className="schedule-picker-time-controls">
            <div className="schedule-time-stepper">
              <span>Hour</span>
              <button type="button" aria-label="Earlier hour" onClick={() => adjustTime('hour', -1)} disabled={!hasSelection || disabled}><ChevronDown size={15} /></button>
              <output>{String(twelveHour).padStart(2, '0')}</output>
              <button type="button" aria-label="Later hour" onClick={() => adjustTime('hour', 1)} disabled={!hasSelection || disabled}><ChevronUp size={15} /></button>
            </div>
            <span className="schedule-time-separator">:</span>
            <div className="schedule-time-stepper">
              <span>Minute</span>
              <button type="button" aria-label="Earlier minute" onClick={() => adjustTime('minute', -1)} disabled={!hasSelection || disabled}><ChevronDown size={15} /></button>
              <output>{String(minute).padStart(2, '0')}</output>
              <button type="button" aria-label="Later minute" onClick={() => adjustTime('minute', 1)} disabled={!hasSelection || disabled}><ChevronUp size={15} /></button>
            </div>
            <div className="schedule-time-period" role="group" aria-label="AM or PM">
              {['AM', 'PM'].map((option) => <button key={option} type="button" className={period === option ? 'is-active' : ''} aria-pressed={period === option} onClick={() => setPeriod(option)} disabled={!hasSelection || disabled}>{option}</button>)}
            </div>
          </div>
          <small>Times use {Intl.DateTimeFormat().resolvedOptions().timeZone || 'your local time zone'}.</small>
        </div>
      </div>}
    </div>
  )
}