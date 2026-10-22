import pytest

from app.code_features import detect_language, extract_features

from conftest import RISK_LEVELS

RISK_RANK = {"LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}

FILE_EXTENSIONS = {
    "python": "utils.py",
    "java": "Parser.java",
    "javascript": "parser.js",
    "go": "main.go",
    "ruby": "parser.rb",
    "php": "parser.php",
}


@pytest.mark.parametrize("language", ["python", "java", "javascript", "go", "ruby", "php"])
def test_response_shape(client, headers, buggy_code, language):
    resp = client.post(
        "/predict/code",
        json={"file_path": FILE_EXTENSIONS[language], "code": buggy_code[language]},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert set(["file_path", "risk_level", "risk_score", "model_comparison"]).issubset(data)
    assert data["risk_level"] in RISK_LEVELS
    assert isinstance(data["risk_score"], float)
    assert 0.0 <= data["risk_score"] <= 1.0
    assert data["model_comparison"]["agreement"] in (True, False)
    assert data["model_comparison"]["xgboost_risk"] in RISK_LEVELS
    assert data["model_comparison"]["rf_risk"] in RISK_LEVELS


@pytest.mark.parametrize("language", ["python", "java", "javascript", "go", "ruby", "php"])
def test_prediction_for_each_language(client, headers, clean_code, language):
    resp = client.post(
        "/predict/code",
        json={"file_path": FILE_EXTENSIONS[language], "code": clean_code[language], "language": language},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["file_path"] == FILE_EXTENSIONS[language]
    assert data["risk_level"] in RISK_LEVELS


def test_ast_features_are_populated():
    feats = extract_features("public class A { public static void main(String[] args) {} }", "java")
    assert isinstance(feats, dict)
    assert set(feats.keys())
    assert feats["num_functions"] >= 1


def test_batch_endpoint(client, headers, clean_code, buggy_code):
    files = [
        {"file_path": "a.py", "code": clean_code["python"], "language": "python"},
        {"file_path": "b.java", "code": buggy_code["java"], "language": "java"},
        {"file_path": "c.js", "code": clean_code["javascript"], "language": "javascript"},
    ]
    resp = client.post("/predict/code/batch", json={"files": files}, headers=headers)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert len(data["predictions"]) == 3
    total = sum(data["summary"].values())
    assert total == 3
    for level in RISK_LEVELS:
        assert data["summary"].get(level, 0) >= 0
    assert all(p["risk_level"] in RISK_LEVELS for p in data["predictions"])


def test_empty_code_does_not_crash(client, headers):
    resp = client.post(
        "/predict/code",
        json={"file_path": "empty.py", "code": "", "language": "python"},
        headers=headers,
    )
    assert resp.status_code == 200, resp.text
    assert resp.json()["risk_level"] in RISK_LEVELS


def test_api_key_required(client):
    resp = client.post(
        "/predict/code",
        json={"file_path": "test.py", "code": "x = 1", "language": "python"},
    )
    assert resp.status_code == 401


def test_batch_limit_enforced(client, headers):
    files = [
        {"file_path": f"f{i}.py", "code": "x = 1", "language": "python"}
        for i in range(51)
    ]
    resp = client.post("/predict/code/batch", json={"files": files}, headers=headers)
    assert resp.status_code == 400


def test_buggy_ranked_at_or_above_clean(client, headers, clean_code, buggy_code):
    clean_resp = client.post(
        "/predict/code",
        json={"file_path": "Parser.java", "code": clean_code["java"], "language": "java"},
        headers=headers,
    )
    buggy_resp = client.post(
        "/predict/code",
        json={"file_path": "Parser.java", "code": buggy_code["java"], "language": "java"},
        headers=headers,
    )
    assert clean_resp.status_code == 200 and buggy_resp.status_code == 200
    clean_rank = RISK_RANK[clean_resp.json()["risk_level"]]
    buggy_rank = RISK_RANK[buggy_resp.json()["risk_level"]]
    assert buggy_rank >= clean_rank


def test_detect_language_by_extension():
    assert detect_language("foo.java") == "java"
    assert detect_language("foo.py") == "python"
    assert detect_language("foo.tsx") == "javascript"
    assert detect_language("foo.rb") == "ruby"
    assert detect_language("foo.php") == "php"
    assert detect_language("foo.unknown") == "python"


def test_detect_language_explicit_wins():
    assert detect_language("foo.java", "python") == "python"
    assert detect_language("foo.py", "auto") == "python"
    assert detect_language("foo.py", "java") == "java"