// Utility functions for the subscription tracker application

/**
 * Validates an email address format.
 * @param {string} email - The email address to validate.
 * @returns {boolean} - Returns true if the email is valid, otherwise false.
 */
function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

/**
 * Formats a date to a more readable string.
 * @param {Date} date - The date to format.
 * @returns {string} - Returns the formatted date string.
 */
function formatDate(date) {
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString(undefined, options);
}

/**
 * Calculates the total cost of subscriptions.
 * @param {Array} subscriptions - An array of subscription objects.
 * @returns {number} - Returns the total cost of all subscriptions.
 */
function calculateTotalCost(subscriptions) {
    return subscriptions.reduce((total, subscription) => total + subscription.cost, 0);
}

// Exporting utility functions for use in other modules
export { validateEmail, formatDate, calculateTotalCost };