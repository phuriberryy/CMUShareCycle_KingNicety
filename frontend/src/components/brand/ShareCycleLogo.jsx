import { useId } from 'react'

/**
 * โลโก้ CMU ShareCycle — ต้นไม้เรขาคณิตในวงกลม (Green Campus)
 * คู่กับ public/logo.svg
 */
export default function ShareCycleLogo({
  className = 'h-10 w-10',
  title = 'CMU ShareCycle',
}) {
  const uid = useId().replace(/:/g, '')
  const idClip = `sc-tree-clip-${uid}`

  const pale = '#e8f2ec'
  const dark = '#1b4332'
  const mid = '#3d9270'
  const ring = '#c5ddd0'

  return (
    <svg
      className={className}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      <defs>
        <clipPath id={idClip}>
          <circle cx="24" cy="24" r="21.5" />
        </clipPath>
      </defs>
      <circle cx="24" cy="24" r="23" fill={pale} />
      <circle cx="24" cy="24" r="22.5" fill="none" stroke={ring} strokeWidth="1" />
      <g clipPath={`url(#${idClip})`}>
        {/* เส้นประโค้งด้านล่าง — พื้น / วงจร */}
        <path
          d="M 11 24 A 13 13 0 0 1 37 24"
          fill="none"
          stroke={mid}
          strokeWidth="1.65"
          strokeLinecap="round"
          strokeDasharray="3.2 3.8"
          opacity="0.9"
        />
        {/* ใบไม้ซ้าย–ขวา */}
        <circle cx="17.75" cy="19.25" r="6.25" fill={mid} />
        <circle cx="30.25" cy="19.25" r="6.25" fill={mid} />
        {/* ใบบน */}
        <circle cx="24" cy="14.75" r="7" fill={dark} />
        {/* ลำต้น */}
        <rect x="21.85" y="21.25" width="4.3" height="12.5" rx="1.15" fill={dark} />
      </g>
    </svg>
  )
}
