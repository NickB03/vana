#!/usr/bin/env python3
"""
Generate version manifest at build time
"""

import os
import json
import subprocess
import sys
from datetime import datetime


def get_git_info():
    """Get git information if available"""
    try:
        commit_hash = subprocess.check_output(['git', 'rev-parse', 'HEAD'], stderr=subprocess.DEVNULL).decode('utf-8').strip()
        commit_short = subprocess.check_output(['git', 'rev-parse', '--short', 'HEAD'], stderr=subprocess.DEVNULL).decode('utf-8').strip()
        branch = subprocess.check_output(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], stderr=subprocess.DEVNULL).decode('utf-8').strip()
        return commit_hash, commit_short, branch
    except:
        return os.environ.get('COMMIT_SHA', 'unknown'), os.environ.get('COMMIT_SHA', 'unknown')[:8], 'unknown'


def main():
    """Generate version manifest"""
    commit_hash, commit_short, branch = get_git_info()

    manifest = {
        'version': f'1.0.0-{commit_short}',
        'base_version': '1.0.0',
        'git': {
            'commit_hash': commit_hash,
            'commit_short': commit_short,
            'branch': branch
        },
        'build': {
            'build_id': os.environ.get('BUILD_ID', 'unknown'),
            'build_timestamp': os.environ.get('BUILD_TIMESTAMP', datetime.now().isoformat()),
            'builder': 'docker',
            'environment': os.environ.get('ENVIRONMENT', 'development')
        },
        'enhanced_features': {
            'reasoning_tools': 5,
            'mathematical_reasoning': True,
            'logical_reasoning': True,
            'enhanced_echo': True,
            'enhanced_task_analysis': True,
            'reasoning_coordination': True,
            'build_time_generated': True
        }
    }

    with open('/tmp/version_manifest.json', 'w') as f:
        json.dump(manifest, f, indent=2)

    print('Version manifest generated at build time')


if __name__ == '__main__':
    main()