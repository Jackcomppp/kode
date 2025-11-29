#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
数据预处理脚本
处理 JAXA 和 OSTIA 海表温度数据
"""

import os
import glob
import numpy as np
import xarray as xr
import pandas as pd
from pathlib import Path
from datetime import datetime

# ===================== 配置路径 =====================
BASE_DIR = r"D:\ -- data_for_agent\data_for_agent\scripts\raw_data"
JAXA_DIR = os.path.join(BASE_DIR, "JAXA")
OSTIA_DIR = os.path.join(BASE_DIR, "OSTIA")
OSTIA_FILE = os.path.join(OSTIA_DIR, "Ostia_sst_monthly_2015.nc")
OUTPUT_DIR = r"D:\ -- data_for_agent\data_for_agent\scripts\processed_data"

# 创建输出目录
os.makedirs(OUTPUT_DIR, exist_ok=True)


# ===================== JAXA 数据处理 =====================
def process_jaxa_data():
    """
    处理 JAXA 小时级数据（1945个文件）
    - 按月合并
    - 时间对齐
    - 缺失值处理
    """
    print("\n" + "="*60)
    print("开始处理 JAXA 数据...")
    print("="*60)
    
    # 查找所有 nc 文件
    jaxa_files = sorted(glob.glob(os.path.join(JAXA_DIR, "*/*/*/*.nc")))
    print(f"找到 {len(jaxa_files)} 个 JAXA 数据文件")
    
    if not jaxa_files:
        print("警告：未找到 JAXA 数据文件")
        return None
    
    # 查看第一个文件的结构
    print("\n检查数据结构...")
    try:
        sample_ds = xr.open_dataset(jaxa_files[0])
        print(f"变量: {list(sample_ds.data_vars)}")
        print(f"维度: {dict(sample_ds.dims)}")
        print(f"坐标: {list(sample_ds.coords)}")
        sample_ds.close()
    except Exception as e:
        print(f"读取示例文件出错: {e}")
        return None
    
    # 按月分组处理
    monthly_files = {}
    for f in jaxa_files:
        # 从文件名提取日期 (例如: 20150707000000.nc)
        filename = os.path.basename(f)
        year_month = filename[:6]  # 201507
        if year_month not in monthly_files:
            monthly_files[year_month] = []
        monthly_files[year_month].append(f)
    
    print(f"\n数据涵盖月份: {sorted(monthly_files.keys())}")
    
    # 逐月合并
    monthly_datasets = []
    for year_month, files in sorted(monthly_files.items()):
        print(f"\n处理 {year_month}: {len(files)} 个文件")
        
        try:
            # 使用 xarray 批量打开并合并
            ds_month = xr.open_mfdataset(
                files,
                combine='by_coords',
                parallel=True,
                chunks={'time': 24}  # 按天分块
            )
            
            # 统计缺失值
            if len(ds_month.data_vars) > 0:
                var_name = list(ds_month.data_vars)[0]
                nan_count = ds_month[var_name].isnull().sum().compute()
                total_count = ds_month[var_name].size
                print(f"  - 缺失值比例: {float(nan_count)/total_count*100:.2f}%")
            
            monthly_datasets.append(ds_month)
            
        except Exception as e:
            print(f"  错误: {e}")
            continue
    
    if not monthly_datasets:
        print("警告：没有成功处理的月度数据")
        return None
    
    # 合并所有月份
    print("\n合并所有月份数据...")
    try:
        jaxa_merged = xr.concat(monthly_datasets, dim='time')
        jaxa_merged = jaxa_merged.sortby('time')
        
        # 保存合并后的数据
        output_file = os.path.join(OUTPUT_DIR, "JAXA_hourly_2015_merged.nc")
        print(f"\n保存到: {output_file}")
        
        # 使用压缩
        encoding = {var: {"zlib": True, "complevel": 4} 
                   for var in jaxa_merged.data_vars}
        
        jaxa_merged.to_netcdf(output_file, encoding=encoding)
        print(f"✓ JAXA 数据处理完成")
        print(f"  形状: {dict(jaxa_merged.dims)}")
        
        return jaxa_merged
        
    except Exception as e:
        print(f"合并数据时出错: {e}")
        return None


# ===================== OSTIA 数据处理 =====================
def process_ostia_data():
    """
    处理 OSTIA 月度数据
    - 检查缺失值
    - 剔除全 NaN 时间步
    - 数据质量检查
    """
    print("\n" + "="*60)
    print("开始处理 OSTIA 数据...")
    print("="*60)
    
    if not os.path.exists(OSTIA_FILE):
        print(f"错误：文件不存在 {OSTIA_FILE}")
        return None
    
    print(f"读取文件: {OSTIA_FILE}")
    print(f"文件大小: {os.path.getsize(OSTIA_FILE) / (1024**3):.2f} GB")
    
    try:
        ds = xr.open_dataset(OSTIA_FILE)
        print(f"\n变量: {list(ds.data_vars)}")
        print(f"维度: {dict(ds.dims)}")
        print(f"坐标: {list(ds.coords)}")
        
        # 检查主要变量
        if 'analysed_sst' in ds:
            sst = ds['analysed_sst']
            print(f"\nSST 数据形状: {sst.shape}")
            print(f"SST 数据类型: {sst.dtype}")
            
            # 检查缺失值
            print("\n检查缺失值...")
            time_dim = 'time' if 'time' in sst.dims else 't'
            spatial_dims = [d for d in sst.dims if d != time_dim]
            
            # 检查每个时间步的全 NaN 情况
            all_nan_flag = sst.isnull().all(dim=spatial_dims)
            all_nan_bool = all_nan_flag.compute().values
            n_all_nan = int(all_nan_bool.sum())
            total = int(sst.sizes[time_dim])
            
            print(f"总时间步: {total}")
            print(f"全 NaN 时间步: {n_all_nan} ({n_all_nan/total*100:.2f}%)")
            
            if n_all_nan > 0:
                print("\n剔除全 NaN 时间步...")
                keep_idx = np.where(~all_nan_bool)[0]
                ds_filtered = ds.isel({time_dim: keep_idx})
                
                # 保存清洗后的数据
                output_file = os.path.join(OUTPUT_DIR, "OSTIA_monthly_2015_cleaned.nc")
                print(f"保存到: {output_file}")
                
                encoding = {var: {"zlib": True, "complevel": 4} 
                           for var in ds_filtered.data_vars}
                ds_filtered.to_netcdf(output_file, encoding=encoding)
                
                print(f"✓ OSTIA 数据清洗完成")
                print(f"  保留时间步: {len(keep_idx)}/{total}")
                
                return ds_filtered
            else:
                print("✓ 无需清洗，数据质量良好")
                # 复制到输出目录
                output_file = os.path.join(OUTPUT_DIR, "OSTIA_monthly_2015_cleaned.nc")
                import shutil
                shutil.copy2(OSTIA_FILE, output_file)
                return ds
                
        else:
            print("错误：未找到 analysed_sst 变量")
            return None
            
    except Exception as e:
        print(f"处理 OSTIA 数据时出错: {e}")
        import traceback
        traceback.print_exc()
        return None


# ===================== 数据质量报告 =====================
def generate_quality_report(jaxa_ds, ostia_ds):
    """
    生成数据质量报告
    """
    print("\n" + "="*60)
    print("数据质量报告")
    print("="*60)
    
    report = []
    report.append("# 数据预处理质量报告\n")
    report.append(f"生成时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n")
    
    # JAXA 数据报告
    if jaxa_ds is not None:
        report.append("## JAXA 数据\n")
        report.append(f"- 维度: {dict(jaxa_ds.dims)}\n")
        report.append(f"- 变量: {list(jaxa_ds.data_vars)}\n")
        
        if len(jaxa_ds.data_vars) > 0:
            var_name = list(jaxa_ds.data_vars)[0]
            data = jaxa_ds[var_name]
            nan_ratio = float(data.isnull().sum()) / data.size * 100
            report.append(f"- 缺失值比例: {nan_ratio:.2f}%\n")
            
            # 时间范围
            if 'time' in jaxa_ds.coords:
                time_range = pd.to_datetime(jaxa_ds.time.values)
                report.append(f"- 时间范围: {time_range[0]} 至 {time_range[-1]}\n")
                report.append(f"- 时间步数: {len(time_range)}\n")
        
        report.append("\n")
    
    # OSTIA 数据报告
    if ostia_ds is not None:
        report.append("## OSTIA 数据\n")
        report.append(f"- 维度: {dict(ostia_ds.dims)}\n")
        report.append(f"- 变量: {list(ostia_ds.data_vars)}\n")
        
        if 'analysed_sst' in ostia_ds:
            sst = ostia_ds['analysed_sst']
            nan_ratio = float(sst.isnull().sum()) / sst.size * 100
            report.append(f"- 缺失值比例: {nan_ratio:.2f}%\n")
            
            # 统计信息
            sst_mean = float(sst.mean())
            sst_std = float(sst.std())
            sst_min = float(sst.min())
            sst_max = float(sst.max())
            
            report.append(f"- SST 均值: {sst_mean:.2f}\n")
            report.append(f"- SST 标准差: {sst_std:.2f}\n")
            report.append(f"- SST 范围: [{sst_min:.2f}, {sst_max:.2f}]\n")
            
            # 时间范围
            if 'time' in ostia_ds.coords:
                time_range = pd.to_datetime(ostia_ds.time.values)
                report.append(f"- 时间范围: {time_range[0]} 至 {time_range[-1]}\n")
                report.append(f"- 时间步数: {len(time_range)}\n")
    
    # 保存报告
    report_text = "".join(report)
    print(report_text)
    
    report_file = os.path.join(OUTPUT_DIR, "quality_report.md")
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report_text)
    print(f"\n报告已保存到: {report_file}")


# ===================== 主函数 =====================
def main():
    """
    主处理流程
    """
    print("\n" + "="*60)
    print("数据预处理开始")
    print("="*60)
    print(f"输入目录: {BASE_DIR}")
    print(f"输出目录: {OUTPUT_DIR}")
    
    # 1. 处理 JAXA 数据
    jaxa_ds = process_jaxa_data()
    
    # 2. 处理 OSTIA 数据
    ostia_ds = process_ostia_data()
    
    # 3. 生成质量报告
    generate_quality_report(jaxa_ds, ostia_ds)
    
    # 关闭数据集
    if jaxa_ds is not None:
        jaxa_ds.close()
    if ostia_ds is not None:
        ostia_ds.close()
    
    print("\n" + "="*60)
    print("数据预处理完成！")
    print("="*60)
    print(f"\n处理后的数据保存在: {OUTPUT_DIR}")


if __name__ == "__main__":
    main()
