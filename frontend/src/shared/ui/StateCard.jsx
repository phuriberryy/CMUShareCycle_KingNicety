import clsx from 'clsx'

export default function StateCard({ title, description, action, align = 'center' }) {
  return (
    <div
      className={clsx('sc-card sc-card-pad', {
        'text-center': align === 'center',
        'text-left': align === 'left',
      })}
    >
      <p className="text-base font-medium text-gray-700">{title}</p>
      {description ? <p className="mt-1 text-sm text-gray-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  )
}
