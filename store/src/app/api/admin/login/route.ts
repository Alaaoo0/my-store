import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { RateLimiterPrisma } from 'rate-limiter-flexible';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// إعداد محدد المحاولات: 5 محاولات كل 15 دقيقة
const rateLimiter = new RateLimiterPrisma({
  storeClient: prisma,
  points: 5, // 5 محاولات
  duration: 15 * 60, // كل 15 دقيقة
});

export async function POST(req: Request) {
  const { password } = await req.json();
  const adminPassword = process.env.ADMIN_PASSWORD || "BossMan2026!";
  
  // 👇 الحصول على IP المستخدم
  const ip = req.headers.get('x-forwarded-for') || 'unknown-ip';

  try {
    // 👇 التحقق من عدد المحاولات المتبقية للـ IP
    await rateLimiter.consume(ip);
  } catch (rejRes) {
    // إذا تجاوز الحد
    const secs = Math.round((rejRes as any).msBeforeNext / 1000) || 60;
    const mins = Math.ceil(secs / 60);
    return NextResponse.json({ 
      message: `لقد تجاوزت عدد المحاولات المسموح بها. يرجى المحاولة بعد ${mins} دقيقة.` 
    }, { status: 429 });
  }

  // 👇 إذا كلمة السر صح
  if (password === adminPassword) {
    const cookieStore = await cookies();
    cookieStore.set('admin_session', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });
    
    // تصفير العداد بعد النجاح
    await rateLimiter.delete(ip);
    
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ message: 'كلمة المرور خاطئة.' }, { status: 401 });
  }
}
