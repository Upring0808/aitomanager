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
  if (!timestamp) return '--:--';
  
  try {
    // Convert to UTC and add 8 hours for Philippines timezone
    const utcDate = new Date(timestamp);
    const philippinesTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    
    // Format as HH:MM
    const hours = philippinesTime.getUTCHours().toString().padStart(2, '0');
    const minutes = philippinesTime.getUTCMinutes().toString().padStart(2, '0');
    
    return `${hours}:${minutes}`;
  } catch (error) {
    console.error('Error formatting UTC time:', error);
    return '--:--';
  }
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
  if (!timestamp) return null;
  
  try {
    const now = new Date();
    const utcDate = new Date(timestamp);
    const philippinesTime = new Date(utcDate.getTime() + (8 * 60 * 60 * 1000));
    const philippinesNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    const diffInMinutes = Math.floor((philippinesNow.getTime() - philippinesTime.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  } catch (error) {
    console.error('Error formatting UTC relative time:', error);
    return null;
  }
}; 