"use client";
import { useState } from "react";
import Link from "next/link";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleTrack = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId.trim()) return;
    
    setLoading(true);
    setError("");
    setOrder(null);

    try {
      const res = await fetch(`/api/track-order?id=${orderId}`);
      const data = await res.json();

      if (res.ok) {
        setOrder(data);
      } else {
        setError(data.message || "حدث خطأ");
      }
    } catch (err) {
      setError("خطأ في الاتصال بالسيرفر");
    }
    setLoading(false);
  };

  // 👇 دالة تحدد وين واصل الطلب (4 مراحل)
  const getStatusIndex = (status: string, confirmed: boolean) => {
    if (confirmed) return 3; // تم الاستلام
    if (status === "delivered") return 2; // تم التوصيل
    if (status === "shipped") return 1; // تم الشحن
    return 0; // قيد المعالجة
  };

  const currentStatus = order ? getStatusIndex(order.status, order.customerConfirmed) : 0;

  return (
    <main className="max-w-3xl mx-auto p-4 md:p-8 mt-10 min-h-screen" dir="rtl">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-black text-red-600 mb-4 flex items-center justify-center gap-2">
          <span>📦</span> تتبع طلبك
        </h1>
        <p className="text-gray-500">أدخل رقم الطلب (آخر 6 أحرف) لمعرفة حالة شحنتك.</p>
      </div>

      <form onSubmit={handleTrack} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex gap-3 max-w-xl mx-auto mb-10">
        <input 
          type="text" 
          value={orderId} 
          onChange={(e) => setOrderId(e.target.value)} 
          placeholder="مثال: A1B2C3" 
          className="flex-1 border p-3 rounded-lg text-black uppercase outline-none focus:ring-2 focus:ring-red-500" 
          required
        />
        <button type="submit" disabled={loading} className="bg-red-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-red-700 disabled:bg-gray-400">
          {loading ? "جاري البحث..." : "تتبع"}
        </button>
      </form>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg text-center font-bold max-w-xl mx-auto border border-red-200">
          ⚠️ {error}
        </div>
      )}

      {order && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg border border-gray-100 max-w-xl mx-auto animate-fade-in-up">
          
          <div className="flex justify-between items-center border-b pb-4 mb-6">
            <div>
              <p className="text-sm text-gray-500">رقم الطلب</p>
              <p className="font-mono font-bold text-lg text-gray-900">#{order.id.slice(-6).toUpperCase()}</p>
            </div>
            <div className="text-left">
              <p className="text-sm text-gray-500">التاريخ</p>
              <p className="font-bold text-gray-900">{new Date(order.createdAt).toLocaleDateString('ar-LB')}</p>
            </div>
          </div>

          {/* 👇 الخط الزمني (4 مراحل) */}
          <div className="relative flex justify-between items-center mb-10 mt-4 px-2">
            {/* الخط الخلفي */}
            <div className="absolute left-0 right-0 top-1/2 h-1.5 bg-gray-200 -z-10 transform -translate-y-1/2"></div>
            {/* الخط الملون (اللي بيتحرك حسب الحالة) */}
            <div 
              className="absolute right-0 top-1/2 h-1.5 bg-red-600 -z-10 transform -translate-y-1/2 transition-all duration-500"
              style={{ width: currentStatus === 0 ? '0%' : currentStatus === 1 ? '33%' : currentStatus === 2 ? '66%' : '100%' }}
            ></div>

            {/* المرحلة 1 */}
            <div className="flex flex-col items-center gap-2 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg ${currentStatus >= 0 ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>✓</div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-800 text-center">قيد المعالجة</span>
            </div>
            
            {/* المرحلة 2 */}
            <div className="flex flex-col items-center gap-2 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg ${currentStatus >= 1 ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>🚚</div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-800 text-center">تم الشحن</span>
            </div>

            {/* المرحلة 3 */}
            <div className="flex flex-col items-center gap-2 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg ${currentStatus >= 2 ? 'bg-red-600 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>🏠</div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-800 text-center">تم التوصيل</span>
            </div>

            {/* المرحلة 4 (الجديدة) */}
            <div className="flex flex-col items-center gap-2 bg-white px-1 sm:px-2">
              <div className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-sm sm:text-lg ${currentStatus >= 3 ? 'bg-green-500 text-white shadow-md' : 'bg-gray-200 text-gray-500'}`}>🤝</div>
              <span className="text-[10px] sm:text-xs font-bold text-gray-800 text-center">تم الاستلام</span>
            </div>
          </div>

          {/* تفاصيل المنتجات */}
          <div className="bg-gray-50 p-4 rounded-xl mb-6">
            <h3 className="font-bold text-gray-800 mb-3">محتوى الطلب</h3>
            {order.items.map((item: any) => (
              <div key={item.id} className="flex justify-between items-center border-b last:border-0 py-2 text-sm">
                <span className="text-gray-700">
                  {item.product?.name || 'منتج'} 
                  {item.variant && <span className="text-red-500 font-bold mx-1">({item.variant})</span>}
                  <span className="text-gray-400 text-xs ml-1">×{item.quantity}</span>
                </span>
                <span className="font-bold text-gray-900">${((item.price * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}
            
            {/* 👇 هنا غمقنا لون المجموع */}
            <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 font-black text-lg">
              <span className="text-gray-900">المجموع:</span>
              <span className="text-red-600">${(order.total / 100).toFixed(2)}</span>
            </div>
          </div>

          <div className="text-center">
            <p className="text-sm text-gray-500 mb-3">للاستفسار، تواصل معنا عبر الواتساب.</p>
            <Link href="/" className="inline-block bg-black text-white px-8 py-2 rounded-lg font-bold hover:bg-gray-800 transition-colors">العودة للمتجر</Link>
          </div>

        </div>
      )}
    </main>
  );
}
