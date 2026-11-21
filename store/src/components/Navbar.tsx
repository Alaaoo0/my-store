"use client";

import Link from "next/link";
import { useCart } from "../app/context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Navbar({ siteName }: { siteName: string }) {
  const { cart = [] } = useCart() || {};
  const { wishlist = [] } = useWishlist() || {};
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [user, setUser] = useState<any>(null);
  const router = useRouter();
  const pathname = usePathname();

  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [categories, setCategories] = useState<any[]>([]);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [balance, setBalance] = useState(0);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"error" | "success">("error");

  const showModal = (message: string, type: "error" | "success" = "error") => {
    setModalMessage(message);
    setModalType(type);
    setModalOpen(true);
  };

  const fetchUserData = () => {
    fetch("/api/auth/me", { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        setUser(data.user);
        if (data.user && data.user.walletBalance !== undefined) {
          setBalance(data.user.walletBalance);
        }
      })
      .catch(() => setUser(null));
  };

  useEffect(() => {
    setMounted(true);
    fetchUserData();

    fetch("/api/categories")
      .then(res => res.json())
      .then(data => setCategories(data))
      .catch(() => setCategories([]));

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(() => console.log('Service Worker Registered'))
        .catch((err) => console.error('Service Worker Error:', err));
    }

    const handleRefresh = () => fetchUserData();
    window.addEventListener('refreshNavbar', handleRefresh);

    return () => {
      window.removeEventListener('refreshNavbar', handleRefresh);
    };
  }, []);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (searchQuery.length > 1) {
      const delayDebounceFn = setTimeout(() => {
        fetch(`/api/search?q=${encodeURIComponent(searchQuery)}`)
          .then(res => res.json())
          .then(data => {
            setSuggestions(data);
            setShowSuggestions(true);
          });
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [searchQuery]);

  const subscribeToPush = async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showModal('متصفحك ما بيدعم الإشعارات.', "error");
      return;
    }
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
      showModal('مفتاح VAPID العام مش موجود بالإعدادات.', "error");
      return;
    }
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showModal('لازم تسمح بالإشعارات من إعدادات المتصفح.', "error");
        return;
      }
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      });
      const res = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      });
      if (!res.ok) throw new Error('السيرفر ما قدر يحفظ الاشتراك');
      showModal('تم تفعيل الإشعارات بنجاح! 🔔', "success");
    } catch (error: any) {
      showModal('صار خطأ: ' + (error.message || 'خطأ غير معروف'), "error");
    }
  };

  const totalItems = cart.reduce((total: number, item: any) => total + item.quantity, 0);
  const totalWishlist = wishlist.length;

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  const handleLogout = async () => {
    if (user && user.email) {
      const currentCart = localStorage.getItem("store_cart");
      if (currentCart) localStorage.setItem(`saved_cart_${user.email}`, currentCart);
      localStorage.removeItem("store_cart");

      const currentWishlist = localStorage.getItem("store_wishlist");
      if (currentWishlist) localStorage.setItem(`saved_wishlist_${user.email}`, currentWishlist);
      localStorage.removeItem("store_wishlist");
    }

    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null); 
    window.location.href = "/"; 
  };

  return (
    <>
      <header className="bg-white shadow-sm sticky top-0 z-50 border-b border-gray-200 flex flex-col w-full">
        
        <div className="w-full px-2 py-2 flex items-center justify-between border-b border-gray-100">
          <Link href="/" className="text-lg sm:text-2xl font-black text-red-600 tracking-tighter shrink-0">
            {siteName}
          </Link>
          
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <Link href="/admin" className="text-gray-500 hover:text-red-600 text-lg sm:text-2xl">⚙️</Link>
            <button onClick={subscribeToPush} className="text-gray-500 hover:text-red-600 text-lg sm:text-2xl">🔔</button>
            <Link href="/wishlist" className="relative text-gray-500 hover:text-red-600 text-lg sm:text-2xl">
              ❤️
              {mounted && totalWishlist > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalWishlist}</span>}
            </Link>
            <Link href="/cart" className="relative text-gray-500 hover:text-red-600 text-lg sm:text-2xl">
              🛒
              {mounted && totalItems > 0 && <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[9px] font-bold w-4 h-4 flex items-center justify-center rounded-full">{totalItems}</span>}
            </Link>

            <div className="border-r border-gray-300 pr-1.5 flex items-center gap-1 sm:gap-2 ml-1">
              {mounted && user ? (
                <>
                  {/* 👇 زر طلباتي صار ظاهر عالموبايل */}
                  <Link href="/orders" className="text-xs sm:text-sm font-bold text-red-600 hover:text-red-700 transition-colors flex items-center gap-1">
                    <span className="text-base sm:text-lg">📦</span> <span className="hidden xs:inline">طلباتي</span>
                  </Link>
                  
                  <Link href="/wallet" className="flex items-center gap-1 bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold text-[10px] sm:text-xs whitespace-nowrap">
                    💳 ${Number(balance).toFixed(2)}
                  </Link>
                  <button onClick={handleLogout} className="text-xs sm:text-sm text-red-600 font-bold hover:underline whitespace-nowrap">خروج</button>
                </>
              ) : (
                <Link href="/login" className="text-xs sm:text-sm font-bold text-gray-700 hover:text-red-600 flex items-center gap-1">
                  <span className="text-lg">👤</span>
                  <span className="hidden sm:inline">دخول</span>
                </Link>
              )}
            </div>
          </div>
        </div>

        <div className="w-full px-2 py-2 relative max-w-3xl mx-auto z-[60]">
          <form onSubmit={handleSearch} className="flex w-full">
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              onFocus={() => { if(suggestions.length > 0) setShowSuggestions(true); }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
              placeholder="ابحث عن منتج..." 
              className="w-full border-2 border-red-600 rounded-r-full px-3 py-1.5 outline-none text-black text-xs sm:text-sm" 
            />
            <button type="submit" className="bg-red-600 text-white px-3 sm:px-6 py-1.5 rounded-l-full font-bold text-xs sm:text-sm hover:bg-red-700 transition-colors shrink-0">بحث</button>
          </form>

          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute top-full left-2 right-2 bg-white border border-gray-200 rounded-b-lg shadow-2xl z-[100] max-h-60 overflow-y-auto mt-1">
              {suggestions.map((item) => (
                <li key={item.id}>
                  <Link 
                    href={`/product?slug=${item.slug}`}
                    className="flex items-center gap-3 p-2 hover:bg-gray-50 border-b last:border-0"
                    onClick={() => setShowSuggestions(false)}
                  >
                    {item.imageUrl && <img src={item.imageUrl} className="w-8 h-8 rounded object-cover" />}
                    <span className="text-xs sm:text-sm font-semibold text-gray-700">{item.name}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-2 py-1.5 flex justify-center items-center gap-4 sm:gap-10">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="flex items-center gap-1 font-bold text-gray-800 hover:text-red-600 transition-colors text-xs sm:text-base"
            >
              <span>☰</span> المتجر
            </button>
            
            <Link href="/offers" className="flex items-center gap-1 font-bold text-red-600 hover:text-red-700 transition-colors text-xs sm:text-base">
              <span>🎁</span> العروض
            </Link>
            
            <Link href="/" className="flex items-center gap-1 font-bold text-gray-800 hover:text-red-600 transition-colors text-xs sm:text-base">
              <span>🏠</span> الرئيسية
            </Link>
          </div>
        </div>

        {isMenuOpen && (
          <div className="bg-white border-t border-gray-200 shadow-xl absolute top-full left-0 w-full z-50">
            <div className="max-w-7xl mx-auto p-3 sm:p-4">
              <div className="flex items-center justify-between mb-4 border-b pb-2">
                <h3 className="font-bold text-gray-800">تصفح الأقسام</h3>
                <Link href="/products" className="text-sm text-blue-600 font-bold hover:underline">كل المنتجات ←</Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 sm:gap-3">
                {categories.length === 0 ? (
                  <p className="col-span-4 text-center text-gray-500 py-4">ما في أقسام مضافة حالياً.</p>
                ) : (
                  categories.map((cat: any) => (
                    <Link
                      key={cat.id}
                      href={`/products?category=${encodeURIComponent(cat.name)}`}
                      onClick={() => setIsMenuOpen(false)}
                      className="p-2 sm:p-3 bg-gray-50 rounded-lg text-center font-semibold text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors border border-gray-100 text-xs sm:text-sm"
                    >
                      {cat.name}
                    </Link>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </header>

      {modalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" dir="rtl">
            <div className="text-center mb-4 text-5xl">
              {modalType === 'error' ? '⚠️' : '✅'}
            </div>
            <p className="text-center text-lg font-bold text-gray-800 mb-6">{modalMessage}</p>
            <button
              onClick={() => setModalOpen(false)}
              className={`w-full py-3 rounded-lg text-white font-bold text-lg transition-colors ${
                modalType === 'error' ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'
              }`}
            >
              {modalType === 'error' ? 'تمام، فهمت' : 'يلا نكمل'}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
