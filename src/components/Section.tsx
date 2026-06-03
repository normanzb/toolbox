import type { PropsWithChildren } from 'react'

/** Props for {@link Section}. */
type SectionProps = PropsWithChildren<{
  /** Section heading. */
  title: string
  /** Optional one-line description shown under the heading. */
  description?: string
}>

/** Card-style container grouping one tool. */
export default function Section({ title, description, children }: SectionProps) {
  return (
    <section className="section">
      <h2>{title}</h2>
      {description && <p className="section-desc">{description}</p>}
      {children}
    </section>
  )
}
