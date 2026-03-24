"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import Link from "next/link";

export default function ProfileDashboardPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("bookings"); // bookings, posts

  const [bookings, setBookings] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit State for Posts
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editPostContent, setEditPostContent] = useState("");

  useEffect(() => {
    if (status === "authenticated") {
      fetchMyData();
    }
  }, [status]);

  const fetchMyData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, postsRes] = await Promise.all([
        fetch("/api/bookings?all=true"), // Fetch all to include everything, we'll filter client side
        fetch("/api/posts")
      ]);

      if (bookingsRes.ok && postsRes.ok) {
        const allBookings = await bookingsRes.json();
        const allPosts = await postsRes.json();
        
        const myUserId = (session?.user as any)?.id;
        setBookings(allBookings.filter((b: any) => b.userId === myUserId));
        setPosts(allPosts.filter((p: any) => p.userId === myUserId));
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const cancelBooking = async (id: string) => {
    if (!confirm("ต้องการยกเลิกการจองนี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/bookings/${id}`, {
        method: "PATCH", 
        body: JSON.stringify({ status: "CANCELLED" }), 
        headers: { "Content-Type": "application/json" }
      });
      fetchMyData();
    } catch (e) {
      console.error(e);
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
        fetchMyData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!confirm("ต้องการลบโพสต์นี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/posts/${postId}`, { method: "DELETE" });
      fetchMyData();
    } catch (error) {
      console.error(error);
    }
  };

  if (status === "loading" || loading) {
    return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading...</div>;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">👤 โปรไฟล์ของฉัน</h1>
        <p className="text-gray-500 mt-2">จัดการประวัติการจองและโพสต์ส่วนตัวของคุณ</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-8 pb-2">
        <button 
          onClick={() => setActiveTab("bookings")}
          className={`px-4 py-2 font-bold transition-colors rounded-t-lg ${activeTab === "bookings" ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-800'}`}
        >
          ประวัติการจอง ({bookings.length})
        </button>
        <button 
          onClick={() => setActiveTab("posts")}
          className={`px-4 py-2 font-bold transition-colors rounded-t-lg ${activeTab === "posts" ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-800'}`}
        >
          โพสต์ของฉัน ({posts.length})
        </button>
      </div>

      {/* BOOKINGS CONTENT */}
      {activeTab === "bookings" && (
        <div className="space-y-4">
          {bookings.map(b => (
            <div key={b.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-gray-500 text-sm mb-1">วันที่จอง</p>
                <p className="font-bold text-lg text-gray-900">{new Date(b.date).toLocaleDateString('th-TH')}</p>
                <p className="text-indigo-600 font-medium">{b.startTime} - {b.endTime}</p>
              </div>
              <div className="text-center md:text-right">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold mb-2 ${
                  b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 
                  b.status === 'IN_USE' ? 'bg-amber-100 text-amber-700' : 
                  b.status === 'CANCELLED' ? 'bg-gray-100 text-gray-500' : 'bg-blue-100 text-blue-700'
                }`}>
                  {b.status}
                </span>
                <div>
                  {b.status !== "CANCELLED" && b.status !== "COMPLETED" && (
                     <button onClick={() => cancelBooking(b.id)} className="text-red-500 hover:text-white hover:bg-red-500 px-4 py-1.5 rounded-lg border border-red-500 transition text-sm font-bold shadow-sm">
                       ยกเลิกการจอง
                     </button>
                  )}
                </div>
              </div>
            </div>
          ))}
          {bookings.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-5xl block mb-4">🎸</span>
              <p className="text-gray-500 mb-4">คุณยังไม่มีประวัติการจองเลย</p>
              <Link href="/dashboard" className="text-indigo-600 font-bold hover:underline">ไปจองห้องซ้อมกันเถอะ!</Link>
            </div>
          )}
        </div>
      )}

      {/* POSTS CONTENT */}
      {activeTab === "posts" && (
        <div className="space-y-6">
          {posts.map(post => (
            <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center justify-between mb-4">
                <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('th-TH')}</p>
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditingPostId(post.id);
                      setEditPostContent(post.content);
                    }} 
                    className="text-gray-500 hover:bg-gray-100 px-3 py-1 rounded transition text-sm border border-transparent hover:border-gray-200"
                  >
                    แก้ไข
                  </button>
                  <button onClick={() => handleDeletePost(post.id)} className="text-red-500 hover:bg-red-50 px-3 py-1 rounded transition text-sm border border-transparent hover:border-red-200">ลบโพสต์</button>
                </div>
              </div>

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
                    <video src={post.mediaUrl} controls className="w-full max-h-[400px] object-contain bg-black" />
                  ) : (
                    <img src={post.mediaUrl} alt="Post media" className="max-h-[400px] object-contain" />
                  )}
                </div>
              )}
            </div>
          ))}
          {posts.length === 0 && (
            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
              <span className="text-5xl block mb-4">💬</span>
              <p className="text-gray-500 mb-4">คุณยังไม่เคยตั้งโพสต์เลย</p>
              <Link href="/dashboard/community" className="text-indigo-600 font-bold hover:underline">ไปพูดคุยที่ชุมชนกันเถอะ!</Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
