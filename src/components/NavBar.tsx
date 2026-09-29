/** Props for {@link NavBar}. */
type NavBarProps = {
  /** Page being rendered; its link is highlighted. */
  current: 'ethereum' | '2fa'
}

/** Top navigation between the toolbox pages. */
export default function NavBar({ current }: NavBarProps) {
  // Relative hrefs keep links working under any GitHub Pages base path.
  const root = current === 'ethereum' ? './' : '../'
  const links = [
    { id: 'ethereum', label: 'Ethereum', href: root },
    { id: '2fa', label: '2FA', href: `${root}2fa/` },
  ] as const

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {links.map((l) => (
          <a
            key={l.id}
            href={l.href}
            className={l.id === current ? 'active' : undefined}
            aria-current={l.id === current ? 'page' : undefined}
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  )
}
