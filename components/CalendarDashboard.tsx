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
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formFacility, setFormFacility] = useState("");
  const [formStudentId, setFormStudentId] = useState("");
  const [formStart, setFormStart] = useState("09:00");
  const [formEnd, setFormEnd] = useState("12:00");
  const [errorMsg, setErrorMsg] = useState("");

  const timeOptions = [
    "09:00", "10:00", "11:00", "12:00", "13:00", 
    "14:00", "15:00", "16:00", "17:00", "18:00", 
    "19:00", "20:00", "21:00"
  ];

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  useEffect(() => {
    fetchBookings();
  }, [currentDate]);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/bookings");
      if (res.ok) {
        const data = await res.json();
        setBookings(data);
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

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    if (!selectedDate) return;

    // Local simple formatting (YYYY-MM-DD) to prevent timezone UTC shifts
    const year = selectedDate.getFullYear();
    const month = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dayStr = String(selectedDate.getDate()).padStart(2, "0");
    const dateString = `${year}-${month}-${dayStr}`;

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: dateString,
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
        fetchBookings(); // Refresh
      }
    } catch (e) {
      setErrorMsg("เกิดข้อผิดพลาดในการจอง");
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
      fetchBookings(); // refresh
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
      fetchBookings(); // refresh
    } catch (e) {
      console.error(e);
    }
  };

  const daysThisMonth = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
  const firstDayOfWeek = daysThisMonth[0].getDay();
  const blanks = Array.from({ length: firstDayOfWeek }).map((_, i) => i);

  // Filter bookings for selected date
  const bookingsForSelected = bookings.filter((b) => {
    if (!selectedDate) return false;
    const bd = new Date(b.date);
    return (
      bd.getFullYear() === selectedDate.getFullYear() &&
      bd.getMonth() === selectedDate.getMonth() &&
      bd.getDate() === selectedDate.getDate()
    );
  });

  if (status === "loading" || !session) return <div className="p-8 text-center text-gray-500 min-h-screen flex items-center justify-center">Loading...</div>;

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 flex flex-col md:flex-row gap-8 min-h-screen">
      
      {/* LEFT: Calendar */}
      <div className="flex-1 bg-white p-6 rounded-2xl shadow-xl shadow-indigo-100/50 border border-indigo-50/50">
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
            
            // Checking if we have bookings on this day to show an indicator
            const hasBooking = bookings.some(b => {
              const bd = new Date(b.date);
              return bd.getDate() === day.getDate() && bd.getMonth() === day.getMonth() && bd.getFullYear() === day.getFullYear();
            });

            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                className={`aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all duration-200
                  ${isSelected ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-200" 
                  : isToday ? "bg-indigo-50 text-indigo-800 font-bold hover:bg-indigo-100 relative" 
                  : "text-gray-700 hover:bg-gray-100"}
                `}
              >
                {day.getDate()}
                {hasBooking && !isSelected && <div className="w-1.5 h-1.5 rounded-full bg-pink-500 mt-1"></div>}
                {hasBooking && isSelected && <div className="w-1.5 h-1.5 rounded-full bg-indigo-200 mt-1"></div>}
              </button>
            );
          })}
        </div>
      </div>

      {/* RIGHT: Selected Day Details */}
      <div className="w-full md:w-96 flex flex-col gap-6">
        <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 p-6 rounded-2xl shadow-xl text-white">
          <h3 className="text-lg font-medium text-indigo-100">วันที่เลือก</h3>
          <p className="text-3xl font-bold mt-1 mb-6">
            {selectedDate ? selectedDate.toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' }) : "ไม่ได้เลือก"}
          </p>

          <button 
            disabled={!selectedDate}
            onClick={() => setIsModalOpen(true)}
            className="w-full py-3 bg-white text-indigo-900 font-bold rounded-xl hover:bg-indigo-50 transition-colors shadow-lg shadow-black/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            <span className="text-xl">+</span> จองห้องซ้อม
          </button>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-xl shadow-gray-100/50 border border-gray-100 flex-1">
          <h3 className="text-lg font-bold text-gray-800 mb-4 border-b pb-2">ตารางการจองวันนี้</h3>
          
          {loading ? (
            <p className="text-gray-500 text-center py-8 animate-pulse">กำลังโหลด...</p>
          ) : bookingsForSelected.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-gray-400">
              <span className="text-4xl mb-3">👻</span>
              <p>ยังไม่มีใครจองเลย</p>
              <p className="text-sm mt-1">ห้องว่างยาวๆ ไปเลยยจ้าา</p>
            </div>
          ) : (
            <ul className="space-y-4">
              {bookingsForSelected.map((b) => (
                <li key={b.id} className="p-4 rounded-xl relative overflow-hidden group">
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${b.user?.email === session?.user?.email ? 'bg-indigo-500' : 'bg-pink-400'}`}></div>
                  <div className="bg-gray-50 pl-5 pr-4 py-3 rounded-r-xl outline outline-1 outline-gray-100 relative">
                    <p className="text-xs font-semibold text-gray-500 mb-1">{b.startTime} - {b.endTime}</p>
                    <p className="text-sm font-medium text-gray-800 break-all">{b.user?.email}</p>
                    {b.user?.name && <p className="text-xs text-gray-500">{b.user.name}</p>}
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-[10px] inline-block px-2 py-0.5 rounded-full bg-white border border-gray-200 text-gray-600 font-medium">
                        สถานะ: {
                          b.status === "CONFIRMED" ? "✅ รอใช้งาน" : 
                          b.status === "IN_USE" ? "🎸 กำลังใช้งาน" : 
                          b.status === "COMPLETED" ? "🏁 ใช้งานเสร็จสิ้น" : 
                          "❌ ยกเลิก"
                        }
                      </div>

                      {/* Photo Upload Actions for Owner */}
                      {b.user?.email === session?.user?.email && b.status !== "CANCELLED" && (
                        <div className="flex gap-2">
                          {!b.photoBeforeUrl && (
                            <CldUploadWidget 
                              signatureEndpoint="/api/sign-image"
                              onSuccess={(res) => handleUploadPhoto(b.id, "photoBeforeUrl", res)}
                            >
                              {({ open }) => (
                                <button onClick={() => open()} className="text-[10px] px-2 py-1 bg-indigo-100 text-indigo-700 rounded hover:bg-indigo-200 transition">
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
                                <button onClick={() => open()} className="text-[10px] px-2 py-1 bg-pink-100 text-pink-700 rounded hover:bg-pink-200 transition">
                                  📸 ถ่ายหลังใช้
                                </button>
                              )}
                            </CldUploadWidget>
                          )}
                          {b.status === "CONFIRMED" && !b.photoBeforeUrl && (
                            <button 
                              onClick={() => handleCancelBooking(b.id)} 
                              className="text-[10px] px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition"
                            >
                              ❌ ยกเลิกการจอง
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Show thumbnail if uploaded */}
                    {(b.photoBeforeUrl || b.photoAfterUrl) && (
                      <div className="mt-3 flex gap-2">
                        {b.photoBeforeUrl && (
                          <div className="relative group/photo">
                            <img src={b.photoBeforeUrl} alt="Before" className="w-10 h-10 rounded object-cover border border-gray-200" />
                            <div className="absolute -top-2 -right-2 text-[8px] bg-indigo-500 text-white px-1 rounded-sm opacity-0 group-hover/photo:opacity-100 transition">ก่อน</div>
                          </div>
                        )}
                        {b.photoAfterUrl && (
                          <div className="relative group/photo">
                            <img src={b.photoAfterUrl} alt="After" className="w-10 h-10 rounded object-cover border border-gray-200" />
                            <div className="absolute -top-2 -right-2 text-[8px] bg-pink-500 text-white px-1 rounded-sm opacity-0 group-hover/photo:opacity-100 transition">หลัง</div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
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
