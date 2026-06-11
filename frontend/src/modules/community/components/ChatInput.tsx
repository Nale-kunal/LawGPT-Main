import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Paperclip, Smile, Mic, X, AlertTriangle } from 'lucide-react';
import communityApi, { type Message } from '../services/communityApi';
import { useToast } from '@/hooks/use-toast';
import { logger } from '@/lib/logger';

interface ChatInputProps {
  onSend: (content: string, type: 'text' | 'image' | 'voice' | 'file', attachments?: any[]) => void;
  onTyping: () => void;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSend,
  onTyping,
  replyingTo = null,
  onCancelReply,
}) => {
  const [text, setText] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [voiceSeconds, setVoiceSeconds] = useState(0);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);
    onTyping();
  };

  const handleSend = () => {
    if (!text.trim()) return;
    onSend(text.trim(), 'text');
    setText('');
    if (onCancelReply) onCancelReply();
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSend();
    }
  };

  // ── File Upload via Cloudinary Signed Uploads ───────────────────────────────
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const isImage = file.type.startsWith('image/');
    const resourceType = isImage ? 'image' : 'raw';

    setUploading(true);
    try {
      // 1. Get backend signature and Cloudinary credentials
      const sigData = await communityApi.getUploadSignature(resourceType);

      // 2. Build FormData payload for Cloudinary direct upload
      const formData = new FormData();
      formData.append('file', file);
      formData.append('api_key', sigData.apiKey);
      formData.append('timestamp', String(sigData.timestamp));
      formData.append('signature', sigData.signature);
      formData.append('folder', sigData.folder);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/${resourceType}/upload`;

      const response = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Cloudinary direct upload failed');
      }

      const uploadResult = await response.json();

      // 3. Send file as attachment
      const attachment = {
        cloudinaryPublicId: uploadResult.public_id,
        secureUrl: uploadResult.secure_url,
        resourceType: uploadResult.resource_type,
        mimeType: file.type,
        sizeBytes: file.size,
        filename: file.name,
        thumbnailUrl: isImage ? uploadResult.secure_url : undefined,
      };

      onSend(isImage ? '📷 Sent an image' : `📎 Sent a file: ${file.name}`, isImage ? 'image' : 'file', [attachment]);
      
      toast({
        title: 'File Uploaded',
        description: `Successfully sent ${file.name}`,
      });
    } catch (err) {
      logger.error('File upload failed', err);
      toast({
        title: 'Upload Failed',
        description: 'Ensure Cloudinary environment is set up properly.',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Voice Messages via Web MediaRecorder ────────────────────────────────────
  const startRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({
        title: 'Unsupported',
        description: 'Microphone access is not supported by your browser.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const voiceFile = new File([audioBlob], 'voice-message.webm', { type: 'audio/webm' });

        setUploading(true);
        try {
          // Upload to Cloudinary as "video" resource type for proper audio processing
          const sigData = await communityApi.getUploadSignature('video');
          const formData = new FormData();
          formData.append('file', voiceFile);
          formData.append('api_key', sigData.apiKey);
          formData.append('timestamp', String(sigData.timestamp));
          formData.append('signature', sigData.signature);
          formData.append('folder', sigData.folder);

          const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${sigData.cloudName}/video/upload`;
          const response = await fetch(cloudinaryUrl, {
            method: 'POST',
            body: formData,
          });

          if (!response.ok) {
            throw new Error('Cloudinary voice upload failed');
          }

          const uploadResult = await response.json();

          const attachment = {
            cloudinaryPublicId: uploadResult.public_id,
            secureUrl: uploadResult.secure_url,
            resourceType: 'video',
            mimeType: 'audio/webm',
            sizeBytes: voiceFile.size,
            filename: 'Voice message.webm',
          };

          onSend('🎤 Sent a voice message', 'voice', [attachment]);
        } catch (err) {
          logger.error('Voice upload failed', err);
          toast({
            title: 'Voice Upload Failed',
            description: 'Could not send voice message.',
            variant: 'destructive',
          });
        } finally {
          setUploading(false);
        }

        // Close all tracks of audio stream
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setVoiceSeconds(0);

      recordingTimerRef.current = setInterval(() => {
        setVoiceSeconds(prev => prev + 1);
      }, 1000);

    } catch (err) {
      logger.error('Failed to start recording', err);
      toast({
        title: 'Microphone Blocked',
        description: 'Grant permission to record voice messages.',
        variant: 'destructive',
      });
    }
  };

  const stopRecording = (cancel: boolean = false) => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    if (cancel) {
      // Discard recorded chunks
      mediaRecorderRef.current.onstop = () => {
        logger.log('Recording cancelled');
      };
    }

    mediaRecorderRef.current.stop();
    setIsRecording(false);
  };

  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    };
  }, []);

  return (
    <div className="flex flex-col border-t bg-card/65 backdrop-blur-md px-3.5 py-3 gap-2">
      {/* Replying Block Header */}
      {replyingTo && (
        <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border-l-4 border-primary text-xs animate-in slide-in-from-bottom duration-200">
          <div className="flex flex-col min-w-0">
            <span className="font-bold text-[10px] text-primary">
              Replying to {typeof replyingTo.senderId === 'object' ? replyingTo.senderId.name : 'User'}
            </span>
            <span className="truncate text-muted-foreground">{replyingTo.content}</span>
          </div>
          {onCancelReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-5 w-5 hover:bg-muted"
              onClick={onCancelReply}
            >
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      {/* Input controls row */}
      <div className="flex items-center gap-2">
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="hidden"
          accept="image/*,application/pdf,application/msword,audio/*"
        />

        {!isRecording ? (
          <>
            {/* Attachment Button */}
            <Button
              variant="ghost"
              size="icon"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-primary transition-all duration-300"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </Button>

            {/* Input Field */}
            <Input
              placeholder={uploading ? 'Uploading attachment...' : 'Write your message...'}
              value={text}
              disabled={uploading}
              onChange={handleTextChange}
              onKeyPress={handleKeyPress}
              className="flex-1 h-9.5 text-xs md:text-sm bg-background border-border hover:border-accent hover:border-2 transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary rounded-xl"
            />

            {/* Voice record trigger */}
            <Button
              variant="ghost"
              size="icon"
              disabled={uploading}
              onClick={startRecording}
              className="h-9 w-9 rounded-full text-muted-foreground hover:bg-muted hover:text-primary transition-all duration-300"
            >
              <Mic className="h-4.5 w-4.5" />
            </Button>

            {/* Send Button */}
            <Button
              size="icon"
              disabled={!text.trim() || uploading}
              onClick={handleSend}
              className="h-9.5 w-9.5 rounded-full bg-primary hover:bg-primary/95 text-primary-foreground shadow-md transition-transform active:scale-95 duration-200"
            >
              <Send className="h-4 w-4" />
            </Button>
          </>
        ) : (
          /* Recording Interface */
          <div className="flex-1 flex items-center justify-between bg-muted/60 px-4 py-1.5 rounded-xl border animate-pulse">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-red-600 animate-ping" />
              <span className="text-xs font-semibold text-red-600 font-mono">
                Recording ({Math.floor(voiceSeconds / 60)}:{(voiceSeconds % 60).toString().padStart(2, '0')})
              </span>
            </div>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-[10px] text-destructive hover:bg-destructive/10 font-bold px-2 rounded-lg"
                onClick={() => stopRecording(true)}
              >
                Discard
              </Button>
              <Button
                size="sm"
                className="h-7 text-[10px] bg-red-600 hover:bg-red-700 text-white font-bold px-3 rounded-lg"
                onClick={() => stopRecording(false)}
              >
                Stop & Send
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatInput;
