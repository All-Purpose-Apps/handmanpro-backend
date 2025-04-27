import express from 'express';
const router = express.Router();
import {
  getNotifications,
  createNotification,
  deleteNotification,
  updateNotification,
  markAsRead,
  markAllAsRead,
} from '../controllers/notificationController.js';

// @route   GET /api/notifications
// @desc    Get all notifications
router.get('/', getNotifications);

// @route   POST /api/notifications
// @desc    Create a new notification
router.post('/', createNotification);

// @route   PUT /api/notifications/:id
// @desc    Update a notification
router.put('/:id', updateNotification);

// @route   DELETE /api/notifications/:id
// @desc    Delete a notification
router.delete('/:id', deleteNotification);

// @route   PUT /api/notifications/markAsRead/:id
// @desc    Mark a notification as read
router.patch('/markAsRead/:id', markAsRead);

// @route   PUT /api/notifications/markAllAsRead
// @desc    Mark all notifications as read
router.put('/markAllAsRead', markAllAsRead);

export default router;
