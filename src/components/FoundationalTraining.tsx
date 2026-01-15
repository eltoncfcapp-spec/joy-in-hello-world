import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { CheckCircle, Circle, BookOpen, Calendar, Award, ChevronDown, ChevronUp } from 'lucide-react';

interface FoundationalTrainingProps {
  memberId: string;
  currentUserId: string;
  canEditTraining: boolean;
}

interface FoundationalTopic {
  id: string;
  topic_name: string;
  description?: string;
  level: number;
  topic_order: number;
  is_active: boolean;
  subject_area?: string;
  estimated_hours?: number;
  created_at: string;
}

interface MemberProgress {
  topic_id: string;
  completed_date: string;
  completed_by: string;
  verified_by?: string;
  verified_date?: string;
}

interface LevelInfo {
  level: number;
  name: string;
  description: string;
  required_for_certification: boolean;
  completed_date?: string;
}

const FoundationalTraining: React.FC<FoundationalTrainingProps> = ({
  memberId,
  currentUserId,
  canEditTraining
}) => {
  const [topics, setTopics] = useState<FoundationalTopic[]>([]);
  const [completedTopics, setCompletedTopics] = useState<MemberProgress[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    total: 0
  });
  const [expandedLevels, setExpandedLevels] = useState<number[]>([1, 2, 3]);
  const [expandedSubjects, setExpandedSubjects] = useState<string[]>([]);
  const [levelsInfo, setLevelsInfo] = useState<LevelInfo[]>([
    {
      level: 1,
      name: "Basic Foundations",
      description: "Essential concepts and introductory material",
      required_for_certification: true
    },
    {
      level: 2,
      name: "Intermediate Development",
      description: "Building on foundational knowledge with practical skills",
      required_for_certification: true
    },
    {
      level: 3,
      name: "Advanced Application",
      description: "Specialized topics and real-world application",
      required_for_certification: true
    }
  ]);
  
  // Fetch all training data
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

      // Fetch member's completed topics with dates
      const { data: progressData, error: progressError } = await supabase
        .from('member_training_progress')
        .select('*')
        .eq('member_id', memberId)
        .order('completed_date', { ascending: false });

      if (progressError) throw progressError;
      
      setCompletedTopics(progressData || []);

      // Calculate progress and find level completion dates
      const level1Topics = topicsData?.filter(t => t.level === 1) || [];
      const level2Topics = topicsData?.filter(t => t.level === 2) || [];
      const level3Topics = topicsData?.filter(t => t.level === 3) || [];
      
      const totalTopics = level1Topics.length + level2Topics.length + level3Topics.length;
      const completedTopicIds = progressData?.map(p => p.topic_id) || [];

      // Calculate level completion
      const completedLevel1 = level1Topics.filter(t => completedTopicIds.includes(t.id));
      const completedLevel2 = level2Topics.filter(t => completedTopicIds.includes(t.id));
      const completedLevel3 = level3Topics.filter(t => completedTopicIds.includes(t.id));

      // Find completion dates for each level (date when all topics in level were completed)
      const updatedLevelsInfo = [...levelsInfo];
      
      // Level 1 completion date
      if (completedLevel1.length === level1Topics.length && level1Topics.length > 0) {
        const level1CompletionDates = progressData
          ?.filter(p => level1Topics.some(t => t.id === p.topic_id))
          .map(p => new Date(p.completed_date).getTime()) || [];
        
        if (level1CompletionDates.length > 0) {
          const latestCompletionDate = new Date(Math.max(...level1CompletionDates));
          updatedLevelsInfo[0].completed_date = latestCompletionDate.toISOString();
        }
      }
      
      // Level 2 completion date
      if (completedLevel2.length === level2Topics.length && level2Topics.length > 0) {
        const level2CompletionDates = progressData
          ?.filter(p => level2Topics.some(t => t.id === p.topic_id))
          .map(p => new Date(p.completed_date).getTime()) || [];
        
        if (level2CompletionDates.length > 0) {
          const latestCompletionDate = new Date(Math.max(...level2CompletionDates));
          updatedLevelsInfo[1].completed_date = latestCompletionDate.toISOString();
        }
      }
      
      // Level 3 completion date
      if (completedLevel3.length === level3Topics.length && level3Topics.length > 0) {
        const level3CompletionDates = progressData
          ?.filter(p => level3Topics.some(t => t.id === p.topic_id))
          .map(p => new Date(p.completed_date).getTime()) || [];
        
        if (level3CompletionDates.length > 0) {
          const latestCompletionDate = new Date(Math.max(...level3CompletionDates));
          updatedLevelsInfo[2].completed_date = latestCompletionDate.toISOString();
        }
      }
      
      setLevelsInfo(updatedLevelsInfo);

      // Calculate progress percentages
      setProgress({
        level1: level1Topics.length > 0 ? Math.round((completedLevel1.length / level1Topics.length) * 100) : 0,
        level2: level2Topics.length > 0 ? Math.round((completedLevel2.length / level2Topics.length) * 100) : 0,
        level3: level3Topics.length > 0 ? Math.round((completedLevel3.length / level3Topics.length) * 100) : 0,
        total: totalTopics > 0 ? Math.round((completedTopicIds.length / totalTopics) * 100) : 0
      });

    } catch (error) {
      console.error('Error fetching training data:', error);
    } finally {
      setLoading(false);
    }
  };

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
          completed_date: new Date().toISOString()
        };

        const { error } = await supabase
          .from('member_training_progress')
          .insert([completionData]);

        if (error) throw error;
      }

      fetchTrainingData();
    } catch (error) {
      console.error('Error updating topic completion:', error);
    }
  };

  const toggleLevel = (level: number) => {
    setExpandedLevels(prev => 
      prev.includes(level) 
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const toggleSubject = (subject: string) => {
    setExpandedSubjects(prev =>
      prev.includes(subject)
        ? prev.filter(s => s !== subject)
        : [...prev, subject]
    );
  };

  // Get all unique subjects from topics
  const getSubjectsByLevel = (level: number) => {
    const levelTopics = topics.filter(topic => topic.level === level);
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

  // Format date for display
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not completed';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Get completion date for a topic
  const getTopicCompletionDate = (topicId: string) => {
    const completion = completedTopics.find(topic => topic.topic_id === topicId);
    return completion ? formatDate(completion.completed_date) : null;
  };

  // Get completion status for a topic
  const isTopicCompleted = (topicId: string) => {
    return completedTopics.some(topic => topic.topic_id === topicId);
  };

  // Calculate total hours completed
  const calculateTotalHours = () => {
    let totalHours = 0;
    const completedTopicIds = completedTopics.map(t => t.topic_id);
    
    topics.forEach(topic => {
      if (completedTopicIds.includes(topic.id) && topic.estimated_hours) {
        totalHours += topic.estimated_hours;
      }
    });
    
    return totalHours;
  };

  useEffect(() => {
    fetchTrainingData();
  }, [memberId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Overall Progress Summary */}
      <div className="mb-8 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Award className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-800">Foundational Training Progress</h2>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-600">Overall Completion</div>
            <div className="text-2xl font-bold text-blue-600">{progress.total}%</div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Level 1 Completed</div>
            <div className="text-lg font-semibold">{progress.level1}%</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Level 2 Completed</div>
            <div className="text-lg font-semibold">{progress.level2}%</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Level 3 Completed</div>
            <div className="text-lg font-semibold">{progress.level3}%</div>
          </div>
          <div className="bg-white p-3 rounded shadow-sm">
            <div className="text-sm text-gray-600">Total Hours</div>
            <div className="text-lg font-semibold">{calculateTotalHours()} hrs</div>
          </div>
        </div>
      </div>

      {/* Levels Section */}
      {levelsInfo.map((levelInfo) => {
        const subjects = getSubjectsByLevel(levelInfo.level);
        const isLevelExpanded = expandedLevels.includes(levelInfo.level);
        
        return (
          <div key={levelInfo.level} className="mb-6 border rounded-lg overflow-hidden">
            {/* Level Header */}
            <div 
              className="bg-gray-50 p-4 flex justify-between items-center cursor-pointer hover:bg-gray-100"
              onClick={() => toggleLevel(levelInfo.level)}
            >
              <div className="flex items-center">
                <div className="mr-3">
                  {isLevelExpanded ? 
                    <ChevronUp className="h-5 w-5 text-gray-500" /> : 
                    <ChevronDown className="h-5 w-5 text-gray-500" />
                  }
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-800">
                    {levelInfo.name} (Level {levelInfo.level})
                  </h3>
                  <p className="text-sm text-gray-600">{levelInfo.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Completion</div>
                  <div className="font-bold text-blue-600">
                    {progress[`level${levelInfo.level}` as keyof typeof progress]}%
                  </div>
                </div>
                {levelInfo.completed_date && (
                  <div className="text-right">
                    <div className="text-sm text-gray-600">Completed on</div>
                    <div className="text-sm font-medium text-green-600">
                      {formatDate(levelInfo.completed_date)}
                    </div>
                  </div>
                )}
                {levelInfo.required_for_certification && (
                  <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
                    Required
                  </div>
                )}
              </div>
            </div>

            {/* Level Content */}
            {isLevelExpanded && (
              <div className="p-4">
                {/* Progress Bar */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span>Progress</span>
                    <span>{progress[`level${levelInfo.level}` as keyof typeof progress]}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full" 
                      style={{ width: `${progress[`level${levelInfo.level}` as keyof typeof progress]}%` }}
                    ></div>
                  </div>
                </div>

                {/* Subjects */}
                {subjects.map((subject) => {
                  const subjectTopics = getTopicsByLevelAndSubject(levelInfo.level, subject);
                  const completedInSubject = subjectTopics.filter(topic => 
                    isTopicCompleted(topic.id)
                  ).length;
                  const subjectProgress = subjectTopics.length > 0 
                    ? Math.round((completedInSubject / subjectTopics.length) * 100) 
                    : 0;
                  const isSubjectExpanded = expandedSubjects.includes(`${levelInfo.level}-${subject}`);
                  
                  return (
                    <div key={`${levelInfo.level}-${subject}`} className="mb-4 border rounded-lg">
                      <div 
                        className="bg-gray-50 p-3 flex justify-between items-center cursor-pointer hover:bg-gray-100"
                        onClick={() => toggleSubject(`${levelInfo.level}-${subject}`)}
                      >
                        <div className="flex items-center">
                          <BookOpen className="h-4 w-4 text-gray-500 mr-2" />
                          <h4 className="font-medium text-gray-800">{subject}</h4>
                        </div>
                        <div className="flex items-center space-x-3">
                          <span className="text-sm text-gray-600">
                            {completedInSubject}/{subjectTopics.length} topics
                          </span>
                          <span className="text-sm font-medium text-blue-600">{subjectProgress}%</span>
                          {isSubjectExpanded ? 
                            <ChevronUp className="h-4 w-4 text-gray-500" /> : 
                            <ChevronDown className="h-4 w-4 text-gray-500" />
                          }
                        </div>
                      </div>

                      {/* Topics List */}
                      {isSubjectExpanded && (
                        <div className="p-3">
                          {subjectTopics.map((topic) => {
                            const completed = isTopicCompleted(topic.id);
                            const completionDate = getTopicCompletionDate(topic.id);
                            
                            return (
                              <div 
                                key={topic.id}
                                className="flex items-center justify-between p-3 hover:bg-gray-50 rounded mb-2"
                              >
                                <div className="flex items-center">
                                  <button
                                    onClick={() => handleTopicToggle(topic.id, completed)}
                                    disabled={!canEditTraining}
                                    className={`mr-3 ${!canEditTraining ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
                                  >
                                    {completed ? (
                                      <CheckCircle className="h-5 w-5 text-green-500" />
                                    ) : (
                                      <Circle className="h-5 w-5 text-gray-300" />
                                    )}
                                  </button>
                                  <div>
                                    <div className="font-medium text-gray-800">{topic.topic_name}</div>
                                    {topic.description && (
                                      <div className="text-sm text-gray-600">{topic.description}</div>
                                    )}
                                    {completionDate && (
                                      <div className="flex items-center text-sm text-green-600 mt-1">
                                        <Calendar className="h-3 w-3 mr-1" />
                                        Completed on {completionDate}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                <div className="text-right">
                                  {topic.estimated_hours && (
                                    <div className="text-sm text-gray-600">
                                      {topic.estimated_hours} hour{topic.estimated_hours !== 1 ? 's' : ''}
                                    </div>
                                  )}
                                  <div className="text-xs text-gray-500">
                                    Order: {topic.topic_order}
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

                {/* No Subjects Fallback */}
                {subjects.length === 0 && (
                  <div className="text-center py-4 text-gray-500">
                    No subjects available for this level
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}

      {/* Completion Summary */}
      <div className="mt-8 p-4 bg-green-50 rounded-lg">
        <h3 className="font-bold text-lg text-gray-800 mb-2">Training Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <div className="text-sm text-gray-600">Total Topics Completed</div>
            <div className="text-xl font-bold text-green-600">
              {completedTopics.length} of {topics.length}
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600">Total Training Hours</div>
            <div className="text-xl font-bold text-green-600">
              {calculateTotalHours()} hours
            </div>
          </div>
        </div>
        
        {/* Level Completion Dates */}
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
          {levelsInfo.map((level) => (
            <div key={level.level} className="bg-white p-3 rounded shadow-sm">
              <div className="text-sm font-medium text-gray-800">Level {level.level}</div>
              <div className="text-sm text-gray-600">
                {level.completed_date 
                  ? `Completed: ${formatDate(level.completed_date)}`
                  : 'In Progress'
                }
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FoundationalTraining;
