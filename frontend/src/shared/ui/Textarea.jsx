import clsx from 'clsx'

export default function Textarea({ className, ...props }) {
  return (
    <textarea
      className={clsx(
        'w-full rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary focus:ring-offset-0 sm:py-3 sm:text-base',
        className
      )}
      {...props}
    />
  )
}
