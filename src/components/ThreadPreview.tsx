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
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center flex-wrap gap-2 min-w-0">
          <span className="text-sm font-medium text-reddit-orange">
            {post.subredditName}
          </span>
          <span className="text-gray-300">•</span>
          <span className="text-sm text-gray-500">
            {formatDisplayTime(new Date(post.scheduledAt))}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${
            post.status === 'approved'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
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
              className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200"
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
              className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded hover:bg-blue-200"
            >
              {post.status === 'approved' ? 'Mark Draft' : 'Approve Post'}
            </button>
          )}
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>
      </div>

      {onRegenerate && (
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
          <label className="text-xs text-gray-500">Regeneration notes</label>
          <textarea
            className="mt-1 w-full border border-gray-200 rounded-md p-2 text-sm"
            rows={2}
            value={regenNotes}
            onChange={(e) => setRegenNotes(e.target.value)}
            placeholder="e.g., Make comments more skeptical and avoid repeating the same phrasing"
          />
        </div>
      )}
      
      {/* Post */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-start gap-3">
          {/* Vote buttons (decorative) */}
          <div className="flex flex-col items-center gap-1 text-gray-400">
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
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Post title"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => handleSaveEdit('post', post.id)}
                    className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                  >
                    Save
                  </button>
                  <button
                    onClick={() => setEditingId(null)}
                    className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <>
                <h3 className="font-semibold text-gray-900 mb-2 group flex items-center gap-2 break-words">
                  {post.title}
                  {onEdit && (
                    <button
                      onClick={() => handleStartEdit(post.id, post.title)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
                    >
                      <Edit2 className="w-3 h-3 text-gray-400" />
                    </button>
                  )}
                </h3>
                <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {post.body}
                </p>
              </>
            )}
            
            {/* Post metadata */}
            <div className="flex flex-wrap items-center gap-3 mt-3 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <MessageSquare className="w-3 h-3" />
                {comments.length} comments
              </span>
              <span className="px-2 py-0.5 bg-gray-100 rounded text-gray-600">
                {post.threadType}
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-500">
              <div>
                <span className="text-gray-400">Scheduled:</span>{' '}
                {formatDisplayTime(new Date(post.scheduledAt))}
              </div>
              <div>
                <span className="text-gray-400">Status:</span> {post.status}
              </div>
              {post.qualityScore !== undefined && (
                <div>
                  <span className="text-gray-400">Quality:</span> {post.qualityScore.toFixed(1)}
                </div>
              )}
              <div>
                <span className="text-gray-400">Replies:</span> {comments.length}
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comments */}
      <div className="p-4 space-y-4">
        {comments.map((comment, index) => {
          const commentPersona = getPersona(comment.personaId);
          const isOP = comment.personaId === post.personaId;
          
          return (
            <div 
              key={comment.id}
              className={`${index > 0 ? 'border-l-2 border-gray-200 pl-4 ml-4' : ''}`}
            >
              <div className="flex items-start gap-3">
                {/* Mini vote buttons */}
                <div className="flex flex-col items-center gap-0.5 text-gray-300">
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
                    <span className="text-xs text-gray-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      +{comment.delayMinutes}m
                    </span>
                  </div>
                  
                  {editingId === comment.id ? (
                    <div className="space-y-2">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={2}
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleSaveEdit('comment', comment.id)}
                          className="px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="text-gray-700 text-sm group flex items-start gap-2">
                      <div className="flex-1 whitespace-pre-wrap break-words">
                        {comment.content}
                      </div>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {onEdit && (
                          <button
                            onClick={() => handleStartEdit(comment.id, comment.content)}
                            className="opacity-0 group-hover:opacity-100 p-1 hover:bg-gray-100 rounded"
                          >
                            <Edit2 className="w-3 h-3 text-gray-400" />
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
                            className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
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
        <div className="px-4 pb-4 text-xs text-gray-600 space-y-2">
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
        <div className="px-4 pb-4">
          <label className="text-xs text-gray-500">Review notes</label>
          <textarea
            className="mt-1 w-full border border-gray-200 rounded-md p-2 text-sm"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
          <button
            onClick={() => onUpdatePostNotes(post.id, notes)}
            className="mt-2 px-3 py-1 text-xs bg-gray-900 text-white rounded"
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
      className="bg-white rounded-lg border border-gray-200 p-3 hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer h-full flex flex-col"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="text-xs font-medium text-reddit-orange truncate">
          {post.subredditName}
        </span>
        <div className="flex items-center gap-1 flex-shrink-0">
          <span className={`text-[10px] px-2 py-0.5 rounded-full ${
            post.status === 'approved'
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-600'
          }`}>
            {post.status}
          </span>
          {post.qualityScore !== undefined && (
            <QualityBadge score={post.qualityScore} size="sm" showLabel={false} />
          )}
        </div>
      </div>
      
      <h4 className="font-medium text-gray-900 text-sm line-clamp-2 mb-2 flex-1">
        {post.title}
      </h4>
      
      <div className="flex items-center justify-between">
        {persona && <PersonaAvatar persona={persona} size="sm" />}
        <span className="text-xs text-gray-500 flex items-center gap-1">
          <MessageSquare className="w-3 h-3" />
          {commentCount}
        </span>
      </div>
    </div>
  );
}
