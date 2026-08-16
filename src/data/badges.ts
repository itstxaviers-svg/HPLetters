import goldenQuill from '../assets/rewards/badge-golden-quill.webp'
import firstTry from '../assets/rewards/badge-first-try.webp'
import perfectLetter from '../assets/rewards/badge-perfect-letter.webp'
import persistence from '../assets/rewards/badge-persistence.webp'
import progressSpark from '../assets/rewards/badge-progress-spark.webp'
import uppercaseMaster from '../assets/rewards/badge-uppercase-master.webp'
import lowercaseMaster from '../assets/rewards/badge-lowercase-master.webp'
import letters5 from '../assets/rewards/badge-letters-5.webp'
import letters10 from '../assets/rewards/badge-letters-10.webp'
import alphabetMaster from '../assets/rewards/badge-alphabet-master.webp'

export interface BadgeDefinition {
  id: string
  title: string
  description: string
  image: string
}

export const badges: BadgeDefinition[] = [
  { id: 'golden-quill', title: 'Golden Quill (Золотое перо)', description: 'Average accuracy of 92% or higher. (Средняя точность 92% или выше.)', image: goldenQuill },
  { id: 'first-try', title: 'First Try (С первой попытки)', description: 'Three clean successes with no extra attempts. (Три успеха без лишних попыток.)', image: firstTry },
  { id: 'perfect-letter', title: 'Perfect Letter (Идеальная буква)', description: 'Complete a letter with 95% accuracy. (Заверши букву с точностью 95%.)', image: perfectLetter },
  { id: 'persistence', title: 'Persistence (Упорство)', description: 'Keep going and turn a miss into success. (Не сдавайся и преврати ошибку в успех.)', image: persistence },
  { id: 'progress-spark', title: 'Progress Spark (Искра прогресса)', description: 'Improve accuracy by at least 15 points. (Улучши точность минимум на 15 пунктов.)', image: progressSpark },
  { id: 'uppercase-master', title: 'Uppercase Master (Мастер заглавных)', description: 'Complete every available uppercase stage. (Пройди все доступные заглавные буквы.)', image: uppercaseMaster },
  { id: 'lowercase-master', title: 'Lowercase Master (Мастер строчных)', description: 'Complete every available lowercase stage. (Пройди все доступные строчные буквы.)', image: lowercaseMaster },
  { id: 'letters-5', title: 'Five Letters (Пять букв)', description: 'Complete five letters. (Заверши пять букв.)', image: letters5 },
  { id: 'letters-10', title: 'Ten Letters (Десять букв)', description: 'Complete ten letters. (Заверши десять букв.)', image: letters10 },
  { id: 'alphabet-master', title: 'Alphabet Master (Мастер алфавита)', description: 'Complete the whole alphabet. (Заверши весь алфавит.)', image: alphabetMaster },
]
