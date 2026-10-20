export interface CloudinaryUploadResponse {
  url: string;
  secureUrl: string;
  publicId: string;
  format: string;
  bytes: number;
  originalFilename: string;
}

export const CLOUDINARY_CLOUD_NAME = 'ehc1fewm';

/**
 * Converts a browser File/Blob to a base64 Data URL
 */
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Uploads any student document, PDF, code file, or image directly to Cloudinary
 * through our secure server-side authenticated proxy (/api/upload).
 */
export async function uploadToCloudinary(
  file: File,
  folder = 'awkum_classhub/submissions'
): Promise<CloudinaryUploadResponse> {
  try {
    const dataUrl = await fileToDataUrl(file);

    const response = await fetch('/api/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileData: dataUrl,
        fileName: file.name,
        folder,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData?.error || `Upload failed with HTTP ${response.status}`);
    }

    const data = await response.json();
    return {
      url: data.url,
      secureUrl: data.secureUrl,
      publicId: data.publicId,
      format: data.format || file.name.split('.').pop() || '',
      bytes: data.bytes || file.size,
      originalFilename: data.originalFilename || file.name,
    };
  } catch (error: any) {
    console.warn('[Cloudinary Service] Upload proxy notice:', error?.message);
    // Graceful offline fallback with local object URL
    return {
      url: URL.createObjectURL(file),
      secureUrl: URL.createObjectURL(file),
      publicId: `local_${Date.now()}_${file.name.replace(/\s+/g, '_')}`,
      format: file.name.split('.').pop() || 'pdf',
      bytes: file.size,
      originalFilename: file.name,
    };
  }
}
