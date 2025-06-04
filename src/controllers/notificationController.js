import { getTenantDb } from '../config/db.js';
import notificationSchema from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  try {
    const notifications = await Notification.find();
    res.status(200).json(notifications);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createNotification = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  const notification = req.body;
  const newNotification = new Notification(notification);
  try {
    await newNotification.save();
    res.status(201).json(newNotification);
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const deleteNotification = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  const { id } = req.params;
  try {
    await Notification.findByIdAndRemove(id);
    res.json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const updateNotification = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  const { id } = req.params;
  const { title, message, isRead } = req.body;
  try {
    await Notification.findByIdAndUpdate(id, { title, message, isRead }, { new: true });
    res.json({ message: 'Notification updated successfully.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  const { id } = req.params;
  try {
    await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  try {
    await Notification.updateMany({}, { isRead: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const clearNotifications = async (req, res) => {
  const db = await getTenantDb(req.tenantId);
  const Notification = db.models.Notification || db.model('Notification', notificationSchema);
  try {
    await Notification.deleteMany({});
    res.json({ message: 'All notifications cleared.' });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(409).json({ message: error.message });
  }
};
