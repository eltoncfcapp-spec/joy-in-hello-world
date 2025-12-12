// FIXED: Optimized bulk attendance saving using Supabase's upsert
const saveAttendanceWithChunking = async (eventId: string) => {
  if (Object.keys(bulkAttendance).length === 0) {
    setError('No attendance data to save');
    setTimeout(() => setError(null), 3000);
    return;
  }

  setSavingProgress({ 
    current: 0, 
    total: Object.keys(bulkAttendance).length, 
    isSaving: true 
  });
  setError(null);
  setSuccess(null);

  try {
    const event = events.find(e => e.id === eventId);
    if (!event) throw new Error('Event not found');

    // Prepare all records in a single array
    const allRecords = [];
    const memberIds = Object.keys(bulkAttendance);
    
    for (const memberId of memberIds) {
      const status = bulkAttendance[memberId];
      const notes = attendanceNotesRef.current[memberId] || '';
      
      allRecords.push({
        event_id: eventId,
        members_id: memberId,
        first_time: false,
        invited_by_id: null,
        attendance_status: status,
        attended_at: status === 'present' ? new Date().toISOString() : null,
        notes: notes || null,
        updated_at: new Date().toISOString()
      });
    }

    // Save in chunks of 100 records for better performance
    const chunkSize = 100;
    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < allRecords.length; i += chunkSize) {
      const chunk = allRecords.slice(i, i + chunkSize);
      
      try {
        // Use upsert with onConflict for each chunk
        const { error: chunkError } = await supabase
          .from('event_attendees')
          .upsert(chunk, {
            onConflict: 'event_id,members_id',
            ignoreDuplicates: false
          });

        if (chunkError) {
          console.error(`Chunk ${Math.floor(i/chunkSize) + 1} error:`, chunkError);
          
          // Fallback to individual saves for this chunk
          for (const record of chunk) {
            try {
              const { error: singleError } = await supabase
                .from('event_attendees')
                .upsert([record], {
                  onConflict: 'event_id,members_id'
                });
              
              if (singleError) {
                console.error(`Single record error for member ${record.members_id}:`, singleError);
                failCount++;
              } else {
                successCount++;
              }
            } catch (singleRecordError) {
              console.error(`Single record exception:`, singleRecordError);
              failCount++;
            }
          }
        } else {
          successCount += chunk.length;
        }
        
        // Update progress
        setSavingProgress(prev => ({
          ...prev,
          current: Math.min(i + chunk.length, allRecords.length)
        }));
        
      } catch (chunkException) {
        console.error(`Chunk ${Math.floor(i/chunkSize) + 1} exception:`, chunkException);
        failCount += chunk.length;
      }
    }

    // Update event timestamp
    await supabase
      .from('events')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', eventId);

    // Invalidate cache for this event
    supabaseCache.delete(`event_attendees_${eventId}`);
    
    // Refresh attendees after saving
    await fetchEventAttendees(eventId);

    if (failCount === 0) {
      setSuccess(`Successfully saved attendance for ${successCount} members!`);
      closeBulkAttendanceModal();
    } else {
      setError(`Saved ${successCount} members, failed to save ${failCount} members.`);
    }

  } catch (error: any) {
    console.error('Error in bulk attendance saving:', error);
    setError(error.message || 'Failed to save bulk attendance.');
  } finally {
    setSavingProgress({ current: 0, total: 0, isSaving: false });
  }
};
