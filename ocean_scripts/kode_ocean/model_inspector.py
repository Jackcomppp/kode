"""
Model Inspector - Automatic layer information extraction from PyTorch models

This module provides utilities to automatically extract detailed layer
information from PyTorch models for Dashboard display.
"""

import torch
import torch.nn as nn
from typing import List, Dict, Any, Tuple, Optional


def extract_layer_info(model: nn.Module, input_shape: Optional[Tuple] = None) -> List[Dict[str, Any]]:
    """
    Automatically extract layer information from PyTorch model

    This function inspects a PyTorch model and extracts detailed information
    about each layer including name, type, parameter count, and optionally
    input/output shapes.

    Args:
        model (nn.Module): PyTorch model to inspect
        input_shape (tuple, optional): Input shape for shape inference
            e.g., (1, 3, 224, 224) for images, (1, 10, 100) for sequences
            If not provided, only basic layer info will be extracted

    Returns:
        List[Dict]: List of layer information dictionaries with format:
            {
                "name": str,           # Layer name (e.g., "conv1", "fc")
                "type": str,           # Layer type (e.g., "Conv2d", "Linear")
                "params": int,         # Number of parameters
                "input_shape": list,   # Input shape (if available)
                "output_shape": list   # Output shape (if available)
            }

    Example:
        >>> model = nn.Sequential(
        ...     nn.Conv2d(3, 64, 3),
        ...     nn.ReLU(),
        ...     nn.Linear(64, 10)
        ... )
        >>> layer_info = extract_layer_info(model, input_shape=(1, 3, 224, 224))
        >>> print(layer_info[0])
        {
            "name": "0",
            "type": "Conv2d",
            "params": 1792,
            "input_shape": [1, 3, 224, 224],
            "output_shape": [1, 64, 222, 222]
        }
    """

    layer_info = []

    # Extract basic layer information (always available)
    for name, module in model.named_modules():
        # Skip container modules (Sequential, ModuleList, etc.)
        if len(list(module.children())) > 0:
            continue

        # Skip root module if it's empty
        if name == "" and sum(1 for _ in module.parameters()) == 0:
            continue

        # Count parameters for this layer
        params = sum(p.numel() for p in module.parameters())

        # Get module type
        module_type = type(module).__name__

        layer_dict = {
            "name": name if name else "root",
            "type": module_type,
            "params": params,
            "input_shape": [],
            "output_shape": []
        }

        layer_info.append(layer_dict)

    # If input shape provided, try to infer actual shapes using hooks
    if input_shape is not None and len(layer_info) > 0:
        try:
            layer_info_with_shapes = _extract_shapes_with_hooks(model, input_shape)
            # Merge shape information with existing layer info
            if len(layer_info_with_shapes) == len(layer_info):
                for i, shapes in enumerate(layer_info_with_shapes):
                    layer_info[i]["input_shape"] = shapes.get("input_shape", [])
                    layer_info[i]["output_shape"] = shapes.get("output_shape", [])
        except Exception as e:
            # If shape inference fails, just return basic info
            print(f"Warning: Could not infer shapes: {e}")

    return layer_info


def _extract_shapes_with_hooks(model: nn.Module, input_shape: Tuple) -> List[Dict[str, Any]]:
    """
    Extract input/output shapes by running a forward pass with hooks

    Args:
        model: PyTorch model
        input_shape: Input tensor shape (e.g., (1, 3, 224, 224))

    Returns:
        List of dicts with input_shape and output_shape
    """

    shape_info = []
    hooks = []

    def hook_fn(module, input_tensor, output_tensor):
        """Hook function to capture shapes"""
        # Extract input shape
        if isinstance(input_tensor, tuple):
            input_shape = list(input_tensor[0].shape) if len(input_tensor) > 0 else []
        else:
            input_shape = list(input_tensor.shape) if input_tensor is not None else []

        # Extract output shape
        if isinstance(output_tensor, tuple):
            output_shape = list(output_tensor[0].shape) if len(output_tensor) > 0 else []
        else:
            output_shape = list(output_tensor.shape) if output_tensor is not None else []

        shape_info.append({
            "input_shape": input_shape,
            "output_shape": output_shape
        })

    # Register hooks for all leaf modules
    for name, module in model.named_modules():
        if len(list(module.children())) == 0:  # Leaf module
            hook = module.register_forward_hook(hook_fn)
            hooks.append(hook)

    # Run forward pass with dummy input
    model.eval()
    with torch.no_grad():
        try:
            dummy_input = torch.randn(input_shape)
            model(dummy_input)
        except Exception as e:
            # If forward pass fails, still return what we collected
            print(f"Warning: Forward pass failed during shape inference: {e}")

    # Remove hooks
    for hook in hooks:
        hook.remove()

    return shape_info


def get_model_summary(model: nn.Module, input_shape: Optional[Tuple] = None) -> Dict[str, Any]:
    """
    Get complete model summary including total parameters and layer details

    Args:
        model: PyTorch model
        input_shape: Optional input shape for shape inference

    Returns:
        Dict with model summary:
            {
                "total_parameters": int,
                "trainable_parameters": int,
                "non_trainable_parameters": int,
                "layer_count": int,
                "layer_info": List[Dict]
            }
    """

    total_params = sum(p.numel() for p in model.parameters())
    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    non_trainable_params = total_params - trainable_params

    layer_info = extract_layer_info(model, input_shape)

    return {
        "total_parameters": total_params,
        "trainable_parameters": trainable_params,
        "non_trainable_parameters": non_trainable_params,
        "layer_count": len(layer_info),
        "layer_info": layer_info
    }


def format_param_count(count: int) -> str:
    """
    Format parameter count in human-readable format

    Args:
        count: Number of parameters

    Returns:
        Formatted string (e.g., "1.2M", "345K")
    """
    if count >= 1_000_000:
        return f"{count / 1_000_000:.1f}M"
    elif count >= 1_000:
        return f"{count / 1_000:.1f}K"
    else:
        return str(count)
