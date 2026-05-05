import ShareCycleLogo from '../brand/ShareCycleLogo'

function Footer() {
  return (
    <footer className="mt-auto mt-12 w-full min-w-0 border-t border-gray-200 bg-white/85 backdrop-blur-sm">
      <div className="mx-auto w-full min-w-0 max-w-5xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8 lg:py-10">
        {/* CMU ShareCycle Info */}
        <div className="mx-auto max-w-md text-center">
          <div className="mb-4 flex items-center justify-center gap-3">
            <ShareCycleLogo className="h-12 w-12" />
            <div>
              <p className="text-lg text-primary-dark">
                <span className="font-bold">CMU</span>
                <span className="font-semibold"> ShareCycle</span>
              </p>
              <p className="text-xs font-medium tracking-wide text-primary/70">
                Green Campus Initiative
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-gray-600">
            แบ่งปันมากขึ้น ทิ้งน้อยลง — ร่วมสร้างชุมชนมหาวิทยาลัยที่ยั่งยืนไปด้วยกัน
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
