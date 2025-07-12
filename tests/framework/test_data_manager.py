"""
Test Data Manager for AI Agent Testing Framework

Handles loading and managing test scenarios from external structured files,
enabling data-driven testing without hardcoding scenarios in Python.
"""

import json
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Union


class QueryType(Enum):
    FACTUAL = "factual"
    ANALYTICAL = "analytical"
    CREATIVE = "creative"
    PROCEDURAL = "procedural"
    CONVERSATIONAL = "conversational"


@dataclass
class TestScenario:
    """Represents a single test scenario loaded from external data"""

    query_id: str
    query: str
    query_type: QueryType
    expected_tools: List[str]
    expected_pattern: str
    expected_data: Dict[str, Any]
    validation_criteria: Dict[str, Any]

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "TestScenario":
        """Create TestScenario from dictionary data"""
        return cls(
            query_id=data["query_id"],
            query=data["query"],
            query_type=QueryType(data["query_type"]),
            expected_tools=data["expected_tools"],
            expected_pattern=data["expected_pattern"],
            expected_data=data["expected_data"],
            validation_criteria=data["validation_criteria"],
        )


class TestDataManager:
    """Manages loading and accessing test scenarios from external files"""

    def __init__(self, base_path: Optional[str] = None):
        """Initialize with base path to test data directory"""
        if base_path is None:
            # Default to tests/test_data/scenarios relative to this file
            current_dir = Path(__file__).parent
            base_path = current_dir.parent / "test_data" / "scenarios"

        self.base_path = Path(base_path)
        self._scenarios_cache: Dict[str, List[TestScenario]] = {}
        self._all_scenarios_cache: Optional[List[TestScenario]] = None

    def load_scenarios_by_type(self, query_type: QueryType) -> List[TestScenario]:
        """Load test scenarios for a specific query type"""
        if query_type.value in self._scenarios_cache:
            return self._scenarios_cache[query_type.value]

        file_path = self.base_path / f"{query_type.value}_queries.json"

        if not file_path.exists():
            raise FileNotFoundError(f"Scenario file not found: {file_path}")

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            scenarios = [TestScenario.from_dict(item) for item in data]
            self._scenarios_cache[query_type.value] = scenarios
            return scenarios

        except (json.JSONDecodeError, KeyError, ValueError) as e:
            raise ValueError(f"Error loading scenarios from {file_path}: {e}")

    def load_all_scenarios(self) -> List[TestScenario]:
        """Load all test scenarios from all available files"""
        if self._all_scenarios_cache is not None:
            return self._all_scenarios_cache

        all_scenarios = []

        # Load scenarios for each query type
        for query_type in QueryType:
            try:
                scenarios = self.load_scenarios_by_type(query_type)
                all_scenarios.extend(scenarios)
            except FileNotFoundError:
                # Skip if file doesn't exist for this query type
                continue

        self._all_scenarios_cache = all_scenarios
        return all_scenarios

    def get_scenario_by_id(self, query_id: str) -> Optional[TestScenario]:
        """Get a specific scenario by its ID"""
        all_scenarios = self.load_all_scenarios()

        for scenario in all_scenarios:
            if scenario.query_id == query_id:
                return scenario

        return None

    def get_scenarios_by_pattern(self, pattern: str) -> List[TestScenario]:
        """Get scenarios that match a specific expected pattern"""
        all_scenarios = self.load_all_scenarios()

        return [s for s in all_scenarios if s.expected_pattern == pattern]

    def get_scenarios_by_tool(self, tool_name: str) -> List[TestScenario]:
        """Get scenarios that expect a specific tool to be used"""
        all_scenarios = self.load_all_scenarios()

        return [s for s in all_scenarios if tool_name in s.expected_tools]

    def filter_scenarios(
        self,
        query_type: Optional[QueryType] = None,
        expected_tools: Optional[List[str]] = None,
        pattern: Optional[str] = None,
        complexity: Optional[str] = None,
    ) -> List[TestScenario]:
        """Filter scenarios based on multiple criteria"""
        scenarios = self.load_all_scenarios()

        if query_type:
            scenarios = [s for s in scenarios if s.query_type == query_type]

        if expected_tools:
            scenarios = [s for s in scenarios if any(tool in s.expected_tools for tool in expected_tools)]

        if pattern:
            scenarios = [s for s in scenarios if s.expected_pattern == pattern]

        if complexity:
            scenarios = [s for s in scenarios if s.expected_data.get("complexity") == complexity]

        return scenarios

    def get_validation_criteria(self, scenario: TestScenario) -> Dict[str, Any]:
        """Get validation criteria for a scenario"""
        return scenario.validation_criteria

    def add_custom_scenario(self, scenario_data: Dict[str, Any], query_type: QueryType) -> TestScenario:
        """Add a custom scenario at runtime (not persisted to file)"""
        scenario = TestScenario.from_dict(scenario_data)

        # Add to cache
        if query_type.value not in self._scenarios_cache:
            self._scenarios_cache[query_type.value] = []

        self._scenarios_cache[query_type.value].append(scenario)

        # Clear all scenarios cache to force reload
        self._all_scenarios_cache = None

        return scenario

    def save_scenario_to_file(self, scenario: TestScenario, query_type: QueryType) -> None:
        """Save a scenario to the appropriate file (for test generation)"""
        file_path = self.base_path / f"{query_type.value}_queries.json"

        # Load existing scenarios
        existing_scenarios = []
        if file_path.exists():
            with open(file_path, "r", encoding="utf-8") as f:
                existing_scenarios = json.load(f)

        # Add new scenario
        scenario_dict = {
            "query_id": scenario.query_id,
            "query": scenario.query,
            "query_type": scenario.query_type.value,
            "expected_tools": scenario.expected_tools,
            "expected_pattern": scenario.expected_pattern,
            "expected_data": scenario.expected_data,
            "validation_criteria": scenario.validation_criteria,
        }

        existing_scenarios.append(scenario_dict)

        # Save back to file
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(existing_scenarios, f, indent=2, ensure_ascii=False)

        # Clear cache to force reload
        if query_type.value in self._scenarios_cache:
            del self._scenarios_cache[query_type.value]
        self._all_scenarios_cache = None

    def get_statistics(self) -> Dict[str, Any]:
        """Get statistics about loaded test scenarios"""
        all_scenarios = self.load_all_scenarios()

        stats = {
            "total_scenarios": len(all_scenarios),
            "by_type": {},
            "by_pattern": {},
            "by_complexity": {},
        }

        for scenario in all_scenarios:
            # Count by type
            type_name = scenario.query_type.value
            stats["by_type"][type_name] = stats["by_type"].get(type_name, 0) + 1

            # Count by pattern
            pattern = scenario.expected_pattern
            stats["by_pattern"][pattern] = stats["by_pattern"].get(pattern, 0) + 1

            # Count by complexity
            complexity = scenario.expected_data.get("complexity", "unknown")
            stats["by_complexity"][complexity] = stats["by_complexity"].get(complexity, 0) + 1

        return stats

    def validate_scenario_file(self, file_path: Union[str, Path]) -> List[str]:
        """Validate a scenario file and return any errors found"""
        errors = []

        try:
            with open(file_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            if not isinstance(data, list):
                errors.append("Root element must be a list")
                return errors

            required_fields = [
                "query_id",
                "query",
                "query_type",
                "expected_tools",
                "expected_pattern",
                "expected_data",
                "validation_criteria",
            ]

            for i, item in enumerate(data):
                if not isinstance(item, dict):
                    errors.append(f"Item {i} is not a dictionary")
                    continue

                # Check required fields
                for field in required_fields:
                    if field not in item:
                        errors.append(f"Item {i} missing required field: {field}")

                # Validate query_type
                if "query_type" in item:
                    try:
                        QueryType(item["query_type"])
                    except ValueError:
                        errors.append(f"Item {i} has invalid query_type: {item['query_type']}")

                # Validate expected_tools is a list
                if "expected_tools" in item and not isinstance(item["expected_tools"], list):
                    errors.append(f"Item {i} expected_tools must be a list")

        except json.JSONDecodeError as e:
            errors.append(f"JSON decode error: {e}")
        except FileNotFoundError:
            errors.append(f"File not found: {file_path}")
        except Exception as e:
            errors.append(f"Unexpected error: {e}")

        return errors
