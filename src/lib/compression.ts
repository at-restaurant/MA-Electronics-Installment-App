// src/lib/compression.ts - UNIFIED IMAGE COMPRESSION

interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    maxSizeKB?: number;
    quality?: number;
    format?: 'webp' | 'jpeg';
}

export class ImageCompression {
    /**
     * Compress image to specified constraints
     */
    static async compress(
        input: File | string,
        options: CompressionOptions = {}
    ): Promise<string> {
        const {
            maxWidth = 800,
            maxHeight = 800,
            maxSizeKB = 100,
            quality = 0.8,
            format = 'jpeg'
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    if (!ctx) {
                        reject(new Error('Failed to get canvas context'));
                        return;
                    }

                    // Calculate dimensions
                    let { width, height } = img;

                    if (width > maxWidth || height > maxHeight) {
                        const ratio = Math.min(maxWidth / width, maxHeight / height);
                        width *= ratio;
                        height *= ratio;
                    }

                    canvas.width = width;
                    canvas.height = height;

                    // Draw with smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, width, height);

                    // Progressive quality reduction
                    let currentQuality = quality;
                    let result = canvas.toDataURL(`image/${format}`, currentQuality);

                    while (this.getBase64SizeKB(result) > maxSizeKB && currentQuality > 0.1) {
                        currentQuality -= 0.05;
                        result = canvas.toDataURL(`image/${format}`, currentQuality);
                    }

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Image load failed'));

            if (typeof input === 'string') {
                img.src = input;
            } else {
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target?.result as string; };
                reader.onerror = () => reject(new Error('File read failed'));
                reader.readAsDataURL(input);
            }
        });
    }

    /**
     * Compress profile photo (400x400, max 60KB)
     */
    static async compressProfile(input: File | string): Promise<string> {
        return this.compress(input, {
            maxWidth: 400,
            maxHeight: 400,
            maxSizeKB: 60,
            quality: 0.8,
        });
    }

    /**
     * Compress CNIC photo (600x400, max 50KB)
     */
    static async compressCNIC(input: File | string): Promise<string> {
        return this.compress(input, {
            maxWidth: 600,
            maxHeight: 400,
            maxSizeKB: 50,
            quality: 0.75,
        });
    }

    /**
     * Compress guarantor photo (300x300, max 40KB)
     */
    static async compressGuarantor(input: File | string): Promise<string> {
        return this.compress(input, {
            maxWidth: 300,
            maxHeight: 300,
            maxSizeKB: 40,
            quality: 0.75,
        });
    }

    /**
     * Create thumbnail (100x100, max 10KB)
     */
    static async createThumbnail(input: File | string): Promise<string> {
        return this.compress(input, {
            maxWidth: 100,
            maxHeight: 100,
            maxSizeKB: 10,
            quality: 0.7,
        });
    }

    /**
     * Compress multiple images
     */
    static async compressMultiple(
        inputs: (File | string)[],
        options: CompressionOptions = {}
    ): Promise<string[]> {
        return Promise.all(inputs.map(input => this.compress(input, options)));
    }

    /**
     * Validate image file
     */
    static validateFile(file: File): { valid: boolean; error?: string } {
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];

        if (!allowedTypes.includes(file.type)) {
            return { valid: false, error: 'Invalid file type. Use JPG, PNG, or WebP.' };
        }

        if (file.size > maxSize) {
            return { valid: false, error: 'File too large. Max 10MB.' };
        }

        return { valid: true };
    }

    /**
     * Get base64 size in KB
     */
    private static getBase64SizeKB(base64: string): number {
        const base64Data = base64.split(',')[1] || base64;
        return (base64Data.length * 3) / 4 / 1024;
    }

    /**
     * Estimate compressed size
     */
    static estimateCompressedSize(originalSizeKB: number): number {
        // JPEG/WebP typically achieves 70-80% reduction
        return Math.round(originalSizeKB * 0.25);
    }

    /**
     * Get image dimensions
     */
    static async getDimensions(input: File | string): Promise<{ width: number; height: number }> {
        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                resolve({ width: img.width, height: img.height });
            };

            img.onerror = () => reject(new Error('Failed to load image'));

            if (typeof input === 'string') {
                img.src = input;
            } else {
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target?.result as string; };
                reader.onerror = () => reject(new Error('File read failed'));
                reader.readAsDataURL(input);
            }
        });
    }
}