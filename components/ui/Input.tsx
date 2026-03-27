import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react'

/* ── Input ── */
interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className = '', id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] outline-none transition-colors placeholder:text-[var(--text-3)] focus:border-[var(--text-1)] ${error ? 'border-[var(--expense)]' : ''} ${className}`}
          {...props}
        />
        {error && <p className="text-xs text-[var(--expense)]">{error}</p>}
      </div>
    )
  },
)
Input.displayName = 'Input'

/* ── Select ── */
interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, className = '', id, ...props }, ref) => {
    const selectId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          className={`w-full appearance-none rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] outline-none transition-colors focus:border-[var(--text-1)] ${className}`}
          {...props}
        >
          {options.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>
    )
  },
)
Select.displayName = 'Select'

/* ── DatePicker (native) ── */
interface DatePickerProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
}

export const DatePicker = forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, className = '', id, ...props }, ref) => {
    const pickerId = id ?? label?.toLowerCase().replace(/\s/g, '-')
    return (
      <div className="space-y-1">
        {label && (
          <label htmlFor={pickerId} className="block text-xs font-semibold uppercase tracking-widest text-[var(--text-2)]">
            {label}
          </label>
        )}
        <input
          ref={ref}
          id={pickerId}
          type="date"
          className={`w-full rounded border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-1)] outline-none transition-colors focus:border-[var(--text-1)] ${className}`}
          {...props}
        />
      </div>
    )
  },
)
DatePicker.displayName = 'DatePicker'
