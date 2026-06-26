import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { io } from "socket.io-client";
import { Bell, Menu, X } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { createPost, deletePost, getPosts } from "../api/posts";
import Post from "../components/Post";
import Chat from "../components/Chat";
import { SOCKET_URL } from "../api/config";
import { uploadToCloud } from "../api/uploads";

const socket = io(SOCKET_URL, { withCredentials: true });

const Home = () => {
  const { user } = useAuth();
  const [posts, setPosts] = useState([]);
  const [caption, setCaption] = useState("");
  const [images, setImages] = useState([]);
  const [video, setVideo] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showLeftPanel, setShowLeftPanel] = useState(false);
  const [showRightPanel, setShowRightPanel] = useState(false);

  const fetchPosts = async () => {
    const data = await getPosts();
    setPosts(data.posts || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
    socket.emit("userOnline", user?._id);
    socket.on("newPost", (post) =>
      setPosts((current) => [
        post,
        ...current.filter((item) => item._id !== post._id),
      ]),
    );
    socket.on("likeUpdate", (data) =>
      setPosts((current) =>
        current.map((post) =>
          post._id === data.postId ? { ...post, likesCount: data.count } : post,
        ),
      ),
    );
    socket.on("newComment", (data) =>
      setPosts((current) =>
        current.map((post) =>
          post._id === data.postId
            ? { ...post, commentsCount: (post.commentsCount || 0) + 1 }
            : post,
        ),
      ),
    );
    return () => {
      socket.off("newPost");
      socket.off("likeUpdate");
      socket.off("newComment");
    };
  }, [user?._id]);

  const filteredPosts = useMemo(() => {
    const term = query.toLowerCase();
    return posts.filter((post) =>
      [post.caption, post.userId?.name, post.userId?.department]
        .join(" ")
        .toLowerCase()
        .includes(term),
    );
  }, [posts, query]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!caption.trim() && !images.length && !video) return;
    await createPost({
      caption,
      images,
      video: video || undefined,
      visibility: "public",
    });
    setCaption("");
    setImages([]);
    setVideo("");
  };

  const handleMediaUpload = async (event) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const results = await Promise.all(
        files.map((file) => uploadToCloud(file)),
      );
      results.forEach((data) => {
        if (data.resourceType === "video") setVideo(data.url);
        else setImages((current) => [...current, data.url]);
      });
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };

  const handleDelete = async (postId) => {
    await deletePost(postId);
    setPosts((current) => current.filter((post) => post._id !== postId));
  };

  const shortcuts = [
    { label: "Profile", to: "/profile" },
    { label: "Dashboard", to: "/dashboard" },
    { label: "Result Search", to: "/result-search" },
    { label: "Results", to: "/dashboard" },
    { label: "Notices", to: "/dashboard" },
    { label: "Messages", to: "/messages" },
  ];

  const leftPanel = (
    <div className="space-y-3">
      {shortcuts.map((item) => (
        <Link
          key={item.label}
          to={item.to}
          className="surface block p-3 text-sm font-semibold text-slate-200 hover:border-cyan-400/60"
        >
          {item.label}
        </Link>
      ))}
    </div>
  );

  const rightPanel = (
    <div className="space-y-4">
      <div className="surface p-4">
        <h2 className="font-black text-white">Live Updates</h2>
        <p className="mt-2 text-sm text-slate-400">
          New notices, results, posts, messages, likes, and comments update in
          real time.
        </p>
      </div>
      <Chat compact mode="campus" />
    </div>
  );

  return (
    <main className="mx-auto grid max-w-7xl gap-4 px-3 py-4 sm:px-4 lg:grid-cols-[240px_minmax(0,1fr)_300px] lg:gap-6 lg:py-6">
      <div className="sticky top-[73px] z-30 flex gap-2 lg:hidden">
        <button
          className="btn btn-muted flex-1 gap-2"
          type="button"
          onClick={() => setShowLeftPanel(true)}
        >
          <Menu size={17} /> Menu
        </button>
        <button
          className="btn btn-muted flex-1 gap-2"
          type="button"
          onClick={() => setShowRightPanel(true)}
        >
          <Bell size={17} /> Updates
        </button>
      </div>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        {leftPanel}
      </aside>

      <section className="space-y-4">
        <form className="surface p-4" onSubmit={handleCreate}>
          <div className="flex gap-3">
            {user?.profilePicture ? (
              <img
                src={user.profilePicture}
                alt={user?.name || "user"}
                className="h-11 w-11 rounded-lg object-cover"
              />
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-cyan-500 text-lg font-black text-slate-950">
                {user?.name?.charAt(0) || "U"}
              </div>
            )}
            <textarea
              className="input min-h-24"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="What's on your mind?"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <label className="btn btn-muted cursor-pointer">
              {uploading ? "Uploading..." : "Upload Media"}
              <input
                className="hidden"
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={handleMediaUpload}
              />
            </label>
            <button className="btn btn-primary">Post</button>
          </div>
          {!!images.length && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {images.map((image) => (
                <img
                  key={image}
                  className="h-24 w-full rounded-md object-cover"
                  src={image}
                  alt="Post preview"
                />
              ))}
            </div>
          )}
          {video && (
            <p className="mt-2 text-xs text-slate-400">
              Video attached from cloud upload.
            </p>
          )}
        </form>

        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search posts, people, departments"
        />

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((item) => (
              <div
                key={item}
                className="h-48 animate-pulse rounded-lg bg-slate-800"
              />
            ))}
          </div>
        ) : filteredPosts.length ? (
          filteredPosts.map((post) => (
            <Post key={post._id} post={post} onDelete={handleDelete} />
          ))
        ) : (
          <div className="surface p-8 text-center text-slate-400">
            No posts found.
          </div>
        )}
      </section>

      <aside className="hidden lg:sticky lg:top-24 lg:block lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto">
        {rightPanel}
      </aside>

      {showLeftPanel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 p-3 backdrop-blur lg:hidden">
          <div className="surface max-h-full overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black text-white">Menu</h2>
              <button
                className="btn btn-muted h-9 w-9 p-0"
                onClick={() => setShowLeftPanel(false)}
              >
                <X size={17} />
              </button>
            </div>
            {leftPanel}
          </div>
        </div>
      )}

      {showRightPanel && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 p-3 backdrop-blur lg:hidden">
          <div className="surface max-h-full overflow-y-auto p-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-black text-white">Updates</h2>
              <button
                className="btn btn-muted h-9 w-9 p-0"
                onClick={() => setShowRightPanel(false)}
              >
                <X size={17} />
              </button>
            </div>
            {rightPanel}
          </div>
        </div>
      )}
    </main>
  );
};

export default Home;
