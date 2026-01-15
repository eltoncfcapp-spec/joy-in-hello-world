// FoundationalTraining Component
const FoundationalTraining: React.FC<{
  memberId: string;
  currentUserId: string;
  canEditTraining: boolean;
  editingMode?: boolean;
  onTrainingUpdated?: () => void;
}> = ({
  memberId,
  currentUserId,
  canEditTraining,
  editingMode = false,
  onTrainingUpdated
}) => {
  const [topics, setTopics] = useState<FoundationalTopic[]>([]);
  const [trainingProgress, setTrainingProgress] = useState<TrainingProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    total: 0
  });
  const [expandedLevel, setExpandedLevel] = useState<number | null>(null);
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  
  // Define levels with names and descriptions
  const levels = [
    {
      level: 1,
      name: "Level 1: Foundations",
      description: "Basic concepts and introductory training",
      required: true
    },
    {
      level: 2,
      name: "Level 2: Growth",
      description: "Intermediate development and practical skills",
      required: true
    },
    {
      level: 3,
      name: "Level 3: Leadership",
      description: "Advanced application and leadership development",
      required: true
    }
  ];

  const fetchTrainingData = async () => {
    try {
      setLoading(true);
      
      // Fetch all active topics
      const { data: topicsData, error: topicsError } = await supabase
        .from('foundational_topics')
        .select('*')
        .eq('is_active', true)
        .order('level')
        .order('topic_order');

      if (topicsError) throw topicsError;
      setTopics(topicsData || []);

      // Fetch member's training progress with topic details
      const { data: progressData, error: progressError } = await supabase
        .from('member_training_progress')
        .select(`
          *,
          topic:topic_id(*),
          completed_by_member:completed_by(name, surname)
        `)
        .eq('member_id', memberId);

      if (progressError) throw progressError;
      setTrainingProgress(progressData || []);

      // Calculate progress
      const level1Topics = topicsData?.filter(t => t.level === 1) || [];
      const level2Topics = topicsData?.filter(t => t.level === 2) || [];
      const level3Topics = topicsData?.filter(t => t.level === 3) || [];
      const totalTopics = topicsData?.length || 0;

      const completedLevel1 = progressData?.filter(p => 
        level1Topics.find(t => t.id === p.topic_id)
      ).length || 0;
      const completedLevel2 = progressData?.filter(p => 
        level2Topics.find(t => t.id === p.topic_id)
      ).length || 0;
      const completedLevel3 = progressData?.filter(p => 
        level3Topics.find(t => t.id === p.topic_id)
      ).length || 0;

      setProgress({
        level1: level1Topics.length > 0 ? Math.round((completedLevel1 / level1Topics.length) * 100) : 0,
        level2: level2Topics.length > 0 ? Math.round((completedLevel2 / level2Topics.length) * 100) : 0,
        level3: level3Topics.length > 0 ? Math.round((completedLevel3 / level3Topics.length) * 100) : 0,
        total: totalTopics > 0 ? Math.round((progressData?.length || 0) / totalTopics * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainingData();
  }, [memberId]);

  const handleTopicToggle = async (topicId: string, isCompleted: boolean) => {
    if (!canEditTraining) return;

    try {
      if (isCompleted) {
        // Remove completion
        const { error } = await supabase
          .from('member_training_progress')
          .delete()
          .eq('member_id', memberId)
          .eq('topic_id', topicId);

        if (error) throw error;
      } else {
        // Add completion
        const completionData = {
          member_id: memberId,
          topic_id: topicId,
          completed_by: currentUserId,
          completed_date: new Date().toISOString(),
          notes: `Completed foundational training topic`
        };

        const { error } = await supabase
          .from('member_training_progress')
          .insert([completionData]);

        if (error) throw error;
      }

      fetchTrainingData();
      if (onTrainingUpdated) onTrainingUpdated();
    } catch (error) {
      console.error('Error updating topic completion:', error);
      alert('Failed to update training progress. Please try again.');
    }
  };

  const getLevelTopics = (level: number) => {
    return topics.filter(topic => topic.level === level);
  };

  // Get unique subjects for a level
  const getSubjectsByLevel = (level: number) => {
    const levelTopics = getLevelTopics(level);
    const subjects = [...new Set(levelTopics.map(topic => topic.subject_area || 'General'))];
    return subjects;
  };

  // Get topics by level and subject
  const getTopicsByLevelAndSubject = (level: number, subject: string) => {
    return topics.filter(topic => 
      topic.level === level && 
      (topic.subject_area === subject || (!topic.subject_area && subject === 'General'))
    );
  };

  const toggleLevel = (level: number) => {
    setExpandedLevel(expandedLevel === level ? null : level);
  };

  const toggleSubject = (subject: string) => {
    setExpandedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  const getLevelColor = (level: number) => {
    switch (level) {
      case 1: return 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300';
      case 2: return 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300';
      case 3: return 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300';
      default: return 'bg-gray-100 dark:bg-gray-900/30 text-gray-700 dark:text-gray-300';
    }
  };

  const getProgressColor = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-500';
    if (percentage >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isTopicCompleted = (topicId: string) => {
    return trainingProgress.some(progress => progress.topic_id === topicId);
  };

  const getCompletionDetails = (topicId: string) => {
    const progress = trainingProgress.find(p => p.topic_id === topicId);
    if (!progress) return null;
    
    return {
      completedBy: progress.completed_by_member 
        ? `${progress.completed_by_member.name} ${progress.completed_by_member.surname}`
        : 'Unknown',
      completedDate: new Date(progress.completed_date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      notes: progress.notes
    };
  };

  // Calculate total hours completed
  const calculateTotalHours = () => {
    let totalHours = 0;
    const completedTopicIds = trainingProgress.map(t => t.topic_id);
    
    topics.forEach(topic => {
      if (completedTopicIds.includes(topic.id) && topic.duration_minutes) {
        totalHours += topic.duration_minutes / 60;
      }
    });
    
    return Math.round(totalHours * 10) / 10; // Round to 1 decimal place
  };

  // Calculate level completion date
  const getLevelCompletionDate = (level: number) => {
    const levelTopics = getLevelTopics(level);
    if (levelTopics.length === 0) return null;
    
    const completedTopicsInLevel = levelTopics.filter(t => isTopicCompleted(t.id));
    if (completedTopicsInLevel.length !== levelTopics.length) return null;
    
    // Get the latest completion date for this level
    let latestDate: Date | null = null;
    trainingProgress.forEach(progress => {
      if (levelTopics.some(t => t.id === progress.topic_id)) {
        const date = new Date(progress.completed_date);
        if (!latestDate || date > latestDate) {
          latestDate = date;
        }
      }
    });
    
    return latestDate?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Foundational Training
        </h3>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {canEditTraining ? 'Click to toggle completion' : 'View only'}
        </div>
      </div>

      {/* Overall Progress Summary */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700/50 rounded-xl p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Training Progress</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total completion overview</p>
          </div>
          <div className="text-right">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{progress.total}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {trainingProgress.length}/{topics.length} topics
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400">Total Hours</div>
            <div className="text-lg font-bold text-blue-600 dark:text-blue-400">{calculateTotalHours()} hrs</div>
          </div>
          <div className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400">Levels Completed</div>
            <div className="text-lg font-bold text-green-600 dark:text-green-400">
              {[1, 2, 3].filter(level => getLevelCompletionDate(level) !== null).length}/3
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800/50 p-3 rounded-lg shadow-sm">
            <div className="text-sm text-gray-600 dark:text-gray-400">Last Updated</div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {trainingProgress.length > 0 
                ? new Date(trainingProgress[0]?.completed_date || '').toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric' 
                  })
                : 'Never'}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          {levels.map(levelInfo => (
            <div key={levelInfo.level} className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  {levelInfo.name}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">
                    {progress[`level${levelInfo.level}` as keyof typeof progress]}%
                  </span>
                  {getLevelCompletionDate(levelInfo.level) && (
                    <span className="text-xs text-green-600 dark:text-green-400">
                      ✓ Completed
                    </span>
                  )}
                </div>
              </div>
              <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${getProgressColor(progress[`level${levelInfo.level}` as keyof typeof progress])} transition-all duration-500`}
                  style={{ width: `${progress[`level${levelInfo.level}` as keyof typeof progress]}%` }}
                />
              </div>
              {getLevelCompletionDate(levelInfo.level) && (
                <div className="text-xs text-gray-500 dark:text-gray-500">
                  Completed on: {getLevelCompletionDate(levelInfo.level)}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading training topics...</p>
        </div>
      ) : topics.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600 dark:text-gray-400">No training topics configured.</p>
          <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">
            Contact an administrator to set up foundational training topics.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {levels.map(levelInfo => {
            const levelTopics = getLevelTopics(levelInfo.level);
            if (levelTopics.length === 0) return null;

            const subjects = getSubjectsByLevel(levelInfo.level);
            const completedCount = levelTopics.filter(t => isTopicCompleted(t.id)).length;
            
            return (
              <div key={levelInfo.level} className="space-y-3">
                <button
                  onClick={() => toggleLevel(levelInfo.level)}
                  className="w-full flex items-center justify-between p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white">
                      {levelInfo.name}
                    </h4>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getLevelColor(levelInfo.level)}`}>
                      {completedCount}/{levelTopics.length} completed
                    </span>
                    {levelInfo.required && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
                        Required
                      </span>
                    )}
                  </div>
                  <ChevronDown className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${expandedLevel === levelInfo.level ? 'rotate-180' : ''}`} />
                </button>
                
                {expandedLevel === levelInfo.level && (
                  <div className="space-y-3 pl-4 border-l-2 border-gray-200 dark:border-gray-700 ml-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {levelInfo.description}
                    </p>
                    
                    {subjects.map(subject => {
                      const subjectTopics = getTopicsByLevelAndSubject(levelInfo.level, subject);
                      const completedInSubject = subjectTopics.filter(t => isTopicCompleted(t.id)).length;
                      const subjectProgress = subjectTopics.length > 0 
                        ? Math.round((completedInSubject / subjectTopics.length) * 100) 
                        : 0;
                      const isSubjectExpanded = expandedSubjects.includes(`${levelInfo.level}-${subject}`);
                      
                      return (
                        <div key={`${levelInfo.level}-${subject}`} className="space-y-2">
                          <button
                            onClick={() => toggleSubject(`${levelInfo.level}-${subject}`)}
                            className="w-full flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800/50 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors duration-200"
                          >
                            <div className="flex items-center gap-2">
                              <BookOpen className="h-4 w-4 text-gray-400" />
                              <span className="font-medium text-gray-700 dark:text-gray-300">{subject}</span>
                              <span className="text-xs text-gray-500 dark:text-gray-500">
                                ({completedInSubject}/{subjectTopics.length})
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-sm text-blue-600 dark:text-blue-400">
                                {subjectProgress}%
                              </span>
                              {isSubjectExpanded ? 
                                <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                                <ChevronDown className="h-4 w-4 text-gray-400" />
                              }
                            </div>
                          </button>
                          
                          {isSubjectExpanded && (
                            <div className="space-y-2 pl-4">
                              {subjectTopics.map(topic => {
                                const isCompleted = isTopicCompleted(topic.id);
                                const completionDetails = getCompletionDetails(topic.id);
                                
                                return (
                                  <div 
                                    key={topic.id}
                                    className={`p-3 rounded-lg hover:shadow-sm transition-all duration-200 ${
                                      isCompleted 
                                        ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700/50' 
                                        : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
                                    }`}
                                  >
                                    <div className="flex items-start gap-3">
                                      <button
                                        onClick={() => handleTopicToggle(topic.id, isCompleted)}
                                        disabled={!canEditTraining}
                                        className={`flex-shrink-0 mt-1 ${canEditTraining ? 'cursor-pointer hover:scale-110 transition-transform duration-200' : 'cursor-default'}`}
                                      >
                                        {isCompleted ? (
                                          <CheckCircle className="h-5 w-5 text-green-500" />
                                        ) : (
                                          <Circle className="h-5 w-5 text-gray-400" />
                                        )}
                                      </button>
                                      
                                      <div className="flex-1">
                                        <div className="flex justify-between items-start">
                                          <h5 className={`font-medium ${isCompleted ? 'text-green-700 dark:text-green-300' : 'text-gray-900 dark:text-white'}`}>
                                            {topic.topic_name}
                                          </h5>
                                          {topic.duration_minutes && (
                                            <span className="text-xs text-gray-500 dark:text-gray-500">
                                              {topic.duration_minutes} min
                                            </span>
                                          )}
                                        </div>
                                        {topic.topic_description && (
                                          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                            {topic.topic_description}
                                          </p>
                                        )}
                                        {completionDetails && (
                                          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                              Completed by {completionDetails.completedBy} on {completionDetails.completedDate}
                                            </p>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Level Completion Summary */}
      {trainingProgress.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
          <h4 className="font-semibold text-gray-900 dark:text-white mb-3">Level Completion Dates</h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {levels.map(levelInfo => {
              const completionDate = getLevelCompletionDate(levelInfo.level);
              return (
                <div key={levelInfo.level} className="bg-white dark:bg-gray-800 p-3 rounded-lg">
                  <div className="font-medium text-gray-700 dark:text-gray-300">
                    {levelInfo.name}
                  </div>
                  <div className={`text-sm ${completionDate ? 'text-green-600 dark:text-green-400' : 'text-gray-500 dark:text-gray-500'}`}>
                    {completionDate ? `Completed: ${completionDate}` : 'In Progress'}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
