import { forwardRef } from 'react'

const Button = forwardRef(function Button(
  { variant = 'primary', size = 'medium', className = '', type = 'button', ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={`ui-button ui-button-${variant} ui-button-${size} ${className}`.trim()}
      {...props}
    />
  )
})

export default Button
