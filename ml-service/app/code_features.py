"""
Extracts "code smell" features from source code by parsing it into an
Abstract Syntax Tree (AST) using tree-sitter.

These structural features are combined with CodeBERT semantic embeddings to
train the hybrid bug predictor. The same module is used at inference time so
the feature vector layout is identical between training and serving.

Supported languages (match CodeBERT): python, java, javascript, go, ruby, php.

The feature list is fixed (FEATURE_COLUMNS). Order must never change once a
model has been trained.
"""

import os
import re
from typing import Dict, Optional

# ---------------------------------------------------------------- grammar setup

# Import parsers lazily so a missing grammar never crashes other languages.
_PARSERS: Dict[str, Optional[object]] = {}


def _load_parser(language: str, module_name: str):
    try:
        module = __import__(module_name, fromlist=[language])
        from tree_sitter import Language, Parser

        # tree-sitter-php exposes language_php() / language_php_only()
        language_fn = getattr(module, f"language_{language}", None)
        if language_fn is None:
            language_fn = module.language

        return Parser(Language(language_fn()))
    except Exception:
        return None


def _ensure_parsers():
    if _PARSERS:
        return
    _PARSERS.update(
        {
            "python": _load_parser("python", "tree_sitter_python"),
            "java": _load_parser("java", "tree_sitter_java"),
            "javascript": _load_parser("javascript", "tree_sitter_javascript"),
            "go": _load_parser("go", "tree_sitter_go"),
            "ruby": _load_parser("ruby", "tree_sitter_ruby"),
            "php": _load_parser("php", "tree_sitter_php"),
        }
    )


# ---------------------------------------------------------------- language detection

EXTENSION_TO_LANGUAGE = {
    ".py": "python",
    ".java": "java",
    ".js": "javascript",
    ".jsx": "javascript",
    ".ts": "javascript",
    ".tsx": "javascript",
    ".mjs": "javascript",
    ".cjs": "javascript",
    ".go": "go",
    ".rb": "ruby",
    ".erb": "ruby",
    ".php": "php",
}

SUPPORTED_LANGUAGES = ["python", "java", "javascript", "go", "ruby", "php"]


def detect_language(filename: Optional[str] = None, language: Optional[str] = None) -> str:
    """Returns a supported language name. `language` wins over filename extension."""
    if language and str(language).lower() not in ("auto", ""):
        return str(language).lower()
    if filename:
        ext = os.path.splitext(filename)[1].lower()
        if ext in EXTENSION_TO_LANGUAGE:
            return EXTENSION_TO_LANGUAGE[ext]
    return "python"


# ---------------------------------------------------------------- feature schema

FEATURE_COLUMNS = [
    "num_lines",            # total lines in file
    "num_chars",            # total characters
    "comment_ratio",        # comment characters / total characters
    "num_functions",        # function/method definitions
    "num_classes",          # class definitions
    "node_count",           # total AST nodes
    "max_depth",            # deepest AST nesting level
    "avg_depth",            # mean AST node depth
    "decision_count",       # if/for/while/switch/case/catch/ternary
    "cyclomatic_complexity",  # decision_count + 1
    "long_function_count",  # functions spanning > 50 lines
    "empty_catch_count",    # except/catch blocks that swallow errors
    "todo_comment_count",   # TODO/FIXME/HACK markers
    "return_count",         # return statements
    "try_count",            # try blocks (error-prone regions)
    "call_count",           # function calls
    "string_literal_count", # string literals
    "numeric_literal_count",# numeric literals
    "identifier_unique_ratio",  # unique identifiers / total identifiers
    "binary_operator_count",    # && || + - * / etc.
]

_NUM_FEATURES = len(FEATURE_COLUMNS)

# Node types that increase cyclomatic complexity (cross-language union).
_DECISION_TYPES = {
    "if_statement", "else_if_statement", "for_statement", "for_in_statement",
    "enhanced_for_statement", "while_statement", "do_statement",
    "switch_statement", "switch_expression", "case_statement",
    "case_expression", "catch_clause", "except_clause",
    "conditional_expression", "ternary_expression", "match_expression",
    "guard_clause", "when_clause",
}

_FUNCTION_TYPES = {
    "function_definition", "method_declaration", "function_declaration",
    "function_expression", "arrow_function", "method_definition",
    "function", "singleton_method", "method",
}

_CLASS_TYPES = {
    "class_definition", "class_declaration", "class_specifier",
    "class", "type_declaration",
}

_CALL_TYPES = {"call", "method_invocation", "function_call", "call_expression"}
_RETURN_TYPES = {"return_statement", "return"}
_TRY_TYPES = {"try_statement", "try", "try_clause", "begin"}


def _features_for_code(code: str, parser) -> Dict[str, float]:
    """Extract the fixed feature vector for one source string."""
    src = code.encode("utf-8", errors="replace")
    text = code

    feats = {col: 0.0 for col in FEATURE_COLUMNS}
    feats["num_lines"] = float(len(text.splitlines()))
    feats["num_chars"] = float(len(text))

    if parser is None:
        return feats

    tree = parser.parse(src)
    root = tree.root_node

    total_depth = 0.0
    node_count = 0
    max_depth = 0
    decisions = 0
    num_functions = 0
    num_classes = 0
    returns = 0
    tries = 0
    calls = 0
    long_functions = 0
    empty_catches = 0
    todo_comments = 0
    comment_chars = 0
    string_literals = 0
    numeric_literals = 0
    identifiers = 0
    unique_identifiers = set()
    binary_ops = 0

    stack = [(root, 0)]
    while stack:
        node, depth = stack.pop()

        # Skip anonymous nodes (punctuation + bare keywords like `return`,
        # `try`, `if`). Ruby models statements as named nodes, so they survive.
        if not node.is_named:
            continue

        node_count += 1
        total_depth += depth
        if depth > max_depth:
            max_depth = depth

        ntype = node.type

        if ntype in _DECISION_TYPES:
            decisions += 1
        elif ntype in _FUNCTION_TYPES:
            num_functions += 1
            span_lines = node.end_point[0] - node.start_point[0] + 1
            if span_lines > 50:
                long_functions += 1
        elif ntype in _CLASS_TYPES:
            num_classes += 1
        elif ntype in _RETURN_TYPES:
            returns += 1
        elif ntype in _TRY_TYPES:
            tries += 1
        elif ntype in _CALL_TYPES:
            calls += 1
        elif "comment" in ntype:
            comment_text = node.text.decode("utf-8", errors="replace") if node.text else ""
            comment_chars += len(comment_text)
            if re.search(r"\b(TODO|FIXME|HACK|XXX)\b", comment_text, re.IGNORECASE):
                todo_comments += 1
        elif "string" in ntype:
            string_literals += 1
        elif any(k in ntype for k in ("number", "integer", "float")):
            numeric_literals += 1
        elif ntype in ("identifier", "name"):
            identifiers += 1
            if node.text:
                unique_identifiers.add(node.text)
        elif ntype == "binary_operator":
            binary_ops += 1

        # empty except/catch detection
        if ntype in ("except_clause", "catch_clause"):
            for child in node.children:
                if child.type in ("block", "compound_statement", "body"):
                    body = re.sub(r"\s+", "", child.text.decode("utf-8", errors="replace")) if child.text else ""
                    if body in ("", "pass", "...", "{}", "{", "}"):
                        empty_catches += 1
                    break

        stack.extend((child, depth + 1) for child in node.children)

    if node_count:
        avg_depth = total_depth / node_count
    else:
        avg_depth = 0.0

    feats["comment_ratio"] = round(comment_chars / max(len(text), 1), 4)
    feats["num_functions"] = float(num_functions)
    feats["num_classes"] = float(num_classes)
    feats["node_count"] = float(node_count)
    feats["max_depth"] = float(max_depth)
    feats["avg_depth"] = round(avg_depth, 4)
    feats["decision_count"] = float(decisions)
    feats["cyclomatic_complexity"] = float(decisions + 1)
    feats["long_function_count"] = float(long_functions)
    feats["empty_catch_count"] = float(empty_catches)
    feats["todo_comment_count"] = float(todo_comments)
    feats["return_count"] = float(returns)
    feats["try_count"] = float(tries)
    feats["call_count"] = float(calls)
    feats["string_literal_count"] = float(string_literals)
    feats["numeric_literal_count"] = float(numeric_literals)
    feats["identifier_unique_ratio"] = round(len(unique_identifiers) / max(identifiers, 1), 4)
    feats["binary_operator_count"] = float(binary_ops)

    return feats


# ---------------------------------------------------------------- public API

def extract_features(code: str, language: str = "python") -> Dict[str, float]:
    """Returns a dict with exactly the keys in FEATURE_COLUMNS."""
    _ensure_parsers()
    parser = _PARSERS.get(language)
    return _features_for_code(code, parser)


def feature_vector(code: str, language: str = "python") -> list:
    """Returns the features as a fixed-order list (for model input)."""
    feats = extract_features(code, language)
    return [feats[col] for col in FEATURE_COLUMNS]


if __name__ == "__main__":
    _ensure_parsers()
    print("Loaded parsers:", {k: (v is not None) for k, v in _PARSERS.items()})

    sample = (
        "def process(data):\n"
        "    try:\n"
        "        for item in data:\n"
        "            if item is None:\n"
        "                return None\n"
        "    except Exception:\n"
        "        pass  # TODO: fix this\n"
        "    return data\n"
    )
    for lang in ["python", "java", "javascript"]:
        print(f"\n[{lang}]")
        print(extract_features(sample, lang))
