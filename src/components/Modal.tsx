import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { X } from 'lucide-react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  onClose?: () => void
  children: ReactNode
  label: string
}

export function Modal({ open, onClose, children, label }: ModalProps) {
  const shouldReduce = useReducedMotion()
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.section
            className="modal-card"
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={shouldReduce ? false : { opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
          >
            {onClose && <button className="modal-close" onClick={onClose} aria-label="Close"><X size={20} /></button>}
            {children}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
