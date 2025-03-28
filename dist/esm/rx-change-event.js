/**
 * RxChangeEvents a emitted when something in the database changes
 * they can be grabbed by the observables of database, collection and document
 */

import { overwritable } from "./overwritable.js";
import { appendToArray, getFromMapOrCreate } from "./plugins/utils/index.js";
export function getDocumentDataOfRxChangeEvent(rxChangeEvent) {
  if (rxChangeEvent.documentData) {
    return rxChangeEvent.documentData;
  } else {
    return rxChangeEvent.previousDocumentData;
  }
}

/**
 * Might return null which means an
 * already deleted document got modified but still is deleted.
 * These kind of events are not relevant for the event-reduce algorithm
 * and must be filtered out.
 */
export function rxChangeEventToEventReduceChangeEvent(rxChangeEvent) {
  switch (rxChangeEvent.operation) {
    case 'INSERT':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: rxChangeEvent.documentData,
        previous: null
      };
    case 'UPDATE':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: overwritable.deepFreezeWhenDevMode(rxChangeEvent.documentData),
        previous: rxChangeEvent.previousDocumentData ? rxChangeEvent.previousDocumentData : 'UNKNOWN'
      };
    case 'DELETE':
      return {
        operation: rxChangeEvent.operation,
        id: rxChangeEvent.documentId,
        doc: null,
        previous: rxChangeEvent.previousDocumentData
      };
  }
}

/**
 * Flattens the given events into a single array of events.
 * Used mostly in tests.
 */
export function flattenEvents(input) {
  var output = [];
  if (Array.isArray(input)) {
    input.forEach(inputItem => {
      var add = flattenEvents(inputItem);
      appendToArray(output, add);
    });
  } else {
    if (input.id && input.events) {
      // is bulk
      input.events.forEach(ev => output.push(ev));
    } else {
      output.push(input);
    }
  }
  var usedIds = new Set();
  var nonDuplicate = [];
  function getEventId(ev) {
    return [ev.documentId, ev.documentData ? ev.documentData._rev : '', ev.previousDocumentData ? ev.previousDocumentData._rev : ''].join('|');
  }
  output.forEach(ev => {
    var eventId = getEventId(ev);
    if (!usedIds.has(eventId)) {
      usedIds.add(eventId);
      nonDuplicate.push(ev);
    }
  });
  return nonDuplicate;
}
var EVENT_BULK_CACHE = new Map();
export function rxChangeEventBulkToRxChangeEvents(eventBulk) {
  return getFromMapOrCreate(EVENT_BULK_CACHE, eventBulk, () => {
    var events = new Array(eventBulk.events.length);
    var rawEvents = eventBulk.events;
    var collectionName = eventBulk.collectionName;
    var isLocal = eventBulk.isLocal;
    var deepFreezeWhenDevMode = overwritable.deepFreezeWhenDevMode;
    for (var index = 0; index < rawEvents.length; index++) {
      var event = rawEvents[index];
      events[index] = {
        documentId: event.documentId,
        collectionName,
        isLocal,
        operation: event.operation,
        documentData: deepFreezeWhenDevMode(event.documentData),
        previousDocumentData: deepFreezeWhenDevMode(event.previousDocumentData)
      };
    }
    return events;
  });
}
//# sourceMappingURL=rx-change-event.js.map