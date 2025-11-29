#!/usr/bin/env python3
"""
Ocean Data Processor

Main entry point for ocean data processing operations.
Handles format conversion, data extraction, local search, downloads, and validation.
"""

import sys
import json
import argparse
from pathlib import Path

def main():
    parser = argparse.ArgumentParser(description='Process ocean data files')
    parser.add_argument('--action', required=True, choices=[
        'list_local', 'search', 'convert', 'extract', 'download', 'validate', 'info'
    ])
    parser.add_argument('--workspace', required=True, help='Path to ocean workspace')
    parser.add_argument('--json-input', required=True, help='JSON input parameters')

    args = parser.parse_args()

    # Add ocean-workspace utils to Python path based on provided workspace argument
    workspace_utils = Path(args.workspace).resolve() / 'utils'
    if str(workspace_utils) not in sys.path:
        sys.path.insert(0, str(workspace_utils))

    try:
        # Parse input parameters
        input_params = json.loads(args.json_input)
        action = input_params['action']
        workspace = Path(args.workspace)

        # Dispatch to appropriate handler
        if action == 'list_local':
            result = handle_list_local(workspace, input_params)
        elif action == 'search':
            result = handle_search(workspace, input_params)
        elif action == 'convert':
            result = handle_convert(workspace, input_params)
        elif action == 'extract':
            result = handle_extract(workspace, input_params)
        elif action == 'download':
            result = handle_download(workspace, input_params)
        elif action == 'validate':
            result = handle_validate(workspace, input_params)
        elif action == 'info':
            result = handle_info(workspace, input_params)
        else:
            result = {
                'success': False,
                'action': action,
                'error': f'Unknown action: {action}'
            }

        # Output result as JSON
        print(json.dumps(result, indent=2))

    except Exception as e:
        error_result = {
            'success': False,
            'action': args.action if hasattr(args, 'action') else 'unknown',
            'error': str(e)
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)


def handle_list_local(workspace: Path, params: dict) -> dict:
    """List all ocean data files in local database"""
    try:
        from ocean_data.utils.format_detector import detect_format
        from ocean_data.utils.metadata import extract_metadata

        data_dir = workspace / 'data'
        data_files = []

        # Search in both raw and processed directories
        for subdir in ['raw', 'processed']:
            dir_path = data_dir / subdir
            if not dir_path.exists():
                continue

            # Find all data files
            for file_path in dir_path.glob('**/*'):
                if not file_path.is_file():
                    continue

                # Check if it's a supported format
                format_type = detect_format(str(file_path))
                if format_type == 'unknown':
                    continue

                # Extract metadata
                metadata = extract_metadata(str(file_path), format_type)

                # Format file size
                size_bytes = file_path.stat().st_size
                if size_bytes < 1024:
                    size_str = f"{size_bytes} B"
                elif size_bytes < 1024 * 1024:
                    size_str = f"{size_bytes / 1024:.1f} KB"
                elif size_bytes < 1024 * 1024 * 1024:
                    size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
                else:
                    size_str = f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

                file_info = {
                    'path': str(file_path.relative_to(workspace)),
                    'format': format_type,
                    'variables': metadata.get('variables', []),
                    'size': size_str
                }

                if 'time_range' in metadata:
                    file_info['time_range'] = metadata['time_range']
                if 'spatial_extent' in metadata:
                    file_info['spatial_extent'] = metadata['spatial_extent']

                data_files.append(file_info)

        return {
            'success': True,
            'action': 'list_local',
            'data_files': data_files
        }

    except Exception as e:
        return {
            'success': False,
            'action': 'list_local',
            'error': f'Failed to list local data: {str(e)}'
        }


def handle_search(workspace: Path, params: dict) -> dict:
    """Search for ocean data matching criteria"""
    try:
        # First get all local files
        list_result = handle_list_local(workspace, params)
        if not list_result['success']:
            return list_result

        query = params.get('query', {})
        all_files = list_result['data_files']
        matching_files = []

        for file_info in all_files:
            score = 0
            matches = True

            # Check data type (in filename or variables)
            if 'data_type' in query:
                data_type = query['data_type'].lower()
                file_path_lower = file_info['path'].lower()
                variables_lower = [v.lower() for v in file_info.get('variables', [])]

                if data_type in file_path_lower or data_type in variables_lower:
                    score += 10
                else:
                    matches = False

            # Check time range
            if matches and 'time_range' in query and 'time_range' in file_info:
                # TODO: Implement time range matching
                score += 5

            # Check spatial range
            if matches and 'spatial_range' in query and 'spatial_extent' in file_info:
                # TODO: Implement spatial range matching
                score += 5

            if matches:
                matching_files.append((score, file_info))

        # Sort by score (descending)
        matching_files.sort(key=lambda x: x[0], reverse=True)

        return {
            'success': True,
            'action': 'search',
            'data_files': [f for _, f in matching_files]
        }

    except Exception as e:
        return {
            'success': False,
            'action': 'search',
            'error': f'Search failed: {str(e)}'
        }


def handle_convert(workspace: Path, params: dict) -> dict:
    """Convert data from one format to another"""
    try:
        from ocean_data.processors.converter import convert_format

        source_path = workspace / params['source_path']
        target_path = workspace / params['target_path']
        source_format = params.get('source_format', 'auto')
        target_format = params['target_format']
        variables = params.get('variables')

        if not source_path.exists():
            return {
                'success': False,
                'action': 'convert',
                'error': f'Source file not found: {source_path}'
            }

        # Ensure target directory exists
        target_path.parent.mkdir(parents=True, exist_ok=True)

        # Perform conversion
        convert_format(
            str(source_path),
            str(target_path),
            source_format,
            target_format,
            variables
        )

        return {
            'success': True,
            'action': 'convert',
            'converted': str(target_path.relative_to(workspace))
        }

    except Exception as e:
        return {
            'success': False,
            'action': 'convert',
            'error': f'Conversion failed: {str(e)}'
        }


def handle_extract(workspace: Path, params: dict) -> dict:
    """Extract a subset of data"""
    try:
        from ocean_data.processors.extractor import extract_subset

        source_path = workspace / params['source_path']
        target_path = workspace / params['target_path']
        time_slice = params.get('time_slice')
        spatial_slice = params.get('spatial_slice')
        variables = params.get('variables')

        if not source_path.exists():
            return {
                'success': False,
                'action': 'extract',
                'error': f'Source file not found: {source_path}'
            }

        # Ensure target directory exists
        target_path.parent.mkdir(parents=True, exist_ok=True)

        # Perform extraction
        extract_subset(
            str(source_path),
            str(target_path),
            time_slice,
            spatial_slice,
            variables
        )

        return {
            'success': True,
            'action': 'extract',
            'extracted': str(target_path.relative_to(workspace))
        }

    except Exception as e:
        return {
            'success': False,
            'action': 'extract',
            'error': f'Extraction failed: {str(e)}'
        }


def handle_download(workspace: Path, params: dict) -> dict:
    """Download ocean data from internet"""
    try:
        from ocean_data.downloaders.base_downloader import get_downloader
        from ocean_data.utils.network import check_network

        # Check network if requested
        if params.get('check_network', True):
            network_status = check_network()
            if not network_status['connected']:
                return {
                    'success': False,
                    'action': 'download',
                    'error': 'No internet connection'
                }

            if network_status.get('needs_vpn'):
                return {
                    'success': False,
                    'action': 'download',
                    'warning': 'VPN may be required for this data source. Please connect to VPN and try again.'
                }

        # Get appropriate downloader
        source = params.get('download_source', 'custom')
        downloader = get_downloader(source)

        # Estimate size if requested
        if params.get('estimate_size', True):
            # TODO: Implement size estimation
            pass

        # Perform download
        target_path = workspace / params['target_path']
        target_path.parent.mkdir(parents=True, exist_ok=True)

        url = params.get('url')
        query = params.get('query', {})

        downloader.download(query, str(target_path), url)

        return {
            'success': True,
            'action': 'download',
            'downloaded': str(target_path.relative_to(workspace))
        }

    except Exception as e:
        return {
            'success': False,
            'action': 'download',
            'error': f'Download failed: {str(e)}'
        }


def handle_validate(workspace: Path, params: dict) -> dict:
    """Validate data quality"""
    try:
        from ocean_data.processors.validator import validate_data

        source_path = workspace / params['source_path']
        checks = params.get('checks', ['shape', 'range', 'nan'])

        if not source_path.exists():
            return {
                'success': False,
                'action': 'validate',
                'error': f'Source file not found: {source_path}'
            }

        # Perform validation
        validation_results = validate_data(str(source_path), checks)

        # Check if all validations passed
        all_passed = all(
            result.get('passed', False)
            for result in validation_results.values()
        )

        return {
            'success': True,
            'action': 'validate',
            'validated': all_passed,
            'validation_results': validation_results
        }

    except Exception as e:
        return {
            'success': False,
            'action': 'validate',
            'error': f'Validation failed: {str(e)}'
        }


def handle_info(workspace: Path, params: dict) -> dict:
    """Get detailed information about a data file"""
    try:
        from ocean_data.utils.format_detector import detect_format
        from ocean_data.utils.metadata import extract_detailed_metadata

        source_path = workspace / params['source_path']

        if not source_path.exists():
            return {
                'success': False,
                'action': 'info',
                'error': f'File not found: {source_path}'
            }

        # Detect format
        format_type = detect_format(str(source_path))

        if format_type == 'unknown':
            return {
                'success': False,
                'action': 'info',
                'error': 'Unsupported file format'
            }

        # Extract detailed metadata
        metadata = extract_detailed_metadata(str(source_path), format_type)

        # Add file info
        size_bytes = source_path.stat().st_size
        if size_bytes < 1024 * 1024 * 1024:
            size_str = f"{size_bytes / (1024 * 1024):.1f} MB"
        else:
            size_str = f"{size_bytes / (1024 * 1024 * 1024):.2f} GB"

        file_info = {
            'file': source_path.name,
            'format': format_type,
            'size': size_str,
            **metadata
        }

        return {
            'success': True,
            'action': 'info',
            'file_info': file_info
        }

    except Exception as e:
        return {
            'success': False,
            'action': 'info',
            'error': f'Failed to get file info: {str(e)}'
        }


if __name__ == '__main__':
    main()
