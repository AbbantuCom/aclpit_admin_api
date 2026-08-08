import { NextResponse } from 'next/server';
import { getDb } from '@/lib/mongodb';

export async function GET() {
  try {
    const db = await getDb();
    const userCount = await db.collection('users').countDocuments();
    return NextResponse.json({ hasUsers: userCount > 0, needsSetup: userCount === 0 });
  } catch {
    // If DB isn't reachable yet, assume setup is needed
    return NextResponse.json({ hasUsers: false, needsSetup: true });
  }
}
