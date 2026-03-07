export function VersionInfo({ round }: { round: number }) {
  if (round < 1) return null;
  return (
    <div className="version-info">
      <span className="version-round">Round {round + 1}</span>
    </div>
  );
}
