import pytest
from fastapi.testclient import TestClient

from main import app

API_KEY = "dummy_ml_key"

RISK_LEVELS = ("LOW", "MEDIUM", "HIGH", "CRITICAL")

CLEAN_CODE = {
    "python": '''def parse_config(lines):
    result = {}
    for line in lines:
        key, value = line.strip().split("=", 1)
        result[key] = value
    return result


def main():
    settings = parse_config(open("config.txt"))
    print(settings)
''',
    "java": '''public class Calculator {
    public int add(int a, int b) {
        return a + b;
    }

    public int multiply(int a, int b) {
        return a * b;
    }
}
''',
    "javascript": '''function add(a, b) {
  return a + b;
}

const multiply = (a, b) => a * b;

module.exports = { add, multiply };
''',
    "go": '''package main

func add(a, b int) int {
	return a + b
}

func main() {
	println(add(1, 2))
}
''',
    "ruby": '''def add(a, b)
  a + b
end

puts add(1, 2)
''',
    "php": '''<?php
function add($a, $b) {
    return $a + $b;
}

echo add(1, 2);
?>
''',
}

BUGGY_CODE = {
    "python": '''def process(data, mode):
    try:
        result = []
        for i in range(len(data)):
            for j in range(len(data[i])):
                tmp = None
                for k in range(10):
                    if k > 5:
                        tmp = data[i][j][k]
                        if tmp is None:
                            pass
                result.append(tmp)
        # TODO: this is fragile, refactor soon
        return result
    except:
        pass
''',
    "java": '''public class Parser {
    public String parse(String input) {
        try {
            String result = "";
            for (int i = 0; i < input.length(); i++) {
                for (int j = 0; j < input.length(); j++) {
                    if (input.charAt(i) == input.charAt(j)) {
                        result += input.charAt(i);
                    }
                }
            }
            // TODO: handle null input
            return result;
        } catch (Exception e) {
        }
    }
}
''',
    "javascript": '''function fetchAll(urls) {
  const results = [];
  for (let i = 0; i < urls.length; i++) {
    try {
      const data = fetch(urls[i]);
      for (let j = 0; j < data.length; j++) {
        if (data[j]) {
          results.push(data[j]);
        }
      }
    } catch (err) {
      // TODO: add error handling
    }
  }
  return results;
}
''',
    "go": '''package main

func process(data []int) int {
	var total int
	for i := 0; i < len(data); i++ {
		for j := 0; j < len(data); j++ {
			if data[i] > data[j] {
				total += data[i]
				if total > 1000 {
					total = 0
				}
			}
		}
	}
	// TODO: handle empty slice
	return total
}
''',
    "ruby": '''def process(data)
  begin
    result = []
    data.each do |row|
      row.each do |cell|
        if cell
          result << cell
        end
      end
    end
    # TODO: handle nil values
    result
  rescue StandardError
  end
end
''',
    "php": '''<?php
function process($data) {
    try {
        $result = [];
        foreach ($data as $row) {
            foreach ($row as $cell) {
                if ($cell) {
                    $result[] = $cell;
                }
            }
        }
        // TODO: add validation
        return $result;
    } catch (Exception $e) {
        // silently ignore
    }
}
?>
''',
}


@pytest.fixture(scope="session")
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def headers():
    return {"X-ML-Service-Key": API_KEY}


@pytest.fixture
def clean_code():
    return CLEAN_CODE


@pytest.fixture
def buggy_code():
    return BUGGY_CODE