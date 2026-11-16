import HandshakeIcon from '../common/HandshakeIcon'

function AuthFormHeader({ title, subtitle }) {
  return (
    <header className="text-center">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">{title}</h1>
      <p className="mx-auto mt-3 max-w-xs text-base text-ink sm:max-w-sm">{subtitle}</p>

      <div className="mt-5 flex items-center gap-4" aria-hidden="true">
        <span className="h-px flex-1 bg-line" />
        <HandshakeIcon className="h-7 w-10" />
        <span className="h-px flex-1 bg-line" />
      </div>
    </header>
  )
}

export default AuthFormHeader
