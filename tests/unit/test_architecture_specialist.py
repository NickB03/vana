"""
Unit tests for Architecture Specialist
Tests code analysis and design pattern detection
"""

import pytest
from agents.specialists.architecture_tools import (
    analyze_codebase_structure,
    detect_design_patterns,
    suggest_refactoring,
    generate_architecture_report
)


class TestArchitectureTools:
    """Test suite for architecture analysis tools"""
    
    def test_analyze_codebase_structure_empty_dir(self, tmp_path):
        """Test analyzing empty directory"""
        result = analyze_codebase_structure(str(tmp_path))
        
        assert "Codebase Structure Analysis" in result
        assert "Total Files: 0" in result
        assert "No files found" in result
    
    def test_analyze_codebase_structure_with_files(self, tmp_path):
        """Test analyzing directory with various files"""
        # Create test files
        (tmp_path / "main.py").write_text("print('hello')")
        (tmp_path / "test.py").write_text("import pytest")
        (tmp_path / "README.md").write_text("# Test Project")
        (tmp_path / "data.json").write_text('{"key": "value"}')
        
        result = analyze_codebase_structure(str(tmp_path))
        
        assert "Total Files: 4" in result
        assert "Python files: 2" in result
        assert "Documentation files: 1" in result
        assert "Data files: 1" in result
    
    def test_analyze_codebase_structure_nested(self, tmp_path):
        """Test analyzing nested directory structure"""
        # Create nested structure
        (tmp_path / "src").mkdir()
        (tmp_path / "src" / "app.py").write_text("class App: pass")
        (tmp_path / "tests").mkdir()
        (tmp_path / "tests" / "test_app.py").write_text("def test_app(): pass")
        
        result = analyze_codebase_structure(str(tmp_path))
        
        assert "Directory Structure" in result
        assert "src/" in result
        assert "tests/" in result
    
    def test_detect_design_patterns_singleton(self, tmp_path):
        """Test singleton pattern detection"""
        code = '''
class Singleton:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
'''
        code_file = tmp_path / "singleton.py"
        code_file.write_text(code)
        
        result = detect_design_patterns(str(code_file))
        
        assert "Design Pattern Analysis" in result
        assert "Singleton Pattern" in result
        assert "_instance" in result
    
    def test_detect_design_patterns_factory(self, tmp_path):
        """Test factory pattern detection"""
        code = '''
class AnimalFactory:
    @staticmethod
    def create_animal(animal_type):
        if animal_type == "dog":
            return Dog()
        elif animal_type == "cat":
            return Cat()
            
class Dog:
    def speak(self):
        return "Woof!"
        
class Cat:
    def speak(self):
        return "Meow!"
'''
        code_file = tmp_path / "factory.py"
        code_file.write_text(code)
        
        result = detect_design_patterns(str(code_file))
        
        assert "Factory Pattern" in result
        assert "create_" in result or "factory" in result.lower()
    
    def test_detect_design_patterns_observer(self, tmp_path):
        """Test observer pattern detection"""
        code = '''
class Subject:
    def __init__(self):
        self._observers = []
    
    def attach(self, observer):
        self._observers.append(observer)
    
    def notify(self):
        for observer in self._observers:
            observer.update(self)
'''
        code_file = tmp_path / "observer.py"
        code_file.write_text(code)
        
        result = detect_design_patterns(str(code_file))
        
        assert "Observer Pattern" in result
        assert "observers" in result or "notify" in result
    
    def test_suggest_refactoring_long_function(self):
        """Test refactoring suggestions for long functions"""
        code = '''
def process_data(data):
    # Step 1: Validate
    if not data:
        return None
    if not isinstance(data, list):
        return None
    
    # Step 2: Transform
    result = []
    for item in data:
        if isinstance(item, dict):
            result.append(item)
    
    # Step 3: Filter
    filtered = []
    for item in result:
        if item.get('active'):
            filtered.append(item)
    
    # Step 4: Sort
    sorted_data = sorted(filtered, key=lambda x: x.get('priority', 0))
    
    # Step 5: Format
    output = []
    for item in sorted_data:
        output.append({
            'id': item.get('id'),
            'name': item.get('name'),
            'priority': item.get('priority')
        })
    
    return output
'''
        result = suggest_refactoring(code, "long_function")
        
        assert "Refactoring Suggestions" in result
        assert "long function" in result.lower() or "break down" in result.lower()
        assert "30 lines" in result
    
    def test_suggest_refactoring_complex_class(self):
        """Test refactoring suggestions for complex classes"""
        code = '''
class UserManager:
    def create_user(self): pass
    def delete_user(self): pass
    def update_user(self): pass
    def authenticate_user(self): pass
    def authorize_user(self): pass
    def log_user_activity(self): pass
    def send_user_email(self): pass
    def generate_user_report(self): pass
    def backup_user_data(self): pass
    def restore_user_data(self): pass
'''
        result = suggest_refactoring(code, "complex_class")
        
        assert "methods" in result.lower()
        assert "10" in result  # Number of methods
    
    def test_generate_architecture_report_integration(self, tmp_path):
        """Test full architecture report generation"""
        # Create a mini project structure
        (tmp_path / "src").mkdir()
        (tmp_path / "src" / "__init__.py").write_text("")
        (tmp_path / "src" / "models.py").write_text('''
class User:
    def __init__(self, name):
        self.name = name

class Product:
    def __init__(self, name, price):
        self.name = name
        self.price = price
''')
        (tmp_path / "src" / "services.py").write_text('''
class UserService:
    def __init__(self):
        self.users = []
    
    def add_user(self, user):
        self.users.append(user)
''')
        
        result = generate_architecture_report(str(tmp_path))
        
        assert "Architecture Analysis Report" in result
        assert "Project Overview" in result
        assert "Component Analysis" in result
        assert "models.py" in result
        assert "services.py" in result
        assert "Classes: 3" in result  # User, Product, UserService
    
    def test_error_handling_nonexistent_path(self):
        """Test error handling for non-existent paths"""
        result = analyze_codebase_structure("/nonexistent/path")
        assert "Error" in result or "not found" in result
        
        result = detect_design_patterns("/nonexistent/file.py")
        assert "Error" in result or "not found" in result


class TestArchitectureEdgeCases:
    """Test edge cases and error conditions"""
    
    def test_analyze_large_codebase_limit(self, tmp_path):
        """Test that large codebases are handled with limits"""
        # Create many files
        for i in range(150):
            (tmp_path / f"file_{i}.py").write_text(f"# File {i}")
        
        result = analyze_codebase_structure(str(tmp_path))
        
        # Should show total but limit details
        assert "Total Files: 150" in result
        assert "(showing first" in result or "limited" in result.lower()
    
    def test_detect_patterns_syntax_error(self, tmp_path):
        """Test pattern detection with syntax errors"""
        code = '''
class BadSyntax:
    def method(self
        # Missing closing parenthesis
        pass
'''
        code_file = tmp_path / "bad_syntax.py"
        code_file.write_text(code)
        
        result = detect_design_patterns(str(code_file))
        
        # Should handle gracefully
        assert "Error" in result or "syntax" in result.lower()
    
    def test_binary_file_handling(self, tmp_path):
        """Test handling of binary files"""
        # Create a binary file
        binary_file = tmp_path / "image.png"
        binary_file.write_bytes(b'\x89PNG\r\n\x1a\n\x00\x00\x00\rIHDR')
        
        result = analyze_codebase_structure(str(tmp_path))
        
        # Should count but not analyze binary files
        assert "Total Files: 1" in result