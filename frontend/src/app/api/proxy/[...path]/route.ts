import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

type RouteParams = { params: Promise<{ path: string[] }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const fullPath = Array.isArray(path) ? path.join('/') : path;
  const url = `${API_URL}/${fullPath}${request.nextUrl.search}`;
  const authHeader = request.headers.get('authorization');

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to fetch' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const fullPath = Array.isArray(path) ? path.join('/') : path;
  const url = `${API_URL}/${fullPath}`;
  const authHeader = request.headers.get('authorization');
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to fetch' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const fullPath = Array.isArray(path) ? path.join('/') : path;
  const url = `${API_URL}/${fullPath}`;
  const authHeader = request.headers.get('authorization');
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    body = {};
  }

  try {
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to fetch' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { path } = await params;
  const fullPath = Array.isArray(path) ? path.join('/') : path;
  const url = `${API_URL}/${fullPath}`;
  const authHeader = request.headers.get('authorization');

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        ...(authHeader && { Authorization: authHeader }),
      },
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch {
    return NextResponse.json({ message: 'Failed to fetch' }, { status: 500 });
  }
}
