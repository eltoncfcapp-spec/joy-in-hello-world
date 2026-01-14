import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { CheckCircle, Circle, BookOpen, Calendar, Award } from 'lucide-react';

interface FoundationalTrainingProps {
  memberId: string;
  currentUserId: string;
  canEditTraining: boolean;
}

const FoundationalTraining: React.FC<FoundationalTrainingProps> = ({
  memberId,
  currentUserId,
  canEditTraining
}) => {
  const [topics, setTopics] = useState<FoundationalTopic[]>([]);
  const [completedTopics, setCompletedTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState({
    level1: 0,
    level2: 0,
    level3: 0,
    total: 0
  });

  // Fetch topics and progress
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

      // Fetch member's completed topics
      const { data: progressData, error: progressError } = await supabase
        .from('member_training_progress')
        .select('topic_id')
        .eq('member_id', memberId);

      if (progressError) throw progressError;
      
      const completed = progressData?.map(p => p.topic_id) || [];
      setCompletedTopics(completed);

      // Calculate progress
      const level1 = topicsData?.filter(t => t.level === 1).length || 0;
      const level2 = topicsData?.filter(t => t.level === 2).length || 0;
      const level3 = topicsData?.filter(t => t.level === 3).length || 0;
      const total = level1 + level2 + level3;

      const completedLevel1 = completed.filter(id => 
        topicsData?.find(t => t.id === id && t.level === 1)
      ).length;
      const completedLevel2 = completed.filter(id => 
        topicsData?.find(t => t.id === id && t.level === 2)
      ).length;
      const completedLevel3 = completed.filter(id => 
        topicsData?.find(t => t.id === id && t.level === 3)
      ).length;

      setProgress({
        level1: Math.round((completedLevel1 / level1) * 100),
        level2: Math.round((completedLevel2 / level2) * 100),
        level3: Math.round((completedLevel3 / level3) * 100),
        total: Math.round((completed.length / total) * 100)
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

  // ... rest of component implementation
};
