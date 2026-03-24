"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CldUploadWidget } from "next-cloudinary";
import Link from "next/link";

export default function CommunityPage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // New Post State
  const [newPostContent, setNewPostContent] = useState("");
  const [newPostMedia, setNewPostMedia] = useState<{ url: string, type: string } | null>(null);
  const [isPosting, setIsPosting] = useState(false);
  
  const [isPoll, setIsPoll] = useState(false);
  const [pollOptions, setPollOptions] = useState<string[]>(["", ""]);

  // New Comment State mapping postId -> content
  const [newComments, setNewComments] = useState<Record<string, string>>({});
  const [newCommentMedia, setNewCommentMedia] = useState<Record<string, { url: string, type: string } | null>>({});
  const [showComments, setShowComments] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<Record<string, string | null>>({}); // postId -> parentId

  // Edit State
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");

  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editCommentContent, setEditCommentContent] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetchProfile();
      fetchPosts(true);
    }
  }, [status]);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/profile");
      if (res.ok) setProfile(await res.json());
    } catch (e) {
      console.error(e);
    }
  };

  const fetchPosts = async (showLoading = false) => {
    if (showLoading) setLoading(true);
    try {
      const res = await fetch("/api/posts", { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        setPosts(data);
      }
    } catch (e) {
      console.error(e);
    }
    if (showLoading) setLoading(false);
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
          isPoll,
          pollOptions: isPoll ? pollOptions.filter(o => o.trim()) : []
        }),
      });

      if (res.ok) {
        setNewPostContent("");
        setNewPostMedia(null);
        setIsPoll(false);
        setPollOptions(["", ""]);
        fetchPosts();
      }
    } catch (error) {
      console.error(error);
    }
    setIsPosting(false);
  };

  const handleCreateComment = async (postId: string, e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = newComments[postId];
    const media = newCommentMedia[postId];
    if (!content?.trim() && !media) return;

    try {
      const res = await fetch(`/api/posts/${postId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          content,
          parentId: replyingTo[postId] || null,
          mediaUrl: media?.url,
          mediaType: media?.type
        }),
      });

      if (res.ok) {
        setNewComments(prev => ({ ...prev, [postId]: "" }));
        setNewCommentMedia(prev => ({ ...prev, [postId]: null }));
        setReplyingTo(prev => ({ ...prev, [postId]: null }));
        setShowComments(prev => ({ ...prev, [postId]: true }));
        fetchPosts(); 
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/like`, { method: "POST" });
      if (res.ok) fetchPosts();
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

  const handleReportPost = async (postId: string) => {
    const reason = prompt("กรุณาระบุเหตุผลที่รายงานโพสต์นี้:");
    if (!reason?.trim()) return;
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ postId, reason })
      });
      if (res.ok) alert("ระบบรับเรื่องรายงานโพสต์เรียบร้อยแล้ว แอดมินจะตรวจสอบโดยเร็วที่สุดครับ");
    } catch (e) {
      console.error(e);
    }
  };

  const handleVote = async (postId: string, optionId: string) => {
    try {
      const res = await fetch(`/api/posts/${postId}/vote`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ pollOptionId: optionId })
      });
      if (res.ok) fetchPosts();
      else alert((await res.json()).error);
    } catch (e) { console.error(e); }
  };

  if (status === "loading") return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">ชุมชน 💬</h1>
        <p className="text-gray-500 mt-2">พูดคุย แลกเปลี่ยน แบ่งปันผลงานการซ้อมดนตรี</p>
      </div>

      {profile?.banUntil && new Date(profile.banUntil) > new Date() && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-6 mb-8 text-center text-red-700 shadow-sm animate-pulse">
          <h2 className="text-xl font-bold mb-2">🚨 บัญชีของคุณถูกระงับสิทธิ์</h2>
          <p>
            คุณไม่สามารถโพสต์หรือคอมเมนต์ได้จนถึง: <br/>
            <span className="font-bold text-lg">{new Date(profile.banUntil).toLocaleString('th-TH')}</span>
          </p>
          {profile.banReason && (
            <p className="mt-2 text-sm opacity-80 border-t border-red-200 pt-2 inline-block">
              เหตุผล: {profile.banReason}
            </p>
          )}
        </div>
      )}

      {/* CREATE POST */}
      {!(profile?.banUntil && new Date(profile.banUntil) > new Date()) && (
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
            <div className="flex items-center gap-4">
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

              <div className="flex items-center gap-2">
                <input type="checkbox" id="isPoll" checked={isPoll} onChange={(e) => setIsPoll(e.target.checked)} className="rounded text-indigo-600 w-4 h-4 focus:ring-indigo-500 cursor-pointer" />
                <label htmlFor="isPoll" className="text-sm font-medium text-gray-700 cursor-pointer">สร้างโพลล์ความคิดเห็น</label>
              </div>
            </div>

            <button 
              type="submit" 
              disabled={isPosting || (!newPostContent && !newPostMedia && !isPoll)}
              className="bg-indigo-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-indigo-700 transition disabled:opacity-50"
            >
              โพสต์
            </button>
          </div>
          
          {isPoll && (
            <div className="mt-4 space-y-2 border-l-4 border-indigo-200 pl-4 bg-indigo-50/50 p-4 rounded-r-xl">
              <p className="text-xs font-bold text-indigo-800 mb-2">ออกแบบโพลล์ (ตัวเลือก)</p>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input type="text" value={opt} onChange={(e) => {
                    const newOpts = [...pollOptions];
                    newOpts[idx] = e.target.value;
                    setPollOptions(newOpts);
                  }} placeholder={`ตัวเลือกที่ ${idx + 1}`} className="flex-1 bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none" />
                </div>
              ))}
              {pollOptions.length < 5 && (
                <button type="button" onClick={() => setPollOptions([...pollOptions, ""])} className="text-xs text-indigo-600 font-bold mt-2 hover:underline inline-block px-1">+ เพิ่มตัวเลือก</button>
              )}
            </div>
          )}
        </form>
      </div>
      )}

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
            <div key={post.id} className={`bg-white p-6 rounded-2xl shadow-sm border ${post.isPinned ? "border-amber-400 bg-amber-50/20" : "border-gray-100"}`}>
              
              {post.isPinned && (
                 <div className="flex items-center gap-1 text-xs font-bold text-amber-700 mb-4 bg-amber-100 w-fit px-2 py-1 rounded">
                   <span>📌</span> ประกาศจากผู้ดูแล
                 </div>
              )}

              {/* Post Header */}
              <div className="flex items-center gap-3 mb-4">
                <Link href={`/dashboard/profile/${post.userId}`} className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 border border-indigo-200 overflow-hidden hover:ring-2 hover:ring-indigo-300 transition">
                  {post.user?.image ? (
                    <img src={post.user.image} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    post.user?.name?.[0] || post.user?.email?.[0]?.toUpperCase()
                  )}
                </Link>
                <div className="flex-1">
                  <Link href={`/dashboard/profile/${post.userId}`}>
                    <h3 className="text-sm font-bold text-gray-800 hover:text-indigo-600 hover:underline">{post.user?.name || post.user?.email}</h3>
                  </Link>
                  <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('th-TH')}</p>
                </div>
                {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.id === post.userId) ? (
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
                ) : (
                  <button onClick={() => handleReportPost(post.id)} className="text-gray-400 hover:text-red-500 px-3 py-1 bg-gray-50 hover:bg-red-50 rounded transition text-xs flex items-center gap-1 font-medium">
                    <span>🚩</span> รายงาน
                  </button>
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

              {post.isPoll && post.pollOptions?.length > 0 && (
                <div className="mt-4 mb-6 space-y-2">
                  <h4 className="font-bold text-gray-800 text-sm mb-3">📊 โพลล์ความคิดเห็น {(!post.isApproved && post.userId === (session?.user as any)?.id) && "(รอแอดมินอนุมัติ)"}</h4>
                  <div className="space-y-2">
                    {post.pollOptions.map((opt: any) => {
                      const totalVotes = post.pollVotes?.length || 0;
                      const thisVotes = opt._count?.votes || 0;
                      const percent = totalVotes > 0 ? Math.round((thisVotes / totalVotes) * 100) : 0;
                      const hasVotedThis = post.pollVotes?.some((v: any) => v.userId === (session?.user as any)?.id && v.pollOptionId === opt.id);
                      const hasVotedAny = post.pollVotes?.some((v: any) => v.userId === (session?.user as any)?.id);
                      
                      return (
                        <div 
                          key={opt.id} 
                          className={`relative bg-gray-50 border ${hasVotedThis ? 'border-indigo-400' : 'border-gray-200'} rounded-lg overflow-hidden flex items-center min-h-[40px] ${!hasVotedAny && post.isApproved ? 'cursor-pointer hover:border-indigo-300' : 'cursor-default'}`} 
                          onClick={() => !hasVotedAny && post.isApproved && handleVote(post.id, opt.id)}
                        >
                          <div className={`absolute top-0 left-0 bottom-0 ${hasVotedThis ? 'bg-indigo-200/60' : 'bg-indigo-100/50'} transition-all duration-1000`} style={{ width: `${hasVotedAny ? percent : 0}%` }}></div>
                          <div className="relative z-10 flex justify-between w-full px-4 text-sm py-2">
                            <span className={`font-medium ${hasVotedThis ? 'text-indigo-900 font-bold' : 'text-gray-800'}`}>{opt.text}</span>
                            {hasVotedAny && <span className="text-gray-600 font-bold">{percent}% <span className="text-xs text-gray-400">({thisVotes})</span></span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {post.pollVotes?.length > 0 && <p className="text-xs text-gray-400 mt-2 text-right">จำนวนผู้โหวต: {post.pollVotes.length}</p>}
                </div>
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

              {/* Stats Bar */}
              <div className="flex items-center justify-between text-gray-500 text-sm mb-3 px-2">
                <div className="flex items-center gap-2 cursor-pointer hover:underline text-indigo-700">
                   <div className="bg-indigo-600 w-5 h-5 rounded-full flex items-center justify-center text-white text-[10px]">👍</div> 
                   <span>{post.likes?.length || 0}</span>
                </div>
                <div 
                  className="cursor-pointer hover:underline" 
                  onClick={() => setShowComments(prev => ({ ...prev, [post.id]: !prev[post.id] }))}
                >
                  <span className="font-medium text-gray-600">{post.comments?.length || 0} ความคิดเห็น</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex border-y border-gray-100 py-1 mb-4">
                <button 
                  onClick={() => handleToggleLike(post.id)}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg font-bold transition-colors ${post.likes?.some((l: any) => l.userId === (session?.user as any)?.id) ? 'text-indigo-600 bg-indigo-50 hover:bg-indigo-100' : 'text-gray-500 hover:bg-gray-100'}`}
                >
                  <span className="text-xl pb-1">👍</span> ถูกใจ
                </button>
                <button 
                  onClick={() => setShowComments(prev => ({ ...prev, [post.id]: true }))}
                  className="flex-1 flex items-center justify-center gap-2 text-gray-500 hover:bg-gray-100 py-2 rounded-lg font-bold transition-colors"
                >
                  <span className="text-xl pb-1">💬</span> แสดงความคิดเห็น
                </button>
              </div>

              {/* Comments Section */}
              {showComments[post.id] && (
              <div className="pt-2">
                {post.comments?.length > 0 && (
                  <div className="space-y-4 mb-4 bg-gray-50/50 p-2 md:p-4 rounded-xl">
                    {post.comments.filter((c: any) => !c.parentId).map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <Link href={`/dashboard/profile/${comment.userId}`} className="w-8 h-8 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 mt-1 overflow-hidden hover:ring-2 hover:ring-purple-300 transition">
                          {comment.user?.image ? (
                            <img src={comment.user.image} alt="Avatar" className="w-full h-full object-cover" />
                          ) : (
                            comment.user?.name?.[0] || comment.user?.email?.[0]?.toUpperCase()
                          )}
                        </Link>
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
                              <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm inline-block">
                                <Link href={`/dashboard/profile/${comment.userId}`}>
                                  <span className="text-sm font-bold text-gray-800 block mb-0.5 hover:underline">
                                    {comment.user?.name || comment.user?.email?.split('@')[0]}
                                  </span>
                                </Link>
                                {comment.content && <p className="text-sm text-gray-900 whitespace-pre-wrap">{comment.content}</p>}
                                {comment.mediaUrl && (
                                  <div className="mt-2 rounded-lg overflow-hidden border border-gray-100 max-w-sm">
                                    {comment.mediaType === "VIDEO" ? (
                                      <video src={comment.mediaUrl} controls className="w-full max-h-48 object-cover" />
                                    ) : comment.mediaType === "AUDIO" ? (
                                      <audio src={comment.mediaUrl} controls className="w-full max-w-[250px] h-10" />
                                    ) : (
                                      <img src={comment.mediaUrl} alt="Comment media" className="w-full max-h-48 object-cover" />
                                    )}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-3 mt-1 ml-2">
                                <p className="text-[11px] text-gray-500 font-medium">
                                  {new Date(comment.createdAt).toLocaleDateString('th-TH')}
                                </p>
                                <button 
                                  onClick={() => setReplyingTo(prev => ({ ...prev, [post.id]: comment.id }))} 
                                  className="text-[11px] font-bold text-gray-500 hover:text-indigo-600 transition"
                                >
                                  ตอบกลับ
                                </button>
                                {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.id === comment.userId) && (
                                  <>
                                    {(session?.user as any)?.id === comment.userId && (
                                      <button onClick={() => { setEditingCommentId(comment.id); setEditCommentContent(comment.content); }} className="text-[11px] font-bold text-gray-500 hover:text-indigo-600 transition">แก้ไข</button>
                                    )}
                                    <button onClick={() => handleDeleteComment(post.id, comment.id)} className="text-[11px] font-bold text-gray-500 hover:text-red-500 transition">ลบ</button>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                          
                          {/* Replies */}
                          {post.comments.filter((r: any) => r.parentId === comment.id).length > 0 && (
                            <div className="mt-3 space-y-3 pl-2 sm:pl-4 border-l-2 border-gray-100">
                              {post.comments.filter((r: any) => r.parentId === comment.id).map((reply: any) => (
                                <div key={reply.id} className="flex gap-2">
                                  <Link href={`/dashboard/profile/${reply.userId}`} className="w-6 h-6 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-1 overflow-hidden hover:ring-2 hover:ring-indigo-300">
                                    {reply.user?.image ? (
                                      <img src={reply.user.image} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      reply.user?.name?.[0] || reply.user?.email?.[0]?.toUpperCase()
                                    )}
                                  </Link>
                                  <div className="flex-1">
                                    <div className="bg-white px-3 py-2 rounded-2xl rounded-tl-none border border-gray-100 shadow-sm inline-block">
                                      <Link href={`/dashboard/profile/${reply.userId}`}>
                                        <span className="text-xs font-bold text-gray-800 block hover:underline">
                                          {reply.user?.name || reply.user?.email?.split('@')[0]}
                                        </span>
                                      </Link>
                                      {reply.content && <p className="text-sm text-gray-900 whitespace-pre-wrap">{reply.content}</p>}
                                      {reply.mediaUrl && (
                                        <div className="mt-1 flex border border-gray-100 rounded-lg overflow-hidden max-w-64">
                                          {reply.mediaType === "VIDEO" ? (
                                            <video src={reply.mediaUrl} controls className="max-h-32 w-full object-cover" />
                                          ) : reply.mediaType === "AUDIO" ? (
                                            <audio src={reply.mediaUrl} controls className="w-full max-w-[200px] h-8" />
                                          ) : (
                                            <img src={reply.mediaUrl} className="max-h-32 w-full object-cover" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 ml-2">
                                      <p className="text-[10px] text-gray-500">{new Date(reply.createdAt).toLocaleDateString('th-TH')}</p>
                                      {((session?.user as any)?.role === "ADMIN" || (session?.user as any)?.id === reply.userId) && (
                                        <button onClick={() => handleDeleteComment(post.id, reply.id)} className="text-[10px] font-bold text-gray-400 hover:text-red-500">ลบ</button>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {!(profile?.banUntil && new Date(profile.banUntil) > new Date()) ? (
                  <div className="flex flex-col gap-2">
                    
                    {/* Media Preview inside the comment block */}
                    {newCommentMedia[post.id] && (
                       <div className="relative inline-block border border-gray-200 rounded-lg overflow-hidden bg-gray-100 max-w-[200px]">
                         <button 
                           onClick={() => setNewCommentMedia(prev => ({ ...prev, [post.id]: null }))}
                           className="absolute top-1 right-1 bg-gray-900/50 text-white w-5 h-5 flex items-center justify-center rounded-full text-[10px] hover:bg-red-500 z-10"
                         >✕</button>
                         {newCommentMedia[post.id]?.type === "VIDEO" ? (
                           <video src={newCommentMedia[post.id]!.url} className="max-h-24 w-full object-cover" />
                         ) : newCommentMedia[post.id]?.type === "AUDIO" ? (
                           <div className="p-2 text-xs font-bold text-indigo-600 flex items-center justify-center gap-2 h-16"><span className="text-lg">🎧</span> แนบไฟล์เสียงแล้ว</div>
                         ) : (
                           <img src={newCommentMedia[post.id]!.url} className="max-h-24 w-full object-cover" />
                         )}
                       </div>
                    )}
                    
                    {replyingTo[post.id] && (
                       <div className="flex items-center gap-2 text-xs font-bold text-indigo-600 mb-1 ml-2">
                         <span>กำลังตอบกลับความคิดเห็น...</span>
                         <button onClick={() => setReplyingTo(prev => ({ ...prev, [post.id]: null }))} className="text-gray-400 hover:text-red-500">ยกเลิก</button>
                       </div>
                    )}

                    <form onSubmit={(e) => handleCreateComment(post.id, e)} className="flex items-center gap-2">
                       <CldUploadWidget 
                         signatureEndpoint="/api/sign-image"
                         onSuccess={(result: any) => {
                           if (result.event !== "success") return;
                           const rType = result.info.resource_type;
                           // If format is mp3, wav, m4a etc. it might be recognized as video natively by Cloudinary, but we check format.
                           const isAudio = rType === "video" && !result.info.format.match(/(mp4|webm|avi|mov)/i) && result.info.is_audio || rType === "raw" && result.info.format.match(/(mp3|wav|m4a|ogg)/i) || result.info.format?.match(/(mp3|wav|m4a|ogg)/i);
                           
                           setNewCommentMedia(prev => ({
                             ...prev,
                             [post.id]: {
                               url: result.info.secure_url,
                               type: isAudio ? "AUDIO" : rType === "video" ? "VIDEO" : "IMAGE"
                             }
                           }));
                         }}
                         options={{ sources: ['local', 'camera', 'url'], resourceType: 'auto' }}
                       >
                         {({ open }) => (
                           <button 
                             type="button" 
                             onClick={() => open()} 
                             className="text-gray-400 hover:text-indigo-600 w-10 h-10 flex items-center justify-center rounded-full hover:bg-indigo-50 transition flex-shrink-0"
                             title="แนบรูปภาพ วิดีโอ หรือไฟล์เสียง"
                           >
                             <span className="text-xl">📎</span>
                           </button>
                         )}
                       </CldUploadWidget>

                      <input
                        type="text"
                        placeholder={replyingTo[post.id] ? "เขียนการตอบกลับ..." : "เขียนความคิดเห็น..."}
                        value={newComments[post.id] || ""}
                        onChange={(e) => setNewComments({ ...newComments, [post.id]: e.target.value })}
                        className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 rounded-2xl px-4 py-2 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <button 
                        type="submit" 
                        disabled={!newComments[post.id]?.trim() && !newCommentMedia[post.id]}
                        className="bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-bold hover:bg-indigo-700 disabled:opacity-50 transition"
                      >
                        ส่ง
                      </button>
                    </form>
                  </div>
                ) : (
                  <div className="text-center text-xs text-red-500 py-2">คุณถูกระงับสิทธิ์การคอมเมนต์</div>
                )}
              </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
