import logoImage from '../../assets/logo-duo-capital.png'

function HandshakeIcon({ className = '' }) {
  return (
    <img
      src={logoImage}
      alt=""
      aria-hidden="true"
      width={499}
      height={323}
      className={`${className} object-contain`}
    />
  )
}

export default HandshakeIcon
