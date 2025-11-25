// components/DashboardSermonSummaries.tsx
import { BookOpen, Calendar } from 'lucide-react';
import { SermonSummary } from '../types';

interface DashboardSermonSummariesProps {
  sermonSummaries: SermonSummary[];
}

const DashboardSermonSummaries = ({ sermonSummaries }: DashboardSermonSummariesProps) => {
  const recentSermons = sermonSummaries.slice(0, 5);

  if (recentSermons.length === 0) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-6 w-6 text-blue-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sermons</h3>
        </div>
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No sermon summaries yet</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sermon summaries will appear here once added</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <BookOpen className="h-6 w-6 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sermons</h3>
      </div>
      
      <div className="space-y-4">
        {recentSermons.map((sermon) => (
          <div key={sermon.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600">
            <div className="flex items-start justify-between mb-2">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white">
                  {sermon.events.name}
                </h4>
                {sermon.events.topic && (
                  <p className="text-blue-600 dark:text-blue-400 text-sm">{sermon.events.topic}</p>
                )}
              </div>
              <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
                <Calendar className="h-3 w-3" />
                {new Date(sermon.sermon_date).toLocaleDateString()}
              </div>
            </div>
            
            <div className="mb-2">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                By {sermon.pastor_name}
              </span>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
              {sermon.summary}
            </p>
          </div>
        ))}
      </div>
      
      {sermonSummaries.length > 5 && (
        <div className="mt-4 text-center">
          <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 text-sm font-medium">
            View All Sermons ({sermonSummaries.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardSermonSummaries;
