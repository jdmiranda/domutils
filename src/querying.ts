import { isTag, hasChildren, Element, AnyNode, ParentNode } from "domhandler";

// WeakSet for tracking visited nodes to avoid duplicate processing
let visitedNodes: WeakSet<AnyNode> | null = null;

/**
 * Search a node and its children for nodes passing a test function. If `node` is not an array, it will be wrapped in one.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param node Node to search. Will be included in the result set if it matches.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes passing `test`.
 */
export function filter(
    test: (elem: AnyNode) => boolean,
    node: AnyNode | AnyNode[],
    recurse = true,
    limit: number = Infinity,
): AnyNode[] {
    const nodes = Array.isArray(node) ? node : [node];
    // Only use visited tracking for large trees
    if (recurse && nodes.length > 0) {
        visitedNodes = new WeakSet();
        const result = find(test, nodes, recurse, limit);
        visitedNodes = null;
        return result;
    }
    return find(test, nodes, recurse, limit);
}

/**
 * Search an array of nodes and their children for nodes passing a test function.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @param recurse Also consider child nodes.
 * @param limit Maximum number of nodes to return.
 * @returns All nodes passing `test`.
 */
export function find(
    test: (elem: AnyNode) => boolean,
    nodes: AnyNode[] | ParentNode,
    recurse: boolean,
    limit: number,
): AnyNode[] {
    const result: AnyNode[] = [];
    /** Stack of the arrays we are looking at. */
    const nodeStack: AnyNode[][] = [Array.isArray(nodes) ? nodes : [nodes]];
    /** Stack of the indices within the arrays. */
    const indexStack = [0];
    const visited = visitedNodes;

    for (;;) {
        // Cache stack top for faster access
        const currentStack = nodeStack[0];
        const currentIndex = indexStack[0];

        // First, check if the current array has any more elements to look at.
        if (currentIndex >= currentStack.length) {
            // If we have no more arrays to look at, we are done.
            if (indexStack.length === 1) {
                return result;
            }

            // Otherwise, remove the current array from the stack.
            nodeStack.shift();
            indexStack.shift();

            // Loop back to the start to continue with the next array.
            continue;
        }

        const elem = currentStack[currentIndex];
        indexStack[0]++;

        // Skip if already visited
        if (visited && visited.has(elem)) {
            continue;
        }

        if (test(elem)) {
            result.push(elem);
            if (--limit <= 0) return result;
        }

        if (recurse && hasChildren(elem)) {
            const { children } = elem;
            const childrenLength = children.length;

            if (childrenLength > 0) {
                // Mark as visited
                if (visited) visited.add(elem);

                /*
                 * Add the children to the stack. We are depth-first, so this is
                 * the next array we look at.
                 */
                indexStack.unshift(0);
                nodeStack.unshift(children);
            }
        }
    }
}

/**
 * Finds the first element inside of an array that matches a test function. This is an alias for `Array.prototype.find`.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @returns The first node in the array that passes `test`.
 * @deprecated Use `Array.prototype.find` directly.
 */
export function findOneChild<T>(
    test: (elem: T) => boolean,
    nodes: T[],
): T | undefined {
    return nodes.find(test);
}

/**
 * Finds one element in a tree that passes a test.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Node or array of nodes to search.
 * @param recurse Also consider child nodes.
 * @returns The first node that passes `test`.
 */
export function findOne(
    test: (elem: Element) => boolean,
    nodes: AnyNode[] | ParentNode,
    recurse = true,
): Element | null {
    const searchedNodes = Array.isArray(nodes) ? nodes : [nodes];
    for (let i = 0; i < searchedNodes.length; i++) {
        const node = searchedNodes[i];
        if (isTag(node) && test(node)) {
            return node;
        }
        if (recurse && hasChildren(node) && node.children.length > 0) {
            const found = findOne(test, node.children, true);
            if (found) return found;
        }
    }

    return null;
}

/**
 * Checks if a tree of nodes contains at least one node passing a test.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @returns Whether a tree of nodes contains at least one node passing the test.
 */
export function existsOne(
    test: (elem: Element) => boolean,
    nodes: AnyNode[] | ParentNode,
): boolean {
    return (Array.isArray(nodes) ? nodes : [nodes]).some(
        (node) =>
            (isTag(node) && test(node)) ||
            (hasChildren(node) && existsOne(test, node.children)),
    );
}

/**
 * Search an array of nodes and their children for elements passing a test function.
 *
 * Same as `find`, but limited to elements and with less options, leading to reduced complexity.
 *
 * @category Querying
 * @param test Function to test nodes on.
 * @param nodes Array of nodes to search.
 * @returns All nodes passing `test`.
 */
export function findAll(
    test: (elem: Element) => boolean,
    nodes: AnyNode[] | ParentNode,
): Element[] {
    const result = [];
    const nodeStack = [Array.isArray(nodes) ? nodes : [nodes]];
    const indexStack = [0];

    for (;;) {
        // Cache stack top for faster access
        const currentStack = nodeStack[0];
        const currentIndex = indexStack[0];

        if (currentIndex >= currentStack.length) {
            if (nodeStack.length === 1) {
                return result;
            }

            // Otherwise, remove the current array from the stack.
            nodeStack.shift();
            indexStack.shift();

            // Loop back to the start to continue with the next array.
            continue;
        }

        const elem = currentStack[currentIndex];
        indexStack[0]++;

        if (isTag(elem) && test(elem)) result.push(elem);

        if (hasChildren(elem)) {
            const { children } = elem;
            if (children.length > 0) {
                indexStack.unshift(0);
                nodeStack.unshift(children);
            }
        }
    }
}
