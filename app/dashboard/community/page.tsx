"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CldUploadWidget } from "next-cloudinary";

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // New Post State
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostMedia, setNewPostMedia] = useState<{ url: string, type: string } | null>(null);
  const [isPosting, setIsPosting] = useState(false);

  // New Comment State mapping postId -> content
  const [newComments, setNewComments] = useState<Record<string, string>>({});

  // Edit State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  useEffect(() => {
    if (status === "authenticated") fetchPosts();
  }, [status]);

  const fetchPosts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/posts");
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent && !newPostMedia) return;
    setIsPosting(true);

    try {
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: newPostContent,
          mediaUrl: newPostMedia?.url,
          mediaType: newPostMedia?.type, // "IMAGE" or "VIDEO"
        }),
      });

      if (res.ok) {
        setNewPostContent("");
        setNewPostMedia(null);
        fetchPosts();
      }
    } catch (error) {
      console.error(error);
    }
    setIsPosting(false);
  };

  const handleCreateComment = async (postId: string, e: React.FormEvent) => {
    e.preventDefault();
    const content = newComments[postId];
    if (!content?.trim()) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });

      if (res.ok) {
        setNewComments(prev => ({ ...prev, [postId]: "" }));
        fetchPosts(); // refreshing all posts is easiest for now
      }
    } catch (error) {
      console.error(error);
    }
  };
  const handleDeletePost = async (postId: string) => {
    if (!confirm("ต้องการลบโพสต์นี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      if (res.ok) fetchPosts();
    } catch (error) {
      console.error(error);
    }
  };

  const handleDeleteComment = async (postId: string, commentId: string) => {
    if (!confirm("ต้องการลบคอมเมนต์นี้ใช่หรือไม่?")) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, { method: "DELETE" });
      if (res.ok) fetchPosts();
    } catch (error) {
      console.error(error);
    }
  };

  const submitEditPost = async (postId: string) => {
    if (!editPostContent.trim()) return;
    try {
      const res = await fetch(`/api/posts/${postId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editPostContent })
      });
      if (res.ok) {
        setEditingPostId(null);
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const submitEditComment = async (postId: string, commentId: string) => {
    if (!editCommentContent.trim()) return;
    try {
      const res = await fetch(`/api/posts/${postId}/comments/${commentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: editCommentContent })
      });
      if (res.ok) {
        setEditingCommentId(null);
        fetchPosts();
      }
    } catch (e) {
      console.error(e);
    }
  };
  const handleUploadSuccess = (result: any) => {
    if (result.event !== "success") return;
    const isVideo = result.info.resource_type === "video";
    setNewPostMedia({
      url: result.info.secure_url,
      type: isVideo ? "VIDEO" : "IMAGE"
    });
  };

  if (status === "loading") return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">ชุมชน 💬</h1>
        <p className="text-gray-500 mt-2">พูดคุย แลกเปลี่ยน แบ่งปันผลงานการซ้อมดนตรี</p>
      </div>

      {/* CREATE POST */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
        <form onSubmit={handleCreatePost}>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            placeholder="คุณกำลังคิดอะไรอยู่? หาเพื่อนซ้อม โชว์ผลงานเพลง..."
            className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-4 min-h-[100px] focus:ring-2 focus:ring-indigo-500 focus:outline-none resize-none"
          />
          
          {newPostMedia && (
            <div className="relative mt-4 bg-gray-100 rounded-xl overflow-hidden border border-gray-200 inline-block">
              <button 
                type="button" 
                onClick={() => setNewPostMedia(null)} 
                className="absolute top-2 right-2 bg-gray-900/50 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-500 transition z-10"
              >✕</button>
              {newPostMedia.type === "VIDEO" ? (
                <video src={newPostMedia.url} controls className="max-h-60 rounded-xl" />
              ) : (
                <img src={newPostMedia.url} alt="Upload" className="max-h-60 object-contain rounded-xl" />
              )}
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <CldUploadWidget 
              signatureEndpoint="/api/sign-image"
              onSuccess={handleUploadSuccess}
              options={{ sources: ['local', 'camera', 'url'], resourceType: 'auto' }}
            >
              {({ open }) => (
                <button 
                  type="button" 
                  onClick={() => open()} 
                  className="text-gray-500 hover:text-indigo-600 font-medium flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-indigo-50 transition"
                >
                  <span className="text-xl">📷</span> รุปภาพ / วิดีโอ
                </button>
              )}
            </CldUploadWidget>

            <button 
              type="submit" 
              disabled={isPosting || (!newPostContent && !newPostMedia)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              โพสต์
            </button>
          </div>
        </form>
      </div>

      {/* POSTS FEED */}
      {loading ? (
        <p className="text-center text-gray-500 animate-pulse my-12">กำลังโหลดฟีด...</p>
      ) : posts.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <span className="text-6xl mb-4 block">🏜️</span>
          <p>ยังไม่มีโพสต์เลย เป็นคนแรกที่เริ่มการสนทนาสิ!</p>
        </div>
      ) : (
        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              {/* Post Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 border border-indigo-200">
                  {post.user?.name?.[0] || post.user?.email?.[0]?.toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-bold text-gray-800">{post.user?.name || post.user?.email}</h3>
                  <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('th-TH')}</p>
                </div>
                {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.id === post.userId) && (
                  <div className="flex gap-2">
                    {(session?.user as any)?.id === post.userId && (
                      <button 
                        onClick={() => {
                          setEditingPostId(post.id);
                          setEditPostContent(post.content);
                        }} 
                        className="text-gray-500 hover:bg-gray-100 px-3 py-1 rounded transition text-sm border border-transparent hover:border-gray-200"
                      >
                        แก้ไข
                      </button>
                    )}
                    <button onClick={() => handleDeletePost(post.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded transition text-sm border border-transparent hover:border-red-200">ลบโพสต์</button>
                  </div>
                )}
              </div>

              {/* Post Body & Edit Mode */}
              {editingPostId === post.id ? (
                <div className="mb-4">
                  <textarea
                    value={editPostContent}
                    onChange={(e) => setEditPostContent(e.target.value)}
                    className="w-full bg-white border border-indigo-300 text-gray-900 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-2 min-h-[80px]"
                  />
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingPostId(null)} className="px-4 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">ยกเลิก</button>
                    <button onClick={() => submitEditPost(post.id)} className="px-4 py-1.5 text-sm bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg">บันทึก</button>
                  </div>
                </div>
              ) : (
                <p className="text-gray-800 whitespace-pre-wrap mb-4">{post.content}</p>
              )}
              
              {post.mediaUrl && (
                <div className="mb-6 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex justify-center">
                  {post.mediaType === "VIDEO" ? (
                    <video src={post.mediaUrl} controls className="w-full max-h-[500px] object-contain bg-black" />
                  ) : (
                    <img src={post.mediaUrl} alt="Post media" className="max-h-[500px] object-contain" />
                  )}
                </div>
              )}

              {/* Comments Section */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                {post.comments?.length > 0 && (
                  <div className="space-y-3 mb-4 bg-gray-50 p-4 rounded-xl">
                    {post.comments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="w-6 h-6 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-1">
                          {comment.user?.name?.[0] || comment.user?.email?.[0]?.toUpperCase()}
                        </div>
                        <div className="flex-1">
                          {editingCommentId === comment.id ? (
                            <div className="bg-white p-2 rounded-xl border border-indigo-200 shadow-sm">
                              <input
                                autoFocus
                                type="text"
                                value={editCommentContent}
                                onChange={(e) => setEditCommentContent(e.target.value)}
                                className="w-full border-none focus:outline-none text-sm text-gray-900 mb-2 bg-transparent"
                              />
                              <div className="flex justify-end gap-2 mt-1">
                                <button onClick={() => setEditingCommentId(null)} className="text-[10px] text-gray-500 hover:bg-gray-100 px-2 py-1 rounded">ยกเลิก</button>
                                <button onClick={() => submitEditComment(post.id, comment.id)} className="text-[10px] bg-indigo-500 text-white px-2 py-1 rounded">บันทึก</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-gray-200 inline-block shadow-sm w-full md:w-auto">
                                <span className="text-xs font-bold text-gray-700 block mb-0.5">{comment.user?.name || comment.user?.email?.split('@')[0]}</span>
                                <p className="text-sm text-gray-900">{comment.content}</p>
                              </div>
                              <div className="flex items-center gap-3 mt-1 ml-2">
                                <p className="text-[10px] text-gray-400">
                                  {new Date(comment.createdAt).toLocaleDateString('th-TH')}
                                </p>
                                {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.id === comment.userId) && (
                                  <>
                                    {(session?.user as any)?.id === comment.userId && (
                                      <button 
                                        onClick={() => {
                                          setEditingCommentId(comment.id);
                                          setEditCommentContent(comment.content);
                                        }} 
                                        className="text-[10px] text-gray-500 hover:underline"
                                      >
                                        แก้ไข
                                      </button>
                                    )}
                                    <button onClick={() => handleDeleteComment(post.id, comment.id)} className="text-[10px] text-red-500 hover:underline">ลบ</button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <form onSubmit={(e) => handleCreateComment(post.id, e)} className="flex gap-2">
                  <input
                    type="text"
                    placeholder="เขียนความคิดเห็น..."
                    value={newComments[post.id] || ""}
                    onChange={(e) => setNewComments({ ...newComments, [post.id]: e.target.value })}
                    className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                  <button 
                    type="submit" 
                    disabled={!newComments[post.id]?.trim()}
                    className="bg-indigo-600 text-white rounded-full px-4 py-2 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                  >
                    ส่ง
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
