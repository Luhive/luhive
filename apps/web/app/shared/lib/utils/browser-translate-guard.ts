// Browser page translation (Chrome's Google Translate, Edge, etc.) swaps
// React's text nodes for its own <font> elements. React then tries to remove a
// node, or insert next to one, that is no longer in the DOM, and the browser
// throws NotFoundError. The whole route falls into the error page. Picking an
// option in a dropdown on a translated page did exactly that.
// See https://github.com/facebook/react/issues/11538.
//
// The guard makes those two calls skip the node the translator moved instead
// of throwing. The translated page may briefly show stale text, but it no
// longer crashes.
export function installBrowserTranslateGuard() {
  if (typeof Node !== "function" || !Node.prototype) return;

  const originalRemoveChild = Node.prototype.removeChild;
  Node.prototype.removeChild = function <T extends Node>(this: Node, child: T): T {
    if (child.parentNode !== this) {
      console.warn("Skipped removing a node another script moved (page translation?)", child);
      return child;
    }
    return originalRemoveChild.call(this, child) as T;
  };

  const originalInsertBefore = Node.prototype.insertBefore;
  Node.prototype.insertBefore = function <T extends Node>(
    this: Node,
    newNode: T,
    referenceNode: Node | null,
  ): T {
    if (referenceNode && referenceNode.parentNode !== this) {
      console.warn("Inserted at the end: reference node was moved (page translation?)", referenceNode);
      return originalInsertBefore.call(this, newNode, null) as T;
    }
    return originalInsertBefore.call(this, newNode, referenceNode) as T;
  };
}
