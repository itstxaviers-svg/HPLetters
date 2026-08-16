import type { AppData } from '../types'

const STORAGE_KEY = 'learn_letters_data_v2'

export const defaultData: AppData = {
  students: [],
  currentStudentId: null,
  settings: {
    sound: true,
    reducedEffects: false,
  },
}

export function loadData(): AppData {
  try {
    const value = localStorage.getItem(STORAGE_KEY)
    if (!value) return defaultData
    const parsed = JSON.parse(value) as Partial<AppData>
    return {
      ...defaultData,
      ...parsed,
      students: parsed.students ?? [],
      settings: {
        sound: parsed.settings?.sound ?? defaultData.settings.sound,
        reducedEffects: parsed.settings?.reducedEffects ?? defaultData.settings.reducedEffects,
      },
    }
  } catch {
    return defaultData
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}
