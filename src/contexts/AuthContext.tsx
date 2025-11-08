import React, { useState, useEffect } from 'react';
import { supabase } from '../integrations/supabase/client';
import { useAuth } from '../contexts/AuthContext';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  IconButton,
  Paper
} from '@mui/material';
import { Edit, Delete, Add, Group } from '@mui/icons-material';

interface CellGroup {
  id: string;
  name: string;
  description: string | null;
  meeting_day: string | null;
  meeting_time: string | null;
  location: string | null;
  leader_id: string | null;
  status: 'active' | 'inactive';
  created_at: string;
  members_count?: number;
}

const CellGroups: React.FC = () => {
  const { profile } = useAuth();
  const [groups, setGroups] = useState<CellGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<CellGroup | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    meeting_day: '',
    meeting_time: '',
    location: '',
    status: 'active' as 'active' | 'inactive'
  });

  const fetchGroups = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cell_groups')
        .select(`
          *,
          members:members(count)
        `)
        .order('name');

      if (error) throw error;

      const groupsWithCount = data?.map(group => ({
        ...group,
        members_count: group.members?.[0]?.count || 0
      })) || [];

      setGroups(groupsWithCount);
    } catch (err) {
      console.error('Error fetching groups:', err);
      setError('Failed to load cell groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const handleOpenDialog = (group?: CellGroup) => {
    if (group) {
      setEditingGroup(group);
      setFormData({
        name: group.name,
        description: group.description || '',
        meeting_day: group.meeting_day || '',
        meeting_time: group.meeting_time || '',
        location: group.location || '',
        status: group.status
      });
    } else {
      setEditingGroup(null);
      setFormData({
        name: '',
        description: '',
        meeting_day: '',
        meeting_time: '',
        location: '',
        status: 'active'
      });
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setEditingGroup(null);
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setError(null);

      if (editingGroup) {
        const { error } = await supabase
          .from('cell_groups')
          .update(formData)
          .eq('id', editingGroup.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('cell_groups')
          .insert([formData]);

        if (error) throw error;
      }

      await fetchGroups();
      handleCloseDialog();
    } catch (err) {
      console.error('Error saving group:', err);
      setError('Failed to save cell group');
    }
  };

  const handleDelete = async (groupId: string) => {
    if (!window.confirm('Are you sure you want to delete this cell group?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('cell_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      await fetchGroups();
    } catch (err) {
      console.error('Error deleting group:', err);
      setError('Failed to delete cell group');
    }
  };

  const canEditGroup = (group: CellGroup) => {
    if (!profile) return false;
    if (profile.isAdmin) return true;
    if (profile.role === 'group_leader') {
      return profile.assigned_groups?.includes(group.id);
    }
    return false;
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <Typography>Loading cell groups...</Typography>
      </Box>
    );
  }

  return (
    <Box p={3}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4" component="h1">
          Cell Groups
        </Typography>
        {profile?.isAdmin && (
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => handleOpenDialog()}
          >
            Add Group
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {groups.map((group) => (
          <Grid item xs={12} md={6} lg={4} key={group.id}>
            <Card>
              <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                  <Box display="flex" alignItems="center">
                    <Group sx={{ mr: 1, color: 'primary.main' }} />
                    <Typography variant="h6" component="h2">
                      {group.name}
                    </Typography>
                  </Box>
                  <Chip
                    label={group.status}
                    color={group.status === 'active' ? 'success' : 'default'}
                    size="small"
                  />
                </Box>

                {group.description && (
                  <Typography color="textSecondary" paragraph>
                    {group.description}
                  </Typography>
                )}

                <Box mb={2}>
                  {group.meeting_day && group.meeting_time && (
                    <Typography variant="body2">
                      <strong>Meeting:</strong> {group.meeting_day} at {group.meeting_time}
                    </Typography>
                  )}
                  {group.location && (
                    <Typography variant="body2">
                      <strong>Location:</strong> {group.location}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Members:</strong> {group.members_count || 0}
                  </Typography>
                </Box>

                {canEditGroup(group) && (
                  <Box display="flex" gap={1}>
                    <IconButton
                      size="small"
                      onClick={() => handleOpenDialog(group)}
                      color="primary"
                    >
                      <Edit />
                    </IconButton>
                    {profile?.isAdmin && (
                      <IconButton
                        size="small"
                        onClick={() => handleDelete(group.id)}
                        color="error"
                      >
                        <Delete />
                      </IconButton>
                    )}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {groups.length === 0 && (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography variant="h6" color="textSecondary">
            No cell groups found
          </Typography>
          {profile?.isAdmin && (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={() => handleOpenDialog()}
              sx={{ mt: 2 }}
            >
              Create First Group
            </Button>
          )}
        </Paper>
      )}

      <Dialog open={dialogOpen} onClose={handleCloseDialog} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingGroup ? 'Edit Cell Group' : 'Add New Cell Group'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Group Name"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
            <TextField
              margin="dense"
              label="Description"
              type="text"
              fullWidth
              variant="outlined"
              multiline
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Meeting Day"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.meeting_day}
              onChange={(e) => setFormData({ ...formData, meeting_day: e.target.value })}
              placeholder="e.g., Tuesday"
            />
            <TextField
              margin="dense"
              label="Meeting Time"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.meeting_time}
              onChange={(e) => setFormData({ ...formData, meeting_time: e.target.value })}
              placeholder="e.g., 7:00 PM"
            />
            <TextField
              margin="dense"
              label="Location"
              type="text"
              fullWidth
              variant="outlined"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
            />
            <FormControl fullWidth margin="dense">
              <InputLabel>Status</InputLabel>
              <Select
                value={formData.status}
                label="Status"
                onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseDialog}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingGroup ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
};

export default CellGroups;
