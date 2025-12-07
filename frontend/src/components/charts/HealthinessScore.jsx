import React from 'react';
import { IconHeart, IconTrendingUp, IconActivity, IconCalendar } from '@tabler/icons-react';

export default function HealthinessScore({ data, isDarkMode }) {
  if (!data) {
    return null;
  }

  const { score, rating, color, breakdown, recommendations } = data;

  // Color mapping
  const colorClasses = {
    green: {
      bg: 'bg-green-50 dark:bg-green-900/20',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200 dark:border-green-800',
      progress: 'bg-green-500'
    },
    blue: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200 dark:border-blue-800',
      progress: 'bg-blue-500'
    },
    yellow: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      text: 'text-yellow-600 dark:text-yellow-400',
      border: 'border-yellow-200 dark:border-yellow-800',
      progress: 'bg-yellow-500'
    },
    red: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200 dark:border-red-800',
      progress: 'bg-red-500'
    }
  };

  const colors = colorClasses[color] || colorClasses.blue;

  // Calculate circle progress (for SVG)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-2 mb-6">
        <IconHeart className={`w-5 h-5 ${colors.text}`} />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Healthiness Score
        </h3>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Score Circle */}
        <div className="flex flex-col items-center justify-center">
          <div className="relative w-48 h-48">
            <svg className="transform -rotate-90 w-48 h-48">
              {/* Background circle */}
              <circle
                cx="96"
                cy="96"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-gray-200 dark:text-gray-700"
              />
              {/* Progress circle */}
              <circle
                cx="96"
                cy="96"
                r={radius}
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                strokeLinecap="round"
                className={colors.text}
                style={{
                  transition: 'stroke-dashoffset 0.5s ease'
                }}
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-4xl font-bold ${colors.text}`}>
                {Math.round(score)}
              </span>
              <span className="text-sm text-gray-600 dark:text-gray-400">out of 100</span>
            </div>
          </div>
          <div className={`mt-4 px-4 py-2 rounded-full ${colors.bg} ${colors.border} border`}>
            <span className={`font-semibold ${colors.text}`}>{rating}</span>
          </div>
        </div>

        {/* Breakdown & Recommendations */}
        <div className="space-y-4">
          {/* Metrics Breakdown */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              Key Metrics
            </h4>
            
            <div className="flex items-center gap-3">
              <IconTrendingUp className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-gray-400">Standing</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {breakdown.standing_percentage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${colors.progress}`}
                    style={{ width: `${breakdown.standing_percentage}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconActivity className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Changes/Hour</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {breakdown.changes_per_hour}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <IconCalendar className="w-4 h-4 text-gray-500" />
              <div className="flex-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">Usage Consistency</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {breakdown.usage_consistency}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className={`p-4 ${colors.bg} rounded-lg border ${colors.border}`}>
            <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              💡 Recommendations
            </h4>
            <ul className="space-y-2">
              {recommendations.map((rec, index) => (
                <li
                  key={index}
                  className="text-xs text-gray-700 dark:text-gray-300 flex gap-2"
                >
                  <span className={colors.text}>•</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
