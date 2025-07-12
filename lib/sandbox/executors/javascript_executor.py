"""
JavaScript Executor for VANA Sandbox Environment

Provides secure JavaScript/Node.js code execution with comprehensive security validation,
resource monitoring, and Docker container isolation.
"""

import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from .base_executor import BaseExecutor, ExecutorResult

logger = logging.getLogger(__name__)


class JavaScriptExecutor(BaseExecutor):
    """
    JavaScript/Node.js-specific executor with enhanced security and functionality.

    Provides secure JavaScript code execution with:
    - Pattern-based security validation
    - Module restrictions
    - Resource monitoring
    - Common utility library support
    """

    def __init__(self, security_manager):
        """Initialize JavaScript executor."""
        super().__init__(security_manager, "javascript")

    def _get_code_filename(self) -> str:
        """Get filename for JavaScript code."""
        return "main.js"

    def _get_execution_command(self) -> List[str]:
        """Get command to execute JavaScript code."""
        return ["node", "/workspace/wrapper.js"]

    def _get_environment_variables(self) -> Dict[str, str]:
        """Get JavaScript-specific environment variables."""
        env = super()._get_environment_variables()
        env.update(
            {
                "NODE_ENV": "sandbox",
                "NODE_PATH": "/workspace/node_modules",
                "NODE_OPTIONS": "--max-old-space-size=512",  # Limit memory
                "UV_THREADPOOL_SIZE": "4",  # Limit thread pool
            }
        )
        return env

    async def _prepare_additional_files(self, workspace_path: Path, execution_id: str):
        """Prepare additional JavaScript-specific files."""
        # Create package.json for the execution
        package_json = {
            "name": f"vana-execution-{execution_id[:8]}",
            "version": "1.0.0",
            "description": "VANA Sandbox JavaScript execution",
            "main": "main.js",
            "private": True,
            "dependencies": {},
        }

        package_file = workspace_path / "package.json"
        package_file.write_text(json.dumps(package_json, indent=2), encoding="utf-8")

        # Create execution wrapper
        wrapper_code = self._create_execution_wrapper()
        wrapper_file = workspace_path / "wrapper.js"
        wrapper_file.write_text(wrapper_code, encoding="utf-8")

        # Create safe module loader
        module_loader = self._create_module_loader()
        loader_file = workspace_path / "safe_loader.js"
        loader_file.write_text(module_loader, encoding="utf-8")

    def _create_execution_wrapper(self) -> str:
        """Create a JavaScript wrapper for safe execution."""
        return """
const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Safe console implementation
const safeConsole = {
    log: (...args) => {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        process.stdout.write(message + '\\n');
    },
    error: (...args) => {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        process.stderr.write(message + '\\n');
    },
    warn: (...args) => {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        process.stderr.write('WARNING: ' + message + '\\n');
    },
    info: (...args) => {
        const message = args.map(arg =>
            typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
        ).join(' ');
        process.stdout.write('INFO: ' + message + '\\n');
    }
};

// Safe require implementation
function safeRequire(moduleName) {
    const allowedModules = [
        'lodash', 'moment', 'uuid', 'validator', 'crypto-js',
        'jsonschema', 'csv-parser', 'xml2js', 'mathjs',
        'date-fns', 'ramda', 'immutable', 'async', 'joi', 'yup', 'zod'
    ];

    if (allowedModules.includes(moduleName)) {
        try {
            return require(moduleName);
        } catch (e) {
            throw new Error(`Module '${moduleName}' not available: ${e.message}`);
        }
    } else {
        throw new Error(`Module '${moduleName}' is not allowed in sandbox environment`);
    }
}

// Create safe execution context
function createSafeContext() {
    const context = {
        // Safe built-ins
        console: safeConsole,
        require: safeRequire,

        // JavaScript built-ins (safe subset)
        Array: Array,
        Object: Object,
        String: String,
        Number: Number,
        Boolean: Boolean,
        Date: Date,
        Math: Math,
        JSON: JSON,
        RegExp: RegExp,
        Error: Error,
        TypeError: TypeError,
        ReferenceError: ReferenceError,
        SyntaxError: SyntaxError,
        RangeError: RangeError,

        // Utility functions
        parseInt: parseInt,
        parseFloat: parseFloat,
        isNaN: isNaN,
        isFinite: isFinite,
        encodeURIComponent: encodeURIComponent,
        decodeURIComponent: decodeURIComponent,

        // Timer functions (limited)
        setTimeout: (fn, delay) => {
            if (delay > 1000) delay = 1000; // Max 1 second
            return setTimeout(fn, delay);
        },
        clearTimeout: clearTimeout,

        // Global variables
        global: {},
        __dirname: '/workspace',
        __filename: '/workspace/main.js'
    };

    return context;
}

async function safeExecute() {
    const startTime = Date.now();

    const result = {
        output: '',
        error: null,
        execution_time: 0,
        exit_code: 0,
        metadata: {}
    };

    try {
        // Read the main code
        const code = fs.readFileSync('/workspace/main.js', 'utf8');

        // Create execution context
        const context = createSafeContext();

        // Capture output
        let output = '';
        const originalWrite = process.stdout.write;
        process.stdout.write = function(chunk) {
            output += chunk;
            return originalWrite.call(process.stdout, chunk);
        };

        let errorOutput = '';
        const originalErrorWrite = process.stderr.write;
        process.stderr.write = function(chunk) {
            errorOutput += chunk;
            return originalErrorWrite.call(process.stderr, chunk);
        };

        // Execute code in safe context with timeout
        const script = new vm.Script(code, {
            filename: 'main.js',
            timeout: 30000 // 30 second timeout
        });

        const vmContext = vm.createContext(context);
        script.runInContext(vmContext, {
            timeout: 30000,
            breakOnSigint: true
        });

        // Restore original output functions
        process.stdout.write = originalWrite;
        process.stderr.write = originalErrorWrite;

        result.output = output;
        if (errorOutput) {
            result.error = errorOutput;
        }

    } catch (error) {
        result.error = `${error.name}: ${error.message}`;
        if (error.stack) {
            result.error += `\\n${error.stack}`;
        }
        result.exit_code = 1;
    }

    result.execution_time = (Date.now() - startTime) / 1000;

    // Write result to file
    try {
        fs.writeFileSync('/workspace/result.json', JSON.stringify(result, null, 2));
    } catch (e) {
        console.error('Failed to write result file:', e.message);
    }

    // Print summary
    console.log('=== EXECUTION RESULT ===');
    if (result.output) {
        console.log('OUTPUT:');
        console.log(result.output);
    }
    if (result.error) {
        console.error('ERROR:');
        console.error(result.error);
    }
    console.log(`EXECUTION TIME: ${result.execution_time.toFixed(3)}s`);
    console.log(`EXIT CODE: ${result.exit_code}`);

    process.exit(result.exit_code);
}

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Execute the code
safeExecute().catch((error) => {
    console.error('Execution failed:', error.message);
    process.exit(1);
});
"""

    def _create_module_loader(self) -> str:
        """Create safe module loader for JavaScript."""
        return """
// Safe module loader for VANA Sandbox
const fs = require('fs');
const path = require('path');

class SafeModuleLoader {
    constructor() {
        this.allowedModules = new Set([
            'lodash', 'moment', 'uuid', 'validator', 'crypto-js',
            'jsonschema', 'csv-parser', 'xml2js', 'mathjs',
            'date-fns', 'ramda', 'immutable', 'async', 'joi', 'yup', 'zod'
        ]);

        this.loadedModules = new Map();
    }

    isAllowed(moduleName) {
        return this.allowedModules.has(moduleName);
    }

    loadModule(moduleName) {
        if (!this.isAllowed(moduleName)) {
            throw new Error(`Module '${moduleName}' is not allowed in sandbox`);
        }

        if (this.loadedModules.has(moduleName)) {
            return this.loadedModules.get(moduleName);
        }

        try {
            const module = require(moduleName);
            this.loadedModules.set(moduleName, module);
            return module;
        } catch (error) {
            throw new Error(`Failed to load module '${moduleName}': ${error.message}`);
        }
    }

    getAvailableModules() {
        return Array.from(this.allowedModules);
    }
}

module.exports = SafeModuleLoader;
"""

    async def _run_container(self, container, code: str, execution_id: str) -> ExecutorResult:
        """Enhanced container execution with JavaScript-specific handling."""
        try:
            # Start container
            container.start()

            # Wait for container to complete with timeout
            timeout = self.security_manager.get_resource_limits().get("max_execution_time", 30)

            try:
                exit_code = container.wait(timeout=timeout)
                if isinstance(exit_code, dict):
                    exit_code = exit_code.get("StatusCode", 0)
            except Exception:
                # Container timed out
                container.kill()
                return ExecutorResult(
                    output="",
                    error=f"Execution timed out after {timeout} seconds",
                    exit_code=124,
                    execution_time=0,
                    container_id=container.id,
                    metadata={"timeout": True, "timeout_seconds": timeout},
                )

            # Get output and errors
            try:
                output = container.logs(stdout=True, stderr=False).decode("utf-8")
                error_output = container.logs(stdout=False, stderr=True).decode("utf-8")

                # Try to get enhanced result from JSON file
                try:
                    result_data = self._extract_result_from_container(container)
                    if result_data:
                        return ExecutorResult(
                            output=result_data.get("output", output),
                            error=result_data.get("error") or (error_output if error_output else None),
                            exit_code=result_data.get("exit_code", exit_code),
                            execution_time=result_data.get("execution_time", 0),
                            container_id=container.id,
                            metadata={
                                "container_name": container.name,
                                "enhanced_result": True,
                                **result_data.get("metadata", {}),
                            },
                        )
                except Exception as e:
                    logger.debug(f"Could not extract enhanced result: {e}")

                # Fallback to basic result
                return ExecutorResult(
                    output=output,
                    error=error_output if error_output else None,
                    exit_code=exit_code,
                    execution_time=0,
                    container_id=container.id,
                    metadata={
                        "container_name": container.name,
                        "enhanced_result": False,
                    },
                )

            except Exception as e:
                return ExecutorResult(
                    output="",
                    error=f"Failed to retrieve container output: {e}",
                    exit_code=1,
                    execution_time=0,
                    container_id=container.id,
                    metadata={"output_error": True},
                )

        except Exception as e:
            return ExecutorResult(
                output="",
                error=f"Container execution failed: {e}",
                exit_code=1,
                execution_time=0,
                container_id=container.id if container else None,
                metadata={"execution_error": True},
            )

    def _extract_result_from_container(self, container) -> Dict[str, Any]:
        """Extract enhanced result data from container."""
        try:
            # Get the result file from container
            archive, _ = container.get_archive("/workspace/result.json")

            # Extract and parse the JSON result
            import io
            import tarfile

            tar_stream = io.BytesIO()
            for chunk in archive:
                tar_stream.write(chunk)
            tar_stream.seek(0)

            with tarfile.open(fileobj=tar_stream, mode="r") as tar:
                result_file = tar.extractfile("result.json")
                if result_file:
                    result_data = json.loads(result_file.read().decode("utf-8"))
                    return result_data

        except Exception as e:
            logger.debug(f"Could not extract result file: {e}")

        return None
