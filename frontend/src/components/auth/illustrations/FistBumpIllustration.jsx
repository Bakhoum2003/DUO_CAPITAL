import fistsImage from '../../../assets/fists-duo-capital.png'

function FistBumpIllustration({ className = '' }) {
  return (
    <img
      src={fistsImage}
      alt=""
      aria-hidden="true"
      width={513}
      height={196}
      className={`${className} h-auto`}
    />
  )
}

export default FistBumpIllustration
