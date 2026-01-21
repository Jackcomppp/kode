#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
生成测试用的简单NC数据
"""

import os
import numpy as np
import xarray as xr
from datetime import datetime, timedelta


def generate_simple_sst_data(output_dir: str, n_files: int = 3, n_time: int = 10):
    """
    生成简单的SST测试数据

    Args:
        output_dir: 输出目录
        n_files: 生成文件数量
        n_time: 每个文件的时间步数
    """
    print("="*60)
    print("生成测试数据")
    print("="*60)

    os.makedirs(output_dir, exist_ok=True)

    # 空间网格
    n_lat, n_lon = 50, 60
    lat = np.linspace(20.0, 30.0, n_lat)
    lon = np.linspace(110.0, 120.0, n_lon)

    generated_files = []

    for file_idx in range(n_files):
        print(f"\n生成文件 {file_idx + 1}/{n_files}...")

        # 时间坐标
        start_time = datetime(2015, 1, 1) + timedelta(days=file_idx * n_time)
        time = [start_time + timedelta(days=i) for i in range(n_time)]

        # 生成SST数据 (Celsius)
        # 基础温度场 + 随机扰动
        base_temp = 25.0
        sst_data = np.zeros((n_time, n_lat, n_lon))

        for t in range(n_time):
            # 空间变化模式（正弦波模拟海洋温度梯度）
            lat_pattern = np.sin(np.linspace(0, np.pi, n_lat))[:, np.newaxis]
            lon_pattern = np.cos(np.linspace(0, 2*np.pi, n_lon))[np.newaxis, :]

            spatial_pattern = lat_pattern * lon_pattern * 3.0

            # 时间演化
            time_factor = np.sin(t / n_time * np.pi) * 2.0

            # 随机噪声
            noise = np.random.randn(n_lat, n_lon) * 0.5

            sst_data[t] = base_temp + spatial_pattern + time_factor + noise

        # 添加一些缺失值（模拟云覆盖）
        missing_ratio = 0.1 + np.random.rand() * 0.1  # 10-20% 缺失
        for t in range(n_time):
            n_missing = int(n_lat * n_lon * missing_ratio)
            missing_indices = np.random.choice(n_lat * n_lon, n_missing, replace=False)
            missing_coords = np.unravel_index(missing_indices, (n_lat, n_lon))
            sst_data[t][missing_coords] = np.nan

        # 创建xarray Dataset
        ds = xr.Dataset(
            {
                'sst': (['time', 'lat', 'lon'], sst_data),
            },
            coords={
                'time': time,
                'lat': lat,
                'lon': lon,
            },
            attrs={
                'description': f'Test SST data - file {file_idx + 1}',
                'units': 'Celsius',
                'created': datetime.now().isoformat(),
            }
        )

        # 保存文件
        filename = f"test_sst_{file_idx:02d}.nc"
        filepath = os.path.join(output_dir, filename)
        ds.to_netcdf(filepath)
        ds.close()

        generated_files.append(filepath)
        print(f"  [OK] 已保存: {filename}")
        print(f"    - 形状: {sst_data.shape}")
        print(f"    - 缺失值: {np.isnan(sst_data).sum() / sst_data.size * 100:.1f}%")
        print(f"    - 温度范围: [{np.nanmin(sst_data):.2f}, {np.nanmax(sst_data):.2f}] °C")

    print("\n" + "="*60)
    print(f"[SUCCESS] 成功生成 {len(generated_files)} 个测试文件")
    print(f"输出目录: {output_dir}")
    print("="*60)

    return generated_files


if __name__ == "__main__":
    import tempfile
    test_dir = os.path.join(tempfile.gettempdir(), "kode_test_data")
    generate_simple_sst_data(test_dir)
