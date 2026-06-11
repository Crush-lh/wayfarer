import { NextResponse } from 'next/server'

export async function GET() {
  return NextResponse.json({
    amapKey: process.env.AMAP_API_KEY || '',
  })
}
