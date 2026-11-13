import { usePreferences, getLocale } from "../../context/Preferences";
import { CartesianGrid, Line, LineChart, ReferenceArea, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
const bandColors = {
  slate: ['#f1f5f9', '#64748b'],
  green: ['#ecfdf5', '#15803d'],
  cyan: ['#ecfeff', '#0891b2'],
  blue: ['#eff6ff', '#2563eb']
};
export function ProgressTooltip({
  active,
  payload,
  timezone
}) {
  const {
    t
  } = usePreferences();
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return <div className="rounded-xl bg-white border border-slate-200 shadow-lg p-3 text-xs space-y-1"><p className="font-semibold text-slate-900">{t(new Intl.DateTimeFormat(getLocale(), {
        timeZone: timezone,
        month: 'short',
        day: 'numeric'
      }).format(point.timestamp))}</p><p className="text-primary-600 font-semibold">{t("Rating: ")}{t(point.rating.toLocaleString(getLocale()))}</p><p className="text-slate-500">{t(`${point.attempts} ${point.attempts === 1 ? "contest" : "contests"} completed`)}</p><p className="text-slate-500">{t("Average score: ")}{t(point.average_score === null ? 'No quizzes' : `${point.average_score}%`)}</p></div>;
}
export default function ProgressChart({
  progress
}) {
  const {
    t,
    theme
  } = usePreferences();
  const colors = theme === 'dark' ? {
    slate: ['#080808', '#a3a3a3'],
    green: ['#101010', '#6ee7b7'],
    cyan: ['#161616', '#67e8f9'],
    blue: ['#1c1c1c', '#93c5fd']
  } : bandColors;
  const ratings = progress.timeline.map(point => point.rating);
  const bottom = Math.max(0, Math.floor((Math.min(...ratings) - 50) / 200) * 200);
  const top = Math.max(1800, Math.ceil((Math.max(...ratings) + 150) / 200) * 200);
  const formatDate = value => new Intl.DateTimeFormat(getLocale(), {
    timeZone: progress.timezone,
    month: 'short',
    day: 'numeric'
  }).format(value);
  return <div className="h-72 sm:h-80 w-full min-w-0" aria-label={t("Skill rating history chart")}>
    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
      <LineChart data={progress.timeline} margin={{
        top: 14,
        right: 28,
        bottom: 8,
        left: -12
      }} accessibilityLayer>
        <CartesianGrid vertical={false} stroke="var(--chart-grid)" strokeDasharray="3 3" />
        <XAxis dataKey="timestamp" type="number" scale="time" domain={['dataMin', 'dataMax']} tickFormatter={formatDate} tick={{
          fontSize: 11,
          fill: 'var(--chart-text)'
        }} minTickGap={24} tickLine={false} axisLine={{
          stroke: 'var(--chart-grid)'
        }} />
        <YAxis domain={[bottom, top]} allowDecimals={false} tick={{
          fontSize: 11,
          fill: 'var(--chart-text)'
        }} tickLine={false} axisLine={false} width={58} />
        {progress.levels.map(level => {
          const low = Math.max(bottom, level.minimum),
            high = Math.min(top, level.maximum === null ? top : level.maximum + 1);
          if (low >= high) return null;
          return <ReferenceArea key={level.name} y1={low} y2={high} fill={colors[level.color][0]} fillOpacity={0.8} stroke="none" label={{
            value: t(level.name),
            position: 'insideTopRight',
            fill: colors[level.color][1],
            fontSize: 11
          }} />;
        })}
        <Tooltip content={<ProgressTooltip timezone={progress.timezone} />} />
        <Line type="monotone" name={t("Skill rating")} dataKey="rating" stroke="var(--chart-line)" strokeWidth={3} dot={progress.timeline.length <= 10 ? {
          r: 4,
          fill: 'var(--chart-dot)',
          strokeWidth: 2
        } : false} activeDot={{
          r: 6
        }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  </div>;
}
