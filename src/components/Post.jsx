import { useEffect, useState } from 'react';
import { Bookmark, MessageCircle, Send, Share2, ThumbsUp, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { createComment, deleteComment, getComments } from '../api/comments';
import { getLike, toggleLike } from '../api/likes';
import { savePost, sharePost } from '../api/posts';

const Post = ({ post, onDelete }) => {
  const { user } = useAuth();
  const [liked, setLiked] = useState(false);
  const [likesCount, setLikesCount] = useState(post.likesCount || 0);
  const [commentsCount, setCommentsCount] = useState(post.commentsCount || 0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState('');
  const [showComments, setShowComments] = useState(false);
  const canDelete = user?.role === 'admin' || String(post.userId?._id || post.userId) === String(user?._id);

  useEffect(() => {
    getLike(post._id).then((data) => setLiked(data.liked)).catch(() => {});
    setLikesCount(post.likesCount || 0);
  }, [post._id, post.likesCount]);

  const author = post.userId?.name || 'Forum User';
  const avatar = post.userId?.profilePicture;
  const authorId = post.userId?._id || post.userId;

  const openComments = async () => {
    if (!showComments) {
      const data = await getComments(post._id);
      setComments(data.comments || []);
    }
    setShowComments(!showComments);
  };

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await createComment({ postId: post._id, comment: commentText });
    const data = await getComments(post._id);
    setComments(data.comments || []);
    setCommentsCount((count) => count + 1);
    setCommentText('');
  };

  const handleLike = async () => {
    const data = await toggleLike(post._id);
    setLiked(data.liked);
    setLikesCount(data.count);
  };

  return (
    <article className="surface overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <Link to={`/profile/${authorId}`} className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-700 text-lg font-black text-cyan-200">
          {avatar ? <img className="h-full w-full rounded object-cover" src={avatar} alt={author} /> : author.charAt(0)}
        </Link>
        <div className="min-w-0 flex-1">
          <Link to={`/profile/${authorId}`} className="font-bold text-white hover:text-cyan-300">{author}</Link>
          <p className="text-xs capitalize text-slate-400">{post.userId?.role || 'member'} - {new Date(post.createdAt).toLocaleString()}</p>
        </div>
        {canDelete && <button className="btn btn-danger gap-2 py-1" onClick={() => onDelete(post._id)}><Trash2 size={16} /> Delete</button>}
      </div>

      {post.caption && <p className="px-4 pb-4 text-slate-100">{post.caption}</p>}
      {!!post.images?.length && (
        <div className={`grid gap-1 ${post.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'}`}>
          {post.images.map((image) => <img key={image} className="max-h-[520px] w-full object-cover" src={image} alt="Post attachment" />)}
        </div>
      )}
      {post.video && <video className="w-full" controls src={post.video} />}

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2 text-xs text-slate-400">
        <span>{likesCount} likes</span>
        <span>{commentsCount} comments - {post.shares || 0} shares</span>
      </div>
      <div className="grid grid-cols-4 border-t border-white/10 text-sm font-semibold">
        <button className={`flex items-center justify-center gap-2 py-3 hover:bg-slate-800 ${liked ? 'text-cyan-300' : 'text-slate-300'}`} onClick={handleLike}><ThumbsUp size={17} /> Like</button>
        <button className="flex items-center justify-center gap-2 py-3 text-slate-300 hover:bg-slate-800" onClick={openComments}><MessageCircle size={17} /> Comment</button>
        <button className="flex items-center justify-center gap-2 py-3 text-slate-300 hover:bg-slate-800" onClick={() => sharePost(post._id)}><Share2 size={17} /> Share</button>
        <button className="flex items-center justify-center gap-2 py-3 text-slate-300 hover:bg-slate-800" onClick={() => savePost(post._id)}><Bookmark size={17} /> Save</button>
      </div>

      {showComments && (
        <div className="border-t border-white/10 p-4">
          <form className="flex gap-2" onSubmit={submitComment}>
            <input className="input" value={commentText} onChange={(e) => setCommentText(e.target.value)} placeholder="Write a comment" />
            <button className="btn btn-primary gap-2"><Send size={17} /> Send</button>
          </form>
          <div className="mt-4 space-y-3">
            {comments.map((comment) => (
              <div key={comment._id} className="rounded-lg bg-slate-950 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-bold text-white">{comment.userId?.name || 'User'}</p>
                  {(user?.role === 'admin' || String(comment.userId?._id || comment.userId) === String(user?._id)) && (
                    <button className="text-xs font-semibold text-rose-300" onClick={() => deleteComment(comment._id).then(() => setComments((items) => items.filter((item) => item._id !== comment._id)))}>Delete</button>
                  )}
                </div>
                <p className="mt-1 text-sm text-slate-300">{comment.comment}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </article>
  );
};

export default Post;
