import { Router, Request, Response } from 'express';
import { meetingService } from '../services/meeting.service';
import { authenticateToken, requireTenant, checkMeetingAccess } from '../middleware/auth';
import logger from '../utils/logger';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /meetings - Get all meetings for tenant
router.get('/', requireTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;
    const status = req.query.status as string;

    let meetings;

    if (status === 'active') {
      meetings = await meetingService.getActiveMeetings(tenantId);
    } else if (status === 'scheduled') {
      const startDate = req.query.start_date ? new Date(req.query.start_date as string) : undefined;
      const endDate = req.query.end_date ? new Date(req.query.end_date as string) : undefined;
      meetings = await meetingService.getScheduledMeetings(tenantId, startDate, endDate);
    } else {
      meetings = await meetingService.getMeetingsByTenant(tenantId, limit, offset);
    }

    res.json({
      success: true,
      data: meetings,
      count: meetings.length,
    });
  } catch (error: any) {
    logger.error('Error getting meetings', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// GET /meetings/:id - Get meeting by ID
router.get('/:id', checkMeetingAccess, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const meeting = await meetingService.getMeeting(meetingId);

    if (!meeting) {
      res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
      return;
    }

    // Check if user has access to this meeting's tenant
    if (meeting.tenant_id !== req.user!.tenant_id && !meeting.is_public) {
      res.status(403).json({
        success: false,
        error: 'Access denied',
      });
      return;
    }

    // Get participants and chat messages if requested
    const includeParticipants = req.query.include_participants === 'true';
    const includeMessages = req.query.include_messages === 'true';

    let participants;
    let messages;

    if (includeParticipants) {
      participants = await meetingService.getParticipants(meetingId, true);
    }

    if (includeMessages) {
      messages = await meetingService.getChatMessages(meetingId);
    }

    res.json({
      success: true,
      data: {
        meeting,
        participants,
        messages,
      },
    });
  } catch (error: any) {
    logger.error('Error getting meeting', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// POST /meetings - Create new meeting
router.post('/', requireTenant, async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenant_id;
    const hostId = req.user!.user_id;
    const {
      title,
      description,
      scheduled_start,
      scheduled_end,
      recording_enabled,
      is_public,
      max_participants,
      password,
      lobby_enabled,
    } = req.body;

    if (!title) {
      res.status(400).json({
        success: false,
        error: 'Meeting title is required',
      });
      return;
    }

    const meeting = await meetingService.createMeeting(tenantId, hostId, {
      title,
      description,
      scheduled_start: scheduled_start ? new Date(scheduled_start) : undefined,
      scheduled_end: scheduled_end ? new Date(scheduled_end) : undefined,
      recording_enabled,
      is_public,
      max_participants,
      password,
      lobby_enabled,
    });

    res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (error: any) {
    logger.error('Error creating meeting', { error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// PUT /meetings/:id - Update meeting
router.put('/:id', checkMeetingAccess, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const meeting = await meetingService.getMeeting(meetingId);

    if (!meeting) {
      res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
      return;
    }

    // Check if user is the host or has proper permissions
    if (meeting.host_id !== req.user!.user_id && meeting.tenant_id !== req.user!.tenant_id) {
      res.status(403).json({
        success: false,
        error: 'Only the host can update the meeting',
      });
      return;
    }

    const updates = req.body;
    const updatedMeeting = await meetingService.updateMeeting(meetingId, updates);

    res.json({
      success: true,
      data: updatedMeeting,
    });
  } catch (error: any) {
    logger.error('Error updating meeting', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// DELETE /meetings/:id - Delete meeting
router.delete('/:id', checkMeetingAccess, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const meeting = await meetingService.getMeeting(meetingId);

    if (!meeting) {
      res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
      return;
    }

    // Check if user is the host
    if (meeting.host_id !== req.user!.user_id) {
      res.status(403).json({
        success: false,
        error: 'Only the host can delete the meeting',
      });
      return;
    }

    await meetingService.deleteMeeting(meetingId);

    res.json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error: any) {
    logger.error('Error deleting meeting', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// POST /meetings/:id/start - Start a scheduled meeting
router.post('/:id/start', checkMeetingAccess, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const meeting = await meetingService.getMeeting(meetingId);

    if (!meeting) {
      res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
      return;
    }

    // Check if user is the host
    if (meeting.host_id !== req.user!.user_id) {
      res.status(403).json({
        success: false,
        error: 'Only the host can start the meeting',
      });
      return;
    }

    const startedMeeting = await meetingService.startMeeting(meetingId);

    res.json({
      success: true,
      data: startedMeeting,
    });
  } catch (error: any) {
    logger.error('Error starting meeting', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// POST /meetings/:id/end - End a meeting
router.post('/:id/end', checkMeetingAccess, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const meeting = await meetingService.getMeeting(meetingId);

    if (!meeting) {
      res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
      return;
    }

    // Check if user is the host
    if (meeting.host_id !== req.user!.user_id) {
      res.status(403).json({
        success: false,
        error: 'Only the host can end the meeting',
      });
      return;
    }

    const endedMeeting = await meetingService.endMeeting(meetingId);

    res.json({
      success: true,
      data: endedMeeting,
    });
  } catch (error: any) {
    logger.error('Error ending meeting', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// GET /meetings/:id/participants - Get meeting participants
router.get('/:id/participants', checkMeetingAccess, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const activeOnly = req.query.active === 'true';

    const participants = await meetingService.getParticipants(meetingId, activeOnly);

    res.json({
      success: true,
      data: participants,
      count: participants.length,
    });
  } catch (error: any) {
    logger.error('Error getting participants', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// GET /meetings/:id/stats - Get meeting statistics
router.get('/:id/stats', checkMeetingAccess, async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const stats = await meetingService.getMeetingStats(meetingId);

    res.json({
      success: true,
      data: stats,
    });
  } catch (error: any) {
    logger.error('Error getting meeting stats', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// POST /meetings/:id/join - Join meeting (HTTP endpoint, actual joining via WebSocket)
router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const meetingId = req.params.id;
    const { password } = req.body;

    const meeting = await meetingService.getMeeting(meetingId);

    if (!meeting) {
      res.status(404).json({
        success: false,
        error: 'Meeting not found',
      });
      return;
    }

    // Validate password if required
    if (meeting.password && meeting.password !== password) {
      res.status(403).json({
        success: false,
        error: 'Invalid password',
      });
      return;
    }

    // Return meeting info (actual join happens via WebSocket)
    res.json({
      success: true,
      data: {
        meeting,
        message: 'Connect via WebSocket to join the meeting',
      },
    });
  } catch (error: any) {
    logger.error('Error validating meeting join', { meetingId: req.params.id, error });
    res.status(500).json({
      success: false,
      error: error.message || 'Internal server error',
    });
  }
});

// Health check endpoint
router.get('/health', (req: Request, res: Response) => {
  res.json({
    success: true,
    service: 'nexus-meet-service',
    status: 'healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
