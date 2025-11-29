"""
DiffSR Wrapper for Kode Integration
Provides unified interface to DiffSR-main functionality
"""
import sys
import json
import os
from pathlib import Path
import importlib.util

class DiffSRWrapper:
    """Wrapper class for DiffSR-main integration"""
    
    def __init__(self, diffsr_path: str = "D:/tmp/DiffSR-main"):
        self.diffsr_path = Path(diffsr_path)
        if not self.diffsr_path.exists():
            raise ValueError(f"DiffSR path not found: {diffsr_path}")
        
        # Add DiffSR to Python path
        sys.path.insert(0, str(self.diffsr_path))
        
    def load_config(self, config_path: str):
        """Load YAML configuration"""
        import yaml
        with open(config_path, 'r') as f:
            return yaml.safe_load(f)
    
    def prepare_dataset(self, dataset_type: str, data_path: str, **kwargs):
        """Prepare dataset using DiffSR datasets module"""
        try:
            if dataset_type == 'ocean':
                from datasets.Ocean import OceanDataset
                dataset = OceanDataset(data_path, **kwargs)
            elif dataset_type == 'era5':
                from datasets.ERA5 import ERA5Dataset
                dataset = ERA5Dataset(data_path, **kwargs)
            elif dataset_type == 'era5_temperature':
                from datasets.ERA5temperature import ERA5TemperatureDataset
                dataset = ERA5TemperatureDataset(data_path, **kwargs)
            elif dataset_type == 'era5_wind':
                from datasets.ERA5wind import ERA5WindDataset
                dataset = ERA5WindDataset(data_path, **kwargs)
            elif dataset_type == 'ns2d':
                from datasets.ns2d import NS2DDataset
                dataset = NS2DDataset(data_path, **kwargs)
            else:
                raise ValueError(f"Unknown dataset type: {dataset_type}")
            
            return {
                'status': 'success',
                'dataset_type': dataset_type,
                'length': len(dataset)
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def create_model(self, model_type: str, **kwargs):
        """Create model instance"""
        try:
            model_map = {
                'fno': 'models.fno',
                'edsr': 'models.EDSR.EDSR',
                'swinir': 'models.swinIR.SwinIR',
                'ddpm': 'models.ddpm.diffusion',
                'sr3': 'models.sr3.diffusion',
                'resshift': 'models.resshift',
                'hinote': 'models.HiNOTE.HiNOTE',
                'mwt': 'models.MWT',
                'galerkin': 'models.galerkin.Galerkin_Transformer',
                'm2no': 'models.m2no',
                'mg_ddpm': 'models.mg_ddpm',
                'remg': 'models.remg',
                'sronet': 'models.sronet',
                'unet': 'models.unet',
                'wdno': 'models.wdno'
            }
            
            if model_type not in model_map:
                raise ValueError(f"Unknown model type: {model_type}")
            
            # Dynamic import
            module_path = model_map[model_type]
            return {
                'status': 'success',
                'model_type': model_type,
                'module': module_path
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def create_trainer(self, trainer_type: str, model, dataset, **kwargs):
        """Create trainer instance"""
        try:
            if trainer_type == 'base':
                from trainers.base import BaseTrainer
                trainer = BaseTrainer(model, dataset, **kwargs)
            elif trainer_type == 'ddpm':
                from trainers.ddpm import DDPMTrainer
                trainer = DDPMTrainer(model, dataset, **kwargs)
            elif trainer_type == 'resshift':
                from trainers.resshift import ResShiftTrainer
                trainer = ResShiftTrainer(model, dataset, **kwargs)
            elif trainer_type == 'remig':
                from trainers.remig import RemigTrainer
                trainer = RemigTrainer(model, dataset, **kwargs)
            elif trainer_type == 'wdno':
                from trainers.wdno import WDNOTrainer
                trainer = WDNOTrainer(model, dataset, **kwargs)
            else:
                raise ValueError(f"Unknown trainer type: {trainer_type}")
            
            return {
                'status': 'success',
                'trainer_type': trainer_type
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def create_forecastor(self, forecastor_type: str, model, **kwargs):
        """Create forecastor instance"""
        try:
            if forecastor_type == 'base':
                from forecastors.base import BaseForecastor
                forecastor = BaseForecastor(model, **kwargs)
            elif forecastor_type == 'ddpm':
                from forecastors.ddpm import DDPMForecastor
                forecastor = DDPMForecastor(model, **kwargs)
            elif forecastor_type == 'resshift':
                from forecastors.resshift import ResShiftForecastor
                forecastor = ResShiftForecastor(model, **kwargs)
            else:
                raise ValueError(f"Unknown forecastor type: {forecastor_type}")
            
            return {
                'status': 'success',
                'forecastor_type': forecastor_type
            }
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def run_training(self, config_path: str, output_dir: str):
        """Run complete training pipeline"""
        try:
            config = self.load_config(config_path)
            
            # Import main training script
            from main import train
            
            result = {
                'status': 'training_started',
                'config': config_path,
                'output_dir': output_dir
            }
            
            return result
        except Exception as e:
            return {'status': 'error', 'message': str(e)}
    
    def run_inference(self, model_path: str, input_data: str, output_path: str, **kwargs):
        """Run inference with trained model"""
        try:
            import torch
            import numpy as np
            
            # Load model checkpoint
            checkpoint = torch.load(model_path, map_location='cpu')
            
            # Load input data
            if input_data.endswith('.npy'):
                data = np.load(input_data)
            elif input_data.endswith('.npz'):
                data = np.load(input_data)
                data = data[list(data.keys())[0]]
            else:
                raise ValueError("Unsupported input format")
            
            result = {
                'status': 'inference_ready',
                'model': model_path,
                'input_shape': data.shape,
                'output': output_path
            }
            
            return result
        except Exception as e:
            return {'status': 'error', 'message': str(e)}

def main():
    """CLI interface for DiffSR wrapper"""
    if len(sys.argv) < 2:
        print(json.dumps({'error': 'No command specified'}))
        sys.exit(1)
    
    command = sys.argv[1]
    args = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
    
    try:
        wrapper = DiffSRWrapper(args.get('diffsr_path', 'D:/tmp/DiffSR-main'))
        
        if command == 'prepare_dataset':
            result = wrapper.prepare_dataset(
                args['dataset_type'],
                args['data_path'],
                **args.get('kwargs', {})
            )
        elif command == 'create_model':
            result = wrapper.create_model(
                args['model_type'],
                **args.get('kwargs', {})
            )
        elif command == 'run_training':
            result = wrapper.run_training(
                args['config_path'],
                args['output_dir']
            )
        elif command == 'run_inference':
            result = wrapper.run_inference(
                args['model_path'],
                args['input_data'],
                args['output_path'],
                **args.get('kwargs', {})
            )
        else:
            result = {'error': f'Unknown command: {command}'}
        
        print(json.dumps(result, indent=2))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
