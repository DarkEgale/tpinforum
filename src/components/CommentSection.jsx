import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import './CommentSection.css';

const CommentSection = ({ comments, onAddComment, onDeleteComment, currentUserId }) => {
  const [newComment, setNewComment] = useState('');
  const { user } = useAuth();

  const handleSubmit = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(newComment.trim());
      setNewComment('');
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="comment-section">
      <div className="comments-list">
        {comments.map((comment) => (
          <div key={comment._id} className="comment">
            <div className="comment-header">
              <span className="comment-user">{comment.userId?.name}</span>
              <span className="comment-time">{formatDate(comment.createdAt)}</span>
              {currentUserId === comment.userId?._id && (
                <button
                  className="btn-delete-comment"
                  onClick={() => onDeleteComment(comment._id)}
                >
                  Delete
                </button>
              )}
            </div>
            <p className="comment-text">{comment.comment}</p>
          </div>
        ))}
        {comments.length === 0 && (
          <p className="no-comments">No comments yet. Be the first to comment!</p>
        )}
      </div>

      {user && (
        <form onSubmit={handleSubmit} className="comment-form">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Add a comment..."
            className="comment-input"
          />
          <button type="submit" className="btn btn-primary" disabled={!newComment.trim()}>
            Post
          </button>
        </form>
      )}
    </div>
  );
};

export default CommentSection;