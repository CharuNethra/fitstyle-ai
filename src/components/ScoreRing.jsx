export default function ScoreRing({ score, size = 140 }) {
  const stroke = 10;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (score / 100) * c;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#EFE8DD" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="url(#score-grad)"
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1.2s ease-out' }}
        />
        <defs>
          <linearGradient id="score-grad" x1="0" x2="1">
            <stop offset="0%" stopColor="#D9C08A" />
            <stop offset="100%" stopColor="#8C6D2E" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="font-serif text-4xl font-semibold" data-testid="match-score">{score}%</p>
          <p className="text-[11px] font-semibold uppercase tracking-widest text-ink/50">Match</p>
        </div>
      </div>
    </div>
  );
}
