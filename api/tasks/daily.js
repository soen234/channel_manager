const { requireAuth, supabase } = require('../_middleware');

module.exports = async (req, res) => {
  const authResult = await requireAuth(req, res);
  if (authResult.error) {
    return res.status(authResult.status).json({ error: authResult.error });
  }

  const userId = authResult.userId;
  const organizationId = authResult.organizationId;

  if (req.method === 'GET') {
    try {
      const { date } = req.query;

      if (!date) {
        return res.status(400).json({ error: 'Date parameter is required' });
      }

      // Get all tasks for the organization on this date
      const { data: tasks, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('task_date', date)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get user names for assigned_to and completed_by
      const userIds = new Set();
      tasks.forEach(task => {
        if (task.assigned_to) userIds.add(task.assigned_to);
        if (task.completed_by) userIds.add(task.completed_by);
      });

      let userMap = {};
      if (userIds.size > 0) {
        const { data: userRoles, error: userRolesError } = await supabase
          .from('user_roles')
          .select('user_id, email')
          .in('user_id', Array.from(userIds));

        if (userRoles) {
          userRoles.forEach(u => { userMap[u.user_id] = u.email; });
        }
      }

      // Enrich tasks with user names
      const enrichedTasks = tasks.map(task => ({
        ...task,
        assigned_to_name: task.assigned_to ? userMap[task.assigned_to] : null,
        completed_by_name: task.completed_by ? userMap[task.completed_by] : null
      }));

      res.json(enrichedTasks);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'POST') {
    try {
      const { title, description, task_date, assigned_to } = req.body;

      if (!title || !task_date) {
        return res.status(400).json({ error: 'Title and task_date are required' });
      }

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          organization_id: organizationId,
          title,
          description,
          task_date,
          assigned_to: assigned_to || null
        })
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error('Failed to create task:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'PATCH') {
    try {
      const { id } = req.query;
      const { completed } = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }

      const updateData = {
        completed,
        updated_at: new Date().toISOString()
      };

      if (completed) {
        updateData.completed_at = new Date().toISOString();
        updateData.completed_by = userId;
      } else {
        updateData.completed_at = null;
        updateData.completed_by = null;
      }

      const { data, error } = await supabase
        .from('tasks')
        .update(updateData)
        .eq('id', id)
        .eq('organization_id', organizationId)
        .select()
        .single();

      if (error) throw error;

      res.json(data);
    } catch (error) {
      console.error('Failed to update task:', error);
      res.status(500).json({ error: error.message });
    }
  } else if (req.method === 'DELETE') {
    try {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Task ID is required' });
      }

      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id)
        .eq('organization_id', organizationId);

      if (error) throw error;

      res.json({ success: true });
    } catch (error) {
      console.error('Failed to delete task:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
};
