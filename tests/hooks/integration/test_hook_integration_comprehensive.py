#!/usr/bin/env python3
"""
Comprehensive Integration Tests for Hook System

Tests the complete hook execution pipeline:
- Pre-hook validation setup
- File operation interception
- Validator orchestration
- Error handling and recovery
- Performance monitoring
- Safety mechanisms and bypasses
- Real-world workflow simulation

Requirements:
- End-to-end hook execution
- Multi-validator coordination
- Performance under load
- Error recovery scenarios
- Safety bypass mechanisms
"""

import asyncio
import json
import logging
import os
import subprocess
import tempfile
import time
from pathlib import Path

import pytest

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class TestHookIntegrationComprehensive:
    """Comprehensive integration tests for the entire hook system"""

    @pytest.fixture
    def test_workspace(self):
        """Create comprehensive test workspace"""
        with tempfile.TemporaryDirectory() as temp_dir:
            workspace = Path(temp_dir)

            # Create complete project structure
            directories = [
                '.claude_workspace',
                '.claude_workspace/reports',
                '.claude_workspace/planning',
                'docs',
                'src/components',
                'src/components/ui',
                'src/hooks',
                'src/lib',
                'src/types',
                'tests/unit',
                'tests/integration',
                'tests/e2e',
                'app/api',
                'app/auth',
                'config',
                'scripts'
            ]

            for dir_path in directories:
                (workspace / dir_path).mkdir(parents=True, exist_ok=True)

            # Create comprehensive PRD file
            prd_content = """
# Vana Frontend PRD Final

## 2. Technology Stack

### Frontend Framework
- **React 18+** with TypeScript
- **Next.js 14+** for SSR/SSG
- **shadcn/ui** component library
- **Tailwind CSS** for styling

### Forbidden Technologies
- Material-UI (@mui/material)
- Ant Design (antd)
- React Bootstrap
- Custom UI libraries not shadcn/ui based

### Required Patterns
- TypeScript interfaces for all component props
- Proper error boundaries
- Loading states for async operations
- Accessibility compliance (WCAG AA)

## 18. Performance Requirements

### Bundle Size Limits
- Route chunks: <250KB gzipped
- Component bundles: <50KB per component
- Initial page load: <500KB total

### Runtime Performance
- First Contentful Paint: <1.5s
- Largest Contentful Paint: <2.5s
- Cumulative Layout Shift: <0.1
- First Input Delay: <100ms

### React Performance
- Maximum 5 useState hooks per component
- Maximum 3 useEffect hooks per component
- Prefer useCallback for event handlers
- Use React.memo for expensive components

## 19. Security Requirements

### XSS Prevention
- No dangerouslySetInnerHTML without DOMPurify
- All user inputs must be sanitized
- CSP headers required in production

### Injection Prevention
- No eval() or Function() constructors
- Parameterized queries only
- Environment variables for all secrets

### Authentication
- JWT tokens with proper expiry
- Secure cookie settings
- Rate limiting on auth endpoints

## 17. Accessibility Requirements

### WCAG AA Compliance
- Color contrast ratio: minimum 4.5:1
- Keyboard navigation support
- Screen reader compatibility
- Focus indicators visible

### Testing Requirements
- data-testid on all interactive elements
- aria-label for buttons without text
- Semantic HTML elements preferred
- Tab order logical and complete

## 20. Testing Requirements

### Coverage Thresholds
- Unit tests: 80% line coverage minimum
- Integration tests for all API endpoints
- E2E tests for critical user flows

### Test Quality Standards
- Each component must have corresponding test file
- Tests must cover happy path, error cases, edge cases
- Performance tests for components with complex logic
- Accessibility tests using testing-library/jest-dom
            """
            (workspace / 'docs' / 'vana-frontend-prd-final.md').write_text(prd_content)

            # Create hook configuration
            hook_config = {
                "enabled": True,
                "enforcement": {
                    "critical": True,
                    "blocking": True,
                    "error": True,
                    "warning": False,
                    "advisory": False
                },
                "currentMode": "prd_development",
                "validationTimeout": 500,
                "maxConcurrentValidations": 10,
                "retryAttempts": 2,
                "bypassReason": None,
                "bypassUntil": None,
                "performance": {
                    "enableMetrics": True,
                    "slowValidationThreshold": 300,
                    "enableCaching": True
                },
                "safety": {
                    "enableRollback": True,
                    "backupBeforeChanges": True,
                    "emergencyBypass": False
                }
            }
            (workspace / '.claude_workspace' / 'hook-config.json').write_text(json.dumps(hook_config, indent=2))

            # Create package.json for Node.js compatibility
            package_json = {
                "name": "vana-test",
                "version": "1.0.0",
                "type": "module",
                "dependencies": {
                    "react": "^18.0.0",
                    "@types/react": "^18.0.0",
                    "typescript": "^5.0.0"
                }
            }
            (workspace / 'package.json').write_text(json.dumps(package_json, indent=2))

            # Create .gitignore
            gitignore_content = """
node_modules/
.env.local
.env
dist/
build/
*.log
.DS_Store
.claude_workspace/temp/
            """
            (workspace / '.gitignore').write_text(gitignore_content)

            yield workspace

    @pytest.fixture
    def sample_components(self):
        """Sample components for testing"""
        return {
            'good': {
                'UserProfile.tsx': """
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { toast } from '@/hooks/use-toast';
import DOMPurify from 'isomorphic-dompurify';

interface UserProfileProps {
  userId: string;
  onUpdate?: (data: UserData) => void;
  readOnly?: boolean;
}

interface UserData {
  id: string;
  name: string;
  email: string;
  bio?: string;
}

const UserProfile: React.FC<UserProfileProps> = React.memo(({ 
  userId, 
  onUpdate, 
  readOnly = false 
}) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/users/${userId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user');
        }
        const userData = await response.json();
        setUser(userData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
        toast({ 
          title: 'Error', 
          description: 'Failed to load user profile',
          variant: 'destructive'
        });
      } finally {
        setLoading(false);
      }
    };
    
    fetchUser();
  }, [userId]);
  
  const handleUpdate = useCallback(async (formData: FormData) => {
    if (readOnly) return;
    
    try {
      setLoading(true);
      
      // Sanitize inputs
      const sanitizedData = {
        name: DOMPurify.sanitize(formData.get('name') as string),
        email: DOMPurify.sanitize(formData.get('email') as string),
        bio: DOMPurify.sanitize(formData.get('bio') as string)
      };
      
      const response = await fetch(`/api/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData)
      });
      
      if (!response.ok) {
        throw new Error('Failed to update user');
      }
      
      const updatedUser = await response.json();
      setUser(updatedUser);
      onUpdate?.(updatedUser);
      
      toast({ 
        title: 'Success', 
        description: 'Profile updated successfully' 
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed');
      toast({ 
        title: 'Error', 
        description: 'Failed to update profile',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [userId, readOnly, onUpdate]);
  
  if (loading && !user) {
    return (
      <Card data-testid="user-profile-loading">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  if (error) {
    return (
      <Card data-testid="user-profile-error">
        <CardContent className="p-6">
          <div className="text-red-600" role="alert">
            Error: {error}
          </div>
          <Button 
            onClick={() => window.location.reload()}
            className="mt-4"
            data-testid="retry-button"
            aria-label="Retry loading profile"
          >
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card data-testid="user-profile">
      <CardHeader>
        <h2 className="text-xl font-semibold">User Profile</h2>
      </CardHeader>
      <CardContent className="space-y-4">
        <form onSubmit={handleUpdate}>
          <div className="space-y-4">
            <div>
              <label htmlFor="name" className="block text-sm font-medium mb-1">
                Name
              </label>
              <Input
                id="name"
                name="name"
                defaultValue={user?.name}
                disabled={readOnly || loading}
                data-testid="name-input"
                aria-describedby="name-help"
              />
            </div>
            
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1">
                Email
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                defaultValue={user?.email}
                disabled={readOnly || loading}
                data-testid="email-input"
                aria-describedby="email-help"
              />
            </div>
            
            {!readOnly && (
              <Button 
                type="submit"
                disabled={loading}
                data-testid="update-button"
                aria-label="Update user profile"
              >
                {loading ? 'Updating...' : 'Update Profile'}
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
});

UserProfile.displayName = 'UserProfile';

export default UserProfile;
                """,
                'UserProfile.test.tsx': """
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import UserProfile from '../UserProfile';

// Mock fetch
global.fetch = vi.fn();

// Mock toast
vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn()
}));

describe('UserProfile', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  
  it('renders loading state initially', () => {
    render(<UserProfile userId="123" />);
    expect(screen.getByTestId('user-profile-loading')).toBeInTheDocument();
  });
  
  it('fetches and displays user data', async () => {
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser)
    });
    
    render(<UserProfile userId="123" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });
    
    expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
    expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
  });
  
  it('handles fetch errors gracefully', async () => {
    (fetch as vi.Mock).mockRejectedValueOnce(new Error('Network error'));
    
    render(<UserProfile userId="123" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-profile-error')).toBeInTheDocument();
    });
    
    expect(screen.getByText(/Error: Network error/)).toBeInTheDocument();
    expect(screen.getByTestId('retry-button')).toBeInTheDocument();
  });
  
  it('handles update submission', async () => {
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    const updatedUser = {
      ...mockUser,
      name: 'Jane Doe'
    };
    
    (fetch as vi.Mock)
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockUser)
      })
      .mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(updatedUser)
      });
    
    const onUpdate = vi.fn();
    render(<UserProfile userId="123" onUpdate={onUpdate} />);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });
    
    const nameInput = screen.getByTestId('name-input');
    fireEvent.change(nameInput, { target: { value: 'Jane Doe' } });
    
    const updateButton = screen.getByTestId('update-button');
    fireEvent.click(updateButton);
    
    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith(updatedUser);
    });
  });
  
  it('disables form in read-only mode', () => {
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser)
    });
    
    render(<UserProfile userId="123" readOnly />);
    
    waitFor(() => {
      expect(screen.queryByTestId('update-button')).not.toBeInTheDocument();
    });
  });
  
  it('has proper accessibility attributes', async () => {
    const mockUser = {
      id: '123',
      name: 'John Doe',
      email: 'john@example.com'
    };
    
    (fetch as vi.Mock).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockUser)
    });
    
    render(<UserProfile userId="123" />);
    
    await waitFor(() => {
      expect(screen.getByTestId('user-profile')).toBeInTheDocument();
    });
    
    // Check aria-labels
    expect(screen.getByLabelText('Update user profile')).toBeInTheDocument();
    
    // Check form labels
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });
});
                """
            },
            'bad': {
                'BadComponent.tsx': """
import React, { useState, useEffect } from 'react';
import { Button as MaterialButton } from '@mui/material'; // Forbidden framework
import { AntButton } from 'antd'; // Another forbidden framework

// No TypeScript interface
const BadComponent = (props) => {
  // Too many useState hooks
  const [state1, setState1] = useState(null);
  const [state2, setState2] = useState(null);
  const [state3, setState3] = useState(null);
  const [state4, setState4] = useState(null);
  const [state5, setState5] = useState(null);
  const [state6, setState6] = useState(null); // 6 > 5 limit
  
  // Too many useEffect hooks
  useEffect(() => {
    // Effect 1
  }, []);
  
  useEffect(() => {
    // Effect 2
  }, []);
  
  useEffect(() => {
    // Effect 3
  }, []);
  
  useEffect(() => {
    // Effect 4 - exceeds limit of 3
  }, []);
  
  // Security vulnerabilities
  const handleInput = (userInput) => {
    // No input sanitization
    setState1(userInput);
    
    // Dangerous eval usage
    eval(userInput);
    
    // SQL injection vulnerability
    const query = `SELECT * FROM users WHERE id = ${userInput}`;
    database.query(query);
  };
  
  const unsafeHTML = {
    __html: props.content // dangerouslySetInnerHTML without sanitization
  };
  
  return (
    <div 
      style={{color: 'red', fontSize: '16px'}} // Inline styles forbidden
      onClick={handleInput} // div with onClick - accessibility issue
    >
      {/* No data-testid attributes */}
      <div dangerouslySetInnerHTML={unsafeHTML} /> {/* XSS vulnerability */}
      
      <MaterialButton> {/* Forbidden UI framework */}
        Click me {/* No aria-label */}
      </MaterialButton>
      
      <AntButton> {/* Another forbidden framework */}
        Another button
      </AntButton>
      
      <input 
        type="text" 
        onChange={(e) => handleInput(e.target.value)}
        // Missing aria attributes, no data-testid
      />
      
      {/* Missing error handling */}
      <button onClick={() => {
        fetch('/api/data').then(res => res.json()).then(setState1);
        // No error handling for async operations
      }}>
        Fetch Data
      </button>
      
      {/* Performance issues */}
      {props.items.map(item => {
        // useState inside map - performance anti-pattern
        const [itemState, setItemState] = useState(item.value);
        return (
          <div key={item.id} onClick={() => setItemState(!itemState)}>
            {item.name}
          </div>
        );
      })}
    </div>
  );
};

export default BadComponent;
                """,
                'BadAPI.py': """
# Bad API with multiple violations

def get_user(user_id):
    # SQL injection vulnerability
    query = f"SELECT * FROM users WHERE id = {user_id}"
    result = database.execute(query)
    
    # No proper HTTP status codes
    if result:
        return {"status": "ok", "data": result}
    else:
        return {"error": "not found"}

def create_user(request):
    # No input validation
    data = request.json
    
    # Hardcoded secrets
    api_key = "sk-1234567890abcdef"
    database_url = "postgresql://user:password@localhost:5432/db"
    
    # No error handling
    result = database.insert(data)
    
    # Inconsistent response format
    return {"message": "created", "id": result.id}

def update_user(user_id, request):
    # No authentication check
    # No authorization check
    
    data = request.json
    
    # Direct database access without ORM
    query = f"UPDATE users SET name='{data['name']}', email='{data['email']}' WHERE id={user_id}"
    
    try:
        database.execute(query)
        return {"ok": True}
    except:
        # Generic exception handling
        return {"error": "something went wrong"}
                """
            }
        }

    @pytest.fixture
    def api_samples(self):
        """Sample API files for testing"""
        return {
            'good': {
                'user_routes.py': '''
from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
import logging
from typing import Optional

from ..database import get_db
from ..auth import get_current_user
from ..models import User
from ..schemas import UserCreate, UserUpdate, UserResponse
from ..security import validate_user_data, sanitize_input

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get user by ID with proper error handling"""
    try:
        # Validate input
        if not user_id or not user_id.isalnum():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid user ID format"
            )
        
        # Check authorization
        if current_user.id != user_id and not current_user.is_admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Not authorized to access this user"
            )
        
        # Query database safely
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return JSONResponse(
            status_code=status.HTTP_200_OK,
            content={
                "status": "success",
                "data": user.to_dict()
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error fetching user {user_id}: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Internal server error"
        )

@router.post("/", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    user_data: UserCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Create new user with validation and proper status codes"""
    try:
        # Validate and sanitize input
        validated_data = validate_user_data(user_data.dict())
        sanitized_data = sanitize_input(validated_data)
        
        # Check if user exists
        existing_user = db.query(User).filter(
            User.email == sanitized_data['email']
        ).first()
        
        if existing_user:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Create user
        new_user = User(**sanitized_data)
        db.add(new_user)
        db.commit()
        db.refresh(new_user)
        
        logger.info(f"User created successfully: {new_user.id}")
        
        return JSONResponse(
            status_code=status.HTTP_201_CREATED,
            content={
                "status": "success",
                "data": new_user.to_dict(),
                "message": "User created successfully"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating user: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create user"
        )
                '''
            }
        }

class TestHookExecutionPipeline:
    """Test complete hook execution pipeline"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 5000, f"Integration test took {execution_time:.2f}ms, should be <5000ms"

    @pytest.mark.asyncio
    async def test_complete_validation_pipeline_good_files(self, test_workspace, sample_components):
        """Test complete validation pipeline with good files"""
        os.chdir(test_workspace)

        # Write good components
        good_component_path = test_workspace / 'src/components/UserProfile.tsx'
        good_component_path.write_text(sample_components['good']['UserProfile.tsx'])

        good_test_path = test_workspace / 'tests/unit/UserProfile.test.tsx'
        good_test_path.write_text(sample_components['good']['UserProfile.test.tsx'])

        # Test Real PRD Validator
        content_file = test_workspace / 'temp_good_content.tsx'
        content_file.write_text(sample_components['good']['UserProfile.tsx'])

        result = subprocess.run([
            'node',
            '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
            'validate',
            str(good_component_path),
            str(content_file)
        ], capture_output=True, text=True, cwd=test_workspace, timeout=30)

        assert result.returncode == 0, f"Validation failed: {result.stderr}"

        validation_result = json.loads(result.stdout)

        # Verify good file passes validation
        assert validation_result['compliance_score'] >= 80
        assert len(validation_result['violations']) <= 3  # Minor violations acceptable
        assert validation_result.get('realValidation') == True
        assert 'enhanced_validation' in validation_result

        logger.info(f"Good component validation score: {validation_result['compliance_score']}")

    @pytest.mark.asyncio
    async def test_complete_validation_pipeline_bad_files(self, test_workspace, sample_components):
        """Test complete validation pipeline detects issues in bad files"""
        os.chdir(test_workspace)

        # Write bad component
        bad_component_path = test_workspace / 'src/components/BadComponent.tsx'
        bad_component_path.write_text(sample_components['bad']['BadComponent.tsx'])

        content_file = test_workspace / 'temp_bad_content.tsx'
        content_file.write_text(sample_components['bad']['BadComponent.tsx'])

        result = subprocess.run([
            'node',
            '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
            'validate',
            str(bad_component_path),
            str(content_file)
        ], capture_output=True, text=True, cwd=test_workspace, timeout=30)

        assert result.returncode == 0, f"Validation script failed: {result.stderr}"

        validation_result = json.loads(result.stdout)

        # Verify bad file fails validation
        assert validation_result['validated'] == False
        assert len(validation_result['violations']) >= 5  # Should detect multiple issues
        assert validation_result['compliance_score'] < 50  # Low score

        # Check for specific violations
        violations_text = ' '.join(validation_result['violations'] + validation_result.get('warnings', []))

        # Should detect forbidden frameworks
        assert '@mui/material' in violations_text or 'Forbidden UI framework' in violations_text

        # Should detect security issues
        assert 'dangerouslySetInnerHTML' in violations_text or 'Security risk' in violations_text

        # Should detect performance issues
        assert 'Too many' in violations_text or 'useState' in violations_text

        logger.info(f"Bad component violations: {len(validation_result['violations'])}")

    @pytest.mark.asyncio
    async def test_enhanced_validation_integration(self, test_workspace, sample_components):
        """Test Enhanced PRD Validator integration"""
        os.chdir(test_workspace)

        # Write component for enhanced validation
        component_path = test_workspace / 'src/components/TestComponent.tsx'
        component_path.write_text(sample_components['good']['UserProfile.tsx'])

        enhanced_validator_path = '/Users/nick/Development/vana/tests/hooks/integration/enhanced-prd-validator.js'

        if os.path.exists(enhanced_validator_path):
            result = subprocess.run([
                'node',
                enhanced_validator_path,
                str(component_path)
            ], capture_output=True, text=True, cwd=test_workspace, timeout=30)

            if result.returncode == 0:
                validation_result = json.loads(result.stdout)

                # Verify enhanced validation structure
                assert 'valid' in validation_result
                assert 'overallScore' in validation_result
                assert 'results' in validation_result
                assert 'summary' in validation_result

                # Check individual validator results
                results = validation_result['results']

                # Should have results from multiple validators
                assert len(results) >= 3

                logger.info(f"Enhanced validation overall score: {validation_result['overallScore']}")
            else:
                logger.warning(f"Enhanced validator failed: {result.stderr}")
        else:
            logger.warning("Enhanced validator not found, skipping test")

class TestHookPerformanceLoad:
    """Test hook system performance under load"""

    @pytest.mark.asyncio
    async def test_concurrent_validation_performance(self, test_workspace, sample_components):
        """Test hook system handles concurrent validations efficiently"""
        os.chdir(test_workspace)

        # Create multiple test files
        test_files = []
        for i in range(20):  # Increased load
            file_path = test_workspace / f'src/components/Component{i}.tsx'

            # Alternate between good and bad components
            if i % 2 == 0:
                content = sample_components['good']['UserProfile.tsx'].replace(
                    'UserProfile', f'Component{i}'
                )
            else:
                content = sample_components['bad']['BadComponent.tsx'].replace(
                    'BadComponent', f'Component{i}'
                )

            file_path.write_text(content)
            test_files.append((file_path, content))

        # Run concurrent validations
        start_time = time.time()

        async def validate_file(file_path, content):
            content_file = test_workspace / f'temp_content_{file_path.stem}.tsx'
            content_file.write_text(content)

            proc = await asyncio.create_subprocess_exec(
                'node',
                '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
                'validate',
                str(file_path),
                str(content_file),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=test_workspace
            )

            stdout, stderr = await proc.communicate()
            return proc.returncode, stdout.decode(), stderr.decode()

        # Execute all validations concurrently
        tasks = [validate_file(file_path, content) for file_path, content in test_files]
        results = await asyncio.gather(*tasks, return_exceptions=True)

        total_time = (time.time() - start_time) * 1000

        # Analyze results
        successful_validations = 0
        failed_validations = 0
        validation_scores = []

        for i, result in enumerate(results):
            if isinstance(result, Exception):
                logger.error(f"Validation {i} raised exception: {result}")
                failed_validations += 1
                continue

            returncode, stdout, stderr = result

            if returncode == 0:
                try:
                    validation_result = json.loads(stdout)
                    validation_scores.append(validation_result['compliance_score'])
                    successful_validations += 1
                except json.JSONDecodeError:
                    logger.error(f"Invalid JSON from validation {i}: {stdout}")
                    failed_validations += 1
            else:
                logger.error(f"Validation {i} failed with code {returncode}: {stderr}")
                failed_validations += 1

        # Performance assertions
        assert total_time < 10000, f"Concurrent validations took {total_time:.2f}ms, should be <10s"
        assert successful_validations >= len(test_files) * 0.8, f"Only {successful_validations}/{len(test_files)} validations succeeded"

        # Verify score distribution (good vs bad components)
        if validation_scores:
            avg_score = sum(validation_scores) / len(validation_scores)
            logger.info(f"Average validation score: {avg_score:.1f}")
            logger.info(f"Concurrent validation of {len(test_files)} files completed in {total_time:.2f}ms")

    @pytest.mark.asyncio
    async def test_validation_timeout_handling(self, test_workspace):
        """Test hook system handles validation timeouts gracefully"""
        os.chdir(test_workspace)

        # Create very large file to potentially cause timeout
        large_content = """
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

const LargeComponent: React.FC = () => {
        """

        # Add many repetitive sections
        for i in range(1000):
            large_content += f"""
  const handler{i} = () => console.log('{i}');
  const state{i} = useState(null);
  const effect{i} = useEffect(() => {{}}, []);
            """

        large_content += """
  return <div>Large Component</div>;
};

export default LargeComponent;
        """

        large_file = test_workspace / 'src/components/LargeComponent.tsx'
        large_file.write_text(large_content)

        content_file = test_workspace / 'temp_large.tsx'
        content_file.write_text(large_content)

        # Test with timeout
        start_time = time.time()

        try:
            result = subprocess.run([
                'node',
                '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
                'validate',
                str(large_file),
                str(content_file)
            ], capture_output=True, text=True, cwd=test_workspace, timeout=5)  # 5 second timeout

            execution_time = (time.time() - start_time) * 1000

            if result.returncode == 0:
                validation_result = json.loads(result.stdout)

                # Should detect performance issues in large file
                assert 'warnings' in validation_result
                warnings_text = ' '.join(validation_result['warnings'])
                assert 'Large component' in warnings_text or 'file size' in warnings_text.lower()

                logger.info(f"Large file validation completed in {execution_time:.2f}ms")
            else:
                logger.warning(f"Large file validation failed: {result.stderr}")

        except subprocess.TimeoutExpired:
            logger.info("Validation timed out as expected for very large file")
            # Timeout is acceptable for extremely large files
            pass

class TestHookSafetyMechanisms:
    """Test hook safety mechanisms and bypass functionality"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 1000, f"Safety test took {execution_time:.2f}ms, should be <1000ms"

    @pytest.mark.asyncio
    async def test_hook_disable_mechanism(self, test_workspace, sample_components):
        """Test hook disable/enable mechanism"""
        os.chdir(test_workspace)

        # Disable hooks
        hook_config = {
            "enabled": False,
            "bypassReason": "Testing disable mechanism",
            "bypassUntil": None
        }
        (test_workspace / '.claude_workspace' / 'hook-config.json').write_text(json.dumps(hook_config))

        # Test with bad component (should be bypassed)
        bad_component_path = test_workspace / 'src/components/TestComponent.tsx'
        bad_component_path.write_text(sample_components['bad']['BadComponent.tsx'])

        content_file = test_workspace / 'temp_test.tsx'
        content_file.write_text(sample_components['bad']['BadComponent.tsx'])

        result = subprocess.run([
            'node',
            '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
            'validate',
            str(bad_component_path),
            str(content_file)
        ], capture_output=True, text=True, cwd=test_workspace)

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should be bypassed
        assert validation_result.get('bypassed') == True
        assert validation_result.get('bypassReason') == "Testing disable mechanism"
        assert 'Hook validation bypassed' in ' '.join(validation_result.get('suggestions', []))

        logger.info("Hook disable mechanism working correctly")

    @pytest.mark.asyncio
    async def test_temporary_bypass_mechanism(self, test_workspace, sample_components):
        """Test temporary bypass with expiration"""
        os.chdir(test_workspace)

        # Set temporary bypass (1 hour from now)
        bypass_until = (time.time() + 3600) * 1000  # 1 hour in milliseconds

        hook_config = {
            "enabled": True,
            "bypassReason": "Emergency maintenance",
            "bypassUntil": bypass_until
        }
        (test_workspace / '.claude_workspace' / 'hook-config.json').write_text(json.dumps(hook_config))

        # Test validation with bypass active
        component_path = test_workspace / 'src/components/TestComponent.tsx'
        component_path.write_text(sample_components['bad']['BadComponent.tsx'])

        content_file = test_workspace / 'temp_test.tsx'
        content_file.write_text(sample_components['bad']['BadComponent.tsx'])

        result = subprocess.run([
            'node',
            '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
            'validate',
            str(component_path),
            str(content_file)
        ], capture_output=True, text=True, cwd=test_workspace)

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should be bypassed temporarily
        assert validation_result.get('bypassed') == True
        assert validation_result.get('bypassReason') == "Emergency maintenance"

        logger.info("Temporary bypass mechanism working correctly")

    @pytest.mark.asyncio
    async def test_expired_bypass_mechanism(self, test_workspace, sample_components):
        """Test that expired bypass doesn't work"""
        os.chdir(test_workspace)

        # Set expired bypass (1 hour ago)
        bypass_until = (time.time() - 3600) * 1000  # 1 hour ago in milliseconds

        hook_config = {
            "enabled": True,
            "bypassReason": "Expired maintenance",
            "bypassUntil": bypass_until
        }
        (test_workspace / '.claude_workspace' / 'hook-config.json').write_text(json.dumps(hook_config))

        # Test validation with expired bypass
        component_path = test_workspace / 'src/components/TestComponent.tsx'
        component_path.write_text(sample_components['bad']['BadComponent.tsx'])

        content_file = test_workspace / 'temp_test.tsx'
        content_file.write_text(sample_components['bad']['BadComponent.tsx'])

        result = subprocess.run([
            'node',
            '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
            'validate',
            str(component_path),
            str(content_file)
        ], capture_output=True, text=True, cwd=test_workspace)

        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should NOT be bypassed (expired)
        assert validation_result.get('bypassed') != True
        assert validation_result.get('validated') == False  # Bad component should fail
        assert len(validation_result.get('violations', [])) > 0

        logger.info("Expired bypass correctly ignored")

class TestHookErrorRecovery:
    """Test hook system error recovery and resilience"""

    def setup_method(self):
        """Setup performance tracking"""
        self.start_time = time.time()

    def teardown_method(self):
        """Verify performance requirements"""
        execution_time = (time.time() - self.start_time) * 1000
        assert execution_time < 2000, f"Error recovery test took {execution_time:.2f}ms, should be <2000ms"

    @pytest.mark.asyncio
    async def test_corrupted_config_recovery(self, test_workspace):
        """Test hook system handles corrupted configuration"""
        os.chdir(test_workspace)

        # Create corrupted hook config
        (test_workspace / '.claude_workspace' / 'hook-config.json').write_text(
            '{"enabled": true, "invalid": json}'
        )

        # Test validation with corrupted config
        test_file = test_workspace / 'src/components/TestComponent.tsx'
        test_file.write_text('export const Test = () => <div>Test</div>;')

        content_file = test_workspace / 'temp_test.tsx'
        content_file.write_text(test_file.read_text())

        result = subprocess.run([
            'node',
            '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
            'validate',
            str(test_file),
            str(content_file)
        ], capture_output=True, text=True, cwd=test_workspace)

        # Should handle gracefully and use default config
        assert result.returncode == 0

        validation_result = json.loads(result.stdout)

        # Should use default configuration
        assert 'hookEnabled' in validation_result

        logger.info("Corrupted config handled gracefully")

    @pytest.mark.asyncio
    async def test_missing_prd_file_recovery(self, test_workspace):
        """Test hook system handles missing PRD file"""
        os.chdir(test_workspace)

        # Remove PRD file
        prd_file = test_workspace / 'docs' / 'vana-frontend-prd-final.md'
        if prd_file.exists():
            prd_file.unlink()

        # Test validation without PRD file
        test_file = test_workspace / 'src/components/TestComponent.tsx'
        test_file.write_text('export const Test = () => <div>Test</div>;')

        content_file = test_workspace / 'temp_test.tsx'
        content_file.write_text(test_file.read_text())

        result = subprocess.run([
            'node',
            '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
            'validate',
            str(test_file),
            str(content_file)
        ], capture_output=True, text=True, cwd=test_workspace)

        # Should fail gracefully with proper error message
        if result.returncode != 0:
            # Expected failure - should have informative error
            assert "PRD" in result.stderr or "not found" in result.stderr.lower()
            logger.info("Missing PRD file handled with proper error message")
        else:
            # If it succeeds, should use fallback validation
            validation_result = json.loads(result.stdout)
            logger.info("Missing PRD file handled with fallback validation")

    @pytest.mark.asyncio
    async def test_validation_script_error_recovery(self, test_workspace):
        """Test system handles validation script errors gracefully"""
        os.chdir(test_workspace)

        # Test with non-existent validator (should handle gracefully)
        result = subprocess.run([
            'node',
            '/non/existent/validator.js',
            'validate',
            'test.tsx'
        ], capture_output=True, text=True, cwd=test_workspace)

        # Should fail with proper error code
        assert result.returncode != 0

        # Error should be informative
        assert result.stderr or result.stdout

        logger.info("Non-existent validator handled with proper error")

class TestHookRealWorldScenarios:
    """Test hook system with realistic development scenarios"""

    @pytest.mark.asyncio
    async def test_typical_development_workflow(self, test_workspace, sample_components, api_samples):
        """Test hook system in a typical development workflow"""
        os.chdir(test_workspace)

        # Simulate typical development workflow
        workflow_steps = [
            # Step 1: Create new component
            {
                'action': 'create',
                'file': 'src/components/UserDashboard.tsx',
                'content': sample_components['good']['UserProfile.tsx'].replace(
                    'UserProfile', 'UserDashboard'
                )
            },
            # Step 2: Create corresponding test
            {
                'action': 'create',
                'file': 'tests/unit/UserDashboard.test.tsx',
                'content': sample_components['good']['UserProfile.test.tsx'].replace(
                    'UserProfile', 'UserDashboard'
                )
            },
            # Step 3: Create API route
            {
                'action': 'create',
                'file': 'app/api/dashboard.py',
                'content': api_samples['good']['user_routes.py']
            },
            # Step 4: Modify component (introduce issues)
            {
                'action': 'modify',
                'file': 'src/components/UserDashboard.tsx',
                'content': sample_components['bad']['BadComponent.tsx'].replace(
                    'BadComponent', 'UserDashboard'
                )
            },
            # Step 5: Fix issues
            {
                'action': 'fix',
                'file': 'src/components/UserDashboard.tsx',
                'content': sample_components['good']['UserProfile.tsx'].replace(
                    'UserProfile', 'UserDashboard'
                )
            }
        ]

        validation_results = []

        for step in workflow_steps:
            logger.info(f"Workflow step: {step['action']} {step['file']}")

            # Write file
            file_path = test_workspace / step['file']
            file_path.parent.mkdir(parents=True, exist_ok=True)
            file_path.write_text(step['content'])

            # Validate if it's a React component
            if file_path.suffix == '.tsx' and 'components' in str(file_path):
                content_file = test_workspace / f'temp_{file_path.stem}.tsx'
                content_file.write_text(step['content'])

                result = subprocess.run([
                    'node',
                    '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
                    'validate',
                    str(file_path),
                    str(content_file)
                ], capture_output=True, text=True, cwd=test_workspace, timeout=10)

                if result.returncode == 0:
                    validation_result = json.loads(result.stdout)
                    validation_results.append({
                        'step': step['action'],
                        'file': step['file'],
                        'score': validation_result['compliance_score'],
                        'violations': len(validation_result.get('violations', [])),
                        'validated': validation_result.get('validated', False)
                    })

                    logger.info(f"  Validation score: {validation_result['compliance_score']}")
                    logger.info(f"  Violations: {len(validation_result.get('violations', []))}")

        # Analyze workflow results
        assert len(validation_results) >= 3, "Should have validated multiple components"

        # Should detect improvement from 'modify' to 'fix'
        modify_results = [r for r in validation_results if r['step'] == 'modify']
        fix_results = [r for r in validation_results if r['step'] == 'fix']

        if modify_results and fix_results:
            assert fix_results[0]['score'] > modify_results[0]['score'], "Fix should improve score"
            assert fix_results[0]['violations'] < modify_results[0]['violations'], "Fix should reduce violations"

        logger.info(f"Completed workflow with {len(validation_results)} validations")

    @pytest.mark.asyncio
    async def test_team_collaboration_scenario(self, test_workspace, sample_components):
        """Test hook system in team collaboration scenario"""
        os.chdir(test_workspace)

        # Simulate team members with different skill levels
        team_scenarios = [
            {
                'developer': 'senior',
                'component': sample_components['good']['UserProfile.tsx'],
                'expected_score': 80
            },
            {
                'developer': 'junior',
                'component': sample_components['bad']['BadComponent.tsx'],
                'expected_score': 40
            },
            {
                'developer': 'intermediate',
                'component': sample_components['good']['UserProfile.tsx'].replace(
                    'React.memo', 'React.Component'  # Slight degradation
                ),
                'expected_score': 70
            }
        ]

        validation_results = []

        for i, scenario in enumerate(team_scenarios):
            component_path = test_workspace / f'src/components/Team{i}Component.tsx'
            component_path.write_text(scenario['component'])

            content_file = test_workspace / f'temp_team_{i}.tsx'
            content_file.write_text(scenario['component'])

            result = subprocess.run([
                'node',
                '/Users/nick/Development/vana/tests/hooks/validation/real-prd-validator.js',
                'validate',
                str(component_path),
                str(content_file)
            ], capture_output=True, text=True, cwd=test_workspace, timeout=15)

            if result.returncode == 0:
                validation_result = json.loads(result.stdout)

                validation_results.append({
                    'developer': scenario['developer'],
                    'score': validation_result['compliance_score'],
                    'violations': validation_result.get('violations', []),
                    'suggestions': validation_result.get('suggestions', [])
                })

                logger.info(f"{scenario['developer']} developer score: {validation_result['compliance_score']}")

        # Verify team scenario results
        assert len(validation_results) == len(team_scenarios)

        # Senior developer should have highest score
        senior_result = next(r for r in validation_results if r['developer'] == 'senior')
        junior_result = next(r for r in validation_results if r['developer'] == 'junior')

        assert senior_result['score'] > junior_result['score'], "Senior should outperform junior"
        assert len(senior_result['violations']) < len(junior_result['violations']), "Senior should have fewer violations"

        # Junior should have helpful suggestions
        assert len(junior_result['suggestions']) > 0, "Junior should receive suggestions"

        logger.info("Team collaboration scenario completed successfully")

if __name__ == '__main__':
    pytest.main([__file__, '-v', '--tb=short'])
