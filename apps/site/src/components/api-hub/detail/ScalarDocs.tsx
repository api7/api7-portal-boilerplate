import { useMount, useUnmount } from 'ahooks';
import { type CSSProperties, type FC, useRef } from 'react';

import {
  type AnyApiReferenceConfiguration,
  ApiReferenceReact,
} from '@scalar/api-reference-react';
import '@scalar/api-reference-react/style.css';

// Use to removes spaces when pasting in the api testing page.
const trimPasteContentEvent = (event: ClipboardEvent) => {
  event.preventDefault();
  const target = event.target as HTMLElement;
  const pasteText = event.clipboardData?.getData('text').trim() || '';

  // Check if the target is an input or textarea
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
    const inputOrTextarea = target as HTMLInputElement | HTMLTextAreaElement;
    const start =
      inputOrTextarea.selectionStart ?? inputOrTextarea.value.length;
    const end = inputOrTextarea.selectionEnd ?? inputOrTextarea.value.length;
    const currentValue = inputOrTextarea.value;

    // Combine the value before selection, pasted text, and value after selection.
    const newValue =
      currentValue.substring(0, start) +
      pasteText +
      currentValue.substring(end);

    // Use InputEvent to trigger proper input handling
    const inputEvent = new InputEvent('input', {
      bubbles: true,
      cancelable: true,
      inputType: 'insertText',
      data: pasteText,
    });

    inputOrTextarea.value = newValue;
    inputOrTextarea.setSelectionRange(
      start + pasteText.length,
      start + pasteText.length,
    );
    inputOrTextarea.dispatchEvent(inputEvent);
  } else if (target.isContentEditable) {
    // Retrieve the pasted text from the clipboard, trimming any leading/trailing whitespace. If no text is found, use an empty string.

    // Get the current text selection in the window.
    const selection = window.getSelection();

    // If there is no selection (i.e., rangeCount is 0), exit the function.
    if (!selection?.rangeCount) return;

    // Get the first (and potentially only) range of the selection.
    const range = selection.getRangeAt(0);

    // Delete the contents within the selected range.
    range.deleteContents();

    // Create a new text node with the pasted text.
    const textNode = document.createTextNode(pasteText);

    // Insert the new text node into the previously selected range.
    range.insertNode(textNode);

    // Move the range's start point to just after the newly inserted text node.
    range.setStartAfter(textNode);

    // Collapse the range to the new start point, effectively making it a point selection.
    range.collapse(true);

    // Clear all existing ranges in the selection.
    selection.removeAllRanges();

    // Add the updated range back to the selection.
    selection.addRange(range);
  }
};

// Due to scalar-api-reference-react bug, Enter event in password input will cause the page to reload, so we need to prevent it
// Prevent empty password input from triggering enter event
const preventEmptyPasswordEnter = (event: KeyboardEvent) => {
  const target = event.target as HTMLElement;
  if (target.tagName === 'INPUT') {
    const input = target as HTMLInputElement;
    if (input.type === 'password') {
      event.preventDefault();
      event.stopPropagation();
    }
  }
};

const ScalarDocs: FC<{ configuration: AnyApiReferenceConfiguration }> = ({
  configuration,
}) => {
  const isEventAdded = useRef(false);
  const keydownHandlerRef = useRef<EventListener | null>(null);
  const apiTestModalSelector = '.scalar-api-reference';

  useMount(() => {
    if (!isEventAdded.current) {
      setTimeout(() => {
        const target = document.querySelector(apiTestModalSelector);
        target?.addEventListener(
          'paste',
          trimPasteContentEvent as EventListener,
          true,
        );
        const onKeyDown = ((e: Event) => {
          if ((e as KeyboardEvent).key === 'Enter') {
            preventEmptyPasswordEnter(e as KeyboardEvent);
          }
        }) as EventListener;
        keydownHandlerRef.current = onKeyDown;
        target?.addEventListener('keydown', onKeyDown, true);
      }, 0);
      isEventAdded.current = true;
    }

    // remove Open API Client  and Power by Scalar button
    const darklightReference = document.querySelector('.darklight-reference');
    if (darklightReference) {
      darklightReference.remove();
    }
  });

  useUnmount(() => {
    const target = document.querySelector(apiTestModalSelector);
    target?.removeEventListener(
      'paste',
      trimPasteContentEvent as EventListener,
      true,
    );
    if (keydownHandlerRef.current) {
      target?.removeEventListener('keydown', keydownHandlerRef.current, true);
    }
  });
  // Offset Scalar's sticky elements (e.g. the left sidebar) by the app
  // Header height so the sidebar doesn't get covered by the sticky Header.
  // Scalar honors `--scalar-custom-header-height` when computing its
  // internal sticky top offsets. We read the shared `--app-header-height`
  // defined in globals.css so Header height stays in one place.
  // See https://github.com/api7/api7ee-developer-portal/issues/349
  const scalarHeaderOffsetStyle = {
    '--scalar-custom-header-height': 'var(--app-header-height, 4rem)',
  } as CSSProperties;

  return (
    <div style={scalarHeaderOffsetStyle} className="contents">
      <ApiReferenceReact
        configuration={{ ...configuration, agent: { disabled: true } }}
      />
    </div>
  );
};

export default ScalarDocs;
