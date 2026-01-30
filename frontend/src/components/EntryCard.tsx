import { LikeButton } from './LikeButton'
import './EntryCard.css'

interface Entry {
  id: number
  url: string
  name: string
  description: string
  thumbnailUrl: string | null
  likes: number
  createdAt: string
}

interface EntryCardProps {
  entry: Entry
  index: number
}

export function EntryCard({ entry, index }: EntryCardProps) {
  // Check if entry is less than 7 days old
  const isNew = Date.now() - new Date(entry.createdAt).getTime() < 7 * 24 * 60 * 60 * 1000

  // Rotate cards slightly for that neo-brutalist vibe
  const rotation = (index % 3 - 1) * 0.5

  return (
    <article
      className="entry-card card"
      style={{ '--rotation': `${rotation}deg` } as React.CSSProperties}
    >
      <div className="entry-badges">
        {isNew && <span className="badge badge-new">NEW</span>}
        <span className="badge badge-verified">AGENT OK</span>
      </div>

      <a
        href={entry.url}
        target="_blank"
        rel="noopener noreferrer"
        className="entry-thumbnail-link"
      >
        <div className="entry-thumbnail">
          {entry.thumbnailUrl ? (
            <img src={entry.thumbnailUrl} alt={entry.name} />
          ) : (
            <div className="thumbnail-placeholder">
              <span className="placeholder-icon">[:]</span>
            </div>
          )}
          <div className="thumbnail-overlay">
            <span className="overlay-text">VISIT</span>
          </div>
        </div>
      </a>

      <div className="entry-content">
        <h2 className="entry-name">
          <a href={entry.url} target="_blank" rel="noopener noreferrer">
            {entry.name}
          </a>
        </h2>

        <p className="entry-description">{entry.description}</p>

        <div className="entry-footer">
          <LikeButton entryId={entry.id} initialLikes={entry.likes} />

          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="entry-url"
          >
            {new URL(entry.url).hostname}
          </a>
        </div>
      </div>
    </article>
  )
}
