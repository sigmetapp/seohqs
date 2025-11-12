import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';
import { existsSync } from 'fs';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const fileName = formData.get('fileName') as string;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Определяем имя файла
    const finalFileName = fileName || file.name || 'uploaded.csv';
    
    // Убеждаемся, что это CSV файл
    if (!finalFileName.toLowerCase().endsWith('.csv')) {
      return NextResponse.json(
        { error: 'File must be a CSV file' },
        { status: 400 }
      );
    }

    // Создаем директорию если её нет
    const dataDir = join(process.cwd(), 'public', 'data');
    if (!existsSync(dataDir)) {
      await mkdir(dataDir, { recursive: true });
    }

    // Сохраняем файл
    const filePath = join(dataDir, finalFileName);
    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    
    await writeFile(filePath, buffer);

    return NextResponse.json({
      success: true,
      message: `File ${finalFileName} uploaded successfully`,
      fileName: finalFileName,
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      {
        error: 'Failed to upload file',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
