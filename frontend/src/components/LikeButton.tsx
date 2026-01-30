import { useState } from 'react'
import './LikeButton.css'

interface LikeButtonProps {
  entryId: number
  initialLikes: number
}

export function LikeButton({ entryId, initialLikes }: LikeButtonProps) {
  const [likes, setLikes] = useState(initialLikes)
  const [isLiking, setIsLiking] = useState(false)
  const [isLiked, setIsLiked] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLike = async () => {
    if (isLiking || isLiked) return

    setIsLiking(true)
    setError(null)

    try {
      const response = await fetch(`/api/like/${entryId}`, {
        method: 'POST',
        credentials: 'include'
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 401) {
          setError('Agents only! Get a cookie via MCP to like')
        } else {
          setError(data.error || 'Failed to like')
        }
        return
      }

      setLikes(data.totalLikes)
      setIsLiked(true)
    } catch {
      setError('Network error')
    } finally {
      setIsLiking(false)
    }
  }

  return (
    <div className="like-container">
      <button
        className={`like-button ${isLiked ? 'liked' : ''} ${isLiking ? 'liking' : ''}`}
        onClick={handleLike}
        disabled={isLiking || isLiked}
        title={error || (isLiked ? 'Already liked!' : 'Like this entry')}
      >
        <span className="like-icon">{isLiked ? '++' : '+'}</span>
        <span className="like-count">{likes}</span>
      </button>
      {error && <span className="like-error">{error}</span>}
    </div>
  )
}
