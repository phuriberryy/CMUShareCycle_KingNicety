import ShareCycleLogo from '../brand/ShareCycleLogo'

function Footer() {
  return (
    <footer className="mt-auto mt-8 w-full min-w-0 border-t border-gray-200 bg-white/85 backdrop-blur-sm dark:bg-[#132019]/95 dark:border-white/[0.07] sm:mt-12">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-5 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* CMU ShareCycle Info */}
        <div className="mx-auto max-w-md text-center">
          <div className="mb-3 flex items-center justify-center gap-2.5 sm:mb-4 sm:gap-3">
            <ShareCycleLogo className="h-9 w-9 sm:h-12 sm:w-12" />
            <div className="text-left sm:text-center">
              <p className="text-sm text-primary-dark sm:text-lg">
                <span className="font-bold">CMU</span>
                <span className="font-semibold"> ShareCycle</span>
              </p>
              <p className="text-[10px] font-medium tracking-wide text-primary/70 sm:text-xs">
                Green Campus Initiative
              </p>
            </div>
          </div>
          <p className="mx-auto mt-2 max-w-[18rem] text-xs leading-relaxed text-gray-600 sm:mt-4 sm:max-w-none sm:text-sm">
            แบ่งปันมากขึ้น ทิ้งน้อยลง — ร่วมสร้างชุมชนมหาวิทยาลัยที่ยั่งยืนไปด้วยกัน
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
