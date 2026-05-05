import clsx from 'clsx'

export default function FormField({
  label,
  required = false,
  hint,
  className,
  children,
}) {
  return (
    <div className={clsx(className)}>
      {label ? (
        <label className="mb-2 block text-sm font-bold text-gray-900 sm:text-sm">
          {label} {required ? <span className="text-red-500">*</span> : null}
        </label>
      ) : null}
      {children}
      {hint ? <p className="mt-1 text-[11px] text-gray-500 sm:text-xs">{hint}</p> : null}
    </div>
  )
}
