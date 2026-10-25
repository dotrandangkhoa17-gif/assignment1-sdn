'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { useAuth } from '@/contexts/AuthContext';
import { getSupabaseClient } from '@/lib/supabase';

interface Sender {
  id: string;
  name: string;
  email: string;
}

interface Message {
  id: string;
  content: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  teamId: string;
  senderId: string;
  createdAt: string;
  sender: Sender;
}

interface OnlineUser {
  userId: string;
  name: string;
  onlineAt: string;
}

interface TeamChatProps {
  teamId: string;
  teamName: string;
}

export default function TeamChat({ teamId, teamName }: TeamChatProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [onlineMembers, setOnlineMembers] = useState<OnlineUser[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // File and image attachment states (Bonus 4.2)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Active chat room tracking so NotificationBell knows the user is currently reading this chat
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __ACTIVE_CHAT_TEAM_ID?: string | null }).__ACTIVE_CHAT_TEAM_ID = teamId;
      // Mark any pending notifications for this team as read
      fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      }).catch(() => {});
      window.dispatchEvent(new CustomEvent('notifications-updated'));
    }

    return () => {
      if (typeof window !== 'undefined') {
        (window as unknown as { __ACTIVE_CHAT_TEAM_ID?: string | null }).__ACTIVE_CHAT_TEAM_ID = null;
      }
    };
  }, [teamId]);

  // Fetch persisted message history
  const fetchMessages = useCallback(async (isInitial = false) => {
    try {
      const res = await fetch(`/api/teams/${teamId}/chat`);
      if (res.ok) {
        const data: Message[] = await res.json();
        setMessages((prev) => {
          if (
            prev.length === data.length &&
            prev[prev.length - 1]?.id === data[data.length - 1]?.id
          ) {
            return prev;
          }
          return data;
        });

        // Automatically clear any unread notifications for this team while viewing
        fetch('/api/notifications', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId }),
        }).catch(() => {});
        window.dispatchEvent(new CustomEvent('notifications-updated'));
      }
    } catch (err) {
      console.error('Failed to fetch chat messages:', err);
    } finally {
      if (isInitial) {
        setLoading(false);
      }
    }
  }, [teamId]);

  // Initial load + Fast polling interval (every 2 seconds) + Focus & visibility refresh
  useEffect(() => {
    fetchMessages(true);

    const interval = setInterval(() => {
      fetchMessages(false);
    }, 2000);

    const handleFocus = () => {
      fetchMessages(false);
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleFocus);
    };
  }, [fetchMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Supabase Realtime subscription for messages, presence, and typing
  useEffect(() => {
    if (!user) return;
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channelName = `realtime-team-${teamId}`;
    const channel = supabase.channel(channelName, {
      config: {
        presence: { key: user.id },
      },
    });
    channelRef.current = channel;

    // 1. Listen for incoming chat messages
    channel.on('broadcast', { event: 'chat-message' }, (payload) => {
      const newMsg = payload?.payload as Message;
      if (newMsg && newMsg.id) {
        setMessages((prev) => {
          if (prev.some((m) => m.id === newMsg.id)) return prev;
          return [...prev, newMsg];
        });
      }
    });

    // 2. Listen for typing events
    channel.on('broadcast', { event: 'typing' }, (payload) => {
      const { userName, isTyping, senderId } = payload?.payload || {};
      if (senderId === user.id) return;

      setTypingUsers((prev) => {
        if (isTyping) {
          if (!prev.includes(userName)) return [...prev, userName];
          return prev;
        } else {
          return prev.filter((name) => name !== userName);
        }
      });
    });

    // 3. Online Presence tracking (Bonus 4.1)
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const activeUsers: OnlineUser[] = [];
        for (const key in state) {
          const presences = state[key] as Array<{
            name?: string;
            onlineAt?: string;
          }>;
          if (presences && presences.length > 0) {
            activeUsers.push({
              userId: key,
              name: presences[0].name || 'User',
              onlineAt: presences[0].onlineAt || new Date().toISOString(),
            });
          }
        }
        setOnlineMembers(activeUsers);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            name: user.name,
            onlineAt: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [teamId, user]);

  // Presence & Typing status sync (Bonus 4.1)
  const syncPresence = useCallback(
    async (isTypingState = false) => {
      try {
        const res = await fetch(`/api/teams/${teamId}/presence`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ isTyping: isTypingState }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.onlineUsers && data.onlineUsers.length > 0) {
            setOnlineMembers(data.onlineUsers);
          }
          if (data.typingUsers) {
            setTypingUsers(data.typingUsers);
          }
        }
      } catch {
        // ignore
      }
    },
    [teamId]
  );

  useEffect(() => {
    syncPresence(false);
    const presenceInterval = setInterval(() => {
      syncPresence(false);
    }, 4000);

    return () => clearInterval(presenceInterval);
  }, [syncPresence]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setErrorMessage('File size exceeds maximum limit of 10MB');
      return;
    }

    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setFilePreview(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreview(null);
    }
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFilePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!inputText.trim() && !selectedFile) || sending || uploading) return;

    const messageContent = inputText.trim();
    setInputText('');
    setSending(true);
    setErrorMessage(null);

    // Stop typing broadcast immediately
    broadcastTyping(false);
    syncPresence(false);

    let uploadedAttachment: { url: string; name: string; type: string } | null = null;

    try {
      if (selectedFile) {
        setUploading(true);
        const formData = new FormData();
        formData.append('file', selectedFile);

        const uploadRes = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!uploadRes.ok) {
          const errData = await uploadRes.json().catch(() => ({}));
          throw new Error(errData.error || 'Failed to upload attachment');
        }

        uploadedAttachment = await uploadRes.json();
      }

      const res = await fetch(`/api/teams/${teamId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: messageContent,
          attachmentUrl: uploadedAttachment?.url,
          attachmentType: uploadedAttachment?.type,
          attachmentName: uploadedAttachment?.name,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to send message');
      }

      const createdMessage = await res.json();
      removeSelectedFile();

      // Optimistically add to local state
      setMessages((prev) => {
        if (prev.some((m) => m.id === createdMessage.id)) return prev;
        return [...prev, createdMessage];
      });

      // Broadcast to other team members via Supabase Realtime
      if (channelRef.current) {
        channelRef.current.send({
          type: 'broadcast',
          event: 'chat-message',
          payload: createdMessage,
        });
      }
    } catch (err: unknown) {
      console.error('Failed to send message:', err);
      const msg = err instanceof Error ? err.message : 'Failed to send message';
      setErrorMessage(msg);
      setInputText(messageContent);
    } finally {
      setSending(false);
      setUploading(false);
    }
  };

  const broadcastTyping = (isTyping: boolean) => {
    if (!user) return;
    if (channelRef.current) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: {
          senderId: user.id,
          userName: user.name,
          isTyping,
        },
      });
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (errorMessage) setErrorMessage(null);
    setInputText(e.target.value);

    // Trigger typing event
    broadcastTyping(true);
    syncPresence(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      broadcastTyping(false);
      syncPresence(false);
    }, 2000);
  };

  const formatMessageTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="team-chat-container" id="team-chat-panel">
      {/* Chat Header */}
      <div className="team-chat-header">
        <div className="team-chat-info">
          <div className="chat-team-title">
            <span className="chat-icon">💬</span>
            <h3>#{teamName} Team Room</h3>
          </div>
          <span className="chat-subtitle">
            Real-time team collaboration with persisted message history
          </span>
        </div>

        {/* Online Presence Status (Bonus 4.1) */}
        <div className="chat-presence-status" id="chat-presence">
          <span className="online-indicator-dot"></span>
          <span className="online-count">
            {onlineMembers.length > 0 ? `${onlineMembers.length} online` : '1 active'}
          </span>
          <div className="online-avatars">
            {onlineMembers.slice(0, 4).map((m) => (
              <span
                key={m.userId}
                className="online-mini-avatar"
                title={`${m.name} is currently online`}
              >
                {m.name.charAt(0).toUpperCase()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Messages Scroll Area */}
      <div className="team-chat-messages" id="chat-message-list">
        {loading ? (
          <div className="chat-loading-state">
            <div className="spinner"></div>
            <p>Loading team chat history...</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty-state">
            <span className="chat-empty-icon">💬</span>
            <h4>Welcome to #{teamName} team chat!</h4>
            <p>Send a message below to start collaborating with your team in real time.</p>
          </div>
        ) : (
          messages.map((msg, index) => {
            const isMe = msg.senderId === user?.id;
            const prevMsg = messages[index - 1];
            const isSameSender = prevMsg && prevMsg.senderId === msg.senderId;

            return (
              <div
                key={msg.id}
                className={`chat-message-row ${isMe ? 'my-message' : 'other-message'} ${
                  isSameSender ? 'same-sender' : ''
                }`}
              >
                {!isMe && !isSameSender && (
                  <div className="chat-avatar" title={msg.sender.name}>
                    {msg.sender.name.charAt(0).toUpperCase()}
                  </div>
                )}
                {!isMe && isSameSender && <div className="chat-avatar-spacer" />}

                <div className="chat-bubble-wrap">
                  {!isMe && !isSameSender && (
                    <span className="chat-sender-name">{msg.sender.name}</span>
                  )}
                  <div className="chat-bubble">
                    {/* Attachment rendering (Bonus 4.2) */}
                    {msg.attachmentUrl && (
                      <div
                        className="chat-attachment-item"
                        style={{ marginBottom: msg.content ? '8px' : '0' }}
                      >
                        {msg.attachmentType === 'IMAGE' ? (
                          <a
                            href={msg.attachmentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="Click to view full image"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={msg.attachmentUrl}
                              alt={msg.attachmentName || 'Image'}
                              style={{
                                maxWidth: '260px',
                                maxHeight: '200px',
                                borderRadius: '8px',
                                objectFit: 'cover',
                                display: 'block',
                                border: '1px solid rgba(255, 255, 255, 0.15)',
                              }}
                            />
                          </a>
                        ) : (
                          <a
                            href={msg.attachmentUrl}
                            download={msg.attachmentName || 'file'}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              padding: '8px 12px',
                              backgroundColor: 'rgba(0, 0, 0, 0.3)',
                              borderRadius: '8px',
                              border: '1px solid rgba(255, 255, 255, 0.12)',
                              color: '#fff',
                              textDecoration: 'none',
                              fontSize: '0.85rem',
                            }}
                          >
                            <span style={{ fontSize: '1.4rem' }}>📎</span>
                            <div
                              style={{
                                display: 'flex',
                                flexDirection: 'column',
                                minWidth: 0,
                              }}
                            >
                              <span
                                style={{
                                  fontWeight: 600,
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap',
                                  maxWidth: '180px',
                                }}
                              >
                                {msg.attachmentName || 'Download file'}
                              </span>
                              <span
                                style={{ fontSize: '0.75rem', color: '#94a3b8' }}
                              >
                                Click to download
                              </span>
                            </div>
                          </a>
                        )}
                      </div>
                    )}
                    {msg.content && <p className="chat-bubble-text">{msg.content}</p>}
                    <span className="chat-bubble-time">
                      {formatMessageTime(msg.createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Typing indicator (Bonus 4.1) */}
        {typingUsers.length > 0 && (
          <div className="chat-typing-indicator" id="chat-typing-indicator">
            <div className="typing-dots">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <span className="typing-text">
              {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* File Attachment Preview before send (Bonus 4.2) */}
      {selectedFile && (
        <div
          className="chat-selected-file-preview"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '8px 16px',
            backgroundColor: 'rgba(99, 102, 241, 0.12)',
            borderTop: '1px solid rgba(99, 102, 241, 0.25)',
          }}
        >
          {filePreview ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={filePreview}
              alt="Preview"
              style={{
                width: '42px',
                height: '42px',
                borderRadius: '6px',
                objectFit: 'cover',
                border: '1px solid rgba(255, 255, 255, 0.2)',
              }}
            />
          ) : (
            <span style={{ fontSize: '1.6rem' }}>📄</span>
          )}
          <div style={{ flex: 1, minWidth: 0 }}>
            <p
              style={{
                margin: 0,
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#fff',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {selectedFile.name}
            </p>
            <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
              {(selectedFile.size / 1024).toFixed(1)} KB
            </span>
          </div>
          <button
            type="button"
            onClick={removeSelectedFile}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              cursor: 'pointer',
              fontSize: '1.2rem',
              fontWeight: 'bold',
              lineHeight: 1,
            }}
            title="Remove attachment"
          >
            ✕
          </button>
        </div>
      )}

      {/* Error notification if sending failed */}
      {errorMessage && (
        <div
          className="chat-error-toast"
          style={{
            padding: '8px 16px',
            backgroundColor: 'rgba(239, 68, 68, 0.15)',
            color: '#f87171',
            fontSize: '0.85rem',
            borderTop: '1px solid rgba(239, 68, 68, 0.25)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>⚠️ {errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            style={{
              background: 'none',
              border: 'none',
              color: '#f87171',
              cursor: 'pointer',
              fontSize: '1rem',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>
      )}

      {/* Chat Input Bar */}
      <form
        className="team-chat-input-bar"
        onSubmit={handleSendMessage}
        id="chat-send-form"
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          id="chat-file-upload-input"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={sending || uploading}
          title="Attach image or file"
          style={{
            background: 'rgba(255, 255, 255, 0.08)',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            color: '#fff',
            borderRadius: '99px',
            padding: '0.6rem 0.85rem',
            cursor: 'pointer',
            fontSize: '1.1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
          }}
        >
          📎
        </button>

        <input
          type="text"
          className="chat-text-input"
          placeholder={
            selectedFile
              ? `Add a caption for ${selectedFile.name}...`
              : `Message #${teamName}... (Press Enter to send)`
          }
          value={inputText}
          onChange={handleInputChange}
          disabled={sending || uploading}
          id="chat-input"
          autoComplete="off"
        />
        <button
          type="submit"
          className="chat-send-button"
          disabled={(!inputText.trim() && !selectedFile) || sending || uploading}
          id="chat-send-btn"
        >
          {uploading ? 'Uploading...' : sending ? '...' : 'Send ➔'}
        </button>
      </form>
    </div>
  );
}
