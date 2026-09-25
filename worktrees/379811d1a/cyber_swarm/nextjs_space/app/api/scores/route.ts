export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

export async function GET() {
  try {
    const scores = await prisma.highScore.findMany({
      orderBy: { kills: 'desc' },
      take: 50,
    });
    return NextResponse.json(scores ?? []);
  } catch (err: any) {
    console.error('Failed to fetch scores:', err);
    return NextResponse.json([], { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, kills, time, character, level } = body ?? {};
    if (!name || kills == null || time == null) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }
    const score = await prisma.highScore.create({
      data: {
        name: String(name ?? ''),
        kills: Number(kills ?? 0),
        time: Number(time ?? 0),
        character: String(character ?? 'hacker'),
        level: Number(level ?? 1),
      },
    });
    return NextResponse.json(score);
  } catch (err: any) {
    console.error('Failed to save score:', err);
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 });
  }
}
