"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client"; // Import client từ client.ts
import { Button } from "@/components/ui/button";

const supabase = createClient();

export default function AvatarPage() {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error || !user) {
        console.error("Error fetching user:", error?.message || "No user found");
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("avatar_url")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching avatar:", profileError.message);
      } else {
        setAvatarUrl(data?.avatar_url);
      }
    };
    fetchUser();
  }, []);

  const uploadAvatar = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!event.target.files || event.target.files.length === 0) return;
  
    setUploading(true);
    const file = event.target.files[0];
  
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
      console.error("Error fetching user:", error?.message || "No user found");
      setUploading(false);
      return;
    }
  
    const fileExt = file.name.split(".").pop();
    const timestamp = new Date().toISOString().replace(/[-:.]/g, ""); // Tạo timestamp YYYYMMDDTHHMMSS
    const fileName = `${user.id}_${timestamp}.${fileExt}`;
    const filePath = `avatars/${fileName}`;
  
    // Xóa ảnh cũ nếu có
    if (avatarUrl) {
      const oldPath = avatarUrl.split("/avatars/")[1];
      await supabase.storage.from("avatars").remove([oldPath]);
    }
  
    // Upload file
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file, { upsert: true });
  
    if (uploadError) {
      console.error("Upload failed:", uploadError.message);
      setUploading(false);
      return;
    }
  
    // Lấy URL công khai
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filePath);
    const publicUrl = urlData.publicUrl;
  
    if (!publicUrl) {
      console.error("Error: Public URL is empty");
      setUploading(false);
      return;
    }
  
    // Cập nhật profile
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicUrl })
      .eq("id", user.id);
  
    if (updateError) {
      console.error("Error updating profile:", updateError.message);
    } else {
      setAvatarUrl(publicUrl);
    }
  
    setUploading(false);
  };
  
  

  return (
    <div className="flex flex-col items-center gap-4">
      {avatarUrl ? (
        <img src={avatarUrl} alt="Avatar" className="w-32 h-32 rounded-full border" />
      ) : (
        <div className="w-32 h-32 bg-gray-300 rounded-full" />
      )}
      <input type="file" accept="image/*" onChange={uploadAvatar} disabled={uploading} />
      <Button onClick={() => document.querySelector('input')?.click()} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload Avatar"}
      </Button>
    </div>
  );
}
