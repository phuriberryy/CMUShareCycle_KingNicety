/**
 * โลโก้ CMU ShareCycle — two bubbles, one leaf
 * คู่กับ public/logo.svg
 */
export default function ShareCycleLogo({ className = 'h-10 w-10', title = 'CMU ShareCycle' }) {
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
      <circle cx="24" cy="24" r="23" fill="#EEF7F2" />
      <circle cx="24" cy="24" r="22.5" stroke="#C8DDD2" />

      {/* Bubble A: foreground chat */}
      <rect x="8.5" y="10.5" width="20" height="16" rx="6.2" fill="#19B85B" />
      <path d="M19.5 26.2L16.6 31.2L22.7 27.8L19.5 26.2Z" fill="#19B85B" />

      {/* Bubble B: background chat */}
      <rect x="18.8" y="18" width="20" height="16" rx="6.2" fill="#8EEFB2" />
      <path d="M30.8 34L28.2 38.3L33.8 35.4L30.8 34Z" fill="#8EEFB2" />

      {/* Leaf connector */}
      <path
        d="M31.2 31.2C34.7 31.2 37.6 34.1 37.6 37.6C34.1 37.6 31.2 34.7 31.2 31.2Z"
        fill="#5EDC8D"
      />

      {/* Dots */}
      <circle cx="14.4" cy="18.7" r="1.2" fill="#0E513A" />
      <circle cx="18.5" cy="18.7" r="1.2" fill="#0E513A" />
      <circle cx="22.6" cy="18.7" r="1.2" fill="#0E513A" />
      <circle cx="24.8" cy="26.2" r="1.2" fill="#0E513A" />
      <circle cx="28.9" cy="26.2" r="1.2" fill="#0E513A" />
      <circle cx="33" cy="26.2" r="1.2" fill="#0E513A" />
    </svg>
  )
}
