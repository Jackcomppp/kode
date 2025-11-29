# Ocean Data Preprocess Tool - 安装指南

## 系统要求

- **Node.js**: >= 14.x (用于 TypeScript 工具)
- **Python**: >= 3.7 (用于 NetCDF/HDF5 处理)
- **操作系统**: Windows, Linux, macOS

## 安装步骤

### 1. Python 环境配置

#### 方法 1: 使用 pip (推荐)

```bash
# 创建虚拟环境 (可选但推荐)
python3 -m venv ocean_env
source ocean_env/bin/activate  # Linux/Mac
# 或
ocean_env\Scripts\activate  # Windows

# 安装依赖
pip install xarray netCDF4 h5py numpy scipy matplotlib
```

#### 方法 2: 使用 conda

```bash
# 创建 conda 环境
conda create -n ocean_env python=3.9

# 激活环境
conda activate ocean_env

# 安装依赖
conda install -c conda-forge xarray netCDF4 h5py numpy scipy matplotlib
```

### 2. 验证 Python 安装

运行测试脚本验证安装：

```bash
cd /d/train/Kode-main/src/tools/OceanDataPreprocessTool

# 运行测试套件
python3 test_processor.py
```

预期输出应包含：
```
✅ All dependencies installed!
✅ Created sample file: ...
✅ Metadata loaded successfully
✅ Masks generated successfully
✅ Statistics calculated successfully
✅ Training pairs created successfully
✅ Test Suite Completed!
```

### 3. 快速功能测试

```bash
# 测试 1: 检查依赖
python3 oceandata_processor.py check_deps

# 应输出:
# {
#   "netcdf4": true,
#   "h5py": true,
#   "numpy": true,
#   "xarray": true
# }

# 测试 2: 加载元数据 (需要真实的 NetCDF 文件)
python3 oceandata_processor.py load_metadata \
  --file /path/to/your/data.nc

# 测试 3: 独立运行 Python 脚本
python3 oceandata_processor.py generate_masks \
  --file /path/to/jaxa_data.nc \
  --variable sst \
  --params '{"missing_ratio_range": [0.1, 0.6], "mask_count": 360}'
```

## 常见问题

### Q1: 找不到 Python3 命令

**问题**: 运行 `python3` 时提示 "command not found"

**解决方案**:
```bash
# Windows
# 使用 python 而不是 python3
python --version

# 或安装 Python 3: https://www.python.org/downloads/

# Linux
sudo apt-get install python3 python3-pip

# macOS
brew install python3
```

### Q2: pip install 失败

**问题**: pip 安装时报错 "permission denied" 或 "access denied"

**解决方案**:
```bash
# 方法 1: 使用 --user 标志
pip install --user xarray netCDF4 h5py numpy scipy

# 方法 2: 使用虚拟环境 (推荐)
python3 -m venv myenv
source myenv/bin/activate  # Linux/Mac
# 或 myenv\Scripts\activate  # Windows
pip install xarray netCDF4 h5py numpy scipy

# 方法 3: 使用 sudo (Linux/Mac，不推荐)
sudo pip3 install xarray netCDF4 h5py numpy scipy
```

### Q3: ImportError: No module named 'netCDF4'

**问题**: Python 脚本运行时找不到模块

**解决方案**:
```bash
# 确保在正确的 Python 环境中
which python3  # 查看 Python 路径

# 重新安装
pip3 install --upgrade netCDF4

# 如果使用虚拟环境，确保已激活
source ocean_env/bin/activate
```

### Q4: HDF5 库版本冲突

**问题**: 安装或运行时提示 HDF5 版本不匹配

**解决方案**:
```bash
# 方法 1: 使用 conda (推荐)
conda install -c conda-forge h5py

# 方法 2: 重新安装兼容版本
pip uninstall h5py
pip install h5py --no-binary=h5py

# 方法 3: 指定版本
pip install h5py==3.7.0
```

### Q5: Windows 下路径问题

**问题**: 路径包含空格或特殊字符导致错误

**解决方案**:
```bash
# 使用引号包围路径
python oceandata_processor.py load_metadata \
  --file "D:/data folder/file.nc"

# 或使用短路径 (Windows)
python oceandata_processor.py load_metadata \
  --file D:/DATAFO~1/file.nc
```

### Q6: 内存不足

**问题**: 处理大文件时内存溢出

**解决方案**:
1. 减少一次处理的数据量
2. 使用数据分块 (xarray 的 `chunks` 参数)
3. 增加系统内存或使用更强大的机器
4. 分批处理文件

```python
# 使用 dask 进行分块处理
import xarray as xr
ds = xr.open_dataset('large_file.nc', chunks={'time': 10})
```

## 完整依赖清单

### Python 包 (必需)

| 包名 | 版本 | 用途 |
|-----|------|-----|
| xarray | >= 0.20.0 | NetCDF 数据处理 |
| netCDF4 | >= 1.5.0 | NetCDF 文件 I/O |
| h5py | >= 3.0.0 | HDF5 文件 I/O |
| numpy | >= 1.20.0 | 数组操作 |
| scipy | >= 1.7.0 | 插值和科学计算 |

### Python 包 (可选)

| 包名 | 用途 |
|-----|-----|
| matplotlib | 数据可视化 |
| pandas | CSV/表格数据处理 |
| dask | 大规模数据并行处理 |

### TypeScript 依赖

工具已集成在 Kode 项目中，无需额外安装。

## 环境变量 (可选)

```bash
# 指定 Python 路径 (如果有多个 Python 版本)
export PYTHON_EXECUTABLE=/usr/bin/python3

# HDF5 库路径 (如果需要)
export HDF5_DIR=/usr/local/hdf5
export LD_LIBRARY_PATH=$HDF5_DIR/lib:$LD_LIBRARY_PATH
```

## 性能优化

### 1. 使用 Dask 进行并行处理

```bash
pip install dask distributed
```

```python
import xarray as xr
ds = xr.open_mfdataset('*.nc', parallel=True, chunks={'time': 10})
```

### 2. 启用压缩

处理 HDF5 时使用压缩减少文件大小：

```python
import h5py
with h5py.File('output.h5', 'w') as f:
    f.create_dataset('data', data=array, compression='gzip', compression_opts=4)
```

### 3. 内存映射

对于超大文件，使用内存映射：

```python
ds = xr.open_dataset('huge_file.nc', engine='h5netcdf')
```

## 数据目录设置

推荐的数据目录结构：

```bash
/data_new/sst_data/
  ├─ data_for_agent/
  │   ├─ scripts/
  │   │   ├─ raw_data/
  │   │   │   ├─ JAXA/
  │   │   │   └─ OSTIA/
  │   │   └─ jaxa_missing_masks/
  │   └─ processed_split/
  ├─ 250922_jaxa_processing/
  └─ jaxa_extract/
```

确保对这些目录有读写权限：

```bash
# Linux/Mac
chmod -R 755 /data_new/sst_data/

# Windows
# 右键文件夹 → 属性 → 安全 → 编辑权限
```

## 升级指南

### 升级 Python 包

```bash
pip install --upgrade xarray netCDF4 h5py numpy scipy
```

### 检查已安装版本

```bash
pip list | grep -E "xarray|netCDF4|h5py|numpy|scipy"
```

或在 Python 中：

```python
import xarray, netCDF4, h5py, numpy, scipy
print(f"xarray: {xarray.__version__}")
print(f"netCDF4: {netCDF4.__version__}")
print(f"h5py: {h5py.__version__}")
print(f"numpy: {numpy.__version__}")
print(f"scipy: {scipy.__version__}")
```

## 卸载

```bash
# 删除虚拟环境
rm -rf ocean_env  # Linux/Mac
rmdir /s ocean_env  # Windows

# 或卸载包
pip uninstall xarray netCDF4 h5py numpy scipy matplotlib
```

## 获取帮助

如果遇到问题：

1. **检查 Python 版本**: `python3 --version` (应 >= 3.7)
2. **检查包安装**: `pip list | grep xarray`
3. **运行测试脚本**: `python3 test_processor.py`
4. **查看详细错误**: 使用 `--verbose` 或检查 traceback

## 参考资源

- xarray 文档: https://docs.xarray.dev/
- netCDF4-python 文档: https://unidata.github.io/netcdf4-python/
- h5py 文档: https://docs.h5py.org/
- NumPy 文档: https://numpy.org/doc/
- SciPy 文档: https://docs.scipy.org/

## 下一步

安装完成后，请参考：
- `README_ENHANCED.md` - 详细使用说明
- `test_processor.py` - 测试脚本示例
- `operationsConfig.ts` - 操作配置和示例

祝使用愉快！🌊
