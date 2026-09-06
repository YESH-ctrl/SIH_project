// QSwarm style reminder: numbered rails, mono telemetry, hard edges, and restrained lime signal.

type SectionLabelProps = {
  number: string;
  eyebrow: string;
  tone?: "lime" | "muted";
};

export function SectionLabel({ number, eyebrow, tone = "lime" }: SectionLabelProps) {
  return (
    <div className={`section-label section-label--${tone}`}>
      <span className="section-label__number">{number}</span>
      <span className="section-label__line" aria-hidden="true" />
      <span className="section-label__eyebrow">{eyebrow}</span>
    </div>
  );
}
