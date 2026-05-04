import { useEffect, useState } from 'react'
import {
  Trophy,
  Medal,
  Leaf,
  Star,
  TrendingUp,
  Users,
  ArrowRightLeft,
  Crown,
  ChevronDown,
  Sparkles,
  Heart,
  Flame,
  CalendarDays,
  Repeat,
} from 'lucide-react'
import { leaderboardApi } from '../lib/api'
import { useAuth } from '../context/AuthContext'

const TABS = [
  { key: 'points', label: 'Points', icon: Star },
  { key: 'co2', label: 'CO₂ Reduced', icon: Leaf },
  { key: 'exchanges', label: 'Exchanges', icon: ArrowRightLeft },
  { key: 'faculty', label: 'Faculty', icon: Users },
]

const PERIODS = [
  { key: 'week', label: 'Week', shortLabel: 'Wk', icon: CalendarDays },
  { key: 'month', label: 'Month', shortLabel: 'Mo', icon: CalendarDays },
  { key: 'all', label: 'All', shortLabel: 'All', icon: Repeat },
]

const REASON_LABELS = {
  exchange_completed: 'แลกเปลี่ยนสำเร็จ',
  donation_completed_donor: 'บริจาค (ผู้ให้)',
  donation_completed_recipient: 'บริจาค (ผู้รับ)',
  post_item: 'โพสต์สินค้า',
}

function getRankStyle(rank) {
  if (rank === 1) return { bg: 'bg-gradient-to-br from-yellow-100 to-amber-50', border: 'border-yellow-300', text: 'text-yellow-700' }
  if (rank === 2) return { bg: 'bg-gradient-to-br from-gray-100 to-slate-50', border: 'border-gray-300', text: 'text-gray-600' }
  if (rank === 3) return { bg: 'bg-gradient-to-br from-orange-50 to-amber-50', border: 'border-orange-300', text: 'text-orange-700' }
  return { bg: 'bg-white', border: 'border-transparent', text: 'text-gray-500' }
}

function getMyRankBadgeStyle(rank) {
  if (rank === 1) return 'from-amber-400 via-yellow-500 to-amber-600 shadow-amber-200/50 ring-2 ring-amber-300/50'
  if (rank === 2) return 'from-slate-300 via-gray-400 to-slate-500 shadow-slate-300/50 ring-2 ring-slate-300/50'
  if (rank === 3) return 'from-amber-600 via-orange-500 to-amber-700 shadow-orange-300/50 ring-2 ring-amber-400/50'
  return 'from-primary to-emerald-600 shadow-primary/30 ring-2 ring-primary/20'
}

function RankBadge({ rank }) {
  if (rank === 1) return <Crown size={22} className="text-yellow-500" />
  if (rank === 2) return <Medal size={22} className="text-gray-400" />
  if (rank === 3) return <Medal size={22} className="text-orange-400" />
  return <span className="text-sm font-bold text-gray-400">#{rank}</span>
}

function formatValue(value, type) {
  if (type === 'co2') return `${parseFloat(value).toFixed(1)} kg`
  if (type === 'points') return `${parseInt(value).toLocaleString()} pts`
  return parseInt(value).toLocaleString()
}

function getInitials(name) {
  if (!name) return '??'
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

export default function LeaderboardPage() {
  const { token, user: authUser } = useAuth()
  const [activeTab, setActiveTab] = useState('points')
  const [period, setPeriod] = useState('all')
  const [leaders, setLeaders] = useState([])
  const [faculties, setFaculties] = useState([])
  const [myRank, setMyRank] = useState(null)
  const [loading, setLoading] = useState(true)

  // Fetch leaderboard data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        if (activeTab === 'faculty') {
          const data = await leaderboardApi.getFacultyLeaderboard('co2')
          setFaculties(data.faculties || [])
        } else {
          const data = await leaderboardApi.getLeaderboard(activeTab, period, 20)
          setLeaders(data.leaders || [])
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err)
        setLeaders([])
        setFaculties([])
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [activeTab, period])

  // Fetch my rank
  useEffect(() => {
    if (!token || activeTab === 'faculty') {
      setMyRank(null)
      return
    }
    leaderboardApi.getMyRank(token, activeTab)
      .then(setMyRank)
      .catch(() => setMyRank(null))
  }, [token, activeTab])

  return (
    <div className="min-h-screen bg-[#FAFBF9]">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8">
      {/* Header */}
      <section className="mb-6 sm:mb-8">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/15 bg-white px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-primary shadow-sm">
          <Trophy size={14} />
          Leaderboard
        </div>
        <h1 className="text-2xl font-bold text-gray-900 sm:text-4xl">Top Contributors</h1>
        <p className="mt-2 text-sm text-gray-600 sm:text-lg">See who's making the biggest impact at CMU</p>
      </section>

      {/* My Rank Card */}
      {myRank && activeTab !== 'faculty' && (
        <section className="mb-6 sm:mb-8">
          <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative h-14 w-14 shrink-0 sm:h-16 sm:w-16">
                  {myRank.avatarUrl ? (
                    <img src={myRank.avatarUrl} alt="" className="h-14 w-14 rounded-2xl object-cover shadow-lg ring-2 ring-white/40 sm:h-16 sm:w-16" />
                  ) : (
                    <div className={`flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br text-xl font-bold text-white shadow-lg ring-2 ring-white/40 sm:h-16 sm:w-16 sm:text-2xl ${getMyRankBadgeStyle(myRank.rank)}`}>{getInitials(authUser?.name)}</div>
                  )}
                  <span className="absolute -bottom-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-white shadow ring-2 ring-white sm:h-7 sm:w-7 sm:text-xs">{myRank.rank}</span>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">อันดับของคุณ</p>
                  <p className="text-lg font-bold text-gray-900 sm:text-xl">{myRank.rank === 1 ? '🏆 ' : myRank.rank <= 3 ? '🏅 ' : ''}อันดับ {myRank.rank}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:gap-3">
                <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm"><p className="text-base font-bold text-primary sm:text-lg">{myRank.totalPoints.toLocaleString()}</p><p className="text-[10px] text-gray-500 sm:text-xs">Points</p></div>
                <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm"><p className="text-base font-bold text-emerald-600 sm:text-lg">{parseFloat(myRank.totalCO2Reduced).toFixed(1)}</p><p className="text-[10px] text-gray-500 sm:text-xs">kg CO₂</p></div>
                <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm"><p className="text-base font-bold text-purple-600 sm:text-lg">{myRank.totalExchanges}</p><p className="text-[10px] text-gray-500 sm:text-xs">Exchanges</p></div>
                <div className="rounded-xl bg-white px-3 py-2 text-center shadow-sm"><p className="text-base font-bold text-red-500 sm:text-lg">{myRank.totalDonations}</p><p className="text-[10px] text-gray-500 sm:text-xs">Donations</p></div>
              </div>
            </div>
            {myRank.recentPoints && myRank.recentPoints.length > 0 && (
              <details className="mt-4 border-t border-primary/10 pt-4">
                <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-gray-500">Recent Points</summary>
                <div className="mt-3 flex flex-wrap gap-2">
                  {myRank.recentPoints.slice(0, 5).map((pt, i) => (<span key={i} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary"><Sparkles size={12} />+{pt.points} {REASON_LABELS[pt.reason] || pt.reason}</span>))}
                </div>
              </details>
            )}
          </div>
        </section>
      )}

      {/* Tabs */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 overflow-x-auto rounded-full border border-gray-200 bg-white p-1.5 shadow-sm scrollbar-hide">
          {TABS.map((tab) => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)} className={`flex min-h-11 items-center gap-1.5 whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold transition ${activeTab === tab.key ? 'bg-primary text-white shadow-md' : 'text-gray-600 hover:bg-gray-100'}`}>
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab !== 'faculty' && (
          <div className="relative w-full sm:w-auto">
            <select value={period} onChange={(e) => setPeriod(e.target.value)} className="w-full appearance-none rounded-full border border-primary/15 bg-white px-5 py-2.5 pr-10 text-sm font-semibold text-gray-700 shadow-sm focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-auto">
              {PERIODS.map((p) => (<option key={p.key} value={p.key}>{p.label}</option>))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
          <p className="text-sm text-gray-500">Loading leaderboard...</p>
        </div>
      )}

      {/* Individual Leaderboard */}
      {!loading && activeTab !== 'faculty' && (
        <div className="space-y-3">
          {leaders.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <Trophy size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold text-gray-700">ยังไม่มีข้อมูล</p>
              <p className="mt-1 text-sm text-gray-500">เริ่มแลก/บริจาคเพื่อขึ้นอันดับได้เลย</p>
            </div>
          ) : (
            <>
              {/* Top 3 Podium */}
              {leaders.length >= 3 && (
                <div className="mb-6 grid gap-3 sm:grid-cols-3">
                  {[leaders[1], leaders[0], leaders[2]].map((leader, i) => {
                    const rank = [2, 1, 3][i]
                    const isFirst = rank === 1
                    return (
                      <div key={leader.id} className={`relative flex items-center gap-3 rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm transition hover:shadow-md sm:flex-col sm:items-center sm:p-6 ${isFirst ? 'border-yellow-300 bg-gradient-to-b from-yellow-50 to-white sm:-mt-4' : rank === 2 ? 'border-gray-200 bg-gradient-to-b from-gray-50 to-white sm:mt-2' : 'border-orange-200 bg-gradient-to-b from-orange-50 to-white sm:mt-4'}`}>
                        {isFirst && <div className="absolute -top-3 left-1/2 -translate-x-1/2"><Crown size={24} className="text-yellow-500" /></div>}
                        <div className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white shadow-md sm:h-16 sm:w-16 sm:text-lg ${isFirst ? 'bg-yellow-500' : rank === 2 ? 'bg-gray-400' : 'bg-orange-400'}`}>{getInitials(leader.name)}</div>
                        <div className="min-w-0 flex-1 sm:text-center">
                          <p className="truncate text-sm font-semibold text-gray-900">{leader.name}</p>
                          {leader.faculty && <p className="truncate text-xs text-gray-500">{leader.faculty}</p>}
                          <p className={`mt-1 text-sm font-bold sm:mt-2 sm:text-lg ${isFirst ? 'text-yellow-600' : rank === 2 ? 'text-gray-600' : 'text-orange-600'}`}>{formatValue(leader.value, activeTab)}</p>
                        </div>
                        <div className="sm:hidden"><RankBadge rank={rank} /></div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Rest of the list */}
              {leaders.slice(leaders.length >= 3 ? 3 : 0).map((leader) => {
                const style = getRankStyle(leader.rank)
                return (
                  <div
                    key={leader.id}
                    className={`flex items-center gap-4 rounded-xl border ${style.border} ${style.bg} p-4 shadow-sm transition hover:shadow-md`}
                  >
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center">
                      <RankBadge rank={leader.rank} />
                    </div>
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                      {getInitials(leader.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{leader.name}</p>
                      {leader.faculty && (
                        <p className="text-xs text-gray-500 truncate">{leader.faculty}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-primary">
                        {formatValue(leader.value, activeTab)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* Faculty Leaderboard */}
      {!loading && activeTab === 'faculty' && (
        <div className="space-y-3">
          {faculties.length === 0 ? (
            <div className="rounded-2xl border border-gray-200 bg-white p-12 text-center shadow-sm">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-semibold text-gray-600">No faculty data yet</p>
              <p className="mt-1 text-sm text-gray-500">Faculty rankings will appear when students start exchanging</p>
            </div>
          ) : (
            faculties.map((f) => {
              const isFirst = f.rank === 1
              return (
                <div
                  key={f.faculty}
                  className={`overflow-hidden rounded-xl border shadow-sm transition hover:shadow-md ${
                    isFirst ? 'border-yellow-300 bg-gradient-to-r from-yellow-50 to-white' : 'border-gray-100 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-4 p-4 sm:p-5">
                    <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl text-lg font-bold ${
                      isFirst ? 'bg-yellow-100 text-yellow-700' : f.rank === 2 ? 'bg-gray-100 text-gray-600' : f.rank === 3 ? 'bg-orange-100 text-orange-600' : 'bg-primary/10 text-primary'
                    }`}>
                      {isFirst ? <Crown size={24} /> : `#${f.rank}`}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-base font-semibold text-gray-900 truncate">{f.faculty}</p>
                        {isFirst && <Flame size={16} className="text-yellow-500 flex-shrink-0" />}
                      </div>
                      <p className="text-xs text-gray-500">{f.memberCount} members</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 sm:flex-row sm:gap-4">
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">{f.totalValue.toFixed(1)}</p>
                        <p className="text-[10px] text-gray-500 sm:text-xs">Total kg CO₂</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-700">{f.avgValue.toFixed(1)}</p>
                        <p className="text-[10px] text-gray-500 sm:text-xs">Avg/person</p>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      <section className="mt-10">
        <details className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
          <summary className="flex cursor-pointer list-none items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles size={22} /></div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900">How to Earn Points</h3>
              <p className="text-sm text-gray-500">Every action helps the community and earns you points</p>
            </div>
          </summary>
          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100"><ArrowRightLeft size={18} className="text-purple-600" /></div><div className="flex-1"><p className="text-sm font-semibold text-gray-900">แลกเปลี่ยนสำเร็จ</p><p className="text-xs text-gray-500">ทั้งสองฝ่ายได้คะแนน</p></div><span className="rounded-full bg-purple-100 px-3 py-1 text-sm font-bold text-purple-700">+15</span></div>
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-100"><Heart size={18} className="text-red-600" /></div><div className="flex-1"><p className="text-sm font-semibold text-gray-900">บริจาค (ผู้ให้)</p><p className="text-xs text-gray-500">ขอบคุณที่แบ่งปัน</p></div><span className="rounded-full bg-red-100 px-3 py-1 text-sm font-bold text-red-700">+20</span></div>
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink-100"><Heart size={18} className="text-pink-600" /></div><div className="flex-1"><p className="text-sm font-semibold text-gray-900">บริจาค (ผู้รับ)</p><p className="text-xs text-gray-500">ของได้บ้านใหม่</p></div><span className="rounded-full bg-pink-100 px-3 py-1 text-sm font-bold text-pink-700">+5</span></div>
            <div className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100"><TrendingUp size={18} className="text-blue-600" /></div><div className="flex-1"><p className="text-sm font-semibold text-gray-900">โพสต์สินค้าใหม่</p><p className="text-xs text-gray-500">แบ่งปันกับชุมชน</p></div><span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-bold text-blue-700">+5</span></div>
          </div>
        </details>
      </section>
      </div>
    </div>
  )
}
