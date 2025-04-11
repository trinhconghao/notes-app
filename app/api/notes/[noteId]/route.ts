// app/api/notes/[noteId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/client";
import { deleteNote, updateNote } from "@/utils/noteService";

export async function PUT(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  const { noteId } = params;
  
  const supabase = createClient();

  // Lấy token từ header Authorization
  const token = req.headers.get("Authorization")?.replace("Bearer", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Xác thực user với token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newText } = await req.json();

  try {
    const updatedNote = await updateNote(noteId, user.id, newText);
    return NextResponse.json(updatedNote);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { noteId: string } }
) {
  const { noteId } = params;
  const supabase = createClient();

  // Lấy token từ header Authorization
  const token = req.headers.get('Authorization')?.replace('Bearer', '');
  
  if (!token) {
    return NextResponse.json({ error: "Unauthorized: No token provided" }, { status: 401 });
  }

  // Xác thực user với token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Thực hiện xóa ghi chú
    const deletedNote = await deleteNote(noteId, user.id);
    if (!deletedNote) {
      throw new Error("Failed to delete note");
    }
    return NextResponse.json(deletedNote);
  } catch (error) {
    const err = error as Error;
    console.error("Error in DELETE API:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
  