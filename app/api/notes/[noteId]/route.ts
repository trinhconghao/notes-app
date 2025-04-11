// app/api/notes/[noteId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/client";
import { deleteNote, updateNote } from "@/utils/noteService";

type RouteContext = {
  params: {
    noteId: string;
  };
};

export async function PUT(
  request: NextRequest,
  context: RouteContext
) {
  const { noteId } = context.params;
  
  const supabase = createClient();

  // Lấy token từ header Authorization
  const token = request.headers.get("Authorization")?.replace("Bearer", "");

  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Xác thực user với token
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { newText } = await request.json();

  try {
    const updatedNote = await updateNote(noteId, user.id, newText);
    return NextResponse.json(updatedNote);
  } catch (error) {
    const err = error as Error;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  context: RouteContext
) {
  const { noteId } = context.params;
  const supabase = createClient();

  // Lấy token từ header Authorization
  const token = request.headers.get('Authorization')?.replace('Bearer', '');
  
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
  