// 공용 카드 박스 — border + radius + canvas 배경 통일
// 단순 사용:    <Card>...</Card>
// 헤더 있음:    <Card title="제목" actions={<>...</>}>...</Card>
// 패딩 제거:    <Card flush>...</Card>            (탭 컨테이너처럼 자식이 자체 padding)
// 좁은 패딩:    <Card compact>...</Card>
// 인라인 스타일/클래스:  style={{ ... }}, className="..."
import type { CSSProperties, ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  title?: ReactNode;
  actions?: ReactNode;
  className?: string;
  style?: CSSProperties;
  flush?: boolean;
  compact?: boolean;
}

export default function Card({ children, title, actions, className, style, flush, compact }: CardProps) {
  const padding = flush
    ? 0
    : compact
      ? 'var(--space-4) var(--space-5)'
      : 'var(--space-5) var(--space-6)';
  return (
    <section
      className={`ew-card${className ? ' ' + className : ''}`}
      style={{ padding, ...style }}
    >
      {(title || actions) && (
        <>
          <header className="ew-card__header">
            {title && <h3 className="ew-card__title">{title}</h3>}
            {actions && <div className="ew-card__actions">{actions}</div>}
          </header>
          <hr className="ew-card__divider" />
        </>
      )}
      {children}
    </section>
  );
}
