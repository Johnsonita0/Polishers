export default function Card({ className = '', ...props }) {
  return <section className={`ui-card ${className}`.trim()} {...props} />
}
