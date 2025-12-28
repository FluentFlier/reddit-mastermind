'use client';

import { QualityReport } from '@/types';
import { QualityBadge, QualityMeter, QualityReportCard } from './QualityBadge';

interface QualityPanelProps {
  report: QualityReport;
  postsCount: number;
  commentsCount: number;
  weekNumber: number;
  kpis?: {
    avgQuality: number;
    approvalRate: number;
    uniquePersonas: number;
    uniqueSubreddits: number;
    issueCount: number;
    warningCount: number;
  };
  onApproveAll?: () => void;
  onRegenerate?: () => void;
  onGenerateNext?: () => void;
  onRegenerateLowQuality?: () => void;
}

export function QualityPanel({ 
  report, 
  postsCount, 
  commentsCount,
  weekNumber,
  kpis,
  onApproveAll,
  onRegenerate,
  onGenerateNext,
  onRegenerateLowQuality,
}: QualityPanelProps) {
  return (
    <div className="space-y-4">
      {/* Summary Card */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          📊 Week {weekNumber} Summary
        </h3>
        
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{postsCount}</div>
            <div className="text-sm text-gray-500">Posts</div>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-gray-900">{commentsCount}</div>
            <div className="text-sm text-gray-500">Comments</div>
          </div>
        </div>
        
        <div className="flex items-center justify-center mb-4">
          <QualityBadge score={report.overallScore} size="lg" />
        </div>
        
        <QualityMeter score={report.overallScore} label="Quality Score" />
      </div>
      
      {/* Quality Report */}
      <QualityReportCard report={report} />

      {kpis && (
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Weekly KPIs</h4>
          <div className="grid grid-cols-2 gap-3 text-xs text-gray-600">
            <div>Avg quality: {kpis.avgQuality.toFixed(1)}</div>
            <div>Approval rate: {Math.round(kpis.approvalRate * 100)}%</div>
            <div>Unique personas: {kpis.uniquePersonas}</div>
            <div>Unique subreddits: {kpis.uniqueSubreddits}</div>
            <div>Issues: {kpis.issueCount}</div>
            <div>Warnings: {kpis.warningCount}</div>
          </div>
        </div>
      )}
      
      {/* Action Buttons */}
      <div className="bg-white rounded-lg shadow-sm p-4 space-y-3">
        <button
          onClick={onApproveAll}
          disabled={!onApproveAll}
          className="w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ✅ Approve All
        </button>
        <button
          onClick={onRegenerateLowQuality}
          disabled={!onRegenerateLowQuality}
          className="w-full py-2 px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ♻️ Regenerate Low Quality
        </button>
        <button
          onClick={onRegenerate}
          disabled={!onRegenerate}
          className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          🔄 Regenerate Week
        </button>
        <button
          onClick={onGenerateNext}
          disabled={!onGenerateNext}
          className="w-full py-2 px-4 bg-orange-100 hover:bg-orange-200 text-orange-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          📅 Generate Next Week
        </button>
      </div>
    </div>
  );
}
