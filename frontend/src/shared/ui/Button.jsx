import clsx from 'clsx'

export default function Button({
  children,
  className,
  variant = 'primary',
  as = 'button',
  ...props
}) {
  const Comp = as
  const baseClass =
    variant === 'secondary' ? 'sc-btn-secondary' : variant === 'ghost' ? 'sc-btn' : 'sc-btn-primary'

  return (
    <Comp className={clsx(baseClass, className)} {...props}>
      {children}
    </Comp>
  )
}
