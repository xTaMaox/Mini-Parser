/**
 * // This is the interface that allows for creating nested lists.
 * // You should not implement it, or speculate about its implementation
 * class NestedInteger {
 *     If value is provided, then it holds a single integer
 *     Otherwise it holds an empty nested list
 *     constructor(value?: number) {
 *         ...
 *     };
 *
 *     Return true if this NestedInteger holds a single integer, rather than a nested list.
 *     isInteger(): boolean {
 *         ...
 *     };
 *
 *     Return the single integer that this NestedInteger holds, if it holds a single integer
 *     Return null if this NestedInteger holds a nested list
 *     getInteger(): number | null {
 *         ...
 *     };
 *
 *     Set this NestedInteger to hold a single integer equal to value.
 *     setInteger(value: number) {
 *         ...
 *     };
 *
 *     Set this NestedInteger to hold a nested list and adds a nested integer elem to it.
 *     add(elem: NestedInteger) {
 *         ...
 *     };
 *
 *     Return the nested list that this NestedInteger holds,
 *     or an empty list if this NestedInteger holds a single integer
 *     getList(): NestedInteger[] {
 *         ...
 *     };
 * };
 */

type Rule = [string | RegExp, Array<[string | RegExp, (v: string) => void]>];

class LiteralNode {
  val: string;
  type: "number" | "list";
  children: LiteralNode[];
  parent: LiteralNode;
  constructor(v = "", isList = 0) {
    this.val = v;
    this.type = isList ? "list" : "number";
    if (this.type === "list") {
      this.children = [];
    }
  }

  get isList() {
    return this.type === "list";
  }
  get currentString() {
    return this.val ? "" : this.val[this.val.length - 1];
  }
}
const emptyMarker = "empty";

function deserialize(s: string): any {
  let currentNode: LiteralNode = new LiteralNode("", 0);
  let root: LiteralNode;
  let idx = 0;
  const rule = [
    [
      "",
      [
        [
          /\d|-/,
          function (v) {
            currentNode = new LiteralNode(v, 0);
            root = currentNode;
          },
        ],
        [
          /\[/,
          function (v) {
            currentNode = new LiteralNode(v, 1);
            root = currentNode;
          },
        ],
      ],
    ],
    [
      "-",
      [
        [
          /\d/,
          function (v) {
            currentNode.val += v;
          },
        ],
      ],
    ],
    [
      /\d/,
      [
        [
          /\d/,
          function (v) {
            return (currentNode.val += v);
          },
        ],
        [
          /,/,
          function (v) {
            if (!currentNode.parent || !currentNode.parent.isList) {
              throw new Error(`parent is not a list ${currentNode.val}${v}`);
            }
            const newNode = new LiteralNode(emptyMarker, 0);
            newNode.parent = currentNode.parent;
            currentNode.parent.children.push(newNode);
            currentNode = newNode;
          },
        ],
        [
          /\]/,
          function (v) {
            if (!currentNode.parent || !currentNode.parent.isList) {
              throw new Error(`parent is not a list ${currentNode.val}${v}`);
            }
            currentNode = currentNode.parent;
            currentNode.val += v;
          },
        ],
      ],
    ],
    [
      /\[/,
      [
        [
          /\d|-/,
          function (v) {
            const newNode = new LiteralNode(v, 0);
            currentNode.children.push(newNode);
            newNode.parent = currentNode;
            currentNode = newNode;
          },
        ],
        [
          /\[/,
          function (v) {
            const newNode = new LiteralNode(v, 1);
            currentNode.children.push(newNode);
            newNode.parent = currentNode;
            currentNode = newNode;
          },
        ],
        [
          /\]/,
          function (v) {
            currentNode.val += v;
          },
        ],
        [
          /,/,
          function () {
            const newNode = new LiteralNode(emptyMarker, 0);
            currentNode.children.push(newNode);
            newNode.parent = currentNode;
            currentNode = newNode;
          },
        ],
      ],
    ],
    [
      /\]/,
      [
        [
          /\]/,
          function (v) {
            if (!currentNode.parent) {
              throw new Error("redundant closing tag ]");
            }
            currentNode = currentNode.parent;
            currentNode.val += v;
          },
        ],
        [
          /,/,
          function () {
            if (!currentNode.parent) {
              throw new Error("can find the parent list for ,");
            }
            const newNode = new LiteralNode(emptyMarker, 0);
            currentNode.parent.children.push(newNode);
            newNode.parent = currentNode.parent;
            currentNode = newNode;
          },
        ],
      ],
    ],
    [
      /,/,
      [
        [
          /\d|-/,
          function (v) {
            if (!currentNode.parent) {
              throw new Error("can find the parent list for ,");
            }
            const newNode = new LiteralNode(v, 0);
            const parent = currentNode.parent;
            newNode.parent = parent;
            Object.assign(currentNode, newNode);
          },
        ],
        [
          /\[/,
          function (v) {
            if (!currentNode.parent) {
              throw new Error("can find the parent list for ,");
            }
            const newNode = new LiteralNode(v, 1);
            const parent = currentNode.parent;
            newNode.parent = parent;
            Object.assign(currentNode, newNode);
          },
        ],
        [
          /\]/,
          function (v) {
            if (!currentNode.parent) {
              throw new Error("can find the parent list for ,");
            }
            const parent = currentNode.parent;
            parent.val += v;
            currentNode = parent;
          },
        ],
        [
          /,/,
          function () {
            if (!currentNode.parent) {
              throw new Error("can find the parent list for ,");
            }
            const newNode = new LiteralNode(emptyMarker, 0);
            const parent = currentNode.parent;
            newNode.parent = parent;
            parent.children.push(newNode);
            currentNode = newNode;
          },
        ],
      ],
    ],
  ] as Rule[];
  const openingTags = ["[", ",", "-"];
  function matcher(r: string | RegExp, val: string) {
    if (typeof r === "string") {
      return r === val;
    }
    return (r as RegExp).test(val);
  }
  function parse() {
    const nextString = s[idx];
    if (!nextString) {
      if (currentNode !== root) {
        throw new Error("list not closing");
      }
      return;
    }
    const currentValue =
      currentNode.val === emptyMarker
        ? ","
        : currentNode.val
        ? currentNode.val[currentNode.val.length - 1]
        : "";

    for (let i = 0; i < rule.length + 1; i++) {
      const subR = rule[i];
      if (!subR) {
        throw new Error(
          `unable to match current string ${currentValue} with rules`
        );
      }
      const [r, rulesForNextValue] = subR;
      const matchedRule = rulesForNextValue.find(
        ([subRule, _]) =>
          matcher(r, currentValue) && matcher(subRule, nextString)
      );
      if (matchedRule) {
        const [_, action] = matchedRule;
        action(nextString);
        break;
      }
    }

    idx += 1;
    parse();
  }

  if (!s.length) {
    throw new Error(`unable to parse empty string`);
  }
  if (openingTags.includes(s[s.length - 1])) {
    throw new Error(`unable to parse redundant openings ${s[s.length - 1]}`);
  }
  parse();
  return constructNestedInteger(root);
}

function constructNestedInteger(
  literalRoot: LiteralNode,
  nestedIntegerTree = new NestedInteger()
) {
  if (!literalRoot.isList) {
    nestedIntegerTree.setInteger(+literalRoot.val);
  } else {
    literalRoot.children.forEach((child) => {
      if (child.val === emptyMarker) {
        return;
      }
      if (!literalRoot.isList) {
        nestedIntegerTree.add(new NestedInteger(+literalRoot.val));
      } else {
        const seg = new NestedInteger();
        nestedIntegerTree.add(seg);
        return constructNestedInteger(child, seg);
      }
    });
  }

  return nestedIntegerTree;
}