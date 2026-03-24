"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { CldUploadWidget } from "next-cloudinary";

export default function ComplaintsPage() {
  const { data: session, status } = useSession();
  const [complaints, setComplaints] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (status === "authenticated") fetchComplaints();
  }, [status]);

  const fetchComplaints = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/complaints");
      if (res.ok) {
        const data = await res.json();
        setComplaints(data);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) return;
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/complaints", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content, photoUrl }),
      });

      if (res.ok) {
        setIsModalOpen(false);
        setTitle("");
        setContent("");
        setPhotoUrl("");
        fetchComplaints();
      }
    } catch (error) {
      console.error(error);
    }
    setIsSubmitting(false);
  };

  if (status === "loading") return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-800">แจ้งปัญหา / ร้องเรียน 📢</h1>
          <p className="text-gray-500 mt-2">มีปัญหาในการใช้ห้องซ้อม? แจ้งเราได้ที่นี่</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-xl font-bold shadow-lg shadow-indigo-200 transition-all transform hover:-translate-y-0.5"
        >
          + แจ้งเรื่องใหม่
        </button>
      </div>

      {loading ? (
        <p className="text-center text-gray-500 animate-pulse my-12">กำลังโหลดข้อมูล...</p>
      ) : complaints.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-gray-100 flex flex-col items-center">
          <span className="text-6xl mb-4">🙌</span>
          <h3 className="text-xl font-bold text-gray-800 mb-2">ยังไม่มีเรื่องร้องเรียน</h3>
          <p className="text-gray-500">ดูเหมือนทุกอย่างจะราบรื่นดี!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {complaints.map(c => (
            <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-lg font-bold text-gray-800">{c.title}</h3>
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    c.status === "PENDING" ? "bg-amber-100 text-amber-700" :
                    c.status === "IN_PROGRESS" ? "bg-blue-100 text-blue-700" :
                    "bg-green-100 text-green-700"
                  }`}>
                    {c.status === "PENDING" ? "รอดำเนินการ" : c.status === "IN_PROGRESS" ? "กำลังดำเนินแก้ไข" : "เสร็จสิ้น"}
                  </span>
                </div>
                <p className="text-gray-600 text-sm whitespace-pre-wrap">{c.content}</p>
                <p className="text-xs text-gray-400 mt-4">แจ้งเมื่อ: {new Date(c.createdAt).toLocaleString('th-TH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                
                {c.adminNote && (
                  <div className="mt-4 bg-gray-50 border-l-4 border-indigo-400 p-3 rounded-r-lg">
                    <p className="text-xs font-bold text-indigo-800 mb-1">ตอบกลับจากผู้ดูแล:</p>
                    <p className="text-sm text-gray-700">{c.adminNote}</p>
                  </div>
                )}
              </div>
              {c.photoUrl && (
                <div className="w-full md:w-32 h-32 flex-shrink-0">
                  <img src={c.photoUrl} alt="Complaint" className="w-full h-full object-cover rounded-xl border border-gray-200" />
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">สร้างเรื่องร้องเรียนใหม่</h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">หัวข้อ</label>
                <input 
                  type="text" required value={title} onChange={e => setTitle(e.target.value)}
                  placeholder="เช่น แอร์ไม่เย็น, ไมค์เสีย"
                  className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รายละเอียด</label>
                <textarea 
                  required value={content} onChange={e => setContent(e.target.value)}
                  rows={4}
                  placeholder="อธิบายปัญหาที่คุณพบ..."
                  className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพประกอบ (ไม่บังคับ)</label>
                {photoUrl ? (
                  <div className="relative w-full h-40 bg-gray-100 rounded-xl overflow-hidden border border-gray-300">
                    <img src={photoUrl} alt="Uploaded" className="w-full h-full object-contain" />
                    <button type="button" onClick={() => setPhotoUrl("")} className="absolute top-2 right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow">✕</button>
                  </div>
                ) : (
                  <CldUploadWidget 
                    signatureEndpoint="/api/sign-image"
                    onSuccess={(res: any) => setPhotoUrl(res.info.secure_url)}
                  >
                    {({ open }) => (
                      <button 
                        type="button" 
                        onClick={() => open()} 
                        className="w-full border-2 border-dashed border-gray-300 rounded-xl p-4 text-gray-500 hover:text-indigo-600 hover:border-indigo-400 hover:bg-indigo-50 transition-colors flex flex-col items-center justify-center gap-2"
                      >
                        <span className="text-2xl">📸</span>
                        <span>คลิกเพื่ออัปโหลดรุปภาพ</span>
                      </button>
                    )}
                  </CldUploadWidget>
                )}
              </div>

              <button 
                type="submit" disabled={isSubmitting}
                className="w-full mt-6 py-4 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 transition disabled:opacity-50 shadow-lg shadow-indigo-100"
              >
                {isSubmitting ? "กำลังส่งข้อมูล..." : "ส่งเรื่องร้องเรียน"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
