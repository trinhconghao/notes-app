"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/utils/supabase/client";

// Debounce function
function debounce(func: Function, wait: number) {
  let timeout: NodeJS.Timeout;
  return function executedFunction(...args: any[]) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default function NotesPage() {
  const supabase = createClient();
  const [notes, setNotes] = useState<any[]>([]);
  const [currentNote, setCurrentNote] = useState("");
  const [selectedNote, setSelectedNote] = useState<{ id: number; text: string } | null>(null);
  const [user, setUser] = useState<any>(null);

  // Lấy thông tin user
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) setUser(data.user);
    };
    fetchUser();
  }, []);

  // Fetch notes
  useEffect(() => {
    const fetchNotes = async () => {
      if (!user) return;
      
      // Lấy ghi chú của mình
      const { data: myNotes, error: myNotesError } = await supabase
        .from("Note")
        .select("*")
        .eq("authorId", user.id);

      if (myNotesError) {
        console.error("Lỗi lấy note:", myNotesError);
        return;
      }

      // Lấy ghi chú được share với mình
      const { data: sharedNotesIds, error: sharedIdsError } = await supabase
        .from("notes_share")
        .select("noteId")
        .eq("sharedUserId", user.id);

      if (sharedIdsError) {
        console.error("Lỗi lấy note được share:", sharedIdsError);
        return;
      }

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

      setNotes([...myNotes, ...sharedNotes]);
    };

    fetchNotes();
  }, [user]);

  // Realtime Subscription cho `Note`
  useEffect(() => {
    const channel = supabase
      .channel("notes")
      .on("postgres_changes", { event: "*", schema: "public", table: "Note" }, (payload) => {
        setNotes((prev) => {
          if (payload.eventType === "INSERT") {
            return [...prev, payload.new];
          } else if (payload.eventType === "UPDATE") {
            return prev.map((note) =>
              note.id === payload.new.id ? payload.new : note
            );
          } else if (payload.eventType === "DELETE") {
            return prev.filter((note) => note.id !== payload.old.id);
          }
          return prev;
        });

        // Nếu note đang được chọn bị sửa thì cập nhật textarea
        if (selectedNote && payload.new && "id" in payload.new && payload.new.id === selectedNote.id) {
            setCurrentNote(payload.new.text);
        }

      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedNote]);

  // Debounced function to update Supabase
  const debouncedUpdateSupabase = useCallback(
    debounce(async (noteId: number, text: string) => {
      await supabase.from("Note").update({ text }).eq("id", noteId);
    }, 1000),
    []
  );

  // Chọn ghi chú
  const handleSelectNote = (note: any) => {
    if (selectedNote?.id === note.id) {
      // Nếu đã chọn rồi thì bỏ chọn
      setSelectedNote(null);
      setCurrentNote("");
    } else {
      // Chọn ghi chú và hiển thị nội dung
      setSelectedNote(note);
      setCurrentNote(note.text);
    }
  };

  // Khi người dùng nhập, cập nhật ngay lên Supabase
  const handleNoteChange = async (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const text = e.target.value;
    setCurrentNote(text);

    if (selectedNote) {
      debouncedUpdateSupabase(selectedNote.id, text);
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
          onChange={handleNoteChange}
          className="border p-2 rounded w-full h-40"
          disabled={!selectedNote}
          placeholder="Chọn một ghi chú để chỉnh sửa..."
        />
      </main>
    </div>
  );
}
