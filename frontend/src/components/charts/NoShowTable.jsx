import React from 'react';
import { IconAlertTriangle } from '@tabler/icons-react';
import { Card, CardContent } from '@/components/ui/card';

export default function NoShowTable({ data, isDarkMode }) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardContent>
          <div className="flex items-center gap-2 mb-4">
            <IconAlertTriangle className="w-5 h-5 text-yellow-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              No Show History
            </h3>
          </div>
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <p> No missed reservations! Great job!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <IconAlertTriangle className="w-5 h-5 text-red-500" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white" title="Reservations you confirmed but didn't check in">
            No Show History
          </h3>
          <span 
            className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 text-xs font-medium px-2.5 py-0.5 rounded"
            title="Total missed reservations"
          >
            {data.length} {data.length === 1 ? 'miss' : 'misses'}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-700 dark:text-gray-300 uppercase bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Desk</th>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Days Ago</th>
              </tr>
            </thead>
            <tbody>
              {data.map((noShow) => (
                <tr
                  key={noShow.id}
                  className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">
                    {new Date(noShow.date).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric'
                    })}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {noShow.desk_name}
                  </td>
                  <td className="px-4 py-3 text-gray-700 dark:text-gray-300">
                    {noShow.start_time} - {noShow.end_time}
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-gray-600 dark:text-gray-400">
                      {noShow.days_ago === 0 ? 'Today' : `${noShow.days_ago}d ago`}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-xs text-yellow-800 dark:text-yellow-300">
            <strong>Tip:</strong> Missed reservations affect other employees who might need a desk. 
            Please cancel reservations you can't use.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}