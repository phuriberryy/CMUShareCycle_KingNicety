/**
 * Unified tab bar — underline indicator style.
 * All tabs are always fully visible — no horizontal scroll.
 * tabs: Array<{ id, label, icon?, badge? }>
 * activeTab: string
 * onTabChange: (id) => void
 */
export default function TabBar({ tabs, activeTab, onTabChange, className = '' }) {
  return (
    <div
      role="tablist"
      className={`flex w-full border-b border-gray-200 ${className}`}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon
        const isActive = activeTab === tab.id
        const badge = tab.badge

        return (
          <button
            key={tab.id}
            role="tab"
            aria-selected={isActive}
            onClick={() => onTabChange(tab.id)}
            className={[
              'group relative flex flex-1 min-h-[44px] cursor-pointer',
              'flex-col items-center justify-center gap-0.5',
              'sm:flex-row sm:gap-1.5',
              'px-1 py-2 sm:px-3 sm:py-2.5',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/40',
              isActive ? 'text-primary' : 'text-gray-500 hover:text-gray-700',
            ].join(' ')}
          >
            {/* Active underline indicator */}
            <span
              aria-hidden="true"
              className={[
                'absolute inset-x-0 bottom-0 h-0.5 rounded-t-full transition-opacity duration-200',
                isActive ? 'bg-primary opacity-100' : 'opacity-0',
              ].join(' ')}
            />

            {Icon && (
              <Icon size={15} strokeWidth={2} aria-hidden="true" className="shrink-0" />
            )}

            <span className="text-center text-[10px] font-semibold leading-tight sm:text-sm sm:font-medium">
              {tab.label}
            </span>

            {badge != null && badge > 0 && (
              <span
                className={[
                  'inline-flex min-w-[15px] items-center justify-center rounded-full',
                  'px-1 py-px text-[9px] font-bold tabular-nums leading-none sm:text-[10px]',
                  isActive
                    ? 'bg-primary/15 text-primary'
                    : 'bg-gray-100 text-gray-500',
                ].join(' ')}
              >
                {badge}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
