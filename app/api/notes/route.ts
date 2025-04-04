import { NextResponse } from "next/server";
import { getNotesByUser, createNote, updateNote, deleteNote } from "@/utils/noteService";
import { createClient } from "@/utils/supabase/server";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const notes = await getNotesByUser(user.id);
    return NextResponse.json(notes);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const supabase = await createClient();
  
  // Lấy thông tin người dùng từ Supabase Auth
  console.log("Fetching user from Supabase...");
  const { data: { user }, error } = await supabase.auth.getUser();

  // Kiểm tra nếu không có người dùng hoặc có lỗi khi lấy thông tin người dùng
  if (error || !user) {
    console.log("Error fetching user or user not authenticated:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Lấy dữ liệu từ body của request
  const { text } = await req.json();
  console.log("Creating note with text:", text);

  try {
    // Gọi hàm createNote để tạo note mới
    const note = await createNote(user.id, text);
    console.log("Note created successfully:", note);
    return NextResponse.json(note, { status: 201 });
  } catch (err) {
    // Xử lý lỗi và trả về thông báo lỗi
    console.log("Error creating note:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// export async function PUT(req: Request, { params }) {
//   const { noteId } = params;  // Lấy noteId từ URL
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();

//   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { newText } = await req.json();
//   try {
//     const updatedNote = await updateNote(noteId, user.id, newText);  // Cập nhật note
//     return NextResponse.json(updatedNote);
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }

// export async function DELETE(req: Request) {
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();

//   if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

//   const { noteId } = await req.json();
//   try {
//     const deletedNote = await deleteNote(noteId, user.id);
//     return NextResponse.json(deletedNote);
//   } catch (error) {
//     return NextResponse.json({ error: error.message }, { status: 500 });
//   }
// }
