import { createClient } from "./supabase/server";

// Lấy danh sách ghi chú của user
export const getNotesByUser = async (authId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Note")
    .select("*")
    .eq("authorId", authId);

  if (error) throw new Error(error.message);
  return data;
};

// Tạo ghi chú mới
export const createNote = async (authId: string, text: string) => {
  const supabase = await createClient();

  // Tạo một id ngẫu nhiên (sử dụng crypto hoặc tự tạo chuỗi ngẫu nhiên)
  const randomId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);  // Tạo một id ngẫu nhiên dài

  // Chèn note mới với id ngẫu nhiên
  const { data, error } = await supabase
    .from("Note")
    .insert([{ id: randomId, authorId: authId, text }])
    .select()
    .single();

  // Kiểm tra lỗi và ném lỗi nếu có
  if (error) {
    console.error("Error creating note:", error);  // Log lỗi để xem chi tiết
    throw new Error(error.message);
  }

  return data;  // Trả về dữ liệu của note đã tạo
};

// Cập nhật ghi chú
// utils/noteService.ts
export const updateNote = async (noteId: string, authId: string, newText: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("Note")
    .update({ text: newText })
    .eq("id", noteId)
    .eq("authorId", authId)
    .select()
    .single();

  if (error) {
    console.error("Error updating note:", error.message);  // Log lỗi để dễ dàng debug
    throw new Error(error.message);
  }
  return data;
};


// Xóa ghi chú
export const deleteNote = async (noteId: string, authId: string) => {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("Note")
    .delete()
    .eq("id", noteId)
    .eq("authorId", authId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
};
