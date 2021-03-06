/**
 * @tag chassis-list
 * Provides functionality for a list of elements.
 * @fires item.create
 * Fired when an item is added to the list. The item which is
 * created is returned to the event handler.
 * @fires item.delete
 * Fired when an item is removed from the list. The item which is
 * removed is returned to the event handler.
 * @fires item.select
 * Fired when an item is selected from the list. The item which is
 * selected is returned to the event handler.
 * @fires item.unselect
 * Fired when a previously selected item is unselected. The item which is
 * unselected is returned to the event handler.
 * @fires item.filter
 * Fired when an item is filtered from the list. The item which is
 * filtered is returned to the event handler.
 * @fires item.unfilter
 * Fired when a previously filtered item is unselected. The item which is
 * unfiltered is returned to the event handler.
 */
var ChassisList = document.registerElement('chassis-list', { // eslint-disable-line no-undef, no-unused-vars
  prototype: Object.create(HTMLElement.prototype, { // eslint-disable-line no-undef
    // Initializes the web component.
    createdCallback: {
      value: function () {
        var me = this

        document.body.classList.add('chassis')

        // Add support for CMD key on OSX
        document.addEventListener('keydown', function (e) {
          // CMD on OSX
          if (e.keyCode === 91) {
            me.cmdKeyPressed = true
          }
        })

        document.addEventListener('keyup', function (e) {
          // CMD on OSX
          if (e.keyCode === 91) {
            me.cmdKeyPressed = false
          }
        })

        // Support other key actions
        this.addEventListener('keydown', function (e) {
          // Arrows
          me.applyArrowHandler(e)

          // Other key commands
          me.applyKeyCommands(e)

          // Shift
          if (e.keyCode === 16) {
            me.holdingShift = true
          } else if (!me.holdingShift) {
            me.trending = 0
          }
        })

        this.addEventListener('keyup', function (e) {
          // Shift
          if (e.keyCode === 16) {
            me.holdingShift = false
          }
        })

        // Apply event handlers to top level elements in the list
        this.items.forEach(function (el) {
          me.applyHandlers(el, me)
        })

        var observer = new MutationObserver(function (mutations) {
          mutations.forEach(function (mutation) {
            if (mutation.type === 'childList') {
              if (mutation.addedNodes.length > 0) {
                me.slice(mutation.addedNodes).forEach(function (el) {
                  me.applyHandlers(el, me)
                  me.dispatchEvent(new CustomEvent('item.create', { // eslint-disable-line no-undef
                    detail: {
                      item: el
                    }
                  }))
                })
              } else if (mutation.removedNodes.length > 0) {
                me.slice(mutation.removedNodes).forEach(function (el) {
                  me.dispatchEvent(new CustomEvent('item.delete', { // eslint-disable-line no-undef
                    detail: {
                      item: el
                    }
                  }))
                })
              }
            }
          })
        })

        observer.observe(this, {
          childList: true
        })

        // Force focus/blur Capabilities
        if (this.getAttribute('tabindex') === null) {
          this.setAttribute('tabindex', 0)
        }
      }
    },

    /**
     * @method applyHandlers
     * Applies event handlers a raw DOM element in the list.
     * @param {HTMLElement} element
     * The element that should be part of the list.
     * @param {Object} [scope=this]
     * The scope of the list.
     * @private
     */
    applyHandlers: {
      enumerable: false,
      writable: false,
      configurable: false,
      value: function (el, scope) {
        var me = scope || this

        // Listen for click
        el.addEventListener('click', function (e) {
          // If no command buttons are pressed, clear everything except the clicked item.
          if (!me.allowMultiSelection || (!me.holdingShift && !e.ctrlKey && !me.cmdKeyPressed && !e.altKey)) {
            me.clearSelected()
            me.toggleSelection(el)
            me.base = el
            me.last = el
            this.trending = 0
            return
          }

          if (e.ctrlKey || e.altKey || me.cmdKeyPressed) {
            if (me.holdingShift) {
              me.toggleSelection(me.last)
              me.toggleRangeSelection(me.indexOfParent(me.last), me.indexOfParent(el))
              me.base && me.toggleSelection(me.base)
            } else {
              me.toggleSelection(el)
            }
            me.last = el
            return
          }

          // If the shift button is pressed, selections should accrue.
          if (me.holdingShift) {
            me.base = me.base || me.last || el
            !(e.ctrlKey || e.altKey || me.cmdKeyPressed) && me.clearSelected()
            me.toggleRangeSelection(me.indexOfParent(me.base), me.indexOfParent(el))
          }
          me.last = el
        })
      }
    },

    /**
     * @method applyArrowHandler
     * A helper method to apply key/arrow event handlers to an event.
     * @param {Event} event
     * The event to augment.
     * @private
     */
    applyArrowHandler: {
      enumerable: false,
      value: function (e) {
        // An arrow key was pressed
        if (e.keyCode >= 37 && e.keyCode <= 40) {
          // User is holding shift key and there is an original element selected.
          if (this.holdingShift && this.last && this.allowMultiSelection) {
            var el = null
            var trendReversal = false

            if (e.keyCode >= 39) {
              // Down or Right
              el = this.nextItem(this.last)
              trendReversal = this.trending < 0
              this.trending = 1
            } else {
              // Up or Left
              el = this.previousItem(this.last)
              trendReversal = this.trending > 0
              this.trending = -1
            }

            // If rollover is active and the selection range has crossed
            // the threshold, check to make sure it's not restarting (cycling
            // over itself again)
            if (this.rollover && this.rolledover) {
              if ((this.trending < 0 && el === this.base) || (this.trending > 0 && el === this.base)) {
                e.preventDefault()
                return
              }
            }

            if (el !== null) {
              if (el === this.base) {
                this.last = this.base
                return
              }

              if (trendReversal) {
                this.toggleSelection(this.last)
              } else {
                // this.matchSelectionState(this.base, el)
                this.toggleSelection(el)
                this.last = el
              }
            }
          } else if (!this.holdingShift || !this.allowMultiSelection) {
            var el
            if (e.keyCode >= 39) {
              el = this.nextItem(this.last)
            } else {
              el = this.previousItem(this.last)
            }
            if (!this.rollover && el === null) {
              return
            }
            this.clearSelected()
            this.selectItem(el)
            this.last = el
            this.base = el
            e.preventDefault()
          }
        }
      }
    },

    applyKeyCommands: {
      enumerable: false,
      value: function (e) {
        if (e.keyCode === 65 && (e.ctrlKey || this.cmdKeyPressed)) {
          e.preventDefault()
          this.selectAll()
        }
      }
    },

    /**
     * @property {boolean} cmdKeyPressed
     * Indicates the CMD key is pressed  (OSX Only)
     * @private
     */
    cmdKeyPressed: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: false
    },

    /**
     * @property {boolean} holdingShift
     * Indicates the user is pressing/holding the shift key.
     * @private
     */
    holdingShift: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: false
    },

    /**
     * @property {HTMLElement} base
     * The origin/base/first element in a multi-selection range.
     * @private
     */
    base: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: null
    },

    // Holds the last element
    _last: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: null
    },

    /**
     * @property {number} trending
     * An indicator of the current sequential trend in a multi-selection.
     *
     * **From the #base element:**
     *
     * - A value of `1` indicates multi-selection is occurring sequentially in a
     * forward fashion.
     * - A value of `-1` indicates selection is occurring
     * sequentially in a reverse fashion.
     * - A value of `0` indicates no trend.
     * @private
     */
    trending: {
      enumerable: false,
      writable: true,
      configurable: false,
      value: 0
    },

    /**
     * @property {HTMLElement} last
     * The last element upon which an action happened (selection/filter/etc).
     * @private
     */
    last: {
      enumerable: false,
      get: function () {
        return this._last
      },
      set: function (el) {
        this._last = el
        if (this.base && this.holdingShift && this.trending === 0) {
          if (this.indexOfParent(this.last) > this.indexOfParent(this.base)) {
            this.trending = 1
          } else if (this.indexOfParent(this.last) < this.indexOfParent(this.base)) {
            this.trending = -1
          }
        }
      }
    },

    /**
     * @property {HTMLElement} lastSelected
     * The last item selected by the user. In a multi-selection,
     * this returns only the very last selected item.
     */
    lastSelected: {
      enumerable: true,
      get: function () {
        var s = this.selectedItems
        if (s.length === 0) {
          return null
        }
        return s[s.length - 1]
      }
    },

    /**
     * @property {boolean} allowMultiSelection
     * Indicates whether multi-selection is enabled or not.
     * @private
     */
    allowMultiSelection: {
      enumerable: false,
      get: function () {
        return this.getAttribute('multiselect') !== 'false'
      }
    },

    /**
     * @accessor {boolean} rollover
     * Indicates rollover is active.
     * @private
     */
    rollover: {
      enumerable: false,
      get: function () {
        return this.getAttribute('rollover') === 'true'
      }
    },

    /**
     * @accessor {boolean} rolledover
     * Indicates a rollover occurred.
     * @private
     */
    rolledover: {
      enumerable: false,
      get: function () {
        var a = this.children[0]
        var b = this.children[this.children.length - 1]
        return this.selected(a) && this.selected(b)
      }
    },

    /**
     * @method slice
     * Emulates Array.prototype.slice.
     * @param {Object} obj
     * The object to "convert" to an array-like format.
     * @return {Array}
     * @private
     */
    slice: {
      enumerable: false,
      writable: false,
      configurable: false,
      value: function (o) {
        return Array.prototype.slice.call(o)
      }
    },

    /**
     * @method indexOfParent
     * Identify the index number of an element relative to it's parent.
     * @param {HTMLElement} element
     * The element to identify.
     * @return {Number}
     * The index of the parent representing the element.
     * @private
     */
    indexOfParent: {
      enumerable: false,
      writable: false,
      configurable: false,
      value: function (el) {
        return this.slice(el.parentNode.children).indexOf(el)
      }
    },

    /**
     * @method getItemAt
     * Return the item at the specified index.
     * @param {Number} index
     * The index value.
     * @return {HTMLElement}
     * @private
     */
    getItemAt: {
      enumerable: true,
      value: function (i) {
        return this.items[i] || null
      }
    },

    /**
     * @property items
     * A reference to all items within the list.
     * @return {Array}
     * Returns an array of HTMLElement objects.
     */
    items: {
      enumerable: true,
      get: function () {
        return this.slice(this.children)
      }
    },

    /**
     * @method selected
     * Indicates whether the specified item is selected or not.
     * @param {HTMLElement} item
     * The element.
     * @return {boolean}
     * @private
     */
    selected: {
      enumerable: false,
      value: function (el) {
        if (!el) {
          return false
        }
        return el.getAttribute('selected') === 'true'
      }
    },

    /**
     * @method filtered
     * Indicates whether the specified item is filtered or not.
     * @param {HTMLElement} item
     * The element.
     * @return {boolean}
     * @private
     */
    filtered: {
      enumerable: false,
      value: function (el) {
        if (!el) {
          return false
        }
        return el.getAttribute('filter') === 'true'
      }
    },

    /**
     * @method toggleSelection
     * Reverse the selection status of an item.
     * @param {HTMLElement} item
     * The element.
     * @return {boolean}
     * @private
     */
    toggleSelection: {
      enumerable: false,
      value: function (el) {
        if (el) {
          if (this.selected(el)) {
            this.unselectItem(el)
          } else {
            this.selectItem(el)
          }
        }
      }
    },

    /**
     * @method toggleFilter
     * Reverse the filter status of an item.
     * @param {HTMLElement} item
     * The element.
     * @return {boolean}
     * @private
     */
    toggleFilter: {
      enumerable: false,
      value: function (el) {
        if (el) {
          if (this.filtered(el)) {
            this.unfilterItem(el)
          } else {
            this.filterItem(el)
          }
        }
      }
    },

    /**
     * @method filterItem
     * Mark an item as filtered. This is ignored if the item is already filtered.
     * @param {HTMLElement} item
     * The element to mark as filtered.
     * @return {boolean}
     */
    filterItem: {
      value: function (el) {
        if (!this.filtered(el)) {
          el.setAttribute('filter', 'true')
          this.dispatchEvent(new CustomEvent('item.filter', {
            detail: {
              item: el
            }
          }))
        }
      }
    },

    /**
     * @method unfilterItem
     * Mark an item as unfiltered (or remove filter mark). This is ignored if
     * the item isn't filtered.
     * @param {HTMLElement} item
     * The filtered element.
     * @return {boolean}
     */
    unfilterItem: {
      value: function (el) {
        if (this.filtered(el)) {
          el.removeAttribute('filter')
          this.dispatchEvent(new CustomEvent('item.unfilter', {
            detail: {
              item: el
            }
          }))
        }
      }
    },

    /**
     * @method selectItem
     * Mark an item as selected. This is ignored if the item is already selected.
     * @param {HTMLElement} item
     * The item to mark as selected.
     */
    selectItem: {
      value: function (el) {
        if (!this.selected(el)) {
          el.setAttribute('selected', 'true')
          this.dispatchEvent(new CustomEvent('item.select', {
            detail: {
              item: el
            }
          }))
        }
      }
    },

    /**
     * @method unselectItem
     * Remove selection. This is ignored if the item isn't already selected.
     * @param {HTMLElement} item
     * The item to mark as unselected.
     */
    unselectItem: {
      value: function (el) {
        if (this.selected(el)) {
          el.removeAttribute('selected')
          this.dispatchEvent(new CustomEvent('item.unselect', {
            detail: {
              item: el
            }
          }))
        }
      }
    },

    /**
     * @method toggleRangeSelection
     * Toggle the selection of items (by index). If you want to
     * force a range to be selected or unselected regardless of the items'
     * current state, use #selectRange or #unselectRange instead.
     * @param {number} from
     * The starting item index.
     * @param {number} to
     * The ending item index.
     */
    toggleRangeSelection: {
      enumerable: true,
      value: function (from, to) {
        this.trending = this.identifyTrend(from, to)
        var start = from < to ? from : to
        var end = from > to ? from : to
        if (from > to) {
          for (var i = end; i >= start; i--) {
            this.toggleSelection(this.children[i])
          }
        } else {
          for (var i = start; i <= end; i++) {
            this.toggleSelection(this.children[i])
          }
        }
      }
    },

    /**
     * @method selectRange
     * Mark all items within a range as "selected".
     * @param {Number} from
     * The item index that marks the beginning of the range.
     * @param {Number} to
     * The item index that marks the end of the range.
     */
    selectRange: {
      value: function (from, to) {
        this.trending = this.identifyTrend(from, to)
        var start = from < to ? from : to
        var end = from > to ? from : to
        if (from > to) {
          for (var i = end; i >= start; i--) {
            this.selectItem(this.children[i])
          }
        } else {
          for (var i = start; i <= end; i++) {
            this.selectItem(this.children[i])
          }
        }
      }
    },

    /**
     * @method unselectRange
     * Mark all items within a range as "unselected".
     * @param {Number} from
     * The item index that marks the beginning of the range.
     * @param {Number} to
     * The item index that marks the end of the range.
     */
    unselectRange: {
      value: function (from, to) {
        this.trending = this.identifyTrend(from, to)
        var start = from < to ? from : to
        var end = from > to ? from : to
        if (from > to) {
          for (var i = end; i >= start; i--) {
            this.unselectItem(this.children[i])
          }
        } else {
          for (var i = start; i <= end; i++) {
            this.unselectItem(this.children[i])
          }
        }
      }
    },

    /**
     * @method nextItem
     * Retrieve the next item in the list, relevant to another item within the
     * list. This ignores text nodes automatically.
     * @param {HTMLElement} item
     * The element to compare to.
     * @return {HTMLElement}
     * @private
     */
    nextItem: {
      enumerable: false,
      value: function (el) {
        if (el === this.children[this.children.length - 1]) {
          if (this.rollover) {
            return this.children[0]
          } else {
            return null
          }
        }
        var next = el.nextSibling
        while (next !== null && (next.nodeType === 3 || this.filtered(next))) {
          next = next.nextSibling
        }
        return next
      }
    },

    /**
     * @method previousItem
     * Retrieve the previous item in the list, relevant to another item within the
     * list. This ignores text nodes automatically.
     * @param {HTMLElement} item
     * The element to compare to.
     * @return {HTMLElement}
     * @private
     */
    previousItem: {
      enumerable: false,
      value: function (el) {
        if (el === this.children[0]) {
          if (this.rollover) {
            return this.children[this.children.length - 1]
          } else {
            return null
          }
        }
        var prev = el.previousSibling
        while (prev !== null && (prev.nodeType === 3 || this.filtered(prev))) {
          prev = prev.previousSibling
        }
        return prev
      }
    },

    /**
     * @method getSelectedItems
     * Return all items which are currently selected. By default, this does
     * **not** return items that are filtered out.
     * @param {boolean} [all=false]
     * Set this to `true` to include items which are selected but filtered out.
     * @return {Array}
     * Returns an array of HTMLElement items.
     */
    getSelectedItems: {
      value: function (includeFiltered) {
        var me = this
        includeFiltered = typeof includeFiltered === 'boolean' ? includeFiltered : false
        var selItems = this.items.filter(function (el) {
          if (!includeFiltered) {
            if (me.filtered(el)) {
              return false
            }
          }
          return me.selected(el)
        })
        return this.identifyTrend(this.base, this.last) < 0 ? selItems.reverse() : selItems
      }
    },

    /**
     * @method getUnselectedItems
     * Return all items which are **not** currently selected. By default, this does
     * **not** return items that are filtered out.
     * @param {boolean} [all=false]
     * Set this to `true` to include items which are unselected but filtered out.
     * @return {Array}
     * Returns an array of HTMLElement items.
     */
    getUnselectedItems: {
      value: function (includeFiltered) {
        var me = this
        if (!(typeof includeFiltered === 'boolean' ? includeFiltered : false)) {
          return this.items.filter(function (el) {
            return !me.selected(el)
          })
        }
        return this.items.filter(function (el) {
          return !me.selected(el) && !me.filtered(el)
        })
      }
    },

    /**
     * @property {Array} selectedItems
     * An array of the HTMLElement items that are marked as "selected".
     */
    selectedItems: {
      enumerable: true,
      get: function () {
        return this.getSelectedItems(false)
      }
    },

    /**
     * @property {Array} unselectedItems
     * An array of the HTMLElement items that are marked as "selected". This
     * does **not** include items which are filtered out (even if they're not selected).
     */
    unselectedItems: {
      enumerable: true,
      get: function () {
        return this.getUnselectedItems(false)
      }
    },

    /**
     * @method unselectFilteredItems
     * Forcibly unselect filtered items. This is useful
     * when a filter is applied after a selection.
     */
    unselectFilteredItems: {
      enumerable: true,
      value: function () {
        var me = this
        this.filteredItems.forEach(function (el) {
          me.unselectItem(el)
        })
      }
    },

    /**
     * @method getFilteredItems
     * Return all items which are currently filtered.
     * @return {Array}
     * Returns an array of HTMLElement items.
     */
    getFilteredItems: {
      value: function () {
        var me = this
        return this.items.filter(function (el) {
          return me.filtered(el)
        })
      }
    },

    /**
     * @method getUnfilteredItems
     * Return all items which are **not** currently filtered.
     * @return {Array}
     * Returns an array of HTMLElement items.
     */
    getUnfilteredItems: {
      value: function () {
        var me = this
        return this.items.filter(function (el) {
          return !me.filtered(el)
        })
      }
    },

    /**
     * @property filteredItems
     * Retrieve all of the items which are filtered out.
     */
    filteredItems: {
      enumerable: true,
      get: function () {
        return this.getFilteredItems()
      }
    },

    /**
     * @property unfilteredItems
     * Retrieve all of the items which are **not** filtered out.
     */
    unfilteredItems: {
      enumerable: true,
      get: function () {
        return this.getUnfilteredItems()
      }
    },

    /**
     * @method selectAll
     * Select every item in the list. This will not select any item
     * which is filtered out, unless `force=true`
     * @param {Boolean} [force=false]
     * Set this to `true` to select everything, even if a filter
     * is applied.
     */
    selectAll: {
      value: function (force) {
        force = typeof force === 'boolean' ? force : false
        var me = this
        this.items.forEach(function (el) {
          // console.log('force', !force, 'filtered', el.getAttribute('filtered') === null)
          if (force || !me.filtered(el)) {
            me.selectItem(el)
            this.last = el
          }
        })
      }
    },

    /**
     * @method matchSelectionState
     * Match the selection state of two items, i.e. if the first item is
     * selected, select the next one. If the first item is unselected,
     * unselect the second.
     * @param {HTMLElement} origin
     * The base element.
     * @param {HTMLElement} target
     * The target element.
     * @private
     */
    matchSelectionState: {
      enumerable: false,
      value: function (origin, target) {
        var o = this.selected(origin)
        if (o !== this.selected(target)) {
          if (o) {
            this.selectItem(target)
          } else {
            this.unselectItem(target)
          }
        }
      }
    },

    /**
     * @method clearSelected
     * Clears all selections. If a hidden/filtered element is
     * selected, it will be deselected too.
     */
    clearSelected: {
      value: function () {
        var me = this
        this.items.forEach(function (el) {
          me.unselectItem(el)
        })
        for (var i = 0; i < this.children.length; i++) {
          if (!this.filtered(this.children[i])) {
            this.last = this.children[i]
            break
          }
        }
      }
    },

    /**
     * @method invertSelected
     * Deselects any selected item and vice versa. This is
     * a way to completely reverse the selection. Filtered
     * items are ignored.
     */
    invertSelection: {
      value: function () {
        var me = this
        this.items.filter(function (el) {
          return !me.filtered(el)
        }).forEach(function (el) {
          me.toggleSelection(el)
          me.last = el
        })
      // this.rolledover = false
      }
    },

    /**
     * @method identifyTrend
     * Identify a trend (see #trending) in sequential multi-selection.
     * @return {Number}
     * - `1` indicates a forward progression of multi-selection.
     * - `-1` indicates a reverse progression of multi-selection.
     * - `0` indicates no progression of multi-selection
     * @private
     */
    identifyTrend: {
      enumerable: false,
      value: function (from, to) {
        if (typeof from !== 'number') {
          from = this.indexOfParent(from)
        }
        if (typeof to !== 'number') {
          to = this.indexOfParent(to)
        }
        if (from < to) {
          return 1
        } else if (from > to) {
          return -1
        } else {
          return 0
        }
      }
    },

    /**
     * @method filter
     * Add a `filter="true"` attribute to each list item which
     * matches the filter criteria.
     * @param {function} filter (required)
     * This method receives 3 arguments: `HTMLElement`, `index`, and
     * `Array`. Each element is a list item. The index refers to
     * the item's position in the list (0-based, like an array), and
     * the array contains a reference to the entire list.
     * @param {boolean} [deselectFiltered=true]
     * By default, all filtered items are automatically unselected. To
     * prevent this action, set this parameter to `false`.
     * @example
     * **Original HTML**
     * ```html
     * <chassis-list>
     *   <section>A1</section>
     *   <section>B2</section>
     *   <section>C2</section>
     * </chassis-list>
     * ```
     *
     * **Apply a filter...**
     * ```js
     * var li = document.querySelector('chassis-list')
     * li.filter(function (element, index, listarray) {
     *   return element.textContent.substr(1, 1) === '1'
     * })
     * ```
     *
     * **Resulting HTML**
     * ```html
     * <chassis-list>
     *   <section filter="true">A1</section>
     *   <section >B2</section>
     *   <section>C2</section>
     * </chassis-list>
     * ```
     * @fires item.filter
     * Fired when an item matches the filter criteria.
     * @fires filter.applied
     * Fired after all items are filtered. This differs from `item.filter`,
     * which is fired for each item that is filtered. This event is triggered
     * after all items have been filtered.
     */
    filter: {
      value: function (fn, deselectFiltered) {
        deselectFiltered = typeof deselectFiltered === 'boolean' ? deselectFiltered : true
        if (!(typeof fn === 'function')) {
          console.warn('[chassis-list].filter(myFunction) method requires a function, but none was provided.')
          fn = function () { return false }
        }

        var me = this
        this.items.filter(fn).forEach(function (el) {
          me.filterItem(el)
        })

        if (this.last) {
          // Find the last selection (or set a sane one)
          var old_last_selection = this.last
          while (this.filtered(this.last)) {
            this.last = this.previousItem(this.last)
          }
          if (this.last === null) {
            this.last = old_last_selection
            while (this.filtered(this.last)) {
              this.last = this.nextItem(this.last)
            }
          }
          if (this.last === null) {
            this.last = this.querySelector(':not([filter="true"])')
          }
        }

        deselectFiltered && this.unselectFilteredItems()
        this.dispatchEvent(new CustomEvent('filter.applied'))
      }
    },

    /**
     * @method clearFilter
     * Clear all filters.
     * @fires item.unfilter
     * Fired when a previously filtered item is no longer filtered.
     * @fires filter.clear
     * Fired when the operation completes.
     */
    clearFilter: {
      value: function () {
        var me = this
        this.items.forEach(function (el) {
          me.unfilterItem(el)
        })
        this.dispatchEvent(new CustomEvent('filter.clear'))
      }
    },

    /**
     * @method sort
     * Sort the list using a method to determin the order.
     * @param {function} sortBy (required)
     * A method of sorting. This adheres to the `Array.prototype.sort`
     * standard. For example:
     *
     * ```js
     * myList.sort(function(a, b) {
     *   // The values are DOM elements, so it may be necessary to
     *   // derive data.
     *   a = a.textContent // Get the text between the tags
     *   b = b.textContent
     *
     *   // If the values are equal, no change.
     *   if (a === b) {
     *   	 return 0
     *   }
     *
     *   // If the first value is greater than the next, return
     *   // a higher index for `a`. Otherwise return a lower index
     *   // for `a`.
     *   if (a > b) {
     *     return 1
     *   } else {
     *     return -1
     *   }
     * })
     * ```
     * @fires sort
     * Fired when the sort is complete.
     */
    sort: {
      value: function (fn) {
        fn = typeof fn === 'function' ? fn : function () {}
        var newhtml = ''
        this.items.sort(fn).forEach(function (el) {
          newhtml += el.outerHTML
        })
        this.innerHTML = newhtml
        this.dispatchEvent(new CustomEvent('sort'))
      }
    }
  })
})
