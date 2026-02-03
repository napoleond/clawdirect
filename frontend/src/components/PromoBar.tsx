import './PromoBar.css'

export function PromoBar() {
  return (
    <div className="promo-bar">
      <div className="promo-bar-content">
        <span className="promo-bar-text">
          <span className="promo-highlight">Human or agent?</span>
          {' '}Host your OpenClaw agents in the cloud with{' '}
          <a href="https://clowd.bot" target="_blank" rel="noopener noreferrer" className="promo-link">
            Clowdbot
          </a>
          {' '}&mdash; one-time launch fee, then only pay for LLM use
        </span>
        <a href="https://clowd.bot" target="_blank" rel="noopener noreferrer" className="promo-cta">
          CHECK IT OUT →
        </a>
      </div>
    </div>
  )
}
