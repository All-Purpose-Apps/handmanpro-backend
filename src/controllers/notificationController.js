import Notification from '../models/Notification.js';

export const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find();
    res.status(200).json(notifications);
  } catch (error) {
    res.status(404).json({ message: error.message });
  }
};

export const createNotification = async (req, res) => {
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
  const { id } = req.params;
  try {
    await Notification.findByIdAndRemove(id);
    res.json({ message: 'Notification deleted successfully.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const updateNotification = async (req, res) => {
  const { id } = req.params;
  const { title, message, read } = req.body;
  try {
    await Notification.findByIdAndUpdate(id, { title, message, read }, { new: true });
    res.json({ message: 'Notification updated successfully.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const markAsRead = async (req, res) => {
  const { id } = req.params;
  try {
    await Notification.findByIdAndUpdate(id, { read: true }, { new: true });
    res.json({ message: 'Notification marked as read.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};

export const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({}, { read: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(409).json({ message: error.message });
  }
};
