// src/lib/imageCompressor.ts - Advanced WebP Image Compression

interface CompressionOptions {
    maxWidth?: number;
    maxHeight?: number;
    maxSizeKB?: number;
    quality?: number;
    format?: 'webp' | 'jpeg';
}

export class ImageCompressor {
    /**
     * Compress single image to WebP format
     */
    static async compress(
        file: File | string,
        options: CompressionOptions = {}
    ): Promise<string> {
        const {
            maxWidth = 800,
            maxHeight = 800,
            maxSizeKB = 100,
            quality = 0.8,
            format = 'webp'
        } = options;

        return new Promise((resolve, reject) => {
            const img = new Image();

            img.onload = () => {
                try {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d')!;

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

                    while (this.getBase64Size(result) > maxSizeKB && currentQuality > 0.1) {
                        currentQuality -= 0.05;
                        result = canvas.toDataURL(`image/${format}`, currentQuality);
                    }

                    resolve(result);
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Image load failed'));

            if (typeof file === 'string') {
                img.src = file;
            } else {
                const reader = new FileReader();
                reader.onload = (e) => { img.src = e.target?.result as string; };
                reader.onerror = () => reject(new Error('File read failed'));
                reader.readAsDataURL(file);
            }
        });
    }

    /**
     * Compress multiple images
     */
    static async compressMultiple(
        files: (File | string)[],
        options: CompressionOptions = {}
    ): Promise<string[]> {
        return Promise.all(files.map(file => this.compress(file, options)));
    }

    /**
     * Compress for CNIC (smaller size)
     */
    static async compressCNIC(file: File | string): Promise<string> {
        return this.compress(file, {
            maxWidth: 600,
            maxHeight: 400,
            maxSizeKB: 50,
            quality: 0.75,
        });
    }

    /**
     * Compress for profile photo
     */
    static async compressProfile(file: File | string): Promise<string> {
        return this.compress(file, {
            maxWidth: 400,
            maxHeight: 400,
            maxSizeKB: 60,
            quality: 0.8,
        });
    }

    /**
     * Compress for guarantor photo
     */
    static async compressGuarantor(file: File | string): Promise<string> {
        return this.compress(file, {
            maxWidth: 300,
            maxHeight: 300,
            maxSizeKB: 40,
            quality: 0.75,
        });
    }

    /**
     * Get base64 size in KB
     */
    private static getBase64Size(base64: string): number {
        const base64Data = base64.split(',')[1] || base64;
        return (base64Data.length * 3) / 4 / 1024;
    }

    /**
     * Create thumbnail
     */
    static async createThumbnail(file: File | string, size: number = 100): Promise<string> {
        return this.compress(file, {
            maxWidth: size,
            maxHeight: size,
            maxSizeKB: 10,
            quality: 0.7,
        });
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
     * Get estimated compressed size
     */
    static estimateCompressedSize(originalSizeKB: number): number {
        // WebP compression typically achieves 70-80% reduction
        return Math.round(originalSizeKB * 0.25);
    }
}