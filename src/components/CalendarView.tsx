'use client';

import { useState, useMemo } from 'react';
import { Post, Comment, Persona } from '@/types';
import { ThreadCard } from './ThreadPreview';
import {
  format,
  addDays,
  isSameDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
} from 'date-fns';
import { ChevronLeft, ChevronRight, Calendar, List, BarChart3 } from 'lucide-react';

interface CalendarViewProps {
  posts: Post[];
  comments: Comment[];
  personas: Persona[];
  weekStart: Date;
  onSelectPost: (post: Post) => void;
  onWeekChange?: (direction: 'prev' | 'next') => void;
  onToday?: () => void;
}

export function CalendarView({
  posts,
  comments,
  personas,
  weekStart,
  onSelectPost,
  onWeekChange,
  onToday,
}: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'calendar' | 'list' | 'heatmap'>('calendar');
  
  // Group posts by day
  const postsByDay = useMemo(() => {
    const grouped: Record<string, Post[]> = {};
    
    for (const post of posts) {
      const dateKey = format(new Date(post.scheduledAt), 'yyyy-MM-dd');
      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(post);
    }
    
    return grouped;
  }, [posts]);
  
  // Get comments count for each post
  const getCommentCount = (postId: string) => 
    comments.filter(c => c.postId === postId).length;
  
  // Get persona for a post
  const getPersona = (personaId: string) =>
    personas.find(p => p.id === personaId);
  
  // Generate month grid (full weeks)
  const monthStart = useMemo(() => startOfMonth(weekStart), [weekStart]);
  const monthEnd = useMemo(() => endOfMonth(weekStart), [weekStart]);
  const gridStart = useMemo(() => startOfWeek(monthStart, { weekStartsOn: 1 }), [monthStart]);
  const gridEnd = useMemo(() => endOfWeek(monthEnd, { weekStartsOn: 1 }), [monthEnd]);
  const monthDays = useMemo(() => eachDayOfInterval({ start: gridStart, end: gridEnd }), [gridStart, gridEnd]);

  const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h2 className="font-semibold text-gray-900">
            {format(monthStart, 'MMMM yyyy')}
          </h2>
          
          {onWeekChange && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onWeekChange('prev')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronLeft className="w-4 h-4 text-gray-600" />
              </button>
              <button
                onClick={() => onWeekChange('next')}
                className="p-1 hover:bg-gray-200 rounded"
              >
                <ChevronRight className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          )}
          {onToday && (
            <button
              onClick={onToday}
              className="text-xs px-2 py-1 bg-white border border-gray-200 rounded hover:bg-gray-100"
            >
              Today
            </button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            {posts.length} posts scheduled
          </span>
          
          {/* View toggle */}
          <div className="flex items-center bg-gray-200 rounded-lg p-0.5">
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-1.5 rounded ${
                viewMode === 'calendar' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-300'
              }`}
            >
              <Calendar className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded ${
                viewMode === 'list' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-300'
              }`}
            >
              <List className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={() => setViewMode('heatmap')}
              className={`p-1.5 rounded ${
                viewMode === 'heatmap' 
                  ? 'bg-white shadow-sm' 
                  : 'hover:bg-gray-300'
              }`}
            >
              <BarChart3 className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
      </div>
      
      {/* Calendar Grid View */}
      {viewMode === 'calendar' && (
        <div>
          <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
            {dayNames.map((day) => (
              <div
                key={day}
                className="px-2 py-2 text-xs font-semibold text-gray-500 text-center"
              >
                {day}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-px bg-gray-200">
            {monthDays.map((day, index) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayPosts = postsByDay[dateKey] || [];
              const isToday = isSameDay(day, new Date());
              const inMonth = isSameMonth(day, monthStart);
              const isWeekend = index % 7 >= 5;

              return (
                <div
                  key={dateKey}
                  className={`min-h-[190px] bg-white flex flex-col ${!inMonth ? 'opacity-50' : ''} ${isWeekend ? 'bg-gray-50' : ''}`}
                >
                  <div
                    className={`px-2 py-2 border-b border-gray-200 flex items-center justify-between min-h-[36px] ${
                      isToday ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div
                      className={`text-sm font-semibold leading-none ${
                        isToday ? 'text-blue-600' : 'text-gray-900'
                      }`}
                    >
                      {format(day, 'd')}
                    </div>
                    <div className="text-[11px] text-gray-400">
                      {dayPosts.length || ''}
                    </div>
                  </div>
                  <div className="p-2 space-y-2 flex-1 overflow-y-auto">
                    {dayPosts.map((post) => (
                      <ThreadCard
                        key={post.id}
                        post={post}
                        commentCount={getCommentCount(post.id)}
                        persona={getPersona(post.personaId)}
                        onClick={() => onSelectPost(post)}
                      />
                    ))}
                    {dayPosts.length === 0 && (
                      <div className="h-16 flex items-center justify-center text-gray-300 text-xs">
                        —
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      
      {/* Heatmap View */}
      {viewMode === 'heatmap' && (
        <div className="grid grid-cols-7 gap-px bg-gray-200">
          {monthDays.map((day, index) => {
            const dateKey = format(day, 'yyyy-MM-dd');
            const count = (postsByDay[dateKey] || []).length;
            const intensity = count === 0 ? 'bg-white' : count === 1 ? 'bg-green-100' : count === 2 ? 'bg-green-200' : 'bg-green-300';
            const isToday = isSameDay(day, new Date());
            const inMonth = isSameMonth(day, monthStart);

            return (
              <div
                key={dateKey}
                className={`min-h-[72px] ${intensity} ${!inMonth ? 'opacity-50' : ''} ${isToday ? 'ring-2 ring-blue-400' : ''}`}
              >
                <div className="p-2 text-xs text-gray-600">
                  {format(day, 'd')}
                </div>
                <div className="px-2 text-[10px] text-gray-500">{count} posts</div>
              </div>
            );
          })}
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="divide-y divide-gray-200">
          {posts.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No posts scheduled for this week
            </div>
          ) : (
            posts
              .sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime())
              .map(post => {
                const persona = getPersona(post.personaId);
                const commentCount = getCommentCount(post.id);
                
                return (
                  <div
                    key={post.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer flex items-center gap-4"
                    onClick={() => onSelectPost(post)}
                  >
                    {/* Date/Time */}
                    <div className="w-32 flex-shrink-0">
                      <div className="text-sm font-medium text-gray-900">
                        {format(new Date(post.scheduledAt), 'EEE, MMM d')}
                      </div>
                      <div className="text-xs text-gray-500">
                        {format(new Date(post.scheduledAt), 'h:mm a')}
                      </div>
                    </div>
                    
                    {/* Subreddit */}
                    <div className="w-28 flex-shrink-0">
                      <span className="text-sm font-medium text-reddit-orange">
                        {post.subredditName}
                      </span>
                    </div>
                    
                    {/* Title */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {post.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {post.body}
                      </div>
                    </div>
                    
                    {/* Persona */}
                    <div className="w-32 flex-shrink-0">
                      {persona && (
                        <div className="flex items-center gap-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                            style={{ backgroundColor: persona.avatarColor }}
                          >
                            {persona.username.slice(0, 2).toUpperCase()}
                          </div>
                          <span className="text-xs text-gray-600 truncate">
                            {persona.username}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    {/* Comments */}
                    <div className="w-16 flex-shrink-0 text-right">
                      <span className="text-xs text-gray-500">
                        {commentCount} replies
                      </span>
                    </div>
                    
                    {/* Quality */}
                    <div className="w-16 flex-shrink-0 text-right">
                      {post.qualityScore !== undefined && (
                        <span className={`text-xs font-medium ${
                          post.qualityScore >= 7 ? 'text-green-600' :
                          post.qualityScore >= 4 ? 'text-yellow-600' :
                          'text-red-600'
                        }`}>
                          {post.qualityScore.toFixed(1)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
          )}
        </div>
      )}
    </div>
  );
}
