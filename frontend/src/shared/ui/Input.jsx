import clsx from 'clsx'

export default function Input({ className, ...props }) {
  return <input className={clsx('sc-input', className)} {...props} />
}
