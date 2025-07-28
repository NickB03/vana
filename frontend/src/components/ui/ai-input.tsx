'use client';

import {
  AIInput,
  AIInputButton,
  AIInputSubmit,
  AIInputTextarea,
  AIInputToolbar,
  AIInputTools,
} from '@/components/ui/kibo-ui/ai/input';
import { PlusIcon } from 'lucide-react';
import React, { type FormEventHandler, useState } from 'react';

export interface AIInputProps {
  placeholder?: string
  onSend?: (value: string) => void
  onFileUpload?: (files: FileList) => void
  disabled?: boolean
  showTools?: boolean
}

export function AIInputComponent({ 
  placeholder = "What would you like to know?",
  onSend,
  onFileUpload,
  disabled = false
}: AIInputProps) {
  const [text, setText] = useState<string>('');
  const [status, setStatus] = useState<
    'submitted' | 'streaming' | 'ready' | 'error'
  >('ready');
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0 && onFileUpload) {
      onFileUpload(files);
    }
    // Reset the input so the same file can be selected again
    event.target.value = '';
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault();

    if (!text || disabled) {
      return;
    }

    if (onSend) {
      onSend(text);
    }

    setStatus('submitted');
    setText('');

    setTimeout(() => {
      setStatus('streaming');
    }, 200);

    setTimeout(() => {
      setStatus('ready');
    }, 2000);
  };

  return (
    <AIInput onSubmit={handleSubmit}>
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.txt,.png,.jpg,.jpeg,.gif,.csv,.xlsx,.xls"
        onChange={handleFileChange}
        className="hidden"
      />
      
      <AIInputTextarea 
        onChange={(e) => setText(e.target.value)} 
        value={text}
        placeholder={placeholder}
        disabled={disabled}
      />
      <AIInputToolbar>
        <AIInputTools>
          <AIInputButton 
            disabled={disabled}
            onClick={handleFileUpload}
            type="button"
          >
            <PlusIcon size={16} />
          </AIInputButton>

        </AIInputTools>
        <AIInputSubmit disabled={!text || disabled} status={status} />
      </AIInputToolbar>
    </AIInput>
  );
}

export { AIInputComponent as AIInput };