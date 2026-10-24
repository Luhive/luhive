import { useRef, useState, type ChangeEvent } from "react";
import { ArrowUp, Camera } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ImageCropDialog } from "~/shared/components/image-crop-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "~/shared/components/ui/avatar";
import { createClient } from "~/shared/lib/supabase/client";
import { currentUserKey } from "~/shared/lib/query/query-keys";
import { uploadProfilePhoto } from "~/shared/lib/storage/object-storage.client";
import { getCroppedImg, type CroppedAreaPixels } from "~/shared/lib/utils/image-crop";
import type { Profile } from "~/shared/models/entity.types";

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];
const PHOTO_HINT = "Square photo. JPG, PNG, or WebP, under 2 MB.";
const STORED_USER_KEY = "luhive_user_data";

type ProfilePhotoProps = {
  userId: string;
  fullName: string | null;
  avatarUrl: string | null;
  onAvatarChange: (avatarUrl: string) => void;
  badge?: "camera" | "upload";
};

function getInitials(fullName: string | null) {
  if (!fullName) return "";
  return fullName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function rememberAvatar(avatarUrl: string) {
  const stored = window.localStorage.getItem(STORED_USER_KEY);
  if (!stored) return;
  try {
    const parsed = JSON.parse(stored) as { avatar_url?: string | null };
    window.localStorage.setItem(
      STORED_USER_KEY,
      JSON.stringify({ ...parsed, avatar_url: avatarUrl }),
    );
  } catch {
    window.localStorage.removeItem(STORED_USER_KEY);
  }
}

export function ProfilePhoto({
  userId,
  fullName,
  avatarUrl,
  onAvatarChange,
  badge = "camera",
}: ProfilePhotoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CroppedAreaPixels | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileSelect(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("File size must be less than 2 MB");
      return;
    }
    if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WebP image");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setSelectedImage(typeof reader.result === "string" ? reader.result : null);
      setCroppedAreaPixels(null);
    };
    reader.readAsDataURL(file);
  }

  async function handleSave() {
    if (!selectedImage || !croppedAreaPixels) return;

    setIsUploading(true);
    setUploadProgress(12);
    try {
      const cropped = await getCroppedImg(selectedImage, croppedAreaPixels);
      setUploadProgress(40);
      const file = new File([cropped], `avatar-${Date.now()}.jpg`, { type: "image/jpeg" });
      const uploaded = await uploadProfilePhoto(file, userId);
      setUploadProgress(75);

      if (!uploaded.success || !uploaded.url) {
        toast.error(uploaded.error || "Upload failed");
        return;
      }

      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update({ avatar_url: uploaded.url })
        .eq("id", userId);

      if (error) {
        toast.error("Photo uploaded but could not be saved");
        return;
      }

      rememberAvatar(uploaded.url);
      queryClient.setQueryData<Profile | null>(currentUserKey, (current) =>
        current ? { ...current, avatar_url: uploaded.url ?? current.avatar_url } : (current ?? null),
      );
      onAvatarChange(uploaded.url);
      setUploadProgress(100);
      setSelectedImage(null);
      toast.success("Photo updated");
    } catch (error) {
      console.error("Profile photo upload failed:", error);
      toast.error("Failed to process image. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }

  return (
    <>
      <div className="group relative shrink-0">
        <Avatar className="size-[88px] shadow-[inset_0_0_0_0.5px_rgba(17,17,17,0.08)] ring-2 ring-white">
          <AvatarImage src={avatarUrl || undefined} alt="" referrerPolicy="no-referrer" />
          <AvatarFallback className="bg-[#efeae4] text-[22px] font-medium text-[#111]">
            {getInitials(fullName) || "•"}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          aria-label="Change photo"
          onClick={openFilePicker}
          className={
            badge === "upload"
              ? "absolute right-0 bottom-0 flex size-8 items-center justify-center rounded-full bg-[#111] text-white outline-none ring-2 ring-white transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-[#2a2a2a] focus-visible:ring-[#111]/30 active:scale-[0.97]"
              : "absolute top-full left-1/2 flex size-7 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-[#111] text-white outline-none ring-2 ring-white transition-[opacity,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-focus-within:scale-100 group-focus-within:opacity-100 hover:bg-[#2a2a2a] focus-visible:ring-[#111]/30 active:scale-[0.97] [@media(hover:hover)]:scale-90 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:scale-100 [@media(hover:hover)]:group-hover:opacity-100"
          }
        >
          {badge === "upload" ? (
            <ArrowUp className="size-4" strokeWidth={2.25} aria-hidden />
          ) : (
            <Camera className="size-3.5" strokeWidth={2.25} aria-hidden />
          )}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={handleFileSelect}
        />
      </div>

      <ImageCropDialog
        open={selectedImage !== null}
        onOpenChange={(open) => {
          if (!open && !isUploading) setSelectedImage(null);
        }}
        imageSrc={selectedImage}
        aspect={1}
        title="Profile photo"
        hint={PHOTO_HINT}
        isProcessing={isUploading}
        uploadProgress={uploadProgress}
        onCropComplete={setCroppedAreaPixels}
        onSave={handleSave}
        onCancel={() => {
          if (!isUploading) setSelectedImage(null);
        }}
        saveLabel="Save photo"
      />
    </>
  );
}
