import { useState } from 'react'

export default function Avatar({ user, src = user?.profile_image, className = '', onError }) {
  const [failedSrc, setFailedSrc] = useState(null)
  const initials = `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase() || 'U'
  return <div className={`shrink-0 overflow-hidden bg-primary-100 text-primary-700 flex items-center justify-center font-bold ${className}`}>
    {src && failedSrc !== src
      ? <img key={src} src={src} alt={`${user?.first_name || 'User'}'s profile`} className="w-full h-full object-cover object-top" onError={() => { setFailedSrc(src); onError?.() }} />
      : <span aria-label="Profile initials">{initials}</span>}
  </div>
}
