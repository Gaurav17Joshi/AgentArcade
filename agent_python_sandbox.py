#!/usr/bin/env python3
"""Restricted algorithm helper for Agent Arcade workspaces.

This is intentionally not a general Python shell. It accepts small, pure
calculation scripts and rejects filesystem, network, process, reflection, and
private-attribute access before execution.
"""

import ast
import resource
import sys

ALLOWED_MODULES = {
    "bisect", "collections", "functools", "heapq", "itertools", "json",
    "math", "operator", "re", "statistics",
}
BANNED_NAMES = {
    "__builtins__", "__import__", "breakpoint", "compile", "delattr",
    "dir", "eval", "exec", "exit", "getattr", "globals", "help", "input",
    "locals", "open", "quit", "setattr", "type", "vars", "object", "super",
    "os", "sys", "subprocess", "socket", "pathlib", "shutil", "builtins",
    "importlib", "ctypes", "multiprocessing", "threading", "asyncio",
    "requests", "urllib", "http", "pickle", "marshal",
}


class PolicyError(Exception):
    pass


class Policy(ast.NodeVisitor):
    def visit_Import(self, node):
        for alias in node.names:
            if alias.name not in ALLOWED_MODULES:
                raise PolicyError(f"import {alias.name!r} is not allowed")
        self.generic_visit(node)

    def visit_ImportFrom(self, node):
        if node.level or node.module not in ALLOWED_MODULES:
            raise PolicyError(f"import from {node.module!r} is not allowed")
        if any(alias.name == "*" for alias in node.names):
            raise PolicyError("star imports are not allowed")
        self.generic_visit(node)

    def visit_Name(self, node):
        if node.id.startswith("__") or node.id in BANNED_NAMES:
            raise PolicyError(f"name {node.id!r} is not allowed")
        self.generic_visit(node)

    def visit_Attribute(self, node):
        if node.attr.startswith("_"):
            raise PolicyError("private attributes are not allowed")
        self.generic_visit(node)

    def visit_ClassDef(self, node):
        raise PolicyError("classes are not allowed in helper scripts")

    def visit_With(self, node):
        raise PolicyError("with blocks are not allowed in helper scripts")

    def visit_AsyncFunctionDef(self, node):
        raise PolicyError("async code is not allowed in helper scripts")

    def visit_Await(self, node):
        raise PolicyError("async code is not allowed in helper scripts")


class Output:
    def __init__(self):
        self.parts = []
        self.size = 0

    def write(self, text):
        text = str(text)
        remaining = 8000 - self.size
        if remaining <= 0:
            return
        self.parts.append(text[:remaining])
        self.size += len(text[:remaining])

    def print(self, *values, sep=" ", end="\n"):
        self.write(sep.join(str(value) for value in values) + end)

    def value(self):
        return "".join(self.parts).strip() or "(helper completed without stdout)"


def safe_import(name, globals=None, locals=None, fromlist=(), level=0):
    if level or name not in ALLOWED_MODULES:
        raise ImportError(f"module {name!r} is not available in this helper sandbox")
    return __import__(name, globals, locals, fromlist, level)


def limit_resources():
    try:
        resource.setrlimit(resource.RLIMIT_CPU, (2, 2))
        resource.setrlimit(resource.RLIMIT_AS, (96 * 1024 * 1024, 96 * 1024 * 1024))
    except (OSError, ValueError):
        pass


SAFE_BUILTINS = {
    "abs": abs, "all": all, "any": any, "bool": bool, "dict": dict,
    "enumerate": enumerate, "filter": filter, "float": float, "int": int,
    "len": len, "list": list, "map": map, "max": max, "min": min,
    "range": range, "repr": repr, "reversed": reversed, "round": round,
    "set": set, "sorted": sorted, "str": str, "sum": sum, "tuple": tuple,
    "zip": zip,
    "Exception": Exception, "ValueError": ValueError, "print": None,
    "__import__": safe_import,
}


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: agent_python_sandbox.py helper.py")
    with open(sys.argv[1], "r", encoding="utf-8") as source_file:
        source = source_file.read()
    if len(source) > 6000:
        raise PolicyError("helper scripts are limited to 6000 characters")
    tree = ast.parse(source, filename="agent-helper.py", mode="exec")
    Policy().visit(tree)
    limit_resources()
    output = Output()
    builtins = dict(SAFE_BUILTINS)
    builtins["print"] = output.print
    namespace = {"__builtins__": builtins, "__name__": "__agent_helper__"}
    exec(compile(tree, "agent-helper.py", "exec"), namespace, namespace)
    print(output.value())


if __name__ == "__main__":
    try:
        main()
    except (PolicyError, SyntaxError, Exception) as error:
        print(f"HELPER_ERROR: {error}")
        raise SystemExit(1)
