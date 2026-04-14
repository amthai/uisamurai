import type { Editor } from "@tiptap/core";
import { TextSelection, type EditorState, type Transaction } from "@tiptap/pm/state";

/** Текущий блок верхнего уровня (прямой потомок doc): абзац, заголовок, картинка, список и т.д. */
function findDocChildBlock(state: EditorState): { index: number; start: number; nodeSize: number } | null {
  const $from = state.selection.$from;
  for (let d = $from.depth; d > 0; d--) {
    if ($from.node(d - 1).type.name === "doc") {
      const node = $from.node(d);
      return {
        index: $from.index(d - 1),
        start: $from.before(d),
        nodeSize: node.nodeSize,
      };
    }
  }
  return null;
}

function selectionAfterMove(tr: Transaction, oldAnchor: number): void {
  const mapped = tr.mapping.map(oldAnchor);
  const max = Math.max(1, tr.doc.content.size);
  const pos = Math.min(Math.max(1, mapped), max);
  const $pos = tr.doc.resolve(pos);
  tr.setSelection(TextSelection.near($pos, 1));
}

export function moveBlockUp(editor: Editor): boolean {
  return editor.commands.command(({ tr, state, dispatch }) => {
    const found = findDocChildBlock(state);
    if (!found || found.index === 0) return false;

    const { doc } = state;
    const { index, start, nodeSize } = found;
    const end = start + nodeSize;
    const prevNode = doc.child(index - 1);
    const insertPos = start - prevNode.nodeSize;

    const slice = doc.slice(start, end);
    const anchor = state.selection.anchor;

    if (dispatch) {
      tr.delete(start, end);
      tr.insert(insertPos, slice.content);
      selectionAfterMove(tr, anchor);
    }
    return true;
  });
}

export function moveBlockDown(editor: Editor): boolean {
  return editor.commands.command(({ tr, state, dispatch }) => {
    const found = findDocChildBlock(state);
    if (!found) return false;

    const { doc } = state;
    const { index, start, nodeSize } = found;
    if (index >= doc.childCount - 1) return false;

    const end = start + nodeSize;
    const nextNode = doc.child(index + 1);
    const nextSize = nextNode.nodeSize;

    const slice = doc.slice(start, end);
    const anchor = state.selection.anchor;

    if (dispatch) {
      tr.delete(start, end);
      tr.insert(start + nextSize, slice.content);
      selectionAfterMove(tr, anchor);
    }
    return true;
  });
}

export function canMoveBlockUp(editor: Editor): boolean {
  const found = findDocChildBlock(editor.state);
  return found !== null && found.index > 0;
}

export function canMoveBlockDown(editor: Editor): boolean {
  const found = findDocChildBlock(editor.state);
  if (!found) return false;
  return found.index < editor.state.doc.childCount - 1;
}
