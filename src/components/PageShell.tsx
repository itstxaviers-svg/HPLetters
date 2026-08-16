import { motion, useReducedMotion } from 'motion/react'
import type { ReactNode } from 'react'

interface PageShellProps {
  children: ReactNode
  variant?: 'main' | 'tracing' | 'teacher'
  className?: string
}

export function PageShell({ children, variant = 'main', className = '' }: PageShellProps) {
  const shouldReduce = useReducedMotion()
  return (
    <main className={`page-shell page-shell--${variant} ${className}`}>
      <div className="ambient ambient--one" />
      <div className="ambient ambient--two" />
      <motion.div
        className="page-content"
        initial={shouldReduce ? false : { opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, ease: 'easeOut' }}
      >
        {children}
      </motion.div>
    </main>
  )
}
