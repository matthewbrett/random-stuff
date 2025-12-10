/**
 * MenuController - Reusable menu navigation controller
 * Handles up/down selection with wrap-around for any menu system
 */
export default class MenuController {
  /**
   * Create a menu controller
   * @param {string[]} items - Array of menu item labels
   */
  constructor(items) {
    this.items = items;
    this.selectedIndex = 0;
    this.onSelectionChange = null;
  }

  /**
   * Move selection up (with wrap-around)
   * @returns {number} New selected index
   */
  moveUp() {
    this.selectedIndex = (this.selectedIndex - 1 + this.items.length) % this.items.length;
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedIndex, this.items[this.selectedIndex]);
    }
    return this.selectedIndex;
  }

  /**
   * Move selection down (with wrap-around)
   * @returns {number} New selected index
   */
  moveDown() {
    this.selectedIndex = (this.selectedIndex + 1) % this.items.length;
    if (this.onSelectionChange) {
      this.onSelectionChange(this.selectedIndex, this.items[this.selectedIndex]);
    }
    return this.selectedIndex;
  }

  /**
   * Get the current selected index
   * @returns {number} Selected index
   */
  getSelectedIndex() {
    return this.selectedIndex;
  }

  /**
   * Get the current selected item label
   * @returns {string} Selected item label
   */
  getSelectedItem() {
    return this.items[this.selectedIndex];
  }

  /**
   * Set callback for selection changes
   * @param {function} callback - Called with (index, item) on selection change
   */
  setOnSelectionChange(callback) {
    this.onSelectionChange = callback;
  }

  /**
   * Reset selection to first item
   */
  reset() {
    this.selectedIndex = 0;
  }

  /**
   * Get total number of items
   * @returns {number} Item count
   */
  getItemCount() {
    return this.items.length;
  }
}
