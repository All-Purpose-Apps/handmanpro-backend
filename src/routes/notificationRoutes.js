import express from 'express';
const router = express.Router();
import {
  getNotifications,
  createNotification,
  deleteNotification,
  updateNotification,
  markAsRead,
  markAllAsRead,
  clearNotifications,
} from '../controllers/notificationController.js';

// @route   GET /api/notifications
// @desc    Get all notifications
router.get('/', getNotifications);

// @route   POST /api/notifications
// @desc    Create a new notification
router.post('/', createNotification);

// @route   PUT /api/notifications/markAsRead/:id
// @desc    Mark a notification as read
router.patch('/markAsRead/:id', markAsRead);

// @route   PUT /api/notifications/markAllAsRead
// @desc    Mark all notifications as read
router.patch('/markAllAsRead', markAllAsRead);

// @route   DELETE /api/notifications/clear
// @desc    Clear all notifications
router.delete('/clear', clearNotifications);

export default router;
