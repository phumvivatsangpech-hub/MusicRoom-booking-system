"use client";

import { useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { CldUploadWidget } from "next-cloudinary";

// Utility to generate days in a month
function getDaysInMonth(year: number, month: number) {
  const date = new Date(year, month, 1);
  const days = [];
  while (date.getMonth() === month) {
    days.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }
  return days;
}

export default function CalendarDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Booking Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFacility, setFormFacility] = useState("");
  const [formStudentId, setFormStudentId] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("12:00");
  const [errorMsg, setErrorMsg] = useState("");

  // Admin Event Modal State
  const [isAdminEventModalOpen, setIsAdminEventModalOpen] = useState(false);
  const [adminEventType, setAdminEventType] = useState<"CLOSURE" | "ANNOUNCEMENT">("CLOSURE");
  const [adminEventTitle, setAdminEventTitle] = useState("");
  const [adminEventIsAllDay, setAdminEventIsAllDay] = useState(false);
  const [adminEventStart, setAdminEventStart] = useState("09:00");
  const [adminEventEnd, setAdminEventEnd] = useState("21:00");
  const [adminEventError, setAdminEventError] = useState("");

  const timeOptions = [
    "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", 
    "19:00", "20:00", "21:00"
  ];

  const isAdmin = (session?.user as any)?.role === "ADMIN";

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchData();
  }, [currentDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [resBookings, resEvents] = await Promise.all([
        fetch("/api/bookings"),
        fetch("/api/calendar-events")
      ]);
      
      if (resBookings.ok) {
        setBookings(await resBookings.json());
      }
      if (resEvents.ok) {
        setCalendarEvents(await resEvents.json());
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };
  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getLocalDateString = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const dayStr = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${dayStr}`;
  };

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedDate) return;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: getLocalDateString(selectedDate),
          startTime: formStart,
          endTime: formEnd,
          faculty: formFacility,
          studentId: formStudentId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErrorMsg(data.error || "เกิดข้อผิดพลาดในการจอง");
      } else {
        setIsModalOpen(false);
        fetchData(); // Refresh
      }
    } catch (e) {
      setErrorMsg("เกิดข้อผิดพลาดในการจอง");
    }
  };

  const handleAdminEventSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminEventError("");
    if (!selectedDate) return;

    try {
      const res = await fetch("/api/calendar-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: adminEventTitle,
          type: adminEventType,
          date: getLocalDateString(selectedDate),
          startTime: adminEventIsAllDay ? null : adminEventStart,
          endTime: adminEventIsAllDay ? null : adminEventEnd,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAdminEventError(data.error || "เกิดข้อผิดพลาดในการเพิ่มประกาศ");
      } else {
        setIsAdminEventModalOpen(false);
        setAdminEventTitle("");
        fetchData(); // Refresh
      }
    } catch (e) {
      setAdminEventError("เกิดข้อผิดพลาดในการเชื่อมต่อ");
    }
  };

  const handleDeleteAdminEvent = async (id: string) => {
    if (!confirm("คุณต้องการลบประกาศนี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/calendar-events/${id}`, { method: "DELETE" });
      fetchData();
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadPhoto = async (bookingId: string, photoType: "photoBeforeUrl" | "photoAfterUrl", result: any) => {
    if (result.event !== "success") return;
    const url = result.info.secure_url;

    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          [photoType]: url,
        }),
      });
      fetchData(); // refresh
    } catch (e) {
      console.error(e);
    }
  };

  const handleCancelBooking = async (bookingId: string) => {
    if (!confirm("คุณต้องการยกเลิกการจองนี้ใช่หรือไม่?")) return;
    try {
      await fetch(`/api/bookings/${bookingId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      fetchData(); // refresh
    } catch (e) {
      console.error(e);
    }
  };

  const daysThisMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfWeek = daysThisMonth[0].getDay();
  const blanks = Array.from({ length: firstDayOfWeek }).map((_, i) => i);

  // Filter items for selected date
  const bookingsForSelected = bookings.filter((b) => {
    if (!selectedDate) return false;
    const bd = new Date(b.date);
    return (
      bd.getFullYear() === selectedDate.getFullYear() &&
      bd.getMonth() === selectedDate.getMonth() &&
      bd.getDate() === selectedDate.getDate()
    );
  });

  const eventsForSelected = calendarEvents.filter((ev) => {
    if (!selectedDate) return false;
    const ed = new Date(ev.date);
    return (
      ed.getFullYear() === selectedDate.getFullYear() &&
      ed.getMonth() === selectedDate.getMonth() &&
      ed.getDate() === selectedDate.getDate()
    );
  });

  const announcements = eventsForSelected.filter(e => e.type === "ANNOUNCEMENT");
  const closures = eventsForSelected.filter(e => e.type === "CLOSURE");

  if (status === "loading" || !session) return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8 min-h-screen">
      
      {/* LEFT: Calendar */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-50/50 h-max md:sticky md:top-8">
        <div className="flex justify-between items-center mb-6">
          <button onClick={handlePrevMonth} className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition">&lt;</button>
          <h2 className="text-xl font-bold text-gray-800">
            {currentDate.toLocaleDateString('th-TH', { month: 'long', year: 'numeric' })}
          </h2>
          <button onClick={handleNextMonth} className="p-2 bg-indigo-50 text-indigo-600 rounded-full hover:bg-indigo-100 transition">&gt;</button>
        </div>

        <div className="grid grid-cols-7 gap-2 text-center text-sm font-medium text-gray-500 mb-2">
          {["อา", "จ", "อ", "พ", "พฤ", "ศ", "ส"].map((d) => (
            <div key={d}>{d}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {blanks.map((b) => (
            <div key={`blank-${b}`} className="aspect-square"></div>
          ))}
          {daysThisMonth.map((day) => {
            const isToday = day.toDateString() === new Date().toDateString();
            const isSelected = selectedDate?.toDateString() === day.toDateString();
            
            // Interaction flags
            const hasBooking = bookings.some(b => {
              const bd = new Date(b.date);
              return bd.getDate() === day.getDate() && bd.getMonth() === day.getMonth() && bd.getFullYear() === day.getFullYear() && b.status !== "CANCELLED";
            });
            const dayEvents = calendarEvents.filter(ev => {
              const ed = new Date(ev.date);
              return ed.getDate() === day.getDate() && ed.getMonth() === day.getMonth() && ed.getFullYear() === day.getFullYear();
            });
            const hasClosure = dayEvents.some(e => e.type === "CLOSURE");
            const hasAnnouncement = dayEvents.some(e => e.type === "ANNOUNCEMENT");

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all duration-200 border-2 border-transparent
                  ${isSelected ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200" : isToday ? "bg-indigo-50 text-indigo-800 font-bold border-indigo-200 relative" : "bg-gray-50 text-gray-700 hover:bg-gray-100"}
                  ${hasClosure ? "opacity-75 relative overflow-hidden" : ""}
                `}
              >
                {/* Closure Slash Styling */}
                {hasClosure && <div className="absolute inset-0 bg-red-50" style={{ background: "repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(239, 68, 68, 0.1) 4px, rgba(239, 68, 68, 0.1) 8px)" }}></div>}
                
                <span className="z-10">{day.getDate()}</span>
                
                <div className="flex gap-1 mt-1 z-10">
                  {hasBooking && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-indigo-200' : 'bg-indigo-400'}`}></div>}
                  {hasAnnouncement && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-yellow-200' : 'bg-yellow-400'}`}></div>}
                  {hasClosure && <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-red-200' : 'bg-red-500'}`}></div>}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Selected Day Details */}
      <div className="w-full md:w-96 flex flex-col gap-6">
        
        {/* Date Header Plate */}
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-6 rounded-2xl shadow-xl text-white">
          <h3 className="text-lg font-medium text-indigo-100">วันที่เลือก</h3>
          <p className="text-3xl font-bold mt-1 mb-6">
            {selectedDate ? selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : "ไม่ได้เลือก"}
          </p>

          <button 
            disabled={!selectedDate || closures.some(c => !c.startTime)} // Disable if fully closed all day
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg shadow-black/20 disabled:opacity-90 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {closures.some(c => !c.startTime) ? "❌ ห้องซ้อมปิดให้บริการ" : <><span className="text-xl">+</span> จองห้องซ้อม</>}
          </button>
        </div>

        {/* Admin Event Builder Panel */}
        {isAdmin && selectedDate && (
          <div className="bg-red-50 p-6 rounded-2xl border border-red-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-400"></div>
            <h4 className="font-bold text-red-800 mb-2 flex items-center gap-2">
              <span>🛡️</span> จัดการระบบ (Admin)
            </h4>
            <p className="text-sm text-red-600/80 mb-4">เพิ่มประกาศ หรือปิดห้องซ้อมในวันนี้</p>
            <button 
              onClick={() => setIsAdminEventModalOpen(true)} 
              className="w-full py-2 bg-red-100 text-red-700 font-bold rounded-xl hover:bg-red-200 transition-colors border border-red-200"
            >
              + จัดการปฏิทินวันนี้
            </button>
          </div>
        )}

        {/* Global Announcements Section */}
        {announcements.length > 0 && (
          <div className="flex flex-col gap-3">
            {announcements.map(ann => (
              <div key={ann.id} className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 shadow-sm relative group">
                <div className="flex items-start gap-3">
                  <div className="text-2xl">📢</div>
                  <div>
                    <h4 className="font-bold text-yellow-900">{ann.title}</h4>
                    {(ann.startTime && ann.endTime) && (
                      <p className="text-xs text-yellow-700 font-medium mt-1">เวลา: {ann.startTime} - {ann.endTime}</p>
                    )}
                    {(!ann.startTime) && <p className="text-xs text-yellow-700 font-medium mt-1">ประกาศตลอดวัน</p>}
                  </div>
                </div>
                {isAdmin && (
                  <button onClick={() => handleDeleteAdminEvent(ann.id)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 bg-white rounded-full p-1 opacity-0 group-hover:opacity-100 shadow transition-all">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Grid Timeline Table Layout */}
        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-100/50 border border-gray-100 flex-1">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2 flex justify-between items-center">
            <span>ตารางการจองวันนี้</span>
          </h3>
          
          {loading ? (
            <p className="text-gray-500 text-center py-8 animate-pulse">กำลังโหลด...</p>
          ) : (bookingsForSelected.length === 0 && closures.length === 0) ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-3">👻</span>
              <p>ยังไม่มีการจองและเหตุการณ์ใดๆ</p>
              <p className="text-sm mt-1">ห้องว่างยาวๆ ไปเลยยจ้าา</p>
            </div>
          ) : (
            // User requested to remove the inner scrollbar and make it full height
            <div className="relative w-full bg-white rounded-xl">
              <div className="relative min-h-[780px]"> {/* 60px per hour, 13 hours */}
                
                {/* Time Grid Lines */}
                {Array.from({ length: 13 }, (_, i) => i + 9).map((hour, i) => (
                  <div key={hour} className="absolute w-full flex items-start" style={{ top: `${i * 60}px`}}>
                    <div className="w-16 text-xs text-gray-400 text-right pr-3 -mt-2 font-medium">{`${String(hour).padStart(2, '0')}:00`}</div>
                    <div className="flex-1 border-t border-gray-100 h-[60px]"></div>
                  </div>
                ))}
                
                <div className="absolute top-0 bottom-0 left-16 right-0">
                  
                  {/* Render Room Closures blocks first (underneath Bookings) */}
                  {closures.map((c) => {
                    let top = 0;
                    let height = 12 * 60; // Default full day height
                    
                    if (c.startTime && c.endTime) {
                      const startH = parseInt(c.startTime.split(':')[0]);
                      const endH = parseInt(c.endTime.split(':')[0]);
                      top = (startH - 9) * 60;
                      height = (endH - startH) * 60;
                    }

                    return (
                      <div 
                        key={c.id}
                        className="absolute left-2 right-2 rounded-xl p-3 text-xs overflow-hidden shadow-sm border-2 border-red-100 group transition-all"
                        style={{ 
                          top: `${top + 1}px`, 
                          height: `${height - 2}px`, 
                          background: "repeating-linear-gradient(45deg, #fef2f2, #fef2f2 10px, #fecaca 10px, #fecaca 20px)",
                          opacity: 0.9,
                          zIndex: 5 // Keep closures lower z-index than precise bookings so we can see clashes
                        }}
                      >
                         <div className="flex justify-between items-start bg-white/90 p-2 rounded-lg backdrop-blur-sm border border-red-100 shadow-sm">
                           <div>
                             <div className="font-bold text-sm text-red-700">❌ ปิดปรับปรุง / ระงับให้บริการ</div>
                             <div className="font-medium mt-1 text-red-900">{c.title}</div>
                             <div className="mt-1 text-red-600 font-medium">
                               {c.startTime ? `${c.startTime} - ${c.endTime}` : "ปิดตลอดทั้งวัน"}
                             </div>
                           </div>
                           {isAdmin && (
                             <button onClick={() => handleDeleteAdminEvent(c.id)} className="px-2 py-1 bg-white text-red-600 border border-red-200 rounded hover:bg-red-50 transition border-b-2 font-bold shadow-sm">
                               ลบการปิดห้อง
                             </button>
                           )}
                         </div>
                      </div>
                    )
                  })}

                  {/* Render User Booking Blocks */}
                  {bookingsForSelected.map((b) => {
                    const startH = parseInt(b.startTime.split(':')[0]);
                    const endH = parseInt(b.endTime.split(':')[0]);
                    const top = (startH - 9) * 60;
                    const height = (endH - startH) * 60;
                    const isMyBooking = b.user?.email === session?.user?.email;
                    
                    return (
                      <div 
                        key={b.id}
                        className="absolute left-4 right-4 rounded-xl p-3 text-xs overflow-hidden shadow-sm group transition-all hover:z-20 hover:shadow-md hover:-translate-y-0.5"
                        style={{ 
                          top: `${top + 2}px`, 
                          height: `${height - 4}px`, 
                          backgroundColor: isMyBooking ? '#EEF2FF' : '#FDF2F8', 
                          borderLeft: `5px solid ${isMyBooking ? '#6366F1' : '#F472B6'}`,
                          zIndex: 10
                        }}
                      >
                         <div className="flex justify-between items-start">
                           <div>
                             <div className={`font-bold text-base ${isMyBooking ? 'text-indigo-900' : 'text-pink-900'}`}>{b.startTime} - {b.endTime}</div>
                             <div className={`font-medium mt-0.5 truncate text-sm ${isMyBooking ? 'text-indigo-700' : 'text-pink-700'}`}>{b.user?.name || b.user?.email}</div>
                           </div>
                           <span className={`px-2 py-1 rounded-md text-xs font-bold ${
                              b.status === "CONFIRMED" ? "bg-white text-green-600 border border-green-200 shadow-sm" : 
                              b.status === "IN_USE" ? "bg-amber-100 text-amber-700" : 
                              b.status === "COMPLETED" ? "bg-gray-200 text-gray-600" : 
                              "bg-red-100 text-red-600"
                           }`}>
                             {b.status}
                           </span>
                         </div>
                         
                         {/* Photo Actions inside the block */}
                         {isMyBooking && b.status !== "CANCELLED" && (
                           <div className="mt-3 flex flex-wrap gap-2 opacity-80 group-hover:opacity-100 transition">
                             {!b.photoBeforeUrl && (
                               <CldUploadWidget 
                                 signatureEndpoint="/api/sign-image"
                                 onSuccess={(res) => handleUploadPhoto(b.id, "photoBeforeUrl", res)}
                               >
                                 {({ open }) => (
                                   <button onClick={(e) => { e.stopPropagation(); open(); }} className="text-xs px-3 py-1.5 bg-white text-indigo-700 border border-indigo-200 rounded-lg hover:bg-indigo-50 transition shadow-sm font-medium">
                                     📸 ถ่ายก่อนใช้
                                   </button>
                                 )}
                               </CldUploadWidget>
                             )}
                             {b.photoBeforeUrl && !b.photoAfterUrl && (
                               <CldUploadWidget 
                                 signatureEndpoint="/api/sign-image"
                                 onSuccess={(res) => handleUploadPhoto(b.id, "photoAfterUrl", res)}
                               >
                                 {({ open }) => (
                                   <button onClick={(e) => { e.stopPropagation(); open(); }} className="text-xs px-3 py-1.5 bg-white text-pink-700 border border-pink-200 rounded-lg hover:bg-pink-50 transition shadow-sm font-medium">
                                     📸 ถ่ายหลังใช้
                                   </button>
                                 )}
                               </CldUploadWidget>
                             )}
                             {b.status === "CONFIRMED" && !b.photoBeforeUrl && (
                               <button 
                                 onClick={(e) => { e.stopPropagation(); handleCancelBooking(b.id); }} 
                                 className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition shadow-sm font-medium"
                               >
                                 ❌ ยกเลิกการจอง
                               </button>
                             )}
                           </div>
                         )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ADMIN EVENT MODAL */}
      {isAdminEventModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-red-800">จัดการปฏิทินวันนี้</h2>
              <button onClick={() => setIsAdminEventModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 rounded-full w-8 h-8 flex items-center justify-center">✕</button>
            </div>
            
            <p className="border-b pb-4 mb-4 text-gray-600 text-sm">
              วันที่ <b>{selectedDate?.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</b>
            </p>

            {adminEventError && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm">
                ❌ {adminEventError}
              </div>
            )}

            <form onSubmit={handleAdminEventSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ประเภทการทำรายการ</label>
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={() => setAdminEventType("CLOSURE")} className={`py-2 rounded-lg font-bold border ${adminEventType === "CLOSURE" ? "bg-red-100 text-red-700 border-red-500 shadow-inner" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
                    ❌ ปิดห้องซ้อม
                  </button>
                  <button type="button" onClick={() => setAdminEventType("ANNOUNCEMENT")} className={`py-2 rounded-lg font-bold border ${adminEventType === "ANNOUNCEMENT" ? "bg-yellow-100 text-yellow-800 border-yellow-500 shadow-inner" : "bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100"}`}>
                    📢 ลงประกาศ
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ข้อความ / หัวข้อรายละเอียด</label>
                <input 
                  type="text" required
                  placeholder={adminEventType === "CLOSURE" ? "เช่น อุปกรณ์ชำรุด, ทำความสะอาด" : "แจ้งเตือนข่าวสาร"}
                  value={adminEventTitle} onChange={e => setAdminEventTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2 mt-4 bg-gray-50 p-3 rounded-xl border border-gray-200">
                <input 
                  type="checkbox" 
                  id="allDayCheckbox"
                  checked={adminEventIsAllDay} 
                  onChange={e => setAdminEventIsAllDay(e.target.checked)}
                  className="w-5 h-5 rounded"
                />
                <label htmlFor="allDayCheckbox" className="font-bold text-gray-700">มีผลตลอดทั้งวัน (ไม่ระบุเวลา)</label>
              </div>

              {!adminEventIsAllDay && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                    <select value={adminEventStart} onChange={e => setAdminEventStart(e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 border-gray-300 text-gray-900">
                      {timeOptions.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                    <select value={adminEventEnd} onChange={e => setAdminEventEnd(e.target.value)} className="w-full border rounded-xl p-3 bg-gray-50 border-gray-300 text-gray-900">
                      {timeOptions.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <button type="submit" className="w-full mt-6 py-4 bg-gray-900 text-white font-bold rounded-xl shadow-lg hover:bg-black transition-all transform hover:-translate-y-0.5">
                ยืนยันบันทึกข้อมูลตาราง
              </button>
            </form>
          </div>
        </div>
      )}

      {/* BOOKING MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
          {/* ... existing booking modal inside is exactly the same structure ... */}
          <div className="bg-white rounded-3xl p-8 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-800">จองห้องซ้อมดนตรี</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-full w-8 h-8 flex items-center justify-center transition-colors">✕</button>
            </div>
            
            {errorMsg && (
              <div className="mb-4 p-3 bg-red-50 text-red-600 border border-red-100 rounded-xl text-sm">
                ❌ {errorMsg}
              </div>
            )}

            <form onSubmit={handleBook} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">คณะที่เรียน</label>
                <select 
                  required
                  value={formFacility} 
                  onChange={e => setFormFacility(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                >
                  <option value="" disabled>เลือกคณะ...</option>
                  <option value="คณะเทคโนโลยีทางทะเล">คณะเทคโนโลยีทางทะเล</option>
                  <option value="คณะอัญมณี">คณะอัญมณี</option>
                  <option value="คณะวิทยาศาสตร์-ศิลปศาสตร์">คณะวิทยาศาสตร์-ศิลปศาสตร์</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">รหัสนิสิต</label>
                <input 
                  type="text" 
                  required
                  placeholder="เช่น 64000000"
                  value={formStudentId} 
                  onChange={e => setFormStudentId(e.target.value)}
                  className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เวลาเริ่ม</label>
                  <select 
                    value={formStart} 
                    onChange={e => setFormStart(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    {timeOptions.slice(0, -1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">เวลาสิ้นสุด</label>
                  <select 
                    value={formEnd} 
                    onChange={e => setFormEnd(e.target.value)}
                    className="w-full border border-gray-300 rounded-xl p-3 bg-gray-50 text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                  >
                    {timeOptions.slice(1).map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              
              <p className="text-xs text-gray-500 mt-2">
                * จองได้ไม่เกิน 3 ชั่วโมงต่อวัน, เปิด 09:00 - 21:00 น.
              </p>

              <button 
                type="submit"
                className="w-full mt-6 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 hover:shadow-xl hover:from-indigo-700 hover:to-purple-700 transition-all duration-300 transform hover:-translate-y-0.5"
              >
                ยืนยันการจอง
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
