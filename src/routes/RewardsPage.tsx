import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { motion } from 'motion/react'
import { Gift, LockKeyhole, Sparkles } from 'lucide-react'
import { useApp } from '../context/AppContext'
import { badges } from '../data/badges'
import { earnedBadgeIds } from '../lib/rewards'
import { PageShell } from '../components/PageShell'
import { TopBar } from '../components/TopBar'
import chestClosed from '../assets/rewards/reward-chest-closed.png'
import chestOpen from '../assets/rewards/reward-chest-open.png'

export function RewardsPage() {
  const { currentStudent } = useApp()
  const [open, setOpen] = useState(false)
  if (!currentStudent) return <Navigate to="/" replace />
  const earned = earnedBadgeIds(currentStudent)

  return (
    <PageShell>
      <TopBar backTo="/menu" backLabel="Letter menu (Меню букв)" />
      <section className="rewards-hero">
        <div><span className="hero-badge"><Sparkles /> Your magical collection (Твоя волшебная коллекция)</span><h1><span className="title-en">Rewards cabinet</span><small className="title-ru">(Шкаф наград)</small></h1><p>Every badge remembers something special about the way you learned. (Каждая награда хранит историю твоего успеха.)</p></div>
        <button className={`reward-chest ${open ? 'is-open' : ''}`} onClick={() => setOpen((value) => !value)}>
          <motion.img src={open ? chestOpen : chestClosed} alt={open ? 'Open reward chest' : 'Closed reward chest'} animate={open ? { y: [0, -5, 0], scale: [1, 1.04, 1] } : {}} />
          <span><Gift /> {open ? 'Treasure revealed! (Сокровище открыто!)' : 'Open your reward chest (Открыть сундук)'}</span>
        </button>
      </section>

      <section className="rewards-grid">
        {badges.map((badge, index) => {
          const isEarned = earned.includes(badge.id)
          return (
            <motion.article key={badge.id} className={`reward-card ${isEarned ? 'is-earned' : ''}`} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.035 }}>
              <div className="reward-image"><img src={badge.image} alt="" />{!isEarned && <span><LockKeyhole /></span>}</div>
              <span className="reward-state">{isEarned ? 'Earned (Получено)' : 'Keep practising (Продолжай)'}</span>
              <h2>{badge.title}</h2>
              <p>{badge.description}</p>
            </motion.article>
          )
        })}
      </section>
    </PageShell>
  )
}
