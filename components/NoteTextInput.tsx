// components/NoteTextInput.tsx
"use client"; // Add this directive at the top of the file

import React from "react";

interface NoteTextInputProps {
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  placeholder: string;
}

const NoteTextInput: React.FC<NoteTextInputProps> = ({
  value,
  onChange,
  disabled,
  placeholder,
}) => {
  return (
    <textarea
      value={value}
      onChange={onChange}
      className="border p-2 rounded w-full h-40"
      disabled={disabled}
      placeholder={placeholder}
    />
  );
};

export default NoteTextInput;
