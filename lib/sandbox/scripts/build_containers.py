#!/usr/bin/env python3
"""
Docker Container Build Script for VANA Sandbox

Builds all required Docker containers for the sandbox environment
with proper tagging and validation.
"""

import argparse
import logging
import sys
from pathlib import Path

import docker

# Set up logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


class ContainerBuilder:
    """Builds and manages Docker containers for VANA Sandbox."""

    def __init__(self):
        """Initialize container builder."""
        try:
            self.docker_client = docker.from_env()
            self.docker_client.ping()
            logger.info("Docker client initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize Docker client: {e}")
            sys.exit(1)

        # Define container configurations
        self.containers = {
            "python": {
                "dockerfile": "Dockerfile.python",
                "tag": "vana-sandbox-python:latest",
                "context_files": ["requirements.txt"],
            },
            "javascript": {
                "dockerfile": "Dockerfile.javascript",
                "tag": "vana-sandbox-javascript:latest",
                "context_files": ["package.json"],
            },
            "shell": {"dockerfile": "Dockerfile.shell", "tag": "vana-sandbox-shell:latest", "context_files": []},
        }

        # Get paths
        self.script_dir = Path(__file__).parent
        self.containers_dir = self.script_dir.parent / "containers"

    def validate_build_context(self, language: str) -> bool:
        """
        Validate that all required files exist for building.

        Args:
            language: Language container to validate

        Returns:
            True if all files exist, False otherwise
        """
        config = self.containers[language]
        dockerfile_path = self.containers_dir / config["dockerfile"]

        if not dockerfile_path.exists():
            logger.error(f"Dockerfile not found: {dockerfile_path}")
            return False

        # Check context files
        for context_file in config["context_files"]:
            file_path = self.containers_dir / context_file
            if not file_path.exists():
                logger.error(f"Context file not found: {file_path}")
                return False

        logger.info(f"Build context validated for {language}")
        return True

    def build_container(self, language: str, force_rebuild: bool = False) -> bool:
        """
        Build a specific container.

        Args:
            language: Language container to build
            force_rebuild: Force rebuild even if image exists

        Returns:
            True if build successful, False otherwise
        """
        config = self.containers[language]
        tag = config["tag"]
        dockerfile = config["dockerfile"]

        # Check if image already exists
        if not force_rebuild:
            try:
                self.docker_client.images.get(tag)
                logger.info(f"Image {tag} already exists (use --force to rebuild)")
                return True
            except docker.errors.ImageNotFound:
                pass

        # Validate build context
        if not self.validate_build_context(language):
            return False

        logger.info(f"Building {language} container: {tag}")

        try:
            # Build the image
            image, build_logs = self.docker_client.images.build(
                path=str(self.containers_dir),
                dockerfile=dockerfile,
                tag=tag,
                rm=True,  # Remove intermediate containers
                forcerm=True,  # Always remove intermediate containers
                pull=True,  # Pull base image updates
                nocache=force_rebuild,  # Use cache unless force rebuild
            )

            # Log build output
            for log in build_logs:
                if "stream" in log:
                    logger.debug(log["stream"].strip())

            logger.info(f"Successfully built {tag}")
            return True

        except docker.errors.BuildError as e:
            logger.error(f"Build failed for {language}: {e}")
            for log in e.build_log:
                if "stream" in log:
                    logger.error(log["stream"].strip())
            return False
        except Exception as e:
            logger.error(f"Unexpected error building {language}: {e}")
            return False

    def test_container(self, language: str) -> bool:
        """
        Test a built container to ensure it works correctly.

        Args:
            language: Language container to test

        Returns:
            True if test successful, False otherwise
        """
        config = self.containers[language]
        tag = config["tag"]

        logger.info(f"Testing {language} container: {tag}")

        try:
            # Test commands for each language
            test_commands = {
                "python": ["python3", "--version"],
                "javascript": ["node", "--version"],
                "shell": ["bash", "--version"],
            }

            command = test_commands.get(language, ["echo", "test"])

            # Run test container
            result = self.docker_client.containers.run(tag, command=command, remove=True, stdout=True, stderr=True)

            output = result.decode("utf-8").strip()
            logger.info(f"Test successful for {language}: {output}")
            return True

        except Exception as e:
            logger.error(f"Test failed for {language}: {e}")
            return False

    def build_all_containers(self, force_rebuild: bool = False, test: bool = True) -> bool:
        """
        Build all containers.

        Args:
            force_rebuild: Force rebuild even if images exist
            test: Run tests after building

        Returns:
            True if all builds successful, False otherwise
        """
        logger.info("Building all VANA Sandbox containers")

        success_count = 0
        total_count = len(self.containers)

        for language in self.containers.keys():
            logger.info(f"Building {language} container ({success_count + 1}/{total_count})")

            if self.build_container(language, force_rebuild):
                if test and self.test_container(language):
                    success_count += 1
                    logger.info(f"✅ {language} container built and tested successfully")
                elif not test:
                    success_count += 1
                    logger.info(f"✅ {language} container built successfully")
                else:
                    logger.error(f"❌ {language} container test failed")
            else:
                logger.error(f"❌ {language} container build failed")

        if success_count == total_count:
            logger.info(f"🎉 All {total_count} containers built successfully!")
            return True
        else:
            logger.error(f"❌ {success_count}/{total_count} containers built successfully")
            return False

    def list_images(self) -> None:
        """List all VANA Sandbox images."""
        logger.info("VANA Sandbox Docker Images:")

        for language, config in self.containers.items():
            tag = config["tag"]
            try:
                image = self.docker_client.images.get(tag)
                size_mb = image.attrs["Size"] / (1024 * 1024)
                created = image.attrs["Created"][:19]  # Remove timezone info
                logger.info(f"  {tag}: {size_mb:.1f}MB (created: {created})")
            except docker.errors.ImageNotFound:
                logger.info(f"  {tag}: Not built")

    def cleanup_images(self, confirm: bool = False) -> None:
        """
        Remove all VANA Sandbox images.

        Args:
            confirm: Skip confirmation prompt
        """
        if not confirm:
            response = input("Are you sure you want to remove all VANA Sandbox images? (y/N): ")
            if response.lower() != "y":
                logger.info("Cleanup cancelled")
                return

        logger.info("Removing VANA Sandbox images")

        for language, config in self.containers.items():
            tag = config["tag"]
            try:
                self.docker_client.images.remove(tag, force=True)
                logger.info(f"Removed {tag}")
            except docker.errors.ImageNotFound:
                logger.info(f"Image {tag} not found (already removed)")
            except Exception as e:
                logger.error(f"Failed to remove {tag}: {e}")


def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="Build VANA Sandbox Docker containers")
    parser.add_argument(
        "--language", choices=["python", "javascript", "shell"], help="Build specific language container"
    )
    parser.add_argument("--force", action="store_true", help="Force rebuild even if images exist")
    parser.add_argument("--no-test", action="store_true", help="Skip testing containers after build")
    parser.add_argument("--list", action="store_true", help="List existing images")
    parser.add_argument("--cleanup", action="store_true", help="Remove all VANA Sandbox images")
    parser.add_argument("--yes", action="store_true", help="Skip confirmation prompts")

    args = parser.parse_args()

    builder = ContainerBuilder()

    if args.list:
        builder.list_images()
        return

    if args.cleanup:
        builder.cleanup_images(confirm=args.yes)
        return

    test_containers = not args.no_test

    if args.language:
        # Build specific language
        success = builder.build_container(args.language, args.force)
        if success and test_containers:
            success = builder.test_container(args.language)

        if success:
            logger.info(f"✅ {args.language} container ready!")
            sys.exit(0)
        else:
            logger.error(f"❌ {args.language} container failed!")
            sys.exit(1)
    else:
        # Build all containers
        success = builder.build_all_containers(args.force, test_containers)
        sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
