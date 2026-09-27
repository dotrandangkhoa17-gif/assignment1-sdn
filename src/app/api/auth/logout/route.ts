import { NextResponse } from 'next/server';
import { getDeleteCookieOptions } from '@/lib/auth';

export async function POST() {
  const response = NextResponse.json({
    message: 'Logged out successfully',
  });

  const cookieOptions = getDeleteCookieOptions();
  response.cookies.set(cookieOptions);

  return response;
}
