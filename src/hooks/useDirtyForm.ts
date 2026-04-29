import { useCallback, useMemo, useState } from 'react';

/**
 * 폼/탭의 임시 편집 상태(draft)를 원본(original)과 분리해서 관리한다.
 *
 * - draft: 사용자가 입력 중인 값. 화면에 바인딩.
 * - reset(): 원본으로 되돌림 (취소 버튼).
 * - commit(): 현재 draft를 원본으로 승격 (저장 성공 시).
 * - sync(next): 외부에서 새 데이터(예: 다른 항목 선택)가 들어왔을 때 강제 동기화.
 *
 * dirty 판정은 shallow 비교(Object.is). 깊은 객체 필드는 호출부에서
 * 새 객체를 만들어 setField로 넘기면 자연스럽게 dirty로 잡힌다.
 */
export function useDirtyForm<T extends object>(initial: T) {
  const [original, setOriginal] = useState<T>(initial);
  const [draft, setDraftState] = useState<T>(initial);

  const dirtyFields = useMemo(() => {
    const keys = new Set<keyof T>([
      ...(Object.keys(original) as Array<keyof T>),
      ...(Object.keys(draft) as Array<keyof T>),
    ]);
    const set = new Set<keyof T>();
    keys.forEach((k) => {
      if (!Object.is(draft[k], original[k])) set.add(k);
    });
    return set;
  }, [draft, original]);

  const isDirty = dirtyFields.size > 0;

  const setField = useCallback(<K extends keyof T>(key: K, value: T[K]) => {
    setDraftState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const setDraft = useCallback((updater: T | ((prev: T) => T)) => {
    setDraftState(updater as (prev: T) => T);
  }, []);

  const reset = useCallback(() => {
    setDraftState(original);
  }, [original]);

  const commit = useCallback(() => {
    setOriginal(draft);
  }, [draft]);

  const sync = useCallback((next: T) => {
    setOriginal(next);
    setDraftState(next);
  }, []);

  const isFieldDirty = useCallback((key: keyof T) => dirtyFields.has(key), [dirtyFields]);

  return {
    draft,
    setDraft,
    setField,
    isDirty,
    dirtyFields,
    count: dirtyFields.size,
    isFieldDirty,
    reset,
    commit,
    sync,
  };
}
