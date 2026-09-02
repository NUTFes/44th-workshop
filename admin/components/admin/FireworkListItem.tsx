import { dangerButtonStyle, fireworkItemStyle, statusBadgeStyle } from '@/styles/adminStyles';
import type { Firework } from '@/hooks/useFireworks';
import ImagePreview from "./ImagePreview"

interface FireworkListItemProps {
  firework: Firework;
  imageUrl: string | null;
  isSelected: boolean;
  isDeleting: boolean;
  isUpdating: boolean;
  onSelect: (firework: Firework) => void;
  onDelete: (id: number) => void;
  onToggleShareable: (id: number, newIsShareable: boolean) => void;
}

export default function FireworkListItem({
  firework,
  imageUrl,
  isSelected,
  isDeleting,
  isUpdating,
  onSelect,
  onDelete,
  onToggleShareable,
}: FireworkListItemProps) {
  return (
    <div
      style={fireworkItemStyle(isSelected)}
      onClick={() => onSelect(firework)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            fontWeight: 'bold',
            marginBottom: '0.5rem',
            color: '#2d3748',
            width: '6rem',
            flexShrink: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
          title={`花火 #${firework.id}`}
        >
          🎆 花火 #{firework.id}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleShareable(firework.id, !firework.isShareable);
            }}
            disabled={isUpdating}
            style={{
              ...statusBadgeStyle(firework.isShareable),
              border: 'none',
              cursor: isUpdating ? 'not-allowed' : 'pointer',
              opacity: isUpdating ? 0.6 : 1,
            }}
            title={firework.isShareable ? 'クリックして非公開にする' : 'クリックして公開する'}
          >
            {isUpdating ? '⏳ 更新中...' : firework.isShareable ? '🌐 Shareable' : '🔒 Private'}
          </button>
          <span style={{ fontSize: '0.75rem', color: '#718096', minWidth: '6rem' }}>
            📅 {firework.createdAt ? new Date(firework.createdAt).toLocaleDateString() : 'N/A'}
          </span>
        </div>
        <ImagePreview
          imageUrl={imageUrl}
          size={50}
        />
      </div>
      
      <div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onDelete(firework.id);
          }}
          disabled={isDeleting}
          style={{
            ...dangerButtonStyle,
            padding: '0.5rem 1rem',
            fontSize: '0.75rem',
            opacity: isDeleting ? 0.6 : 1,
          }}
          title="Delete firework"
        >
          {isDeleting ? '⏳ 削除しています...' : '🗑️ 削除'}
        </button>
      </div>
    </div>
  );
}
