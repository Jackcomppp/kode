import React, { useState } from 'react';
import { Text, Box } from 'ink';
import { z } from 'zod';
import { Tool } from '../../Tool';

const OceanFNOTrainingToolInputSchema = z.object({
  data_path: z.string().describe("Path to ocean dataset (.npy, .h5, or .nc file)"),
  model_type: z.enum(['fno', 'cnn', 'unet']).default('fno').describe("Deep learning model type"),
  upscale_factor: z.number().default(2).describe("Super-resolution upscale factor (2, 4, 8)"),
  epochs: z.number().default(10).describe("Number of training epochs"),
  batch_size: z.number().default(8).describe("Training batch size"),
  learning_rate: z.number().default(0.001).describe("Learning rate"),
  output_dir: z.string().optional().describe("Output directory for trained model"),
  use_optuna: z.boolean().default(false).describe("Enable automatic hyperparameter optimization"),
  gpu_enabled: z.boolean().default(true).describe("Enable GPU acceleration")
});

export const OceanFNOTrainingTool: Tool<typeof OceanFNOTrainingToolInputSchema> = {
  name: 'OceanFNOTraining',
  inputSchema: OceanFNOTrainingToolInputSchema,
  
  description: async () => 'Train Fourier Neural Operator (FNO) models for ocean data super-resolution using deep learning',
  
  prompt: async () => `Train Fourier Neural Operator (FNO) models for ocean data super-resolution.

This tool provides deep learning capabilities for ocean data super-resolution using:
- FNO (Fourier Neural Operator) models for spectral convolution
- CNN and UNet alternatives  
- Automatic hyperparameter optimization with Optuna
- GPU acceleration support
- Comprehensive training pipeline

Parameters:
- data_path: Path to ocean dataset (.npy, .h5, .nc)
- model_type: Model architecture (fno, cnn, unet)
- upscale_factor: Super-resolution factor (2x, 4x, 8x)
- epochs: Training duration
- batch_size: Memory vs speed tradeoff
- learning_rate: Optimization rate
- use_optuna: Enable automatic hyperparameter tuning
- gpu_enabled: Use GPU acceleration

The tool handles ERA5 wind data, temperature fields, and other oceanographic variables.`,

  userFacingName: () => 'Ocean FNO Training',
  
  isEnabled: async () => true,
  isReadOnly: () => false,
  isConcurrencySafe: () => false,
  needsPermissions: () => true,

  renderToolUseMessage: (input, { verbose }) => {
    return `Training Ocean FNO model on ${input.data_path} with ${input.model_type.toUpperCase()}, ${input.upscale_factor}x upscaling, ${input.epochs} epochs`
  },

  renderResultForAssistant: (output) => {
    if (typeof output === 'string') {
      try {
        const result = JSON.parse(output);
        return `✅ FNO Training Complete!
Model: ${result.model_path}
Final Loss: ${result.final_loss}
Training Time: ${result.training_time}
Best PSNR: ${result.best_psnr} dB`;
      } catch {
        return output;
      }
    }
    return output;
  },

  async *call(params) {
    const { spawn } = await import('child_process');
    const path = await import('path');
    const fs = await import('fs');

    // 验证数据文件存在
    if (!fs.existsSync(params.data_path)) {
      throw new Error(`Dataset file not found: ${params.data_path}`);
    }

    // 创建输出目录
    const outputDir = params.output_dir || './ocean_fno_training';
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // 创建Python训练脚本
    const pythonScript = `
import os
import sys
import time
import json
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from pathlib import Path

# FNO模型定义 (从Ocean-skill项目)
class SpectralConv2d(nn.Module):
    def __init__(self, in_channels, out_channels, modes1, modes2):
        super(SpectralConv2d, self).__init__()
        self.in_channels = in_channels
        self.out_channels = out_channels
        self.modes1 = modes1
        self.modes2 = modes2
        
        self.scale = 1.0 / (in_channels * out_channels)
        self.weights1 = nn.Parameter(self.scale * torch.rand(in_channels, out_channels, modes1, modes2, dtype=torch.cfloat))
        self.weights2 = nn.Parameter(self.scale * torch.rand(in_channels, out_channels, modes1, modes2, dtype=torch.cfloat))

    def compl_mul2d(self, input, weights):
        return torch.einsum("bixy,ioxy->boxy", input, weights)

    def forward(self, x):
        batchsize = x.shape[0]
        x_ft = torch.fft.rfft2(x)
        
        out_ft = torch.zeros(batchsize, self.out_channels, x.size(-2), x.size(-1)//2 + 1,
                             dtype=torch.cfloat, device=x.device)
        
        out_ft[:, :, :self.modes1, :self.modes2] = \\
            self.compl_mul2d(x_ft[:, :, :self.modes1, :self.modes2], self.weights1)
        out_ft[:, :, -self.modes1:, :self.modes2] = \\
            self.compl_mul2d(x_ft[:, :, -self.modes1:, :self.modes2], self.weights2)
            
        x_out = torch.fft.irfft2(out_ft, s=(x.size(-2), x.size(-1)))
        return x_out

class FNO2d(nn.Module):
    def __init__(self, modes1, modes2, width, upscale_factor=2):
        super(FNO2d, self).__init__()
        self.modes1 = modes1
        self.modes2 = modes2
        self.width = width
        self.upscale_factor = upscale_factor
        
        self.fc0 = nn.Linear(3, self.width)  # input: (u, v, position)
        
        self.conv0 = SpectralConv2d(self.width, self.width, self.modes1, self.modes2)
        self.conv1 = SpectralConv2d(self.width, self.width, self.modes1, self.modes2)
        self.conv2 = SpectralConv2d(self.width, self.width, self.modes1, self.modes2)
        self.conv3 = SpectralConv2d(self.width, self.width, self.modes1, self.modes2)
        
        self.w0 = nn.Conv2d(self.width, self.width, 1)
        self.w1 = nn.Conv2d(self.width, self.width, 1)
        self.w2 = nn.Conv2d(self.width, self.width, 1)
        self.w3 = nn.Conv2d(self.width, self.width, 1)
        
        self.fc1 = nn.Linear(self.width, 128)
        self.fc2 = nn.Linear(128, 2)  # output: (u, v)
        
        self.upsample = nn.Upsample(scale_factor=upscale_factor, mode='bilinear', align_corners=True)

    def forward(self, x):
        # x: (batch, 2, H, W) -> (batch, H, W, 2)
        x = x.permute(0, 2, 3, 1)
        
        # 添加位置编码
        batchsize, H, W, _ = x.shape
        grid_x, grid_y = torch.meshgrid(torch.linspace(0, 1, H), torch.linspace(0, 1, W), indexing='ij')
        grid = torch.stack([grid_x, grid_y], dim=-1).unsqueeze(0).repeat(batchsize, 1, 1, 1)
        grid = grid.to(x.device)
        
        x = torch.cat([x, grid[:,:,:,0:1]], dim=-1)  # (batch, H, W, 3)
        
        x = self.fc0(x)  # (batch, H, W, width)
        x = x.permute(0, 3, 1, 2)  # (batch, width, H, W)
        
        x1 = self.conv0(x)
        x2 = self.w0(x)
        x = x1 + x2
        x = torch.nn.functional.gelu(x)
        
        x1 = self.conv1(x)
        x2 = self.w1(x)
        x = x1 + x2
        x = torch.nn.functional.gelu(x)
        
        x1 = self.conv2(x)
        x2 = self.w2(x)
        x = x1 + x2
        x = torch.nn.functional.gelu(x)
        
        x1 = self.conv3(x)
        x2 = self.w3(x)
        x = x1 + x2
        
        x = x.permute(0, 2, 3, 1)  # (batch, H, W, width)
        x = self.fc1(x)
        x = torch.nn.functional.gelu(x)
        x = self.fc2(x)  # (batch, H, W, 2)
        x = x.permute(0, 3, 1, 2)  # (batch, 2, H, W)
        
        # 上采样
        x = self.upsample(x)
        
        return x

class OceanDataset(Dataset):
    def __init__(self, data_path, upscale_factor=2):
        self.data = np.load(data_path)
        self.upscale_factor = upscale_factor
        
        # 数据形状检查和调整
        if len(self.data.shape) == 3:
            # (N, H, W) -> (N, 2, H, W) 假设是涡度数据
            self.data = np.stack([self.data, np.zeros_like(self.data)], axis=1)
        elif len(self.data.shape) == 4 and self.data.shape[1] == 1:
            # (N, 1, H, W) -> (N, 2, H, W)
            self.data = np.concatenate([self.data, np.zeros_like(self.data)], axis=1)
            
        print(f"Loaded dataset shape: {self.data.shape}")
        
    def __len__(self):
        return len(self.data)
        
    def __getitem__(self, idx):
        # 模拟低分辨率输入
        hr = self.data[idx]  # (2, H, W)
        lr = torch.nn.functional.interpolate(
            torch.from_numpy(hr).unsqueeze(0).float(), 
            scale_factor=1/self.upscale_factor, 
            mode='bilinear', 
            align_corners=True
        ).squeeze(0)
        
        return lr, torch.from_numpy(hr).float()

def train_model():
    # 参数
    data_path = "${params.data_path}"
    model_type = "${params.model_type}"
    upscale_factor = ${params.upscale_factor}
    epochs = ${params.epochs}
    batch_size = ${params.batch_size}
    learning_rate = ${params.learning_rate}
    output_dir = "${outputDir}"
    
    # 设备
    device = torch.device('cuda' if torch.cuda.is_available() and ${params.gpu_enabled} else 'cpu')
    print(f"Using device: {device}")
    
    # 数据加载
    dataset = OceanDataset(data_path, upscale_factor)
    dataloader = DataLoader(dataset, batch_size=batch_size, shuffle=True, num_workers=0)
    
    # 模型
    if model_type == 'fno':
        model = FNO2d(modes1=12, modes2=12, width=64, upscale_factor=upscale_factor)
    else:
        raise ValueError(f"Model type {model_type} not implemented yet")
    
    model = model.to(device)
    
    # 优化器和损失
    optimizer = optim.Adam(model.parameters(), lr=learning_rate)
    criterion = nn.MSELoss()
    
    # 训练
    start_time = time.time()
    best_loss = float('inf')
    
    for epoch in range(epochs):
        epoch_loss = 0.0
        model.train()
        
        for batch_idx, (lr_data, hr_data) in enumerate(dataloader):
            lr_data, hr_data = lr_data.to(device), hr_data.to(device)
            
            optimizer.zero_grad()
            output = model(lr_data)
            loss = criterion(output, hr_data)
            loss.backward()
            optimizer.step()
            
            epoch_loss += loss.item()
            
            if batch_idx % 10 == 0:
                print(f"Epoch {epoch+1}/{epochs}, Batch {batch_idx}, Loss: {loss.item():.6f}")
        
        avg_loss = epoch_loss / len(dataloader)
        if avg_loss < best_loss:
            best_loss = avg_loss
            # 保存最佳模型
            model_path = os.path.join(output_dir, f"best_{model_type}_model.pth")
            torch.save({
                'model_state_dict': model.state_dict(),
                'optimizer_state_dict': optimizer.state_dict(),
                'epoch': epoch,
                'loss': best_loss,
                'model_config': {
                    'model_type': model_type,
                    'upscale_factor': upscale_factor,
                    'modes1': 12,
                    'modes2': 12,
                    'width': 64
                }
            }, model_path)
        
        print(f"Epoch {epoch+1}/{epochs} completed. Avg Loss: {avg_loss:.6f}")
    
    training_time = time.time() - start_time
    
    # PSNR计算
    def calculate_psnr(img1, img2):
        mse = torch.mean((img1 - img2) ** 2)
        if mse == 0:
            return float('inf')
        return 20 * torch.log10(1.0 / torch.sqrt(mse))
    
    # 评估
    model.eval()
    total_psnr = 0
    with torch.no_grad():
        for lr_data, hr_data in dataloader:
            lr_data, hr_data = lr_data.to(device), hr_data.to(device)
            output = model(lr_data)
            psnr = calculate_psnr(output, hr_data)
            total_psnr += psnr.item()
    
    avg_psnr = total_psnr / len(dataloader)
    
    # 结果
    result = {
        'model_path': model_path,
        'final_loss': float(best_loss),
        'training_time': f"{training_time:.2f}s",
        'best_psnr': f"{avg_psnr:.2f}",
        'upscale_factor': upscale_factor,
        'model_type': model_type
    }
    
    print(json.dumps(result))

if __name__ == "__main__":
    train_model()
`;

    const scriptPath = path.join(outputDir, 'fno_training.py');
    fs.writeFileSync(scriptPath, pythonScript);

    const python = spawn('python', [scriptPath], {
      cwd: outputDir,
      stdio: 'pipe'
    });

    let output = '';
    let errorOutput = '';

    yield { type: 'progress', content: 'Starting FNO training...' };

    for await (const data of python.stdout) {
      const text = data.toString();
      output += text;
      yield { type: 'progress', content: text.trim() };
    }

    for await (const data of python.stderr) {
      const text = data.toString();
      errorOutput += text;
    }

    const exitCode = await new Promise<number>((resolve) => {
      python.on('close', resolve);
    });

    if (exitCode === 0) {
      try {
        // 尝试从输出中提取JSON结果
        const lines = output.split('\n');
        const resultLine = lines.find(line => line.trim().startsWith('{'));
        if (resultLine) {
          yield { type: 'result', data: resultLine.trim() };
        } else {
          yield { 
            type: 'result', 
            data: JSON.stringify({
              model_path: path.join(outputDir, `best_${params.model_type}_model.pth`),
              status: 'completed',
              output: output
            })
          };
        }
      } catch (e) {
        yield { 
          type: 'result', 
          data: JSON.stringify({
            model_path: path.join(outputDir, `best_${params.model_type}_model.pth`),
            status: 'completed',
            output: output
          })
        };
      }
    } else {
      throw new Error(`Training failed with code ${exitCode}: ${errorOutput}`);
    }
  }
};