/**
 * Utility functions for UTC time formatting
 * Philippines timezone (UTC+8) is considered for display
 */

/**
 * Format timestamp to UTC time in HH:MM format (Philippines timezone)
 * @param {Date} timestamp - The timestamp to format
 * @returns {string} - Formatted time string (e.g., "14:30")
 */
export const formatUTCTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  return date.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  });
};

/**
 * Format timestamp to UTC date and time for detailed display
 * @param {Date} timestamp - The timestamp to format
 * @returns {string} - Formatted date and time string
 */
export const formatUTCDateTime = (timestamp) => {
  if (!timestamp) return '--:--';
  
  try {
    // Convert to UTC and add 8 hours for Philippines timezone
    const utcDate = new Date(timestamp);
    const philippinesTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    
    // Format as "MMM DD, YYYY HH:MM"
    const options = {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'UTC'
    };
    
    return philippinesTime.toLocaleDateString('en-US', options);
  } catch (error) {
    console.error('Error formatting UTC date time:', error);
    return '--:--';
  }
};

/**
 * Format relative time (e.g., "2m ago", "1h ago") in UTC
 * @param {Date} timestamp - The timestamp to format
 * @returns {string} - Formatted relative time string
 */
export const formatUTCRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp instanceof Date ? timestamp : new Date(timestamp);
  const now = new Date();
  // Use Asia/Manila time zone for both dates
  const philippineDate = new Date(date.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const philippineNow = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Manila' }));
  const diffInSeconds = Math.floor((philippineNow - philippineDate) / 1000);
  if (diffInSeconds < 60) return 'Just now';
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return philippineDate.toLocaleDateString('en-PH', {
    month: 'short',
    day: 'numeric',
    timeZone: 'Asia/Manila'
  });
}; 

import dayjs from 'dayjs';
import utc from 'dayjs/plugin/utc';
import timezone from 'dayjs/plugin/timezone';
import localizedFormat from 'dayjs/plugin/localizedFormat';
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.extend(localizedFormat);

export function formatChatTimestamp(utcTimestamp) {
  if (!utcTimestamp) return '';
  const manila = dayjs(utcTimestamp).tz('Asia/Manila');
  const now = dayjs().tz('Asia/Manila');
  if (manila.isSame(now, 'day')) {
    return manila.format('h:mm A');
  } else {
    return manila.format('D MMM [at] h:mm A');
  }
} 