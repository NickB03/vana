"""
Enhanced Reasoning Tools for VANA
Addresses agent reasoning deficiencies identified during testing

This module provides intelligent reasoning capabilities for mathematical,
logical, and contextual problem solving.
"""

import ast
import json
import logging
import operator
import re
from dataclasses import dataclass
from datetime import datetime
from typing import List, Union

logger = logging.getLogger(__name__)

# Mathematical operators for safe evaluation
OPERATORS = {
    ast.Add: operator.add,
    ast.Sub: operator.sub,
    ast.Mult: operator.mul,
    ast.Div: operator.truediv,
    ast.Pow: operator.pow,
    ast.USub: operator.neg,
}


@dataclass
class ReasoningResult:
    """Result of reasoning operation"""

    answer: Union[str, float, int]
    reasoning_steps: List[str]
    confidence: float
    problem_type: str
    solution_method: str


class MathematicalReasoning:
    """Mathematical reasoning and computation engine"""

    def safe_eval(self, expression: str) -> float:
        """Safely evaluate mathematical expressions"""
        try:
            # Clean the expression first
            clean_expr = expression.strip()

            # Replace word operators with symbols
            clean_expr = clean_expr.replace(" plus ", " + ")
            clean_expr = clean_expr.replace(" minus ", " - ")
            clean_expr = clean_expr.replace(" times ", " * ")
            clean_expr = clean_expr.replace(" divided by ", " / ")

            # Parse the expression into an AST
            node = ast.parse(clean_expr, mode="eval").body
            return self._eval_node(node)
        except Exception as e:
            logger.warning(f"Could not evaluate expression '{clean_expr}': {e}")
            return None

    def _eval_node(self, node):
        """Recursively evaluate AST nodes"""
        if isinstance(node, ast.Constant):  # Numbers
            return node.value
        elif isinstance(node, ast.BinOp):  # Binary operations
            left = self._eval_node(node.left)
            right = self._eval_node(node.right)
            op = OPERATORS.get(type(node.op))
            if op:
                return op(left, right)
        elif isinstance(node, ast.UnaryOp):  # Unary operations
            operand = self._eval_node(node.operand)
            op = OPERATORS.get(type(node.op))
            if op:
                return op(operand)
        raise ValueError(f"Unsupported operation: {ast.dump(node)}")

    def solve_arithmetic(self, problem: str) -> ReasoningResult:
        """Solve arithmetic problems with step-by-step reasoning"""
        reasoning_steps = []

        # Extract mathematical expressions - improved patterns
        math_patterns = [
            r"what\s+is\s+([^?]+\?*)",  # "What is X" questions - capture full expression
            r"calculate\s+([^?.]+)",  # "Calculate X" statements
            r"(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)",  # Three number operations
            r"(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)",  # Basic operations
            r"(\d+(?:\.\d+)?)\s+plus\s+(\d+(?:\.\d+)?)",  # Word form: "X plus Y"
            r"(\d+(?:\.\d+)?)\s+minus\s+(\d+(?:\.\d+)?)",  # Word form: "X minus Y"
            r"(\d+(?:\.\d+)?)\s+times\s+(\d+(?:\.\d+)?)",  # Word form: "X times Y"
            r"sum\s+of\s+(\d+(?:\.\d+)?)\s+and\s+(\d+(?:\.\d+)?)",  # "sum of X and Y"
        ]

        problem_lower = problem.lower()
        reasoning_steps.append(f"Analyzing problem: '{problem}'")

        # Try to find and solve mathematical expressions
        for pattern in math_patterns:
            matches = re.findall(pattern, problem_lower, re.IGNORECASE)
            if matches:
                for match in matches:
                    if isinstance(match, tuple):
                        if len(match) == 5:  # Three number operations (a op b op c)
                            num1, op1, num2, op2, num3 = match
                            expression = f"{num1} {op1} {num2} {op2} {num3}"
                        elif len(match) == 3:  # Binary operation format
                            num1, op, num2 = match
                            expression = f"{num1} {op} {num2}"
                        elif len(match) == 2:  # Word form or "sum of" format
                            if "plus" in problem_lower or "sum" in problem_lower:
                                expression = f"{match[0]} + {match[1]}"
                            elif "minus" in problem_lower:
                                expression = f"{match[0]} - {match[1]}"
                            elif "times" in problem_lower:
                                expression = f"{match[0]} * {match[1]}"
                            else:
                                expression = match[0]
                        else:
                            expression = match[0] if match else ""
                    else:
                        # Single match (like "what is X" capture)
                        expression = match.strip("?").strip()

                    if expression:
                        reasoning_steps.append(
                            f"Identified mathematical expression: {expression}"
                        )

                        # Evaluate the expression
                        result = self.safe_eval(expression)
                        if result is not None:
                            reasoning_steps.append(
                                f"Calculating: {expression} = {result}"
                            )
                            return ReasoningResult(
                                answer=result,
                                reasoning_steps=reasoning_steps,
                                confidence=0.95,
                                problem_type="arithmetic",
                                solution_method="expression_evaluation",
                            )

        # If no mathematical pattern found, try to identify numbers for potential calculation
        numbers = re.findall(r"\d+(?:\.\d+)?", problem)
        if len(numbers) >= 2:
            reasoning_steps.append(f"Found numbers: {numbers}")

            # Try common operations
            if any(word in problem_lower for word in ["add", "plus", "sum", "+"]):
                result = sum(float(n) for n in numbers)
                reasoning_steps.append(
                    f"Adding numbers: {' + '.join(numbers)} = {result}"
                )
                return ReasoningResult(
                    answer=result,
                    reasoning_steps=reasoning_steps,
                    confidence=0.85,
                    problem_type="arithmetic_word_problem",
                    solution_method="addition",
                )
            elif any(
                word in problem_lower
                for word in ["subtract", "minus", "difference", "-"]
            ):
                result = float(numbers[0]) - float(numbers[1])
                reasoning_steps.append(
                    f"Subtracting: {numbers[0]} - {numbers[1]} = {result}"
                )
                return ReasoningResult(
                    answer=result,
                    reasoning_steps=reasoning_steps,
                    confidence=0.85,
                    problem_type="arithmetic_word_problem",
                    solution_method="subtraction",
                )

        reasoning_steps.append("No mathematical pattern recognized")
        return ReasoningResult(
            answer="Unable to solve - no mathematical pattern identified",
            reasoning_steps=reasoning_steps,
            confidence=0.1,
            problem_type="unknown",
            solution_method="pattern_recognition_failed",
        )


class LogicalReasoning:
    """Logical reasoning and analysis engine"""

    def analyze_logical_structure(self, statement: str) -> ReasoningResult:
        """Analyze logical structure of statements"""
        reasoning_steps = []
        reasoning_steps.append(f"Analyzing logical structure: '{statement}'")

        # Identify logical indicators
        logical_patterns = {
            "conditional": ["if", "then", "implies", "when"],
            "conjunction": ["and", "both", "also"],
            "disjunction": ["or", "either", "alternatively"],
            "negation": ["not", "never", "no", "doesn't", "don't"],
            "quantifier": ["all", "some", "every", "any", "none"],
        }

        statement_lower = statement.lower()
        identified_patterns = []

        for pattern_type, keywords in logical_patterns.items():
            if any(keyword in statement_lower for keyword in keywords):
                identified_patterns.append(pattern_type)
                reasoning_steps.append(f"Identified {pattern_type} pattern")

        # Analyze simple word problems
        if self._contains_word_problem(statement):
            return self._solve_word_problem(statement, reasoning_steps)

        # Provide logical analysis
        if identified_patterns:
            analysis = f"Logical structure contains: {', '.join(identified_patterns)}"
            reasoning_steps.append(analysis)

            return ReasoningResult(
                answer=analysis,
                reasoning_steps=reasoning_steps,
                confidence=0.8,
                problem_type="logical_analysis",
                solution_method="pattern_identification",
            )

        reasoning_steps.append("No clear logical structure identified")
        return ReasoningResult(
            answer="Statement analyzed - no specific logical pattern identified",
            reasoning_steps=reasoning_steps,
            confidence=0.3,
            problem_type="general_statement",
            solution_method="basic_analysis",
        )

    def _contains_word_problem(self, statement: str) -> bool:
        """Check if statement contains a word problem"""
        word_problem_indicators = [
            "has",
            "have",
            "gives",
            "takes",
            "buys",
            "sells",
            "more",
            "less",
            "total",
            "left",
            "remaining",
            "how many",
            "how much",
        ]
        statement_lower = statement.lower()
        return any(
            indicator in statement_lower for indicator in word_problem_indicators
        )

    def _solve_word_problem(
        self, problem: str, reasoning_steps: List[str]
    ) -> ReasoningResult:
        """Solve simple word problems"""
        reasoning_steps.append("Identified as word problem")

        # Extract numbers and operations
        numbers = re.findall(r"\d+", problem)
        problem_lower = problem.lower()

        if len(numbers) >= 2:
            num1, num2 = int(numbers[0]), int(numbers[1])
            reasoning_steps.append(f"Extracted numbers: {num1}, {num2}")

            # Determine operation based on keywords - expanded patterns
            subtraction_keywords = [
                "gives away",
                "takes",
                "loses",
                "spends",
                "eats",
                "uses",
                "sells",
                "left",
                "remaining",
            ]
            addition_keywords = [
                "gets",
                "receives",
                "buys",
                "adds",
                "finds",
                "gains",
                "more",
                "total",
            ]

            if any(word in problem_lower for word in subtraction_keywords):
                result = num1 - num2
                reasoning_steps.append(
                    f"Operation: subtraction ({num1} - {num2} = {result})"
                )
                reasoning_steps.append(
                    f"Reasoning: '{problem}' indicates removal/reduction"
                )
                return ReasoningResult(
                    answer=result,
                    reasoning_steps=reasoning_steps,
                    confidence=0.9,
                    problem_type="word_problem",
                    solution_method="subtraction_word_problem",
                )
            elif any(word in problem_lower for word in addition_keywords):
                result = num1 + num2
                reasoning_steps.append(
                    f"Operation: addition ({num1} + {num2} = {result})"
                )
                reasoning_steps.append(
                    f"Reasoning: '{problem}' indicates addition/increase"
                )
                return ReasoningResult(
                    answer=result,
                    reasoning_steps=reasoning_steps,
                    confidence=0.9,
                    problem_type="word_problem",
                    solution_method="addition_word_problem",
                )

            # Try questions asking "how many" - usually indicate remaining/result calculation
            if "how many" in problem_lower:
                # Look for context clues about operation
                if any(
                    word in problem_lower for word in ["away", "eats", "takes", "uses"]
                ):
                    result = num1 - num2
                    reasoning_steps.append(
                        f"Operation: subtraction ({num1} - {num2} = {result})"
                    )
                    reasoning_steps.append(
                        "'How many' question with removal context suggests subtraction"
                    )
                    return ReasoningResult(
                        answer=result,
                        reasoning_steps=reasoning_steps,
                        confidence=0.85,
                        problem_type="word_problem",
                        solution_method="contextual_subtraction",
                    )

        reasoning_steps.append("Could not determine specific word problem solution")
        return ReasoningResult(
            answer="Word problem identified but solution method unclear",
            reasoning_steps=reasoning_steps,
            confidence=0.4,
            problem_type="word_problem",
            solution_method="analysis_incomplete",
        )


class EnhancedReasoningEngine:
    """Main reasoning engine that coordinates different reasoning modules"""

    def __init__(self):
        self.math_reasoning = MathematicalReasoning()
        self.logical_reasoning = LogicalReasoning()

    def process_query(self, query: str, context: str = "") -> ReasoningResult:
        """Process query with appropriate reasoning approach"""
        # Determine reasoning approach
        if self._is_mathematical_query(query):
            return self.math_reasoning.solve_arithmetic(query)
        elif self._is_logical_query(query):
            return self.logical_reasoning.analyze_logical_structure(query)
        else:
            # Default analysis - assess confidence based on query clarity
            query_words = query.lower().split()
            clarity_indicators = [
                "clear",
                "specific",
                "calculate",
                "solve",
                "find",
                "determine",
            ]
            unclear_indicators = [
                "complex",
                "unclear",
                "vague",
                "confusing",
                "ambiguous",
            ]

            confidence = 0.5  # Default
            if any(word in query_words for word in unclear_indicators):
                confidence = 0.3  # Lower for unclear queries
            elif any(word in query_words for word in clarity_indicators):
                confidence = 0.7  # Higher for clear queries
            elif len(query_words) < 3:
                confidence = 0.4  # Lower for very short queries

            return ReasoningResult(
                answer=f"Processed query: {query}",
                reasoning_steps=[
                    f"Analyzed query: '{query}'",
                    "No specific reasoning pattern identified",
                ],
                confidence=confidence,
                problem_type="general_query",
                solution_method="default_processing",
            )

    def _is_mathematical_query(self, query: str) -> bool:
        """Determine if query requires mathematical reasoning"""
        math_indicators = [
            r"\d+\s*[+\-*/]\s*\d+",  # Numbers with operators
            r"what\s+is\s+\d+",  # "What is X" with numbers
            r"calculate",
            r"solve",
            r"compute",
            r"sum",
            r"difference",
            r"product",
            r"quotient",
            r"plus",
            r"minus",
            r"times",
            r"divided",
            r"add",
            r"subtract",
            r"multiply",
            r"divide",
        ]
        return any(re.search(pattern, query.lower()) for pattern in math_indicators)

    def _is_logical_query(self, query: str) -> bool:
        """Determine if query requires logical reasoning"""
        logical_indicators = [
            "if",
            "then",
            "because",
            "therefore",
            "premise",
            "conclusion",
            "argument",
            "true",
            "false",
            "valid",
            "invalid",
            "all",
            "some",
            "none",
            "every",
        ]
        return any(indicator in query.lower() for indicator in logical_indicators)


# Enhanced tool functions with reasoning capabilities


def intelligent_echo(message: str) -> str:
    """Enhanced echo function with reasoning capabilities"""
    reasoning_engine = EnhancedReasoningEngine()

    # Process the message for reasoning
    reasoning_result = reasoning_engine.process_query(message)

    # Format response based on reasoning quality
    if reasoning_result.confidence > 0.7:
        response = {
            "echo": message,
            "solution": reasoning_result.answer,
            "reasoning": reasoning_result.reasoning_steps,
            "confidence": reasoning_result.confidence,
            "problem_type": reasoning_result.problem_type,
            "timestamp": datetime.now().isoformat(),
            "status": "reasoning_applied",
        }
    else:
        response = {
            "echo": message,
            "analysis": reasoning_result.answer,
            "reasoning": reasoning_result.reasoning_steps,
            "confidence": reasoning_result.confidence,
            "timestamp": datetime.now().isoformat(),
            "status": "basic_processing",
        }

    logger.info(
        f"Intelligent echo processed: {message} -> {reasoning_result.problem_type} (confidence: {reasoning_result.confidence:.2f})"
    )
    return json.dumps(response, indent=2)


def enhanced_analyze_task(task: str, context: str = "") -> str:
    """Enhanced task analysis with problem solving capabilities"""
    reasoning_engine = EnhancedReasoningEngine()

    # Apply reasoning to the task
    reasoning_result = reasoning_engine.process_query(task, context)

    # Create comprehensive analysis
    analysis = {
        "task": task,
        "context": context,
        "analysis": {
            "problem_type": reasoning_result.problem_type,
            "solution_method": reasoning_result.solution_method,
            "answer": reasoning_result.answer,
            "reasoning_steps": reasoning_result.reasoning_steps,
            "confidence": reasoning_result.confidence,
        },
        "metadata": {
            "complexity": "simple" if reasoning_result.confidence > 0.8 else "complex",
            "requires_reasoning": reasoning_result.confidence > 0.5,
            "solvable": reasoning_result.confidence > 0.7,
            "timestamp": datetime.now().isoformat(),
        },
        "recommendations": {
            "next_steps": _generate_next_steps(reasoning_result),
            "alternative_approaches": _suggest_alternatives(reasoning_result),
            "confidence_assessment": _assess_confidence(reasoning_result.confidence),
        },
    }

    logger.info(
        f"Enhanced task analysis: {task} -> {reasoning_result.problem_type} (solution: {reasoning_result.answer})"
    )
    return json.dumps(analysis, indent=2)


def _generate_next_steps(reasoning_result: ReasoningResult) -> List[str]:
    """Generate next steps based on reasoning result"""
    if reasoning_result.confidence > 0.8:
        return ["Solution found", "Verify answer if needed", "Apply solution"]
    elif reasoning_result.confidence > 0.5:
        return [
            "Review reasoning steps",
            "Consider alternative approaches",
            "Seek additional information",
        ]
    else:
        return [
            "Problem requires clarification",
            "Gather more information",
            "Consider different solution methods",
        ]


def _suggest_alternatives(reasoning_result: ReasoningResult) -> List[str]:
    """Suggest alternative approaches"""
    alternatives = []

    if reasoning_result.problem_type == "arithmetic":
        alternatives.extend(
            [
                "Use calculator",
                "Break into smaller steps",
                "Verify with different method",
            ]
        )
    elif reasoning_result.problem_type == "word_problem":
        alternatives.extend(
            ["Draw diagram", "Create equation", "Use different variable names"]
        )
    elif reasoning_result.problem_type == "logical_analysis":
        alternatives.extend(
            [
                "Use formal logic",
                "Create truth table",
                "Apply different logical framework",
            ]
        )
    else:
        alternatives.extend(
            ["Rephrase problem", "Seek expert consultation", "Use specialized tools"]
        )

    return alternatives


def _assess_confidence(confidence: float) -> str:
    """Assess confidence level"""
    if confidence > 0.9:
        return "Very high confidence - solution likely correct"
    elif confidence > 0.7:
        return "High confidence - solution should be verified"
    elif confidence > 0.5:
        return "Moderate confidence - additional validation recommended"
    elif confidence > 0.3:
        return "Low confidence - alternative approaches suggested"
    else:
        return "Very low confidence - problem may need reformulation"


# Enhanced coordination function with reasoning
def reasoning_coordinate_task(task_description: str) -> str:
    """Enhanced coordination with reasoning capabilities"""
    reasoning_engine = EnhancedReasoningEngine()

    # Apply reasoning to understand the coordination task
    reasoning_result = reasoning_engine.process_query(task_description)

    coordination_result = {
        "action": "coordinate_task",
        "task": task_description,
        "reasoning_analysis": {
            "understood_task": reasoning_result.answer,
            "reasoning_steps": reasoning_result.reasoning_steps,
            "problem_type": reasoning_result.problem_type,
            "confidence": reasoning_result.confidence,
        },
        "coordination_strategy": {
            "approach": "reasoning_based"
            if reasoning_result.confidence > 0.7
            else "exploratory",
            "agent_requirements": _determine_agent_requirements(reasoning_result),
            "execution_plan": _create_execution_plan(reasoning_result),
        },
        "timestamp": datetime.now().isoformat(),
        "status": "coordination_with_reasoning",
    }

    logger.info(
        f"Reasoning-based coordination: {task_description} -> {reasoning_result.problem_type}"
    )
    return json.dumps(coordination_result, indent=2)


def _determine_agent_requirements(reasoning_result: ReasoningResult) -> List[str]:
    """Determine what agents are needed based on reasoning"""
    requirements = []

    if reasoning_result.problem_type in ["arithmetic", "word_problem"]:
        requirements.extend(["mathematical_agent", "calculation_agent"])
    elif reasoning_result.problem_type == "logical_analysis":
        requirements.extend(["logical_reasoning_agent", "analysis_agent"])
    else:
        requirements.extend(["general_purpose_agent", "coordination_agent"])

    return requirements


def _create_execution_plan(reasoning_result: ReasoningResult) -> List[str]:
    """Create execution plan based on reasoning"""
    if reasoning_result.confidence > 0.8:
        return ["Execute solution directly", "Verify result", "Report completion"]
    elif reasoning_result.confidence > 0.5:
        return [
            "Attempt solution with current reasoning",
            "Validate intermediate steps",
            "Adjust approach if needed",
            "Complete execution",
        ]
    else:
        return [
            "Gather additional information",
            "Explore multiple solution approaches",
            "Select best approach",
            "Execute with monitoring",
            "Validate results thoroughly",
        ]
