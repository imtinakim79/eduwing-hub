import { useCallback, useEffect } from 'react';

/**
 * 페이지 이탈 가드용 dirty 추적기.
 *
 * - 모듈 레벨 Map으로 여러 form/섹션의 dirty 상태를 등록한다.
 * - hasDirty(): 등록된 것 중 하나라도 dirty면 true.
 * - confirmIfDirty(): dirty면 confirm을 띄우고 사용자 결정을 반환.
 * - useBeforeUnloadGuard(): App 최상위에서 한 번 호출. 브라우저 이탈 시 confirm.
 * - useDirtyGuard(id, isDirty): 페이지/섹션이 자기 dirty 상태를 등록.
 *   저장 직후 navigate 호출 전에 명시적으로 cleanup하려면 반환된 clear()를 호출.
 */
const dirtyMap = new Map<string, boolean>();

export function hasDirty(): boolean {
  for (const v of dirtyMap.values()) if (v) return true;
  return false;
}

export function confirmIfDirty(
  message = '저장하지 않은 변경사항이 있습니다. 그래도 이동할까요?'
): boolean {
  if (!hasDirty()) return true;
  return window.confirm(message);
}

export function useDirtyGuard(id: string, isDirty: boolean): () => void {
  useEffect(() => {
    if (isDirty) dirtyMap.set(id, true);
    else dirtyMap.delete(id);
    return () => {
      dirtyMap.delete(id);
    };
  }, [id, isDirty]);

  return useCallback(() => {
    dirtyMap.delete(id);
  }, [id]);
}

export function useBeforeUnloadGuard() {
  useEffect(() => {
    function handler(e: BeforeUnloadEvent) {
      if (hasDirty()) {
        e.preventDefault();
        e.returnValue = '';
      }
    }
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);
}
