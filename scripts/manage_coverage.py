#!/usr/bin/env python3
"""Coverage file management system for Vana project."""

import argparse
import shutil
import sqlite3
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path


class CoverageManager:
    """Manages pytest coverage files with archiving and cleanup."""

    def __init__(self, project_root: Path = None):
        self.project_root = project_root or Path.cwd()
        self.coverage_dir = self.project_root / ".coverage_archive"
        self.coverage_db = self.coverage_dir / "coverage_history.db"
        self.reports_dir = self.coverage_dir / "reports"
        self.archives_dir = self.coverage_dir / "archives"

        # Create directories
        self.coverage_dir.mkdir(exist_ok=True)
        self.reports_dir.mkdir(exist_ok=True)
        self.archives_dir.mkdir(exist_ok=True)

        # Initialize database
        self._init_database()

    def _init_database(self):
        """Initialize SQLite database for tracking coverage history."""
        conn = sqlite3.connect(self.coverage_db)
        cursor = conn.cursor()

        cursor.execute("""
            CREATE TABLE IF NOT EXISTS coverage_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                branch TEXT,
                commit_hash TEXT,
                coverage_percentage REAL,
                files_covered INTEGER,
                lines_covered INTEGER,
                lines_total INTEGER,
                archived_path TEXT,
                report_path TEXT
            )
        """)

        conn.commit()
        conn.close()

    def clean_coverage_files(self, keep_days: int = 7, archive: bool = True) -> dict:
        """Clean old coverage files with optional archiving."""
        stats = {
            "files_found": 0,
            "files_archived": 0,
            "files_deleted": 0,
            "space_freed_mb": 0,
        }

        # Find all coverage files
        coverage_patterns = [".coverage", ".coverage.*"]
        coverage_files = []

        for pattern in coverage_patterns:
            coverage_files.extend(self.project_root.glob(pattern))

        stats["files_found"] = len(coverage_files)
        cutoff_date = datetime.now() - timedelta(days=keep_days)

        for file_path in coverage_files:
            file_stat = file_path.stat()
            file_modified = datetime.fromtimestamp(file_stat.st_mtime)
            file_size_mb = file_stat.st_size / (1024 * 1024)

            if file_modified < cutoff_date:
                if archive:
                    # Archive old files
                    archive_name = (
                        f"{file_path.name}_{file_modified.strftime('%Y%m%d_%H%M%S')}"
                    )
                    archive_path = self.archives_dir / archive_name
                    shutil.move(str(file_path), str(archive_path))
                    stats["files_archived"] += 1
                else:
                    # Delete old files
                    file_path.unlink()
                    stats["files_deleted"] += 1

                stats["space_freed_mb"] += file_size_mb
            elif file_path.name != ".coverage":
                # Always clean up temporary coverage files (but keep main .coverage)
                file_path.unlink()
                stats["files_deleted"] += 1
                stats["space_freed_mb"] += file_size_mb

        return stats

    def combine_coverage(self) -> bool:
        """Combine all coverage files into a single .coverage file."""
        try:
            # Check if coverage is installed
            result = subprocess.run(
                ["python", "-m", "coverage", "combine"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                print("✅ Successfully combined coverage files")
                return True
            else:
                print(f"⚠️ Failed to combine coverage: {result.stderr}")
                return False
        except Exception as e:
            print(f"❌ Error combining coverage: {e}")
            return False

    def generate_report(self, format: str = "html") -> Path | None:
        """Generate coverage report in specified format."""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

        if format == "html":
            report_path = self.reports_dir / f"coverage_{timestamp}"
            cmd = ["python", "-m", "coverage", "html", "-d", str(report_path)]
        elif format == "json":
            report_path = self.reports_dir / f"coverage_{timestamp}.json"
            cmd = ["python", "-m", "coverage", "json", "-o", str(report_path)]
        elif format == "xml":
            report_path = self.reports_dir / f"coverage_{timestamp}.xml"
            cmd = ["python", "-m", "coverage", "xml", "-o", str(report_path)]
        else:
            print(f"❌ Unsupported format: {format}")
            return None

        try:
            result = subprocess.run(
                cmd, cwd=self.project_root, capture_output=True, text=True
            )

            if result.returncode == 0:
                print(f"✅ Generated {format} report: {report_path}")

                # Get coverage percentage
                coverage_result = subprocess.run(
                    ["python", "-m", "coverage", "report", "--format=total"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True,
                )

                if coverage_result.returncode == 0:
                    try:
                        coverage_pct = float(coverage_result.stdout.strip())
                        self._record_coverage_run(coverage_pct, str(report_path))
                    except ValueError:
                        pass

                return report_path
            else:
                print(f"❌ Failed to generate report: {result.stderr}")
                return None
        except Exception as e:
            print(f"❌ Error generating report: {e}")
            return None

    def _record_coverage_run(self, coverage_pct: float, report_path: str):
        """Record coverage run in database."""
        try:
            # Get current git branch and commit
            branch_result = subprocess.run(
                ["git", "rev-parse", "--abbrev-ref", "HEAD"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
            )
            branch = (
                branch_result.stdout.strip()
                if branch_result.returncode == 0
                else "unknown"
            )

            commit_result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.project_root,
                capture_output=True,
                text=True,
            )
            commit = (
                commit_result.stdout.strip()[:8]
                if commit_result.returncode == 0
                else "unknown"
            )

            conn = sqlite3.connect(self.coverage_db)
            cursor = conn.cursor()

            cursor.execute(
                """
                INSERT INTO coverage_runs (branch, commit_hash, coverage_percentage, report_path)
                VALUES (?, ?, ?, ?)
            """,
                (branch, commit, coverage_pct, report_path),
            )

            conn.commit()
            conn.close()
        except Exception as e:
            print(f"⚠️ Failed to record coverage run: {e}")

    def show_history(self, limit: int = 10) -> None:
        """Show coverage history from database."""
        conn = sqlite3.connect(self.coverage_db)
        cursor = conn.cursor()

        cursor.execute(
            """
            SELECT timestamp, branch, commit_hash, coverage_percentage
            FROM coverage_runs
            ORDER BY timestamp DESC
            LIMIT ?
        """,
            (limit,),
        )

        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print("No coverage history found.")
            return

        print("\n📊 Coverage History")
        print("=" * 70)
        print(f"{'Timestamp':<20} {'Branch':<20} {'Commit':<10} {'Coverage':<10}")
        print("-" * 70)

        for row in rows:
            timestamp, branch, commit, coverage = row
            print(
                f"{timestamp[:19]:<20} {branch[:19]:<20} {commit:<10} {coverage:>6.1f}%"
            )

    def auto_manage(self) -> None:
        """Automatic coverage management: combine, report, and clean."""
        print("\n🔄 Starting automatic coverage management...")

        # Step 1: Combine coverage files
        self.combine_coverage()

        # Step 2: Generate reports
        self.generate_report("html")
        self.generate_report("json")

        # Step 3: Clean old files
        stats = self.clean_coverage_files(keep_days=7, archive=True)

        print("\n📈 Coverage Management Summary:")
        print(f"  • Files found: {stats['files_found']}")
        print(f"  • Files archived: {stats['files_archived']}")
        print(f"  • Files deleted: {stats['files_deleted']}")
        print(f"  • Space freed: {stats['space_freed_mb']:.2f} MB")


def main():
    parser = argparse.ArgumentParser(description="Manage pytest coverage files")

    subparsers = parser.add_subparsers(dest="command", help="Commands")

    # Clean command
    clean_parser = subparsers.add_parser("clean", help="Clean coverage files")
    clean_parser.add_argument(
        "--keep-days", type=int, default=7, help="Keep files newer than N days"
    )
    clean_parser.add_argument(
        "--no-archive", action="store_true", help="Delete instead of archive"
    )

    # Combine command
    subparsers.add_parser("combine", help="Combine coverage files")

    # Report command
    report_parser = subparsers.add_parser("report", help="Generate coverage report")
    report_parser.add_argument(
        "--format", choices=["html", "json", "xml"], default="html"
    )

    # History command
    history_parser = subparsers.add_parser("history", help="Show coverage history")
    history_parser.add_argument(
        "--limit", type=int, default=10, help="Number of entries to show"
    )

    # Auto command
    subparsers.add_parser("auto", help="Automatic management (combine, report, clean)")

    args = parser.parse_args()

    if not args.command:
        parser.print_help()
        sys.exit(1)

    manager = CoverageManager()

    if args.command == "clean":
        stats = manager.clean_coverage_files(
            keep_days=args.keep_days, archive=not args.no_archive
        )
        print(f"\n✅ Cleaned {stats['files_deleted'] + stats['files_archived']} files")
        print(f"   Space freed: {stats['space_freed_mb']:.2f} MB")

    elif args.command == "combine":
        manager.combine_coverage()

    elif args.command == "report":
        manager.generate_report(args.format)

    elif args.command == "history":
        manager.show_history(args.limit)

    elif args.command == "auto":
        manager.auto_manage()


if __name__ == "__main__":
    main()
