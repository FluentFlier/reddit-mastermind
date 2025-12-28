'use client';

import { getQualityGrade } from '@/lib/planner';

interface QualityBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function QualityBadge({ 
  score, 
  showLabel = true,
  size = 'md' 
}: QualityBadgeProps) {
  const { grade, label, color } = getQualityGrade(score);
  
  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5',
    md: 'text-sm px-2 py-1',
    lg: 'text-base px-3 py-1.5',
  };
  
  return (
    <div 
      className={`inline-flex items-center gap-1.5 rounded-full font-medium ${sizeClasses[size]}`}
      style={{ 
        backgroundColor: `${color}15`,
        color: color,
      }}
    >
      <span className="font-bold">{score.toFixed(1)}</span>
      {showLabel && (
        <>
          <span className="text-gray-400">•</span>
          <span>{label}</span>
        </>
      )}
    </div>
  );
}

interface QualityMeterProps {
  score: number;
  label?: string;
}

export function QualityMeter({ score, label }: QualityMeterProps) {
  const { color } = getQualityGrade(score);
  const percentage = (score / 10) * 100;
  
  return (
    <div className="w-full">
      {label && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm text-gray-600">{label}</span>
          <span className="text-sm font-medium" style={{ color }}>
            {score.toFixed(1)}/10
          </span>
        </div>
      )}
      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ 
            width: `${percentage}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

interface QualityReportCardProps {
  report: {
    overallScore: number;
    issues: Array<{ type: string; severity: string; message: string }>;
    warnings: string[];
    suggestions: string[];
  };
}

export function QualityReportCard({ report }: QualityReportCardProps) {
  const { grade, label, color } = getQualityGrade(report.overallScore);
  
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Quality Report</h3>
        <div 
          className="text-2xl font-bold"
          style={{ color }}
        >
          {grade}
        </div>
      </div>
      
      <QualityMeter score={report.overallScore} label="Overall Score" />
      
      {report.issues.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Issues ({report.issues.length})
          </h4>
          <ul className="space-y-1">
            {report.issues.map((issue, i) => (
              <li 
                key={i}
                className={`text-sm px-2 py-1 rounded ${
                  issue.severity === 'high' 
                    ? 'bg-red-50 text-red-700'
                    : issue.severity === 'medium'
                    ? 'bg-yellow-50 text-yellow-700'
                    : 'bg-gray-50 text-gray-700'
                }`}
              >
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {report.warnings.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Warnings ({report.warnings.length})
          </h4>
          <ul className="space-y-1">
            {report.warnings.map((warning, i) => (
              <li 
                key={i}
                className="text-sm px-2 py-1 rounded bg-orange-50 text-orange-700"
              >
                {warning}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {report.suggestions.length > 0 && (
        <div className="mt-4">
          <h4 className="text-sm font-medium text-gray-700 mb-2">
            Suggestions
          </h4>
          <ul className="space-y-1">
            {report.suggestions.map((suggestion, i) => (
              <li 
                key={i}
                className="text-sm px-2 py-1 rounded bg-blue-50 text-blue-700"
              >
                💡 {suggestion}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
