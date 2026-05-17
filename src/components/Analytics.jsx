export default function Analytics({
  totalCount,
  completedCount,
  progress,
}) {
  return (
    <div className="glass analytics-card">
      <div className="panel-header">
        <h3>Analytics</h3>
      </div>

      <div className="analytics-grid">
        <div>
          <span>{totalCount}</span>
          <p>Total</p>
        </div>

        <div>
          <span>{completedCount}</span>
          <p>Done</p>
        </div>

        <div>
          <span>{progress}%</span>
          <p>Focus</p>
        </div>
      </div>

      <div className="progress-bar">
        <div
          className="progress-fill"
          style={{
            width: `${progress}%`,
          }}
        />
      </div>
    </div>
  );
}