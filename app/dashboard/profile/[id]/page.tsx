"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PublicProfilePage() {
  const { data: session } = useSession();
  const params = useParams();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUserData();
  }, [params.id]);

  const fetchUserData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/users/${params.id}`);
      if (res.ok) {
        setProfile(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading Profile...</div>;
  }

  if (!profile) {
    return (
      <div className="max-w-3xl mx-auto p-4 md:p-8 text-center mt-20">
        <h1 className="text-4xl block mb-4">🔍</h1>
        <h2 className="text-xl font-bold text-gray-800">ไม่พบผู้ใช้งานนี้</h2>
        <Link href="/dashboard/community" className="text-indigo-600 mt-4 inline-block hover:underline">กลับไปหน้าชุมชน</Link>
      </div>
    );
  }

  const isMe = (session?.user as any)?.id === profile.id;

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-8">
      
      {/* PROFILE HEADER */}
      <div className="bg-white p-6 md:p-8 rounded-3xl shadow-sm border border-gray-100 mb-8 flex flex-col md:flex-row items-center gap-6 relative">
        {isMe && (
           <Link href="/dashboard/profile" className="absolute top-4 right-4 bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1 rounded-lg text-xs font-bold transition">
             แก้ไขโปรไฟล์
           </Link>
        )}
        <div className="w-24 h-24 md:w-32 md:h-32 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-4xl overflow-hidden border-4 border-white shadow-md flex-shrink-0">
          {profile.image ? (
            <img src={profile.image} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            (profile.name?.[0] || profile.email?.[0]?.toUpperCase())
          )}
        </div>
        <div className="text-center md:text-left flex-1 w-full">
          <h1 className="text-3xl font-bold text-gray-800 mb-1">{profile.name || "ไม่ระบุชื่อ"}</h1>
          <p className="text-gray-500 mb-2">{profile.email}</p>
          <span className="inline-block px-3 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold mb-4">
            {profile.role === "ADMIN" ? "ผู้ดูแลระบบ" : "นักศึกษา/บุคลากร"}
          </span>

          {profile.instruments?.length > 0 && (
            <div className="mt-2 w-full">
              <p className="text-sm font-bold text-gray-700 mb-2">เครื่องดนตรีที่เล่น</p>
              <div className="flex flex-wrap gap-2 justify-center md:justify-start">
                {profile.instruments.map((inst: string) => (
                  <span
                    key={inst}
                    className="px-3 py-1 rounded-full text-xs font-medium bg-indigo-50 border border-indigo-100 text-indigo-700"
                  >
                    {inst}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mb-6 border-b border-gray-200 pb-2">
        <h2 className="text-xl font-bold text-gray-800 inline-block border-b-2 border-indigo-600 pb-2 mb-[-10px]">
          โพสต์ของ {profile.name?.split(" ")[0]} ({profile.posts?.length || 0})
        </h2>
      </div>

      {/* POSTS CONTENT */}
      <div className="space-y-6">
        {profile.posts?.map((post: any) => (
          <div key={post.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex gap-3 mb-4 items-center">
              <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg overflow-hidden border border-indigo-200 shrink-0">
                  {profile.image ? (
                    <img src={profile.image} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    profile.name?.[0] || profile.email?.[0]?.toUpperCase()
                  )}
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-800">{profile.name}</h3>
                <p className="text-xs text-gray-400">{new Date(post.createdAt).toLocaleString('th-TH')}</p>
              </div>
            </div>

            <p className="text-gray-800 whitespace-pre-wrap mb-4">{post.content}</p>

            {post.isPoll && post.pollOptions?.length > 0 && (
              <div className="mt-4 mb-6 space-y-2">
                <h4 className="font-bold text-gray-800 text-sm mb-3">📊 โพลล์ความคิดเห็น</h4>
                <div className="space-y-2">
                  {post.pollOptions.map((opt: any) => {
                    const totalVotes = post.pollVotes?.length || 0;
                    const thisVotes = opt._count?.votes || 0;
                    const percent = totalVotes > 0 ? Math.round((thisVotes / totalVotes) * 100) : 0;
                    
                    return (
                      <div key={opt.id} className="relative bg-gray-50 border border-gray-200 rounded-lg overflow-hidden flex items-center min-h-[40px]">
                        <div className="absolute top-0 left-0 bottom-0 bg-indigo-100/50" style={{ width: `${percent}%` }}></div>
                        <div className="relative z-10 flex justify-between w-full px-4 text-sm py-2">
                          <span className="font-medium text-gray-800">{opt.text}</span>
                          <span className="text-gray-600 font-bold">{percent}%</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {post.mediaUrl && (
              <div className="mb-2 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex justify-center">
                {post.mediaType === "VIDEO" ? (
                  <video src={post.mediaUrl} controls className="w-full max-h-[400px] object-contain bg-black" />
                ) : (
                  <img src={post.mediaUrl} alt="Post media" className="max-h-[400px] object-contain" />
                )}
              </div>
            )}
            
            <Link href={`/dashboard/community`} className="text-indigo-600 text-xs hover:underline mt-4 inline-block font-bold mt-2">
              ดูและคอมเมนต์บนหน้าชุมชน →
            </Link>
          </div>
        ))}
        {profile.posts?.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-2xl border border-gray-100">
            <span className="text-4xl block mb-4">💬</span>
            <p className="text-gray-500">ผู้ใช้นี้ยังไม่เคยตั้งโพสต์เลย</p>
          </div>
        )}
      </div>
    </div>
  );
}
