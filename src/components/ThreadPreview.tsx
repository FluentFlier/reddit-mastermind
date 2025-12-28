'use client';

import { Post, Comment, Persona } from '@/types';
import { PersonaAvatar, PersonaBadge } from './PersonaAvatar';
import { QualityBadge } from './QualityBadge';
import { formatDisplayTime } from '@/lib/utils';
import { MessageSquare, Clock, ChevronUp, ChevronDown, Edit2, X } from 'lucide-react';
import { useState } from 'react';

interface ThreadPreviewProps {
  post: Post;
  comments: Comment[];
  personas: Persona[];
  onEdit?: (type: 'post' | 'comment', id: string, content: string) => void;
  onRegenerate?: (post: Post, notes?: string) => void;
  onUpdatePostStatus?: (postId: string, status: Post['status']) => void;
  onUpdateCommentStatus?: (commentId: string, status: Comment['status']) => void;
  onUpdatePostNotes?: (postId: string, notes: string) => void;
  onClose?: () => void;
}

export function ThreadPreview({ 
  post, 
  comments, 
  personas,
  onEdit,
  onRegenerate,
  onUpdatePostStatus,
  onUpdateCommentStatus,
  onUpdatePostNotes,
  onClose,
}: ThreadPreviewProps) {
  const [notes, setNotes] = useState(post.reviewNotes || '');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [regenNotes, setRegenNotes] = useState('');
  
  const opPersona = personas.find(p => p.id === post.personaId);
  
  const getPersona = (personaId: string) => 
    personas.find(p => p.id === personaId);
  
  const handleStartEdit = (id: string, currentContent: string) => {
    setEditingId(id);
    setEditContent(currentContent);
  };
  
  const handleSaveEdit = (type: 'post' | 'comment', id: string) => {
    if (onEdit) {
      onEdit(type, id, editContent);
    }
    setEditingId(null);
    setEditContent('');
  };
  
  return (
    <div className="rounded-2xl border border-[#e5e5e5] bg-white shadow-sm overflow-hidden dark:border-white/10 dark:bg-[#18181b]">
      {/* Header */}
      <div className="px-5 py-4 bg-[#f5f5f5] border-b border-[#e5e5e5] flex flex-wrap items-center justify-between gap-4 dark:border-white/10 dark:bg-[#0f0f0f]">
        <div className="flex items-center flex-wrap gap-2 min-w-0">
          <span className="text-sm font-semibold text-[#f97316]">
            {post.subredditName}
          </span>
          <span className="text-gray-300 dark:text-white/20">•</span>
          <span className="text-sm text-slate-500 dark:text-white/60">
            {formatDisplayTime(new Date(post.scheduledAt))}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            post.status === 'approved'
              ? 'bg-green-100 text-green-700 dark:bg-emerald-500/20 dark:text-emerald-200'
              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60'
          }`}>
            {post.status}
          </span>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          {post.qualityScore !== undefined && (
            <QualityBadge score={post.qualityScore} size="sm" />
          )}
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(post, regenNotes)}
              className="px-3 py-1 text-xs bg-white text-slate-600 rounded-full border border-[#e5e5e5] hover:bg-[#f5f5f5] dark:border-white/10 dark:bg-[#18181b] dark:text-white/70 dark:hover:bg-white/10"
            >
              Regenerate Thread
            </button>
          )}
          {onUpdatePostStatus && (
            <button
              onClick={() =>
              onUpdatePostStatus(
                  post.id,
                  post.status === 'approved' ? 'draft' : 'approved'
                )
              }
              className="px-3 py-1 text-xs bg-[#f97316]/10 text-[#f97316] rounded-full hover:bg-[#f97316]/15"
            >
              {post.status === 'approved' ? 'Mark Draft' : 'Approve Post'}
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-[#f5f5f5] rounded dark:hover:bg-white/10"
            >
              <X className="w-4 h-4 text-slate-500 dark:text-white/60" />
            </button>
          )}
        </div>
      </div>

      {onRegenerate && (
        <div className="px-5 py-4 border-b border-[#e5e5e5] bg-[#fafafa] dark:border-white/10 dark:bg-[#0f0f0f]">
          <label className="text-xs text-slate-500 dark:text-white/60">Regeneration notes</label>
          <textarea
            className="mt-2 w-full rounded-xl border border-[#e5e5e5] bg-white p-3 text-sm text-slate-700 outline-none focus:border-[#f97316]/60 dark:border-white/10 dark:bg-[#18181b] dark:text-white/80"
            rows={2}
            value={regenNotes}
            onChange={(e) => setRegenNotes(e.target.value)}
            placeholder="e.g., Make comments more skeptical and avoid repeating the same phrasing"
          />
        </div>
      )}
      
      {/* Post */}
      <div className="p-5 border-b border-[#e5e5e5] dark:border-white/10">
        <div className="flex items-start gap-3">
          {/* Vote buttons (decorative) */}
          <div className="flex flex-col items-center gap-1 text-slate-300 dark:text-white/30">
            <ChevronUp className="w-5 h-5" />
            <span className="text-xs font-medium">•</span>
            <ChevronDown className="w-5 h-5" />
          </div>
          
          {/* Post content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              {opPersona && <PersonaBadge persona={opPersona} role="op" />}
            </div>
            
            {editingId === post.id ? (
              <div className="space-y-2">
                <input
                  type="text"
                  value={editContent}
                  onChange={(e) => setEditContent(e.target.value)}
                  className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#f97316]/60 dark:border-white/10 dark:bg-[#18181b] dark:text-white"
                  placeholder="Post title"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('post', post.id)}
                    className="px-3 py-1 bg-[#f97316] text-white text-sm rounded hover:bg-[#ea580c]"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-slate-900 dark:text-white mb-2 group flex items-center gap-2 break-words text-[17px] leading-6">
                  {post.title}
                  {onEdit && (
                    <button
                      onClick={() => handleStartEdit(post.id, post.title)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#f5f5f5] rounded dark:hover:bg-white/10"
                    >
                      <Edit2 className="w-3 h-3 text-slate-400" />
                    </button>
                  )}
                </h3>
                <p className="text-slate-700 dark:text-white/80 text-[15px] leading-6 whitespace-pre-wrap break-words">
                  {post.body}
                </p>
              </>
            )}
            
            {/* Post metadata */}
            <div className="flex flex-wrap items-center gap-3 mt-4 text-xs text-slate-500 dark:text-white/60">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {comments.length} comments
              </span>
              <span className="px-2 py-0.5 bg-[#f5f5f5] rounded text-slate-600 dark:bg-white/10 dark:text-white/60">
                {post.threadType}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-500 dark:text-white/60">
              <div>
                <span className="text-slate-400 dark:text-white/40">Scheduled:</span>{' '}
                {formatDisplayTime(new Date(post.scheduledAt))}
              </div>
              <div>
                <span className="text-slate-400 dark:text-white/40">Status:</span> {post.status}
              </div>
              {post.qualityScore !== undefined && (
                <div>
                  <span className="text-slate-400 dark:text-white/40">Quality:</span> {post.qualityScore.toFixed(1)}
                </div>
              )}
              <div>
                <span className="text-slate-400 dark:text-white/40">Replies:</span> {comments.length}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments */}
      <div className="p-5 space-y-4">
        {comments.map((comment, index) => {
          const commentPersona = getPersona(comment.personaId);
          const isOP = comment.personaId === post.personaId;
          
          return (
            <div 
              key={comment.id}
              className={`${index > 0 ? 'ml-6' : ''}`}
            >
              <div className="flex items-start gap-3 rounded-xl border border-[#e5e5e5] bg-[#fafafa] p-3 dark:border-white/10 dark:bg-[#0f0f0f]">
                {/* Mini vote buttons */}
                <div className="flex flex-col items-center gap-0.5 text-slate-300 dark:text-white/30">
                  <ChevronUp className="w-4 h-4" />
                  <ChevronDown className="w-4 h-4" />
                </div>
                
                {/* Comment content */}
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    {commentPersona && (
                      <PersonaBadge 
                        persona={commentPersona} 
                        role={isOP ? 'op' : undefined}
                      />
                    )}
                    <span className="text-xs text-slate-400 dark:text-white/40 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      +{comment.delayMinutes}m
                    </span>
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full rounded-xl border border-[#e5e5e5] bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#f97316]/60 dark:border-white/10 dark:bg-[#18181b] dark:text-white"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit('comment', comment.id)}
                          className="px-3 py-1 bg-[#f97316] text-white text-sm rounded hover:bg-[#ea580c]"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 dark:bg-white/10 dark:text-white/70 dark:hover:bg-white/20"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-slate-700 dark:text-white/80 text-sm group flex items-start gap-2">
                      <div className="flex-1 whitespace-pre-wrap break-words leading-6">
                        {comment.content}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {onEdit && (
                          <button
                            onClick={() => handleStartEdit(comment.id, comment.content)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#f5f5f5] rounded dark:hover:bg-white/10"
                          >
                            <Edit2 className="w-3 h-3 text-slate-400" />
                          </button>
                        )}
                        {onUpdateCommentStatus && (
                          <button
                            onClick={() =>
                              onUpdateCommentStatus(
                                comment.id,
                                comment.status === 'approved' ? 'draft' : 'approved'
                              )
                            }
                            className="text-[10px] px-2 py-0.5 bg-[#f5f5f5] text-slate-600 rounded dark:bg-white/10 dark:text-white/60"
                          >
                            {comment.status === 'approved' ? 'Mark Draft' : 'Approve'}
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      {(post.qualityIssues?.length || post.qualityWarnings?.length) && (
        <div className="px-5 pb-5 text-xs text-slate-600 dark:text-white/70 space-y-2">
          {post.qualityIssues?.length ? (
            <div>
              <div className="font-semibold text-red-600">Issues</div>
              <ul className="list-disc ml-4">
                {post.qualityIssues.map((issue, idx) => (
                  <li key={idx}>{issue}</li>
                ))}
              </ul>
            </div>
          ) : null}
          {post.qualityWarnings?.length ? (
            <div>
              <div className="font-semibold text-orange-600">Warnings</div>
              <ul className="list-disc ml-4">
                {post.qualityWarnings.map((warn, idx) => (
                  <li key={idx}>{warn}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
      {onUpdatePostNotes && (
        <div className="px-5 pb-5">
          <label className="text-xs text-slate-500 dark:text-white/60">Review notes</label>
          <textarea
            className="mt-2 w-full rounded-xl border border-[#e5e5e5] bg-white p-3 text-sm text-slate-700 outline-none focus:border-[#f97316]/60 dark:border-white/10 dark:bg-[#18181b] dark:text-white"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={() => onUpdatePostNotes(post.id, notes)}
            className="mt-2 px-3 py-1 text-xs bg-[#111827] text-white rounded hover:bg-[#0f172a]"
          >
            Save notes
          </button>
        </div>
      )}
    </div>
  );
}

// Compact version for calendar view
interface ThreadCardProps {
  post: Post;
  commentCount: number;
  persona?: Persona;
  onClick?: () => void;
}

export function ThreadCard({ post, commentCount, persona, onClick }: ThreadCardProps) {
  return (
    <div 
      className="rounded-xl border border-[#e5e5e5] bg-white p-3 hover:border-[#d4d4d4] hover:shadow-sm transition-all cursor-pointer h-full flex flex-col dark:border-white/10 dark:bg-[#18181b] dark:hover:border-white/20"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-semibold text-[#f97316] truncate">
          {post.subredditName}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            post.status === 'approved'
              ? 'bg-green-100 text-green-700 dark:bg-emerald-500/20 dark:text-emerald-200'
              : 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-white/60'
          }`}>
            {post.status}
          </span>
          {post.qualityScore !== undefined && (
            <QualityBadge score={post.qualityScore} size="sm" showLabel={false} />
          )}
        </div>
      </div>
      
      <h4 className="font-medium text-slate-900 dark:text-white text-sm line-clamp-2 mb-2 flex-1">
        {post.title}
      </h4>
      
      <div className="flex items-center justify-between">
        {persona && <PersonaAvatar persona={persona} size="sm" />}
        <span className="text-xs text-slate-500 dark:text-white/60 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {commentCount}
        </span>
      </div>
    </div>
  );
}
