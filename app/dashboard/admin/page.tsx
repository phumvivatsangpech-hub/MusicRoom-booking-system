"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AdminDashboardPage() {
  const { data: session, status } = useSession();
  const [activeTab, setActiveTab] = useState("bookings"); // bookings, complaints, posts, stats
  const [showGraphs, setShowGraphs] = useState(false);
  
  const [bookings, setBookings] = useState<any[]>([]);
  const [complaints, setComplaints] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);

  // State for toggling report details
  const [viewingReportPostId, setViewingReportPostId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "authenticated" && (session?.user as any)?.role === "ADMIN") {
      fetchBookings();
      fetchComplaints();
      fetchPosts();
    }
  }, [status, session]);

  const fetchBookings = async () => {
    // Modify URL if we had an admin param, but currently GET /api/bookings returns all active bookings anyway
    const res = await fetch("/api/bookings?all=true");
    if (res.ok) setBookings(await res.json());
  };

  const fetchComplaints = async () => {
    const res = await fetch("/api/complaints?admin=true");
    if (res.ok) setComplaints(await res.json());
  };

  const fetchPosts = async () => {
    const res = await fetch("/api/posts");
    if (res.ok) setPosts(await res.json());
  };

  const cancelBooking = async (id: string) => {
    if (!confirm("ต้องการยกเลิกการจองนี้ใช่หรือไม่?")) return;
    await fetch(`/api/bookings/${id}`, {
      method: "PATCH", body: JSON.stringify({ status: "CANCELLED" }), headers: { "Content-Type": "application/json" }
    });
    fetchBookings();
  };

  const updateComplaint = async (id: string, newStatus: string, adminNote: string) => {
    await fetch(`/api/complaints/${id}`, {
      method: "PATCH", body: JSON.stringify({ status: newStatus, adminNote }), headers: { "Content-Type": "application/json" }
    });
    fetchComplaints();
  };

  const deletePost = async (id: string) => {
    if (!confirm("ต้องการลบโพสต์นี้ใช่หรือไม่?")) return;
    await fetch(`/api/posts/${id}`, { method: "DELETE" });
    fetchPosts();
  };

  const approvePoll = async (id: string) => {
    if (!confirm("ต้องการอนุมัติโพลล์นี้ให้แสดงในชุมชนใช่หรือไม่?")) return;
    try {
      const res = await fetch(`/api/posts/${id}/approve`, { method: "PATCH" });
      if (res.ok) fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const togglePinStatus = async (id: string, currentStatus: boolean) => {
    try {
      const res = await fetch(`/api/posts/${id}/pin`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPinned: !currentStatus })
      });
      if (res.ok) fetchPosts();
    } catch (e) {
      console.error(e);
    }
  };

  const handleBanUser = async (userId: string) => {
    if (!userId) {
      alert("ไม่พบ ID ผู้ใช้งาน");
      return;
    }
    const daysRaw = prompt("แบนผู้ใช้นี้กี่วัน? (พิมพ์ 999 ใหัแบนถาวร)");
    if (!daysRaw) return;
    const days = parseInt(daysRaw, 10);
    if (isNaN(days) || days <= 0) return;
    
    const reason = prompt("เหตุผลในการแบน (ข้อความนี้จะแสดงให้ผู้ใช้เห็น):");
    
    const banUntil = new Date();
    if (days >= 999) {
      banUntil.setFullYear(2099);
    } else {
      banUntil.setDate(banUntil.getDate() + days);
    }

    try {
      const res = await fetch(`/api/users/${userId}/ban`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ banUntil: banUntil.toISOString(), banReason: reason || "ละเมิดกฎของชุมชน" })
      });
      if (res.ok) {
        alert("แบนผู้ใช้สำเร็จ");
        fetchPosts();
      } else {
        alert("เกิดข้อผิดพลาดในการแบน");
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (status === "loading") return <p className="text-center mt-20">Loading...</p>;
  if ((session?.user as any)?.role !== "ADMIN") return <p className="text-center mt-20 text-red-500 font-bold">Access Denied: Admins Only</p>;

  // CSV Export Utility
  const exportCSV = (data: any[], type: string) => {
    if (data.length === 0) return;
    
    let csvData: any[] = [];
    let headers: string[] = [];

    if (type === 'bookings') {
      headers = ['ID', 'รหัสนิสิต', 'Email', 'คณะ', 'ชื่อผู้ใช้งาน', 'วันที่เจาะจง', 'เวลาเริ่ม', 'เวลาจบ', 'สถานะ', 'รูปภาพก่อนใช้', 'รูปภาพหลังใช้', 'วันที่สร้าง'];
      csvData = data.map(b => ({
        ID: b.id,
        'รหัสนิสิต': b.user?.studentId || '-',
        Email: b.user?.email || '-',
        'คณะ': b.user?.faculty || '-',
        'ชื่อผู้ใช้งาน': b.user?.name || '-',
        'วันที่เจาะจง': new Date(b.date).toLocaleDateString('th-TH'),
        'เวลาเริ่ม': b.startTime,
        'เวลาจบ': b.endTime,
        'สถานะ': b.status,
        'รูปภาพก่อนใช้': b.photoBeforeUrl || '-',
        'รูปภาพหลังใช้': b.photoAfterUrl || '-',
        'วันที่สร้าง': new Date(b.createdAt).toLocaleDateString('th-TH'),
      }));
    } else if (type === 'complaints') {
      headers = ['ID', 'หัวข้อ', 'เนื้อหา', 'Email', 'ลิงก์รูปภาพ', 'สถานะ', 'วันที่สร้าง', 'หมายเหตุจากแอดมิน'];
      csvData = data.map(c => ({
        ID: c.id,
        'หัวข้อ': c.title,
        'เนื้อหา': c.content,
        Email: c.user?.email || '-',
        'ลิงก์รูปภาพ': c.photoUrl || '-',
        'สถานะ': c.status,
        'วันที่สร้าง': new Date(c.createdAt).toLocaleDateString('th-TH'),
        'หมายเหตุจากแอดมิน': c.adminNote || '-',
      }));
    } else if (type === 'posts') {
      headers = ['ID', 'เนื้อหา', 'Email', 'ประเภทสื่อ', 'ลิงก์สื่อ', 'วันที่สร้าง'];
      csvData = data.map(p => ({
        ID: p.id,
        'เนื้อหา': p.content,
        Email: p.user?.email || '-',
        'ประเภทสื่อ': p.mediaType || '-',
        'ลิงก์สื่อ': p.mediaUrl || '-',
        'วันที่สร้าง': new Date(p.createdAt).toLocaleDateString('th-TH'),
      }));
    }

    const csvRows = [
      headers.join(','),
      ...csvData.map(row => headers.map(header => {
        const val = row[header];
        const escaped = ('' + (val || '')).replace(/"/g, '""');
        return `"${escaped}"`;
      }).join(','))
    ];

    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${type}_export.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Prepare graph data
  const bookingsByDate = bookings.reduce((acc, curr) => {
    const dateStr = new Date(curr.date).toLocaleDateString('th-TH');
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});
  const bookingGraphData = Object.entries(bookingsByDate).map(([date, count]) => ({ date, จำนวนจอง: count }));

  const complaintStats = complaints.reduce((acc, curr) => {
    acc[curr.status] = (acc[curr.status] || 0) + 1;
    return acc;
  }, {});
  const complaintGraphData = [
    { name: "รอดำเนินการ", value: complaintStats["PENDING"] || 0 },
    { name: "กำลังดำเนินแก้ไข", value: complaintStats["IN_PROGRESS"] || 0 },
    { name: "เสร็จสิ้น", value: complaintStats["RESOLVED"] || 0 }
  ];
  const COLORS = ['#f59e0b', '#3b82f6', '#10b981'];

  const postsByDate = posts.reduce((acc, curr) => {
    const dateStr = new Date(curr.createdAt).toLocaleDateString('th-TH');
    acc[dateStr] = (acc[dateStr] || 0) + 1;
    return acc;
  }, {});
  const postGraphData = Object.entries(postsByDate).map(([date, count]) => ({ date, จำนวนโพสต์: count }));

  return (
    <div className="max-w-6xl mx-auto p-4 md:p-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">⚙️ แดชบอร์ดผู้ดูแลระบบ</h1>
        {activeTab === "bookings" && <button onClick={() => exportCSV(bookings, 'bookings')} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold text-sm">ส่งออกการจอง (CSV)</button>}
        {activeTab === "complaints" && <button onClick={() => exportCSV(complaints, 'complaints')} className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2 rounded-lg font-bold text-sm">ส่งออกเรื่องร้องเรียน (CSV)</button>}
        {activeTab === "posts" && <button onClick={() => exportCSV(posts, 'posts')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm">ส่งออกโพสต์ (CSV)</button>}
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200 mb-8 overflow-x-auto pb-2">
        {[
          { id: "bookings", name: "จัดการการจอง" },
          { id: "complaints", name: "เรื่องร้องเรียน" },
          { id: "posts", name: "จัดการโพสต์ชุมชน" },
          { id: "stats", name: "สถิติการใช้งาน" },
        ].map(tab => (
          <button 
            key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-bold whitespace-nowrap transition-colors rounded-t-lg ${activeTab === tab.id ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50' : 'text-gray-500 hover:text-gray-800'}`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* CONTENT: BOOKINGS */}
      {activeTab === "bookings" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-left border-collapse">
            <thead className="bg-gray-50 text-gray-500 text-sm border-b">
              <tr>
                <th className="p-4">วันที่ / เวลา</th>
                <th className="p-4">ผู้จอง</th>
                <th className="p-4">สถานะ</th>
                <th className="p-4 text-center">รูปภาพ (ก่อน - หลัง)</th>
                <th className="p-4 text-right">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y text-sm text-gray-800">
              {bookings.map(b => (
                <tr key={b.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div className="font-bold">{new Date(b.date).toLocaleDateString('th-TH')}</div>
                    <div className="text-xs text-gray-500">{b.startTime} - {b.endTime}</div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0 border border-indigo-200 overflow-hidden">
                        {b.user?.image ? (
                          <img src={b.user.image} alt="Avatar" className="w-full h-full object-cover" />
                        ) : (
                          b.user?.name?.[0] || b.user?.email?.[0]?.toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{b.user?.email}</p>
                        <p className="text-gray-500 text-sm">{b.user?.name}</p>
                        <p className="text-indigo-600 text-xs mt-1">
                          รหัสนิสิต: {b.user?.studentId || '-'} คณะ: {b.user?.faculty || '-'}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 font-medium">
                    <span className={`px-2 py-1 rounded-full text-xs ${b.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : b.status === 'IN_USE' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {b.status}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex justify-center gap-2">
                      {b.photoBeforeUrl ? (
                         <a href={b.photoBeforeUrl} target="_blank" rel="noreferrer" className="block w-12 h-12 bg-gray-100 rounded border hover:opacity-80 transition" title="รูปก่อนใช้">
                           <img src={b.photoBeforeUrl} alt="Before" className="w-full h-full object-cover rounded" />
                         </a>
                      ) : <div className="w-12 h-12 bg-gray-50 rounded border border-dashed flex items-center justify-center text-[10px] text-gray-400" title="ยังไม่มีรูปก่อนใช้">ก่อน</div>}
                      
                      {b.photoAfterUrl ? (
                         <a href={b.photoAfterUrl} target="_blank" rel="noreferrer" className="block w-12 h-12 bg-gray-100 rounded border hover:opacity-80 transition" title="รูปหลังใช้">
                           <img src={b.photoAfterUrl} alt="After" className="w-full h-full object-cover rounded" />
                         </a>
                      ) : <div className="w-12 h-12 bg-gray-50 rounded border border-dashed flex items-center justify-center text-[10px] text-gray-400" title="ยังไม่มีรูปหลังใช้">หลัง</div>}
                    </div>
                  </td>
                  <td className="p-4 text-right">
                    {b.status !== "CANCELLED" && (
                      <button onClick={() => cancelBooking(b.id)} className="text-red-500 hover:text-white hover:bg-red-500 px-3 py-1 rounded border border-red-500 transition text-xs font-bold shadow-sm">ยกเลิก</button>
                    )}
                  </td>
                </tr>
              ))}
              {bookings.length === 0 && <tr><td colSpan={5} className="p-8 text-center text-gray-500">ไม่พบข้อมูลการจอง</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* CONTENT: COMPLAINTS */}
      {activeTab === "complaints" && (
        <div className="space-y-4">
          {complaints.map(c => (
             <div key={c.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
               <div className="flex-1">
                 <h2 className="text-lg font-bold text-gray-800">{c.title}</h2>
                 <p className="text-sm text-gray-600 mb-2">โดย: {c.user?.email}</p>
                 <p className="bg-gray-50 p-3 rounded-xl border border-gray-100 text-gray-700 whitespace-pre-wrap">{c.content}</p>
                 
                 <div className="mt-4 flex flex-col md:flex-row gap-4">
                   <select 
                     value={c.status}
                     onChange={(e) => updateComplaint(c.id, e.target.value, c.adminNote || "")}
                     className="border rounded p-2 text-sm bg-white text-gray-900"
                   >
                     <option value="PENDING">รอดำเนินการ</option>
                     <option value="IN_PROGRESS">กำลังดำเนินแก้ไข</option>
                     <option value="RESOLVED">เสร็จสิ้น</option>
                   </select>

                   <input 
                    type="text" 
                    placeholder="บันทึกการตอบกลับจาก Admin..." 
                    defaultValue={c.adminNote || ""}
                    onBlur={(e) => {
                      if (e.target.value !== c.adminNote) {
                        updateComplaint(c.id, c.status, e.target.value);
                      }
                    }}
                    className="flex-1 border rounded p-2 text-sm text-gray-900"
                   />
                 </div>
               </div>
               {c.photoUrl && (
                  <div className="w-32 h-32 flex-shrink-0">
                    <img src={c.photoUrl} alt="Complaint" className="w-full h-full object-cover rounded-xl border" />
                  </div>
                )}
             </div>
          ))}
          {complaints.length === 0 && <p className="text-center text-gray-500 py-12">ไม่พบเรื่องร้องเรียน</p>}
        </div>
      )}

      {/* CONTENT: POSTS */}
      {activeTab === "posts" && (
        <div className="space-y-6">
          {posts.map(p => (
            <div key={p.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex bg-gray-50 px-3 py-1 rounded-full text-xs font-medium text-gray-500 w-fit">
                      {p.user?.email} • {new Date(p.createdAt).toLocaleString('th-TH')}
                    </div>
                    {p.reports && p.reports.length > 0 && (
                      <div className="relative">
                        <button 
                          onClick={() => setViewingReportPostId(viewingReportPostId === p.id ? null : p.id)}
                          className={`text-xs font-bold px-3 py-1.5 rounded-full flex items-center gap-1 cursor-pointer transition border ${
                            viewingReportPostId === p.id ? 'bg-red-200 text-red-800 border-red-300' : 'bg-red-50 text-red-700 border-red-100 hover:bg-red-100 hover:border-red-200'
                          }`}
                        >
                          🚩 ถูกรายงาน {p.reports.length} ครั้ง
                        </button>
                        
                        {viewingReportPostId === p.id && (
                          <div className="absolute top-full mt-2 left-0 w-72 bg-white border border-red-200 rounded-2xl shadow-xl z-50 p-4 flex flex-col gap-2">
                            <div className="flex justify-between items-center mb-1 border-b border-gray-100 pb-2">
                              <span className="font-bold text-gray-800 text-sm flex items-center gap-2"><span className="text-red-500">🚩</span> รายละเอียดการรายงาน</span>
                              <button onClick={() => setViewingReportPostId(null)} className="text-gray-400 hover:text-gray-800 transition w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 text-xs">✕</button>
                            </div>
                            <ul className="max-h-48 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                              {p.reports.map((r: any, idx: number) => (
                                <li key={r.id || idx} className="text-sm bg-red-50/50 p-3 rounded-xl text-gray-800 border border-red-100/50 shadow-sm leading-relaxed">
                                  {r.reason}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-gray-800 text-lg mb-4 whitespace-pre-wrap">{p.content}</p>
                  
                  {p.mediaUrl && p.mediaType === "IMAGE" && (
                    <img src={p.mediaUrl} alt="Post media" className="max-w-sm rounded-xl border border-gray-200 mb-4" />
                  )}
                  {p.mediaUrl && p.mediaType === "VIDEO" && (
                    <video src={p.mediaUrl} controls className="max-w-sm rounded-xl border border-gray-200 mb-4" />
                  )}
                </div>
                
                <div className="flex flex-col gap-2 ml-4 flex-shrink-0">
                  {p.isPoll && !p.isApproved && (
                    <button 
                      onClick={() => approvePoll(p.id)}
                      className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 px-4 py-2 rounded-lg font-bold transition border border-emerald-200 text-sm mb-2 shadow-sm"
                    >
                      ✅ อนุมัติโพลล์
                    </button>
                  )}
                  <button 
                    onClick={() => togglePinStatus(p.id, p.isPinned)}
                    className="bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-4 py-2 rounded-lg font-bold transition border border-indigo-200 text-sm"
                  >
                    {p.isPinned ? "เลิกปักหมุด" : "📌 ปักหมุดโพสต์"}
                  </button>
                  <button 
                    onClick={() => deletePost(p.id)}
                    className="bg-red-50 text-red-600 hover:bg-red-500 hover:text-white px-4 py-2 rounded-lg font-bold transition border border-red-200 text-sm"
                  >
                    ลบโพสต์นี้
                  </button>
                  <button 
                    onClick={() => handleBanUser(p.user?.id)}
                    className="bg-gray-800 text-white hover:bg-black px-4 py-2 rounded-lg font-bold transition text-sm"
                  >
                    แบนผู้ใช้
                  </button>
                </div>
              </div>

              {/* COMMENTS SECTION (Read-only for Admin to review) */}
              {p.comments && p.comments.length > 0 && (
                <div className="mt-6 pl-4 border-l-2 border-indigo-100 space-y-3">
                  <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">ความคิดเห็น ({p.comments.length})</h4>
                  {p.comments.map((comment: any) => (
                    <div key={comment.id} className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex justify-between items-start">
                      <div>
                        <span className="text-xs font-bold text-gray-600 mr-2">{comment.user?.name || comment.user?.email}</span>
                        <span className="text-xs text-gray-400">{new Date(comment.createdAt).toLocaleString('th-TH')}</span>
                        <p className="text-gray-800 mt-1 text-sm">{comment.content}</p>
                      </div>
                      <button 
                        onClick={async () => {
                          if (!confirm("ต้องการลบคอมเมนต์นี้ใช่หรือไม่?")) return;
                          await fetch(`/api/posts/${p.id}/comments/${comment.id}`, { method: "DELETE" });
                          fetchPosts();
                        }}
                        className="text-xs text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 px-2 py-1 rounded transition"
                      >
                        ลบ
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {posts.length === 0 && <p className="text-center text-gray-500 py-12">ไม่มีโพสต์ชุมชน</p>}
        </div>
      )}

      {/* CONTENT: STATS */}
      {activeTab === "stats" && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <h3 className="text-indigo-100 font-bold">การจองทั้งหมด</h3>
              <p className="text-5xl font-black mt-2 relative z-10">{bookings.length}</p>
            </div>
            <div className="bg-gradient-to-br from-pink-500 to-orange-400 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <h3 className="text-pink-100 font-bold">เรื่องร้องเรียนทั้งหมด</h3>
              <p className="text-5xl font-black mt-2 relative z-10">{complaints.length}</p>
            </div>
            <div className="bg-gradient-to-br from-blue-500 to-teal-400 text-white p-6 rounded-3xl shadow-lg relative overflow-hidden">
              <h3 className="text-blue-100 font-bold">โพสต์ในชุมชน</h3>
              <p className="text-5xl font-black mt-2 relative z-10">{posts.length}</p>
            </div>
          </div>

          <div className="flex justify-center mt-8">
            <button 
              onClick={() => setShowGraphs(!showGraphs)}
              className="bg-gray-100 hover:bg-gray-200 text-gray-800 px-6 py-3 rounded-xl font-bold transition-colors shadow-sm"
            >
              {showGraphs ? "ซ่อนกราฟสถิติ 🔺" : "แสดงกราฟสถิติ 📊"}
            </button>
          </div>

          {showGraphs && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 fade-in">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6">สถิติการจองรายวัน</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bookingGraphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis allowDecimals={false} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="จำนวนจอง" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200">
                <h3 className="text-lg font-bold text-gray-800 mb-6">สถานะเรื่องร้องเรียน</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={complaintGraphData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                        {complaintGraphData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex justify-center gap-4 mt-4 text-xs font-bold text-gray-600">
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-amber-500 mr-1"></div> รอดำเนินการ</div>
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-blue-500 mr-1"></div> กำลังดำเนินแก้ไข</div>
                    <div className="flex items-center"><div className="w-3 h-3 rounded-full bg-emerald-500 mr-1"></div> เสร็จสิ้น</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-200 lg:col-span-2">
                <h3 className="text-lg font-bold text-gray-800 mb-6">สถิติการตั้งโพสต์รายวัน</h3>
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={postGraphData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tick={{fontSize: 12}} />
                      <YAxis allowDecimals={false} />
                      <Tooltip cursor={{fill: '#f3f4f6'}} />
                      <Bar dataKey="จำนวนโพสต์" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

    </div>
  );
}
