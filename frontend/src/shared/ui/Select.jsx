import { ChevronDown } from 'lucide-react'
import clsx from 'clsx'

export default function Select({
  options,
  className,
  containerClassName,
  ...props
}) {
  return (
    <div className={clsx('relative', containerClassName)}>
      <select className={clsx('sc-select pr-9', className)} {...props}>
        {(options || []).map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
    </div>
  )
}
