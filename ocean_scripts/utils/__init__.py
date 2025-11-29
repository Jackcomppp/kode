"""Ocean Scripts Utilities"""

from .dashboard_utils import (
    DashboardClient,
    get_client,
    start_training,
    update_epoch,
    complete_training,
    add_metric,
    update_model_info,
    add_visualization,
    log_info,
    log_warning,
    log_error,
)

__all__ = [
    'DashboardClient',
    'get_client',
    'start_training',
    'update_epoch',
    'complete_training',
    'add_metric',
    'update_model_info',
    'add_visualization',
    'log_info',
    'log_warning',
    'log_error',
]
