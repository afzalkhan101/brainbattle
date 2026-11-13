import { usePreferences, getLocale } from "../../context/Preferences";
import { lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Shield, Flame, TrendingUp, TrendingDown, Info, ArrowRight, ClipboardList, CalendarDays, Wallet } from 'lucide-react';
const ProgressChart = lazy(() => import('./ProgressChart'));
const levelStyles = {
  Newbie: {
    text: 'text-slate-600',
    bg: 'bg-slate-100',
    bar: 'bg-slate-500'
  },
  Pupil: {
    text: 'text-emerald-700',
    bg: 'bg-emerald-50',
    bar: 'bg-emerald-600'
  },
  Specialist: {
    text: 'text-cyan-700',
    bg: 'bg-cyan-50',
    bar: 'bg-cyan-600'
  },
  Expert: {
    text: 'text-blue-700',
    bg: 'bg-blue-50',
    bar: 'bg-blue-600'
  }
};
const score = value => value === null ? '—' : `${value}%`;
const dateLabel = date => new Intl.DateTimeFormat(getLocale(), {
  month: 'short',
  day: 'numeric',
  timeZone: 'UTC'
}).format(new Date(`${date}T00:00:00Z`));
function Delta({
  value,
  unit = 'pp'
}) {
  const {
    t
  } = usePreferences();
  const Icon = value < 0 ? TrendingDown : TrendingUp;
  return <span className={`inline-flex gap-1 items-center text-xs font-medium ${value < 0 ? 'text-red-600' : value > 0 ? 'text-emerald-600' : 'text-slate-500'}`}><Icon size={14} />{t(value > 0 ? '+' : '')}{t(value)}{t(unit)}</span>;
}
function SummaryCard({
  icon: Icon,
  color,
  title,
  value,
  children
}) {
  const {
    t
  } = usePreferences();
  return <div className="card p-5 flex gap-4 items-start"><div className={`rounded-xl p-3 shrink-0 ${color}`}><Icon size={23} /></div><div className="min-w-0"><p className="text-2xl font-bold tracking-tight">{t(value)}</p><p className="text-sm text-slate-500 mt-1">{t(title)}</p>{children && <div className="mt-2">{t(children)}</div>}</div></div>;
}
export default function StudentProgress({
  progress,
  period,
  setPeriod,
  refreshing,
  available,
  wallet
}) {
  const {
    t
  } = usePreferences();
  const style = levelStyles[progress.level];
  const currentLevel = progress.levels.find(level => level.name === progress.level);
  const nextLevel = progress.levels.find(level => level.name === progress.next_level);
  return <div className="space-y-6">
    <section className="card p-5"><div className="flex flex-wrap justify-between items-center gap-3"><div><h2 className="font-semibold">{t('Daily practice progress')}</h2><p className="text-xs text-slate-400 mt-1">{t('Practice and legacy quiz results stay separate from competitive ratings.')}</p></div><Link to="/practice" className="btn-primary">{t('Practice arena')}</Link></div><div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5">{[['Solved questions', progress.practice?.solved], ['Practice accuracy', progress.practice?.accuracy == null ? '—' : `${progress.practice.accuracy}%`], ['Practice attempts', progress.practice?.attempts], ['Practised today', progress.practice?.today]].map(([label, value]) => <div key={label}><p className="text-xs text-slate-500">{t(label)}</p><p className="text-xl font-bold mt-1">{value ?? 0}</p></div>)}</div></section>
    <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
      <SummaryCard icon={BookOpen} color="bg-violet-50 text-violet-600" title={t("Contests completed")} value={progress.completed.toLocaleString(getLocale())}><Link className="text-xs text-primary-600 hover:underline" to="/contests">{t("View contests →")}</Link></SummaryCard>
      <SummaryCard icon={TrendingUp} color="bg-emerald-50 text-emerald-600" title={t("Today's contest average")} value={score(progress.today.average_score)}>{progress.score_change !== null ? <><Delta value={progress.score_change} /><p className="text-xs text-slate-400">{t("vs yesterday")}</p></> : <p className="text-xs text-slate-400">{t(progress.today.average_score === null ? 'Finish a contest to see your score' : 'No score from yesterday to compare')}</p>}</SummaryCard>
      <SummaryCard icon={Shield} color={`${style.bg} ${style.text}`} title={t("Current level")} value={progress.level}><p className="text-xs text-slate-500">{t("Skill rating ")}{t(progress.rating.toLocaleString(getLocale()))}</p></SummaryCard>
      <SummaryCard icon={Flame} color="bg-amber-50 text-amber-600" title={t("Practice streak")} value={`${progress.streak} ${progress.streak === 1 ? 'day' : 'days'}`}><p className="text-xs text-slate-400">{t(progress.streak ? 'Keep practising every day' : 'Start with your first quiz')}</p></SummaryCard>
    </div>
    <div className="grid xl:grid-cols-[minmax(0,2.1fr)_minmax(0,1fr)] gap-5">
      <section className="card min-w-0 p-4 sm:p-6" aria-busy={refreshing}><div className="flex flex-wrap justify-between gap-4 mb-5"><div><h2 className="text-xl font-bold">{t("Your progress")}</h2><p className="text-sm text-slate-500 mt-1">{t("Skill rating over time")}</p></div><div className="flex self-start border border-slate-200 rounded-xl p-1 gap-1" role="group" aria-label={t("Progress time range")}>{[['7', '7 days'], ['30', '30 days'], ['all', 'All time']].map(([value, label]) => <button type="button" key={value} aria-pressed={period === value} onClick={() => setPeriod(value)} className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${period === value ? 'bg-primary-600 text-white shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}>{t(label)}</button>)}</div></div>
        {t(refreshing ? <div role="status" className="h-72 sm:h-80 flex items-center justify-center text-slate-400">{t("Updating chart…")}</div> : progress.completed ? <Suspense fallback={<div role="status" className="h-72 sm:h-80 flex items-center justify-center text-slate-400">{t("Loading chart…")}</div>}><ProgressChart progress={progress} /></Suspense> : <div className="h-72 sm:h-80 flex flex-col items-center justify-center text-center gap-3 rounded-xl bg-slate-50 border border-dashed border-slate-200"><TrendingUp size={36} className="text-primary-300" /><h3 className="font-semibold">{t("Your contest progress starts here")}</h3><p className="text-sm text-slate-500 max-w-xs px-3">{t("Finish a contest to start your competitive rating curve. Daily practice has separate progress.")}</p><Link to="/contests" className="btn-primary mt-1">{t("View contests")}<ArrowRight size={15} /></Link></div>)}
        <div className="flex flex-wrap justify-between gap-2 mt-4 text-xs text-slate-500"><span className="flex gap-2 items-center"><Info size={14} />{t("No finished contest on a day? No rating change.")}</span>{progress.today.attempts > 0 && <Delta value={progress.rating_change_today} unit=" rating today" />}</div>
        {progress.completed > 0 && !refreshing && <details className="mt-3 text-xs text-slate-500"><summary className="cursor-pointer hover:text-primary-600">{t("View chart data")}</summary><div className="max-h-52 overflow-auto mt-2"><table className="w-full text-left"><thead><tr><th className="py-2">{t("Date")}</th><th>{t("Rating")}</th><th>{t("Contests")}</th><th>{t("Avg. score")}</th></tr></thead><tbody>{progress.timeline.map(point => <tr key={point.date} className="border-t border-slate-100"><td className="py-2">{t(dateLabel(point.date))}</td><td>{t(point.rating)}</td><td>{t(point.attempts)}</td><td>{t(score(point.average_score))}</td></tr>)}</tbody></table></div></details>}
      </section>
      <section className="card p-5 sm:p-6"><h2 className="text-xl font-bold mb-5">{t("Your level")}</h2><div className="flex gap-4 items-center"><div className={`p-4 rounded-2xl ${style.bg} ${style.text}`}><Shield size={32} /></div><div><p className={`font-semibold ${style.text}`}>{t(progress.level)}</p><p className="text-3xl font-bold mt-1 tabular-nums">{t(progress.rating.toLocaleString(getLocale()))}</p><p className="text-xs text-slate-500 mt-1">{t("Current skill rating")}</p></div></div>
        <div className="mt-6"><div className="h-2.5 bg-slate-100 rounded-full overflow-hidden" role="progressbar" aria-label={t("Progress to next level")} aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress.level_progress}><div className={`h-full rounded-full ${style.bar} transition-all`} style={{
              width: `${progress.level_progress}%`
            }} /></div>{nextLevel ? <><div className="flex justify-between text-xs text-slate-400 mt-2"><span>{t(currentLevel.minimum.toLocaleString(getLocale()))}</span><span>{t(nextLevel.minimum.toLocaleString(getLocale()))}</span></div><p className={`text-sm font-medium mt-2 ${style.text}`}>{t(`${progress.points_to_next_level} rating points to ${progress.next_level}`)}</p></> : <p className="text-sm text-blue-600 mt-2">{t("Highest level reached. Keep improving!")}</p>}</div>
        <div className="space-y-2 mt-5">{progress.levels.map(level => <div key={level.name} className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs ${levelStyles[level.name].bg} ${levelStyles[level.name].text}`}><Shield size={17} /><span className="font-semibold">{t(level.name)}</span>{level.name === progress.level && <span className="text-[9px] font-bold bg-white/70 rounded-full px-1.5 py-0.5">{t("CURRENT")}</span>}<span className="ml-auto whitespace-nowrap">{t(level.minimum.toLocaleString(getLocale()))}{t(level.maximum === null ? '+' : `–${level.maximum.toLocaleString(getLocale())}`)}</span></div>)}</div>
        <details className="text-xs text-slate-500 mt-4"><summary className="cursor-pointer hover:text-primary-600">{t("How rating works")}</summary><p className="mt-2 leading-relaxed">{t("Start at 1,000. Finished contests change rating by twice the score percentage minus 100. For example, 80% earns +60; 40% gives −20. Practice and legacy quizzes do not change competitive rating. Practice streaks use Bangladesh time.")}</p></details>
      </section>
    </div>
    <div className="grid lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] gap-5">
      <section className="card p-5 sm:p-6"><h2 className="text-lg font-bold mb-5">{t("Contest scores: yesterday vs today")}</h2><div className="grid sm:grid-cols-2 gap-5">{[['Yesterday', progress.yesterday], ['Today', progress.today]].map(([label, day]) => <div key={label} className="min-w-0"><div className="flex gap-2 items-center text-sm font-semibold"><CalendarDays size={17} className="text-primary-500" />{t(label)}{" · "}{t(dateLabel(day.date))}</div><div className="flex flex-wrap gap-5 mt-4 pl-6"><div><p className="text-xs text-slate-400">{t("Average score")}</p><p className="text-2xl font-bold mt-1">{t(score(day.average_score))}</p></div><div className="border-l border-slate-100 pl-5"><p className="text-xs text-slate-400">{t("Contests")}</p><p className="text-2xl font-bold mt-1">{t(day.attempts)}</p></div></div>{!day.attempts && <p className="text-xs text-slate-400 mt-2 pl-6">{t("No contests completed")}</p>}</div>)}</div><div className="border-t border-slate-100 pt-4 mt-5 text-xs text-slate-500">{t(progress.score_change === null ? 'Finish contests on both days to compare competitive scores.' : <><Delta value={progress.score_change} unit=" percentage points" /><span className="ml-2">{t(progress.score_change > 0 ? 'Higher average than yesterday' : progress.score_change < 0 ? 'Lower average than yesterday — keep practising' : 'Same average as yesterday')}</span></>)}</div></section>
      <section className="card p-5 sm:p-6"><h2 className="text-lg font-bold mb-4">{t("Quick actions")}</h2>{[{
          to: '/practice',
          icon: BookOpen,
          title: 'Practice arena',
          sub: 'Solve subject-wise questions any time'
        }, {
          to: '/contests',
          icon: ClipboardList,
          title: 'Subject contests',
          sub: 'Join weekly and monthly competitions'
        }, {
          to: '/wallet',
          icon: Wallet,
          title: 'Wallet',
          sub: wallet === null ? 'View your balance' : `৳${wallet} available`
        }].map(({
          to,
          icon: Icon,
          title,
          sub
        }) => <Link key={to} to={to} className="flex items-center gap-3 py-3 hover:bg-slate-50 rounded-xl"><div className="bg-primary-50 text-primary-600 rounded-lg p-2.5"><Icon size={17} /></div><div><p className="text-sm font-medium">{t(title)}</p><p className="text-xs text-slate-400 mt-1">{t(sub)}</p></div><ArrowRight size={15} className="ml-auto text-slate-300" /></Link>)}</section>
    </div>
  </div>;
}
