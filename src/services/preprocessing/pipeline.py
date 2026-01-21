#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
完整数据预处理流程
"""

import os
import torch
from .nc_preprocessor import NCPreprocessor
from .validator import PreprocessValidator


def run_preprocessing_pipeline(config: dict) -> bool:
    """
    运行完整的预处理和验证流程

    Args:
        config: 配置字典

    Returns:
        bool: 是否成功
    """
    print("\n" + "🌊"*30)
    print(" 海洋数据预处理完整流程")
    print("🌊"*30)

    output_dir = config['output_dir']
    os.makedirs(output_dir, exist_ok=True)

    # 阶段 1: 数据预处理
    print("\n" + "="*60)
    print("阶段 1/2: 数据预处理")
    print("="*60)

    preprocessor = NCPreprocessor(config)
    preprocess_stats = preprocessor.run()

    if preprocess_stats['files_processed'] == 0:
        print("\n❌ 预处理失败：未成功处理任何文件")
        return False

    output_file = preprocess_stats.get('output_file')
    if not output_file or not os.path.exists(output_file):
        print("\n❌ 预处理输出文件不存在")
        return False

    print(f"\n✅ 预处理完成！")
    print(f"   输出文件: {output_file}")
    print(f"   处理文件数: {preprocess_stats['files_processed']}")
    print(f"   总帧数: {preprocess_stats['total_frames']}")

    # 阶段 2: 质量验证
    print("\n" + "="*60)
    print("阶段 2/2: 数据质量验证（CNN收敛性检查）")
    print("="*60)

    try:
        import torch
        device = 'cuda' if torch.cuda.is_available() else 'cpu'
        print(f"使用设备: {device}")
    except ImportError:
        device = 'cpu'
        print("使用设备: cpu (PyTorch未安装)")

    validator = PreprocessValidator(device=device)
    validation_results = validator.validate(output_file, variable_name=config['variable_name'])

    # 生成报告
    if validation_results['converged']:
        print("\n✅ 数据收敛！生成完整报告...")
        validator.generate_report(output_dir, preprocessor_stats=preprocess_stats)
        print(validator.get_summary())
        return True
    elif validation_results['warnings']:
        print("\n⚠️  数据验证有警告，但仍生成报告...")
        validator.generate_report(output_dir, preprocessor_stats=preprocess_stats)
        print(validator.get_summary())
        return True
    else:
        print("\n❌ 数据验证失败")
        for error in validation_results['errors']:
            print(f"  - {error}")
        validator.generate_report(output_dir, preprocessor_stats=preprocess_stats)
        return False
