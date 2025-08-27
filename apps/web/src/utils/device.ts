/**
 * Utility functions for device detection
 */

/**
 * Detects if the current device is a mobile device
 * @returns true if the device is mobile, false otherwise
 */
export const isMobileDevice = (): boolean => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.matchMedia && window.matchMedia("(max-width: 768px)").matches) ||
           ('ontouchstart' in window);
};
