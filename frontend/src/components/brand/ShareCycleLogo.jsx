import logo from '../../assets/logo.png'

export default function ShareCycleLogo({ className = 'h-10 w-10', title = 'CMU ShareCycle' }) {
  return <img src={logo} alt={title} className={`object-contain ${className}`} />
}
