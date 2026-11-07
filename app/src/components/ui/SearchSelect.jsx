import { useEffect, useMemo, useRef, useState } from 'react'
import { Search } from 'lucide-react'

export default function SearchSelect({ value, onChange, options, placeholder = 'Select an option', className = '' }) {
  const containerRef = useRef(null)
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')

  const selectedOption = options.find((option) => option.value === value) || null

  const filteredOptions = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return options
    return options.filter(({ label, value: optionValue }) => `${label} ${optionValue}`.toLowerCase().includes(term))
  }, [options, query])

  useEffect(() => {
    function handlePointerDown(event) {
      if (!containerRef.current || containerRef.current.contains(event.target)) return
      setIsOpen(false)
      setQuery('')
    }

    window.addEventListener('mousedown', handlePointerDown)
    return () => window.removeEventListener('mousedown', handlePointerDown)
  }, [])

  return (
    <div className={`custom-select ${className} ${isOpen ? 'is-open' : ''}`} ref={containerRef}>
      <button type="button" className="custom-select-trigger" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-haspopup="listbox">
        <span>{selectedOption ? selectedOption.label : placeholder}</span>
      </button>

      {isOpen && (
        <div className="custom-select-panel" role="listbox">
          <div className="custom-select-search">
            <Search size={14} />
            <input
              type="text"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search…"
              aria-label="Search options"
            />
          </div>

          <div className="custom-select-list">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={option.value === value ? 'custom-select-item is-selected' : 'custom-select-item'}
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                    setQuery('')
                  }}
                >
                  {option.label}
                </button>
              ))
            ) : (
              <div className="custom-select-empty">No items match your search.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
