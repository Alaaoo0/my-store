import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { password } = await req.json();
    const adminPassword = process.env.ADMIN_PASSWORD || "BossMan2026!";
    const cookieStore = await cookies();

    // 👇 تأكدنا إنه الـ IP ما يكون فاضي
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown-ip';

    // 1. التحقق من عدد المحاولات في قاعدة البيانات
    const attemptRecord = await prisma.loginAttempt.findUnique({
      where: { ip: ip },
    });

    if (attemptRecord && attemptRecord.attempts >= 5) {
      const timeDiff = Date.now() - attemptRecord.lastAttempt.getTime();
      const lockoutTime = 15 * 60 * 1000; // 15 دقيقة

      if (timeDiff < lockoutTime) {
        const remainingMins = Math.ceil((lockoutTime - timeDiff) / 60000);
        return NextResponse.json({ 
          message: `لقد تجاوزت عدد المحاولات المسموح بها. يرجى المحاولة بعد ${remainingMins} دقيقة.` 
        }, { status: 429 });
      } else {
        // إذا مرت 15 دقيقة، بنصفّر العداد
        await prisma.loginAttempt.update({
          where: { ip: ip },
          data: { attempts: 0, lastAttempt: new Date() },
        });
      }
    }

    // 2. التحقق من كلمة السر
    if (password === adminPassword) {
      cookieStore.set('admin_session', 'true', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7,
        path: '/',
      });

      // تصفير العداد بعد النجاح
      await prisma.loginAttempt.deleteMany({ where: { ip: ip } });
      
      return NextResponse.json({ success: true });
    } else {
      // 3. إذا كلمة السر غلط، بنزيد العداد
      if (attemptRecord) {
        await prisma.loginAttempt.update({
          where: { ip: ip },
          data: { attempts: { increment: 1 }, lastAttempt: new Date() },
        });
      } else {
        await prisma.loginAttempt.create({
          data: { ip: ip, attempts: 1 },
        });
      }
      return NextResponse.json({ message: 'كلمة المرور خاطئة.' }, { status: 401 });
    }
  } catch (error: any) {
    console.error("LOGIN ERROR:", error); // 👈 هاد السطر رح يطبع الخطأ بالضبط بالـ Logs
    return NextResponse.json({ message: 'حدث خطأ في السيرفر.' }, { status: 500 });
  }
}
