// components/DashboardSermons.tsx
import { BookOpen, PlayCircle, Download, Calendar, User } from 'lucide-react';

interface Sermon {
  id: string;
  title: string;
  summary: string;
  pastor_name: string;
  sermon_date: string;
  video_url: string | null;
  document_url: string | null;
  events?: {
    name: string;
    topic: string | null;
  };
}

interface DashboardSermonsProps {
  sermons: Sermon[];
}

const DashboardSermons = ({ sermons }: DashboardSermonsProps) => {
  const recentSermons = sermons.slice(0, 3);

  if (recentSermons.length === 0) {
    return (
      <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <BookOpen className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sermons</h3>
        </div>
        <div className="text-center py-8">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-gray-400">No sermons available</p>
          <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">Sermons will appear here once added</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-gray-800/70 backdrop-blur-xl border border-gray-200/50 dark:border-gray-700/50 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <BookOpen className="h-6 w-6 text-orange-600" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Sermons</h3>
        </div>
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {sermons.length} total
        </span>
      </div>
      
      <div className="space-y-4">
        {recentSermons.map((sermon) => (
          <div key={sermon.id} className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-200 dark:border-gray-600 hover:shadow-lg transition-all duration-300">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                  {sermon.title}
                </h4>
                {sermon.events?.name && (
                  <p className="text-blue-600 dark:text-blue-400 text-xs">{sermon.events.name}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-2">
              <div className="flex items-center gap-1">
                <User className="h-3 w-3" />
                <span>{sermon.pastor_name}</span>
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{new Date(sermon.sermon_date).toLocaleDateString()}</span>
              </div>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 text-xs mb-3 line-clamp-2">
              {sermon.summary}
            </p>
            
            <div className="flex flex-wrap gap-1">
              {sermon.video_url && (
                <a
                  href={sermon.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded-lg text-xs hover:bg-purple-200 dark:hover:bg-purple-800/30 transition-all duration-200"
                >
                  <PlayCircle className="h-3 w-3" />
                  Video
                </a>
              )}
              {sermon.document_url && (
                <a
                  href={sermon.document_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs hover:bg-green-200 dark:hover:bg-green-800/30 transition-all duration-200"
                >
                  <Download className="h-3 w-3" />
                  Notes
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {sermons.length > 3 && (
        <div className="mt-4 text-center">
          <button className="text-orange-600 dark:text-orange-400 hover:text-orange-700 dark:hover:text-orange-300 text-sm font-medium">
            View All Sermons ({sermons.length})
          </button>
        </div>
      )}
    </div>
  );
};

export default DashboardSermons;
