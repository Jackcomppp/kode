import numpy as np

# 创建合成ERA5风涡度数据
print('创建合成ERA5风涡度数据...')
np.random.seed(42)
data = []

for i in range(100):  # 创建100个样本用于快速演示
    x = np.linspace(-4, 4, 128)
    y = np.linspace(-4, 4, 128)
    X, Y = np.meshgrid(x, y)
    
    # 创建涡旋结构
    field = (np.exp(-((X-1)**2 + (Y-1)**2)/2) * np.sin(3*X) * np.cos(3*Y) +
            np.exp(-((X+1)**2 + (Y+1)**2)/2) * np.sin(2*X) * np.cos(2*Y) +
            0.5 * np.exp(-(X**2 + Y**2)/4) * np.sin(X) * np.cos(Y))
    
    field += 0.1 * np.random.randn(128, 128)
    data.append(field)

data = np.array(data)
np.save('era5_synthetic_data.npy', data)
print(f'数据已创建: {data.shape}')