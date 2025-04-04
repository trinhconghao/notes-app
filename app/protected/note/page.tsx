"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

export default function NotesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<any[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [emailToShare, setEmailToShare] = useState("");

  // Fetch notes and shared notes
  useEffect(() => {
    async function fetchNotes() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1️⃣ Lấy danh sách ghi chú do mình tạo
      const { data: myNotes, error: myNotesError } = await supabase
        .from("Note")
        .select("*")
        .eq("authorId", user.id);

      // 2️⃣ Lấy danh sách ID của các note được share với mình
      const { data: sharedNotesIds, error: sharedIdsError } = await supabase
        .from("notes_share")
        .select("noteId")
        .eq("sharedUserId", user.id);

      if (myNotesError || sharedIdsError) {
        console.error("Lỗi khi lấy dữ liệu:", myNotesError || sharedIdsError);
        return;
      }

      // 3️⃣ Nếu có note được share, lấy nội dung chi tiết
      let sharedNotes = [];
      if (sharedNotesIds.length > 0) {
        const { data: fetchedSharedNotes, error: sharedNotesError } = await supabase
          .from("Note")
          .select("*")
          .in("id", sharedNotesIds.map((n) => n.noteId));

        if (sharedNotesError) {
          console.error("Lỗi lấy note được share:", sharedNotesError);
          return;
        }
        sharedNotes = fetchedSharedNotes || [];
      }

      // 4️⃣ Gộp danh sách lại
      setNotes([...myNotes, ...sharedNotes]);
    }

    fetchNotes();
  }, []);

  // Realtime Subscription cho `Note` & `notes_share`
  useEffect(() => {
    const notesChannel = supabase
      .channel("realtime_notes")
      .on("postgres_changes", { event: "*", schema: "public", table: "Note" }, (payload) => {
        if (payload.eventType === "INSERT") {
          setNotes((prev) => [...prev, payload.new]);
        } else if (payload.eventType === "UPDATE") {
          setNotes((prev) =>
            prev.map((note) => (note.id === payload.new.id ? payload.new : note))
          );
        } else if (payload.eventType === "DELETE") {
          setNotes((prev) => prev.filter((note) => note.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(notesChannel);
    };
  }, []);

  // Lưu ghi chú (Tạo mới hoặc Cập nhật)
  const handleSave = async () => {
    if (!currentNote.trim()) return;

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Bạn cần đăng nhập!");
      return;
    }

    const token = session.access_token;

    if (selectedNote) {
      // Cập nhật ghi chú
      const { error } = await supabase
        .from("Note")
        .update({ text: currentNote })
        .eq("id", selectedNote.id);

      if (error) {
        console.error("Lỗi cập nhật ghi chú:", error);
      } else {
        setNotes((prev) =>
          prev.map((note) => (note.id === selectedNote.id ? { ...note, text: currentNote } : note))
        );
      }
    } else {
      // Tạo mới ghi chú
      const { error } = await supabase
        .from("Note")
        .insert([{ text: currentNote, authorId: session.user.id }]);

      if (error) {
        console.error("Lỗi tạo ghi chú:", error);
      }
    }

    // Reset form
    setSelectedNote(null);
    setCurrentNote("");
  };

  // Xóa ghi chú
  const handleDelete = async (id: string) => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert("Bạn cần đăng nhập để xóa ghi chú!");
      return;
    }

    const token = session.access_token;

    const res = await fetch(`/api/notes/${id}`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    });

    if (res.ok) {
      setNotes(notes.filter((note) => note.id !== id));
    }
  };

  // Chia sẻ ghi chú với email nhập vào
  const handleShare = async () => {
    if (!selectedNote || !emailToShare.trim()) return;

    // Tìm user theo email
    const { data: user, error } = await supabase
      .from("User")
      .select("id")
      .eq("email", emailToShare)
      .single();

    if (error || !user) {
      alert("Email này không tồn tại!");
      return;
    }

    // Ghi vào bảng `notes_share`
    const { error: shareError } = await supabase
      .from("notes_share")
      .insert([{ noteId: selectedNote.id, sharedUserId: user.id }]);

    if (shareError) {
      console.error("Lỗi khi chia sẻ ghi chú:", shareError);
      alert("Chia sẻ thất bại!");
    } else {
      alert("Chia sẻ thành công!");
      setEmailToShare("");
    }
  };

  // Xử lý khi chọn ghi chú
  const handleSelectNote = (note: any) => {
    if (selectedNote?.id === note.id) {
      // Nếu ghi chú đã được chọn, quay lại trạng thái tạo mới
      setSelectedNote(null);
      setCurrentNote(""); // Reset nội dung
    } else {
      // Chọn ghi chú và hiển thị nội dung
      setSelectedNote(note);
      setCurrentNote(note.text);
    }
  };

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-1/4 bg-gray-100 p-4 border-r">
        <h2 className="text-lg font-semibold mb-4">Danh sách ghi chú</h2>
        <ul className="space-y-2">
          {notes.map((note) => (
            <li
              key={note.id}
              className={`p-2 cursor-pointer rounded flex justify-between items-center ${
                selectedNote?.id === note.id ? "bg-blue-200" : "hover:bg-gray-200"
              }`}
            >
              <span
                onClick={() => handleSelectNote(note)}
                className="flex-1 cursor-pointer truncate"
              >
                {note.text}
              </span>
              <button
                onClick={() => handleDelete(note.id)}
                className="text-red-500 ml-2 p-1 rounded border hover:border-gray-400"
              >
                🗑️
              </button>
            </li>
          ))}
        </ul>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <h1 className="text-2xl font-bold mb-4">Ghi chú</h1>

        {/* Input ghi chú */}
        <textarea
          value={currentNote}
          onChange={(e) => setCurrentNote(e.target.value)}
          className="border p-2 rounded w-full h-40 resize-none"
        />
        <button onClick={handleSave} className="mt-2 bg-blue-500 text-white px-4 py-2 rounded w-full">
          {selectedNote ? "Lưu" : "Tạo"}
        </button>

        {/* Chia sẻ ghi chú */}
        {selectedNote && (
          <div className="mt-4">
            <input
              type="email"
              value={emailToShare}
              onChange={(e) => setEmailToShare(e.target.value)}
              className="border p-2 rounded w-full"
              placeholder="Nhập email để chia sẻ"
            />
            <button
              onClick={handleShare}
              className="mt-2 bg-green-500 text-white px-4 py-2 rounded w-full"
            >
              Chia sẻ
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
