interface Props {
  visible: boolean;
  count: number;
  onCancel: () => void;
  onSave: () => void;
  saving?: boolean;
  saveLabel?: string;
}

export default function StickySaveBar({
  visible,
  count,
  onCancel,
  onSave,
  saving = false,
  saveLabel = '저장',
}: Props) {
  return (
    <div
      className="ew-sticky-save-bar"
      data-visible={visible}
      role="region"
      aria-label="변경사항 저장"
      aria-hidden={!visible}
    >
      <div className="ew-sticky-save-bar__inner">
        <span className="ew-sticky-save-bar__msg">
          <span className="ew-sticky-save-bar__dot" aria-hidden />
          저장하지 않은 변경사항 <strong>{count}</strong>개
        </span>
        <div className="ew-sticky-save-bar__actions">
          <button
            type="button"
            className="ew-btn ew-btn--secondary ew-btn--sm"
            onClick={onCancel}
            disabled={saving}
          >
            취소
          </button>
          <button
            type="button"
            className="ew-btn ew-btn--primary ew-btn--sm"
            onClick={onSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : saveLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
