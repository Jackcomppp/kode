#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
通用NC文件预处理器
"""

import os
import numpy as np
import xarray as xr
from pathlib import Path
from typing import Dict, List, Optional, Any
import warnings
warnings.filterwarnings('ignore')


class NCPreprocessor:
    """通用NC文件预处理器"""

    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.input_dir = config.get('input_dir', '')
        self.output_dir = config.get('output_dir', '')
        self.file_pattern = config.get('file_pattern', '*.nc')
        self.variable_name = config.get('variable_name', 'sst')

        os.makedirs(self.output_dir, exist_ok=True)

        self.stats = {
            'files_processed': 0,
            'files_failed': 0,
            'total_frames': 0,
            'processing_log': []
        }

    def load_files(self) -> List[str]:
        """加载输入文件列表"""
        from glob import glob
        file_paths = sorted(glob(os.path.join(self.input_dir, self.file_pattern)))
        return file_paths

    def process_single_file(self, file_path: str) -> Optional[xr.Dataset]:
        """处理单个NC文件"""
        try:
            ds = xr.open_dataset(file_path)

            if self.variable_name not in ds.data_vars:
                print(f"警告：{file_path} 中未找到变量 {self.variable_name}")
                return None

            # 移除全NaN的时间步
            data = ds[self.variable_name]
            if 'time' in data.dims:
                valid_mask = ~data.isnull().all(dim=[d for d in data.dims if d != 'time'])
                if valid_mask.any():
                    ds = ds.sel(time=valid_mask)

            # 数据范围检查
            data_values = ds[self.variable_name].values
            if np.any(~np.isnan(data_values)):
                data_min = np.nanmin(data_values)
                data_max = np.nanmax(data_values)

                if data_min < -5 or data_max > 50:
                    print(f"警告：{file_path} 数据范围异常: [{data_min:.2f}, {data_max:.2f}]")

            return ds

        except Exception as e:
            print(f"处理 {file_path} 失败: {e}")
            self.stats['files_failed'] += 1
            return None

    def merge_datasets(self, datasets: List[xr.Dataset]) -> Optional[xr.Dataset]:
        """合并多个数据集"""
        if not datasets:
            return None

        try:
            merged = xr.concat(datasets, dim='time')
            merged = merged.sortby('time')
            return merged
        except Exception as e:
            print(f"合并数据集失败: {e}")
            return None

    def post_process(self, ds: xr.Dataset) -> xr.Dataset:
        """最终后处理"""
        ds.attrs['processed_by'] = 'NCPreprocessor'
        ds.attrs['description'] = 'Preprocessed ocean data'
        return ds

    def save_output(self, ds: xr.Dataset, output_name: str) -> str:
        """保存处理结果"""
        output_path = os.path.join(self.output_dir, output_name)

        encoding = {}
        for var in ds.data_vars:
            encoding[var] = {
                'zlib': True,
                'complevel': 4,
                'dtype': 'float32'
            }

        ds.to_netcdf(output_path, encoding=encoding)
        print(f"已保存: {output_path}")
        return output_path

    def run(self) -> Dict[str, Any]:
        """执行完整预处理流程"""
        print("="*60)
        print("开始数据预处理")
        print("="*60)
        print(f"输入目录: {self.input_dir}")
        print(f"输出目录: {self.output_dir}")
        print(f"变量名称: {self.variable_name}")

        file_paths = self.load_files()
        print(f"\n找到 {len(file_paths)} 个文件")

        if not file_paths:
            print("错误：未找到输入文件")
            return self.stats

        processed_datasets = []
        for i, file_path in enumerate(file_paths, 1):
            print(f"\n[{i}/{len(file_paths)}] 处理: {os.path.basename(file_path)}")
            ds = self.process_single_file(file_path)

            if ds is not None:
                processed_datasets.append(ds)
                self.stats['files_processed'] += 1
                if 'time' in ds.dims:
                    self.stats['total_frames'] += ds.dims['time']

        if processed_datasets:
            print(f"\n合并 {len(processed_datasets)} 个数据集...")
            merged_ds = self.merge_datasets(processed_datasets)

            if merged_ds is not None:
                print("执行后处理...")
                final_ds = self.post_process(merged_ds)

                output_name = f"preprocessed_{self.variable_name}.nc"
                output_path = self.save_output(final_ds, output_name)

                self.stats['output_file'] = output_path
                self.stats['output_shape'] = dict(final_ds.dims)

                final_ds.close()

        print("\n" + "="*60)
        print("预处理完成")
        print("="*60)
        print(f"成功处理: {self.stats['files_processed']} 个文件")
        print(f"处理失败: {self.stats['files_failed']} 个文件")
        print(f"总帧数: {self.stats['total_frames']}")

        return self.stats
