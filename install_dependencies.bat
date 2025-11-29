@echo off
echo ====================================
echo 安装数据预处理所需的 Python 包
echo ====================================
echo.

python --version
echo.

echo 正在安装依赖包...
pip install -r requirements.txt

echo.
echo ====================================
echo 安装完成！
echo ====================================
echo.
echo 现在可以运行: python data_preprocessing.py
pause
