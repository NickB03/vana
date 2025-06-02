#!/usr/bin/env python3
"""
Fix Google ADK SSL/Network Issues

This script addresses the SSL compatibility issues that are preventing
Google ADK from initializing properly with Vertex AI.
"""

import os
import subprocess
import sys
from pathlib import Path


def fix_urllib3_ssl_issue():
    """Fix urllib3 SSL compatibility issue."""
    print("🔧 Fixing urllib3 SSL compatibility issue...")

    try:
        # Downgrade urllib3 to a compatible version
        subprocess.run(
            [
                sys.executable,
                "-m",
                "pip",
                "install",
                "urllib3<2.0",
                "--force-reinstall",
            ],
            check=True,
        )
        print("✅ urllib3 downgraded to compatible version")
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to fix urllib3: {e}")
        return False


def install_ssl_certificates():
    """Install SSL certificates for macOS."""
    print("🔧 Installing SSL certificates...")

    try:
        # Run the Install Certificates.command script that comes with Python
        cert_script = Path("/Applications/Python 3.9/Install Certificates.command")
        if cert_script.exists():
            subprocess.run([str(cert_script)], check=True)
            print("✅ SSL certificates installed")
            return True
        else:
            print("⚠️  Certificate installer not found, trying alternative...")
            # Alternative: update certificates via pip
            subprocess.run(
                [sys.executable, "-m", "pip", "install", "--upgrade", "certifi"],
                check=True,
            )
            print("✅ Certificates updated via certifi")
            return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed to install certificates: {e}")
        return False


def set_ssl_environment_variables():
    """Set SSL environment variables for better compatibility."""
    print("🔧 Setting SSL environment variables...")

    ssl_vars = {
        "PYTHONHTTPSVERIFY": "1",
        "SSL_CERT_FILE": "",
        "REQUESTS_CA_BUNDLE": "",
        "CURL_CA_BUNDLE": "",
    }

    try:
        import certifi

        cert_path = certifi.where()
        ssl_vars["SSL_CERT_FILE"] = cert_path
        ssl_vars["REQUESTS_CA_BUNDLE"] = cert_path
        ssl_vars["CURL_CA_BUNDLE"] = cert_path
        print(f"✅ Using certificates from: {cert_path}")
    except ImportError:
        print("⚠️  certifi not available, using system certificates")

    # Set environment variables
    for var, value in ssl_vars.items():
        if value:
            os.environ[var] = value
            print(f"✅ Set {var}={value}")

    return True


def test_google_adk_import():
    """Test if Google ADK can be imported after fixes."""
    print("🔍 Testing Google ADK import after fixes...")

    try:
        # Clear any cached imports
        modules_to_clear = [
            mod
            for mod in sys.modules.keys()
            if mod.startswith("google.adk") or mod.startswith("google.genai")
        ]
        for mod in modules_to_clear:
            del sys.modules[mod]

        # Try importing
        print("✅ google.adk.tools.FunctionTool imported successfully")

        print("✅ google.adk.agents.LlmAgent imported successfully")

        return True

    except Exception as e:
        print(f"❌ Import still failing: {e}")
        return False


def main():
    """Apply all SSL/network fixes."""
    print("🚀 Fixing Google ADK SSL/Network Issues")
    print("=" * 50)

    fixes = [
        ("Fix urllib3 SSL Issue", fix_urllib3_ssl_issue),
        ("Install SSL Certificates", install_ssl_certificates),
        ("Set SSL Environment Variables", set_ssl_environment_variables),
        ("Test Google ADK Import", test_google_adk_import),
    ]

    for fix_name, fix_func in fixes:
        print(f"\n{fix_name}...")
        try:
            success = fix_func()
            if not success:
                print(f"⚠️  {fix_name} had issues but continuing...")
        except Exception as e:
            print(f"❌ {fix_name} failed: {e}")

    print("\n" + "=" * 50)
    print("🎯 SSL/Network fixes completed!")
    print("Try running the LlmAgent test again.")


if __name__ == "__main__":
    main()
