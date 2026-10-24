"use client";

import { createClient as createBrowserClient } from '~/shared/lib/supabase/client';

export interface UploadResult {
  success: boolean;
  url?: string;
  error?: string;
  path?: string;
}

export interface StorageConfig {
  bucket: string;
  folder?: string;
  maxFileSize?: number; // in bytes
  allowedTypes?: string[];
}

export class ObjectStorageService {
  private supabase;
  private defaultConfig: StorageConfig = {
    bucket: "community-profile-pictures",
    maxFileSize: 5 * 1024 * 1024, // 5MB
    allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  };

  constructor() {
    // Only create client in browser environment
    if (typeof window !== "undefined") {
      this.supabase = createBrowserClient();
    } else {
      throw new Error(
        "ObjectStorageService can only be used in browser environment"
      );
    }
  }

  /**
   * Upload a file to Supabase Storage
   */
  async uploadFile(
    file: File,
    config: Partial<StorageConfig> = {}
  ): Promise<UploadResult> {
    try {
      const finalConfig = { ...this.defaultConfig, ...config };

      // Validate file
      const validation = this.validateFile(file, finalConfig);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }

      // Generate unique filename
      const fileExtension = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()
        .toString(36)
        .substring(2)}.${fileExtension}`;
      const filePath = finalConfig.folder
        ? `${finalConfig.folder}/${fileName}`
        : fileName;

      // Upload to Supabase Storage
      const { data, error } = await this.supabase.storage
        .from(finalConfig.bucket)
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.log(error);
        return { success: false, error: error.message };
      }

      // Get public URL
      const { data: urlData } = this.supabase.storage
        .from(finalConfig.bucket)
        .getPublicUrl(filePath);

      return {
        success: true,
        url: urlData.publicUrl,
        path: filePath,
      };
    } catch (error) {
      console.log(error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Upload failed",
      };
    }
  }

  /**
   * Delete a file from Supabase Storage
   */
  async deleteFile(bucket: string, path: string): Promise<UploadResult> {
    try {
      const { error } = await this.supabase.storage.from(bucket).remove([path]);

      if (error) {
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Delete failed",
      };
    }
  }

  /**
   * Get public URL for a file
   */
  getPublicUrl(bucket: string, path: string): string {
    const { data } = this.supabase.storage.from(bucket).getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Validate file before upload
   */
  private validateFile(
    file: File,
    config: StorageConfig
  ): { valid: boolean; error?: string } {
    // Check file size
    if (file.size > config.maxFileSize!) {
      return {
        valid: false,
        error: `File size must be less than ${Math.round(
          config.maxFileSize! / 1024 / 1024
        )}MB`,
      };
    }

    // Check file type
    if (config.allowedTypes && !config.allowedTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${
          file.type
        } is not allowed. Allowed types: ${config.allowedTypes.join(", ")}`,
      };
    }

    return { valid: true };
  }

  async uploadProfilePhoto(file: File, userId: string): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: "community-profile-pictures",
      folder: `avatars/${userId}`,
      maxFileSize: 2 * 1024 * 1024,
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  }

  /**
   * Upload community logo
   */
  async uploadCommunityLogo(
    file: File,
    communitySlug: string
  ): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: "community-profile-pictures",
      folder: `logos/${communitySlug}`,
      maxFileSize: 2 * 1024 * 1024, // 2MB for logos
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  }

  /**
   * Delete community logo
   */
  async deleteCommunityLogo(
    communitySlug: string,
    logoPath: string
  ): Promise<UploadResult> {
    return this.deleteFile("community-profile-pictures", logoPath);
  }

  /**
   * Upload community cover picture
   */
  async uploadCommunityCover(
    file: File,
    communitySlug: string
  ): Promise<UploadResult> {
    return this.uploadFile(file, {
      bucket: "community-profile-pictures",
      folder: `covers/${communitySlug}`,
      maxFileSize: 2 * 1024 * 1024, // 2MB for covers (LinkedIn standard)
      allowedTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  }

  /**
   * Delete community cover picture
   */
  async deleteCommunityCover(
    communitySlug: string,
    coverPath: string
  ): Promise<UploadResult> {
    return this.deleteFile("community-profile-pictures", coverPath);
  }
}

// Export utility functions for client-side usage
export const uploadProfilePhoto = (file: File, userId: string) => {
  const storage = new ObjectStorageService();
  return storage.uploadProfilePhoto(file, userId);
};

export const uploadCommunityLogo = (file: File, communitySlug: string) => {
  const storage = new ObjectStorageService();
  return storage.uploadCommunityLogo(file, communitySlug);
};

export const deleteCommunityLogo = (
  communitySlug: string,
  logoPath: string
) => {
  const storage = new ObjectStorageService();
  return storage.deleteCommunityLogo(communitySlug, logoPath);
};

export const getPublicUrl = (bucket: string, path: string) => {
  const storage = new ObjectStorageService();
  return storage.getPublicUrl(bucket, path);
};

export const uploadCommunityCover = (file: File, communitySlug: string) => {
  const storage = new ObjectStorageService();
  return storage.uploadCommunityCover(file, communitySlug);
};

export const deleteCommunityCover = (
  communitySlug: string,
  coverPath: string
) => {
  const storage = new ObjectStorageService();
  return storage.deleteCommunityCover(communitySlug, coverPath);
};
