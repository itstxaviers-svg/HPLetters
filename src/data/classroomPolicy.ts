export interface ClassroomPolicy {
  releaseCount: number
  sequential: boolean
}

const policies: Record<'11-12' | '14' | '15' | '16', ClassroomPolicy> = {
  '11-12': { releaseCount: 25, sequential: true },
  '14': { releaseCount: 18, sequential: true },
  '15': { releaseCount: 0, sequential: false },
  '16': { releaseCount: 6, sequential: false },
}

function classroomGroup(group: string): keyof typeof policies | null {
  const value = group.trim().toLowerCase()
  if (/(?:^|\D)11\D*12(?:\D|$)/.test(value)) return '11-12'
  if (/(?:^|\D)14(?:\D|$)/.test(value)) return '14'
  if (/(?:^|\D)15(?:\D|$)/.test(value)) return '15'
  if (/(?:^|\D)16(?:\D|$)/.test(value)) return '16'
  return null
}

export function classroomPolicyForGroup(group: string): ClassroomPolicy {
  const groupId = classroomGroup(group)
  return groupId ? policies[groupId] : { releaseCount: 0, sequential: false }
}

export function studentLessonIsOpenForGroup(group: string, lessonIndex: number, previousLessonsComplete: boolean): boolean {
  const policy = classroomPolicyForGroup(group)
  if (lessonIndex < 0 || lessonIndex >= policy.releaseCount) return false
  return !policy.sequential || lessonIndex === 0 || previousLessonsComplete
}
